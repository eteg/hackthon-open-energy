import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_PERFIL, ehPerfil } from "@/lib/perfil";

/**
 * Regra do MVP: as telas só abrem depois que a pessoa escolhe um perfil na home.
 * Sem perfil (ou com um valor desconhecido no cookie), volta para a home.
 * É uma regra de navegação, não autenticação: as rotas /api continuam abertas para as telas usarem.
 */
export function proxy(request: NextRequest) {
  if (ehPerfil(request.cookies.get(COOKIE_PERFIL)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  // Toda tela, menos a home ("/"). Ficam de fora as rotas de API, os arquivos internos do Next
  // e qualquer caminho com extensão (favicon, svgs do public/).
  matcher: ["/((?!api|_next|__nextjs|.*\\..*).+)"],
};
