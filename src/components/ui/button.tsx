import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-[var(--brand-teal)] text-white hover:bg-[var(--brand-teal-mid)] focus-visible:ring-[var(--brand-teal-ring)] shadow-[0_4px_14px_var(--brand-teal-glow)] disabled:opacity-50",
    secondary:
      "bg-white text-[var(--brand-navy)] border border-slate-200 hover:border-[var(--brand-teal)] hover:text-[var(--brand-teal-dark)] focus-visible:ring-[var(--brand-teal-ring)]",
    ghost: "bg-transparent text-slate-700 hover:bg-[var(--brand-teal-glow)] hover:text-[var(--brand-navy)] focus-visible:ring-[var(--brand-teal-ring)]",
    danger: "bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-300",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
