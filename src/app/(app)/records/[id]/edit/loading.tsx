export default function RecordEditLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-5">
      <div className="rounded-xl border border-border/5 bg-surface p-5">
        <div className="space-y-3">
          <div className="h-5 w-24 rounded bg-muted/10" />
          <div className="h-12 w-full rounded-xl bg-muted/5" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-5 w-28 rounded bg-muted/10" />
          <div className="flex gap-3">
            <div className="h-12 flex-1 rounded-xl bg-muted/5" />
            <div className="h-12 flex-1 rounded-xl bg-muted/5" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-5 w-20 rounded bg-muted/10" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-10 rounded-full bg-muted/5" />
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-5 w-32 rounded bg-muted/10" />
          <div className="h-12 w-full rounded-xl bg-muted/5" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-5 w-16 rounded bg-muted/10" />
          <div className="h-24 w-full rounded-xl bg-muted/5" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-5 w-20 rounded bg-muted/10" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-muted/5" />
            ))}
          </div>
        </div>
        <div className="mt-6 h-12 w-full rounded-xl bg-muted/10" />
      </div>
    </div>
  );
}
