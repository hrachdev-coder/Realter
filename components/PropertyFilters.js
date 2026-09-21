"use client";
import { useLocale } from "@/components/LocaleProvider";
import {
  propertyTypes,
  conditions,
  buildingTypes,
  furnishings,
  amenities,
} from "@/lib/property-options";
export default function PropertyFilters({
  filters: f,
  update,
  locations,
  expanded,
  setExpanded,
}) {
  const { t: tr, locale } = useLocale();

  const field = (key, label, options) => (
    <label key={key}>
      {tr(label)}
      {options ? (
        <select
          value={f[key] ?? ""}
          onChange={(e) => update(key, e.target.value)}
        >
          {!["currency", "rent_period"].includes(key) && (
            <option value="">{tr("Any")}</option>
          )}
          {options.map((o) => (
            <option key={o} value={o}>
              {tr(o)}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={
            key === "available_from"
              ? "date"
              : key === "q"
                ? "search"
                : "number"
          }
          min={key === "q" ? undefined : 0}
          step="any"
          value={f[key] ?? ""}
          onChange={(e) => update(key, e.target.value)}
          placeholder={tr(
            key === "q" ? "Street, neighborhood, or title" : "Any",
          )}
        />
      )}
    </label>
  );
  const toggle = (key, label) => (
    <label className="filter-check" key={key}>
      <input
        type="checkbox"
        checked={!!f[key]}
        onChange={(e) => update(key, e.target.checked)}
      />
      {tr(label)}
    </label>
  );
  return (
    <section className="search-controls" aria-label={tr("Property filters")}>
      <div
        className="intent-tabs"
        role="group"
        aria-label={tr("Listing purpose")}
      >
        {[
          ["", "All homes"],
          ["sale", "Buy"],
          ["rent", "Rent"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={label}
            aria-pressed={(f.listing_type || "") === value}
            onClick={() => update("listing_type", value)}
          >
            {tr(label)}
          </button>
        ))}
      </div>
      <div className="filter-fields">
        {tr(field("q", "Search location or title"))}
        {tr(field("property_type", "Property type", propertyTypes))}
        {tr(
          field(
            "city",
            "City",
            [...new Set(locations.map((p) => p.city))].sort(),
          ),
        )}
        {tr(
          field(
            "district",
            "District",
            [
              ...new Set(
                locations
                  .filter((p) => !f.city || p.city === f.city)
                  .map((p) => p.district),
              ),
            ]
              .filter(Boolean)
              .sort(),
          ),
        )}
        {tr(field("currency", "Currency", ["USD", "AMD", "EUR", "RUB"]))}
        {tr(
          field(
            "min_price",
            f.listing_type === "rent"
              ? "Minimum rent / " + (f.rent_period || "month")
              : "Minimum price",
          ),
        )}
        {tr(
          field(
            "max_price",
            f.listing_type === "rent"
              ? "Maximum rent / " + (f.rent_period || "month")
              : "Maximum price",
          ),
        )}
        {tr(
          f.listing_type === "rent" &&
            field("rent_period", "Rental price period", [
              "month",
              "day",
              "year",
            ]),
        )}
      </div>
      <button
        type="button"
        className="button secondary small"
        aria-expanded={expanded}
        aria-controls="advanced-filters"
        onClick={() => setExpanded(!expanded)}
      >
        {tr(expanded ? "Fewer filters" : "All filters")}
      </button>
      {expanded && (
        <div id="advanced-filters">
          <h3>{tr("Space & layout")}</h3>
          <div className="filter-fields">
            {tr(field("rooms", "Minimum total rooms"))}
            {tr(field("max_rooms", "Maximum total rooms"))}
            {tr(field("bedrooms", "Minimum bedrooms"))}
            {tr(field("max_bedrooms", "Maximum bedrooms"))}
            {tr(field("bathrooms", "Minimum bathrooms"))}
            {tr(field("min_area", "Minimum area (m²)"))}
            {tr(field("max_area", "Maximum area (m²)"))}
            {(!f.property_type ||
              ["House", "Land"].includes(f.property_type)) && (
              <>
                {tr(field("min_plot_area", "Minimum plot area (m²)"))}
                {tr(field("max_plot_area", "Maximum plot area (m²)"))}
              </>
            )}
          </div>
          <h3>{tr("Building & condition")}</h3>
          <div className="filter-fields">
            {tr(field("min_floor", "Minimum floor"))}
            {tr(field("max_floor", "Maximum floor"))}
            {tr(field("min_year", "Built from year"))}
            {tr(field("max_year", "Built through year"))}
            {tr(field("building_type", "Building type", buildingTypes))}
            {tr(field("condition", "Condition", conditions))}
            {tr(field("furnishing", "Furnishing", furnishings))}
            {tr(field("listed_by", "Listed by", ["owner", "realtor"]))}
          </div>
          <div className="filter-checks">
            {tr(toggle("exclude_first", "Exclude ground / first floor"))}
            {tr(toggle("exclude_last", "Exclude top floor"))}
            {tr(toggle("has_photos", "With photos only"))}
          </div>
          {f.listing_type === "rent" && (
            <>
              <h3>{tr("Rental conditions")}</h3>
              <div className="filter-fields">
                {tr(
                  field("max_deposit", "Maximum deposit (" + f.currency + ")"),
                )}
                {tr(field("pets_allowed", "Pets allowed", ["yes", "no"]))}
                {tr(field("available_from", "Available by"))}
              </div>
            </>
          )}
          <h3>{tr("Amenities")}</h3>
          <div className="filter-checks">
            {amenities.map((a) => (
              <label className="filter-check" key={a}>
                <input
                  type="checkbox"
                  checked={f.amenities?.includes(a) || false}
                  onChange={(e) =>
                    update(
                      "amenities",
                      e.target.checked
                        ? [...(f.amenities || []), a]
                        : (f.amenities || []).filter((x) => x !== a),
                    )
                  }
                />
                {tr(a)}
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
