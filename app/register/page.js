import { getLocale } from "@/lib/locale-server";
import Header from "@/components/Header";
import AuthForm from "@/components/AuthForm";
import { getViewer } from "@/lib/auth-server";
import { safeNext } from "@/lib/auth";
import { configured } from "@/lib/config";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getLocale();
  return { title: t("Create account") };
}
export default async function Page({ searchParams }) {
  const params = await searchParams;
  const user = await getViewer();
  const next = safeNext(params.next);
  if (user) redirect(next);
  const initialError =
    params.error === "confirmation_failed"
      ? "This confirmation link is invalid or expired. Request a new confirmation or log in."
      : params.error === "recovery_failed"
        ? "This recovery link is invalid or expired. Request a new link below."
        : "";
  return (
    <>
      <Header />
      <AuthForm
        mode="register"
        next={next}
        initialError={initialError}
        loggedOut={params.logged_out === "1"}
      />
    </>
  );
}
