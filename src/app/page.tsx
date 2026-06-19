import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, ShieldCheck, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TechnicianCard } from "@/components/cards/technician-card";
import { buildPublicTechnicianWhere } from "@/lib/subscriptions/service";

export default async function Home() {
  const categoriesResult = await prisma.serviceCategory
    .findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 8,
      include: {
        _count: {
          select: { technicianServices: true },
        },
      },
    })
    .then((data) => ({ categories: data, hasWarning: false }))
    .catch((error) => {
      console.error("[home] Error cargando categorías", error);
      return { categories: [], hasWarning: true };
    });

  const featuredTechniciansResult = await prisma.technicianProfile
    .findMany({
      where: buildPublicTechnicianWhere(),
      orderBy: [
        { featuredUntil: "desc" },
        { subscriptionPlan: "desc" },
        { averageRating: "desc" },
        { totalReviews: "desc" },
      ],
      take: 6,
      select: {
        id: true,
        displayName: true,
        businessName: true,
        city: true,
        workZone: true,
        description: true,
        averageRating: true,
        totalReviews: true,
        verification: true,
        referencePriceMin: true,
        avatarUrl: true,
        subscriptionPlan: true,
        services: {
          select: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })
    .then((data) => ({ featuredTechnicians: data, hasWarning: false }))
    .catch((error) => {
      console.error("[home] Error cargando técnicos destacados", error);
      return { featuredTechnicians: [], hasWarning: true };
    });

  const categories = categoriesResult.categories;
  const featuredTechnicians = featuredTechniciansResult.featuredTechnicians;
  const hasWarning = categoriesResult.hasWarning || featuredTechniciansResult.hasWarning;

  return (
    <div>
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 md:grid-cols-[1.2fr_0.8fr] md:px-6 md:py-20">
        <div className="space-y-6">
          <Badge>Marketplace de servicios técnicos</Badge>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Encuentra técnicos confiables cerca de vos
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Conectamos personas con expertos para resolver problemas reales en el hogar y negocio,
            con perfiles profesionales, reputación y chat en tiempo real.
          </p>

          <form action="/tecnicos" method="get" className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-lg md:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                type="text"
                name="q"
                placeholder="Ej: Electricista, plomero, aire acondicionado..."
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <Button type="submit" className="h-11 px-6">
              Buscar técnico
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Técnicos verificados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500" /> Reputación transparente
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-sky-500" /> Respuesta ágil
            </span>
          </div>
        </div>

        <Card className="relative space-y-4 overflow-hidden bg-[var(--brand-navy)] text-white">
          {/* Triangle tessellation — capa oscura + capa teal enmascarada en diagonal */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              {/* Capa oscura: navy / negro profundo */}
              <pattern id="ct-dark" x="0" y="0" width="120" height="80" patternUnits="userSpaceOnUse">
                <polygon points="0,0 0,40 30,0"       fill="#06101e"/>
                <polygon points="0,40 30,0 60,40"     fill="#0f1e38"/>
                <polygon points="30,0 60,40 90,0"     fill="#040c18"/>
                <polygon points="60,40 90,0 120,40"   fill="#0d1f35"/>
                <polygon points="90,0 120,0 120,40"   fill="#0a1828"/>
                <polygon points="0,40 30,80 0,80"     fill="#0a1828"/>
                <polygon points="0,40 30,80 60,40"    fill="#060d1c"/>
                <polygon points="30,80 60,40 90,80"   fill="#0d3d35"/>
                <polygon points="60,40 90,80 120,40"  fill="#060e1c"/>
                <polygon points="90,80 120,40 120,80" fill="#0a1828"/>
              </pattern>

              {/* Capa teal: vibrante y luminosa */}
              <pattern id="ct-teal" x="0" y="0" width="120" height="80" patternUnits="userSpaceOnUse">
                <polygon points="0,0 0,40 30,0"       fill="#1AA090"/>
                <polygon points="0,40 30,0 60,40"     fill="#2BBFAA"/>
                <polygon points="30,0 60,40 90,0"     fill="#17897A"/>
                <polygon points="60,40 90,0 120,40"   fill="#2BBFAA"/>
                <polygon points="90,0 120,0 120,40"   fill="#1AA090"/>
                <polygon points="0,40 30,80 0,80"     fill="#2BBFAA"/>
                <polygon points="0,40 30,80 60,40"    fill="#1AA090"/>
                <polygon points="30,80 60,40 90,80"   fill="#232d52"/>
                <polygon points="60,40 90,80 120,40"  fill="#2BBFAA"/>
                <polygon points="90,80 120,40 120,80" fill="#1AA090"/>
              </pattern>

              {/* Máscara diagonal: negro (top-left) → blanco (bottom-right)
                  El negro oculta la capa teal, el blanco la revela */}
              <linearGradient id="ct-diag-mask" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="black"/>
                <stop offset="100%" stopColor="white"/>
              </linearGradient>
              <mask id="ct-mask-diag">
                <rect width="100%" height="100%" fill="url(#ct-diag-mask)"/>
              </mask>
            </defs>

            {/* Capa base oscura — siempre visible */}
            <rect width="100%" height="100%" fill="url(#ct-dark)"/>

            {/* Capa teal — aparece gradualmente de arriba-izq a abajo-der */}
            <rect width="100%" height="100%" fill="url(#ct-teal)" mask="url(#ct-mask-diag)"/>
          </svg>

          <h2 className="relative text-2xl font-semibold">Beneficios para técnicos</h2>
          <ul className="relative space-y-3 text-sm text-slate-200">
            <li>Recibe solicitudes relevantes según tus categorías.</li>
            <li>Construye reputación con valoraciones reales.</li>
            <li>Gestiona chats y trabajos desde tu dashboard.</li>
            <li>Escala tu negocio con presencia digital profesional.</li>
          </ul>
          <Link href="/registro" className="relative inline-flex items-center gap-2 text-sm font-semibold text-white underline">
            Crear perfil técnico <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-12 md:px-6">
        {hasWarning ? (
          <Card>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
            </p>
          </Card>
        ) : null}

        <SectionTitle
          title="Categorías populares"
          subtitle="Elige la especialidad que necesitas y conecta en minutos con técnicos disponibles."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/tecnicos?category=${category.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-lg font-semibold text-slate-900">{category.name}</p>
              <p className="mt-1 text-sm text-slate-600">{category._count.technicianServices} técnicos activos</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-12 md:px-6">
        <SectionTitle
          title="Técnicos destacados"
          subtitle="Perfiles con mejor reputación y experiencia en la plataforma."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredTechnicians.map((technician) => (
            <TechnicianCard
              key={technician.id}
              technician={{
                id: technician.id,
                displayName: technician.displayName,
                businessName: technician.businessName,
                city: technician.city,
                workZone: technician.workZone,
                description: technician.description,
                averageRating: technician.averageRating,
                totalReviews: technician.totalReviews,
                verification: technician.verification,
                referencePriceMin: technician.referencePriceMin,
                avatarUrl: technician.avatarUrl,
                subscriptionPlan: technician.subscriptionPlan,
                categories: technician.services.map((service) => service.category.name),
              }}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-12 md:grid-cols-3 md:px-6">
        {[
          {
            title: "1. Publica tu necesidad",
            text: "Describe problema, categoría, ubicación y presupuesto estimado.",
          },
          {
            title: "2. Compara técnicos",
            text: "Revisa experiencia, estrellas, comentarios y estado de verificación.",
          },
          {
            title: "3. Contrata y califica",
            text: "Coordina por chat, completa el trabajo y deja tu valoración.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.text}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6">
        <Card className="flex flex-col gap-6 bg-gradient-to-r from-slate-900 to-slate-700 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">¿Listo para resolver tu próximo servicio técnico?</h2>
            <p className="mt-2 max-w-xl text-slate-200">
              Crea tu cuenta gratis y conecta con técnicos confiables de forma profesional y segura.
            </p>
          </div>
          <Link href="/registro">
            <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">
              Empezar ahora
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
