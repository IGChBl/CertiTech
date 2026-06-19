import Link from "next/link";
<<<<<<< HEAD
import Image from "next/image";
import { getCurrentHeaderSession, getCurrentUser } from "@/lib/auth/session";
import { PUBLIC_NAV } from "@/lib/constants";
=======
import { getCurrentHeaderSession, getCurrentPageUser } from "@/lib/auth/session";
import { APP_NAME, PUBLIC_NAV } from "@/lib/constants";
>>>>>>> 3562d71667f979c95a83f838d6d058395cc1d9c0
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UnreadMessagesButton } from "@/components/chat/unread-messages-button";
import { ModeSwitcher } from "@/components/dashboard/ModeSwitcher";

export async function SiteHeader() {
    const session = await getCurrentHeaderSession();

    // 💡 Reutilizamos getCurrentPageUser (cache() por request): el header y la
    // página comparten una sola consulta user.findUnique. Si la BD está ocupada
    // (DbBusyError) degradamos el header en lugar de tumbar todo el layout.
    let user: Awaited<ReturnType<typeof getCurrentPageUser>> = null;
    if (session) {
        try {
            user = await getCurrentPageUser();
        } catch {
            user = null;
        }
    }

    // Verificamos si cuenta con ambos perfiles y extraemos el rol activo del JWT
    const hasClient = !!user?.clientProfile;
    const hasTech = !!user?.technicianProfile;
    const currentActiveRole = (session?.activeRole as "CLIENT" | "TECHNICIAN") ?? "CLIENT";

    // 💡 Resolvemos dinámicamente el destino de "Mi panel" según el modo activo
    const dashboardDestination = session?.role === "ADMIN"
        ? "/dashboard/admin"
        : currentActiveRole === "CLIENT"
            ? "/dashboard/cliente"
            : "/dashboard/tecnico";

    return (
        <header className="sticky top-0 z-40 border-b border-white/30 bg-white/80 backdrop-blur-lg">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
                <Link href="/" className="group transition-opacity hover:opacity-90">
                    <Image
                        src="/logo.jpg"
                        alt="CertiTech — Confianza técnica a un click"
                        width={220}
                        height={82}
                        className="h-20 w-auto object-contain"
                        style={{ mixBlendMode: "multiply" }}
                        priority
                    />
                </Link>

                <nav className="hidden items-center gap-5 md:flex">
                    {PUBLIC_NAV.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    {session ? (
                        <>
                            {/* 🎛️ BOTÓN INTERACTIVO: Solo aparece si el usuario tiene perfil dual */}
                            {hasClient && hasTech && (
                                <div className="mr-2 hidden sm:block">
                                    <ModeSwitcher
                                        hasClientProfile={hasClient}
                                        hasTechnicianProfile={hasTech}
                                        currentActiveRole={currentActiveRole}
                                    />
                                </div>
                            )}

                            {/* Ajustamos el chat para que use el activeRole si no es admin */}
                            <UnreadMessagesButton role={session.role === "ADMIN" ? "ADMIN" : currentActiveRole} />

                            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
                                <UserAvatar name={session.email} size={30} />
                                <p className="hidden max-w-[140px] truncate text-xs font-medium text-slate-600 sm:block">
                                    {session.email}
                                </p>
                            </div>

                            {/* 🚀 ENLACE DINÁMICO: Redirige según el modo activo */}
                            <Link href={dashboardDestination}>
                                <Button variant="secondary">Mi panel</Button>
                            </Link>

                            <form action="/api/auth/logout" method="post">
                                <Button type="submit" variant="ghost">
                                    Cerrar sesión
                                </Button>
                            </form>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost">Entrar</Button>
                            </Link>
                            <Link href="/registro">
                                <Button>Crear cuenta</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}