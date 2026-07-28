import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: "dist",
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
