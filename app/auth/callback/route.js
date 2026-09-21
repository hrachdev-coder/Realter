import { requestOrigin } from "@/lib/request";
import { supabase } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
import { finishConfirmation } from "@/lib/auth";
import { NextResponse } from "next/server";
export async function GET(request) {
  const url = new URL(request.url);
  let destination = "/login?error=confirmation_failed";
  if (configured) {
    try {
      const db = await supabase();
      const result = await finishConfirmation(db.auth, url.searchParams);
      destination = result.ok
        ? result.next
        : result.recovery
          ? "/forgot-password?error=recovery_failed"
          : destination;
    } catch {
      if (
        url.searchParams.get("next") === "/reset-password" ||
        url.searchParams.get("type") === "recovery"
      )
        destination = "/forgot-password?error=recovery_failed";
    }
  }
  const response = NextResponse.redirect(
    new URL(destination, requestOrigin(request)),
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
