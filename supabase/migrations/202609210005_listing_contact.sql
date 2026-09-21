begin;
alter table public.properties add column contact_phone text not null default '';
update public.properties p set contact_phone=r.phone from public.profiles r where p.realtor_id=r.id and r.phone ~ '^\+?[0-9 () .-]{7,30}$';
create function public.require_listing_phone() returns trigger language plpgsql set search_path='' as $$begin
 if new.status='published' and (tg_op='INSERT' or old.status<>'published' or new.contact_phone is distinct from old.contact_phone) and (new.contact_phone !~ '^\+?[0-9 () .-]+$' or length(regexp_replace(new.contact_phone,'[^0-9]','','g')) not between 7 and 15) then raise exception 'A valid contact phone is required to publish';end if;return new;end;$$;
create trigger require_listing_phone before insert or update on public.properties for each row execute function public.require_listing_phone();
revoke all on function public.require_listing_phone() from public;
create or replace view public.market_properties with(security_invoker=true) as select p.* from public.properties p where p.status='published' and p.moderation_status='approved' and public.account_allowed(p.realtor_id);
drop view public.top_properties;
create view public.top_properties with(security_invoker=true) as select p.*,md5(p.id::text || floor(extract(epoch from now())/300)::text) as top_rotation from public.properties p where p.status='published' and p.moderation_status='approved' and public.account_allowed(p.realtor_id) and exists(select 1 from public.top_placements t where t.property_id=p.id and t.starts_at<=now() and t.expires_at>now());
grant select on public.market_properties,public.top_properties to anon,authenticated;
commit;
