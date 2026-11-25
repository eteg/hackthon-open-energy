import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Arquivos lidos em runtime pelas rotas (regras versionadas, base de conhecimento, prompt)
  outputFileTracingIncludes: {
    "/api/**": ["./regras/**", "./conhecimento/**", "./prompts/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
