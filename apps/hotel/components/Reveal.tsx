"use client";

import { useEffect } from "react";

/** Reveals [data-reveal] elements once as they enter the viewport. Content stays visible without script. */
export function Reveal() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
    );
    targets.forEach((el) => io.observe(el));
    const safety = window.setTimeout(() => {
      targets.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add("is-in");
      });
    }, 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, []);
  return null;
}
