import { SHELL } from "@/lib/i18n.shell";
import type { Language } from "@/lib/i18n";
import { cn } from "../ui/cn";
import { NavIcon, Logo } from "./icons";
import { SECTIONS, type SectionId } from "./sections";

const link = "relative flex items-center gap-1 rounded-control text-sm font-bold transition-colors duration-fast";

/**
 * Section navigation: a bottom tab bar on small screens and a left sidebar from 1024 px. Each entry is a real link to a
 * hash (deep-linkable) with an icon AND a text label; the current one is marked with aria-current and a bold bar.
 * Only one of the two navs is visible at a time (the other is display:none, so it is not read twice).
 */
export default function Nav({ active, language }: { active: SectionId; language: Language }) {
  const t = SHELL[language];
  const items = (vertical: boolean) =>
    SECTIONS.map((id) => {
      const current = id === active;
      return (
        <li key={id} className={vertical ? undefined : "flex-1"}>
          <a
            href={`#${id}`} aria-current={current ? "page" : undefined}
            className={cn(link, vertical ? "min-h-11 flex-row gap-3 px-3 py-2.5 text-base" : "min-h-tabbar flex-col justify-center gap-0.5 px-1 text-xs", current ? "bg-brand-soft text-brand-text" : "text-ink-muted hover:bg-sunken hover:text-ink")}
          >
            <span aria-hidden="true" className={cn("absolute rounded-pill bg-aqi-accent transition-opacity duration-fast", vertical ? "inset-y-2 left-0 w-1" : "inset-x-4 top-0 h-1", current ? "opacity-100" : "opacity-0")} />
            <NavIcon id={id} />
            <span>{t.nav[id]}</span>
          </a>
        </li>
      );
    });

  return (
    <>
      <nav aria-label={t.navLabel} className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col gap-6 border-r border-line bg-surface p-4 lg:flex">
        <a href="#today" className="flex items-center gap-3 rounded-control px-2 py-1 text-xl font-extrabold tracking-tight">
          <Logo className="h-9 w-9" />
          {t.brand}
        </a>
        <ul className="flex flex-col gap-1">{items(true)}</ul>
      </nav>
      <nav aria-label={t.navLabel} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="flex">{items(false)}</ul>
      </nav>
    </>
  );
}
