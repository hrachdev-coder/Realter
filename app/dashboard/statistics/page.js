import { supabase } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale-server";
export default async function Page() {
  const { t } = await getLocale();
  const db = await supabase();
  const [stats, properties] = await Promise.all([
    db.rpc("property_statistics"),
    db.from("properties").select("id,title"),
  ]);
  return (
    <>
      <h1>{t("Listing statistics")}</h1>
      <p>
        {t(
          "Views are approximate unique daily browser visits. Inquiry counts include received requests.",
        )}
      </p>
      {stats.error ? (
        <p>{t("This feature is not connected yet.")}</p>
      ) : (
        <div className="panel">
          {stats.data.map((s) => (
            <div className="row" key={s.property_id}>
              <strong>
                {properties.data?.find((p) => p.id === s.property_id)?.title}
              </strong>
              <span>
                {t("Views")}: {s.views} · {t("Inquiries")}: {s.inquiries}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
