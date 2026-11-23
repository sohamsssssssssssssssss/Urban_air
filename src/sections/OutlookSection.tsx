"use client";

import dynamic from "next/dynamic";
import type { AppApi } from "@/components/shell/useAssistant";
import Skeleton from "@/components/ui/Skeleton";
import { Lazy, NeedsSetup } from "./shared";

const Outlook = dynamic(() => import("@/features/outlook/Outlook"), { loading: () => <Skeleton className="h-80" /> });
const Compare = dynamic(() => import("@/features/compare/Compare"), { loading: () => <Skeleton className="h-80" /> });

/** 48 h forecast and the two-place comparison. */
export default function OutlookSection({ app }: { app: AppApi }) {
  if (!app.setup) return <NeedsSetup language={app.language} />;
  return (
    <Lazy>
      <Outlook location={app.setup.location} language={app.language} />
      <Compare location={app.setup.location} language={app.language} />
    </Lazy>
  );
}
