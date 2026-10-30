import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Seed docs and saved AI responses are read from disk by the API routes.
  outputFileTracingIncludes: {
    "/api/**": ["./data/**/*"],
  },
};

export default nextConfig;
