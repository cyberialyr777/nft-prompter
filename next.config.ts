import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ws se mantiene externo (solo server-side)
  serverExternalPackages: ["ws"],
};

export default nextConfig;
