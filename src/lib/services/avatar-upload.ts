import { randomUUID } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { RoleCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { optimizeAvatarImage } from "@/lib/uploads/avatar-optimizer";
import {
  getAvatarPublicPathPrefix,
  getLocalAvatarDirectoryAbsolutePath,
  getLocalUploadAbsolutePath,
  getUploadProvider,
} from "@/lib/uploads/config";

export class AvatarUploadError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AvatarUploadError";
    this.status = status;
  }
}

type UploadAvatarInput = {
  userId: string;
  role: RoleCode;
  fileBuffer: Buffer;
};

type UploadAvatarResult = {
  avatarUrl: string;
  bytes: number;
  mimeType: string;
};

function buildAvatarFilename(userId: string) {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `${safeUserId}-${Date.now()}-${randomUUID()}.webp`;
}

function localAvatarUrlForFilename(filename: string) {
  return `${getAvatarPublicPathPrefix()}/${filename}`.replace(/\/{2,}/g, "/");
}

async function deleteLocalAvatarIfOwned(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return;

  const prefix = `${getAvatarPublicPathPrefix()}/`;
  if (!avatarUrl.startsWith(prefix)) return;

  const relativeFromPrefix = avatarUrl.slice(prefix.length);
  if (!relativeFromPrefix || relativeFromPrefix.includes("..")) return;

  const uploadRoot = getLocalUploadAbsolutePath();
  const absoluteCandidate = path.resolve(getLocalAvatarDirectoryAbsolutePath(), relativeFromPrefix);

  if (!absoluteCandidate.startsWith(uploadRoot)) {
    return;
  }

  await fs.unlink(absoluteCandidate).catch(() => undefined);
}

async function getCurrentAvatarUrl(userId: string, role: RoleCode) {
  if (role === "CLIENT") {
    const profile = await prisma.clientProfile.findUnique({
      where: { userId },
      select: { avatarUrl: true },
    });
    return profile?.avatarUrl ?? null;
  }

  if (role === "TECHNICIAN") {
    const profile = await prisma.technicianProfile.findUnique({
      where: { userId },
      select: { avatarUrl: true },
    });
    return profile?.avatarUrl ?? null;
  }

  return null;
}

async function setAvatarUrl(userId: string, role: RoleCode, avatarUrl: string | null) {
  if (role === "CLIENT") {
    await prisma.clientProfile.update({
      where: { userId },
      data: { avatarUrl },
    });
    return;
  }

  if (role === "TECHNICIAN") {
    await prisma.technicianProfile.update({
      where: { userId },
      data: { avatarUrl },
    });
    return;
  }

  throw new AvatarUploadError("El rol actual no permite foto de perfil.", 403);
}

async function uploadWithLocalProvider(input: UploadAvatarInput): Promise<UploadAvatarResult> {
  const optimized = await optimizeAvatarImage(input.fileBuffer).catch(() => {
    throw new AvatarUploadError("El archivo no es una imagen valida o esta danado.", 400);
  });
  const directory = getLocalAvatarDirectoryAbsolutePath();

  await fs.mkdir(directory, { recursive: true });

  const filename = buildAvatarFilename(input.userId);
  const outputPath = path.resolve(directory, filename);
  const avatarUrl = localAvatarUrlForFilename(filename);
  const previousAvatar = await getCurrentAvatarUrl(input.userId, input.role);

  try {
    await fs.writeFile(outputPath, optimized.buffer);
    await setAvatarUrl(input.userId, input.role, avatarUrl);
    await deleteLocalAvatarIfOwned(previousAvatar);

    return {
      avatarUrl,
      bytes: optimized.bytes,
      mimeType: optimized.mimeType,
    };
  } catch (error) {
    await fs.unlink(outputPath).catch(() => undefined);
    throw error;
  }
}

export async function uploadUserAvatar(input: UploadAvatarInput): Promise<UploadAvatarResult> {
  const provider = getUploadProvider();

  if (provider === "local") {
    return uploadWithLocalProvider(input);
  }

  if (provider === "cloudinary" || provider === "supabase" || provider === "s3") {
    throw new AvatarUploadError(
      `El proveedor ${provider} aun no esta habilitado en esta version. Usa UPLOAD_PROVIDER=local.`,
      503,
    );
  }

  throw new AvatarUploadError("Proveedor de carga no soportado.", 500);
}

export async function removeUserAvatar(userId: string, role: RoleCode) {
  const previousAvatar = await getCurrentAvatarUrl(userId, role);

  await setAvatarUrl(userId, role, null);
  await deleteLocalAvatarIfOwned(previousAvatar);
}
