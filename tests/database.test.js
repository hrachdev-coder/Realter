import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("migration enforces ownership, public visibility, safe inquiries and image access", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
 grant usage on schema auth,storage,public to anon,authenticated;
 grant select,insert,delete on storage.objects to anon,authenticated;
 `);
    await db.query("insert into auth.users values ($1,$2)", [
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      { full_name: "Existing account" },
    ]);
    const sql = (
      await readFile(new URL("../supabase/setup.sql", import.meta.url), "utf8")
    ).replace("create extension if not exists pgcrypto;", "");
    await db.exec(sql);
    assert.equal(
      (
        await db.query(
          "select account_type from public.profiles where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'",
        )
      ).rows[0].account_type,
      "owner",
      "existing account profile backfilled",
    );
    const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await db.query("insert into auth.users values ($1,$3),($2,$3)", [
      a,
      b,
      { full_name: "Test realtor" },
    ]);
    async function role(name, id = "") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role " + name);
    }
    await role("authenticated", a);
    const p = (
      await db.query(
        `insert into public.properties(realtor_id,title,description,listing_type,property_type,price,city,bedrooms,bathrooms,area,images) values($1,'Test home','A test property description','sale','Apartment',150000,'Yerevan',2,1,80,$2) returning id`,
        [a, [a + "/test.jpg"]],
      )
    ).rows[0].id;
    await db.query(
      "insert into storage.objects(bucket_id,name) values('property-images',$1)",
      [a + "/test.jpg"],
    );
    const client = (
      await db.query(
        "insert into public.clients(realtor_id,full_name,looking_for) values($1,'Private client','sale') returning id",
        [a],
      )
    ).rows[0].id;
    await db.query(
      "update public.properties set rooms=3,building_type='Stone',rent_period='day',listed_by='realtor' where id=$1",
      [p],
    );
    const context = (
      await db.query(
        "select rent_period,listed_by from public.properties where id=$1",
        [p],
      )
    ).rows[0];
    assert.equal(context.rent_period, null, "sale cannot keep rental terms");
    assert.equal(
      context.listed_by,
      "owner",
      "listing author type cannot be spoofed",
    );
    await role("anon");
    assert.equal(
      (await db.query("select * from public.properties")).rows.length,
      0,
      "draft stays private",
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
      "draft image stays private",
    );
    await assert.rejects(
      db.query("select * from public.clients"),
      "anonymous CRM access denied",
    );
    await assert.rejects(
      db.query(
        "select public.submit_inquiry($1,'Test Visitor','test@example.com','','Please arrange a viewing')",
        [p],
      ),
      "draft inquiries denied",
    );
    await role("authenticated", b);
    assert.equal(
      (await db.query("select * from public.clients")).rows.length,
      0,
      "foreign clients hidden",
    );
    assert.equal(
      (
        await db.query(
          "update public.properties set title='Stolen listing' where id=$1 returning id",
          [p],
        )
      ).rows.length,
      0,
      "foreign edit affects no rows",
    );
    await assert.rejects(
      db.query(
        "insert into public.tasks(realtor_id,title,client_id,due_date) values($1,'Invalid link',$2,current_date)",
        [b, client],
      ),
      "cross-owner task link denied",
    );
    await assert.rejects(
      db.query(
        "insert into public.clients(realtor_id,full_name,looking_for) values($1,'Spoofed client','sale')",
        [a],
      ),
      "owner spoof denied",
    );
    await role("authenticated", a);
    await db.query(
      "update public.properties set status='published' where id=$1",
      [p],
    );
    await role("anon");
    assert.equal(
      (await db.query("select * from public.properties")).rows.length,
      1,
      "published listing visible",
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      1,
      "published image visible",
    );
    assert.equal(
      (await db.query("select * from public.public_realtor($1)", [a])).rows
        .length,
      1,
      "limited public realtor view available",
    );
    for (let i = 0; i < 3; i++)
      await db.query(
        "select public.submit_inquiry($1,'Test Visitor','test@example.com','','Please arrange a viewing')",
        [p],
      );
    await assert.rejects(
      db.query(
        "select public.submit_inquiry($1,'Test Visitor','test@example.com','','Please arrange a viewing')",
        [p],
      ),
      "fourth inquiry blocked",
    );
    await assert.rejects(
      db.query("select * from public.leads"),
      "anonymous leads hidden",
    );
    await role("authenticated", b);
    assert.equal(
      (await db.query("select * from public.leads")).rows.length,
      0,
      "foreign leads hidden",
    );
    await role("authenticated", a);
    const leads = (await db.query("select * from public.leads")).rows;
    assert.equal(leads.length, 3);
    assert.equal(leads[0].realtor_id, a, "owner derived from listing");
    await db.query("update public.leads set status='viewing' where id=$1", [
      leads[0].id,
    ]);
    await assert.rejects(
      db.query("update public.leads set realtor_id=$1 where id=$2", [
        b,
        leads[0].id,
      ]),
      "lead owner mutation denied",
    );
    await assert.rejects(
      db.query("update public.properties set images=$1 where id=$2", [
        [b + "/private.jpg"],
        p,
      ]),
      "foreign image reference denied",
    );
    await db.query("delete from public.properties where id=$1", [p]);
    assert.equal(
      (await db.query("select property_id from public.leads")).rows[0]
        .property_id,
      null,
      "deletion keeps lead but clears listing",
    );
    await role("anon");
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
      "unreferenced image private",
    );
  } finally {
    await db.close();
  }
});
