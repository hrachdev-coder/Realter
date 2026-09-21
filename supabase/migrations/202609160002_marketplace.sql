begin;
alter table public.profiles add column account_type text not null default 'realtor' check(account_type in ('owner','realtor'));
grant update(account_type) on public.profiles to authenticated;
insert into public.profiles(id,full_name,account_type) select id,left(coalesce(raw_user_meta_data->>'full_name',''),100),case when raw_user_meta_data->>'account_type'='realtor' then 'realtor' else 'owner' end from auth.users on conflict(id) do nothing;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,full_name,account_type) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),100),case when new.raw_user_meta_data->>'account_type'='realtor' then 'realtor' else 'owner' end);return new;end;$$;
alter table public.properties
 add column rooms integer check(rooms between 0 and 100),
 add column plot_area numeric check(plot_area>=0),
 add column building_type text check(building_type in ('Stone','Panel','Monolithic','Brick','Wood','Other')),
 add column building_year integer check(building_year between 1000 and 2200),
 add column furnishing text check(furnishing in ('Furnished','Partly furnished','Unfurnished')),
 add column rent_period text check(rent_period in ('month','day','year')),
 add column deposit numeric check(deposit>=0),
 add column pets_allowed boolean,
 add column available_from date,
 add column listed_by text not null default 'realtor' check(listed_by in ('owner','realtor')),
 add column has_photos boolean generated always as(cardinality(images)>0) stored,
 add column is_top_floor boolean generated always as(case when floor is null or total_floors is null then null else floor>=total_floors end) stored,
 add column search_document tsvector generated always as(to_tsvector('simple',title||' '||address||' '||city||' '||district)) stored;
update public.properties set rent_period='month' where listing_type='rent';
alter table public.properties add constraint valid_rental_period check((listing_type='sale' and rent_period is null) or (listing_type='rent' and rent_period is not null));
create function public.set_listing_context() returns trigger language plpgsql set search_path='' as $$begin select account_type into new.listed_by from public.profiles where id=new.realtor_id;if new.listing_type='sale' then new.rent_period=null;new.deposit=null;new.pets_allowed=null;new.available_from=null;elsif new.rent_period is null then new.rent_period='month';end if;return new;end;$$;
create trigger set_listing_context before insert or update on public.properties for each row execute function public.set_listing_context();
revoke all on function public.set_listing_context() from public;
create index properties_search_document on public.properties using gin(search_document);
create index properties_rental_search on public.properties(listing_type,rent_period,currency,price) where status='published';
create function public.property_locations() returns table(city text,district text) language sql stable security invoker set search_path='' as $$select distinct p.city,p.district from public.properties p where status='published' order by p.city,p.district;$$;
revoke all on function public.property_locations() from public;
grant execute on function public.property_locations() to anon,authenticated;
commit;

begin;
update public.properties p set listed_by=a.account_type from public.profiles a where p.realtor_id=a.id;
create function public.sync_listing_account_type() returns trigger language plpgsql set search_path='' as $$begin update public.properties set listed_by=new.account_type where realtor_id=new.id;return new;end;$$;
create trigger sync_listing_account_type after update of account_type on public.profiles for each row execute function public.sync_listing_account_type();
revoke all on function public.sync_listing_account_type() from public;
commit;
