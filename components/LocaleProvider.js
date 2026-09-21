"use client";
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTranslator, defaultLocale, validLocale } from "@/lib/i18n";
const Context = createContext({
  locale: defaultLocale,
  t: createTranslator(defaultLocale),
  setLocale: () => {},
});
export const useLocale = () => useContext(Context);
export default function LocaleProvider({ initialLocale, children }) {
  const [locale, update] = useState(initialLocale);
  const router = useRouter();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(
    () => ({
      locale,
      t: createTranslator(locale),
      setLocale(next) {
        const valid = validLocale(next);
        document.cookie =
          "tun-locale=" +
          valid +
          "; Path=/; Max-Age=31536000; SameSite=Lax" +
          (location.protocol === "https:" ? "; Secure" : "");
        update(valid);
        router.refresh();
      },
    }),
    [locale, router],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
