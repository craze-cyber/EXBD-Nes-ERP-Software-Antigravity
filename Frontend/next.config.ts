import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  transpilePackages: ["@sovereign/backend", "@sovereign/database"],
<<<<<<< HEAD
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
=======
  // NOTE: Do NOT add a `turbopack` key here.
  // Having `turbopack: { ... }` in Next.js 16 ENABLES Turbopack, which spawns
  // worker threads that are blocked by Hostinger's shared hosting OS limits (EAGAIN).
  // Webpack (the default when turbopack is absent) builds single-threaded and works fine.
  webpack(config) {
    // Replicate the monorepo root resolution that turbopack.root provided,
    // so workspace packages (@sovereign/*) are found correctly.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@sovereign/database": path.resolve(__dirname, "../Database/src/index.ts"),
      "@sovereign/backend":  path.resolve(__dirname, "../Backend/src"),
    };
    return config;
  },
  experimental: {
    workerThreads: false,
    cpus: 1
  }
>>>>>>> ccc5bb0659e072d3973c1cb90cb6d85e1644e784
};

export default nextConfig;

