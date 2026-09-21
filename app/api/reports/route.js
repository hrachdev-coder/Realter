import { supabase } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/request";
export async function POST(request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 4000) throw Error();
    const b = JSON.parse(raw);
    if (
      typeof b.reason !== "string" ||
      b.reason.trim().length < 10 ||
      b.reason.length > 2000 ||
      !/^[-a-f0-9]{36}$/i.test(b.property_id)
    )
      throw Error();
    const db = await supabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return Response.json({ error: "Please log in." }, { status: 401 });
    const { error } = await db.rpc("report_property", {
      target: b.property_id,
      details: b.reason,
    });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Unable to send report. Check the details or try later." },
      { status: 400 },
    );
  }
}
