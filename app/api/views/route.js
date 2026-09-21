import { createHmac, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/server";
import { service } from "@/lib/service-server";
import { isSameOrigin } from "@/lib/request";
export async function POST(request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 200) return new Response(null, { status: 400 });
    const { id } = JSON.parse(raw);
    if (!/^[a-f0-9-]{36}$/i.test(id))
      return new Response(null, { status: 400 });
    const db = await supabase();
    const { data } = await db
      .from("market_properties")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!data) return new Response(null, { status: 404 });
    const jar = await cookies();
    let visitor = jar.get("tun-viewer")?.value;
    if (!/^[a-f0-9-]{36}$/i.test(visitor || "")) {
      visitor = randomUUID();
      jar.set("tun-viewer", visitor, {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(request.url).protocol === "https:",
        path: "/",
        maxAge: 86400,
      });
    }
    const secret = process.env.ANALYTICS_HASH_SECRET;
    if (!secret) return new Response(null, { status: 204 });
    const visitor_hash = createHmac("sha256", secret)
      .update(visitor)
      .digest("hex");
    const { error } = await service()
      .from("property_daily_views")
      .upsert(
        { property_id: id, visitor_hash },
        { onConflict: "property_id,day,visitor_hash", ignoreDuplicates: true },
      );
    return new Response(null, { status: error ? 503 : 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
