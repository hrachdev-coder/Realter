"use client";
import { useLocale } from "@/components/LocaleProvider";
import { useState } from "react";
import Link from "next/link";
import { useCrm } from "@/components/CrmProvider";
const stages = ["new", "contacted", "viewing", "negotiation", "won", "lost"];
export default function Leads() {
  const { t: tr, locale } = useLocale();

  const { leads, properties, save } = useCrm(),
    [filter, setFilter] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="toolbar">
        <div>
          <h1>{tr("Every inquiry, an opportunity.")}</h1>
          <p>{tr("Keep the conversation moving.")}</p>
        </div>
        <select
          aria-label={tr("Filter leads")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">{tr("All stages")}</option>
          {stages.map((x) => (
            <option key={x} value={x}>
              {tr(x)}
            </option>
          ))}
        </select>
      </div>
      {message && <div className="notice error">{tr(message)}</div>}
      {leads
        .filter((l) => !filter || l.status === filter)
        .map((l) => (
          <article key={l.id} className="panel">
            <div className="toolbar">
              <div>
                <h3>{l.name}</h3>
                <small className="muted">
                  {tr(
                    new Date(l.created_at).toLocaleDateString(
                      locale === "hy"
                        ? "hy-AM"
                        : locale === "ru"
                          ? "ru-RU"
                          : "en-US",
                    ),
                  )}
                </small>
              </div>
              <select
                disabled={busy}
                aria-label={tr("Stage for " + l.name)}
                value={l.status}
                onChange={async (e) => {
                  setBusy(true);
                  try {
                    await save("leads", { status: e.target.value }, l.id);
                  } catch (e) {
                    setMessage(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {stages.map((x) => (
                  <option key={x} value={x}>
                    {tr(x)}
                  </option>
                ))}
              </select>
            </div>
            {l.property_id && (
              <Link
                className="text-link"
                href={"/dashboard/properties/" + l.property_id}
              >
                {properties.find((p) => p.id === l.property_id)?.title ||
                  tr("Property unavailable")}
              </Link>
            )}
            <p>{l.message}</p>
            <div className="chips">
              {l.email && (
                <a className="chip" href={"mailto:" + l.email}>
                  {l.email}
                </a>
              )}
              {l.phone && (
                <a className="chip" href={"tel:" + l.phone}>
                  {l.phone}
                </a>
              )}
              <Link className="chip" href={"/dashboard/tasks?lead_id=" + l.id}>
                {tr("+ Follow-up task")}
              </Link>
            </div>
          </article>
        ))}
      {!leads.filter((l) => !filter || l.status === filter).length && (
        <div className="empty">{tr("No leads in this stage.")}</div>
      )}
    </>
  );
}
