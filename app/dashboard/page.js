"use client";
import { formatDate } from "@/lib/i18n";

import { useLocale } from "@/components/LocaleProvider";
import Link from "next/link";
import OwnerOverview from "@/components/OwnerOverview";
import { useCrm } from "@/components/CrmProvider";
export default function Overview() {
  const { t: tr, locale } = useLocale();

  const { properties, clients, leads, tasks, profile } = useCrm();
  if (profile.account_type === "owner") return <OwnerOverview />;
  const upcoming = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  return (
    <>
      <div className="toolbar">
        <div>
          <div className="eyebrow">{tr("A LITTLE CLARITY FOR YOUR DAY")}</div>
          <h1>
            {tr("Welcome back, ")}
            {profile.full_name.split(" ")[0]}.
          </h1>
          <p style={{ marginTop: 12 }}>
            {tr("Here’s what’s happening in your business.")}
          </p>
        </div>
        <Link href="/dashboard/properties/new" className="button">
          {tr("+ Add property")}
        </Link>
      </div>
      <div className="stats">
        {[
          [
            "Active properties",
            properties.filter((p) => p.status === "published").length,
          ],
          ["Your clients", clients.length],
          ["New leads", leads.filter((l) => l.status === "new").length],
          ["Upcoming tasks", upcoming.length],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{tr(label)}</span>
            <strong>{tr(value.toString().padStart(2, "0"))}</strong>
          </div>
        ))}
      </div>
      <div className="split">
        <section className="panel">
          <div className="toolbar">
            <h2>{tr("Recent leads")}</h2>
            <Link href="/dashboard/leads">{tr("View all ↗")}</Link>
          </div>
          {leads.slice(0, 5).map((l) => (
            <Link className="row" key={l.id} href="/dashboard/leads">
              <div>
                {l.name}
                <small>
                  {properties.find((p) => p.id === l.property_id)?.title ||
                    tr("Property unavailable")}
                </small>
              </div>
              <span className="badge">{tr(l.status)}</span>
            </Link>
          ))}
          {!leads.length && (
            <p>
              {tr(
                "No inquiries yet. Publish your first property to get started.",
              )}
            </p>
          )}
        </section>
        <section className="panel">
          <div className="toolbar">
            <h2>{tr("Up next")}</h2>
            <Link href="/dashboard/tasks">{tr("View all ↗")}</Link>
          </div>
          {upcoming.slice(0, 5).map((t) => (
            <Link className="row" key={t.id} href="/dashboard/tasks">
              <div>
                {t.title}
                <small>{formatDate(t.due_date, locale)}</small>
              </div>
              <span>→</span>
            </Link>
          ))}
          {!upcoming.length && <p>{tr("You’re all caught up.")}</p>}
        </section>
      </div>
      <section className="panel">
        <div className="toolbar">
          <h2>{tr("Recent properties")}</h2>
          <Link href="/dashboard/properties">{tr("View all ↗")}</Link>
        </div>
        {properties.slice(0, 4).map((p) => (
          <Link
            className="row"
            key={p.id}
            href={"/dashboard/properties/" + p.id}
          >
            <div>
              {p.title}
              <small>
                {tr(p.district)}, {tr(p.city)}
              </small>
            </div>
            <span className="badge">{tr(p.status)}</span>
          </Link>
        ))}
      </section>
    </>
  );
}
