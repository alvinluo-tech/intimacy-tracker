export default function TimelineLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-6">
      <div className="h-10 w-48 rounded bg-white/[0.06]" />
      <div className="mt-2 h-8 w-32 rounded bg-white/[0.04]" />

      <div className="mt-5 flex gap-2">
        <div className="h-11 flex-1 rounded-xl bg-white/[0.06]" />
        <div className="h-11 w-11 rounded-xl bg-white/[0.06]" />
        <div className="h-11 w-11 rounded-xl bg-white/[0.06]" />
      </div>

      <div className="mt-4 flex gap-2">
        <div className="h-8 w-24 rounded-full bg-white/[0.06]" />
        <div className="h-8 w-20 rounded-full bg-white/[0.06]" />
        <div className="h-8 w-24 rounded-full bg-white/[0.06]" />
      </div>

      <div className="mt-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-[var(--app-panel)] p-5">
            <div className="flex justify-between">
              <div className="h-7 w-44 rounded bg-white/[0.06]" />
              <div className="h-6 w-20 rounded bg-white/[0.06]" />
            </div>
            <div className="mt-3 h-6 w-36 rounded bg-white/[0.06]" />
            <div className="mt-4 h-px w-full bg-white/[0.06]" />
            <div className="mt-3 flex gap-2">
              <div className="h-7 w-20 rounded-full bg-white/[0.06]" />
              <div className="h-7 w-24 rounded-full bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
