import { cn } from "./cn";

export type ButtonVariant = "primary" | "outline" | "danger" | "ghost";
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-brand bg-brand text-brand-ink hover:bg-brand-hover",
  outline: "border-brand text-brand-text hover:bg-brand-soft",
  danger: "border-danger bg-danger text-danger-ink hover:bg-danger",
  ghost: "border-line-strong text-ink hover:bg-sunken",
};

/** Classes for a button or a link that looks like one (44 px tall target, token colours). */
export const buttonClass = (variant: ButtonVariant = "primary", extra?: string) =>
  cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-control border px-5 py-2 font-semibold transition-colors duration-fast disabled:cursor-not-allowed disabled:border-line disabled:bg-sunken disabled:text-ink-muted", VARIANTS[variant], extra);
