export const propertyTypes = ["Apartment", "House", "Commercial", "Land"];
export const conditions = [
  "Renovated",
  "New construction",
  "Good condition",
  "Needs renovation",
];
export const buildingTypes = [
  "Stone",
  "Panel",
  "Monolithic",
  "Brick",
  "Wood",
  "Other",
];
export const furnishings = ["Furnished", "Partly furnished", "Unfurnished"];
export const amenities = [
  "Balcony",
  "Elevator",
  "Parking",
  "Garage",
  "Garden",
  "Terrace",
  "Air conditioning",
  "Heating",
  "Internet",
  "Appliances",
  "Security",
  "Accessible entrance",
];
export const rentPeriods = ["month", "day", "year"];
export const rentSuffix = (p) =>
  p.listing_type === "rent" ? " / " + (p.rent_period || "month") : "";
