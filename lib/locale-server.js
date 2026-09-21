import { cookies } from "next/headers";
import { cache } from "react";
import { validLocale, createTranslator } from "./i18n";
export const getLocale = cache(async () => {
  const locale = validLocale((await cookies()).get("tun-locale")?.value);
  return { locale, t: createTranslator(locale) };
});
