import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { configured } from "./config";
import { supabase } from "./supabase/server";
export const getAccess = cache(async () => {
  if (!configured)
    return {
      user: null,
      profile: { account_type: "realtor" },
      admin: false,
      allowed: true,
    };
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { user: null, profile: null, admin: false, allowed: false };
  const [profile, admin, allowed] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).single(),
    db.rpc("is_site_admin"),
    db.rpc("account_allowed", { target: user.id }),
  ]);
  return {
    user,
    profile: profile.data,
    admin: admin.data === true,
    allowed: !allowed.error && allowed.data === true,
  };
});
export async function requireRealtor() {
  const access = await getAccess();
  if (configured && !access.user) redirect("/login");
  if (access.profile?.account_type !== "realtor" || !access.allowed)
    redirect("/dashboard");
  return access;
}
export async function requireAdmin() {
  const a = await getAccess();
  if (!a.user) redirect("/login");
  if (!a.admin) notFound();
  return a;
}
