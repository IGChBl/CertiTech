import { randomUUID } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import {
  getTechnicianAssetsAbsoluteBasePath,
  getTechnicianAssetsLegacyPublicAbsoluteBasePath,
  getTechnicianAssetsPublicBasePath,
  getUploadProvider,
} from "@/lib/uploads/config";

export type TechnicianAssetKind = "identityDocument" | "workEvidence" | "certification" | "policeRecord";

const MAX_TECHNICIAN_ASSET_SIZE_BYTES = 12 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_MIME_TYPES = new Set(["application/pdf", ...IMAGE_MIME_TYPES]);

const allowedMimeByKind: Record<TechnicianAssetKind, Set<string>> = {
  identityDocument: DOCUMENT_MIME_TYPES,
  workEvidence: IMAGE_MIME_TYPES,
  certification: DOCUMENT_MIME_TYPES,
  policeRecord: DOCUMENT_MIME_TYPES,
};

const assetFolderByKind: Record<TechnicianAssetKind, string> = {
  identityDocument: "identity-documents",
  workEvidence: "work-evidences",
  certification: "certifications",
  policeRecord: "police-records",
};

type UploadInput = {
  userId: string;
  kind: TechnicianAssetKind;
  fileBuffer: Buffer;
  mimeType: string;
  size: number;
};

export class TechnicianAssetError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "TechnicianAssetError";
    this.status = status;
  }
}

export function getArrayFromJson(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

const PRIVATE_TECHNICIAN_ASSET_PREFIX = "private://technicians/";

function privateReferenceForKind(kind: TechnicianAssetKind, fileName: string) {
  return `${PRIVATE_TECHNICIAN_ASSET_PREFIX}${assetFolderByKind[kind]}/${fileName}`;
}

function isPathInside(basePath: string, candidatePath: string) {
  const relativePath = path.relative(basePath, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function buildAssetFileName(userId: string, extension: string) {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `${safeUserId}-${Date.now()}-${randomUUID()}.${extension}`;
}

async function optimizeImage(fileBuffer: Buffer) {
  const optimized = await sharp(fileBuffer)
    .rotate()
    .resize(1600, 1600, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  return {
    buffer: optimized,
    mimeType: "image/webp",
    extension: "webp",
  };
}

export function resolveTechnicianAssetAbsolutePathCandidates(fileReference: string, kind: TechnicianAssetKind) {
  const expectedFolder = `${assetFolderByKind[kind]}/`;

  if (fileReference.startsWith(PRIVATE_TECHNICIAN_ASSET_PREFIX)) {
    const relativePath = fileReference.slice(PRIVATE_TECHNICIAN_ASSET_PREFIX.length);
    if (!relativePath.startsWith(expectedFolder) || relativePath.includes("..")) return [];

    const privateBasePath = getTechnicianAssetsAbsoluteBasePath();
    const absolutePath = path.resolve(privateBasePath, relativePath);
    if (!isPathInside(privateBasePath, absolutePath)) return [];

    return [absolutePath];
  }

  const legacyPublicPrefix = `${getTechnicianAssetsPublicBasePath()}/`;
  if (!fileReference.startsWith(legacyPublicPrefix)) return [];

  const relativePath = fileReference.slice(legacyPublicPrefix.length);
  if (!relativePath.startsWith(expectedFolder) || relativePath.includes("..")) return [];

  const candidates: string[] = [];
  const privateBasePath = getTechnicianAssetsAbsoluteBasePath();
  const privateCandidate = path.resolve(privateBasePath, relativePath);
  if (isPathInside(privateBasePath, privateCandidate)) {
    candidates.push(privateCandidate);
  }

  const legacyPublicBasePath = getTechnicianAssetsLegacyPublicAbsoluteBasePath();
  const legacyPublicCandidate = path.resolve(legacyPublicBasePath, relativePath);
  if (isPathInside(legacyPublicBasePath, legacyPublicCandidate)) {
    candidates.push(legacyPublicCandidate);
  }

  return candidates;
}

export function resolveTechnicianAssetAbsolutePath(fileReference: string, kind: TechnicianAssetKind) {
  return resolveTechnicianAssetAbsolutePathCandidates(fileReference, kind)[0] ?? null;
}

async function deleteLocalFileIfOwned(fileReference: string | null | undefined, kind?: TechnicianAssetKind) {
  if (!fileReference) return;

  const kindsToCheck = kind ? [kind] : (Object.keys(assetFolderByKind) as TechnicianAssetKind[]);

  for (const currentKind of kindsToCheck) {
    const absolutePath = resolveTechnicianAssetAbsolutePath(fileReference, currentKind);
    if (absolutePath) {
      await fs.unlink(absolutePath).catch(() => undefined);
      return;
    }
  }
}

function assertAllowedFileContent(mimeType: string, fileBuffer: Buffer) {
  if (mimeType === "application/pdf" && !fileBuffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new TechnicianAssetError("El PDF no es válido o está dañado.", 400);
  }
}

async function saveLocalAsset(input: UploadInput) {
  if (input.size > MAX_TECHNICIAN_ASSET_SIZE_BYTES) {
    throw new TechnicianAssetError("El archivo supera el máximo permitido de 12 MB.", 400);
  }

  if (!allowedMimeByKind[input.kind].has(input.mimeType)) {
    throw new TechnicianAssetError("Formato de archivo no permitido para este campo.", 400);
  }

  assertAllowedFileContent(input.mimeType, input.fileBuffer);

  let payloadBuffer = input.fileBuffer;
  let payloadMimeType = input.mimeType;
  let extension = extensionForMimeType(input.mimeType);

  if (IMAGE_MIME_TYPES.has(input.mimeType)) {
    const optimized = await optimizeImage(input.fileBuffer).catch(() => {
      throw new TechnicianAssetError("La imagen no es válida o está dañada.", 400);
    });
    payloadBuffer = optimized.buffer;
    payloadMimeType = optimized.mimeType;
    extension = optimized.extension;
  }

  const baseFolder = path.resolve(getTechnicianAssetsAbsoluteBasePath(), assetFolderByKind[input.kind]);
  await fs.mkdir(baseFolder, { recursive: true });

  const fileName = buildAssetFileName(input.userId, extension);
  const absolutePath = path.resolve(baseFolder, fileName);
  const publicUrl = privateReferenceForKind(input.kind, fileName);

  await fs.writeFile(absolutePath, payloadBuffer);

  return {
    publicUrl,
    mimeType: payloadMimeType,
    bytes: payloadBuffer.byteLength,
  };
}

export async function uploadTechnicianAsset(input: UploadInput) {
  const provider = getUploadProvider();
  if (provider !== "local") {
    throw new TechnicianAssetError(
      `El proveedor ${provider} aún no está habilitado para assets técnicos. Usa UPLOAD_PROVIDER=local.`,
      503,
    );
  }

  const uploaded = await saveLocalAsset(input);

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: input.userId },
    select: {
      id: true,
      identityDocumentUrl: true,
      policeRecordUrl: true,
      workEvidenceJson: true,
      certificationsJson: true,
    },
  });

  if (!profile) {
    await deleteLocalFileIfOwned(uploaded.publicUrl);
    throw new TechnicianAssetError("No se encontró el perfil técnico para guardar el archivo.", 404);
  }

  if (input.kind === "identityDocument") {
    await prisma.technicianProfile.update({
      where: { userId: input.userId },
      data: { identityDocumentUrl: uploaded.publicUrl },
    });
    await deleteLocalFileIfOwned(profile.identityDocumentUrl, "identityDocument");
    return { ...uploaded, values: [uploaded.publicUrl] };
  }

  if (input.kind === "policeRecord") {
    await prisma.technicianProfile.update({
      where: { userId: input.userId },
      data: { policeRecordUrl: uploaded.publicUrl },
    });
    await deleteLocalFileIfOwned(profile.policeRecordUrl, "policeRecord");
    return { ...uploaded, values: [uploaded.publicUrl] };
  }

  if (input.kind === "workEvidence") {
    const current = getArrayFromJson(profile.workEvidenceJson);
    const next = [...current, uploaded.publicUrl];
    await prisma.technicianProfile.update({
      where: { userId: input.userId },
      data: { workEvidenceJson: next },
    });
    return { ...uploaded, values: next };
  }

  const current = getArrayFromJson(profile.certificationsJson);
  const next = [...current, uploaded.publicUrl];
  await prisma.technicianProfile.update({
    where: { userId: input.userId },
    data: { certificationsJson: next },
  });
  return { ...uploaded, values: next };
}

export async function removeTechnicianAsset(userId: string, kind: TechnicianAssetKind, fileUrl?: string | null) {
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId },
    select: {
      identityDocumentUrl: true,
      policeRecordUrl: true,
      workEvidenceJson: true,
      certificationsJson: true,
    },
  });

  if (!profile) {
    throw new TechnicianAssetError("No se encontró el perfil técnico.", 404);
  }

  if (kind === "identityDocument") {
    await prisma.technicianProfile.update({
      where: { userId },
      data: { identityDocumentUrl: null },
    });
    await deleteLocalFileIfOwned(profile.identityDocumentUrl, "identityDocument");
    return { values: [] as string[] };
  }

  if (kind === "policeRecord") {
    await prisma.technicianProfile.update({
      where: { userId },
      data: { policeRecordUrl: null },
    });
    await deleteLocalFileIfOwned(profile.policeRecordUrl, "policeRecord");
    return { values: [] as string[] };
  }

  if (!fileUrl) {
    throw new TechnicianAssetError("Debes indicar el archivo a eliminar.", 400);
  }

  if (kind === "workEvidence") {
    const current = getArrayFromJson(profile.workEvidenceJson);
    const next = current.filter((item) => item !== fileUrl);
    if (next.length === current.length) {
      throw new TechnicianAssetError("Archivo no encontrado en tu perfil.", 404);
    }

    await prisma.technicianProfile.update({
      where: { userId },
      data: { workEvidenceJson: next },
    });
    await deleteLocalFileIfOwned(fileUrl, "workEvidence");
    return { values: next };
  }

  const current = getArrayFromJson(profile.certificationsJson);
  const next = current.filter((item) => item !== fileUrl);
  if (next.length === current.length) {
    throw new TechnicianAssetError("Archivo no encontrado en tu perfil.", 404);
  }

  await prisma.technicianProfile.update({
    where: { userId },
    data: { certificationsJson: next },
  });
  await deleteLocalFileIfOwned(fileUrl, "certification");
  return { values: next };
}

