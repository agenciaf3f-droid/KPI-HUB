import { Grid2X2, Layers, MessagesSquare, Scissors, TrendingDown } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Panel } from "@/lib/panels";

type NavigationItem = "fila" | "churn" | Panel;

export function AppHeader({ activeItem = "fila", fullName, accountHref = "/seguranca", panels = [] }: { activeItem?: NavigationItem; fullName?: string; accountHref?: string | null; panels?: Panel[] }) {
  const links = (
    <>
      {panels.includes("gestor") ? <NavButton active={activeItem === "gestor"} href="/gestor" label="Gestor"><MessagesSquare /></NavButton> : null}
      {panels.includes("editor") ? <NavButton active={activeItem === "editor"} href="/editor" label="Vídeo"><Scissors /></NavButton> : null}
      {panels.includes("creator") || activeItem === "fila" || activeItem === "creator" ? (
        <NavButton active={activeItem === "creator" || activeItem === "fila"} href="/creator" label="Creator"><Grid2X2 /></NavButton>
      ) : null}
      {panels.includes("gestor") ? <NavButton active={activeItem === "churn"} href="/churn" label="Churn"><TrendingDown /></NavButton> : null}
    </>
  );

  return (
    <aside className="sticky top-0 z-20 flex h-16 w-full items-center justify-between bg-sidebar px-4 text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:h-svh md:w-28 md:flex-col md:px-0 md:py-5">
      <div className="flex items-center gap-3 md:flex-col">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Layers className="size-5" />
        </div>
        <span className="text-sm font-semibold md:hidden">KPI F3F</span>
      </div>

      <nav className="flex items-center gap-1 md:hidden" aria-label="Navegação principal">{links}</nav>

      <nav className="hidden flex-col items-center gap-3 md:flex" aria-label="Navegação principal">{links}</nav>

      <div className="flex items-center gap-2 md:flex-col">
        <ThemeToggle />
        {accountHref ? <Link href={accountHref} className="grid size-9 place-items-center rounded-full bg-card text-xs font-semibold text-foreground transition-colors hover:bg-accent md:size-10" aria-label="Abrir segurança da conta">{fullName?.slice(0, 1).toUpperCase() ?? "M"}</Link> : <span className="grid size-9 place-items-center rounded-full bg-card text-xs font-semibold text-foreground md:size-10" title="Acesso administrativo por link">{fullName?.slice(0, 1).toUpperCase() ?? "A"}</span>}
      </div>
    </aside>
  );
}

function NavButton({ active = false, href, label, children }: { active?: boolean; href?: string; label: string; children: React.ReactNode }) {
  const className = active
    ? "flex h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-2xl bg-card px-2 text-foreground transition-colors hover:bg-card md:h-14 md:w-[4.5rem]"
    : "flex h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground md:h-14 md:w-[4.5rem]";

  const inner = (
    <>
      <span className="[&>svg]:size-5">{children}</span>
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </>
  );

  if (!href) {
    return <span aria-disabled="true" title={`${label} em breve`} className={`${className} cursor-not-allowed opacity-45`}>{inner}</span>;
  }


  return (
    <Link
      href={href}
      // prefetch total (RSC completo) das abas: a troca vira instantânea;
      // custo: 3 fetches em background por carga de página.
      prefetch={true}
      aria-label={label}
      title={label}
      className={className}
    >
      {inner}
    </Link>
  );
}
