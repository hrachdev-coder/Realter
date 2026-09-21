"use client";
import { useLocale } from "./LocaleProvider";
export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  return (
    <label className="language-switcher">
      <span className="sr-only">{t("Language")}</span>
      <select
        aria-label={t("Language")}
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
      >
        <option value="hy" lang="hy">
          Հայերեն
        </option>
        <option value="ru" lang="ru">
          Русский
        </option>
        <option value="en" lang="en">
          English
        </option>
      </select>
    </label>
  );
}
