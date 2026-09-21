import test from "node:test";
import assert from "node:assert/strict";
import { phoneHref } from "../lib/phone.js";
import { similarListings } from "../lib/similar.js";
test("telephone links validate formatting without allowing URL injection", () => {
  assert.equal(phoneHref("+374 (91) 123-456"), "tel:+37491123456");
  assert.equal(phoneHref("0037491123456"), "tel:+37491123456");
  for (const v of [
    "",
    null,
    "123",
    "javascript:alert(1)",
    "+37412+34567",
    "1234567890123456",
  ])
    assert.equal(phoneHref(v), null);
});
test("similar listings keep sale and rental periods separate and prefer matching homes", () => {
  const p = {
    id: "a",
    status: "published",
    city: "Yerevan",
    listing_type: "rent",
    rent_period: "month",
    property_type: "Apartment",
    district: "Center",
    bedrooms: 2,
    currency: "AMD",
    price: 100,
  };
  const other = (id, changes = {}) => ({ ...p, id, ...changes });
  const rows = [
    p,
    other("b", { listing_type: "sale" }),
    other("c", { rent_period: "day" }),
    other("d", { status: "draft" }),
    other("e", { city: "Gyumri" }),
    other("f", { property_type: "House", price: 500 }),
    other("g", { price: 110 }),
  ];
  assert.deepEqual(
    similarListings(rows, p).map((x) => x.id),
    ["g", "f"],
  );
  assert.equal(similarListings(rows, p, 1)[0].id, "g");
});

import { schemas } from "../lib/validation.js";
test("publishing requires a contact number while incomplete drafts can be saved", () => {
  const p = {
    title: "Valid home",
    description: "A complete description",
    listing_type: "sale",
    property_type: "House",
    price: 1,
    currency: "AMD",
    city: "Yerevan",
    district: "",
    address: "",
    bedrooms: 1,
    bathrooms: 1,
    area: 30,
    condition: "",
    amenities: [],
    images: [],
    status: "draft",
  };
  assert.ok(schemas.properties.safeParse(p).success);
  assert.equal(
    schemas.properties.safeParse({ ...p, status: "published" }).success,
    false,
  );
  assert.ok(
    schemas.properties.safeParse({
      ...p,
      status: "published",
      contact_phone: "+374 91 123456",
    }).success,
  );
});
