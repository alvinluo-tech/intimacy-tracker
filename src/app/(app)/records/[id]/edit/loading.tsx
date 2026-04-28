export default function RecordEditLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-5">
      <div className="rounded-xl border border-white/[0.06] bg-[var(--app-panel)] p-5">
        <div className="space-y-3">
          <div className="h-5 w-24 rounded bg-white/[0.06]" />
          <div className="h-12 w-full rounded-xl bg-white/[0.04]" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-5 w-28 rounded bg-white/[0.06]" />
          <div className="flex gap-3">
            <div className="h-12 flex-1 rounded-xl bg-white/[0.04]" />
            <div className="h-12 flex-1 rounded-xl bg-white/[0.04]" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-5 w-20 rounded bg-white/[0.06]" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-10 rounded-full bg-white/[0.04]" />
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-5 w-32 rounded bg-white/[0.06]" />
          <div className="h-12 w-full rounded-xl bg-white/[0.04]" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-5 w-16 rounded bg-white/[0.06]" />
          <div className="h-24 w-full rounded-xl bg-white/[0.04]" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-5 w-20 rounded bg-white/[0.06]" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-white/[0.04]" />
            ))}
          </div>
        </div>
        <div className="mt-6 h-12 w-full rounded-xl bg-white/[0.06]" />
      </div>
    </div>
  );
}
