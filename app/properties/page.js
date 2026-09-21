import { getLocale } from "@/lib/locale-server";
import Header from "@/components/Header";
import PropertySearch from "@/components/PropertySearch";
import { searchProperties, searchFacets } from "@/lib/search-server";
export async function generateMetadata() {
  const { t } = await getLocale();
  return { title: t("Find a home") };
}
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }) {
  const { t: tr, locale } = await getLocale();

  let initialResult,
    locations = [],
    initialError = "";
  try {
    [initialResult, locations] = await Promise.all([
      searchProperties(await searchParams),
      searchFacets(),
    ]);
  } catch (e) {
    initialError = e.issues
      ? "This search link has invalid filters. Reset filters to continue."
      : e.message;
  }
  return (
    <>
      <Header />
      <main className="page">
        <div className="eyebrow">{tr("YOUR NEXT CHAPTER")}</div>
        <h1>{tr("Find a place to call home.")}</h1>
        <p>{tr("Explore homes for sale and rent across Armenia.")}</p>
        <PropertySearch
          initialResult={initialResult}
          locations={locations}
          initialError={initialError}
        />
      </main>
    </>
  );
}
