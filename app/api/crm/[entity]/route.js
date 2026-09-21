import { getAccess } from "@/lib/access-server";
import { isSameOrigin } from "@/lib/request";
import { supabase } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
import { schemas } from "@/lib/validation";
import { z } from "zod";
export async function POST(request, { params }) {
  if (!configured)
    return Response.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  if (!isSameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { entity } = await params;
  if (!Object.hasOwn(schemas, entity))
    return Response.json({ error: "Unknown resource." }, { status: 404 });
  try {
    const db = await supabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return Response.json({ error: "Please log in." }, { status: 401 });
    const access = await getAccess();
    if (!access.allowed)
      return Response.json(
        { error: "Your account cannot make changes. Contact support." },
        { status: 403 },
      );
    if (
      ["clients", "tasks"].includes(entity) &&
      access.profile?.account_type !== "realtor"
    )
      return Response.json(
        { error: "This section is for realtor accounts." },
        { status: 403 },
      );
    const raw = await request.text();
    if (raw.length > 75000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const { action, id, values } = JSON.parse(raw);
    if (
      !["save", "delete"].includes(action) ||
      (id && !z.string().uuid().safeParse(id).success)
    )
      return Response.json({ error: "Invalid operation." }, { status: 400 });
    if (entity === "profiles" && (action !== "save" || id !== user.id))
      return Response.json(
        { error: "Invalid profile operation." },
        { status: 403 },
      );
    if (entity === "leads" && (!id || action !== "save"))
      return Response.json(
        { error: "Invalid lead operation." },
        { status: 403 },
      );
    const owner = entity === "profiles" ? "id" : "realtor_id";
    if (action === "delete") {
      if (!id)
        return Response.json({ error: "Record required." }, { status: 400 });
      const { error } = await db
        .from(entity)
        .delete()
        .eq("id", id)
        .eq(owner, user.id);
      if (error) throw error;
      return Response.json({ ok: true });
    }
    const parsed = schemas[entity].safeParse(values);
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    if (
      entity === "properties" &&
      parsed.data.images.some(
        (image) =>
          !image.startsWith(user.id + "/") &&
          !image.startsWith("https://images.unsplash.com/"),
      )
    )
      return Response.json(
        { error: "Images must belong to your account." },
        { status: 400 },
      );
    const query = id
      ? db.from(entity).update(parsed.data).eq("id", id).eq(owner, user.id)
      : db.from(entity).insert({ ...parsed.data, realtor_id: user.id });
    const { data, error } = await query.select().single();
    if (error) throw error;
    return Response.json({ data });
  } catch {
    return Response.json(
      {
        error:
          "Unable to save this record. Check your fields and linked records, then try again.",
      },
      { status: 400 },
    );
  }
}
