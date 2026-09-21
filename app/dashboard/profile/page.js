"use client";
import { useLocale } from "@/components/LocaleProvider";
import { useState } from "react";
import Link from "next/link";
import { useCrm } from "@/components/CrmProvider";
export default function Profile() {
  const { t: tr, locale } = useLocale();

  const { profile, save } = useCrm(),
    [value, setValue] = useState({
      account_type: profile.account_type || "owner",
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      bio: profile.bio || "",
      city: profile.city || "",
    }),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <>
      <h1>{tr("Your public profile.")}</h1>
      <p style={{ margin: "12px 0 25px" }}>
        {tr("Introduce yourself to the people behind your next move.")}
      </p>
      <form
        className="panel form-stack"
        style={{ maxWidth: 700 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save("profiles", value, profile.id);
            setMessage("Profile saved.");
          } catch (e) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {[
          ["full_name", "Full name"],
          ["phone", "Public phone number"],
          ["city", "City"],
        ].map(([key, label]) => (
          <label key={key}>
            {tr(label)}
            <input
              required={key === "full_name"}
              value={value[key]}
              onChange={(e) => setValue({ ...value, [key]: e.target.value })}
            />
          </label>
        ))}
        <label>
          {tr("Workspace type")}
          <select
            value={value.account_type}
            onChange={(e) =>
              setValue({ ...value, account_type: e.target.value })
            }
          >
            <option value="owner">{tr("Homeowner")}</option>
            <option value="realtor">{tr("Realtor with CRM")}</option>
          </select>
        </label>
        <label>
          {tr("About you")}
          <textarea
            value={value.bio}
            onChange={(e) => setValue({ ...value, bio: e.target.value })}
          />
        </label>
        <button className="button" disabled={busy}>
          {tr(busy ? "Saving…" : "Save profile")}
        </button>
        <Link className="text-link" href={"/realtors/" + profile.id}>
          {tr("View public profile ↗")}
        </Link>
        {message && (
          <div className="notice" role="status">
            {tr(message)}
          </div>
        )}
      </form>
    </>
  );
}
