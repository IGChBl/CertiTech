import Link from "next/link";
import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function DashboardShell({
  title,
  subtitle,
  children,
  links,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  links?: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-2 text-slate-600">{subtitle}</p> : null}
      </div>

      {links?.length ? (
        <Card className="flex flex-wrap gap-2 p-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </Card>
      ) : null}

      {children}
    </div>
  );
}
