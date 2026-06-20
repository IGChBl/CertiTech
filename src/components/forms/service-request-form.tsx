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

async function readResponseData(response: Response): Promise<{ error?: string; message?: string; request?: { id: string }; requiresPayment?: boolean }> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function ServiceRequestForm({
  categories,
  technicians,
  defaultTechnicianId,
  defaultCategoryId,
  defaultTitle,
  defaultAgreedPrice,
}: {
  categories: CategoryOption[];
  technicians: TechnicianOption[];
  defaultTechnicianId?: string;
  defaultCategoryId?: string;
  defaultTitle?: string;
  defaultAgreedPrice?: number;
}) {
  const router = useRouter();
  const bookedTech = defaultTechnicianId ? technicians.find((t) => t.userId === defaultTechnicianId) : undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [agreedPrice, setAgreedPrice] = useState<string>(defaultAgreedPrice ? String(defaultAgreedPrice) : "");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    const payload: Record<string, unknown> = {
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

    const priceVal = formData.get("agreedPrice");
    if (priceVal && Number(priceVal) > 0) {
      payload.agreedPrice = Number(priceVal);
    }

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

    if (data.requiresPayment && data.request?.id) {
      router.push(`/pago/${data.request.id}`);
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
        <Input
          id="service-request-title"
          name="title"
          required
          placeholder="Título del problema o necesidad"
          defaultValue={defaultTitle}
        />
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
            defaultValue={defaultCategoryId ?? ""}
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

        <div className={`space-y-1 p-3 rounded-xl transition ${defaultTechnicianId ? "bg-slate-50 ring-2 ring-slate-900" : ""}`}>
          <label htmlFor="service-request-technician" className="block text-sm font-semibold text-slate-700">
            Técnico {defaultTechnicianId ? "Seleccionado" : "(opcional)"}
          </label>
          <select
            id="service-request-technician"
            name="technicianId"
            defaultValue={defaultTechnicianId ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium"
          >
            <option value="">Asignar luego / abierto</option>
            {technicians.map((technician) => (
              <option key={technician.userId} value={technician.userId}>
                {technician.label}
              </option>
            ))}
          </select>
          {defaultTechnicianId && bookedTech && (
            <p className="text-xs font-semibold text-slate-650 mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-slate-900 rounded-full inline-block animate-ping"></span>
              Agendando directamente con {bookedTech.label}
            </p>
          )}
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
        <div className="space-y-1">
          <label htmlFor="service-request-agreed-price" className="block text-sm font-medium text-slate-700">
            Precio acordado {defaultAgreedPrice ? <span className="text-emerald-600">(del servicio)</span> : "(opcional)"}
          </label>
          <Input
            id="service-request-agreed-price"
            name="agreedPrice"
            type="number"
            min={1}
            placeholder="Monto a pagar"
            value={agreedPrice}
            onChange={(e) => setAgreedPrice(e.target.value)}
          />
          {agreedPrice && Number(agreedPrice) > 0 && (
            <p className="text-xs text-emerald-700 font-medium mt-1">
              Se solicitará pago de C$ {Number(agreedPrice).toLocaleString()} al confirmar la solicitud.
            </p>
          )}
        </div>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading ? "Publicando..." : agreedPrice && Number(agreedPrice) > 0 ? "Continuar al pago →" : "Publicar solicitud"}
      </Button>
    </form>
  );
}
