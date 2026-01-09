import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/:path*", // Proxy to Backend
      },
      {
        source: "/ws/:path*",
        destination: "http://localhost:3000/ws/:path*", // Proxy WS
      },
    ];
  },
};

export default nextConfig;
