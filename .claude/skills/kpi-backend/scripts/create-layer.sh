#!/usr/bin/env bash
# Gera a trindade Service, Repository e Entity para um módulo KPI F3F.
# Uso (a partir da raiz do repo): bash .cursor/skills/kpi-backend/scripts/create-layer.sh <modulo> <Entidade>
# Ex.: bash .cursor/skills/kpi-backend/scripts/create-layer.sh educacional Matricula

set -e
MODULE="$1"
ENTITY="$2"
if [ -z "$MODULE" ] || [ -z "$ENTITY" ]; then
  echo "Uso: $0 <modulo> <Entidade>"
  echo "Ex.: $0 educacional Matricula"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
BASE="$ROOT/src/modules/$MODULE"
ENT_FILE="$BASE/entities/${ENTITY}.ts"
REPO_FILE="$BASE/repositories/${ENTITY}Repository.ts"
SVC_FILE="$BASE/services/${ENTITY}Service.ts"

mkdir -p "$BASE/entities" "$BASE/repositories" "$BASE/services" "$BASE/dtos"

for f in "$ENT_FILE" "$REPO_FILE" "$SVC_FILE"; do
  if [ -f "$f" ]; then
    echo "Arquivo já existe: $f"
    exit 1
  fi
done

# --- Entity ---
cat > "$ENT_FILE" << EOF
// Entidade de domínio: $ENTITY
// Ajustar campos conforme tabela e regras de negócio.

export interface $ENTITY {
  id: string;
  // @todo adicionar campos
}
EOF

# --- Repository ---
cat > "$REPO_FILE" << EOF
import type { SupabaseClient } from '@supabase/supabase-js';
import type { $ENTITY } from '../entities/${ENTITY}';

export class ${ENTITY}Repository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<$ENTITY | null> {
    const { data, error } = await this.client
      .from('${MODULE}_table') // @todo trocar pelo nome real da tabela
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as $ENTITY | null;
  }

  // @todo adicionar insert, update, etc.
}
EOF

# --- Service ---
cat > "$SVC_FILE" << EOF
import type { ${ENTITY}Repository } from '../repositories/${ENTITY}Repository';
import type { $ENTITY } from '../entities/${ENTITY}';

export class ${ENTITY}Service {
  constructor(private readonly repository: ${ENTITY}Repository) {}

  async buscarPorId(id: string): Promise<$ENTITY | null> {
    return this.repository.findById(id);
  }

  // @todo adicionar casos de uso (ex.: matricular, criar, etc.)
}
EOF

echo "Criados:"
echo "  - $ENT_FILE"
echo "  - $REPO_FILE"
echo "  - $SVC_FILE"
echo "DTOs: adicionar em $BASE/dtos/ com sufixo Dto (ex.: Criar${ENTITY}Dto)."
