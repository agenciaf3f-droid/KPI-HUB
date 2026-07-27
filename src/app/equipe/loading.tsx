export default function Loading() {
  return (
    <div className="min-h-svh bg-background md:pl-28">
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6">
        <div className="h-14 animate-pulse rounded-2xl bg-muted" />
        <div className="mt-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
