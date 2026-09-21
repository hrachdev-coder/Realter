import test from "node:test";
import assert from "node:assert/strict";
import { matches } from "../lib/matching.js";
import { schemas } from "../lib/validation.js";
const p = {
  status: "published",
  listing_type: "sale",
  city: "Yerevan",
  district: "Kentron",
  price: 150000,
  currency: "USD",
  bedrooms: 2,
  area: 80,
};
test("inclusive budget, bedrooms and area boundaries match", () =>
  assert.equal(
    matches(p, {
      looking_for: "sale",
      preferred_city: "yerevan",
      preferred_districts: ["Kentron"],
      min_price: 150000,
      max_price: 150000,
      min_bedrooms: 2,
      max_bedrooms: 2,
      min_area: 80,
      currency: "USD",
    }),
    true,
  ));
test("each client requirement excludes an incompatible property", () => {
  for (const c of [
    { looking_for: "rent" },
    { preferred_city: "Dilijan" },
    { preferred_districts: ["Arabkir"] },
    { min_price: 150001 },
    { max_price: 149999 },
    { min_bedrooms: 3 },
    { max_bedrooms: 1 },
    { min_area: 81 },
    { currency: "AMD" },
  ])
    assert.equal(matches(p, c), false, JSON.stringify(c));
});
test("sold, rented, archived homes never match", () => {
  for (const status of ["sold", "rented", "archived"])
    assert.equal(matches({ ...p, status }, {}), false);
});
test("empty requirements match available inventory", () =>
  assert.equal(matches(p, {}), true));
test("lead updates cannot accept arbitrary stage", () =>
  assert.equal(schemas.leads.safeParse({ status: "admin" }).success, false));
test("lead updates strip ownership changes", () =>
  assert.deepEqual(
    schemas.leads.parse({ status: "won", realtor_id: "attacker" }),
    { status: "won" },
  ));
test("client validation rejects reversed budget", () =>
  assert.equal(
    schemas.clients.safeParse({
      full_name: "Test Client",
      phone: "",
      email: "",
      notes: "",
      looking_for: "sale",
      preferred_city: "",
      preferred_districts: [],
      min_price: 200,
      max_price: 100,
      currency: "USD",
      status: "active",
    }).success,
    false,
  ));

import { filterProperties } from "../lib/search.js";
test("search combines filters without mutating the source", () => {
  const rows = [
    {
      ...p,
      id: "a",
      listing_type: "rent",
      price: 1500,
      created_at: "2026-09-14",
    },
    {
      ...p,
      id: "b",
      listing_type: "rent",
      price: 800,
      created_at: "2026-09-13",
    },
    { ...p, id: "c", price: 900, created_at: "2026-09-12" },
  ];
  assert.deepEqual(
    filterProperties(rows, {
      listing_type: "rent",
      max_price: 1000,
      currency: "USD",
    }).map((x) => x.id),
    ["b"],
  );
  assert.equal(rows[0].id, "a");
});

import { requestOrigin, isSameOrigin } from "../lib/request.js";
test("origin checks preserve the browser-visible hostname", () => {
  const request = new Request("http://localhost:3000/api/inquiries", {
    headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
  });
  assert.equal(requestOrigin(request), "http://127.0.0.1:3000");
  assert.equal(isSameOrigin(request), true);
});
test("foreign and missing origins are rejected", () => {
  for (const origin of ["https://evil.example", "null", ""]) {
    const request = new Request("http://localhost:3000/api/inquiries", {
      headers: { host: "127.0.0.1:3000", origin },
    });
    assert.equal(isSameOrigin(request), false);
  }
});

test("zero-valued maximum filters are respected", () =>
  assert.equal(
    filterProperties([{ price: 10, area: 10, currency: "USD" }], {
      max_price: 0,
    }).length,
    0,
  ));

test("monthly client budgets exclude daily and yearly rental prices", () => {
  const client = { looking_for: "rent", max_price: 2000 };
  for (const rent_period of ["day", "year"])
    assert.equal(
      matches({ ...p, listing_type: "rent", price: 1000, rent_period }, client),
      false,
    );
  assert.equal(
    matches(
      { ...p, listing_type: "rent", price: 1000, rent_period: "month" },
      client,
    ),
    true,
  );
});

test("local canonical hostname permits only the same loopback host and port", () => {
  const req = new Request("http://localhost:3000/api/crm/properties", {
    headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
  });
  assert.equal(
    requestOrigin(req, "http://localhost:3000"),
    "http://127.0.0.1:3000",
  );
  assert.equal(
    requestOrigin(req, "https://example.com"),
    "https://example.com",
  );
  assert.equal(
    requestOrigin(req, "http://localhost:4000"),
    "http://localhost:4000",
  );
  const foreign = new Request("http://localhost:3000/", {
    headers: { host: "evil.example:3000" },
  });
  assert.equal(
    requestOrigin(foreign, "http://localhost:3000"),
    "http://localhost:3000",
  );
});
