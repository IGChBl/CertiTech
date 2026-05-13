"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 8 * 1024 * 1024;

type ApiData = {
  error?: string;
  message?: string;
  avatarUrl?: string | null;
};

async function readResponseData(response: Response): Promise<ApiData> {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw) as ApiData;
  } catch {
    return {};
  }
}

export function AvatarUploader({
  displayName,
  currentAvatarUrl,
  subtitle,
}: {
  displayName?: string | null;
  currentAvatarUrl?: string | null;
  subtitle?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<"idle" | "uploading" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function pickFile() {
    fileRef.current?.click();
  }

  function onSelectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setError(null);
    setSuccess(null);

    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setError("Formato no permitido. Usa JPG, PNG o WEBP.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      setError("La imagen es demasiado grande. Intenta subir una foto menor a 8 MB.");
      return;
    }

    setSelectedFile(file);
  }

  async function uploadAvatar() {
    if (!selectedFile) {
      setError("Selecciona una imagen antes de guardar.");
      return;
    }

    setLoading("uploading");
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("avatar", selectedFile);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await readResponseData(response);

      if (!response.ok) {
        setError(data.error ?? "Error al subir imagen");
        return;
      }

      setAvatarUrl(data.avatarUrl ?? null);
      setSelectedFile(null);
      setSuccess(data.message ?? "Foto actualizada correctamente");
      router.refresh();
    } catch {
      setError("Error al subir imagen");
    } finally {
      setLoading("idle");
    }
  }

  async function deleteAvatar() {
    setLoading("deleting");
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      const data = await readResponseData(response);

      if (!response.ok) {
        setError(data.error ?? "No se pudo eliminar la foto");
        return;
      }

      setAvatarUrl(null);
      setSelectedFile(null);
      setSuccess(data.message ?? "Foto eliminada correctamente");
      router.refresh();
    } catch {
      setError("No se pudo eliminar la foto");
    } finally {
      setLoading("idle");
    }
  }

  const busy = loading !== "idle";
  const hasStoredAvatar = Boolean(avatarUrl);
  const showingPreview = Boolean(previewUrl);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={displayName}
            src={previewUrl ?? avatarUrl}
            size={84}
            className="ring-2 ring-white shadow-sm"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Foto de perfil</p>
            <p className="text-xs text-slate-500">
              {subtitle ?? "Sube una foto clara para generar confianza en la plataforma."}
            </p>
            <p className="text-xs text-slate-400">Formatos: JPG, PNG, WEBP. Maximo: 8 MB.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onSelectFile}
          />

          <Button type="button" variant="secondary" onClick={pickFile} disabled={busy}>
            <Upload className="mr-1.5 h-4 w-4" />
            {hasStoredAvatar ? "Cambiar foto" : "Subir foto"}
          </Button>

          <Button type="button" onClick={uploadAvatar} disabled={busy || !selectedFile}>
            {loading === "uploading" ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar foto"
            )}
          </Button>

          {hasStoredAvatar ? (
            <Button type="button" variant="ghost" onClick={deleteAvatar} disabled={busy}>
              {loading === "deleting" ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {showingPreview ? (
        <p className="mt-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700">
          Vista previa lista. Presiona &quot;Guardar foto&quot; para aplicar el cambio.
        </p>
      ) : null}

      {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      {success ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p> : null}
    </div>
  );
}
