"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { imageUrl } from "@/lib/images";
import { useLocale } from "./LocaleProvider";
export default function CardPhotos({ property: p }) {
  const { t } = useLocale();
  const images = p.images?.length ? p.images : [null];
  const [index, setIndex] = useState(0);
  const start = useRef(null),
    swiped = useRef(false);
  const current = Math.min(index, images.length - 1);
  function move(delta) {
    setIndex((i) => (i + delta + images.length) % images.length);
  }
  return (
    <>
      <Link
        className="card-photo-link"
        href={"/properties/" + p.id}
        aria-label={p.title}
        onMouseMove={(e) => {
          if (images.length < 2) return;
          const r = e.currentTarget.getBoundingClientRect();
          setIndex(
            Math.min(
              images.length - 1,
              Math.max(
                0,
                Math.floor(((e.clientX - r.left) / r.width) * images.length),
              ),
            ),
          );
        }}
        onTouchStart={(e) => {
          start.current = e.touches[0].clientX;
          swiped.current = false;
        }}
        onTouchEnd={(e) => {
          if (start.current !== null) {
            const delta = e.changedTouches[0].clientX - start.current;
            if (Math.abs(delta) > 35) {
              move(delta < 0 ? 1 : -1);
              swiped.current = true;
            }
            start.current = null;
          }
        }}
        onClick={(e) => {
          if (swiped.current) {
            e.preventDefault();
            swiped.current = false;
          }
        }}
      >
        <img
          src={imageUrl(images[current])}
          alt={p.title}
          loading="lazy"
          draggable={false}
        />
      </Link>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="card-photo-prev"
            aria-label={t("Previous")}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="card-photo-next"
            aria-label={t("Next")}
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
          <span className="card-photo-count" aria-live="polite">
            {current + 1} / {images.length}
          </span>
        </>
      )}
    </>
  );
}
