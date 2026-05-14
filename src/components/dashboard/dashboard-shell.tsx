import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { DashboardNavLinks } from "@/components/dashboard/dashboard-nav-links";

export function DashboardShell({
  title,
  subtitle,
  children,
  links,
  role,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  links?: Array<{ href: string; label: string }>;
  role?: "CLIENT" | "TECHNICIAN" | "ADMIN";
}) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-2 text-slate-600">{subtitle}</p> : null}
      </div>

      {links?.length ? (
        <Card className="flex flex-wrap gap-2 p-3">
          <DashboardNavLinks links={links} role={role} />
        </Card>
      ) : null}

      {children}
    </div>
  );
}
