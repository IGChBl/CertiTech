// src/lib/dashboard-links.ts

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
    { href: "/dashboard/tecnico/servicios", label: "Servicios y Precios" },
    { href: "/dashboard/tecnico/solicitudes", label: "Solicitudes" },
    { href: "/dashboard/tecnico/trabajos", label: "Trabajos" },
    { href: "/dashboard/tecnico/chats", label: "Chats" },
    { href: "/dashboard/tecnico/valoraciones", label: "Valoraciones" },
    { href: "/dashboard/tecnico/galeria", label: "Galería" },
    { href: "/dashboard/tecnico/suscripcion", label: "Suscripción" },
    { href: "/dashboard/tecnico/configuracion", label: "Configuración" },
] as const;

// 💡 1. AGREGAMOS: Enlaces para el Dashboard del Cliente
export const clientDashboardLinks = [
    { href: "/dashboard/cliente", label: "Resumen" },
    { href: "/dashboard/cliente/buscar", label: "Buscar Técnicos" },
    { href: "/dashboard/cliente/solicitudes", label: "Mis Solicitudes" },
    { href: "/dashboard/cliente/chats", label: "Chats" },
    { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
    { href: "/dashboard/cliente/configuracion", label: "Configuración" },
] as const;

// 💡 2. AGREGAMOS: Función inteligente para resolver enlaces según el ROL ACTIVO
export function getDashboardLinks(session: { role: string; activeRole?: string | null }) {
    if (session.role === "ADMIN") {
        return adminDashboardLinks;
    }

    // Si es un usuario común, dependemos de qué modo tenga encendido en su JWT
    return session.activeRole === "TECHNICIAN"
        ? technicianDashboardLinks
        : clientDashboardLinks;
}