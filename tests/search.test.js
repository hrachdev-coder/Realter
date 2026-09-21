import test from "node:test";
import assert from "node:assert/strict";
import {
  filterProperties,
  normalizeFilters,
  rangeError,
  serializeFilters,
  applySearchQuery,
} from "../lib/search.js";
const base = {
  id: "1",
  status: "published",
  title: "Bright family home",
  address: "Example Street",
  city: "Yerevan",
  district: "Kentron",
  property_type: "Apartment",
  listing_type: "sale",
  currency: "USD",
  price: 150000,
  rooms: 3,
  bedrooms: 2,
  bathrooms: 1,
  area: 90,
  floor: 3,
  total_floors: 8,
  building_type: "Stone",
  building_year: 2010,
  condition: "Renovated",
  furnishing: "Furnished",
  amenities: ["Elevator", "Balcony"],
  images: ["photo"],
  listed_by: "owner",
  created_at: "2026-09-16",
};
test("sale filters combine room, building, author and amenities requirements", () => {
  assert.equal(
    filterProperties([base], {
      listing_type: "sale",
      rooms: 3,
      bedrooms: 2,
      min_floor: 2,
      max_floor: 4,
      min_year: 2000,
      building_type: "Stone",
      listed_by: "owner",
      amenities: ["Elevator", "Balcony"],
      has_photos: true,
    }).length,
    1,
  );
  assert.equal(filterProperties([base], { amenities: ["Parking"] }).length, 0);
});
test("unknown fields do not satisfy numeric, top-floor or pet requirements", () => {
  assert.equal(
    filterProperties([{ ...base, floor: null }], { exclude_last: true }).length,
    0,
  );
  assert.equal(
    filterProperties([{ ...base, rooms: null }], { rooms: 1 }).length,
    0,
  );
  assert.equal(
    filterProperties([{ ...base, listing_type: "rent", pets_allowed: null }], {
      listing_type: "rent",
      pets_allowed: "no",
    }).length,
    0,
  );
});
test("rental search separates daily and monthly prices and checks deposit and availability", () => {
  const rows = [
    {
      ...base,
      id: "daily",
      listing_type: "rent",
      rent_period: "day",
      price: 50,
      deposit: 0,
      pets_allowed: true,
      available_from: "2026-09-16",
    },
    {
      ...base,
      id: "monthly",
      listing_type: "rent",
      rent_period: "month",
      price: 700,
      deposit: 700,
      pets_allowed: false,
      available_from: "2026-10-01",
    },
  ];
  assert.deepEqual(
    filterProperties(rows, { listing_type: "rent" }).map((p) => p.id),
    ["monthly"],
  );
  assert.deepEqual(
    filterProperties(rows, {
      listing_type: "rent",
      rent_period: "day",
      max_deposit: 0,
      pets_allowed: "yes",
      available_from: "2026-09-20",
    }).map((p) => p.id),
    ["daily"],
  );
});
test("switching to sale removes stale rental requirements", () => {
  const f = normalizeFilters({
    listing_type: "sale",
    rent_period: "day",
    max_deposit: 100,
    pets_allowed: "yes",
  });
  assert.equal(f.rent_period, undefined);
  assert.equal(f.max_deposit, undefined);
  assert.equal(filterProperties([base], f).length, 1);
});
test("URL filters survive serialization and invalid ranges are reported", () => {
  const f = normalizeFilters({
    listing_type: "rent",
    min_price: "0",
    amenities: "Balcony,Elevator",
    exclude_last: "true",
  });
  assert.deepEqual(
    normalizeFilters(
      Object.fromEntries(new URLSearchParams(serializeFilters(f))),
    ),
    f,
  );
  assert.match(rangeError({ min_price: 200, max_price: 100 }), /minimum/);
  assert.throws(() => normalizeFilters({ available_from: "not-a-date" }));
  assert.throws(() => normalizeFilters({ min_price: "NaN" }));
});
test("search handles property keyword and plot area", () => {
  assert.equal(filterProperties([base], { q: "family Yerevan" }).length, 1);
  assert.equal(
    filterProperties([{ ...base, property_type: "House", plot_area: 300 }], {
      property_type: "House",
      min_plot_area: 250,
    }).length,
    1,
  );
});
test("database query applies parameterized rental, amenity and numeric filters", () => {
  const calls = [];
  const q = new Proxy(
    {},
    {
      get:
        (_, name) =>
        (...args) => {
          calls.push([name, ...args]);
          return q;
        },
    },
  );
  applySearchQuery(
    q,
    normalizeFilters({
      listing_type: "rent",
      max_price: 0,
      pets_allowed: "no",
      amenities: ["Balcony"],
      exclude_last: true,
    }),
  );
  assert.ok(
    calls.some(
      (c) => c[0] === "eq" && c[1] === "status" && c[2] === "published",
    ),
  );
  assert.ok(
    calls.some(
      (c) => c[0] === "eq" && c[1] === "rent_period" && c[2] === "month",
    ),
  );
  assert.ok(
    calls.some((c) => c[0] === "lte" && c[1] === "price" && c[2] === 0),
  );
  assert.ok(
    calls.some(
      (c) => c[0] === "eq" && c[1] === "pets_allowed" && c[2] === false,
    ),
  );
});
