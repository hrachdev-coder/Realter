"use client";
import { useLocale } from "@/components/LocaleProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  House,
  Users,
  Inbox,
  CheckSquare,
  UserRound,
  ArrowUpRight,
} from "lucide-react";
import { useCrm } from "./CrmProvider";
import LogoutButton from "./LogoutButton";
export default function Sidebar() {
  const { t: tr, locale } = useLocale();

  const pathname = usePathname(),
    { demo, profile, admin } = useCrm();
  return (
    <aside className="sidebar">
      <Link className="brand" href="/">
        {tr("tun.")}
      </Link>
      <nav>
        {[
          [LayoutDashboard, "Overview", ""],
          [House, "Properties", "/properties"],
          [ArrowUpRight, "Promote TOP", "/promote"],
          [Users, "Clients", "/clients"],
          [Inbox, "Leads", "/leads"],
          [CheckSquare, "Tasks", "/tasks"],
          [UserRound, "Profile", "/profile"],
        ]
          .filter(
            ([, title]) =>
              profile.account_type !== "owner" ||
              !["Clients", "Tasks"].includes(title),
          )
          .map(([Icon, title, slug]) => (
            <Link
              className={
                (
                  slug
                    ? pathname.startsWith("/dashboard" + slug)
                    : pathname === "/dashboard"
                )
                  ? "active"
                  : ""
              }
              key={title}
              href={"/dashboard" + slug}
            >
              <Icon size={18} />
              {tr(
                profile.account_type === "owner" && title === "Leads"
                  ? "Inquiries"
                  : title,
              )}
            </Link>
          ))}
      </nav>
      <div className="sidebar-bottom">
        {admin && <Link href="/dashboard/admin">{tr("Administration")}</Link>}
        <Link href="/dashboard/favorites">{tr("Favorites")}</Link>
        <Link href="/dashboard/searches">{tr("Saved searches")}</Link>
        <Link href="/dashboard/statistics">{tr("Listing statistics")}</Link>
        <Link href="/properties">{tr("View marketplace ↗")}</Link>
        <LogoutButton demo={demo} />
      </div>
    </aside>
  );
}
