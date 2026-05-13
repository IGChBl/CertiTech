import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
        <div>
          <p className="text-lg font-bold text-slate-900">{APP_NAME}</p>
          <p className="mt-2 text-sm text-slate-600">Marketplace profesional de servicios técnicos.</p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold text-slate-900">Producto</p>
          <Link className="block text-slate-600 hover:text-slate-900" href="/como-funciona">
            Cómo funciona
          </Link>
          <Link className="block text-slate-600 hover:text-slate-900" href="/categorias">
            Categorías
          </Link>
          <Link className="block text-slate-600 hover:text-slate-900" href="/tecnicos">
            Encontrar técnicos
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold text-slate-900">Recursos</p>
          <Link className="block text-slate-600 hover:text-slate-900" href="/faq">
            Preguntas frecuentes
          </Link>
          <Link className="block text-slate-600 hover:text-slate-900" href="/contacto">
            Contacto
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold text-slate-900">Legal</p>
          <p className="text-slate-600">Uso responsable de la plataforma</p>
          <p className="text-slate-500">© {new Date().getFullYear()} {APP_NAME}</p>
        </div>
      </div>
    </footer>
  );
}
