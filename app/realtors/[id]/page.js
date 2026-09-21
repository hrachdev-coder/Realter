import { getLocale } from "@/lib/locale-server";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import PropertyCard from "@/components/PropertyCard";
import { publicProperties, realtor } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function Page({ params }) {
  const { t: tr, locale } = await getLocale();

  const { id } = await params;
  const agent = await realtor(id);
  if (!agent) notFound();
  const properties = (await publicProperties()).filter(
    (p) => p.realtor_id === id,
  );
  return (
    <>
      <Header />
      <main className="page">
        <section className="panel">
          <div className="eyebrow">{tr("YOUR LOCAL EXPERT")}</div>
          <h1>{agent.full_name}</h1>
          <p>{agent.bio}</p>
          <p>{tr(agent.city)}</p>
          {agent.phone && (
            <a className="button" href={"tel:" + agent.phone}>
              {tr("Call ")}
              {agent.phone}
            </a>
          )}
        </section>
        <h2 style={{ margin: "35px 0" }}>{tr("Available homes")}</h2>
        <div className="property-grid">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
        {!properties.length && (
          <div className="empty">{tr("No published properties yet.")}</div>
        )}
      </main>
    </>
  );
}
