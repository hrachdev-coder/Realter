import PropertyEditor from "@/components/PropertyEditor";
export default async function Page({ params }) {
  return <PropertyEditor id={(await params).id} />;
}
