"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

type CategoryOption = {
  id: string;
  name: string;
};

type FieldErrors = Record<string, string[]>;
type ApiResponseData = {
  error?: string;
  message?: string;
  previewToken?: string;
  user?: {
    role?: "CLIENT" | "TECHNICIAN" | "ADMIN";
  };
  issues?: {
    fieldErrors?: FieldErrors;
  };
  emailVerification?: {
    sent?: boolean;
    warning?: string;
  };
};

function getFirstFieldError(fieldErrors: FieldErrors, field: string) {
  return fieldErrors[field]?.[0] ?? null;
}

async function readResponseData(response: Response): Promise<ApiResponseData> {
  const raw = await response.text();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as ApiResponseData;
  } catch {
    return {};
  }
}

function FieldErrorBubble({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="relative mt-1">
      <div className="inline-block rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 shadow-sm">
        {message}
      </div>
      <span className="absolute -top-1 left-3 h-2 w-2 rotate-45 border-l border-t border-rose-200 bg-rose-50" />
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    search?.get("verified") === "1" ? "Correo verificado. Ya puedes iniciar sesión." : null,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(event.currentTarget);
      const payload = {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readResponseData(response);

      if (!response.ok) {
        setError(data.error ?? "No fue posible iniciar sesión");
        return;
      }

      setSuccess("Sesión iniciada correctamente.");

      const role = data.user?.role ?? "CLIENT";
      const destination =
        role === "CLIENT"
          ? "/dashboard/cliente"
          : role === "TECHNICIAN"
            ? "/dashboard/tecnico"
            : "/dashboard/admin";

      router.push(destination);
      router.refresh();
    } catch {
      setError("No se pudo iniciar sesión en este momento. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Correo</label>
          <Input type="email" name="email" required placeholder="correo@ejemplo.com" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Contraseña</label>
          <Input type="password" name="password" required placeholder="********" />
        </div>

        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {success ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        ) : null}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Ingresando..." : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}

export function RegisterTabs({ categories }: { categories: CategoryOption[] }) {
  const [tab, setTab] = useState<"client" | "technician">("client");

  return (
    <div className="space-y-6">
      <div className="mx-auto flex w-full max-w-lg rounded-xl border border-slate-200 bg-white p-1">
        <button
          onClick={() => setTab("client")}
          className={`w-1/2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "client" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
          type="button"
        >
          Soy cliente
        </button>
        <button
          onClick={() => setTab("technician")}
          className={`w-1/2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "technician" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
          type="button"
        >
          Soy técnico
        </button>
      </div>

      {tab === "client" ? <ClientRegisterForm /> : <TechnicianRegisterForm categories={categories} />}
    </div>
  );
}

function ClientRegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setFieldErrors({});

    try {
      const formData = new FormData(event.currentTarget);

      const response = await fetch("/api/auth/register-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          birthDate: String(formData.get("birthDate") ?? ""),
          confirmedAdult: formData.get("confirmedAdult") === "on",
          city: String(formData.get("city") ?? ""),
          zone: String(formData.get("zone") ?? ""),
          password: String(formData.get("password") ?? ""),
          bio: String(formData.get("bio") ?? ""),
          identityDocumentNumber: String(formData.get("identityDocumentNumber") ?? "") || undefined,
        }),
      });

      const data = await readResponseData(response);

      if (!response.ok) {
        if (data.issues?.fieldErrors) {
          setFieldErrors(data.issues.fieldErrors);
        }
        setError(data.error ?? "No se pudo crear la cuenta.");
        return;
      }

      setMessage("Cuenta creada exitosamente.");
      const destination = data.emailVerification?.warning
        ? "/dashboard/cliente?email_notice=delivery_failed"
        : "/dashboard/cliente";
      router.push(destination);
      router.refresh();
    } catch {
      setError("No se pudo completar el registro. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-lg space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Registro de cliente</h2>
      <form className="space-y-3" onSubmit={onSubmit}>
        <div>
          <Input name="fullName" required placeholder="Ej. María López" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "fullName")} />
        </div>
        <div>
          <Input name="email" type="email" required placeholder="ejemplo@correo.com" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "email")} />
        </div>
        <div>
          <Input name="phone" required placeholder="Ej. 8888-8888 o +505 8888-8888" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "phone")} />
        </div>
        <div>
          <Input name="birthDate" type="date" required placeholder="dd/mm/aaaa" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "birthDate")} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Input name="city" required placeholder="Ej. Managua" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "city")} />
          </div>
          <div>
            <Input name="zone" required placeholder="Ej. Altamira, Linda Vista, Carretera Sur" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "zone")} />
          </div>
        </div>
        <div>
          <Input name="password" type="password" required placeholder="Mínimo 8 caracteres" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "password")} />
        </div>
        <div>
          <Input name="identityDocumentNumber" placeholder="Ej. 001-010190-0001A" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "identityDocumentNumber")} />
        </div>
        <div>
          <Textarea
            name="bio"
            rows={3}
            placeholder="Ej. reparación de lavadora, instalación eléctrica, mantenimiento de aire acondicionado"
          />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "bio")} />
        </div>
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input name="confirmedAdult" type="checkbox" required className="mt-0.5" />
          Confirmo que soy mayor de 18 años.
        </label>
        <FieldErrorBubble message={getFirstFieldError(fieldErrors, "confirmedAdult")} />

        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {message ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </form>
    </Card>
  );
}

function TechnicianRegisterForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  function toggleCategory(categoryId: string) {
    setSelected((prev) =>
      prev.includes(categoryId) ? prev.filter((item) => item !== categoryId) : [...prev, categoryId],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setFieldErrors({});

    if (!selected.length) {
      setError("Selecciona al menos una categoría.");
      setLoading(false);
      return;
    }

    const formData = new FormData(event.currentTarget);

    const payload = {
      displayName: String(formData.get("displayName") ?? ""),
      businessName: String(formData.get("businessName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      birthDate: String(formData.get("birthDate") ?? ""),
      confirmedAdult: formData.get("confirmedAdult") === "on",
      city: String(formData.get("city") ?? ""),
      workZone: String(formData.get("workZone") ?? ""),
      password: String(formData.get("password") ?? ""),
      description: String(formData.get("description") ?? ""),
      yearsExperience: Number(formData.get("yearsExperience") ?? "0"),
      availabilityText: String(formData.get("availabilityText") ?? ""),
      scheduleText: String(formData.get("scheduleText") ?? ""),
      categoryIds: selected,
    };

    try {
      const response = await fetch("/api/auth/register-technician", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readResponseData(response);

      if (!response.ok) {
        if (data.issues?.fieldErrors) {
          setFieldErrors(data.issues.fieldErrors);
        }
        setError(data.error ?? "No se pudo crear la cuenta técnica.");
        return;
      }

      setMessage("Perfil técnico creado correctamente.");
      const destination = data.emailVerification?.warning
        ? "/dashboard/tecnico?email_notice=delivery_failed"
        : "/dashboard/tecnico";
      router.push(destination);
      router.refresh();
    } catch {
      setError("No se pudo completar el registro técnico. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-3xl space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Registro técnico</h2>
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Input name="displayName" required placeholder="Ej. Juan Pérez / Refrigeración Pérez" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "displayName")} />
          </div>
          <div>
            <Input name="businessName" placeholder="Ej. Taller Pérez" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "businessName")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Input name="email" type="email" required placeholder="ejemplo@correo.com" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "email")} />
          </div>
          <div>
            <Input name="phone" required placeholder="Ej. 8888-8888 o +505 8888-8888" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "phone")} />
          </div>
        </div>

        <div>
          <Input name="birthDate" type="date" required placeholder="dd/mm/aaaa" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "birthDate")} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Input name="city" required placeholder="Ej. Managua" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "city")} />
          </div>
          <div>
            <Input name="workZone" required placeholder="Ej. Carretera a Masaya, Bello Horizonte, Ciudad Sandino" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "workZone")} />
          </div>
        </div>

        <div>
          <Textarea
            name="description"
            rows={3}
            required
            placeholder="Ej. Técnico en refrigeración con experiencia en mantenimiento de aires acondicionados y reparación de refrigeradoras."
          />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "description")} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <Input
              name="yearsExperience"
              type="number"
              min={0}
              max={60}
              required
              placeholder="Ej. 3"
            />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "yearsExperience")} />
          </div>
          <div>
            <Input name="availabilityText" required placeholder="Ej. Lunes a sábado" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "availabilityText")} />
          </div>
          <div>
            <Input name="scheduleText" required placeholder="Ej. 8:00 a.m. - 5:00 p.m." />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "scheduleText")} />
          </div>
        </div>

        <div>
          <Input name="password" type="password" required placeholder="Mínimo 8 caracteres" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "password")} />
        </div>
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input name="confirmedAdult" type="checkbox" required className="mt-0.5" />
          Confirmo que soy mayor de 18 años.
        </label>
        <FieldErrorBubble message={getFirstFieldError(fieldErrors, "confirmedAdult")} />

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Categorías de servicio</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {sortedCategories.map((category) => {
              const active = selected.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {message ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creando cuenta..." : "Crear perfil técnico"}
        </Button>
      </form>
    </Card>
  );
}

export function ForgotPasswordForm({ token }: { token?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "");

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await readResponseData(response);

      if (!response.ok) {
        setError(data.error ?? "No se pudo procesar la solicitud.");
        return;
      }

      setMessage(
        data.previewToken
          ? `Instrucción enviada. Token de prueba: ${data.previewToken}`
          : "Si el correo existe, enviamos instrucciones.",
      );
    } catch {
      setError("No se pudo procesar la solicitud en este momento.");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      const password = String(formData.get("password") ?? "");

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await readResponseData(response);

      if (!response.ok) {
        setError(data.error ?? "No se pudo actualizar la contraseña.");
        return;
      }

      setMessage("Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
    } catch {
      setError("No se pudo actualizar la contraseña en este momento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Recuperar contraseña</h1>

      {token ? (
        <form className="space-y-4" onSubmit={onResetPassword}>
          <Input name="password" type="password" required placeholder="Nueva contraseña" />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Actualizando..." : "Actualizar contraseña"}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={onRequestReset}>
          <Input name="email" type="email" required placeholder="Correo de tu cuenta" />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Enviando..." : "Enviar enlace"}
          </Button>
        </form>
      )}

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
    </Card>
  );
}
