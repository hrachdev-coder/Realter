export function similarListings(items, p, limit = 3) {
  return items
    .filter(
      (x) =>
        x.id !== p.id &&
        x.status === "published" &&
        x.city === p.city &&
        x.listing_type === p.listing_type &&
        (p.listing_type !== "rent" ||
          (x.rent_period || "month") === (p.rent_period || "month")),
    )
    .map((x) => ({
      x,
      score:
        (x.property_type === p.property_type ? 8 : 0) +
        (x.district && x.district === p.district ? 4 : 0) +
        (x.bedrooms === p.bedrooms ? 2 : 0) +
        (x.currency === p.currency
          ? 1 / (1 + Math.abs(x.price - p.price) / Math.max(p.price, 1))
          : 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || String(a.x.id).localeCompare(String(b.x.id)),
    )
    .slice(0, limit)
    .map((v) => v.x);
}
