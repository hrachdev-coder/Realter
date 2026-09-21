import { cache } from "react";
import { configured } from "./config";
import { supabase } from "./supabase/server";
export const getViewer = cache(async () => {
  if (!configured) return null;
  try {
    const db = await supabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "",
    };
  } catch {
    return null;
  }
});
