export default function PartnersLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-4 px-4 py-5">
      <div className="h-8 w-32 rounded bg-muted/10" />

      <div className="rounded-xl border border-border/5 bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted/10" />
            <div className="h-6 w-40 rounded bg-muted/5" />
          </div>
          <div className="h-9 w-24 rounded-xl bg-muted/10" />
        </div>
        <div className="mt-4 h-px w-full bg-muted/10" />
        <div className="mt-4 flex items-center gap-2">
          <div className="h-9 flex-1 rounded-xl bg-muted/10" />
          <div className="h-9 w-20 rounded-xl bg-muted/10" />
        </div>
      </div>

      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border/5 bg-surface p-5">
          <div className="h-12 w-12 rounded-full bg-muted/10" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded bg-muted/10" />
            <div className="h-4 w-20 rounded bg-muted/5" />
          </div>
          <div className="h-7 w-16 rounded-full bg-muted/10" />
        </div>
      ))}
    </div>
  );
}
