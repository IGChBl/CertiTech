import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { PaymentForm } from "@/components/forms/payment-form";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Lock } from "lucide-react";

export default async function PagoPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const user = await requirePageRole("CLIENT");

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      category: true,
      technician: {
        select: {
          technicianProfile: {
            select: { displayName: true, businessName: true, avatarUrl: true },
          },
        },
      },
      payment: true,
    },
  });

  if (!serviceRequest || serviceRequest.clientId !== user.id) {
    notFound();
  }

  if (serviceRequest.status !== "AWAITING_PAYMENT") {
    redirect("/dashboard/cliente/solicitudes");
  }

  const techName = serviceRequest.technician?.technicianProfile?.displayName ?? "Técnico asignado";
  const amount = serviceRequest.agreedPrice ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 mb-3">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Confirmar y pagar</h1>
          <p className="text-sm text-slate-500">
            Tu pago quedará retenido hasta que confirmes la recepción del servicio.
          </p>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Resumen del servicio</h2>
          <div className="space-y-2 divide-y divide-slate-100">
            <div className="flex justify-between text-sm py-2">
              <span className="text-slate-600">Servicio</span>
              <span className="font-medium text-slate-900">{serviceRequest.title}</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-slate-600">Categoría</span>
              <span className="font-medium text-slate-900">{serviceRequest.category.name}</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-slate-600">Técnico</span>
              <span className="font-medium text-slate-900">{techName}</span>
            </div>
            {serviceRequest.desiredDate && (
              <div className="flex justify-between text-sm py-2">
                <span className="text-slate-600">Fecha deseada</span>
                <span className="font-medium text-slate-900">
                  {new Date(serviceRequest.desiredDate).toLocaleString("es-NI")}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold py-2">
              <span className="text-slate-900">Total a pagar</span>
              <span className="text-emerald-700">C$ {amount.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <PaymentForm serviceRequestId={requestId} amount={amount} />
        </Card>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          <span>Pago simulado — no se procesará dinero real</span>
        </div>
      </div>
    </div>
  );
}
