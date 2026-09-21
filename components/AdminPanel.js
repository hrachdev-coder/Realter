"use client";
import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";
export default function AdminPanel() {
  const { t } = useLocale();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState("");
  async function load() {
    const r = await fetch("/api/admin");
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function act(action, target) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const button = (label, action, id) => (
    <button
      disabled={busy || reason.trim().length < 3}
      onClick={() => act(action, id)}
      className="button secondary small"
    >
      {t(label)}
    </button>
  );
  return (
    <>
      <h1>{t("Administration")}</h1>
      <p>{t("Latest 100 records. Every moderation action is recorded.")}</p>
      <label>
        {t("Reason for action")}
        <textarea
          value={reason}
          maxLength={2000}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error && <p role="alert">{t(error)}</p>}
      {!data ? (
        <p>{t("Please wait…")}</p>
      ) : (
        <>
          <section className="panel">
            <h2>{t("Reports")}</h2>
            {data.reports.map((r) => (
              <div className="row" key={r.id}>
                <div>
                  <strong>
                    {data.properties.find((p) => p.id === r.property_id)
                      ?.title || r.property_id}
                  </strong>
                  <p>{r.reason}</p>
                  <small>{t(r.status)}</small>
                </div>
                {r.status === "open" &&
                  button("Resolve report", "resolve", r.id)}
              </div>
            ))}
          </section>
          <section className="panel">
            <h2>{t("Properties")}</h2>
            {data.properties.map((p) => (
              <div className="row" key={p.id}>
                <div>
                  {p.title}
                  <small>
                    {t(p.status)} · {t(p.moderation_status)}
                  </small>
                </div>
                {button(
                  p.moderation_status === "blocked"
                    ? "Restore listing"
                    : "Hide listing",
                  p.moderation_status === "blocked" ? "approve" : "block",
                  p.id,
                )}
              </div>
            ))}
          </section>
          <section className="panel">
            <h2>{t("Accounts")}</h2>
            {data.profiles.map((p) => {
              const blocked = data.restrictions.some((r) => r.user_id === p.id);
              return (
                <div className="row" key={p.id}>
                  <div>
                    {p.full_name}
                    <small>
                      {p.id} · {t(p.account_type)}
                    </small>
                  </div>
                  {button(
                    blocked ? "Restore account" : "Restrict account",
                    blocked ? "unrestrict" : "restrict",
                    p.id,
                  )}
                </div>
              );
            })}
          </section>
          <section className="panel">
            <h2>{t("Moderation history")}</h2>
            {data.audit.map((a) => (
              <div className="row" key={a.id}>
                <div>
                  {t(a.action)}
                  <small>{a.target}</small>
                  <p>{a.reason}</p>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
