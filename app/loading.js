import { getLocale } from "@/lib/locale-server";
export default async function Loading() {
  const { t: tr, locale } = await getLocale();

  return (
    <div className="loading" role="status">
      {tr("Finding your place…")}
    </div>
  );
}
