import path from "node:path";

export type UploadProvider = "local" | "cloudinary" | "supabase" | "s3";

export const AVATAR_MAX_ORIGINAL_SIZE_BYTES = 8 * 1024 * 1024;
export const AVATAR_TARGET_SIZE = 400;
export const AVATAR_SUBDIRECTORY = "avatars";
export const AVATAR_ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "");
}

export function getUploadProvider(): UploadProvider {
  const provider = (process.env.UPLOAD_PROVIDER ?? "local").trim().toLowerCase();

  if (provider === "local" || provider === "cloudinary" || provider === "supabase" || provider === "s3") {
    return provider;
  }

  return "local";
}

export function getLocalUploadRelativePath() {
  return normalizeSlashes((process.env.UPLOAD_LOCAL_PATH ?? "public/uploads").trim() || "public/uploads");
}

export function getLocalUploadAbsolutePath() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), getLocalUploadRelativePath());
}

export function getLocalUploadPublicBasePath() {
  const relative = getLocalUploadRelativePath();

  if (relative === "public") {
    return "";
  }

  if (!relative.startsWith("public/")) {
    throw new Error("UPLOAD_LOCAL_PATH debe iniciar con 'public/' para servir archivos estaticos.");
  }

  return `/${relative.replace(/^public\//, "")}`;
}

export function getLocalAvatarDirectoryAbsolutePath() {
  return path.resolve(getLocalUploadAbsolutePath(), AVATAR_SUBDIRECTORY);
}

export function getAvatarPublicPathPrefix() {
  const base = getLocalUploadPublicBasePath();
  return `${base}/${AVATAR_SUBDIRECTORY}`.replace(/\/{2,}/g, "/");
}
