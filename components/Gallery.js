"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useLocale } from "./LocaleProvider";
import { imageUrl } from "@/lib/images";
export default function Gallery({ images = [], title }) {
  const { t } = useLocale();
  const dialog = useRef(null),
    touch = useRef(null),
    swiped = useRef(false);
  const [selected, setSelected] = useState(0);
  const items = images.length ? images : [null];
  const index = Math.min(selected, items.length - 1);
  function move(n) {
    setSelected((i) => (i + n + items.length) % items.length);
  }
  const gestures = {
    onTouchStart: (e) => {
      touch.current = e.touches[0].clientX;
      swiped.current = false;
    },
    onTouchEnd: (e) => {
      if (touch.current !== null) {
        const delta = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(delta) > 35) {
          move(delta < 0 ? 1 : -1);
          swiped.current = true;
        }
        touch.current = null;
      }
    },
  };
  function keys(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      move(-1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      move(1);
    }
  }
  const arrows = items.length > 1 && (
    <>
      <button
        type="button"
        className="gallery-prev"
        aria-label={t("Previous")}
        onClick={() => move(-1)}
      >
        <ChevronLeft />
      </button>
      <button
        type="button"
        className="gallery-next"
        aria-label={t("Next")}
        onClick={() => move(1)}
      >
        <ChevronRight />
      </button>
    </>
  );
  return (
    <section
      className="listing-gallery"
      aria-label={t("Photos")}
      onKeyDown={keys}
    >
      <div className="gallery-stage" {...gestures}>
        <button
          type="button"
          className="gallery-open"
          aria-label={t("Open main photo")}
          onClick={() => {
            if (swiped.current) {
              swiped.current = false;
              return;
            }
            dialog.current.showModal();
          }}
        >
          <img
            src={imageUrl(items[index])}
            alt={title + " — " + (index + 1)}
            draggable={false}
          />
          <span className="gallery-expand">
            <Expand size={18} />
          </span>
        </button>
        {arrows}
        <span className="gallery-counter" aria-live="polite">
          {index + 1} / {items.length}
        </span>
      </div>
      {items.length > 1 && (
        <div className="gallery-thumbs">
          {items.map((src, i) => (
            <button
              key={i}
              type="button"
              aria-label={t("Open photo " + (i + 1))}
              aria-pressed={index === i}
              onClick={() => setSelected(i)}
            >
              <img
                src={imageUrl(src)}
                alt={title + " — " + (i + 1)}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
      <dialog className="gallery-dialog" ref={dialog} onKeyDown={keys}>
        <button
          type="button"
          className="gallery-close"
          aria-label={t("Close ×")}
          onClick={() => dialog.current.close()}
        >
          <X />
        </button>
        <div className="gallery-full-stage" {...gestures}>
          <img
            src={imageUrl(items[index])}
            alt={title + " — " + (index + 1)}
            draggable={false}
          />
          {arrows}
        </div>
        <p className="gallery-dialog-count">
          {index + 1} / {items.length}
        </p>
      </dialog>
    </section>
  );
}
