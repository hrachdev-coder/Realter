import { z } from "zod";
import {
  propertyTypes,
  conditions,
  buildingTypes,
  furnishings,
  amenities,
  rentPeriods,
} from "./property-options.js";
const n = z.coerce.number().finite().nonnegative().max(1e12).optional();
const integer = z.coerce.number().int().nonnegative().max(10000).optional();
export const searchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  listing_type: z.enum(["sale", "rent"]).optional(),
  property_type: z.enum(propertyTypes).optional(),
  city: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  currency: z.enum(["USD", "AMD", "EUR", "RUB"]).default("USD"),
  min_price: n,
  max_price: n,
  rooms: integer,
  max_rooms: integer,
  bedrooms: integer,
  max_bedrooms: integer,
  bathrooms: integer,
  min_area: n,
  max_area: n,
  min_plot_area: n,
  max_plot_area: n,
  min_floor: integer,
  max_floor: integer,
  min_year: integer,
  max_year: integer,
  condition: z.enum(conditions).optional(),
  building_type: z.enum(buildingTypes).optional(),
  furnishing: z.enum(furnishings).optional(),
  rent_period: z.enum(rentPeriods).optional(),
  max_deposit: n,
  pets_allowed: z.enum(["yes", "no"]).optional(),
  available_from: z.string().date().optional(),
  listed_by: z.enum(["owner", "realtor"]).optional(),
  has_photos: z.boolean().optional(),
  exclude_first: z.boolean().optional(),
  exclude_last: z.boolean().optional(),
  amenities: z.array(z.enum(amenities)).max(amenities.length).optional(),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "area_asc", "area_desc"])
    .default("newest"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export function normalizeFilters(raw = {}) {
  const input = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null || value === "") continue;
    if (key === "amenities")
      input[key] = Array.isArray(value)
        ? value
        : String(value).split(",").filter(Boolean);
    else if (["has_photos", "exclude_first", "exclude_last"].includes(key))
      input[key] = value === true || value === "true" || value === "1";
    else input[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = searchSchema.parse(input);
  if (parsed.listing_type === "sale") {
    for (const key of [
      "rent_period",
      "max_deposit",
      "pets_allowed",
      "available_from",
    ])
      delete parsed[key];
  } else if (parsed.listing_type === "rent" && !parsed.rent_period)
    parsed.rent_period = "month";
  if (
    parsed.property_type &&
    parsed.property_type !== "House" &&
    parsed.property_type !== "Land"
  ) {
    delete parsed.min_plot_area;
    delete parsed.max_plot_area;
  }
  return parsed;
}
export function rangeError(f) {
  for (const [low, high, label] of [
    ["min_price", "max_price", "Price"],
    ["rooms", "max_rooms", "Rooms"],
    ["bedrooms", "max_bedrooms", "Bedrooms"],
    ["min_area", "max_area", "Area"],
    ["min_plot_area", "max_plot_area", "Plot area"],
    ["min_floor", "max_floor", "Floor"],
    ["min_year", "max_year", "Year"],
  ])
    if (
      f[low] != null &&
      f[low] !== "" &&
      f[high] != null &&
      f[high] !== "" &&
      +f[low] > +f[high]
    )
      return label + ": minimum must not exceed maximum.";
  return "";
}
export function serializeFilters(f) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(f))
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== false &&
      !(Array.isArray(value) && !value.length)
    )
      params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  return params.toString();
}
export function filterProperties(properties, raw) {
  const f = normalizeFilters(raw);
  if (rangeError(f)) return [];
  const range = (value, low, high) =>
    (low == null && high == null) ||
    (value != null &&
      (low == null || value >= low) &&
      (high == null || value <= high));
  const rows = properties.filter(
    (p) =>
      [
        "listing_type",
        "property_type",
        "city",
        "district",
        "currency",
        "condition",
        "building_type",
        "furnishing",
        "listed_by",
      ].every((k) => !f[k] || p[k] === f[k]) &&
      range(p.price, f.min_price, f.max_price) &&
      range(p.rooms, f.rooms, f.max_rooms) &&
      range(p.bedrooms, f.bedrooms, f.max_bedrooms) &&
      range(p.bathrooms, f.bathrooms, null) &&
      range(p.area, f.min_area, f.max_area) &&
      range(p.plot_area, f.min_plot_area, f.max_plot_area) &&
      range(p.floor, f.min_floor, f.max_floor) &&
      range(p.building_year, f.min_year, f.max_year) &&
      (!f.rent_period ||
        (p.listing_type === "rent" &&
          (p.rent_period || "month") === f.rent_period)) &&
      range(p.deposit, f.max_deposit == null ? null : 0, f.max_deposit) &&
      (!f.pets_allowed || p.pets_allowed === (f.pets_allowed === "yes")) &&
      (!f.available_from ||
        (p.available_from && p.available_from <= f.available_from)) &&
      (!f.has_photos || p.images?.length > 0) &&
      (!f.exclude_first || (p.floor != null && p.floor > 1)) &&
      (!f.exclude_last ||
        (p.floor != null &&
          p.total_floors != null &&
          p.floor < p.total_floors)) &&
      (!f.amenities?.length ||
        f.amenities.every((a) => p.amenities?.includes(a))) &&
      (!f.q ||
        f.q
          .toLowerCase()
          .split(/\s+/)
          .every((word) =>
            [p.title, p.address, p.city, p.district]
              .join(" ")
              .toLowerCase()
              .includes(word),
          )),
  );
  rows.sort((a, b) =>
    f.sort === "price_asc"
      ? a.price - b.price
      : f.sort === "price_desc"
        ? b.price - a.price
        : f.sort === "area_asc"
          ? a.area - b.area
          : f.sort === "area_desc"
            ? b.area - a.area
            : new Date(b.created_at) - new Date(a.created_at),
  );
  return rows;
}
export function applySearchQuery(query, f) {
  query = query.eq("status", "published");
  for (const key of [
    "listing_type",
    "property_type",
    "city",
    "district",
    "currency",
    "condition",
    "building_type",
    "furnishing",
    "listed_by",
    "rent_period",
  ])
    if (f[key]) query = query.eq(key, f[key]);
  for (const [column, min, max] of [
    ["price", "min_price", "max_price"],
    ["rooms", "rooms", "max_rooms"],
    ["bedrooms", "bedrooms", "max_bedrooms"],
    ["bathrooms", "bathrooms", null],
    ["area", "min_area", "max_area"],
    ["plot_area", "min_plot_area", "max_plot_area"],
    ["floor", "min_floor", "max_floor"],
    ["building_year", "min_year", "max_year"],
    ["deposit", null, "max_deposit"],
  ]) {
    if (min && f[min] != null) query = query.gte(column, f[min]);
    if (max && f[max] != null) query = query.lte(column, f[max]);
  }
  if (f.amenities?.length) query = query.contains("amenities", f.amenities);
  if (f.q)
    query = query.textSearch("search_document", f.q, {
      type: "websearch",
      config: "simple",
    });
  if (f.has_photos) query = query.eq("has_photos", true);
  if (f.exclude_first) query = query.gt("floor", 1);
  if (f.exclude_last) query = query.eq("is_top_floor", false);
  if (f.pets_allowed)
    query = query.eq("pets_allowed", f.pets_allowed === "yes");
  if (f.available_from) query = query.lte("available_from", f.available_from);
  const sort = {
    newest: ["created_at", false],
    price_asc: ["price", true],
    price_desc: ["price", false],
    area_asc: ["area", true],
    area_desc: ["area", false],
  }[f.sort || "newest"];
  return query
    .order(sort[0], { ascending: sort[1] })
    .order("id", { ascending: true });
}
