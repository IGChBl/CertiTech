import Link from "next/link";
import { LoginForm } from "@/components/forms/auth-forms";
import { TriangleBackground } from "@/components/ui/triangle-background";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <TriangleBackground />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Card */}
        <div
          className="rounded-2xl border bg-white p-8"
          style={{
            borderColor: "var(--app-border)",
            boxShadow:
              "0 4px 6px -1px rgba(0,0,0,0.12), 0 24px 48px -12px rgba(27,35,64,0.32), 0 0 0 1px rgba(43,191,170,0.10)",
          }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-slate-500">Accede a tu cuenta para continuar</p>
          </div>
          <LoginForm />
        </div>

        <p className="text-center text-sm text-slate-300">
          ¿No tienes cuenta?{" "}
          <Link
            href="/registro"
            className="font-semibold transition-colors"
            style={{ color: "var(--brand-teal)" }}
          >
            Crear cuenta gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
