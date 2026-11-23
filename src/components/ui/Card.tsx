import type { ReactNode } from "react";
import { cn } from "./cn";

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** "sunken" is a flat inset panel; "default" is a raised card. */
  tone?: "default" | "sunken";
  as?: "div" | "article" | "li";
}

/** A rounded surface with the standard border and shadow. */
export default function Card({ children, className, tone = "default", as: Tag = "div" }: CardProps) {
  return <Tag className={cn("rounded-card border border-line", tone === "default" ? "bg-surface shadow-card" : "bg-sunken", className)}>{children}</Tag>;
}
