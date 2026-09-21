import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("production permissions and moderation protect public and private data", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role service_role bypassrls;create role anon; create role authenticated;\n create schema auth;create schema storage;\n create table auth.users(id uuid primary key,raw_user_meta_data jsonb,email text);\n create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;\n create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);\n create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);\n alter table storage.objects enable row level security;\n create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;\n grant usage on schema auth,storage,public to anon,authenticated;\n grant select,insert,delete on storage.objects to anon,authenticated;\n ",
    );
    for (const file of [
      "setup.sql",
      "migrations/202609190003_top.sql",
      "migrations/202609190004_production.sql",
      "migrations/202609210005_listing_contact.sql",
    ])
      await db.exec(
        (
          await readFile(
            new URL("../supabase/" + file, import.meta.url),
            "utf8",
          )
        ).replace("create extension if not exists pgcrypto;", ""),
      );
    const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await db.query(
      "insert into auth.users(id,raw_user_meta_data) values($1,$3),($2,$3)",
      [a, b, { full_name: "Test owner" }],
    );
    await db.query("insert into public.site_admins values($1)", [b]);
    async function role(name, id = "") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role " + name);
    }
    await role("authenticated", a);
    await assert.rejects(
      db.query(
        "insert into public.clients(realtor_id,full_name,looking_for) values($1,'Client name','sale')",
        [a],
      ),
    );
    await db.query(
      "update public.profiles set account_type='realtor' where id=$1",
      [a],
    );
    await db.query(
      "insert into public.clients(realtor_id,full_name,looking_for) values($1,'Client name','sale')",
      [a],
    );
    await db.query(
      "update public.profiles set account_type='owner' where id=$1",
      [a],
    );
    assert.equal(
      (await db.query("select * from public.clients")).rows.length,
      0,
    );
    const p = (
      await db.query(
        "insert into public.properties(realtor_id,title,description,listing_type,property_type,price,city,bedrooms,bathrooms,area,status,contact_phone) values($1,'Test property','A valid description','sale','House',1,'Yerevan',1,1,30,'published','+37491123456') returning id",
        [a],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("update public.properties set contact_phone='' where id=$1", [
        p,
      ]),
    );
    assert.equal(
      (
        await db.query(
          "select contact_phone from public.market_properties where id=$1",
          [p],
        )
      ).rows[0].contact_phone,
      "+37491123456",
    );
    await assert.rejects(
      db.query(
        "update public.properties set moderation_status='blocked' where id=$1",
        [p],
      ),
    );
    await assert.rejects(
      db.query("insert into public.site_admins values($1)", [a]),
    );
    await assert.rejects(
      db.query("select public.moderate('block',$1,'test reason')", [p]),
    );
    await db.query(
      "insert into public.favorites(user_id,property_id) values($1,$2)",
      [a, p],
    );
    await db.query(
      "insert into public.saved_searches(user_id,name,filters) values($1,'My search','{}')",
      [a],
    );
    await role("authenticated", b);
    assert.equal(
      (await db.query("select * from public.favorites")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.saved_searches")).rows.length,
      0,
    );
    await db.query(
      "select public.report_property($1,'Incorrect listing details')",
      [p],
    );
    await db.query("select public.moderate('block',$1,'Verified report')", [p]);
    await role("anon");
    assert.equal(
      (await db.query("select * from public.market_properties")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.public_realtor($1)", [a])).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query(
        "select public.submit_inquiry($1,'Valid name','test@example.com','','A valid inquiry message')",
        [p],
      ),
    );
    await assert.rejects(db.query("select * from public.property_reports"));
    await role("authenticated", a);
    await assert.rejects(
      db.query(
        "update public.properties set moderation_status='approved' where id=$1",
        [p],
      ),
    );
    await assert.rejects(
      db.query("select * from public.request_top_order($1,3)", [p]),
    );
    assert.equal(
      (await db.query("select * from public.market_properties")).rows.length,
      0,
    );
    await role("authenticated", b);
    await db.query(
      "select public.moderate('approve',$1,'Restored after review')",
      [p],
    );
    await db.query("select public.moderate('restrict',$1,'Repeated abuse')", [
      a,
    ]);
    await role("anon");
    assert.equal(
      (await db.query("select * from public.market_properties")).rows.length,
      0,
    );
    await role("authenticated", a);
    await assert.rejects(
      db.query(
        "update public.properties set title='Changed title' where id=$1",
        [p],
      ),
    );
    await role("authenticated", b);
    await db.query(
      "select public.moderate('unrestrict',$1,'Restriction reviewed')",
      [a],
    );
    await role("anon");
    assert.equal(
      (await db.query("select * from public.market_properties")).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
