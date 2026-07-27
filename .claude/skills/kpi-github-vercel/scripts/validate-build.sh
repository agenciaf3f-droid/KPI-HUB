#!/usr/bin/env bash
# Valida build e testes antes de PR. Uso: a partir da raiz do repo.
# bash .cursor/skills/kpi-github-vercel/scripts/validate-build.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
cd "$ROOT"

echo "=== Validação pré-PR (build + test) ==="
BUILD_OK=0
TEST_OK=0

npm run build && { BUILD_OK=1; echo "[OK] Build passou."; } || echo "[FALHA] Build falhou."
npm run test && { TEST_OK=1; echo "[OK] Testes passaram."; } || echo "[FALHA] Testes falharam."

echo "---"
if [ "$BUILD_OK" -eq 1 ] && [ "$TEST_OK" -eq 1 ]; then
  echo "Resumo: Build e testes OK. Pronto para PR (use /create-pr para descrição)."
  exit 0
else
  echo "Resumo: Corrija as falhas acima antes de abrir o PR."
  exit 1
fi
