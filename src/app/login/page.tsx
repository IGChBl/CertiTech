import Link from "next/link";
import { LoginForm } from "@/components/forms/auth-forms";

export default function LoginPage() {
  return (
    <div className="px-4 py-12 md:px-6">
      <LoginForm />
      <p className="mt-4 text-center text-sm text-slate-600">
        No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-slate-900 underline">
          Registrate
        </Link>
      </p>
    </div>
  );
}
