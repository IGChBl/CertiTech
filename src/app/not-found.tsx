import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">404</p>
      <h1 className="text-3xl font-semibold text-slate-900">Pagina no encontrada</h1>
      <p className="text-slate-600">La ruta que buscas no existe o fue movida.</p>
      <Link href="/">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
