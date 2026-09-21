import { supabase } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
export async function GET(request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!configured || !path || path.includes("..") || path.length > 500)
    return new Response(null, { status: 404 });
  const db = await supabase();
  const { data, error } = await db.storage
    .from("property-images")
    .createSignedUrl(path, 300);
  if (error) return new Response(null, { status: 404 });
  return Response.redirect(data.signedUrl, 307);
}
