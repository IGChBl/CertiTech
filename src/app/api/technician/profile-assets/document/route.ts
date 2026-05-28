import path from "node:path";
import { promises as fs } from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import {
  getArrayFromJson,
  resolveTechnicianAssetAbsolutePathCandidates,
  type TechnicianAssetKind,
} from "@/lib/services/technician-profile-assets";

export const runtime = "nodejs";

const validKinds: TechnicianAssetKind[] = ["identityDocument", "workEvidence", "certification", "policeRecord"];

type TechnicianAssetProfile = {
  identityDocumentUrl: string | null;
  policeRecordUrl: string | null;
  workEvidenceJson: unknown;
  certificationsJson: unknown;
  userId: string;
};

function resolveMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "application/octet-stream";
}

function parseKind(value: string | null) {
  if (validKinds.includes(value as TechnicianAssetKind)) {
    return value as TechnicianAssetKind;
  }

  return null;
}

function parseIndex(value: string | null) {
  if (!value) return null;
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0) return null;
  return index;
}

function getAssetReference(profile: TechnicianAssetProfile, kind: TechnicianAssetKind, index: number | null) {
  if (kind === "identityDocument") return profile.identityDocumentUrl;
  if (kind === "policeRecord") return profile.policeRecordUrl;

  if (index === null) return null;

  const values = kind === "workEvidence" ? getArrayFromJson(profile.workEvidenceJson) : getArrayFromJson(profile.certificationsJson);
  return values[index] ?? null;
}

async function readFirstAvailableFile(paths: string[]) {
  for (const absolutePath of paths) {
    const fileBuffer = await fs.readFile(absolutePath).catch(() => null);
    if (fileBuffer) {
      return { absolutePath, fileBuffer };
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  const kind = parseKind(request.nextUrl.searchParams.get("kind"));
  if (!kind) {
    return NextResponse.json({ error: "Tipo de documento no válido." }, { status: 400 });
  }

  const technicianProfileId = request.nextUrl.searchParams.get("technicianProfileId");
  const index = parseIndex(request.nextUrl.searchParams.get("index"));

  let profile: TechnicianAssetProfile | null = null;

  if (auth.user.role.code === "TECHNICIAN") {
    profile = await prisma.technicianProfile.findUnique({
      where: { userId: auth.user.id },
      select: {
        identityDocumentUrl: true,
        policeRecordUrl: true,
        workEvidenceJson: true,
        certificationsJson: true,
        userId: true,
      },
    });
  } else if (auth.user.role.code === "ADMIN") {
    if (!technicianProfileId) {
      return NextResponse.json({ error: "technicianProfileId es requerido." }, { status: 400 });
    }

    profile = await prisma.technicianProfile.findUnique({
      where: { id: technicianProfileId },
      select: {
        identityDocumentUrl: true,
        policeRecordUrl: true,
        workEvidenceJson: true,
        certificationsJson: true,
        userId: true,
      },
    });
  } else {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Perfil técnico no encontrado." }, { status: 404 });
  }

  const fileReference = getAssetReference(profile, kind, index);
  if (!fileReference) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const candidates = resolveTechnicianAssetAbsolutePathCandidates(fileReference, kind);
  const resolved = await readFirstAvailableFile(candidates);

  if (!resolved) {
    return NextResponse.json({ error: "No se encontró el documento solicitado." }, { status: 404 });
  }

  return new NextResponse(resolved.fileBuffer, {
    headers: {
      "Content-Type": resolveMimeType(resolved.absolutePath),
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${path.basename(resolved.absolutePath)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
