"use client";

import { useEffect } from "react";

/**
 * Reveals [data-reveal] elements as they come into view. Content stays visible until this runs, so
 * a failed or late script never hides anything: the page opts in to hiding by setting
 * data-reveal-ready on <html> here, in the same task that reveals what is already on screen.
 * Anything in view or above it is revealed, so a jump (an anchor link, a fast scroll) never leaves
 * skipped content hidden. The state lives in data attributes, not classes: React rewrites className
 * on re-render and would hide it again.
 */
export function Reveal() {
  useEffect(() => {
    let frame = 0;
    const stop = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
    const check = () => {
      frame = 0;
      const line = window.innerHeight;
      const hidden = [...document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])")];
      // Read every position first, then write, so the browser lays the page out once.
      const due = hidden.filter((el) => el.getBoundingClientRect().top < line);
      due.forEach((el) => el.setAttribute("data-revealed", ""));
      if (due.length === hidden.length) stop();
    };
    function schedule() {
      if (!frame) frame = requestAnimationFrame(check);
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    document.documentElement.setAttribute("data-reveal-ready", "");
    check();
    return stop;
  }, []);
  return null;
}
