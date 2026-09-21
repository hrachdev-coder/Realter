import { supabase } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/request";
import { normalizeFilters } from "@/lib/search";
export async function GET() {
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Please log in." }, { status: 401 });
  const [f, s] = await Promise.all([
    db
      .from("favorites")
      .select("property_id")
      .eq("user_id", user.id)
      .limit(1000),
    db
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (f.error || s.error)
    return Response.json(
      { error: "This feature is not connected yet." },
      { status: 503 },
    );
  const ids = f.data.map((x) => x.property_id);
  const props = ids.length
    ? await db.from("market_properties").select("*").in("id", ids)
    : { data: [] };
  return Response.json(
    { favorites: props.data || [], favoriteIds: ids, searches: s.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 12000) throw Error();
    const b = JSON.parse(raw),
      db = await supabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return Response.json({ error: "Please log in." }, { status: 401 });
    let result;
    if (["favorite", "unfavorite", "delete_search"].includes(b.action)) {
      if (!/^[a-f0-9-]{36}$/i.test(b.id)) throw Error();
      result =
        b.action === "favorite"
          ? await db
              .from("favorites")
              .insert({ user_id: user.id, property_id: b.id })
          : b.action === "unfavorite"
            ? await db
                .from("favorites")
                .delete()
                .eq("user_id", user.id)
                .eq("property_id", b.id)
            : await db
                .from("saved_searches")
                .delete()
                .eq("user_id", user.id)
                .eq("id", b.id);
    } else if (b.action === "save_search") {
      if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 100)
        throw Error();
      result = await db
        .from("saved_searches")
        .insert({
          user_id: user.id,
          name: b.name.trim(),
          filters: normalizeFilters({ ...b.filters, page: 1 }),
        });
    } else throw Error();
    if (result.error && result.error.code !== "23505") throw result.error;
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Unable to save. Check your input or try later." },
      { status: 400 },
    );
  }
}
