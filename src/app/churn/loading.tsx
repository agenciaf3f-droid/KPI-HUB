export default function Loading() {
  return (
    <div className="min-h-svh bg-background md:pl-28">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6">
        <div className="h-14 animate-pulse rounded-2xl bg-muted" />
        <div className="mt-4 h-[70svh] animate-pulse rounded-[1.5rem] border border-border bg-card" />
      </div>
    </div>
  );
}
