import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite que el dev server acepte peticiones desde túneles públicos usados
  // para la demo multi-dispositivo (otra red/ubicación). Solo afecta a desarrollo.
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.loca.lt",
  ],
};

export default nextConfig;
