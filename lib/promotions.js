export const topPackages = Object.freeze([
  { days: 3, amount: 1200, currency: "AMD" },
  { days: 7, amount: 1500, currency: "AMD" },
]);
export const topPackage = (days) => topPackages.find((p) => p.days === days);
export function topStatus(order, now = Date.now()) {
  if (
    order.status === "pending" &&
    new Date(order.payable_until).getTime() <= now
  )
    return "expired";
  if (
    order.status === "paid" &&
    new Date(order.paid_at).getTime() + order.duration_days * 86400000 <= now
  )
    return "expired";
  return order.status;
}
