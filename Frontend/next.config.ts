import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  transpilePackages: ["@sovereign/backend", "@sovereign/database"],
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;

