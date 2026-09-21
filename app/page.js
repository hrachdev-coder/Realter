import { sponsoredProperties } from "@/lib/promotions-server";
import { getLocale } from "@/lib/locale-server";
import Link from "next/link";
import Header from "@/components/Header";
import PropertyCard from "@/components/PropertyCard";
import { publicProperties } from "@/lib/data";
import {
  Search,
  ArrowUpRight,
  MapPin,
  House,
  Building2,
  KeyRound,
} from "lucide-react";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { t: tr, locale } = await getLocale();

  const [properties, sponsored] = await Promise.all([
    publicProperties(),
    sponsoredProperties(),
  ]);
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <img
            className="hero-image"
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2400&q=85"
            alt={tr("A sunlit living room with natural materials")}
          />
          <div className="hero-content">
            <div className="eyebrow light">{tr("A PLACE TO BELONG")}</div>
            <h1>
              {tr("Somewhere new.")}
              <br />
              {tr("Something ")}
              <em>{tr("yours.")}</em>
            </h1>
            <p>
              {tr("Discover a home that feels right.")}
              <br />
              {tr("Thoughtfully selected properties across Armenia.")}
            </p>
          </div>
          <div className="hero-caption">
            <MapPin size={15} />
            {tr("Find your place in Armenia")}
          </div>
        </section>
        <section className="search-section">
          <form action="/properties" className="hero-search">
            <div>
              <label htmlFor="intent">{tr("I’m looking to")}</label>
              <select id="intent" name="listing_type">
                <option value="sale">{tr("Buy a home")}</option>
                <option value="rent">{tr("Rent a home")}</option>
              </select>
            </div>
            <div>
              <label htmlFor="city">{tr("Location")}</label>
              <select id="city" name="city">
                <option value="">{tr("All of Armenia")}</option>
                <option value={"Yerevan"}>{tr("Yerevan")}</option>
                <option value={"Dilijan"}>{tr("Dilijan")}</option>
                <option value={"Gyumri"}>{tr("Gyumri")}</option>
              </select>
            </div>
            <div>
              <label htmlFor="type">{tr("Property type")}</label>
              <select id="type" name="property_type">
                <option value="">{tr("All property types")}</option>
                <option value={"Apartment"}>{tr("Apartment")}</option>
                <option value={"House"}>{tr("House")}</option>
                <option value={"Commercial"}>{tr("Commercial")}</option>
                <option value={"Land"}>{tr("Land")}</option>
              </select>
            </div>
            <button className="button">
              <Search size={18} />
              {tr("Find a home")}
            </button>
          </form>
          <div className="search-note">
            <span>{tr("Good places. New beginnings.")}</span>
            <span>
              {tr("Local expertise, every step of the way")}
              <ArrowUpRight size={15} />
            </span>
          </div>
        </section>
        {sponsored.length > 0 && (
          <section
            className="section sponsored-section"
            aria-label={tr("Advertisement")}
          >
            <h2>{tr("TOP listings")}</h2>
            <div className="property-grid">
              {sponsored.map((p) => (
                <PropertyCard key={p.id} property={p} sponsored />
              ))}
            </div>
          </section>
        )}
        <section className="section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">{tr("MAKE YOURSELF AT HOME")}</div>
              <h2>{tr("Fresh on the market")}</h2>
              <p>
                {tr(
                  "A new perspective. A little more space. Your next move starts here.",
                )}
              </p>
            </div>
            <Link className="text-link" href="/properties">
              {tr("Explore all properties")}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="property-grid">
            {properties.slice(0, 6).map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
        <section className="section categories">
          <div>
            <div className="eyebrow">{tr("ROOM FOR YOUR NEXT CHAPTER")}</div>
            <h2>{tr("What feels like home?")}</h2>
          </div>
          {[
            [Building2, "Apartments", "Apartment"],
            [House, "Houses", "House"],
            [KeyRound, "Commercial spaces", "Commercial"],
          ].map(([Icon, label, type]) => (
            <Link href={"/properties?property_type=" + type} key={type}>
              <Icon size={30} />
              <h3>{tr(label)}</h3>
              <span>
                {tr("Explore properties")}
                <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </section>
        <section className="realtor-cta">
          <div>
            <div className="eyebrow light">
              {tr("FOR THE PEOPLE BEHIND EVERY MOVE")}
            </div>
            <h2>
              {tr("Your listings. Your clients.")}
              <br />
              {tr("All in a better place.")}
            </h2>
            <p>{tr("A thoughtful workspace for your real estate business.")}</p>
            <Link href="/register" className="button cream">
              {tr("Join as a realtor")}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="cta-mark">
            տուն<span>{tr("Armenian for home.")}</span>
          </div>
        </section>
      </main>
      <footer>
        <Link className="brand" href="/">
          {tr("tun.")}
        </Link>
        <span>{tr("Find your place in Armenia.")}</span>
        <span>
          © {tr(new Date().getFullYear())}
          {tr("Tun · Demo photos are illustrative")}
        </span>
      </footer>
    </>
  );
}
