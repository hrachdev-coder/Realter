import LocaleProvider from "@/components/LocaleProvider";
import { getLocale } from "@/lib/locale-server";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { getViewer } from "@/lib/auth-server";
export async function generateMetadata() {
  const { t } = await getLocale();
  return {
    title: {
      default: t("Tun — Find your place in Armenia"),
      template: "%s | Tun",
    },
    description: t(
      "Discover homes across Armenia and manage your real estate business in one place.",
    ),
    icons: { icon: "/favicon.svg" },
  };
}
export default async function RootLayout({ children }) {
  const user = await getViewer();
  const { locale } = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <AuthProvider initialUser={user}>{children}</AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
