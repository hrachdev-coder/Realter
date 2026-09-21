import { supabase } from "./supabase/server";
import { configured } from "./config";
import { applySearchQuery } from "./search";
export async function sponsoredProperties(filters = { sort: "newest" }) {
  if (!configured) return [];
  const db = await supabase();
  const { data, error } = await applySearchQuery(
    db.from("top_properties").select("*").order("top_rotation"),
    filters,
  ).limit(3);
  if (error) {
    if (!["PGRST205", "42P01"].includes(error.code))
      console.error("TOP unavailable", { code: error.code });
    return [];
  }
  return data || [];
}
