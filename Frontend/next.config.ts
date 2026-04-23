import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  transpilePackages: ["@sovereign/backend", "@sovereign/database"],
};

export default nextConfig;
