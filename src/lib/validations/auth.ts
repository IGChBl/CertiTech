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

const adultMessage = "Debes ser mayor de 18 anos para crear una cuenta en CertiTech.";

function isAdultDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }

  return age >= 18;
}

const birthDateRule = z
  .string({ required_error: "La fecha de nacimiento es obligatoria" })
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Fecha de nacimiento invalida")
  .refine((value) => isAdultDate(value), adultMessage);

function normalizeDocumentNumber(value: string) {
  return value.trim().toUpperCase().replace(/[-\s]/g, "");
}

function matchesCedulaBirthDate(identityDocumentNumber: string, birthDate: string) {
  const normalized = normalizeDocumentNumber(identityDocumentNumber);
  const match = normalized.match(/^(\d{3})(\d{2})(\d{2})(\d{2})(\d{4})([A-Z])$/);

  if (!match) {
    return false;
  }

  const [, , dd, mm, yy] = match;
  const [year, month, day] = birthDate.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return false;
  }

  return dd === String(day).padStart(2, "0")
    && mm === String(month).padStart(2, "0")
    && yy === String(year % 100).padStart(2, "0");
}

export const registerClientSchema = z
  .object({
    email: z.string().email("Correo invalido").trim().toLowerCase(),
    phone: z.string().min(8, "Telefono invalido"),
    password: passwordRule,
    fullName: z.string().min(3, "Nombre muy corto"),
    birthDate: birthDateRule,
    confirmedAdult: z.literal(true, {
      errorMap: () => ({ message: adultMessage }),
    }),
    city: z.string().min(2, "Ciudad requerida"),
    zone: z.string().optional(),
    bio: z.string().max(500).optional(),
    identityDocumentNumber: z
      .string()
      .trim()
      .regex(
        /^\d{3}-?\d{6}-?\d{4}[A-Za-z]$/,
        "Cedula invalida. Usa formato 0013107910005J o 001-310791-0005J.",
      )
      .optional()
      .or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (!value.identityDocumentNumber) {
      return;
    }

    if (!matchesCedulaBirthDate(value.identityDocumentNumber, value.birthDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identityDocumentNumber"],
        message: "La cedula no coincide con la fecha de nacimiento.",
      });
    }
  });

export const registerTechnicianSchema = z.object({
  email: z.string().email("Correo invalido").trim().toLowerCase(),
  phone: z.string().min(8, "Telefono invalido"),
  password: passwordRule,
  displayName: z.string().min(3, "Nombre requerido"),
  businessName: z.string().max(120).optional(),
  birthDate: birthDateRule,
  confirmedAdult: z.literal(true, {
    errorMap: () => ({ message: adultMessage }),
  }),
  city: z.string().min(2, "Ciudad requerida"),
  workZone: z.string().max(150).optional(),
  description: z.string().min(20, "Describe mejor tu experiencia"),
  yearsExperience: z.number().int().min(0).max(60),
  availabilityText: z.string().optional(),
  scheduleText: z.string().optional(),
  categoryIds: z.array(z.string()).min(1, "Selecciona al menos una categoria"),
  referencePriceMin: z.number().int().min(0).optional(),
  referencePriceMax: z.number().int().min(0).optional(),
  identityDocumentUrl: z.string().url("Documento invalido"),
  avatarUrl: z.string().url("Foto de perfil invalida").optional().or(z.literal("")),
  workEvidenceUrls: z.array(z.string().url("Evidencia invalida")).min(1, "Sube al menos una evidencia de trabajo"),
  certificationUrls: z.array(z.string().url("Certificacion invalida")).optional(),
  policeRecordUrl: z.string().url("Record policial invalido").optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Correo invalido").trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Token invalido"),
  password: passwordRule,
});
