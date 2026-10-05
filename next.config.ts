import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://vms-backend-1rnk.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;
