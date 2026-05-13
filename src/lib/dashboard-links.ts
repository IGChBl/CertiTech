export const adminDashboardLinks = [
  { href: "/dashboard/admin", label: "Resumen" },
  { href: "/dashboard/admin/usuarios", label: "Usuarios" },
  { href: "/dashboard/admin/tecnicos", label: "Técnicos" },
  { href: "/dashboard/admin/verificaciones", label: "Verificaciones" },
  { href: "/dashboard/admin/suscripciones", label: "Suscripciones" },
  { href: "/dashboard/admin/categorias", label: "Categorías" },
  { href: "/dashboard/admin/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/admin/reportes", label: "Reportes" },
  { href: "/dashboard/admin/resenas", label: "Reseñas" },
  { href: "/dashboard/admin/moderacion", label: "Moderación" },
] as const;

export const technicianDashboardLinks = [
  { href: "/dashboard/tecnico", label: "Resumen" },
  { href: "/dashboard/tecnico/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/tecnico/trabajos", label: "Trabajos" },
  { href: "/dashboard/tecnico/chats", label: "Chats" },
  { href: "/dashboard/tecnico/valoraciones", label: "Valoraciones" },
  { href: "/dashboard/tecnico/galeria", label: "Galería" },
  { href: "/dashboard/tecnico/suscripcion", label: "Suscripción" },
  { href: "/dashboard/tecnico/configuracion", label: "Configuración" },
] as const;
