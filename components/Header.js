"use client";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale } from "@/components/LocaleProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowUpRight, House, Menu, X, UserRound } from "lucide-react";
import { useAuth } from "./AuthProvider";
import LogoutButton from "./LogoutButton";
export default function Header() {
  const { t: tr, locale } = useLocale();

  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  const links = (
    <>
      <Link href="/properties">{tr("Find a home")}</Link>
      <Link href="/properties?listing_type=rent">{tr("Rent a home")}</Link>
      <Link href={user ? "/dashboard" : "/login?next=/dashboard"}>
        {tr("For realtors")}
        <ArrowUpRight size={14} />
      </Link>
    </>
  );
  return (
    <header className="header">
      <Link href="/" className="brand" aria-label={tr("Tun home")}>
        <span>
          <House size={23} />
        </span>
        {tr("tun")}
        <span className="brand-dot">.</span>
      </Link>
      <nav aria-label={tr("Main navigation")}>{tr(links)}</nav>
      <div className="header-actions">
        <LanguageSwitcher />
        {user ? (
          <>
            <Link className="account-link" href="/dashboard">
              <UserRound size={17} />
              <span>{tr("My dashboard")}</span>
            </Link>
            <div className="desktop-logout">
              <LogoutButton />
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="login-link">
              {tr("Log in")}
            </Link>
            <Link href="/register" className="register-link">
              {tr("Sign up")}
            </Link>
          </>
        )}
        <Link
          href={
            user
              ? "/dashboard/properties/new"
              : "/login?next=/dashboard/properties/new"
          }
          className="button small listing-cta"
        >
          {tr("List a property")}
          <span>↗</span>
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-label={tr(open ? "Close menu" : "Open menu")}
          aria-controls="mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-menu"
          aria-label={tr("Mobile navigation")}
          className="mobile-menu"
        >
          {tr(links)}
          <Link
            href={
              user
                ? "/dashboard/properties/new"
                : "/login?next=/dashboard/properties/new"
            }
          >
            {tr("List a property")}
          </Link>
          {user ? (
            <>
              <Link href="/dashboard/profile">{tr("My profile")}</Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login">{tr("Log in")}</Link>
              <Link href="/register">{tr("Create an account")}</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
