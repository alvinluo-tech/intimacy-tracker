export default function TimelineLoading() {
  return (
    <div className="min-h-[100svh] bg-[#020617]">
      <div className="mx-auto max-w-6xl animate-pulse px-4 py-6">
        <div className="h-10 w-48 rounded bg-slate-800" />
        <div className="mt-2 h-8 w-32 rounded bg-slate-800/80" />

        <div className="mt-5 flex gap-2">
          <div className="h-11 flex-1 rounded-xl bg-slate-800/80" />
          <div className="h-11 w-11 rounded-xl bg-slate-800/80" />
          <div className="h-11 w-11 rounded-xl bg-slate-800/80" />
        </div>

        <div className="mt-4 flex gap-2">
          <div className="h-8 w-24 rounded-full bg-slate-800/80" />
          <div className="h-8 w-20 rounded-full bg-slate-800/80" />
          <div className="h-8 w-24 rounded-full bg-slate-800/80" />
        </div>

        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-[#0f172a] p-5">
              <div className="flex justify-between">
                <div className="h-7 w-44 rounded bg-slate-800" />
                <div className="h-6 w-20 rounded bg-slate-800" />
              </div>
              <div className="mt-3 h-6 w-36 rounded bg-slate-800" />
              <div className="mt-4 h-px w-full bg-slate-800" />
              <div className="mt-3 flex gap-2">
                <div className="h-7 w-20 rounded-full bg-slate-800" />
                <div className="h-7 w-24 rounded-full bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}