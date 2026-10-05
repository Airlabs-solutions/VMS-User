import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN ?? "https://vms-backend-1rnk.onrender.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
