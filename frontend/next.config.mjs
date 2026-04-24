import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  sassOptions: {
    includePaths: [path.join(__dirname, "src")],
  },

  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@styles": path.join(__dirname, "src/styles"),
      "@": path.join(__dirname, "src"),
    };
    return config;
  },

  // Proxy /api/* to the external Node.js backend during dev & SSR so browser
  // and server components can hit `/api/...` without CORS issues.
  async rewrites() {
    const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:3002";
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },

  turbopack: {},

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
