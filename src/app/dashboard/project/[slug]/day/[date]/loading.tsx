export default function ProjectDayLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="w-48 h-3 rounded bg-white/5" />
        <div className="w-64 h-6 rounded bg-white/5 mt-2" />
        <div className="w-36 h-3 rounded bg-white/5 mt-1" />
      </div>

      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 rounded-lg bg-white/[0.02] border border-white/5" />
        ))}
      </div>
    </div>
  );
}
