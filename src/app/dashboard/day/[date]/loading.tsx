export default function DayLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="w-28 h-3 rounded bg-white/5" />
        <div className="flex items-center gap-4 mt-2">
          <div className="w-7 h-7 rounded-md bg-white/5" />
          <div className="w-64 h-6 rounded bg-white/5" />
          <div className="w-7 h-7 rounded-md bg-white/5" />
        </div>
        <div className="w-36 h-3 rounded bg-white/5 mt-1" />
      </div>

      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="space-y-2">
            <div className="w-40 h-4 rounded bg-white/5" />
            <div className="pl-3 border-l border-white/5 space-y-1.5">
              {[1, 2, 3].map(j => (
                <div key={j} className="h-12 rounded-lg bg-white/[0.02] border border-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
