import { sponsoredProperties } from "./promotions-server";
import { configured } from "./config";
import { supabase } from "./supabase/server";
import { demoProperties } from "./demo";
import {
  normalizeFilters,
  filterProperties,
  rangeError,
  applySearchQuery,
} from "./search";
export async function searchProperties(raw) {
  const filters = normalizeFilters(raw);
  const invalid = rangeError(filters);
  if (invalid) throw Object.assign(new Error(invalid), { status: 400 });
  if (!configured) {
    const all = filterProperties(demoProperties, filters);
    return {
      properties: all.slice((filters.page - 1) * 9, filters.page * 9),
      count: all.length,
      filters,
    };
  }
  const db = await supabase();
  const { data, count, error } = await applySearchQuery(
    db.from("market_properties").select("*", { count: "exact" }),
    filters,
  ).range((filters.page - 1) * 9, filters.page * 9 - 1);
  if (error) {
    console.error("Property search unavailable", { code: error.code });
    throw new Error(
      "Property search is temporarily unavailable. Please try again shortly.",
    );
  }
  const sponsored =
    filters.page === 1 ? await sponsoredProperties(filters) : [];
  return { properties: data, count, filters, sponsored };
}
export async function searchFacets() {
  if (!configured)
    return demoProperties
      .map((p) => ({ city: p.city, district: p.district }))
      .filter(
        (p, i, a) =>
          a.findIndex((x) => x.city === p.city && x.district === p.district) ===
          i,
      );
  const db = await supabase();
  const { data, error } = await db.rpc("property_locations");
  if (error) throw new Error("Search locations are unavailable.");
  return data || [];
}
