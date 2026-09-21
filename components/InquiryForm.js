"use client";
import { useLocale } from "@/components/LocaleProvider";
import { useState, useEffect } from "react";
import { translate, supportedLocales } from "@/lib/i18n";
const greeting =
  "Hi, I’m interested in this property. Could we arrange a viewing?";
export default function InquiryForm({ propertyId, demo }) {
  const { t: tr, locale } = useLocale();
  const [draft, setDraft] = useState(() => tr(greeting));
  useEffect(() => {
    setDraft((current) =>
      supportedLocales.some((lang) => translate(greeting, lang) === current)
        ? translate(greeting, locale)
        : current,
    );
  }, [locale]);

  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, property_id: propertyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      e.target.reset();
      setDraft(tr(greeting));
    } catch (error) {
      setMessage(error.message || "Unable to send inquiry. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <h3>{tr("Let’s arrange a viewing")}</h3>
      {demo && (
        <p className="notice">{tr("Demo listing — inquiries are not sent.")}</p>
      )}
      <label>
        {tr("Your name")}
        <input name="name" required maxLength={100} />
      </label>
      <label>
        {tr("Email")}
        <input name="email" type="email" required maxLength={254} />
      </label>
      <label>
        {tr("Phone")}
        <input name="phone" type="tel" maxLength={30} />
      </label>
      <label>
        {tr("Message")}
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ display: "none" }}
      />
      <button disabled={busy} className="button">
        {tr(busy ? "Sending…" : "Send inquiry")}
      </button>
      {message && (
        <div role="status" className="notice">
          {tr(message)}
        </div>
      )}
    </form>
  );
}
