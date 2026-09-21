"use client";
import { useLocale } from "@/components/LocaleProvider";
import { useState } from "react";
import Link from "next/link";
import { useCrm } from "./CrmProvider";
import { matches } from "@/lib/matching";
export default function Clients() {
  const { t: tr, locale } = useLocale();

  const { clients, properties, remove } = useCrm(),
    [query, setQuery] = useState(""),
    [error, setError] = useState("");
  return (
    <>
      <div className="toolbar">
        <div>
          <h1>{tr("Your clients")}</h1>
          <p>{tr("The right home starts with the right understanding.")}</p>
        </div>
        <Link className="button" href="/dashboard/clients/new">
          {tr("+ Add client")}
        </Link>
      </div>
      <input
        style={{ maxWidth: 350, marginBottom: 25 }}
        placeholder={tr("Search clients…")}
        aria-label={tr("Search clients")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <div className="notice error">{tr(error)}</div>}
      <div className="panel">
        {clients
          .filter((c) =>
            c.full_name.toLowerCase().includes(query.toLowerCase()),
          )
          .map((c) => (
            <div className="row" key={c.id}>
              <Link href={"/dashboard/clients/" + c.id}>
                <h3>{c.full_name}</h3>
                <small>
                  {tr(c.preferred_city || "Any city")}
                  {tr(" · Looking to")}
                  {tr(" ")}
                  {tr(c.looking_for === "sale" ? "buy" : "rent")} ·{" "}
                  {tr(c.status)}
                </small>
              </Link>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <Link className="badge" href={"/dashboard/clients/" + c.id}>
                  {tr(properties.filter((p) => matches(p, c)).length)}
                  {tr(" matching homes")}
                </Link>
                <button
                  onClick={async () => {
                    if (confirm(tr("Delete " + c.full_name + "?")))
                      try {
                        await remove("clients", c.id);
                      } catch (e) {
                        setError(e.message);
                      }
                  }}
                >
                  {tr("Delete")}
                </button>
              </div>
            </div>
          ))}
        {!clients.length && (
          <div className="empty">
            {tr("Add your first client to find matching properties.")}
          </div>
        )}
      </div>
    </>
  );
}
