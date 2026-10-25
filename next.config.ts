import type { NextConfig } from "next";

const apiProxyTarget = (process.env.NEXT_PUBLIC_API_PROXY_TARGET ?? "http://localhost:8081").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    // In local development, keep browser requests same-origin. This lets the
    // Next server forward the session cookie and avoids a browser CORS
    // preflight entirely. Deployments with an explicit public API URL retain
    // direct API requests.
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
