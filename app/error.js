"use client";
import { useLocale } from "@/components/LocaleProvider";
export default function Error({ reset }) {
  const { t: tr, locale } = useLocale();

  return (
    <main className="page">
      <div className="empty">
        <h1>{tr("Something didn’t load.")}</h1>
        <p>{tr("Please try again in a moment.")}</p>
        <button onClick={reset} className="button" style={{ marginTop: 20 }}>
          {tr("Try again")}
        </button>
      </div>
    </main>
  );
}
