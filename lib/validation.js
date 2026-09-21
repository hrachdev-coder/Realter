import { phoneHref } from "./phone.js";
import { z } from "zod";
const text = (max = 200) => z.string().trim().max(max);
const optionalNumber = z.number().finite().nonnegative().nullable().optional();
const optionalInteger = z.number().int().nonnegative().nullable().optional();
const id = z.string().uuid().nullable().optional();
export const schemas = {
  properties: z
    .object({
      contact_phone: text(30).default(""),
      rooms: optionalInteger,
      plot_area: optionalNumber,
      building_type: z
        .enum(["Stone", "Panel", "Monolithic", "Brick", "Wood", "Other"])
        .nullable()
        .optional(),
      building_year: z.number().int().min(1000).max(2200).nullable().optional(),
      furnishing: z
        .enum(["Furnished", "Partly furnished", "Unfurnished"])
        .nullable()
        .optional(),
      rent_period: z.enum(["month", "day", "year"]).nullable().optional(),
      deposit: optionalNumber,
      pets_allowed: z.boolean().nullable().optional(),
      available_from: z.string().date().nullable().optional(),
      title: text(150).min(3),
      description: text(10000).min(10),
      listing_type: z.enum(["sale", "rent"]),
      property_type: z.enum(["Apartment", "House", "Commercial", "Land"]),
      price: z.number().finite().nonnegative().max(1e12),
      currency: z.enum(["USD", "AMD", "EUR", "RUB"]),
      city: text(100).min(2),
      district: text(100),
      address: text(250),
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
      bedrooms: z.number().int().min(0).max(100),
      bathrooms: z.number().int().min(0).max(100),
      area: z.number().positive().max(1e8),
      floor: optionalInteger,
      total_floors: optionalInteger,
      condition: text(100),
      amenities: z.array(text(80)).max(40),
      images: z.array(text(2000)).max(20),
      status: z.enum(["draft", "published", "sold", "rented", "archived"]),
    })
    .refine((p) => p.status !== "published" || !!phoneHref(p.contact_phone), {
      message: "Enter a valid contact phone before publishing.",
    })
    .refine(
      (p) =>
        p.floor == null || p.total_floors == null || p.floor <= p.total_floors,
      { message: "Floor cannot exceed total floors." },
    ),
  clients: z
    .object({
      full_name: text(100).min(2),
      phone: text(30),
      email: z.union([z.string().email().max(254), z.literal("")]),
      notes: text(5000),
      looking_for: z.enum(["sale", "rent"]),
      preferred_city: text(100),
      preferred_districts: z.array(text(100)).max(20),
      min_price: optionalNumber,
      max_price: optionalNumber,
      min_bedrooms: optionalInteger,
      max_bedrooms: optionalInteger,
      min_area: optionalNumber,
      currency: z.enum(["USD", "AMD", "EUR", "RUB"]),
      status: z.enum(["active", "paused", "closed"]),
    })
    .refine(
      (c) =>
        (c.min_price == null ||
          c.max_price == null ||
          c.min_price <= c.max_price) &&
        (c.min_bedrooms == null ||
          c.max_bedrooms == null ||
          c.min_bedrooms <= c.max_bedrooms),
      { message: "Minimum values must not exceed maximum values." },
    ),
  tasks: z.object({
    title: text(200).min(2),
    description: text(5000),
    client_id: id,
    lead_id: id,
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    completed: z.boolean(),
  }),
  leads: z.object({
    status: z.enum([
      "new",
      "contacted",
      "viewing",
      "negotiation",
      "won",
      "lost",
    ]),
  }),
  profiles: z.object({
    account_type: z.enum(["owner", "realtor"]).default("owner"),
    full_name: text(100).min(2),
    phone: text(30),
    bio: text(2000),
    city: text(100),
  }),
};
