"use client";
import { useLocale } from "@/components/LocaleProvider";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCrm } from "./CrmProvider";
import { matches } from "@/lib/matching";
import { money } from "@/lib/i18n";
const defaults = {
  full_name: "",
  phone: "",
  email: "",
  notes: "",
  looking_for: "sale",
  preferred_city: "Yerevan",
  preferred_districts: [],
  min_price: null,
  max_price: null,
  min_bedrooms: null,
  max_bedrooms: null,
  min_area: null,
  status: "active",
  currency: "USD",
};
export default function ClientEditor({ id }) {
  const { t: tr, locale } = useLocale();

  const { clients, properties, save } = useCrm(),
    router = useRouter();
  const existing = clients.find((c) => c.id === id);
  const [value, setValue] = useState({ ...defaults, ...existing }),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (id && !existing)
    return <div className="empty">{tr("Client not found.")}</div>;
  function field(key, label, type = "text", options) {
    return (
      <label key={key}>
        {tr(label)}
        {options ? (
          <select
            value={value[key]}
            onChange={(e) => setValue({ ...value, [key]: e.target.value })}
          >
            {options.map((x) => (
              <option key={x} value={x}>
                {tr(x)}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            min={type === "number" ? 0 : undefined}
            value={value[key] ?? ""}
            required={key === "full_name"}
            onChange={(e) =>
              setValue({
                ...value,
                [key]:
                  type === "number"
                    ? e.target.value === ""
                      ? null
                      : Number(e.target.value)
                    : e.target.value,
              })
            }
          />
        )}
      </label>
    );
  }
  const matching = properties.filter((p) => matches(p, value));
  return (
    <>
      <Link href="/dashboard/clients" className="text-link">
        {tr("← Clients")}
      </Link>
      <h1 style={{ margin: "25px 0" }}>
        {id ? value.full_name : tr("Get to know your client")}
      </h1>
      <form
        className="panel editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const c = await save("clients", value, id);
            setMessage("Client saved.");
            if (!id) router.push("/dashboard/clients/" + c.id);
          } catch (e) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{tr("Contact details")}</h2>
        {tr(field("full_name", "Full name"))}
        {tr(field("email", "Email", "email"))}
        {tr(field("phone", "Phone", "tel"))}
        {tr(field("status", "Status", "text", ["active", "paused", "closed"]))}
        <label className="wide">
          {tr("Notes")}
          <textarea
            value={value.notes}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </label>
        <h2>{tr("The home they’re looking for")}</h2>
        {tr(field("looking_for", "Looking for", "text", ["sale", "rent"]))}
        {value.looking_for === "rent" && (
          <p className="wide">
            {tr("Rental budgets and matches are monthly.")}
          </p>
        )}
        {tr(
          field("currency", "Budget currency", "text", [
            "USD",
            "AMD",
            "EUR",
            "RUB",
          ]),
        )}
        {tr(field("preferred_city", "Preferred city (blank for any)"))}
        <label className="wide">
          {tr("Preferred districts (comma separated; blank for any)")}
          <input
            value={value.preferred_districts.join(", ")}
            onChange={(e) =>
              setValue({
                ...value,
                preferred_districts: e.target.value
                  ? e.target.value.split(",").map((s) => s.trim())
                  : [],
              })
            }
          />
        </label>
        {tr(
          [
            ["min_price", "Minimum budget"],
            ["max_price", "Maximum budget"],
            ["min_bedrooms", "Minimum bedrooms"],
            ["max_bedrooms", "Maximum bedrooms"],
            ["min_area", "Minimum area (m²)"],
          ].map(([key, label]) => field(key, label, "number")),
        )}
        {message && (
          <div className="notice wide" role="status">
            {tr(message)}
          </div>
        )}
        <button className="button" disabled={busy}>
          {tr(busy ? "Saving…" : "Save client")}
        </button>
      </form>
      <section className="panel">
        <h2>
          {tr(matching.length)}
          {tr(" matching homes")}
        </h2>
        <p>{tr("Based on location, budget, bedrooms, and space.")}</p>
        {matching.map((p) => (
          <Link
            className="row"
            key={p.id}
            href={"/dashboard/properties/" + p.id}
          >
            <div>
              {p.title}
              <small>
                {tr(p.district)}, {tr(p.city)} · {tr(p.bedrooms)}
                {tr(" beds · ")}
                {tr(p.area)}
                {tr(" m²")}
              </small>
            </div>
            <span>{tr(money(p, locale))} →</span>
          </Link>
        ))}
        {!matching.length && (
          <div className="empty">
            {tr("No matching properties yet. Try adjusting the requirements.")}
          </div>
        )}
      </section>
    </>
  );
}
