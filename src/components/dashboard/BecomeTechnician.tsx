// src/components/dashboard/BecomeTechnician.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export function BecomeTechnician({ categories }: { categories: { id: string; name: string }[] }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedCats, setSelectedCats] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    function toggleCategory(id: string) {
        setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selectedCats.length) return setError("Selecciona al menos una categoría.");
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);

        try {
            const response = await fetch("/api/auth/enable-dual-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    actionType: "CREATE_TECHNICIAN",
                    displayName: formData.get("displayName"),
                    description: formData.get("description"),
                    yearsExperience: formData.get("yearsExperience"),
                    availabilityText: formData.get("availabilityText"),
                    scheduleText: formData.get("scheduleText"),
                    categoryIds: selectedCats,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error al procesar");
            }

            // Éxito: refrescamos para que el Header pinte el Switcher automáticamente
            router.refresh();
            setIsOpen(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) {
        return (
            <Card className="p-6 border-dashed border-slate-300 bg-slate-50 text-center space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">¿Quieres ofrecer tus servicios técnicos? 🔧</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                    No necesitas crear otra cuenta. Activa tu perfil técnico hoy mismo usando tu mismo correo y comparte tus habilidades.
                </p>
                <Button onClick={() => setIsOpen(true)}>Empezar mi registro técnico</Button>
            </Card>
        );
    }

    return (
        <Card className="p-6 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900">Configura tu perfil profesional</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Nombre comercial o marca</label>
                    <Input name="displayName" required placeholder="Ej: Reparaciones Express o Tu Nombre" />
                </div>
                <div>
                    <label className="text-sm font-medium">Descripción de tus servicios</label>
                    <Textarea name="description" required placeholder="Cuéntale a tus clientes en qué eres experto..." />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="text-sm font-medium">Años de Exp.</label>
                        <Input name="yearsExperience" type="number" required placeholder="3" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Disponibilidad</label>
                        <Input name="availabilityText" required placeholder="Lun a Vie" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Horario</label>
                        <Input name="scheduleText" required placeholder="8am - 5pm" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium block">Categorías de Servicio</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {categories.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleCategory(c.id)}
                                className={`p-2 text-xs border rounded-lg transition ${
                                    selectedCats.includes(c.id) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700"
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                {error && <p className="text-sm text-rose-600 bg-rose-50 p-2 rounded-lg">{error}</p>}

                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={loading}>{loading ? "Activando..." : "Guardar y Activar"}</Button>
                </div>
            </form>
        </Card>
    );
}
