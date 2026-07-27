#!/usr/bin/env bash
# Anexa uma nova entrada ao troubleshooting-log.md com todos os campos.
# Uso (a partir da raiz do repo): bash .claude/skills/kpi-debugger-erros/scripts/log-error.sh "Descrição" "Causa raiz" "Solução" ["Arquivo(s)/Módulo"] ["Lição aprendida"]
# Ex.: bash .claude/skills/kpi-debugger-erros/scripts/log-error.sh "membro A via matrículas de B" "RLS sem filtro member_id" "Migration RLS USING (member_id = ...)"

set -e
DESC="$1"
CAUSA="$2"
SOLUCAO="$3"
ARQUIVO="${4:-}"
LICAO="${5:-}"

if [ -z "$DESC" ] || [ -z "$CAUSA" ] || [ -z "$SOLUCAO" ]; then
  echo "Uso: $0 \"Descrição\" \"Causa raiz\" \"Solução\" [\"Arquivo(s)/Módulo\"] [\"Lição aprendida\"]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
LOG="$ROOT/.context/docs/troubleshooting-log.md"
DATE=$(date +%Y-%m-%d)
# Título: primeiras palavras da descrição (até ~50 chars)
TITULO=$(echo "$DESC" | cut -c1-50)
[ ${#DESC} -gt 50 ] && TITULO="${TITULO}..."

ENTRY="
### $DATE – $TITULO
- **Descrição:** $DESC
- **Arquivo(s) / Módulo:** ${ARQUIVO:-*(preencher se necessário)*}
- **Causa raiz:** $CAUSA
- **Solução:** $SOLUCAO
- **Lição aprendida:** ${LICAO:-*(preencher se necessário)*}
"

# Inserir antes da linha "## Exemplo de formato" (deixar o --- que a precede)
MARKER="## Exemplo de formato"
LINENUM=$(grep -n "^${MARKER}" "$LOG" | head -1 | cut -d: -f1)
if [ -z "$LINENUM" ]; then
  echo "Marcador '$MARKER' não encontrado em $LOG"
  exit 1
fi
# Inserir após a linha em branco sob "## Entradas"; manter o --- antes de ## Exemplo
HEAD=$((LINENUM - 3))
TAIL=$((LINENUM - 2))
{
  head -n "$HEAD" "$LOG"
  echo "$ENTRY"
  echo "---"
  tail -n +"$TAIL" "$LOG"
} > "$LOG.tmp"
mv "$LOG.tmp" "$LOG"

echo "Entrada adicionada a .context/docs/troubleshooting-log.md"
echo "Revise os campos Arquivo(s)/Módulo e Lição aprendida se estiverem como *(preencher se necessário)*."
