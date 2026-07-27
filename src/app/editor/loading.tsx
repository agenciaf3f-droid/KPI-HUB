export default function Loading() {
  return (
    <div className="min-h-svh bg-background md:pl-28">
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[1.5rem] border border-border bg-card" />
          ))}
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-[1.5rem] border border-border bg-card" />
      </div>
    </div>
  );
}
