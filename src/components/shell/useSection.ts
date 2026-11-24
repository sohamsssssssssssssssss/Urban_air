"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SECTION, sectionFromHash, type SectionId } from "./sections";

/**
 * The active section, kept in the URL hash. Server and first client render use the default section (so markup matches);
 * the hash is read right after hydration and on every hashchange, which also fires for the back and forward buttons.
 * Also reports every section visited so far, so each section mounts on first visit and then keeps its state.
 */
export function useSection() {
  const [active, setActive] = useState<SectionId>(DEFAULT_SECTION);
  const [visited, setVisited] = useState<ReadonlySet<SectionId>>(() => new Set([DEFAULT_SECTION]));
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      const next = hash === "" ? DEFAULT_SECTION : sectionFromHash(hash); // back to the bare URL = the default section
      if (next === null) return; // e.g. "#main" from the skip link: stay where we are
      setActive(next);
      setVisited((v) => (v.has(next) ? v : new Set(v).add(next)));
    };
    sync();
    // Every hash change after first load is a navigation (nav links, back and forward), so the shell resets scroll and focus.
    const onHashChange = () => {
      sync();
      setNavigated(true);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const go = useCallback((id: SectionId) => {
    setNavigated(true);
    if (window.location.hash === `#${id}`) {
      setActive(id);
      return;
    }
    window.location.hash = id; // pushes a history entry; hashchange updates the state
  }, []);

  return { active, visited, go, navigated };
}
