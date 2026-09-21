"use client";
import { useEffect, useState } from "react";
import { useCrm } from "./CrmProvider";
import { useLocale } from "./LocaleProvider";
import { topPackages, topStatus } from "@/lib/promotions";
import { formatPrice, localeTags } from "@/lib/i18n";
export default function TopPromotion({ propertyId = "" }) {
  const { properties } = useCrm();
  const { t, locale } = useLocale();
  const [selected, setSelected] = useState(propertyId),
    [days, setDays] = useState(3),
    [orders, setOrders] = useState([]),
    [available, setAvailable] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/promotions", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.orders || []);
        setAvailable(d.available === true);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setMessage("TOP is not connected yet.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, []);
  const eligible = properties.filter((p) => p.status === "published");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: selected, days }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setOrders((current) => [
        d.order,
        ...current.filter(
          (o) =>
            o.id !== d.order.id &&
            !(o.property_id === d.order.property_id && o.status === "pending"),
        ),
      ]);
      setMessage(
        "Order saved. No payment was taken and TOP is not active yet.",
      );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>{t("Promote your listing")}</h1>
      <p>{t("All core features stay free. TOP advertising is optional.")}</p>
      <form onSubmit={submit} className="panel form-stack top-form">
        <label>
          {t("Published listing")}
          <select
            required
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">{t("Choose your listing")}</option>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="top-package-options">
          <legend>{t("Choose a TOP package.")}</legend>
          {topPackages.map((pack) => (
            <label
              key={pack.days}
              className={
                days === pack.days ? "top-package selected" : "top-package"
              }
            >
              <input
                type="radio"
                name="top-package"
                value={pack.days}
                checked={days === pack.days}
                onChange={() => setDays(pack.days)}
              />
              <strong>{formatPrice(pack.amount, "AMD", locale)}</strong>
              <span>
                {pack.days} {t("days")}
              </span>
            </label>
          ))}
        </fieldset>
        <ul>
          <li>
            {t(
              "Shown in the sponsored section on the homepage and matching searches.",
            )}
          </li>
          <li>
            {t(
              "Clearly labelled Advertisement. Several promoted listings may share the section.",
            )}
          </li>
          <li>
            {t(
              "The period starts after confirmed payment. It does not pause if you hide your listing.",
            )}
          </li>
          <li>
            {t("No automatic renewal. Views and inquiries are not guaranteed.")}
          </li>
        </ul>
        <div className="notice">
          {t(
            "Online payments are not connected yet. You can prepare an order, but no money will be charged.",
          )}
        </div>
        {!loading && !available && (
          <p role="status">{t("TOP is not connected yet.")}</p>
        )}
        {!eligible.length && <p>{t("Publish a listing first to use TOP.")}</p>}
        <button
          className="button"
          disabled={
            busy ||
            loading ||
            !available ||
            !eligible.some((p) => p.id === selected)
          }
        >
          {t(busy ? "Saving…" : "Prepare TOP order")}
        </button>
        {message && (
          <div role="status" className="notice">
            {t(message)}
          </div>
        )}
      </form>
      <section className="panel">
        <h2>{t("Your TOP orders")}</h2>
        {orders.length ? (
          orders.map((o) => (
            <div className="row top-order" key={o.id}>
              <div>
                {properties.find((p) => p.id === o.property_id)?.title ||
                  t("Property unavailable")}
                <small>
                  {formatPrice(o.amount, "AMD", locale)} · {o.duration_days}{" "}
                  {t("days")}
                </small>
                {o.paid_at && (
                  <small>
                    {t("TOP ends:")}{" "}
                    {new Date(
                      new Date(o.paid_at).getTime() +
                        o.duration_days * 86400000,
                    ).toLocaleString(localeTags[locale])}
                  </small>
                )}
              </div>
              <span className="badge">{t("top_" + topStatus(o))}</span>
            </div>
          ))
        ) : (
          <p>{t(loading ? "Please wait…" : "No TOP orders yet.")}</p>
        )}
      </section>
    </>
  );
}
