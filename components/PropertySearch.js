"use client";
import { promotionsEnabled } from "@/lib/features";
import SaveSearch from "./SaveSearch";
import { useLocale } from "@/components/LocaleProvider";
import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeFilters, serializeFilters, rangeError } from "@/lib/search";
import { useSearchTool } from "./useSearchTool";
import PropertyFilters from "./PropertyFilters";
import PropertyCard from "./PropertyCard";
export default function PropertySearch({
  initialResult,
  locations,
  initialError = "",
}) {
  const { t: tr, locale } = useLocale();

  const initial = initialResult?.filters || {
    currency: "USD",
    page: 1,
    sort: "newest",
  };
  const [filters, setFilters] = useState(initial),
    [result, setResult] = useState(
      initialResult || { properties: [], count: 0 },
    ),
    [error, setError] = useState(initialError),
    [loading, setLoading] = useState(false),
    [view, setView] = useState("grid"),
    [expanded, setExpanded] = useState(false),
    [version, setVersion] = useState(0);
  const mounted = useRef(false);
  const applyFilters = useCallback((next, data) => {
    if (data) {
      setResult(data);
      setError("");
      setLoading(false);
    }
    setFilters(normalizeFilters({ ...next, page: 1 }));
    setExpanded(true);
  }, []);
  useSearchTool(applyFilters);
  function update(key, value) {
    setFilters((current) => {
      const next = { ...current, [key]: value, page: 1 };
      if (key === "city") delete next.district;
      if (key === "listing_type") {
        for (const k of [
          "rent_period",
          "max_deposit",
          "pets_allowed",
          "available_from",
        ])
          delete next[k];
        if (value === "rent") next.rent_period = "month";
      }
      if (key === "property_type" && !["House", "Land", ""].includes(value)) {
        delete next.min_plot_area;
        delete next.max_plot_area;
      }
      return next;
    });
  }
  useEffect(() => {
    const pop = () => {
      try {
        setFilters(
          normalizeFilters(
            Object.fromEntries(new URLSearchParams(location.search)),
          ),
        );
      } catch {
        setError(
          "This search link contains invalid filters. Reset filters to continue.",
        );
      }
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const controller = new AbortController();
    let normalized;
    try {
      normalized = normalizeFilters(filters);
      const invalid = rangeError(normalized);
      if (invalid) throw new Error(invalid);
    } catch (e) {
      setError(e.issues ? "Enter valid filter values." : e.message);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const query = serializeFilters(normalized);
        const response = await fetch("/api/properties?" + query, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setResult(data);
        window.history.replaceState(null, "", "/properties?" + query);
      } catch (e) {
        if (e.name !== "AbortError")
          setError(e.message || "Search could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, version]);
  const active = Object.entries(filters).filter(
    ([k, v]) =>
      !["currency", "sort", "page", "rent_period"].includes(k) &&
      v !== undefined &&
      v !== "" &&
      v !== false &&
      (!Array.isArray(v) || v.length),
  );
  const pages = Math.ceil(result.count / 9);
  return (
    <>
      <PropertyFilters
        filters={filters}
        update={update}
        locations={locations}
        expanded={expanded}
        setExpanded={setExpanded}
      />
      <SaveSearch filters={filters} />
      <div className="active-filters">
        {active.map(([key, value]) => (
          <button
            key={key}
            onClick={() => update(key, key === "amenities" ? [] : "")}
            aria-label={tr("Remove " + key + " filter")}
          >
            {tr(key)}:{tr(" ")}
            {tr(
              Array.isArray(value)
                ? value.map(tr).join(", ")
                : value === true
                  ? "yes"
                  : value,
            )}
            {tr(" ")}×
          </button>
        ))}
        <button
          className="reset-filters"
          onClick={() => {
            setFilters({ currency: "USD", page: 1, sort: "newest" });
            setError("");
          }}
        >
          {tr("Reset all")}
        </button>
      </div>
      <div className="toolbar">
        <span role="status">
          {tr(
            loading
              ? "Searching…"
              : error
                ? "Search unavailable"
                : result.count + " homes to discover",
          )}
        </span>
        <div className="search-view-controls">
          <select
            aria-label={tr("Sort properties")}
            value={filters.sort || "newest"}
            onChange={(e) => update("sort", e.target.value)}
          >
            {[
              ["newest", "Newest first"],
              ["price_asc", "Price: low to high"],
              ["price_desc", "Price: high to low"],
              ["area_asc", "Area: small to large"],
              ["area_desc", "Area: large to small"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {tr(label)}
              </option>
            ))}
          </select>
          <button
            className="button secondary small"
            onClick={() => setView(view === "grid" ? "list" : "grid")}
          >
            {tr(view === "grid" ? "List view" : "Grid view")}
          </button>
        </div>
      </div>
      {error ? (
        <div className="notice error" role="alert">
          {tr(error)}
          <button
            className="button secondary small"
            onClick={() => setVersion((v) => v + 1)}
          >
            {tr("Retry")}
          </button>
        </div>
      ) : (
        <div aria-busy={loading} style={{ opacity: loading ? 0.55 : 1 }}>
          {promotionsEnabled && !loading && result.sponsored?.length > 0 && (
            <section
              className="sponsored-section"
              aria-label={tr("Advertisement")}
            >
              <h2>{tr("TOP listings")}</h2>
              <div className="property-grid">
                {result.sponsored.map((p) => (
                  <PropertyCard key={p.id} property={p} sponsored />
                ))}
              </div>
            </section>
          )}
          {result.properties.length ? (
            <div className={view === "grid" ? "property-grid" : "list-view"}>
              {result.properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h3>{tr("No homes match these filters")}</h3>
              <p>{tr("Try a wider budget or remove one of the filters.")}</p>
            </div>
          )}
        </div>
      )}
      {!error && pages > 1 && (
        <nav className="pagination" aria-label={tr("Search pages")}>
          <button
            disabled={loading || filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            {tr("Previous")}
          </button>
          <span>
            {tr("Page ")}
            {tr(filters.page)}
            {tr(" of ")}
            {tr(pages)}
          </span>
          <button
            disabled={loading || filters.page >= pages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            {tr("Next")}
          </button>
        </nav>
      )}
    </>
  );
}
