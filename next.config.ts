import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Túnel do Cloudflare (~/.cloudflared/trevolt.sh): sem isso, o `next dev` bloqueia os scripts de
  // desenvolvimento quando o app é aberto por https://trevolt.eteg.me e as telas não ficam interativas.
  allowedDevOrigins: ["trevolt.eteg.me"],
  // Apresentação em modo dev: sem o botão "N" nem o selo de avisos do Next no canto da tela.
  // Erros de compilação ou de execução continuam aparecendo (o Next não deixa esconder esses).
  devIndicators: false,
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
