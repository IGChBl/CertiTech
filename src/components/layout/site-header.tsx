import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME, PUBLIC_NAV, ROLE_HOME } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const user = await getCurrentUser();

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
