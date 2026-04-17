import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "CertiTech | Marketplace de Servicios Tecnicos",
  description:
    "Encuentra tecnicos confiables para reparaciones, instalaciones y mantenimiento con una plataforma moderna y segura.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--app-bg)] text-slate-900 antialiased">
        <div className="relative flex min-h-screen flex-col">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(14,165,233,0.14),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(15,23,42,0.08),transparent_30%),linear-gradient(to_bottom,#f8fafc,#eef4ff_60%,#f8fafc)]" />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

