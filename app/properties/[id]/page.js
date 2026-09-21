import SaveProperty from "@/components/SaveProperty";
import RecordView from "@/components/RecordView";
import ReportProperty from "@/components/ReportProperty";
import { formatDate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { rentSuffix } from "@/lib/property-options";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Gallery from "@/components/Gallery";
import PropertyCard from "@/components/PropertyCard";
import { money } from "@/lib/i18n";
import InquiryForm from "@/components/InquiryForm";
import { publicProperties, publicProperty, realtor } from "@/lib/data";
import { configured } from "@/lib/config";
export const dynamic = "force-dynamic";
export default async function Page({ params }) {
  const { t: tr, locale } = await getLocale();

  const { id } = await params;
  const properties = await publicProperties();
  const p = await publicProperty(id);
  if (!p) notFound();
  const agent = await realtor(p.realtor_id);
  return (
    <>
      <Header />
      <main className="page">
        <Link className="text-link" href="/properties">
          {tr("← All properties")}
        </Link>
        <Gallery images={p.images} title={p.title} />
        <div className="detail-grid">
          <div>
            <span className="badge">
              {tr("For ")}
              {tr(p.listing_type)} · {tr(p.property_type)}
            </span>
            <h1>{p.title}</h1>
            <p>
              {p.address}, {tr(p.district)}, {tr(p.city)}
            </p>
            <div className="chips">
              {[
                p.bedrooms + " bedrooms",
                p.bathrooms + " bathrooms",
                p.area + " m²",
                "Floor " + (p.floor ?? "—") + " / " + (p.total_floors ?? "—"),
                p.condition,
                p.rooms != null ? p.rooms + " rooms" : null,
                p.building_type,
                p.building_year ? "Built " + p.building_year : null,
                p.furnishing,
                p.plot_area ? "Plot " + p.plot_area + " m²" : null,
              ]
                .filter(Boolean)
                .map((x) => (
                  <span className="chip" key={x}>
                    {tr(x)}
                  </span>
                ))}
            </div>
            <div className="panel">
              <h2>{tr("About this home")}</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{p.description}</p>
              {p.listing_type === "rent" && (
                <div className="chips">
                  {p.deposit != null && (
                    <span className="chip">
                      {tr("Deposit: ")}
                      {tr(money({ ...p, price: p.deposit }, locale))}
                    </span>
                  )}
                  {p.pets_allowed != null && (
                    <span className="chip">
                      {tr("Pets ")}
                      {tr(p.pets_allowed ? "allowed" : "not allowed")}
                    </span>
                  )}
                  {p.available_from && (
                    <span className="chip">
                      {tr("Available from ")}
                      {formatDate(p.available_from, locale)}
                    </span>
                  )}
                </div>
              )}
              <h3 style={{ marginTop: 25 }}>
                {tr("The little things that matter")}
              </h3>
              <div className="chips">
                {p.amenities?.map((x) => (
                  <span className="chip" key={x}>
                    ✓ {tr(x)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <aside>
            <div className="panel">
              <div className="price" style={{ fontSize: 34 }}>
                {tr(money(p, locale))}
                {p.listing_type === "rent" && (
                  <small>{tr(rentSuffix(p))}</small>
                )}
              </div>
              {agent && (
                <>
                  <Link
                    className="realtor-card"
                    style={{ margin: "25px 0" }}
                    href={"/realtors/" + agent.id}
                  >
                    <div className="avatar">{agent.full_name?.slice(0, 1)}</div>
                    <div>
                      <h3>{agent.full_name}</h3>
                      <p>{tr("View realtor profile ↗")}</p>
                    </div>
                  </Link>
                  {agent.phone && (
                    <a
                      className="button secondary"
                      style={{ width: "100%", marginBottom: 25 }}
                      href={"tel:" + agent.phone}
                    >
                      {tr("Call ")}
                      {agent.phone}
                    </a>
                  )}
                </>
              )}
              <InquiryForm propertyId={p.id} demo={!configured} />
              <SaveProperty id={p.id} />
              <RecordView id={p.id} />
              <ReportProperty id={p.id} />
            </div>
          </aside>
        </div>
        <div className="section-heading" style={{ marginTop: 50 }}>
          <h2>{tr("You might also like")}</h2>
        </div>
        <div className="property-grid">
          {properties
            .filter(
              (x) =>
                x.id !== p.id &&
                x.city === p.city &&
                x.listing_type === p.listing_type,
            )
            .slice(0, 3)
            .map((x) => (
              <PropertyCard property={x} key={x.id} />
            ))}
        </div>
      </main>
    </>
  );
}
