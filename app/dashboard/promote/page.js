import TopPromotion from "@/components/TopPromotion";
export default async function Page({ searchParams }) {
  const params = await searchParams;
  return (
    <TopPromotion
      propertyId={typeof params.property === "string" ? params.property : ""}
    />
  );
}
