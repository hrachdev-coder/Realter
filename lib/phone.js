export function phoneHref(value) {
  if (typeof value !== "string" || !/^[+\d\s().-]+$/.test(value.trim()))
    return null;
  let n = value.replace(/[\s().-]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (!/^\+?\d{7,15}$/.test(n)) return null;
  return "tel:" + n;
}
