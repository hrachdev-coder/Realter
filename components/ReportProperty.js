"use client";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "./LocaleProvider";
export default function ReportProperty({ id }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section>
      <button
        type="button"
        className="text-link report-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {t("Report listing")}
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const r = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ property_id: id, reason }),
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              setMessage("Report sent for review.");
              setReason("");
            } catch (e) {
              setMessage(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {t("Describe the problem")}
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button className="button secondary" disabled={busy}>
            {t("Send report")}
          </button>
          <p role="status">{t(message)}</p>
          {message === "Please log in." && (
            <Link
              className="text-link"
              href={"/login?next=" + encodeURIComponent("/properties/" + id)}
            >
              {t("Log in")}
            </Link>
          )}
        </form>
      )}
    </section>
  );
}
