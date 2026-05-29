// src/components/dashboard/ModeSwitcher.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ModeSwitcherProps {
    hasClientProfile: boolean;
    hasTechnicianProfile: boolean;
    currentActiveRole: "CLIENT" | "TECHNICIAN";
}

export function ModeSwitcher({ hasClientProfile, hasTechnicianProfile, currentActiveRole }: ModeSwitcherProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Si no cuenta con ambos perfiles creados en la BD, no se muestra nada
    if (!hasClientProfile || !hasTechnicianProfile) {
        return null;
    }

    const targetRole = currentActiveRole === "CLIENT" ? "TECHNICIAN" : "CLIENT";
    const label = targetRole === "CLIENT" ? "Cambiar a Modo Cliente 👤" : "Cambiar a Modo Técnico 🔧";

    async function handleSwitch() {
        setLoading(true);
        try {
            // Enviamos la señal a select-mode indicando que es un switch en caliente
            const response = await fetch("/api/auth/select-mode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: "session_switch",
                    activeRole: targetRole,
                }),
            });

            if (response.ok) {
                // Redirección limpia según el modo al que se cambió
                router.push(targetRole === "CLIENT" ? "/dashboard/cliente" : "/dashboard/tecnico");
                router.refresh();
            }
        } catch (error) {
            console.error("Error cambiando de modo", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={handleSwitch}
            className="border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:border-slate-950 hover:text-slate-950 transition"
        >
            {loading ? "Cambiando modo..." : label}
        </Button>
    );
}