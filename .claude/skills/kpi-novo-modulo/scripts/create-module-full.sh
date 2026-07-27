#!/usr/bin/env bash
# Scaffold completo de um novo módulo KPI F3F: pastas em src/modules/<modulo> + página em src/app/<modulo>/page.tsx.
# Uso (a partir da raiz do repo): bash .cursor/skills/kpi-novo-modulo/scripts/create-module-full.sh <modulo>
# Ex.: bash .cursor/skills/kpi-novo-modulo/scripts/create-module-full.sh educacional

set -e
MODULE="$1"
if [ -z "$MODULE" ]; then
  echo "Uso: $0 <modulo>"
  echo "Ex.: $0 educacional"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
MOD_BASE="$ROOT/src/modules/$MODULE"
APP_DIR="$ROOT/src/app/$MODULE"
APP_PAGE="$APP_DIR/page.tsx"

if [ -d "$MOD_BASE" ]; then
  echo "Módulo já existe: $MOD_BASE"
  exit 1
fi

mkdir -p "$MOD_BASE/services" "$MOD_BASE/repositories" "$MOD_BASE/entities" "$MOD_BASE/components" "$MOD_BASE/dtos"
mkdir -p "$APP_DIR"

# Página inicial do módulo (padrão: header com "← Início" e título, como configuracoes)
# Título: id com hífens trocados por espaço (ex.: guia-do-aluno -> guia do aluno)
NOME_TITULO=$(echo "$MODULE" | sed 's/-/ /g')
cat > "$APP_PAGE" << PAGEEOF
// src/app/$MODULE/page.tsx
// Página de entrada do módulo $MODULE. Ajustar layout e conteúdo conforme o módulo.

import Link from "next/link"

export default function ModulePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              ← Início
            </Link>
            <h1 className="text-xl font-bold text-gray-900">$NOME_TITULO</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-gray-600">Conteúdo do módulo em desenvolvimento.</p>
      </div>
    </main>
  )
}
PAGEEOF

echo "Scaffold criado:"
echo "  - $MOD_BASE/{services,repositories,entities,components,dtos}"
echo "  - $APP_PAGE"
echo ""
echo "Próximos passos:"
echo "  1. Adicionar card no dashboard: modulos-por-role.ts (ORDEM_APROVADA, TODOS_MODULOS, MODULOS_POR_ROLE) e ModuloCard.tsx se ícone novo."
echo "  2. Se existir submodulos-por-modulo.ts: adicionar entrada do módulo com sub-itens (ex.: Início)."
echo "  3. Atualizar a tabela 'Módulos criados' no reference.md desta skill."
echo "  4. Seguir o checklist no reference (Supabase, Auth, Documentação, etc.)."
