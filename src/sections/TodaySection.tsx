"use client";

import dynamic from "next/dynamic";
import AqiCard from "@/components/AqiCard";
import Onboarding from "@/components/shell/Onboarding";
import type { AppApi } from "@/components/shell/useAssistant";
import Skeleton from "@/components/ui/Skeleton";
import TodayLine from "@/features/today/TodayLine";
import { Lazy } from "./shared";

const MaskGuide = dynamic(() => import("@/features/mask/MaskGuide"), { loading: () => <Skeleton className="h-64" /> });
const Checklist = dynamic(() => import("@/features/checklist/Checklist"), { loading: () => <Skeleton className="h-64" /> });

/** Air hero, the one-line summary (best window), mask guide and household checklist. */
export default function TodaySection({ app }: { app: AppApi }) {
  const { setup, air, plan, language } = app;
  if (!app.checked) return <Skeleton className="h-[34rem]" />;
  if (!setup) return <Onboarding language={language} onSubmit={app.submit} />;
  return (
    <Lazy>
      <AqiCard state={air} language={language} onRetry={app.refreshAir} />
      {air.status === "ready" && (
        <>
          <TodayLine snapshot={air.snapshot} profile={setup.profile} language={language} aiLine={plan?.language === language ? plan.todayLine : undefined} />
          <MaskGuide snapshot={air.snapshot} profile={setup.profile} language={language} />
          <Checklist snapshot={air.snapshot} profile={setup.profile} language={language} />
        </>
      )}
    </Lazy>
  );
}
