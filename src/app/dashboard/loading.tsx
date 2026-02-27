export default function DashboardLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 animate-pulse">
      {/* Month nav skeleton */}
      <div className="flex items-center justify-between py-4">
        <div className="w-8 h-8 rounded bg-white/5" />
        <div className="w-40 h-6 rounded bg-white/5" />
        <div className="w-8 h-8 rounded bg-white/5" />
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs font-mono text-neutral-700 py-2">{d}</div>
        ))}
      </div>

      {/* Calendar grid skeleton */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-md bg-white/[0.02] border border-white/5" />
        ))}
      </div>
    </div>
  );
}
