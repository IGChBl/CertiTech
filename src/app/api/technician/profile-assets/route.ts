import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import {
  TechnicianAssetError,
  type TechnicianAssetKind,
  removeTechnicianAsset,
  uploadTechnicianAsset,
} from "@/lib/services/technician-profile-assets";

export const runtime = "nodejs";

const validKinds: TechnicianAssetKind[] = ["identityDocument", "workEvidence", "certification", "policeRecord"];

function parseKind(value: FormDataEntryValue | null): TechnicianAssetKind {
  const kind = typeof value === "string" ? value : "";
  if (validKinds.includes(kind as TechnicianAssetKind)) {
    return kind as TechnicianAssetKind;
  }
  throw new TechnicianAssetError("Tipo de archivo no válido.", 400);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("TECHNICIAN");
    if (auth.error || !auth.user) return auth.error;

    const formData = await request.formData();
    const kind = parseKind(formData.get("kind"));
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!file) {
      throw new TechnicianAssetError("Selecciona un archivo para continuar.", 400);
    }

    const result = await uploadTechnicianAsset({
      userId: auth.user.id,
      kind,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      size: file.size,
    });
    const responseUrl = kind === "policeRecord" ? "/api/technician/profile-assets/police-record" : result.publicUrl;

    return NextResponse.json({
      message: "Archivo cargado correctamente.",
      kind,
      url: responseUrl,
      values: result.values,
      bytes: result.bytes,
      mimeType: result.mimeType,
    });
  } catch (error) {
    if (error instanceof TechnicianAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[technician-profile-assets] POST error", error);
    return NextResponse.json({ error: "No se pudo cargar el archivo." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole("TECHNICIAN");
    if (auth.error || !auth.user) return auth.error;

    const body = await request.json().catch(() => null);
    const kind = parseKind(typeof body?.kind === "string" ? body.kind : null);
    const fileUrl = typeof body?.fileUrl === "string" ? body.fileUrl : null;
    const removed = await removeTechnicianAsset(auth.user.id, kind, fileUrl);

    return NextResponse.json({
      message: "Archivo eliminado correctamente.",
      kind,
      values: removed.values,
    });
  } catch (error) {
    if (error instanceof TechnicianAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[technician-profile-assets] DELETE error", error);
    return NextResponse.json({ error: "No se pudo eliminar el archivo." }, { status: 500 });
  }
}
