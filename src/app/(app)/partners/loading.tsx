export default function PartnersLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-32 bg-surface rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-surface rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
