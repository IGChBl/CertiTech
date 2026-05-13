import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME, PUBLIC_NAV, ROLE_HOME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const userName = user
    ? user.role.code === "CLIENT"
      ? user.clientProfile?.fullName
      : user.role.code === "TECHNICIAN"
        ? user.technicianProfile?.displayName
        : user.email
    : null;
  const userAvatar =
    user?.role.code === "CLIENT"
      ? user.clientProfile?.avatarUrl
      : user?.role.code === "TECHNICIAN"
        ? user.technicianProfile?.avatarUrl
        : null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/30 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
          {APP_NAME}
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
          {user ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
                <UserAvatar name={userName} src={userAvatar} size={30} />
                <p className="hidden max-w-[140px] truncate text-xs font-medium text-slate-600 sm:block">
                  {userName ?? user.email}
                </p>
              </div>
              <Link href={ROLE_HOME[user.role.code]}>
                <Button variant="secondary">Mi panel</Button>
              </Link>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="ghost">
                  Cerrar sesion
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
