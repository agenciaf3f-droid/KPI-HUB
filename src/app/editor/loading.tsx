export default function Loading() {
  return (
    <div className="min-h-svh bg-background md:pl-28">
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <div className="h-9 w-64 animate-pulse rounded-xl bg-muted" />
        <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded-lg bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[7.5rem] animate-pulse rounded-[1.5rem] border border-border bg-card" />
          ))}
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-[1.5rem] border border-border bg-card" />
        <span className="sr-only">Carregando as edições…</span>
      </div>
    </div>
  );
}
