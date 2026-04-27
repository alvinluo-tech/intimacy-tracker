export default function MapLoading() {
  return (
    <div className="flex h-[100svh] flex-col md:h-screen animate-pulse">
      <div className="flex-1 px-4 py-5 md:p-6">
        <div className="flex h-full w-full items-center justify-center rounded-[12px] bg-[#1e1e1e]">
          <div className="text-[14px] text-[var(--app-text-muted)]">Loading Map...</div>
        </div>
      </div>
    </div>
  );
}
