import Image from "next/image";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null) {
  const clean = name?.trim() ?? "";
  if (!clean) return "CT";

  const words = clean.split(/\s+/).filter(Boolean);
  if (!words.length) return "CT";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function UserAvatar({
  name,
  src,
  size = 44,
  className,
  fallbackClassName,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
  fallbackClassName?: string;
}) {
  const initials = getInitials(name);
  const isBlobPreview = Boolean(src && (src.startsWith("blob:") || src.startsWith("data:")));
  const useNextImage = Boolean(src && src.startsWith("/") && !isBlobPreview);

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={name ? `Avatar de ${name}` : "Avatar de usuario"}
    >
      {src ? (
        useNextImage ? (
          <Image
            src={src}
            alt={name ? `Foto de ${name}` : "Foto de perfil"}
            fill
            sizes={`${size}px`}
            className="object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name ? `Foto de ${name}` : "Foto de perfil"} className="h-full w-full object-cover" />
        )
      ) : (
        <span
          className={cn(
            "inline-flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-semibold text-white",
            fallbackClassName,
          )}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
