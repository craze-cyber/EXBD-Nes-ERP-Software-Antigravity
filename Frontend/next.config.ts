import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  transpilePackages: ["@sovereign/backend", "@sovereign/database"],
  turbopack: {},
  
  // NOTE: We are using the `--webpack` flag in package.json to bypass Turbopack.
  // Having `turbopack: { ... }` in Next.js 16 ENABLES Turbopack, which spawns
  // worker threads that are blocked by Hostinger's shared hosting OS limits (EAGAIN).
  // Webpack builds single-threaded and works fine in this environment.
  webpack(config) {
    // Replicate the monorepo root resolution so workspace packages (@sovereign/*) 
    // are found correctly when using webpack.
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
};

export default nextConfig;
