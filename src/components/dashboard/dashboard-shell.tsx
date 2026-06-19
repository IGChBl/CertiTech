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
      {/* Header bar with brand accent */}
      <div
        className="rounded-2xl px-6 py-5"
        style={{
          background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-navy-hover) 100%)",
          boxShadow: "0 4px 24px rgba(27,35,64,0.18)",
        }}
      >
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm" style={{ color: "rgba(43,191,170,0.85)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>

      {links?.length ? (
        <Card
          className="flex flex-wrap gap-1 p-2"
          style={{ borderColor: "var(--app-border)" }}
        >
          <DashboardNavLinks links={links} role={role} />
        </Card>
      ) : null}

      {children}
    </div>
  );
}
