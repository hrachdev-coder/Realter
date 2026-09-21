import { requireAdmin } from "@/lib/access-server";
import AdminPanel from "@/components/AdminPanel";
export default async function Page() {
  await requireAdmin();
  return <AdminPanel />;
}
