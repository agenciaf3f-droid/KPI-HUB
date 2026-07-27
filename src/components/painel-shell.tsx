import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Casca comum dos painéis (Creator, Editor, Gestor).
 *
 * Herda os tokens do Creator sem redefinir nada: `bg-card`, `border-border`,
 * `rounded-[1.5rem]` e `text-muted-foreground` são os mesmos que
 * `active-timers-panel` e `production-workspace` já usam. Assim os três painéis
 * lêem como um produto só, e mudar o tema em `globals.css` muda os três.
 */

export function PainelHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{titulo}</h1>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{descricao}</p>
      </div>
      {acao}
    </header>
  );
}

export function StatCard({
  rotulo,
  valor,
  detalhe,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-[1.5rem] border border-border bg-card p-5 shadow-sm",
        destaque && "border-primary/30 bg-primary/5",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{rotulo}</p>
      <p
        className={cn(
          "mt-2 font-mono text-3xl font-bold tracking-[-0.04em] tabular-nums",
          destaque && "text-primary",
        )}
      >
        {valor}
      </p>
      {detalhe ? <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p> : null}
    </article>
  );
}

export function PainelSecao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-4 rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold tracking-[-0.02em]">{titulo}</p>
          {descricao ? <p className="mt-1 text-sm text-muted-foreground">{descricao}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function EstadoVazio({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}

/**
 * Barra proporcional ao maior valor da série. Sem biblioteca de gráfico: o
 * projeto não tem Recharts instalado e uma barra CSS resolve, sem 40 KB de JS.
 */
export function BarraComparativa({
  itens,
  formatar,
}: {
  itens: { rotulo: string; valor: number; nota?: string }[];
  formatar?: (valor: number) => string;
}) {
  const maior = Math.max(...itens.map((i) => i.valor), 1);
  const fmt = formatar ?? ((v: number) => v.toLocaleString("pt-BR"));

  return (
    <ul className="space-y-3">
      {itens.map((item) => (
        <li key={item.rotulo}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium">{item.rotulo}</span>
            <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
              {fmt(item.valor)}
              {item.nota ? <span className="ml-2 text-xs">{item.nota}</span> : null}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${Math.max((item.valor / maior) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
