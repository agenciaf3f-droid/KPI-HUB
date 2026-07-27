import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // O refresh de sessão (getUser = ida à API do Supabase) só precisa rodar em
  // NAVEGAÇÃO DE PÁGINA. Fora do matcher, e portanto sem esse custo por request:
  //  - /api/*           → valida bearer token por conta própria (api/_lib.js)
  //  - /gestor-session  → lê o cookie sozinho no handler
  //  - /dashboard.html  → estático de 258KB; a auth acontece dentro dele
  //  - assets estáticos (js/css/fontes/imagens)
  matcher: [
    "/((?!_next/static|_next/image|api/|gestor-session|dashboard\\.html|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
