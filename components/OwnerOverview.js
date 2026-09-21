"use client";
import { useLocale } from "@/components/LocaleProvider";
import Link from "next/link";
import { useCrm } from "./CrmProvider";
export default function OwnerOverview() {
  const { t: tr, locale } = useLocale();

  const { properties, leads, profile } = useCrm();
  return (
    <>
      <div className="toolbar">
        <div>
          <div className="eyebrow">{tr("YOUR HOME, YOUR NEXT CHAPTER")}</div>
          <h1>
            {tr("Hello, ")}
            {profile.full_name.split(" ")[0] || "there"}.
          </h1>
          <p>{tr("List your home and manage inquiries in one place.")}</p>
        </div>
        <Link href="/dashboard/properties/new" className="button">
          {tr("+ List my property")}
        </Link>
      </div>
      <div className="owner-steps">
        <div>
          <strong>{tr("1. Tell us about your home")}</strong>
          <p>{tr("Add its location, price, details, and photos.")}</p>
        </div>
        <div>
          <strong>{tr("2. Publish your listing")}</strong>
          <p>
            {tr("Choose published when you’re ready for people to find it.")}
          </p>
        </div>
        <div>
          <strong>{tr("3. Connect with interested people")}</strong>
          <p>{tr("Read and follow up on inquiries here.")}</p>
        </div>
      </div>
      <div className="stats">
        <div className="stat">
          <span>{tr("Your listings")}</span>
          <strong>{tr(properties.length)}</strong>
        </div>
        <div className="stat">
          <span>{tr("Published")}</span>
          <strong>
            {tr(properties.filter((p) => p.status === "published").length)}
          </strong>
        </div>
        <div className="stat">
          <span>{tr("New inquiries")}</span>
          <strong>{tr(leads.filter((l) => l.status === "new").length)}</strong>
        </div>
      </div>
      <section className="panel">
        <h2>{tr("Your properties")}</h2>
        {properties.map((p) => (
          <Link
            className="row"
            key={p.id}
            href={"/dashboard/properties/" + p.id}
          >
            <span>{p.title}</span>
            <span className="badge">{tr(p.status)}</span>
          </Link>
        ))}
        {!properties.length && (
          <p>
            {tr("No listings yet. Add your first property to get started.")}
          </p>
        )}
      </section>
      <Link className="button secondary" href="/dashboard/leads">
        {tr("Read inquiries →")}
      </Link>
    </>
  );
}
