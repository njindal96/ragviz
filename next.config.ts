import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
  // Suppress warning for cross-origin requests from local/dev environments
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.29.229'],
  // Webpack config: aliases Node.js-only packages to empty stubs in the browser bundle.
  // This applies when running `next build --webpack` or `next dev --webpack`.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'sharp$': false,
        'onnxruntime-node$': false,
      };
    }
    return config;
  },
  // Turbopack config: same aliasing for the Turbopack dev server (if ever used).
  turbopack: {
    resolveAlias: {
      'onnxruntime-node': {
        browser: './src/lib/empty-stub.ts',
      },
    },
  },
};

export default nextConfig;
