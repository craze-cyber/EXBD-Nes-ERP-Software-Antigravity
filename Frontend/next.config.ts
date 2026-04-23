import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@sovereign/backend", "@sovereign/database"],
  allowedDevOrigins: ["192.168.0.106", "localhost:3000"],
};

export default nextConfig;
