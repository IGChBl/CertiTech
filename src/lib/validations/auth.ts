import { z } from "zod";

const passwordRule = z
  .string({ required_error: "La contrasena es requerida" })
  .min(8, "Debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "Debe incluir al menos una mayuscula")
  .regex(/[0-9]/, "Debe incluir al menos un numero");

export const loginSchema = z.object({
  email: z.string().email("Correo invalido").trim().toLowerCase(),
  password: z.string().min(1, "La contrasena es requerida"),
});

export const registerClientSchema = z.object({
  email: z.string().email("Correo invalido").trim().toLowerCase(),
  phone: z.string().min(8, "Telefono invalido"),
  password: passwordRule,
  fullName: z.string().min(3, "Nombre muy corto"),
  city: z.string().min(2, "Ciudad requerida"),
  zone: z.string().optional(),
  bio: z.string().max(500).optional(),
});

export const registerTechnicianSchema = z.object({
  email: z.string().email("Correo invalido").trim().toLowerCase(),
  phone: z.string().min(8, "Telefono invalido"),
  password: passwordRule,
  displayName: z.string().min(3, "Nombre requerido"),
  businessName: z.string().max(120).optional(),
  city: z.string().min(2, "Ciudad requerida"),
  workZone: z.string().max(150).optional(),
  description: z.string().min(20, "Describe mejor tu experiencia"),
  yearsExperience: z.number().int().min(0).max(60),
  availabilityText: z.string().optional(),
  scheduleText: z.string().optional(),
  categoryIds: z.array(z.string()).min(1, "Selecciona al menos una categoria"),
  referencePriceMin: z.number().int().min(0).optional(),
  referencePriceMax: z.number().int().min(0).optional(),
  documentUrl: z.string().url("Documento invalido").optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Correo invalido").trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Token invalido"),
  password: passwordRule,
});
