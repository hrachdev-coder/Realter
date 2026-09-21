import { getAccess } from "@/lib/access-server";
import { service } from "@/lib/service-server";
import { supabase } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/request";
export async function GET() {
  const a = await getAccess();
  if (!a.admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const db = service();
  const results = await Promise.all([
    db
      .from("properties")
      .select("id,title,realtor_id,status,moderation_status")
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("profiles").select("id,full_name,account_type").limit(100),
    db.from("account_restrictions").select("user_id,reason").limit(100),
    db
      .from("property_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("moderation_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (results.some((r) => r.error))
    return Response.json(
      { error: "Administration is not connected yet." },
      { status: 503 },
    );
  return Response.json(
    Object.fromEntries(
      ["properties", "profiles", "restrictions", "reports", "audit"].map(
        (k, i) => [k, results[i].data],
      ),
    ),
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const a = await getAccess();
  if (!a.admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 4000) throw Error();
    const b = JSON.parse(raw);
    if (
      !["approve", "block", "restrict", "unrestrict", "resolve"].includes(
        b.action,
      ) ||
      !/^[-0-9a-f]{36}$/i.test(b.target) ||
      typeof b.reason !== "string" ||
      b.reason.trim().length < 3 ||
      b.reason.length > 2000
    )
      throw Error();
    const db = await supabase();
    const { error } = await db.rpc("moderate", {
      action_name: b.action,
      target: b.target,
      details: b.reason,
    });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Unable to complete moderation. Check the target and reason." },
      { status: 400 },
    );
  }
}
