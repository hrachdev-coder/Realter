import Tasks from "@/components/Tasks";
export default async function Page({ searchParams }) {
  return <Tasks leadId={(await searchParams).lead_id || ""} />;
}
