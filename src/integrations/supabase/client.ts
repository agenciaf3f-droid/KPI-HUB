// Client do painel do Editor — mesmo caminho de import do Dash-Editores
// original ("@/integrations/supabase/client"), para os componentes portados
// funcionarem sem alteração.
//
// Diferença deliberada em relação ao original: usa `createBrowserClient` do
// @supabase/ssr (cookies) em vez de supabase-js com localStorage. Como o
// Dash-Editores autentica no MESMO projeto Supabase do hub, isso faz a sessão
// do hub valer aqui — o editor deixa de ter tela de login própria.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      // Tabelas do editor vivem no schema isolado `controle_edicao` (projeto
      // compartilhado). O cast satisfaz o generic de schema default; as colunas
      // batem com os tipos public. (Comentário e técnica do original.)
      schema: "controle_edicao" as "public",
    },
    // O default é singleton POR URL: sem isto, este client e o do hub
    // (@/lib/supabase/client) disputam a mesma instância e um herda o schema
    // do outro — foi o que deixou o combobox de clientes vazio (a query ia
    // para public.clients, que não existe).
    isSingleton: false,
  },
);
