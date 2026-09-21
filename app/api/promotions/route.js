import { supabase } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
import { isSameOrigin } from "@/lib/request";
import { topPackage } from "@/lib/promotions";
const reply = (body, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request) {
  if (!isSameOrigin(request))
    return reply({ error: "Invalid request origin." }, 403);
  if (!configured) return reply({ error: "TOP is not connected yet." }, 503);
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return reply({ error: "Please log in." }, 401);
  let input;
  try {
    const body = await request.text();
    if (body.length > 2000) return reply({ error: "Request too large." }, 413);
    input = JSON.parse(body);
  } catch {
    return reply({ error: "Invalid operation." }, 400);
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input?.property_id || "",
    ) ||
    !topPackage(input?.days)
  )
    return reply({ error: "Choose a TOP package." }, 400);
  const { data, error } = await db.rpc("request_top_order", {
    target: input.property_id,
    days: input.days,
  });
  if (error)
    return reply(
      {
        error: ["PGRST202", "PGRST205", "42P01"].includes(error.code)
          ? "TOP is not connected yet."
          : "Only your published listing without an active TOP placement can be promoted.",
      },
      409,
    );
  return reply({ order: data });
}
export async function GET() {
  if (!configured) return reply({ orders: [], available: false });
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return reply({ error: "Please log in." }, 401);
  const { data, error } = await db
    .from("top_orders")
    .select(
      "id,property_id,amount,currency,duration_days,status,created_at,payable_until,paid_at",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return error
    ? reply({ orders: [], available: false })
    : reply({ orders: data, available: true });
}
