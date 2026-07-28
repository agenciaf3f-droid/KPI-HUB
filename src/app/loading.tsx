export default function Loading() {
  return (
    <div className="min-h-svh bg-background md:pl-28" aria-label="Carregando tela">
      <aside className="sticky top-0 flex h-16 w-full items-center justify-between bg-sidebar px-4 md:fixed md:inset-y-0 md:left-0 md:h-svh md:w-28 md:flex-col md:py-5">
        <div className="size-10 animate-pulse rounded-2xl bg-sidebar-accent" />
        <div className="flex gap-2 md:flex-col"><div className="size-10 animate-pulse rounded-2xl bg-sidebar-accent" /><div className="size-10 animate-pulse rounded-2xl bg-sidebar-accent" /></div>
        <div className="size-10 animate-pulse rounded-full bg-sidebar-accent" />
      </aside>
      <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <section className="h-40 animate-pulse rounded-[2rem] bg-card" />
        <section className="h-48 animate-pulse rounded-[2rem] bg-card" />
        <section className="rounded-[2rem] bg-card p-6"><div className="h-7 w-56 animate-pulse rounded-lg bg-muted" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="h-52 animate-pulse rounded-[1.5rem] bg-muted" /><div className="h-52 animate-pulse rounded-[1.5rem] bg-muted" /><div className="h-52 animate-pulse rounded-[1.5rem] bg-muted" /></div></section>
      </main>
    </div>
  );
}
