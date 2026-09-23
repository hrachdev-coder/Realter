"use client";
import { useLocale } from "@/components/LocaleProvider";

import { rentSuffix } from "@/lib/property-options";
import CardPhotos from "./CardPhotos";
import Link from "next/link";
import { money } from "@/lib/i18n";
import { BedDouble, Bath, Maximize, ArrowUpRight } from "lucide-react";

export default function PropertyCard({ property: p, sponsored = false }) {
  const { t: tr, locale } = useLocale();

  return (
    <article className="property-card">
      <div className="card-image">
        <CardPhotos property={p} />
        <span className="badge">
          {tr("For ")}
          {tr(p.listing_type)}
        </span>
        {sponsored && <span className="ad-label">{tr("Advertisement")}</span>}
        <span className="image-arrow">
          <ArrowUpRight size={19} />
        </span>
      </div>
      <Link href={"/properties/" + p.id} className="card-body">
        <div className="price">
          {tr(money(p, locale))}
          {p.listing_type === "rent" && <small>{tr(rentSuffix(p))}</small>}
        </div>
        <h3>{p.title}</h3>
        <p>
          {tr(p.district)}, {tr(p.city)}
        </p>
        <div className="property-facts">
          <span>
            <BedDouble size={16} />
            {tr(p.bedrooms)}
            {tr(" beds")}
          </span>
          <span>
            <Bath size={16} />
            {tr(p.bathrooms)}
            {tr(" baths")}
          </span>
          <span>
            <Maximize size={15} />
            {tr(p.area)}
            {tr(" m²")}
          </span>
        </div>
      </Link>
    </article>
  );
}
