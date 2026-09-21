begin;
create table public.site_admins(user_id uuid primary key references public.profiles(id) on delete cascade);
create table public.account_restrictions(user_id uuid primary key references public.profiles(id) on delete cascade,reason text not null,created_at timestamptz not null default now());
alter table public.site_admins enable row level security;
alter table public.account_restrictions enable row level security;
revoke all on public.site_admins,public.account_restrictions from anon,authenticated;
grant all on public.site_admins,public.account_restrictions to service_role;
create function public.is_site_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.site_admins where user_id=auth.uid())$$;
create function public.account_allowed(target uuid) returns boolean language sql stable security definer set search_path='' as $$select not exists(select 1 from public.account_restrictions where user_id=target)$$;
create function public.has_realtor_workspace() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and account_type='realtor') and public.account_allowed(auth.uid())$$;
revoke all on function public.is_site_admin(),public.account_allowed(uuid),public.has_realtor_workspace() from public;
grant execute on function public.is_site_admin(),public.account_allowed(uuid),public.has_realtor_workspace() to anon,authenticated,service_role;
drop policy client_owner on public.clients;
drop policy task_owner on public.tasks;
create policy client_owner on public.clients for all to authenticated using(realtor_id=auth.uid() and public.has_realtor_workspace()) with check(realtor_id=auth.uid() and public.has_realtor_workspace());
create policy task_owner on public.tasks for all to authenticated using(realtor_id=auth.uid() and public.has_realtor_workspace()) with check(realtor_id=auth.uid() and public.has_realtor_workspace());
alter table public.properties add column moderation_status text not null default 'approved' check(moderation_status in ('approved','blocked'));
create function public.guard_property_moderation() returns trigger language plpgsql set search_path='' as $$begin
 if auth.uid() is not null and not public.is_site_admin() then
  if not public.account_allowed(auth.uid()) then raise exception 'Account restricted';end if;
  if (tg_op='INSERT' and new.moderation_status<>'approved') or (tg_op='UPDATE' and new.moderation_status<>old.moderation_status) then raise exception 'Moderation is administrator-only';end if;
 end if;return new;end;$$;
create trigger guard_property_moderation before insert or update on public.properties for each row execute function public.guard_property_moderation();
revoke all on function public.guard_property_moderation() from public;
drop policy property_read on public.properties;
create policy property_read on public.properties for select to anon,authenticated using(realtor_id=auth.uid() or (status='published' and moderation_status='approved' and public.account_allowed(realtor_id)));
create policy profile_active on public.profiles as restrictive for update to authenticated using(public.account_allowed(auth.uid())) with check(public.account_allowed(auth.uid()));
create policy image_active on storage.objects as restrictive for insert to authenticated with check(public.account_allowed(auth.uid()));
create table public.property_reports(id uuid primary key default gen_random_uuid(),property_id uuid references public.properties(id) on delete set null,reporter_id uuid references public.profiles(id) on delete set null,reason text not null check(length(reason) between 10 and 2000),status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default now());
create table public.moderation_audit(id uuid primary key default gen_random_uuid(),admin_id uuid references public.profiles(id) on delete set null,action text not null,target uuid not null,reason text not null,created_at timestamptz not null default now());
alter table public.property_reports enable row level security;alter table public.moderation_audit enable row level security;
revoke all on public.property_reports,public.moderation_audit from anon,authenticated;
grant all on public.property_reports,public.moderation_audit to service_role;
create function public.report_property(target uuid,details text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not public.account_allowed(auth.uid()) or details is null or length(trim(details)) not between 10 and 2000 then raise exception 'Invalid report';end if;
 if not exists(select 1 from public.properties where id=target and status='published' and moderation_status='approved' and public.account_allowed(realtor_id)) then raise exception 'Listing unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,42));
 if (select count(*) from public.property_reports where reporter_id=auth.uid() and created_at>now()-interval '1 hour')>=3 then raise exception 'Report limit reached';end if;
 insert into public.property_reports(property_id,reporter_id,reason) values(target,auth.uid(),trim(details));end;$$;
create function public.moderate(action_name text,target uuid,details text) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.is_site_admin() or details is null or length(trim(details)) not between 3 and 2000 then raise exception 'Administrator and reason required';end if;
 if action_name in ('approve','block') then update public.properties set moderation_status=case action_name when 'approve' then 'approved' else 'blocked' end where id=target;if not found then raise exception 'Missing listing';end if;
 elsif action_name='restrict' then if target=auth.uid() or exists(select 1 from public.site_admins where user_id=target) then raise exception 'Cannot restrict administrators';end if;insert into public.account_restrictions(user_id,reason) values(target,trim(details)) on conflict(user_id) do update set reason=excluded.reason;
 elsif action_name='unrestrict' then delete from public.account_restrictions where user_id=target;
 elsif action_name='resolve' then update public.property_reports set status='resolved' where id=target;if not found then raise exception 'Missing report';end if;
 else raise exception 'Unknown moderation action';end if;
 insert into public.moderation_audit(admin_id,action,target,reason) values(auth.uid(),action_name,target,trim(details));end;$$;
revoke all on function public.report_property(uuid,text),public.moderate(text,uuid,text) from public;
grant execute on function public.report_property(uuid,text),public.moderate(text,uuid,text) to authenticated;

create table public.favorites(user_id uuid not null references public.profiles(id) on delete cascade,property_id uuid not null references public.properties(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,property_id));
create table public.saved_searches(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,name text not null check(length(name) between 1 and 100),filters jsonb not null check(jsonb_typeof(filters)='object' and octet_length(filters::text)<10000),created_at timestamptz not null default now());
alter table public.favorites enable row level security;alter table public.saved_searches enable row level security;
create policy favorite_owner on public.favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and public.account_allowed(auth.uid()));
create policy search_owner on public.saved_searches for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and public.account_allowed(auth.uid()));
revoke all on public.favorites,public.saved_searches from anon,authenticated;grant select,insert,delete on public.favorites,public.saved_searches to authenticated;
create table public.property_daily_views(property_id uuid not null references public.properties(id) on delete cascade,day date not null default current_date,visitor_hash text not null,primary key(property_id,day,visitor_hash));
alter table public.property_daily_views enable row level security;
revoke all on public.property_daily_views from anon,authenticated;grant all on public.property_daily_views to service_role;
create function public.property_statistics() returns table(property_id uuid,views bigint,inquiries bigint) language sql stable security definer set search_path='' as $$select p.id,(select count(*) from public.property_daily_views v where v.property_id=p.id),(select count(*) from public.leads l where l.property_id=p.id) from public.properties p where p.realtor_id=auth.uid()$$;
revoke all on function public.property_statistics() from public;grant execute on function public.property_statistics() to authenticated;
create or replace function public.public_realtor(realtor uuid) returns table(id uuid,full_name text,phone text,bio text,city text) language sql stable security definer set search_path='' as $$select p.id,p.full_name,p.phone,p.bio,p.city from public.profiles p where p.id=realtor and exists(select 1 from public.properties x where x.realtor_id=p.id and x.status='published' and x.moderation_status='approved' and public.account_allowed(x.realtor_id));$$;
create or replace function public.submit_inquiry(p_property_id uuid,p_name text,p_email text,p_phone text,p_message text) returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid;begin
 if char_length(trim(p_name)) not between 2 and 100 or char_length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(p_phone)>30 or char_length(trim(p_message)) not between 10 and 2000 then raise exception 'Invalid inquiry';end if;
 select realtor_id into owner_id from public.properties where id=p_property_id and status='published' and moderation_status='approved' and public.account_allowed(realtor_id);
 if owner_id is null then raise exception 'Property unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_email)),0));
 perform pg_advisory_xact_lock(hashtextextended(p_property_id::text,1));
 if (select count(*) from public.leads where lower(email)=lower(trim(p_email)) and created_at>now()-interval '1 hour')>=3 or (select count(*) from public.leads where property_id=p_property_id and created_at>now()-interval '1 hour')>=50 then raise exception 'Inquiry limit reached';end if;
 insert into public.leads(realtor_id,property_id,name,email,phone,message) values(owner_id,p_property_id,trim(p_name),lower(trim(p_email)),p_phone,trim(p_message));
end;$$;
create or replace function public.request_top_order(target uuid, days integer) returns public.top_orders
language plpgsql security definer set search_path='' as $$
declare p public.properties; result public.top_orders;
begin
 if days is null or days not in (3,7) then raise exception 'Invalid package';end if;
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into p from public.properties where id=target for update;
 if p.id is null or p.realtor_id<>auth.uid() or (p.status<>'published' or p.moderation_status<>'approved' or not public.account_allowed(p.realtor_id)) then raise exception 'Published owned listing required';end if;
 if exists(select 1 from public.top_placements where property_id=target and expires_at>now()) then raise exception 'TOP already active';end if;
 update public.top_orders set status='expired' where property_id=target and status='pending' and payable_until<=now();
 select * into result from public.top_orders where property_id=target and status='pending';
 if result.id is not null and result.duration_days<>days then update public.top_orders set status='cancelled' where id=result.id;result=null;end if;
 if result.id is null then insert into public.top_orders(owner_id,property_id,amount,duration_days) values(auth.uid(),target,case days when 3 then 1200 else 1500 end,days) returning * into result;end if;
 return result;
end;$$;
create or replace function public.activate_top_order(target uuid,reference text,paid_amount integer,paid_currency text) returns public.top_placements
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
 if (p.status<>'published' or p.moderation_status<>'approved' or not public.account_allowed(p.realtor_id)) or p.realtor_id<>o.owner_id then raise exception 'Listing no longer eligible';end if;
 if exists(select 1 from public.top_placements where property_id=p.id and expires_at>now()) then raise exception 'TOP already active';end if;
 update public.top_orders set status='paid',paid_at=now(),payment_reference=reference where id=o.id;
 insert into public.top_placements(order_id,property_id,starts_at,expires_at)
 values(o.id,o.property_id,now(),now()+make_interval(days=>o.duration_days)) returning * into result;
 return result;
end;$$;
create view public.market_properties with(security_invoker=true) as select p.* from public.properties p where p.status='published' and p.moderation_status='approved' and public.account_allowed(p.realtor_id);
grant select on public.market_properties to anon,authenticated;
drop view public.top_properties;
create view public.top_properties with(security_invoker=true) as
 select p.*,md5(p.id::text || floor(extract(epoch from now())/300)::text) as top_rotation from public.properties p where p.status='published' and p.moderation_status='approved' and public.account_allowed(p.realtor_id) and exists(
 select 1 from public.top_placements t where t.property_id=p.id and t.starts_at<=now() and t.expires_at>now());
grant select on public.top_properties to anon,authenticated;
create or replace function public.property_locations() returns table(city text,district text) language sql stable security invoker set search_path='' as $$select distinct p.city,p.district from public.market_properties p order by p.city,p.district;$$;
create function public.limit_saved_searches() returns trigger language plpgsql security definer set search_path='' as $$begin perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,65));if (select count(*) from public.saved_searches where user_id=new.user_id)>=20 then raise exception 'Maximum 20 saved searches';end if;return new;end;$$;
create trigger limit_saved_searches before insert on public.saved_searches for each row execute function public.limit_saved_searches();revoke all on function public.limit_saved_searches() from public;
insert into public.site_admins(user_id) select id from auth.users where lower(email)='hrachkhachatryan1995@gmail.com' on conflict do nothing;
commit;
