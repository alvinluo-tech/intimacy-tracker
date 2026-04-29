export default function PartnerDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-4 px-4 py-5">
      <div className="flex items-center gap-4 rounded-xl border border-border/5 bg-surface p-5">
        <div className="h-16 w-16 rounded-full bg-muted/10" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-36 rounded bg-muted/10" />
          <div className="flex gap-3">
            <div className="h-5 w-16 rounded-full bg-muted/5" />
            <div className="h-5 w-20 rounded-full bg-muted/5" />
            <div className="h-5 w-16 rounded-full bg-muted/5" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 flex-1 rounded-xl bg-muted/10" />
        ))}
      </div>

      <div className="rounded-xl border border-border/5 bg-surface p-5">
        <div className="h-48 w-full rounded-xl bg-muted/5" />
      </div>
    </div>
  );
}
