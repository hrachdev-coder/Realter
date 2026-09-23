"use client";
import { useState } from "react";
import { useLocale } from "./LocaleProvider";
export default function SaveSearch({ filters }) {
  const { t } = useLocale();
  const [name, setName] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="save-search"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const r = await fetch("/api/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_search", name, filters }),
          });
          const d = await r.json();
          if (!r.ok) throw Error(d.error);
          setMessage(
            "Search saved. Open Saved searches to see matching listings.",
          );
          setName("");
        } catch (e) {
          setMessage(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        {t("Name this search")}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
        />
      </label>
      <button className="button secondary" disabled={busy}>
        {t("Save search")}
      </button>
      {message && (
        <p className="save-search-message" role="status">
          {t(message)}
        </p>
      )}
    </form>
  );
}
