#!/usr/bin/env bash
# Identifica código não usado (exports, arquivos órfãos, dependências) via knip.
# Uso (a partir da raiz do repo):
#   bash .claude/skills/kpi-limpeza-codigo/scripts/find-dead-code.sh           # projeto inteiro
#   bash .claude/skills/kpi-limpeza-codigo/scripts/find-dead-code.sh src/lib/  # um módulo

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
cd "$ROOT"

if [ -n "$1" ]; then
  echo "=== Knip: analisando diretório $1 ==="
  npx knip --directory "$1"
else
  echo "=== Knip: analisando projeto (src) ==="
  npx knip
fi

echo "---"
echo "Revise a saída acima. Exports/arquivos listados como não usados são candidatos à remoção; confirme exceções (dynamic import, contrato externo) antes de apagar."
