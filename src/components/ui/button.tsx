import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500 disabled:bg-slate-400",
    secondary:
      "bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 focus-visible:ring-slate-300",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300",
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
