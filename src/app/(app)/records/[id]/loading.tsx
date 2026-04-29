export default function RecordDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-5">
      <div className="rounded-xl border border-border/5 bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 rounded bg-muted/10" />
          <div className="h-5 w-16 rounded bg-muted/5" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-4 w-48 rounded bg-muted/5" />
          <div className="h-4 w-40 rounded bg-muted/5" />
          <div className="h-4 w-36 rounded bg-muted/5" />
          <div className="h-4 w-28 rounded bg-muted/5" />
          <div className="h-4 w-44 rounded bg-muted/5" />
          <div className="h-px w-full bg-muted/10" />
          <div className="h-4 w-52 rounded bg-muted/5" />
          <div className="h-4 w-56 rounded bg-muted/5" />
          <div className="h-4 w-24 rounded bg-muted/5" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-7 w-16 rounded-full bg-muted/10" />
          <div className="h-7 w-20 rounded-full bg-muted/10" />
          <div className="h-7 w-14 rounded-full bg-muted/10" />
        </div>
      </div>
    </div>
  );
}
