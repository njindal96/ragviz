/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['pdf-parse'],
    // Suppress warning for cross-origin requests from 127.0.0.1
    // In Next.js 16+, allowedDevOrigins is a top-level configuration option.
    // Use hostnames (without ports)
    allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.29.229'],
};

export default nextConfig;
