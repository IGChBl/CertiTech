export const APP_NAME = "CertiTech";

export const PUBLIC_NAV = [
  { href: "/", label: "Inicio" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/categorias", label: "Categorías" },
  { href: "/tecnicos", label: "Técnicos" },
  { href: "/faq", label: "FAQ" },
  { href: "/contacto", label: "Contacto" },
];

export const SERVICE_CATEGORIES = [
  "Electrodomésticos",
  "Electricidad",
  "Plomería",
  "Aire acondicionado",
  "Refrigeración",
  "Carpintería",
  "Pintura",
  "Soldadura",
  "Instalaciones",
  "Mantenimiento general",
  "Mecánica básica",
  "Otros",
];

export const ROLE_HOME = {
  CLIENT: "/dashboard/cliente",
  TECHNICIAN: "/dashboard/tecnico",
  ADMIN: "/dashboard/admin",
} as const;

export const AUTH_COOKIE = "tm_access_token";
export const AUTH_REFRESH_COOKIE = "tm_refresh_token";

