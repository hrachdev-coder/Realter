import { messages } from "./messages.js";
export const supportedLocales = ["hy", "ru", "en"];
export const defaultLocale = "hy";
export const localeTags = { en: "en-US", hy: "hy-AM", ru: "ru-RU" };
export const validLocale = (value) =>
  supportedLocales.includes(value) ? value : defaultLocale;
export function formatPrice(amount, currency = "USD", locale = defaultLocale) {
  return new Intl.NumberFormat(localeTags[validLocale(locale)], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
export const money = (p, locale) => formatPrice(p.price, p.currency, locale);
export function formatDate(value, locale = defaultLocale) {
  if (!value) return "";
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat(localeTags[validLocale(locale)], {
        dateStyle: "medium",
      }).format(d);
}
const patterns = [
  [/^(\d+) homes to discover$/, ["{0} հայտարարություն", "{0} объявлений"]],
  [
    /^Resend in (\d+)s$/,
    ["Կրկին ուղարկել {0} վրկ․ հետո", "Повторить через {0} с"],
  ],
  [
    /^Minimum rent \/ (.+)$/,
    ["Նվազագույն վարձավճար / {0}", "Минимальная аренда / {0}"],
  ],
  [
    /^Maximum rent \/ (.+)$/,
    ["Առավելագույն վարձավճար / {0}", "Максимальная аренда / {0}"],
  ],
  [/^Rent per (.+)$/, ["Վարձավճար / {0}", "Аренда / {0}"]],
  [
    /^Maximum deposit \((.+)\)$/,
    ["Առավելագույն դեպոզիտ ({0})", "Максимальный залог ({0})"],
  ],
  [/^(\d+) bedrooms$/, ["{0} ննջասենյակ", "{0} спален"]],
  [/^(\d+) bathrooms$/, ["{0} սանհանգույց", "{0} санузлов"]],
  [/^(\d+) rooms$/, ["{0} սենյակ", "{0} комнат"]],
  [/^([\d.]+) m²$/, ["{0} մ²", "{0} м²"]],
  [/^Floor (.+)$/, ["Հարկ՝ {0}", "Этаж: {0}"]],
  [/^Built (.+)$/, ["Կառուցված՝ {0}", "Год постройки: {0}"]],
  [/^Plot (.+) m²$/, ["Հողամաս՝ {0} մ²", "Участок: {0} м²"]],
  [
    /^(?:Property photo|Open photo) (\d+)$/,
    ["Գույքի լուսանկար {0}", "Фото объекта {0}"],
  ],
  [/^Status for (.+)$/, ["Կարգավիճակ՝ {0}", "Статус: {0}"]],
  [/^Stage for (.+)$/, ["Փուլ՝ {0}", "Этап: {0}"]],
  [/^Delete (.+)\?$/, ["Ջնջե՞լ {0}։", "Удалить {0}?"]],
  [
    /^Permanently delete “(.+)”\? Existing inquiries will keep their contact details\.$/,
    [
      "Վերջնականապես ջնջե՞լ «{0}» հայտարարությունը։ Հարցումների կոնտակտային տվյալները կպահպանվեն։",
      "Удалить «{0}» навсегда? Контактные данные обращений сохранятся.",
    ],
  ],
  [
    /^(.+): minimum must not exceed maximum\.$/,
    [
      "{0}․ նվազագույնը չի կարող գերազանցել առավելագույնը։",
      "{0}: минимум не должен превышать максимум.",
    ],
  ],
  [
    /^(.+) Uploaded photos were kept; save to attach them\.$/,
    [
      "{0} Բեռնված լուսանկարները պահպանված են․ կցելու համար պահպանեք հայտարարությունը։",
      "{0} Загруженные фото сохранены; сохраните объявление, чтобы прикрепить их.",
    ],
  ],
  [/^Remove (.+) filter$/, ["Հեռացնել «{0}» ֆիլտրը", "Убрать фильтр «{0}»"]],
  [/^\/ ?(day|month|year)$/, ["/{0}", "/{0}"]],
];
export function translate(value, locale = defaultLocale) {
  if (typeof value !== "string" || locale === "en") return value;
  const key = value.trim();
  if (!key) return value;
  const direct = messages[key]?.[locale];
  if (direct !== undefined) return value.replace(key, direct);
  for (const [pattern, copy] of patterns) {
    const match = key.match(pattern);
    if (match) {
      const translated = copy[locale === "hy" ? 0 : 1].replace(
        /\{(\d+)\}/g,
        (_, i) => translate(match[Number(i) + 1], locale),
      );
      return value.replace(key, translated);
    }
  }
  if (/^Invalid |^Too small:|^Too big:/.test(key))
    return messages["Please check the highlighted fields."][locale];
  return value;
}
export const createTranslator = (locale) => (value) =>
  translate(value, validLocale(locale));
