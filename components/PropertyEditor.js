"use client";
import { useLocale } from "@/components/LocaleProvider";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCrm } from "./CrmProvider";
import { matches } from "@/lib/matching";
import { supabase } from "@/lib/supabase/browser";
import { imageUrl } from "@/lib/images";
import { amenities, buildingTypes, furnishings } from "@/lib/property-options";
const defaults = {
  rooms: null,
  plot_area: null,
  building_type: null,
  building_year: null,
  furnishing: null,
  rent_period: null,
  deposit: null,
  pets_allowed: null,
  available_from: null,
  title: "",
  description: "",
  listing_type: "sale",
  property_type: "Apartment",
  price: 0,
  currency: "USD",
  city: "Yerevan",
  district: "",
  address: "",
  latitude: null,
  longitude: null,
  bedrooms: 1,
  bathrooms: 1,
  area: 50,
  floor: null,
  total_floors: null,
  condition: "Renovated",
  amenities: [],
  images: [],
  status: "draft",
};
export default function PropertyEditor({ id }) {
  const { t: tr, locale } = useLocale();

  const { properties, clients, save, demo, user, profile } = useCrm(),
    router = useRouter();
  const existing = properties.find((p) => p.id === id);
  const [value, setValue] = useState({ ...defaults, ...existing }),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (id && !existing)
    return (
      <div className="empty">
        {tr("Property not found.")}
        {tr(" ")}
        <Link href="/dashboard/properties">{tr("Return to properties")}</Link>
      </div>
    );
  function update(k, v) {
    setValue((current) => {
      const next = { ...current, [k]: v };
      if (k === "listing_type") {
        next.rent_period = v === "rent" ? "month" : null;
        if (v === "sale") {
          next.deposit = null;
          next.pets_allowed = null;
          next.available_from = null;
        }
      }
      return next;
    });
  }
  function field(key, label, type = "text", options) {
    return (
      <label key={key}>
        {tr(label)}
        {options ? (
          <select
            value={value[key] ?? ""}
            onChange={(e) => update(key, e.target.value || null)}
          >
            {["building_type", "furnishing"].includes(key) && (
              <option value="">{tr("Not specified")}</option>
            )}
            {options.map((x) => (
              <option key={x} value={x}>
                {tr(x)}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            step={type === "number" ? "any" : undefined}
            min={
              type === "number" && !["latitude", "longitude"].includes(key)
                ? 0
                : undefined
            }
            value={value[key] ?? ""}
            required={["title", "city", "price", "area"].includes(key)}
            onChange={(e) =>
              update(
                key,
                type === "number"
                  ? e.target.value === ""
                    ? null
                    : Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        )}
      </label>
    );
  }
  async function upload(e) {
    const selected = [...e.target.files];
    e.target.value = "";
    if (demo) {
      setMessage(
        "Image uploads need Supabase. Demo images are already included.",
      );
      return;
    }
    if (value.images.length + selected.length > 20) {
      setMessage("Use at most 20 photos.");
      return;
    }
    const uploaded = [];
    setBusy(true);
    try {
      for (const file of selected) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024
        )
          throw new Error("Use JPG, PNG, or WebP images under 5 MB.");
        const path =
          user.id +
          "/" +
          crypto.randomUUID() +
          "." +
          { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[
            file.type
          ];
        const { error } = await supabase()
          .storage.from("property-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        uploaded.push(path);
      }
      setValue((current) => ({
        ...current,
        images: [...current.images, ...uploaded],
      }));
      setMessage("Photos uploaded. Save the property to attach them.");
    } catch (e) {
      if (uploaded.length)
        setValue((current) => ({
          ...current,
          images: [...current.images, ...uploaded],
        }));
      setMessage(
        e.message +
          (uploaded.length
            ? " Uploaded photos were kept; save to attach them."
            : ""),
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await save("properties", value, id);
      router.push("/dashboard/properties");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  const matching = clients.filter((c) => matches(value, c));
  return (
    <>
      <Link className="text-link" href="/dashboard/properties">
        {tr("← Properties")}
      </Link>
      <h1 style={{ margin: "25px 0" }}>
        {tr(id ? "Edit property" : "A new place to call home")}
      </h1>
      <form onSubmit={submit} className="panel editor">
        <h2>{tr("The essentials")}</h2>
        {tr(field("title", "Property title"))}
        {tr(
          field("status", "Listing status", "text", [
            "draft",
            "published",
            "sold",
            "rented",
            "archived",
          ]),
        )}
        {tr(field("listing_type", "Listing type", "text", ["sale", "rent"]))}
        {tr(
          field("property_type", "Property type", "text", [
            "Apartment",
            "House",
            "Commercial",
            "Land",
          ]),
        )}
        {tr(
          field(
            "price",
            value.listing_type === "rent"
              ? "Rent per " + (value.rent_period || "month")
              : "Sale price",
            "number",
          ),
        )}
        {tr(
          field("currency", "Currency", "text", ["USD", "AMD", "EUR", "RUB"]),
        )}
        {tr(
          field("condition", "Condition", "text", [
            "Renovated",
            "New construction",
            "Good condition",
            "Needs renovation",
          ]),
        )}
        <label className="wide">
          {tr("Description")}
          <textarea
            required
            minLength={10}
            maxLength={10000}
            value={value.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </label>
        {value.listing_type === "rent" && (
          <>
            <h2>{tr("Rental terms")}</h2>
            {tr(
              field("rent_period", "Price period", "text", [
                "month",
                "day",
                "year",
              ]),
            )}
            {tr(field("deposit", "Security deposit", "number"))}
            <label>
              {tr("Pets allowed")}
              <select
                value={
                  value.pets_allowed == null ? "" : String(value.pets_allowed)
                }
                onChange={(e) =>
                  update(
                    "pets_allowed",
                    e.target.value === "" ? null : e.target.value === "true",
                  )
                }
              >
                <option value="">{tr("Not specified")}</option>
                <option value="true">{tr("Yes")}</option>
                <option value="false">{tr("No")}</option>
              </select>
            </label>
            <label>
              {tr("Available from")}
              <input
                type="date"
                value={value.available_from || ""}
                onChange={(e) =>
                  update("available_from", e.target.value || null)
                }
              />
            </label>
          </>
        )}
        <h2>{tr("Location & space")}</h2>
        {tr(
          [
            ["city", "City"],
            ["district", "District"],
            ["address", "Address"],
            ["latitude", "Latitude", "number"],
            ["longitude", "Longitude", "number"],
            ["rooms", "Total rooms", "number"],
            ["bedrooms", "Bedrooms", "number"],
            ["bathrooms", "Bathrooms", "number"],
            ["area", "Area (m²)", "number"],
            ["floor", "Floor", "number"],
            ["total_floors", "Total floors", "number"],
          ].map((args) => field(...args)),
        )}
        {tr(
          ["House", "Land"].includes(value.property_type) &&
            field("plot_area", "Plot area (m²)", "number"),
        )}
        {tr(field("building_type", "Building type", "text", buildingTypes))}
        {tr(field("building_year", "Year built", "number"))}
        {tr(field("furnishing", "Furnishing", "text", furnishings))}
        <fieldset className="wide">
          <legend>{tr("Amenities")}</legend>
          <div className="filter-checks">
            {amenities.map((a) => (
              <label className="filter-check" key={a}>
                <input
                  type="checkbox"
                  checked={value.amenities.includes(a)}
                  onChange={(e) =>
                    update(
                      "amenities",
                      e.target.checked
                        ? [...value.amenities, a]
                        : value.amenities.filter((x) => x !== a),
                    )
                  }
                />
                {tr(a)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="wide">
          {tr("Other amenities (comma separated)")}
          <input
            value={value.amenities.join(", ")}
            onChange={(e) =>
              update(
                "amenities",
                e.target.value.split(",").map((s) => s.trim()),
              )
            }
          />
        </label>
        <h2>{tr("Photos")}</h2>
        <label className="wide">
          {tr("Upload property photos (JPG, PNG, WebP · up to 5 MB each)")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={upload}
          />
        </label>
        <div
          className="wide"
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
        >
          {value.images.map((image, i) => (
            <div key={i}>
              <img
                src={imageUrl(image)}
                alt={tr("Property photo " + (i + 1))}
                style={{
                  width: 140,
                  height: 100,
                  objectFit: "cover",
                  borderRadius: 6,
                }}
              />
              <button
                type="button"
                className="button secondary small"
                onClick={() =>
                  update(
                    "images",
                    value.images.filter((_, n) => n !== i),
                  )
                }
              >
                {tr("Remove")}
              </button>
            </div>
          ))}
        </div>
        {message && (
          <div className="notice wide" role="status">
            {tr(message)}
          </div>
        )}
        <button className="button" disabled={busy}>
          {tr(busy ? "Saving…" : "Save property")}
        </button>
      </form>
      {profile.account_type !== "owner" && (
        <section className="panel">
          <h2>
            {tr("This property matches ")}
            {tr(matching.length)}
            {tr(" clients")}
          </h2>
          {matching.map((c) => (
            <Link
              className="row"
              key={c.id}
              href={"/dashboard/clients/" + c.id}
            >
              <span>{c.full_name}</span>
              <span>{tr("View client →")}</span>
            </Link>
          ))}
          {!matching.length && (
            <p>{tr("No client requirements match this property yet.")}</p>
          )}
        </section>
      )}
    </>
  );
}
