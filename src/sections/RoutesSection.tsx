"use client";

import RoutePlanner from "@/components/RoutePlanner";
import type { TripDraft } from "@/features/tracker/schema";
import type { Language } from "@/lib/i18n";

/** Route planner; "Log this trip" hands the trip to the tracker in Me. */
export default function RoutesSection({ language, onLogTrip }: { language: Language; onLogTrip: (draft: TripDraft) => void }) {
  return <RoutePlanner language={language} onLogTrip={onLogTrip} />;
}
