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

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    search?.get("verified") === "1" ? "Correo verificado. Ya puedes iniciar sesion." : null,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

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

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No fue posible iniciar sesion");
      setLoading(false);
      return;
    }

    setSuccess("Sesion iniciada correctamente.");

    const role = data.user?.role as "CLIENT" | "TECHNICIAN" | "ADMIN";
    const destination =
      role === "CLIENT"
        ? "/dashboard/cliente"
        : role === "TECHNICIAN"
          ? "/dashboard/tecnico"
          : "/dashboard/admin";

    router.push(destination);
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesion</h1>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Correo</label>
          <Input type="email" name="email" required placeholder="correo@ejemplo.com" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Contrasena</label>
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
          Soy tecnico
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/register-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        city: String(formData.get("city") ?? ""),
        zone: String(formData.get("zone") ?? ""),
        password: String(formData.get("password") ?? ""),
        bio: String(formData.get("bio") ?? ""),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No se pudo crear la cuenta.");
      setLoading(false);
      return;
    }

    setMessage("Cuenta creada exitosamente.");
    router.push("/dashboard/cliente");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-lg space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Registro de cliente</h2>
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input name="fullName" required placeholder="Nombre completo" />
        <Input name="email" type="email" required placeholder="Correo" />
        <Input name="phone" required placeholder="Telefono" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input name="city" required placeholder="Ciudad" />
          <Input name="zone" placeholder="Zona" />
        </div>
        <Input name="password" type="password" required placeholder="Contrasena" />
        <Textarea name="bio" rows={3} placeholder="Cuentanos que servicios sueles necesitar" />

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

    if (!selected.length) {
      setError("Selecciona al menos una categoria.");
      setLoading(false);
      return;
    }

    const formData = new FormData(event.currentTarget);

    const payload = {
      displayName: String(formData.get("displayName") ?? ""),
      businessName: String(formData.get("businessName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      city: String(formData.get("city") ?? ""),
      workZone: String(formData.get("workZone") ?? ""),
      password: String(formData.get("password") ?? ""),
      description: String(formData.get("description") ?? ""),
      yearsExperience: Number(formData.get("yearsExperience") ?? "0"),
      availabilityText: String(formData.get("availabilityText") ?? ""),
      scheduleText: String(formData.get("scheduleText") ?? ""),
      referencePriceMin: Number(formData.get("referencePriceMin") ?? "0"),
      referencePriceMax: Number(formData.get("referencePriceMax") ?? "0"),
      documentUrl: String(formData.get("documentUrl") ?? ""),
      categoryIds: selected,
    };

    const response = await fetch("/api/auth/register-technician", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No se pudo crear la cuenta tecnica.");
      setLoading(false);
      return;
    }

    setMessage("Perfil tecnico creado correctamente.");
    router.push("/dashboard/tecnico");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-3xl space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Registro tecnico</h2>
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input name="displayName" required placeholder="Nombre o marca" />
          <Input name="businessName" placeholder="Nombre del negocio (opcional)" />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input name="email" type="email" required placeholder="Correo" />
          <Input name="phone" required placeholder="Telefono" />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input name="city" required placeholder="Ciudad" />
          <Input name="workZone" placeholder="Zona de trabajo" />
        </div>

        <Textarea name="description" rows={3} required placeholder="Descripcion profesional" />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            name="yearsExperience"
            type="number"
            min={0}
            max={60}
            required
            placeholder="Anios experiencia"
          />
          <Input name="availabilityText" placeholder="Disponibilidad" />
          <Input name="scheduleText" placeholder="Horario" />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input name="referencePriceMin" type="number" min={0} placeholder="Precio referencial minimo" />
          <Input name="referencePriceMax" type="number" min={0} placeholder="Precio referencial maximo" />
        </div>

        <Input name="documentUrl" placeholder="URL de documento para verificacion (opcional)" />
        <Input name="password" type="password" required placeholder="Contrasena" />

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Categorias de servicio</p>
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
          {loading ? "Creando cuenta..." : "Crear perfil tecnico"}
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

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No se pudo procesar la solicitud.");
      setLoading(false);
      return;
    }

    setMessage(
      data.previewToken
        ? `Instruccion enviada. Token de prueba: ${data.previewToken}`
        : "Si el correo existe, enviamos instrucciones.",
    );
    setLoading(false);
  }

  async function onResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

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

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No se pudo actualizar la contrasena.");
      setLoading(false);
      return;
    }

    setMessage("Contrasena actualizada correctamente. Ya puedes iniciar sesion.");
    setLoading(false);
  }

  return (
    <Card className="mx-auto w-full max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Recuperar contrasena</h1>

      {token ? (
        <form className="space-y-4" onSubmit={onResetPassword}>
          <Input name="password" type="password" required placeholder="Nueva contrasena" />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Actualizando..." : "Actualizar contrasena"}
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
