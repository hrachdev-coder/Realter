"use client";
import { useLocale } from "@/components/LocaleProvider";
import { useState } from "react";
import Link from "next/link";
import { useCrm } from "./CrmProvider";
import { matches } from "@/lib/matching";
import { money } from "@/lib/i18n";
import { imageUrl } from "@/lib/images";
export default function CrmProperties() {
  const { t: tr, locale } = useLocale();

  const { properties, clients, save, remove } = useCrm();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function act(p, action) {
    if (
      action === "delete" &&
      !confirm(
        tr(
          "Permanently delete “" +
            p.title +
            "”? Existing inquiries will keep their contact details.",
        ),
      )
    )
      return;
    setBusy(true);
    try {
      action === "delete"
        ? await remove("properties", p.id)
        : await save("properties", { ...p, status: action }, p.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = properties.filter(
    (p) =>
      (!status || p.status === status) &&
      p.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="toolbar">
        <div>
          <h1>{tr("Your properties")}</h1>
          <p>{tr("Add once. Publish when you’re ready.")}</p>
        </div>
        <Link className="button" href="/dashboard/properties/new">
          {tr("+ Add property")}
        </Link>
      </div>
      <div className="toolbar">
        <input
          aria-label={tr("Search your properties")}
          placeholder={tr("Search properties…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 350 }}
        />
        <select
          aria-label={tr("Filter by status")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{tr("All statuses")}</option>
          {["draft", "published", "sold", "rented", "archived"].map((x) => (
            <option key={x} value={x}>
              {tr(x)}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {tr(error)}
        </div>
      )}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>{tr("Property")}</th>
              <th>{tr("Price")}</th>
              <th>{tr("Status")}</th>
              <th>{tr("Client matches")}</th>
              <th>{tr("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link
                    className="table-title"
                    href={"/dashboard/properties/" + p.id}
                  >
                    <img src={imageUrl(p.images?.[0])} alt={tr("")} />
                    <span>
                      {p.title}
                      <small className="muted" style={{ display: "block" }}>
                        {tr(p.city)} · {tr(p.area)}
                        {tr(" m²")}
                      </small>
                    </span>
                  </Link>
                </td>
                <td>{tr(money(p, locale))}</td>
                <td>
                  <select
                    aria-label={tr("Status for " + p.title)}
                    disabled={busy}
                    value={p.status}
                    onChange={(e) => act(p, e.target.value)}
                  >
                    {["draft", "published", "sold", "rented", "archived"].map(
                      (x) => (
                        <option key={x} value={x}>
                          {tr(x)}
                        </option>
                      ),
                    )}
                  </select>
                </td>
                <td>
                  {tr(clients.filter((c) => matches(p, c)).length)}
                  {tr(" matches")}
                </td>
                <td>
                  <div className="table-actions">
                    <Link href={"/dashboard/properties/" + p.id}>
                      {tr("Edit")}
                    </Link>
                    {p.status === "published" && (
                      <Link href={"/dashboard/promote?property=" + p.id}>
                        {tr("Promote TOP")}
                      </Link>
                    )}
                    <button disabled={busy} onClick={() => act(p, "delete")}>
                      {tr("Delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty">
            {tr("No properties found. Add a home to get started.")}
          </div>
        )}
      </div>
    </>
  );
}
