-- Run once in the confirmed empty Supabase project. Creates tables, RLS, private storage and profiles for existing accounts.
begin;

create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check(char_length(full_name)<=100),
 phone text not null default '' check(char_length(phone)<=30),
 bio text not null default '' check(char_length(bio)<=2000), city text not null default '',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.properties (
 id uuid primary key default gen_random_uuid(),realtor_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 3 and 150),description text not null check(char_length(description) between 10 and 10000),
 listing_type text not null check(listing_type in ('sale','rent')),property_type text not null check(property_type in ('Apartment','House','Commercial','Land')),
 price numeric(16,2) not null check(price>=0),currency text not null default 'USD' check(currency in ('USD','AMD','EUR','RUB')),
 city text not null check(char_length(city) between 2 and 100),district text not null default '' check(char_length(district)<=100),address text not null default '' check(char_length(address)<=250),
 latitude numeric check(latitude between -90 and 90),longitude numeric check(longitude between -180 and 180),
 bedrooms integer not null check(bedrooms between 0 and 100),bathrooms integer not null check(bathrooms between 0 and 100),area numeric not null check(area>0 and area<=100000000),
 floor integer check(floor>=0),total_floors integer check(total_floors>=0),condition text not null default '',amenities text[] not null default '{}',images text[] not null default '{}',
 status text not null default 'draft' check(status in ('draft','published','sold','rented','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(id,realtor_id),check(floor<=total_floors),check(cardinality(images)<=20),check(cardinality(amenities)<=40)
);
create table public.clients (
 id uuid primary key default gen_random_uuid(),realtor_id uuid not null references public.profiles(id) on delete cascade,
 full_name text not null check(char_length(full_name) between 2 and 100),phone text not null default '' check(char_length(phone)<=30),email text not null default '' check(char_length(email)<=254),notes text not null default '' check(char_length(notes)<=5000),
 looking_for text not null check(looking_for in ('sale','rent')),preferred_city text not null default '',preferred_districts text[] not null default '{}',
 min_price numeric check(min_price>=0),max_price numeric check(max_price>=0),min_bedrooms integer check(min_bedrooms>=0),max_bedrooms integer check(max_bedrooms>=0),min_area numeric check(min_area>=0),currency text not null default 'USD' check(currency in ('USD','AMD','EUR','RUB')),
 status text not null default 'active' check(status in ('active','paused','closed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,realtor_id),check(min_price<=max_price),check(min_bedrooms<=max_bedrooms)
);
create table public.leads (
 id uuid primary key default gen_random_uuid(),realtor_id uuid not null references public.profiles(id) on delete cascade,property_id uuid,
 name text not null check(char_length(name) between 2 and 100),phone text not null default '' check(char_length(phone)<=30),email text not null check(char_length(email)<=254),message text not null check(char_length(message) between 10 and 2000),
 status text not null default 'new' check(status in ('new','contacted','viewing','negotiation','won','lost')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,realtor_id),
 foreign key(property_id,realtor_id) references public.properties(id,realtor_id) on delete set null (property_id)
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),realtor_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 2 and 200),description text not null default '' check(char_length(description)<=5000),client_id uuid,lead_id uuid,due_date date not null,completed boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(client_id,realtor_id) references public.clients(id,realtor_id) on delete set null (client_id),
 foreign key(lead_id,realtor_id) references public.leads(id,realtor_id) on delete set null (lead_id)
);
create index properties_public_search on public.properties(city,listing_type,property_type,price,created_at desc) where status='published';
create index properties_owner on public.properties(realtor_id,created_at desc);
create index properties_images on public.properties using gin(images);
create index clients_owner on public.clients(realtor_id);
create index leads_owner_status on public.leads(realtor_id,status,created_at desc);
create index leads_property on public.leads(property_id,realtor_id);
create index leads_rate_email on public.leads(lower(email),created_at desc);
create index tasks_owner_due on public.tasks(realtor_id,completed,due_date);
create index tasks_client on public.tasks(client_id,realtor_id);
create index tasks_lead on public.tasks(lead_id,realtor_id);
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end;$$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name','Realtor'),100));return new;end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.validate_property_images() returns trigger language plpgsql set search_path='' as $$declare image text;begin foreach image in array new.images loop if image not like new.realtor_id::text||'/%' and image not like 'https://images.unsplash.com/%' then raise exception 'Image must belong to the realtor';end if;end loop;return new;end;$$;
create trigger validate_images before insert or update on public.properties for each row execute function public.validate_property_images();
do $$declare t text;begin foreach t in array array['profiles','properties','clients','leads','tasks'] loop execute format('alter table public.%I enable row level security',t);execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);end loop;end;$$;
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy property_read on public.properties for select to anon,authenticated using(status='published' or realtor_id=(select auth.uid()));
create policy property_insert on public.properties for insert to authenticated with check(realtor_id=(select auth.uid()));
create policy property_update on public.properties for update to authenticated using(realtor_id=(select auth.uid())) with check(realtor_id=(select auth.uid()));
create policy property_delete on public.properties for delete to authenticated using(realtor_id=(select auth.uid()));
create policy client_owner on public.clients for all to authenticated using(realtor_id=(select auth.uid())) with check(realtor_id=(select auth.uid()));
create policy task_owner on public.tasks for all to authenticated using(realtor_id=(select auth.uid())) with check(realtor_id=(select auth.uid()));
create policy lead_read on public.leads for select to authenticated using(realtor_id=(select auth.uid()));
create policy lead_update on public.leads for update to authenticated using(realtor_id=(select auth.uid())) with check(realtor_id=(select auth.uid()));
revoke all on public.profiles,public.properties,public.clients,public.leads,public.tasks from anon,authenticated;
grant select on public.properties to anon;
grant select,insert,update,delete on public.properties,public.clients,public.tasks to authenticated;
grant select on public.profiles,public.leads to authenticated;
grant update(full_name,phone,bio,city) on public.profiles to authenticated;
grant update(status) on public.leads to authenticated;
create function public.public_realtor(realtor uuid) returns table(id uuid,full_name text,phone text,bio text,city text) language sql stable security definer set search_path='' as $$select p.id,p.full_name,p.phone,p.bio,p.city from public.profiles p where p.id=realtor and exists(select 1 from public.properties x where x.realtor_id=p.id and x.status='published');$$;
create function public.submit_inquiry(p_property_id uuid,p_name text,p_email text,p_phone text,p_message text) returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid;begin
 if char_length(trim(p_name)) not between 2 and 100 or char_length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(p_phone)>30 or char_length(trim(p_message)) not between 10 and 2000 then raise exception 'Invalid inquiry';end if;
 select realtor_id into owner_id from public.properties where id=p_property_id and status='published';
 if owner_id is null then raise exception 'Property unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_email)),0));
 perform pg_advisory_xact_lock(hashtextextended(p_property_id::text,1));
 if (select count(*) from public.leads where lower(email)=lower(trim(p_email)) and created_at>now()-interval '1 hour')>=3 or (select count(*) from public.leads where property_id=p_property_id and created_at>now()-interval '1 hour')>=50 then raise exception 'Inquiry limit reached';end if;
 insert into public.leads(realtor_id,property_id,name,email,phone,message) values(owner_id,p_property_id,trim(p_name),lower(trim(p_email)),p_phone,trim(p_message));
end;$$;
revoke all on function public.public_realtor(uuid),public.submit_inquiry(uuid,text,text,text,text),public.handle_new_user(),public.touch_updated_at(),public.validate_property_images() from public;
grant execute on function public.public_realtor(uuid),public.submit_inquiry(uuid,text,text,text,text) to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('property-images','property-images',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy image_read on storage.objects for select to anon,authenticated using(bucket_id='property-images' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.properties p where p.status='published' and storage.objects.name=any(p.images))));
create policy image_upload on storage.objects for insert to authenticated with check(bucket_id='property-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy image_delete on storage.objects for delete to authenticated using(bucket_id='property-images' and (storage.foldername(name))[1]=(select auth.uid())::text);


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

update public.properties p set listed_by=a.account_type from public.profiles a where p.realtor_id=a.id;
create function public.sync_listing_account_type() returns trigger language plpgsql set search_path='' as $$begin update public.properties set listed_by=new.account_type where realtor_id=new.id;return new;end;$$;
create trigger sync_listing_account_type after update of account_type on public.profiles for each row execute function public.sync_listing_account_type();
revoke all on function public.sync_listing_account_type() from public;

commit;
