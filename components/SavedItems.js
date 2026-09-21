"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "./LocaleProvider";
import PropertyCard from "./PropertyCard";
import { serializeFilters } from "@/lib/search";
export default function SavedItems({ mode }) {
  const { t } = useLocale();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/saved");
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function remove(id) {
    setBusy(true);
    try {
      const r = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "favorites" ? "unfavorite" : "delete_search",
          id,
        }),
      });
      if (!r.ok) throw Error("Unable to save. Check your input or try later.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>{t(mode === "favorites" ? "Favorites" : "Saved searches")}</h1>
      {error && <p role="alert">{t(error)}</p>}
      {!data ? (
        <p>{t("Please wait…")}</p>
      ) : mode === "favorites" ? (
        <>
          <p>{t("Only currently available listings are shown.")}</p>
          <div className="property-grid">
            {data.favorites.map((p) => (
              <div key={p.id}>
                <PropertyCard property={p} />
                <button disabled={busy} onClick={() => remove(p.id)}>
                  {t("Remove")}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p>
            {t(
              "Open a saved search to see current matching listings. Email alerts are not enabled yet.",
            )}
          </p>
          {data.searches.map((s) => (
            <div className="panel row" key={s.id}>
              <Link href={"/properties?" + serializeFilters(s.filters)}>
                {s.name}
              </Link>
              <button disabled={busy} onClick={() => remove(s.id)}>
                {t("Delete")}
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
}
