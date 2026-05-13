import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { AvatarUploadError, removeUserAvatar, uploadUserAvatar } from "@/lib/services/avatar-upload";
import { AVATAR_ALLOWED_MIME_TYPES, AVATAR_MAX_ORIGINAL_SIZE_BYTES } from "@/lib/uploads/config";

export const runtime = "nodejs";

function assertValidFile(file: File | null): asserts file is File {
  if (!file) {
    throw new AvatarUploadError("Debes seleccionar una imagen para continuar.", 400);
  }

  if (!AVATAR_ALLOWED_MIME_TYPES.has(file.type)) {
    throw new AvatarUploadError("Formato no permitido. Usa JPG, PNG o WEBP.", 400);
  }

  if (file.size > AVATAR_MAX_ORIGINAL_SIZE_BYTES) {
    throw new AvatarUploadError("La imagen es demasiado grande. Intenta subir una foto menor a 8 MB.", 400);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error || !auth.user) return auth.error;

    if (auth.user.role.code === "ADMIN") {
      return NextResponse.json({ error: "El rol admin no permite foto de perfil." }, { status: 403 });
    }

    const formData = await request.formData();
    const fileEntry = formData.get("avatar");
    const file = fileEntry instanceof File ? fileEntry : null;

    assertValidFile(file);

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadUserAvatar({
      userId: auth.user.id,
      role: auth.user.role.code,
      fileBuffer: buffer,
    });

    return NextResponse.json({
      message: "Foto actualizada correctamente",
      avatarUrl: uploaded.avatarUrl,
      bytes: uploaded.bytes,
      mimeType: uploaded.mimeType,
    });
  } catch (error) {
    if (error instanceof AvatarUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[avatar-upload] POST error", error);
    return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await requireAuth();
    if (auth.error || !auth.user) return auth.error;

    if (auth.user.role.code === "ADMIN") {
      return NextResponse.json({ error: "El rol admin no permite foto de perfil." }, { status: 403 });
    }

    await removeUserAvatar(auth.user.id, auth.user.role.code);

    return NextResponse.json({ message: "Foto eliminada correctamente", avatarUrl: null });
  } catch (error) {
    if (error instanceof AvatarUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[avatar-upload] DELETE error", error);
    return NextResponse.json({ error: "Error al eliminar imagen" }, { status: 500 });
  }
}
