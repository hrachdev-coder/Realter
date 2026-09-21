begin;
create table public.top_orders (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 property_id uuid not null references public.properties(id) on delete cascade,
 amount integer not null,
 currency text not null default 'AMD' check(currency='AMD'),
 duration_days integer not null,
 check((duration_days=3 and amount=1200) or (duration_days=7 and amount=1500)),
 status text not null default 'pending' check(status in ('pending','paid','cancelled','expired')),
 created_at timestamptz not null default now(),
 payable_until timestamptz not null default now()+interval '24 hours',
 paid_at timestamptz,
 payment_reference text unique,
 check((status='paid')=(paid_at is not null and payment_reference is not null))
);
create unique index top_orders_one_pending on public.top_orders(property_id) where status='pending';
alter table public.top_orders enable row level security;
create policy top_orders_owner_read on public.top_orders for select to authenticated using(owner_id=auth.uid());
revoke all on public.top_orders from anon,authenticated;
grant select on public.top_orders to authenticated;
grant all on public.top_orders to service_role;

create table public.top_placements (
 order_id uuid primary key references public.top_orders(id) on delete cascade,
 property_id uuid not null references public.properties(id) on delete cascade,
 starts_at timestamptz not null,
 expires_at timestamptz not null,
 check(expires_at>starts_at)
);
create index top_placements_lookup on public.top_placements(property_id,expires_at);
alter table public.top_placements enable row level security;
create policy top_placements_public_read on public.top_placements for select to anon,authenticated using(starts_at<=now() and expires_at>now() and exists(select 1 from public.properties p where p.id=property_id and p.status='published'));
revoke all on public.top_placements from anon,authenticated;
grant select on public.top_placements to anon,authenticated;
grant all on public.top_placements to service_role;
create view public.top_properties with(security_invoker=true) as
 select p.*,md5(p.id::text || floor(extract(epoch from now())/300)::text) as top_rotation from public.properties p where p.status='published' and exists(
 select 1 from public.top_placements t where t.property_id=p.id and t.starts_at<=now() and t.expires_at>now());
grant select on public.top_properties to anon,authenticated;

create function public.request_top_order(target uuid, days integer) returns public.top_orders
language plpgsql security definer set search_path='' as $$
declare p public.properties; result public.top_orders;
begin
 if days is null or days not in (3,7) then raise exception 'Invalid package';end if;
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into p from public.properties where id=target for update;
 if p.id is null or p.realtor_id<>auth.uid() or p.status<>'published' then raise exception 'Published owned listing required';end if;
 if exists(select 1 from public.top_placements where property_id=target and expires_at>now()) then raise exception 'TOP already active';end if;
 update public.top_orders set status='expired' where property_id=target and status='pending' and payable_until<=now();
 select * into result from public.top_orders where property_id=target and status='pending';
 if result.id is not null and result.duration_days<>days then update public.top_orders set status='cancelled' where id=result.id;result=null;end if;
 if result.id is null then insert into public.top_orders(owner_id,property_id,amount,duration_days) values(auth.uid(),target,case days when 3 then 1200 else 1500 end,days) returning * into result;end if;
 return result;
end;$$;
revoke all on function public.request_top_order(uuid,integer) from public;
grant execute on function public.request_top_order(uuid,integer) to authenticated;

-- Call ONLY from a trusted backend after independently verifying receipt.
-- A checkout return URL or a browser-supplied paid=true is never proof of payment.
create function public.activate_top_order(target uuid,reference text,paid_amount integer,paid_currency text) returns public.top_placements
language plpgsql security definer set search_path='' as $$
declare o public.top_orders; result public.top_placements; p public.properties;
begin
 select * into o from public.top_orders where id=target for update;
 if paid_amount is null or paid_currency is null or o.id is null or paid_amount<>o.amount or paid_currency<>o.currency or length(trim(coalesce(reference,'')))<3 then raise exception 'Invalid payment';end if;
 if o.status='paid' then
  if o.payment_reference<>reference then raise exception 'Payment reference mismatch';end if;
  select * into result from public.top_placements where order_id=o.id;return result;
 end if;
 if o.status<>'pending' or o.payable_until<=now() then raise exception 'Order expired or closed';end if;
 select * into p from public.properties where id=o.property_id for update;
 if p.status<>'published' or p.realtor_id<>o.owner_id then raise exception 'Listing no longer eligible';end if;
 if exists(select 1 from public.top_placements where property_id=p.id and expires_at>now()) then raise exception 'TOP already active';end if;
 update public.top_orders set status='paid',paid_at=now(),payment_reference=reference where id=o.id;
 insert into public.top_placements(order_id,property_id,starts_at,expires_at)
 values(o.id,o.property_id,now(),now()+make_interval(days=>o.duration_days)) returning * into result;
 return result;
end;$$;
revoke all on function public.activate_top_order(uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.activate_top_order(uuid,text,integer,text) to service_role;
commit;
