"use client";
import { useLocale } from "@/components/LocaleProvider";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
export default function WorkspaceGuard({ children, ownerId }) {
  const { t: tr, locale } = useLocale();

  const { user, configured } = useAuth();
  const pathname = usePathname();
  const valid = !configured || user?.id === ownerId;
  useEffect(() => {
    if (!valid)
      window.location.replace("/login?next=" + encodeURIComponent(pathname));
  }, [valid, pathname]);
  if (!valid)
    return (
      <div className="loading" role="status">
        {tr("Your session changed. Taking you to log in…")}
      </div>
    );
  return children;
}
