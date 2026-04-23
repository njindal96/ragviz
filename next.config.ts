import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
  // Suppress warning for cross-origin requests from local/dev environments
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.29.229'],
  // Turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {
    resolveAlias: {
      // @xenova/transformers tries to import onnxruntime-node which is Node.js only.
      // In the browser, it automatically falls back to onnxruntime-web (WASM).
      // We stub onnxruntime-node to an empty module so the bundle doesn't fail.
      'onnxruntime-node': {
        browser: './src/lib/empty-stub.ts',
      },
    },
  },
};

export default nextConfig;
