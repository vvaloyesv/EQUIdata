import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El HTML embebido de módulos se renderiza en iframes aislados (sandbox),
  // no requiere configuración especial aquí. Todas las imágenes (logo, avatares
  // de mood) son locales — no hay <Image> remota que necesite remotePatterns.
};

export default nextConfig;
