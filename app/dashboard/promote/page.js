import { redirect } from "next/navigation";
import { promotionsEnabled } from "@/lib/features";
import TopPromotion from "@/components/TopPromotion";
export default async function Page({ searchParams }) {
  if (!promotionsEnabled) redirect("/dashboard/properties");
  const params = await searchParams;
  return (
    <TopPromotion
      propertyId={typeof params.property === "string" ? params.property : ""}
    />
  );
}
