import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 로컬 개발 전용 PGlite(wasm)는 번들·배포 산출물에서 뺀다
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingExcludes: { "*": ["node_modules/@electric-sql/pglite/**"] },
};

export default nextConfig;
