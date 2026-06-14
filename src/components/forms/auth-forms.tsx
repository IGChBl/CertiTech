"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

type CategoryOption = {
  id: string;
  name: string;
};

type FieldErrors = Record<string, string[]>;
type ApiResponseData = {
  error?: string;
  message?: string;
  previewToken?: string;
  requiresModeSelection?: boolean;
  token?: string;
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

const fieldLabelClassName = "mb-1 block text-sm font-medium text-slate-700";

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
    const [showPassword, setShowPassword] = useState(false);

    // 💡 ESTADOS NUEVOS PARA EL PERFIL DUAL
    const [requiresModeSelection, setRequiresModeSelection] = useState(false);
    const [tempToken, setTempToken] = useState<string | null>(null);

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

            // 💡 INTERCEPCIÓN DUAL: Si el backend pide selección de modo
            if (data.requiresModeSelection) {
                setTempToken(data.token ?? null);
                setRequiresModeSelection(true);
                setLoading(false);
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

    // 💡 ACCIÓN DE SELECCIÓN DE MODO
    async function handleSelectMode(activeRole: "CLIENT" | "TECHNICIAN") {
        if (!tempToken) return;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/select-mode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: tempToken,
                    activeRole,
                }),
            });

            const data = await readResponseData(response);

            if (!response.ok) {
                setError(data.error ?? "No se pudo activar el modo seleccionado");
                return;
            }

            setSuccess(`Ingresando en modo ${activeRole === "CLIENT" ? "Cliente" : "Técnico"}...`);

            const destination = activeRole === "CLIENT" ? "/dashboard/cliente" : "/dashboard/tecnico";
            router.push(destination);
            router.refresh();
        } catch {
            setError("Ocurrió un error al seleccionar el modo. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    }

    // 🎨 RENDERIZADO CONDICIONAL: PANTALLA SELECTORA DE MODO DUAL
    if (requiresModeSelection) {
        return (
            <Card className="mx-auto w-full max-w-lg space-y-6 p-6">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold text-slate-900">Selecciona tu perfil</h1>
                    <p className="text-sm text-slate-500">
                        Detectamos que tu cuenta cuenta con ambos accesos activos. ¿Cómo deseas ingresar hoy?
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Tarjeta para Cliente */}
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSelectMode("CLIENT")}
                        className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-slate-900 hover:shadow-md disabled:opacity-50"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                            👤
                        </div>
                        <h3 className="font-semibold text-slate-800">Modo Cliente</h3>
                        <p className="mt-1 text-xs text-slate-400">Buscar técnicos y gestionar mis solicitudes</p>
                    </button>

                    {/* Tarjeta para Técnico */}
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSelectMode("TECHNICIAN")}
                        className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-slate-900 hover:shadow-md disabled:opacity-50"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                            🔧
                        </div>
                        <h3 className="font-semibold text-slate-800">Modo Técnico</h3>
                        <p className="mt-1 text-xs text-slate-400">Ver mis trabajos, suscripción y cotizaciones</p>
                    </button>
                </div>

                {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 text-center">{error}</p> : null}
                {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 text-center">{success}</p> : null}

                <button
                    type="button"
                    onClick={() => {
                        setRequiresModeSelection(false);
                        setTempToken(null);
                        setError(null);
                    }}
                    className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800 transition underline"
                >
                    Volver al formulario tradicional
                </button>
            </Card>
        );
    }

    // 📝 FORMULARIO TRADICIONAL (Se mantiene idéntico a tu estructura original, empaquetado en su Card)
    return (
        <Card className="mx-auto w-full max-w-lg space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
            <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                    <label htmlFor="login-email" className={fieldLabelClassName}>
                        Correo electrónico
                    </label>
                    <Input id="login-email" type="email" name="email" required placeholder="correo@ejemplo.com" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="login-password" className={fieldLabelClassName}>
                        Contraseña
                    </label>
                    <div className="relative">
                        <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            placeholder="********"
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
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
        <div className="space-y-1">
          <label htmlFor="client-full-name" className={fieldLabelClassName}>
            Nombre completo
          </label>
          <Input id="client-full-name" name="fullName" required placeholder="Ej. María López" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "fullName")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="client-email" className={fieldLabelClassName}>
            Correo electrónico
          </label>
          <Input id="client-email" name="email" type="email" required placeholder="ejemplo@correo.com" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "email")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="client-phone" className={fieldLabelClassName}>
            Teléfono
          </label>
          <Input id="client-phone" name="phone" required placeholder="Ej. 8888-8888 o +505 8888-8888" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "phone")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="client-birth-date" className={fieldLabelClassName}>
            Fecha de nacimiento
          </label>
          <Input id="client-birth-date" name="birthDate" type="date" required placeholder="dd/mm/aaaa" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "birthDate")} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="client-city" className={fieldLabelClassName}>
              Ciudad
            </label>
            <Input id="client-city" name="city" required placeholder="Ej. Managua" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "city")} />
          </div>
          <div className="space-y-1">
            <label htmlFor="client-zone" className={fieldLabelClassName}>
              Zona
            </label>
            <Input id="client-zone" name="zone" required placeholder="Ej. Altamira, Linda Vista, Carretera Sur" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "zone")} />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="client-password" className={fieldLabelClassName}>
            Contraseña
          </label>
          <Input id="client-password" name="password" type="password" required placeholder="Mínimo 8 caracteres" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "password")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="client-identity-document" className={fieldLabelClassName}>
            Documento de identidad
          </label>
          <Input id="client-identity-document" name="identityDocumentNumber" placeholder="Ej. 001-010190-0001A" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "identityDocumentNumber")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="client-bio" className={fieldLabelClassName}>
            Servicios que suele necesitar
          </label>
          <Textarea
            id="client-bio"
            name="bio"
            rows={3}
            placeholder="Ej. reparación de lavadora, instalación eléctrica, mantenimiento de aire acondicionado"
          />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "bio")} />
        </div>
        <p className={fieldLabelClassName}>Confirmación de mayoría de edad</p>
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input id="client-confirmed-adult" name="confirmedAdult" type="checkbox" required className="mt-0.5" />
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
          <div className="space-y-1">
            <label htmlFor="technician-display-name" className={fieldLabelClassName}>
              Nombre o marca
            </label>
            <Input
              id="technician-display-name"
              name="displayName"
              required
              placeholder="Ej. Juan Pérez / Refrigeración Pérez"
            />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "displayName")} />
          </div>
          <div className="space-y-1">
            <label htmlFor="technician-business-name" className={fieldLabelClassName}>
              Nombre del negocio
            </label>
            <Input id="technician-business-name" name="businessName" placeholder="Ej. Taller Pérez" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "businessName")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="technician-email" className={fieldLabelClassName}>
              Correo electrónico
            </label>
            <Input id="technician-email" name="email" type="email" required placeholder="ejemplo@correo.com" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "email")} />
          </div>
          <div className="space-y-1">
            <label htmlFor="technician-phone" className={fieldLabelClassName}>
              Teléfono
            </label>
            <Input id="technician-phone" name="phone" required placeholder="Ej. 8888-8888 o +505 8888-8888" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "phone")} />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="technician-birth-date" className={fieldLabelClassName}>
            Fecha de nacimiento
          </label>
          <Input id="technician-birth-date" name="birthDate" type="date" required placeholder="dd/mm/aaaa" />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "birthDate")} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="technician-city" className={fieldLabelClassName}>
              Ciudad
            </label>
            <Input id="technician-city" name="city" required placeholder="Ej. Managua" />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "city")} />
          </div>
          <div className="space-y-1">
            <label htmlFor="technician-work-zone" className={fieldLabelClassName}>
              Zona de trabajo
            </label>
            <Input
              id="technician-work-zone"
              name="workZone"
              required
              placeholder="Ej. Carretera a Masaya, Bello Horizonte, Ciudad Sandino"
            />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "workZone")} />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="technician-description" className={fieldLabelClassName}>
            Descripción profesional
          </label>
          <Textarea
            id="technician-description"
            name="description"
            rows={3}
            required
            placeholder="Ej. Técnico en refrigeración con experiencia en mantenimiento de aires acondicionados y reparación de refrigeradoras."
          />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "description")} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="technician-years-experience" className={fieldLabelClassName}>
              Años de experiencia
            </label>
            <Input
              id="technician-years-experience"
              name="yearsExperience"
              type="number"
              min={0}
              max={60}
              required
              placeholder="Ej. 3"
            />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "yearsExperience")} />
          </div>
          <div className="space-y-1">
            <label htmlFor="technician-availability-text" className={fieldLabelClassName}>
              Disponibilidad
            </label>
            <Input
              id="technician-availability-text"
              name="availabilityText"
              required
              placeholder="Ej. Lunes a sábado"
            />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "availabilityText")} />
          </div>
          <div className="space-y-1">
            <label htmlFor="technician-schedule-text" className={fieldLabelClassName}>
              Horario
            </label>
            <Input
              id="technician-schedule-text"
              name="scheduleText"
              required
              placeholder="Ej. 8:00 a.m. - 5:00 p.m."
            />
            <FieldErrorBubble message={getFirstFieldError(fieldErrors, "scheduleText")} />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="technician-password" className={fieldLabelClassName}>
            Contraseña
          </label>
          <Input
            id="technician-password"
            name="password"
            type="password"
            required
            placeholder="Mínimo 8 caracteres"
          />
          <FieldErrorBubble message={getFirstFieldError(fieldErrors, "password")} />
        </div>
        <p className={fieldLabelClassName}>Confirmación de mayoría de edad</p>
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            id="technician-confirmed-adult"
            name="confirmedAdult"
            type="checkbox"
            required
            className="mt-0.5"
          />
          Confirmo que soy mayor de 18 años.
        </label>
        <FieldErrorBubble message={getFirstFieldError(fieldErrors, "confirmedAdult")} />

        <fieldset className="space-y-2">
          <legend className={fieldLabelClassName}>Categorías de servicio</legend>
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
        </fieldset>

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
          <div className="space-y-1">
            <label htmlFor="forgot-password-new-password" className={fieldLabelClassName}>
              Nueva contraseña
            </label>
            <Input
              id="forgot-password-new-password"
              name="password"
              type="password"
              required
              placeholder="Nueva contraseña"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Actualizando..." : "Actualizar contraseña"}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={onRequestReset}>
          <div className="space-y-1">
            <label htmlFor="forgot-password-email" className={fieldLabelClassName}>
              Correo electrónico
            </label>
            <Input
              id="forgot-password-email"
              name="email"
              type="email"
              required
              placeholder="Correo de tu cuenta"
            />
          </div>
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
