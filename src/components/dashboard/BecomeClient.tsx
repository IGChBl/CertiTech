// src/components/dashboard/BecomeClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export function BecomeClient() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);

        try {
            const response = await fetch("/api/auth/enable-dual-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    actionType: "CREATE_CLIENT",
                    city: formData.get("city"),
                    zone: formData.get("zone"),
                    bio: formData.get("bio"),
                }),
            });

            if (!response.ok) {
                const data: { error?: string } = await response.json().catch(() => ({}));
                throw new Error(data.error || "Error al activar el perfil de cliente");
            }

            // Éxito: Refrescamos para habilitar el Switcher en el Header al instante
            router.refresh();
            setIsOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al activar el perfil de cliente");
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) {
        return (
            <Card className="p-6 border-dashed border-slate-300 bg-slate-50 text-center space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">¿Necesitas contratar un servicio? 👤</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Activa tu perfil de cliente en tu misma cuenta. Podrás publicar solicitudes de trabajo, chatear con otros profesionales y calificar sus servicios.
                </p>
                <Button onClick={() => setIsOpen(true)}>Activar mi perfil de Cliente</Button>
            </Card>
        );
    }

    return (
        <Card className="p-6 space-y-4 max-w-2xl mx-auto">
            <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900">Configura tu perfil de Cliente</h2>
                <p className="text-xs text-slate-500">Dinos dónde te encuentras para cuando necesites solicitar asistencias.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium text-slate-700">Ciudad</label>
                        <Input name="city" required placeholder="Ej: Managua" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Zona o Barrio</label>
                        <Input name="zone" required placeholder="Ej: Altamira, Carretera Sur" />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-700">¿Qué servicios sueles necesitar? (Opcional)</label>
                    <Textarea
                        name="bio"
                        rows={3}
                        placeholder="Ej: Mantenimiento de aires acondicionados, fontanería, pintura residencial..."
                    />
                </div>

                {error && <p className="text-sm text-rose-600 bg-rose-50 p-2 rounded-lg">{error}</p>}

                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Activando..." : "Confirmar y Activar"}
                    </Button>
                </div>
            </form>
        </Card>
    );
}