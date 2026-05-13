import sharp from "sharp";
import { AVATAR_TARGET_SIZE } from "@/lib/uploads/config";

export type OptimizedAvatar = {
  buffer: Buffer;
  mimeType: "image/webp";
  extension: "webp";
  bytes: number;
  width: number;
  height: number;
};

async function buildOptimizedWebp(input: Buffer, quality: number) {
  return sharp(input)
    .rotate()
    .resize(AVATAR_TARGET_SIZE, AVATAR_TARGET_SIZE, {
      fit: "cover",
      position: "centre",
    })
    .webp({
      quality,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();
}

export async function optimizeAvatarImage(input: Buffer): Promise<OptimizedAvatar> {
  let output = await buildOptimizedWebp(input, 82);

  if (output.byteLength > 500 * 1024) {
    output = await buildOptimizedWebp(input, 72);
  }

  return {
    buffer: output,
    mimeType: "image/webp",
    extension: "webp",
    bytes: output.byteLength,
    width: AVATAR_TARGET_SIZE,
    height: AVATAR_TARGET_SIZE,
  };
}

