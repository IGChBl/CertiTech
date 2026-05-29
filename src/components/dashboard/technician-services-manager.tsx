"use client";

import { useState } from "react";
import { Plus, Trash, Edit, Check, X, AlertCircle, DollarSign, Wrench, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Category = {
  id: string;
  name: string;
};

type Service = {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  basePrice: number | null;
  isActive: boolean;
  category: Category;
};

export function TechnicianServicesManager({
  initialServices,
  categories,
}: {
  initialServices: Service[];
  categories: Category[];
}) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for new service
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newBasePrice, setNewBasePrice] = useState("");

  // Edit states
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBasePrice, setEditBasePrice] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!newCategoryId || !newTitle.trim()) {
      setError("Categoría y título son obligatorios.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/technician/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: newCategoryId,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          basePrice: newBasePrice ? Number(newBasePrice) : null,
          isActive: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Ocurrió un error al crear el servicio.");
      }

      setServices((prev) => [data.service, ...prev]);
      setSuccess("Servicio agregado correctamente.");
      setShowAddForm(false);
      resetAddForm();
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function resetAddForm() {
    setNewCategoryId("");
    setNewTitle("");
    setNewDescription("");
    setNewBasePrice("");
  }

  function startEditing(service: Service) {
    setEditingServiceId(service.id);
    setEditCategoryId(service.categoryId);
    setEditTitle(service.title);
    setEditDescription(service.description ?? "");
    setEditBasePrice(service.basePrice !== null ? String(service.basePrice) : "");
    setEditIsActive(service.isActive);
  }

  function cancelEditing() {
    setEditingServiceId(null);
  }

  async function handleUpdateService(e: React.FormEvent, id: string) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!editCategoryId || !editTitle.trim()) {
      setError("Categoría y título son obligatorios.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/technician/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: editCategoryId,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          basePrice: editBasePrice ? Number(editBasePrice) : null,
          isActive: editIsActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Ocurrió un error al actualizar el servicio.");
      }

      setServices((prev) =>
        prev.map((s) => (s.id === id ? data.service : s))
      );
      setSuccess("Servicio actualizado correctamente.");
      setEditingServiceId(null);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteService(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este servicio?")) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/technician/services/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Ocurrió un error al eliminar el servicio.");
      }

      setServices((prev) => prev.filter((s) => s.id !== id));
      setSuccess("Servicio eliminado correctamente.");
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 border border-rose-100 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-100 animate-in fade-in slide-in-from-top-1 duration-200">
          <Check className="h-5 w-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Header and Toggle Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
              <Wrench className="h-5 w-5" />
            </span>
            Catálogo de Servicios y Precios
          </h2>
          <p className="text-sm text-slate-500">
            Define los trabajos que realizas y tus tarifas base de referencia para que los clientes te contraten directamente.
          </p>
        </div>
        {!showAddForm && (
          <Button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Agregar Servicio
          </Button>
        )}
      </div>

      {/* Add New Service Form */}
      {showAddForm && (
        <Card className="border border-slate-200 bg-slate-50 p-5 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-lg font-semibold text-slate-900">Nuevo Servicio</h3>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setError(null);
              }}
              className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={handleAddService} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Categoría</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                >
                  <option value="">Selecciona categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Título del Servicio</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Instalación de Minisplit 12,000 BTU"
                  required
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Descripción del Trabajo</label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe qué incluye el servicio base (ej: mano de obra, tubería básica de cobre, soporte de pared)..."
                  rows={2}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Precio Base (NIO)</label>
                <div className="relative rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-slate-900 overflow-hidden transition">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(e.target.value)}
                    placeholder="Opcional (ej. 1500)"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border-0 focus:outline-none focus:ring-0 text-slate-900 bg-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setError(null);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Crear Servicio"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-4">
        {services.length > 0 ? (
          services.map((service) => {
            const isEditing = editingServiceId === service.id;

            if (isEditing) {
              return (
                <Card
                  key={service.id}
                  className="border-2 border-slate-900 bg-slate-50 p-5 rounded-2xl space-y-4 animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Settings className="h-4 w-4 animate-spin text-slate-500" />
                      Editando Servicio
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={cancelEditing}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={(e) => handleUpdateService(e, service.id)} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Categoría</label>
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Título del Servicio</label>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          required
                          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Descripción</label>
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={2}
                          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Precio Base (NIO)</label>
                        <div className="relative rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-slate-900 overflow-hidden transition">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <input
                            type="number"
                            min={0}
                            value={editBasePrice}
                            onChange={(e) => setEditBasePrice(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 text-sm border-0 focus:outline-none focus:ring-0 text-slate-900 bg-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="rounded text-slate-900 focus:ring-slate-900 h-4 w-4 border-slate-300"
                        />
                        <span className="text-sm font-medium text-slate-700">Servicio Activo (Visible a Clientes)</span>
                      </label>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={cancelEditing}
                          disabled={loading}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Card>
              );
            }

            return (
              <Card
                key={service.id}
                className={`transition duration-200 border ${
                  service.isActive
                    ? "border-slate-200 hover:border-slate-300"
                    : "border-slate-100 bg-slate-50 opacity-75"
                } flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                      {service.category.name}
                    </span>
                    {!service.isActive && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-100">
                        Inactivo
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-900">{service.title}</h4>
                    <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                      {service.description || "Sin descripción proporcionada."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                  <div className="text-left md:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Precio de Referencia</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      {service.basePrice !== null ? `C$ ${service.basePrice.toLocaleString()}` : "A convenir"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => startEditing(service)}
                      className="p-2.5 text-slate-700 hover:bg-slate-100 rounded-xl"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl"
                      title="Eliminar"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-300 bg-slate-50/50 rounded-2xl text-center space-y-3">
            <div className="p-3 bg-slate-100 text-slate-400 rounded-full">
              <Wrench className="h-8 w-8" />
            </div>
            <div className="max-w-md">
              <h4 className="text-base font-bold text-slate-900">Aún no has agregado ningún servicio</h4>
              <p className="text-sm text-slate-500 mt-1">
                Para que los clientes de CertiTech puedan encontrar tus trabajos en el catálogo y agendarte de forma directa, agrega tu primer servicio y fija tus precios.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Agregar Mi Primer Servicio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
