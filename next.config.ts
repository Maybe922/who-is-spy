import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app runs through a custom Node server (server.ts), not `next start`,
  // so the standalone output is unused and only produces a startup warning.
  outputFileTracingRoot: process.cwd()
};

export default nextConfig;
