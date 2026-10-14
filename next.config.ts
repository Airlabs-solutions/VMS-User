import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN
  ?? (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "https://vms-backend-1rnk.onrender.com");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
