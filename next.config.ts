import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
