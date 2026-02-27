export default function ProjectLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="w-28 h-3 rounded bg-white/5" />
        <div className="w-48 h-6 rounded bg-white/5 mt-2" />
      </div>

      <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between py-4">
          <div className="w-8 h-8 rounded bg-white/5" />
          <div className="w-40 h-6 rounded bg-white/5" />
          <div className="w-8 h-8 rounded bg-white/5" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-white/[0.02] border border-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
