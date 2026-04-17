import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)]",
        className,
      )}
      {...props}
    />
  );
}
