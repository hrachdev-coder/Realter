"use client";
import { useState, useEffect } from "react";
import { useLocale } from "./LocaleProvider";
import { useAuth } from "./AuthProvider";
export default function SaveProperty({ id }) {
  const { t } = useLocale(),
    { user } = useAuth();
  const [saved, setSaved] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    fetch("/api/saved")
      .then((r) => r.json())
      .then((d) => {
        if (active) setSaved(d.favoriteIds?.includes(id) || false);
      })
      .catch(() => {
        if (active) setMessage("Unable to load saved items.");
      });
    return () => {
      active = false;
    };
  }, [id, user]);
  return (
    <>
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          if (!user) {
            setMessage("Please log in.");
            return;
          }
          setBusy(true);
          try {
            const r = await fetch("/api/saved", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: saved ? "unfavorite" : "favorite",
                id,
              }),
            });
            const d = await r.json();
            if (!r.ok) throw Error(d.error);
            setSaved(!saved);
            setMessage("");
          } catch (e) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t(saved ? "Remove from favorites" : "Save to favorites")}
      </button>
      {message && <p role="status">{t(message)}</p>}
    </>
  );
}
