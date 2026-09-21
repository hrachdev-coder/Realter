import { requireRealtor } from "@/lib/access-server";
export default async function Layout({ children }) {
  await requireRealtor();
  return children;
}
