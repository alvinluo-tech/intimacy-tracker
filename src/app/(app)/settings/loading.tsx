export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-4 px-4 py-5">
      <div className="flex items-center gap-4 rounded-xl border border-border/5 bg-surface p-5">
        <div className="h-16 w-16 rounded-full bg-muted/10" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-36 rounded bg-muted/10" />
          <div className="h-4 w-52 rounded bg-muted/5" />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/5 bg-surface p-5">
        <div className="h-5 w-28 rounded bg-muted/10" />
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-muted/5" />
          <div className="h-6 w-12 rounded-full bg-muted/10" />
        </div>
        <div className="h-px w-full bg-muted/10" />
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-muted/5" />
          <div className="h-6 w-20 rounded bg-muted/10" />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/5 bg-surface p-5">
        <div className="h-5 w-28 rounded bg-muted/10" />
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 rounded bg-muted/5" />
          <div className="h-6 w-12 rounded-full bg-muted/10" />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/5 bg-surface p-5">
        <div className="h-5 w-32 rounded bg-muted/10" />
        <div className="h-4 w-44 rounded bg-muted/5" />
        <div className="h-10 w-full rounded-xl bg-muted/10" />
        <div className="h-10 w-full rounded-xl bg-muted/10" />
      </div>

      <div className="space-y-3 rounded-xl border border-border/5 bg-surface p-5">
        <div className="h-5 w-28 rounded bg-muted/10" />
        <div className="h-4 w-36 rounded bg-muted/5" />
        <div className="h-10 w-full rounded-xl bg-muted/10" />
        <div className="h-10 w-full rounded-xl bg-muted/10" />
        <div className="h-px w-full bg-muted/10" />
        <div className="h-10 w-32 rounded-xl bg-destructive/10" />
      </div>
    </div>
  );
}
