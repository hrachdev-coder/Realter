import { createClient } from "@supabase/supabase-js";
import {
  demoProperties,
  demoClients,
  demoLeads,
  demoTasks,
} from "../lib/demo.js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY,
  realtorId = process.env.SEED_REALTOR_ID;
if (!url || !key || !realtorId)
  throw new Error(
    "Set Supabase URL, private service role key, and SEED_REALTOR_ID in .env.local.",
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: profile, error } = await db
  .from("profiles")
  .select("id")
  .eq("id", realtorId)
  .single();
if (error || !profile)
  throw new Error("Register a realtor account before seeding.");
const { count } = await db
  .from("properties")
  .select("id", { count: "exact", head: true })
  .eq("realtor_id", realtorId);
if (count)
  throw new Error(
    "Seed target already has properties. Use a fresh demo account to avoid duplicates.",
  );
const mapped = new Map();
async function insert(table, rows) {
  for (const row of rows) {
    const { id, ...value } = row;
    value.realtor_id = realtorId;
    if (value.property_id) value.property_id = mapped.get(value.property_id);
    if (value.client_id) value.client_id = mapped.get(value.client_id);
    if (value.lead_id) value.lead_id = mapped.get(value.lead_id);
    const { data, error } = await db
      .from(table)
      .insert(value)
      .select("id")
      .single();
    if (error) throw error;
    mapped.set(id, data.id);
  }
}
await insert("properties", demoProperties);
await insert(
  "clients",
  demoClients.map((c) => ({ phone: "", email: "", notes: "", ...c })),
);
await insert(
  "leads",
  demoLeads.map((l) => ({ phone: "", ...l })),
);
await insert("tasks", demoTasks);
console.log("Seeded 24 properties, 3 clients, 2 leads, and 2 tasks.");
