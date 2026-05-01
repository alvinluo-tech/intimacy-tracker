export default function TimelineLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-32 bg-surface rounded-lg animate-pulse" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-start">
          <div className="h-10 w-10 bg-surface rounded-full animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-surface rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-surface rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
