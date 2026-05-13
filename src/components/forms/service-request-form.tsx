"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CategoryOption = {
  id: string;
  name: string;
};

type TechnicianOption = {
  userId: string;
  label: string;
};

async function readResponseData(response: Response): Promise<{ error?: string; message?: string }> {
  const raw = await response.text();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as { error?: string; message?: string };
  } catch {
    return {};
  }
}

export function ServiceRequestForm({
  categories,
  technicians,
}: {
  categories: CategoryOption[];
  technicians: TechnicianOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    const payload = {
      title: String(formData.get("title") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      description: String(formData.get("description") ?? ""),
      city: String(formData.get("city") ?? ""),
      zone: String(formData.get("zone") ?? ""),
      locationReference: String(formData.get("locationReference") ?? ""),
      desiredDate: formData.get("desiredDate")
        ? new Date(String(formData.get("desiredDate"))).toISOString()
        : undefined,
      urgency: String(formData.get("urgency") ?? "MEDIUM"),
      budgetMin: formData.get("budgetMin") ? Number(formData.get("budgetMin")) : undefined,
      budgetMax: formData.get("budgetMax") ? Number(formData.get("budgetMax")) : undefined,
      technicianId: String(formData.get("technicianId") ?? "") || undefined,
    };

    const response = await fetch("/api/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await readResponseData(response);

    if (!response.ok) {
      setError(data.error ?? "No se pudo crear la solicitud.");
      setLoading(false);
      return;
    }

    setMessage("Solicitud creada correctamente.");
    (event.target as HTMLFormElement).reset();
    router.refresh();
    setLoading(false);
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="space-y-1">
        <label htmlFor="service-request-title" className="block text-sm font-medium text-slate-700">
          Título del problema o necesidad
        </label>
        <Input id="service-request-title" name="title" required placeholder="Título del problema o necesidad" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="service-request-category" className="block text-sm font-medium text-slate-700">
            Categoría
          </label>
          <select
            id="service-request-category"
            name="categoryId"
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="">Selecciona categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="service-request-technician" className="block text-sm font-medium text-slate-700">
            Técnico (opcional)
          </label>
          <select
            id="service-request-technician"
            name="technicianId"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="">Asignar luego / abierto</option>
            {technicians.map((technician) => (
              <option key={technician.userId} value={technician.userId}>
                {technician.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="service-request-description" className="block text-sm font-medium text-slate-700">
          Descripción del servicio
        </label>
        <Textarea
          id="service-request-description"
          name="description"
          rows={4}
          required
          placeholder="Describe detalles del servicio"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="service-request-city" className="block text-sm font-medium text-slate-700">
            Ciudad
          </label>
          <Input id="service-request-city" name="city" required placeholder="Ciudad" />
        </div>
        <div className="space-y-1">
          <label htmlFor="service-request-zone" className="block text-sm font-medium text-slate-700">
            Zona
          </label>
          <Input id="service-request-zone" name="zone" placeholder="Zona" />
        </div>
        <div className="space-y-1">
          <label htmlFor="service-request-location-reference" className="block text-sm font-medium text-slate-700">
            Referencia
          </label>
          <Input id="service-request-location-reference" name="locationReference" placeholder="Referencia" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <label htmlFor="service-request-desired-date" className="block text-sm font-medium text-slate-700">
            Fecha deseada
          </label>
          <Input id="service-request-desired-date" name="desiredDate" type="datetime-local" />
        </div>
        <div className="space-y-1">
          <label htmlFor="service-request-urgency" className="block text-sm font-medium text-slate-700">
            Urgencia
          </label>
          <select
            id="service-request-urgency"
            name="urgency"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="service-request-budget-min" className="block text-sm font-medium text-slate-700">
            Presupuesto mínimo
          </label>
          <Input id="service-request-budget-min" name="budgetMin" type="number" min={0} placeholder="Presupuesto mínimo" />
        </div>
        <div className="space-y-1">
          <label htmlFor="service-request-budget-max" className="block text-sm font-medium text-slate-700">
            Presupuesto máximo
          </label>
          <Input id="service-request-budget-max" name="budgetMax" type="number" min={0} placeholder="Presupuesto máximo" />
        </div>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading ? "Publicando..." : "Publicar solicitud"}
      </Button>
    </form>
  );
}
