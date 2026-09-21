"use client";
import { useLocale } from "@/components/LocaleProvider";

import Link from "next/link";
import LogoutButton from "./LogoutButton";
export default function WorkspaceUnavailable({ missingSchema = false }) {
  const { t: tr, locale } = useLocale();

  return (
    <main className="page">
      <section className="panel">
        <h1>
          {tr(
            missingSchema
              ? "Workspace setup is not finished yet."
              : "Your workspace is temporarily unavailable.",
          )}
        </h1>
        <p style={{ margin: "20px 0" }}>
          {tr(
            missingSchema
              ? "Your account is signed in, but the property database still needs to be initialized by the site administrator. Your account has not been lost."
              : "We could not load your saved data. Please try again shortly.",
          )}
        </p>
        <div className="toolbar">
          <a className="button" href="/dashboard">
            {tr("Try again")}
          </a>
          <Link className="button secondary" href="/">
            {tr("Back to marketplace")}
          </Link>
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
