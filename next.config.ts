import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
  // Suppress warning for cross-origin requests from local/dev environments
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.29.229'],
};

export default nextConfig;
