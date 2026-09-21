import ClientEditor from "@/components/ClientEditor";
export default async function Page({ params }) {
  return <ClientEditor id={(await params).id} />;
}
