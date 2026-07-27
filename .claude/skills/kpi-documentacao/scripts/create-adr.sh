#!/usr/bin/env bash
# Gera o boilerplate de um ADR (Architecture Decision Record) em .context/docs/adr/.
# Uso (a partir da raiz do repo): bash .cursor/skills/kpi-documentacao/scripts/create-adr.sh "Título do ADR"
# Ex.: bash .cursor/skills/kpi-documentacao/scripts/create-adr.sh "Uso do TanStack Query"

set -e
TITLE="$1"
if [ -z "$TITLE" ]; then
  echo "Uso: $0 \"Título do ADR\""
  echo "Ex.: $0 \"Uso do TanStack Query\""
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
ADR_DIR="$ROOT/.context/docs/adr"
mkdir -p "$ADR_DIR"

# Slug: minúsculas, espaços -> underscore, remove caracteres que não sejam letras/números/underscore
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | sed 's/[^a-z0-9_]//g' | sed 's/__*/_/g' | sed 's/^_//;s/_$//')
[ -z "$SLUG" ] && SLUG="adr"

# Próximo número (001, 002, ...)
MAX=0
for f in "$ADR_DIR"/[0-9][0-9][0-9]_*.md 2>/dev/null; do
  [ -e "$f" ] || continue
  n=$(basename "$f" | sed 's/^\([0-9]*\)_.*/\1/')
  [ -n "$n" ] && [ "$n" -gt "$MAX" ] 2>/dev/null && MAX=$n
done
NEXT=$(printf "%03d" $((MAX + 1)))

FILENAME="${NEXT}_${SLUG}.md"
FILE="$ADR_DIR/$FILENAME"

if [ -f "$FILE" ]; then
  echo "Arquivo já existe: $FILE"
  exit 1
fi

cat > "$FILE" << EOF
# $TITLE

**Data:** $(date +%Y-%m-%d)

## Contexto

(O que motivou esta decisão? Qual problema ou necessidade?)

## Decisão

(O que foi decidido? Descrever a opção escolhida de forma clara.)

## Consequências

- **Prós:** (benefícios esperados)
- **Contras / trade-offs:** (custos, riscos ou limitações)
- **Impacto:** (quem ou o quê é afetado: módulos, time, deploy, etc.)
EOF

echo "Criado: $FILE"
echo ""
echo "Próximo passo: adicione este ADR ao índice em .context/docs/README.md (Core Guides ou seção de ADRs) com link e descrição breve."
