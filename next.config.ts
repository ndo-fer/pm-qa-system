import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["127.0.0.1", "127.0.0.1:3000", "localhost:3000"],
  async rewrites() {
    return [
      {
        source: "/docs",
        destination: "https://pm-qa-docs.vercel.app/docs",
      },
      {
        source: "/docs/:path*",
        destination: "https://pm-qa-docs.vercel.app/docs/:path*",
      },
    ];
  },
};

export default nextConfig;
