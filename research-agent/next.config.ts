import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  typescript: {
    ignoreBuildErrors: false,
  },

  experimental: {
    // Enable system TLS certificates for Turbopack (사내망 환경 대응)
    // @ts-ignore - turbopack option not yet in NextConfig type
    turbopack: {
      useSystemTlsCerts: true,
    },
  },
};

export default nextConfig;
