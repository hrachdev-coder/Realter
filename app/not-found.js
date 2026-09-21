import { getLocale } from "@/lib/locale-server";
import Link from "next/link";
export default async function NotFound() {
  const { t: tr, locale } = await getLocale();

  return (
    <main className="page">
      <div className="empty">
        <h1>{tr("This page has moved.")}</h1>
        <p>{tr("The property may no longer be available.")}</p>
        <Link className="button" style={{ marginTop: 20 }} href="/properties">
          {tr("Explore available homes")}
        </Link>
      </div>
    </main>
  );
}
