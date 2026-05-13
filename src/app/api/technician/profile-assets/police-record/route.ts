import path from "node:path";
import { promises as fs } from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import {
  getLocalUploadAbsolutePath,
  getTechnicianAssetsAbsoluteBasePath,
  getTechnicianAssetsPublicBasePath,
} from "@/lib/uploads/config";

export const runtime = "nodejs";

const POLICE_RECORD_FOLDER = "police-records/";

function resolveMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "application/octet-stream";
}

function getPoliceRecordAbsolutePathFromUrl(fileUrl: string) {
  const prefix = `${getTechnicianAssetsPublicBasePath()}/`;
  if (!fileUrl.startsWith(prefix)) {
    return null;
  }

  const relativePath = fileUrl.slice(prefix.length);
  if (!relativePath.startsWith(POLICE_RECORD_FOLDER) || relativePath.includes("..")) {
    return null;
  }

  const absolutePath = path.resolve(getTechnicianAssetsAbsoluteBasePath(), relativePath);
  const uploadRoot = getLocalUploadAbsolutePath();
  if (!absolutePath.startsWith(uploadRoot)) {
    return null;
  }

  return absolutePath;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  const technicianProfileId = request.nextUrl.searchParams.get("technicianProfileId");

  let profile:
    | {
        policeRecordUrl: string | null;
        userId: string;
      }
    | null = null;

  if (auth.user.role.code === "TECHNICIAN") {
    profile = await prisma.technicianProfile.findUnique({
      where: { userId: auth.user.id },
      select: { policeRecordUrl: true, userId: true },
    });
  } else if (auth.user.role.code === "ADMIN") {
    if (!technicianProfileId) {
      return NextResponse.json({ error: "technicianProfileId es requerido." }, { status: 400 });
    }

    profile = await prisma.technicianProfile.findUnique({
      where: { id: technicianProfileId },
      select: { policeRecordUrl: true, userId: true },
    });
  } else {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!profile?.policeRecordUrl) {
    return NextResponse.json({ error: "No hay récord policial cargado." }, { status: 404 });
  }

  const absolutePath = getPoliceRecordAbsolutePathFromUrl(profile.policeRecordUrl);
  if (!absolutePath) {
    return NextResponse.json({ error: "Archivo inválido o no disponible." }, { status: 404 });
  }

  const fileBuffer = await fs.readFile(absolutePath).catch(() => null);
  if (!fileBuffer) {
    return NextResponse.json({ error: "No se encontró el archivo solicitado." }, { status: 404 });
  }

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": resolveMimeType(absolutePath),
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${path.basename(absolutePath)}"`,
    },
  });
}
