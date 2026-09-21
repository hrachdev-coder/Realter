import { getAccess } from "@/lib/access-server";
import { getLocale } from "@/lib/locale-server";
import WorkspaceUnavailable from "@/components/WorkspaceUnavailable";
import { redirect } from "next/navigation";
import { configured } from "@/lib/config";
import { supabase } from "@/lib/supabase/server";
import {
  demoProperties,
  demoClients,
  demoLeads,
  demoTasks,
  demoRealtor,
} from "@/lib/demo";
import { CrmProvider } from "@/components/CrmProvider";
import Sidebar from "@/components/Sidebar";
import WorkspaceGuard from "@/components/WorkspaceGuard";
import WorkspaceTop from "@/components/WorkspaceTop";
export const dynamic = "force-dynamic";
export default async function Layout({ children }) {
  const { t: tr, locale } = await getLocale();

  let user = { id: "demo" },
    initial = {
      properties: demoProperties,
      clients: demoClients,
      leads: demoLeads,
      tasks: demoTasks,
      profile: demoRealtor,
    };
  if (configured) {
    const db = await supabase();
    const auth = await db.auth.getUser();
    if (!auth.data.user) redirect("/login");
    user = { id: auth.data.user.id };
    const access = await getAccess();
    const results = await Promise.all(
      ["properties", "clients", "leads", "tasks"].map((table) =>
        ["clients", "tasks"].includes(table) &&
        access.profile?.account_type !== "realtor"
          ? Promise.resolve({ data: [], error: null })
          : db
              .from(table)
              .select("*")
              .eq("realtor_id", user.id)
              .order("created_at", { ascending: false }),
      ),
    );
    if (results.some((r) => r.error)) {
      const codes = results.filter((r) => r.error).map((r) => r.error.code);
      console.error("Workspace query failed", { codes });
      return (
        <WorkspaceUnavailable
          missingSchema={codes.some((c) =>
            ["PGRST205", "42P01", "42703"].includes(c),
          )}
        />
      );
    }
    initial = Object.fromEntries(
      ["properties", "clients", "leads", "tasks"].map((t, i) => [
        t,
        results[i].data,
      ]),
    );
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) {
      console.error("Workspace profile unavailable", { code: error.code });
      return <WorkspaceUnavailable missingSchema={true} />;
    }
    initial.profile = data;
    initial.admin = access.admin;
    initial.allowed = access.allowed;
  }
  return (
    <WorkspaceGuard ownerId={user.id}>
      <CrmProvider
        key={user.id}
        initial={initial}
        user={user}
        demo={!configured}
      >
        <div className="dashboard">
          <Sidebar />
          <main className="dashboard-main">
            <WorkspaceTop />
            {!configured && (
              <div className="notice">
                {tr(
                  "Demo workspace · Sample data only. Changes reset when you leave or reload. Connect Supabase to save real data.",
                )}
              </div>
            )}
            {children}
          </main>
        </div>
      </CrmProvider>
    </WorkspaceGuard>
  );
}
