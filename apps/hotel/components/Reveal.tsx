"use client";

import { useEffect } from "react";

/**
 * Reveals [data-reveal] elements as they come into view. Content stays visible without script.
 * Anything already in view or above it is revealed, so a jump (an anchor link, a fast scroll) never
 * leaves skipped content hidden. The state lives in a data attribute, not a class: React rewrites
 * className on re-render and would hide it again.
 */
export function Reveal() {
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const line = window.innerHeight;
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])").forEach((el) => {
        if (el.getBoundingClientRect().top < line) el.setAttribute("data-revealed", "");
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
