#!/usr/bin/env bash
# Gera boilerplate de componente padronizado KPI F3F em src/shared/ui/.
# Uso (a partir da raiz do repo): bash .cursor/skills/kpi-componentes/scripts/create-component.sh <Nome>
# Ex.: bash .cursor/skills/kpi-componentes/scripts/create-component.sh InputData

set -e
NAME="$1"
if [ -z "$NAME" ]; then
  echo "Uso: $0 <NomeDoComponente>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
OUT_DIR="$ROOT/src/shared/ui"
FILE="$OUT_DIR/${NAME}.tsx"

mkdir -p "$OUT_DIR"
if [ -f "$FILE" ]; then
  echo "Arquivo já existe: $FILE"
  exit 1
fi

cat > "$FILE" << 'BOILERPLATE'
'use client';

import * as React from 'react';

export interface REPLACE_PROPS {
  className?: string;
  /** @todo adicionar props conforme reference.md */
}

export function REPLACE_NAME(props: REPLACE_PROPS) {
  return (
    <div className={props.className}>
      {/* @todo implementar conforme spec do reference.md */}
    </div>
  );
}
BOILERPLATE

# Substitui placeholders pelo nome do componente (portável: sem -i)
sed "s/REPLACE_NAME/$NAME/g;s/REPLACE_PROPS/${NAME}Props/g" "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

echo "Criado: $FILE"
