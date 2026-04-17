export const APP_NAME = "CertiTech";

export const PUBLIC_NAV = [
  { href: "/", label: "Inicio" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/categorias", label: "Categorias" },
  { href: "/tecnicos", label: "Tecnicos" },
  { href: "/faq", label: "FAQ" },
  { href: "/contacto", label: "Contacto" },
];

export const SERVICE_CATEGORIES = [
  "Electrodomesticos",
  "Electricidad",
  "Plomeria",
  "Aire acondicionado",
  "Refrigeracion",
  "Carpinteria",
  "Pintura",
  "Soldadura",
  "Instalaciones",
  "Mantenimiento general",
  "Mecanica basica",
  "Otros",
];

export const ROLE_HOME = {
  CLIENT: "/dashboard/cliente",
  TECHNICIAN: "/dashboard/tecnico",
  ADMIN: "/dashboard/admin",
} as const;

export const AUTH_COOKIE = "tm_access_token";
export const AUTH_REFRESH_COOKIE = "tm_refresh_token";

