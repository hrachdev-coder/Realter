import { configured } from "./config";
import { supabase } from "./supabase/server";
import { demoProperties, demoRealtor } from "./demo";
export async function publicProperties() {
  if (!configured) return demoProperties;
  const db = await supabase();
  const { data, error } = await db
    .from("market_properties")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error)
    throw new Error("Properties could not be loaded. Please try again.");
  return data;
}
export async function realtor(id) {
  if (!configured) return id === "demo" ? demoRealtor : null;
  const db = await supabase();
  const { data, error } = await db.rpc("public_realtor", { realtor: id });
  if (error) throw new Error("Unable to load realtor");
  return data?.[0] || null;
}
export async function publicProperty(id) {
  if (!configured) return demoProperties.find((p) => p.id === id) || null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await supabase();
  const { data, error } = await db
    .from("market_properties")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Unable to load property");
  return data;
}
