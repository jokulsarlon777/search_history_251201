import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // Disable linting and type checking during build (optional)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
