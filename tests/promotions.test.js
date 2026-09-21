import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { topPackage, topStatus } from "../lib/promotions.js";
test("TOP package catalog and expiration", () => {
  assert.equal(topPackage(3).amount, 1200);
  assert.equal(topPackage(7).amount, 1500);
  assert.equal(topPackage(1), undefined);
  assert.equal(
    topStatus(
      { status: "paid", paid_at: "2026-01-01T00:00:00Z", duration_days: 3 },
      Date.parse("2026-01-04T00:00:00Z"),
    ),
    "expired",
  );
});
test("TOP database enforces prices, ownership, confirmed activation and expiration", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role service_role bypassrls;create role anon; create role authenticated;\n create schema auth;create schema storage;\n create table auth.users(id uuid primary key,raw_user_meta_data jsonb);\n create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;\n create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);\n create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);\n alter table storage.objects enable row level security;\n create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;\n grant usage on schema auth,storage,public to anon,authenticated;\n grant select,insert,delete on storage.objects to anon,authenticated;\n ",
    );
    await db.exec(
      (
        await readFile(
          new URL("../supabase/setup.sql", import.meta.url),
          "utf8",
        )
      ).replace("create extension if not exists pgcrypto;", ""),
    );
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/202609190003_top.sql", import.meta.url),
        "utf8",
      ),
    );
    const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await db.query("insert into auth.users values($1,$3),($2,$3)", [
      a,
      b,
      { full_name: "Test owner" },
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
        "insert into public.properties(realtor_id,title,description,listing_type,property_type,price,city,bedrooms,bathrooms,area,status) values($1,'Test property','Test description here','sale','Apartment',12345,'Yerevan',1,1,50,'draft') returning id",
        [a],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("select * from public.request_top_order($1,3)", [p]),
    );
    await db.query(
      "update public.properties set status='published' where id=$1",
      [p],
    );
    await assert.rejects(
      db.query("select * from public.request_top_order($1,1)", [p]),
    );
    let o = (
      await db.query("select * from public.request_top_order($1,3)", [p])
    ).rows[0];
    assert.equal(o.amount, 1200);
    assert.equal(o.duration_days, 3);
    assert.equal(
      (await db.query("select * from public.request_top_order($1,3)", [p]))
        .rows[0].id,
      o.id,
    );
    await assert.rejects(
      db.query("update public.top_orders set status='paid' where id=$1", [
        o.id,
      ]),
    );
    await assert.rejects(
      db.query(
        "select * from public.activate_top_order($1,'receipt-1',1200,'AMD')",
        [o.id],
      ),
    );
    const old = o.id;
    o = (await db.query("select * from public.request_top_order($1,7)", [p]))
      .rows[0];
    assert.equal(o.amount, 1500);
    assert.equal(
      (
        await db.query("select status from public.top_orders where id=$1", [
          old,
        ])
      ).rows[0].status,
      "cancelled",
    );
    await role("authenticated", b);
    assert.equal(
      (await db.query("select * from public.top_orders")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select * from public.request_top_order($1,3)", [p]),
    );
    await role("anon");
    assert.equal(
      (await db.query("select * from public.top_properties")).rows.length,
      0,
    );
    await assert.rejects(db.query("select * from public.top_orders"));
    await role("service_role");
    await assert.rejects(
      db.query(
        "select * from public.activate_top_order($1,'receipt-1',1200,'AMD')",
        [o.id],
      ),
    );
    await assert.rejects(
      db.query(
        "select * from public.activate_top_order($1,'receipt-1',null,'AMD')",
        [o.id],
      ),
    );
    const placement = (
      await db.query(
        "select * from public.activate_top_order($1,'receipt-1',1500,'AMD')",
        [o.id],
      )
    ).rows[0];
    assert.equal(
      new Date(placement.expires_at) - new Date(placement.starts_at),
      7 * 86400000,
    );
    const repeated = (
      await db.query(
        "select * from public.activate_top_order($1,'receipt-1',1500,'AMD')",
        [o.id],
      )
    ).rows[0];
    assert.equal(String(repeated.expires_at), String(placement.expires_at));
    await assert.rejects(
      db.query(
        "select * from public.activate_top_order($1,'receipt-2',1500,'AMD')",
        [o.id],
      ),
    );
    await role("anon");
    assert.equal(
      (await db.query("select * from public.top_properties")).rows.length,
      1,
    );
    await role("authenticated", a);
    await assert.rejects(
      db.query("select * from public.request_top_order($1,3)", [p]),
    );
    await db.query(
      "update public.properties set status='archived' where id=$1",
      [p],
    );
    await role("anon");
    assert.equal(
      (await db.query("select * from public.top_properties")).rows.length,
      0,
    );
    await role("authenticated", a);
    await db.query(
      "update public.properties set status='published' where id=$1",
      [p],
    );
    await role("service_role");
    await db.query(
      "update public.top_placements set starts_at=now()-interval '8 days',expires_at=now()-interval '1 day' where order_id=$1",
      [o.id],
    );
    await role("anon");
    assert.equal(
      (await db.query("select * from public.top_properties")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
