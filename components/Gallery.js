"use client";
import { useLocale } from "@/components/LocaleProvider";
import { imageUrl } from "@/lib/images";
import { useRef, useState } from "react";
export default function Gallery({ images = [], title }) {
  const { t: tr, locale } = useLocale();

  const ref = useRef(null);
  const [selected, setSelected] = useState(0);
  const items = images.length ? images : ["/placeholder.svg"];
  function open(i) {
    setSelected(i);
    ref.current.showModal();
  }
  return (
    <>
      <div className="gallery">
        <button aria-label={tr("Open main photo")} onClick={() => open(0)}>
          <img src={imageUrl(items[0])} alt={title} />
        </button>
        <div>
          {items.slice(1, 3).map((src, i) => (
            <button
              key={i}
              style={{ border: 0, padding: 0 }}
              onClick={() => open(i + 1)}
              aria-label={tr("Open photo " + (i + 2))}
            >
              <img
                src={imageUrl(src)}
                alt={title + " — " + tr("Property photo " + (i + 2))}
              />
            </button>
          ))}
        </div>
      </div>
      <dialog ref={ref}>
        <button onClick={() => ref.current.close()}>{tr("Close ×")}</button>
        <img src={imageUrl(items[selected])} alt={title} />
        <div className="toolbar">
          <button
            onClick={() =>
              setSelected((selected + items.length - 1) % items.length)
            }
          >
            {tr("Previous")}
          </button>
          <span>
            {tr(selected + 1)} / {tr(items.length)}
          </span>
          <button onClick={() => setSelected((selected + 1) % items.length)}>
            {tr("Next")}
          </button>
        </div>
      </dialog>
    </>
  );
}
