export function matches(property, client) {
  return (
    ["published", "draft"].includes(property.status) &&
    (!client.looking_for || property.listing_type === client.looking_for) &&
    (property.listing_type !== "rent" ||
      (property.rent_period || "month") === (client.rent_period || "month")) &&
    (!client.preferred_city ||
      property.city.toLowerCase() === client.preferred_city.toLowerCase()) &&
    (!client.preferred_districts?.length ||
      client.preferred_districts.includes(property.district)) &&
    (client.min_price == null || property.price >= client.min_price) &&
    (client.max_price == null || property.price <= client.max_price) &&
    (client.min_bedrooms == null || property.bedrooms >= client.min_bedrooms) &&
    (client.max_bedrooms == null || property.bedrooms <= client.max_bedrooms) &&
    (client.min_area == null || property.area >= client.min_area) &&
    (!client.currency || property.currency === client.currency)
  );
}
