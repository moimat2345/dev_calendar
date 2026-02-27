import Link from 'next/link';

interface RepoCardProps {
  slug: string;
  name: string;
  fullName: string;
  commitCount: number;
  totalInsertions: number;
  totalDeletions: number;
}

export function RepoCard({ slug, name, fullName, commitCount, totalInsertions, totalDeletions }: RepoCardProps) {
  return (
    <Link
      href={`/dashboard/project/${slug}`}
      className="
        block p-4 rounded-lg border border-white/5 bg-white/[0.02]
        hover:border-cyan-500/20 hover:bg-white/[0.04]
        transition-all duration-200 group
      "
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-mono text-sm text-neutral-200 group-hover:text-cyan-400 transition-colors">
            {name}
          </h3>
          <p className="text-xs text-neutral-600 font-mono mt-0.5">{fullName}</p>
        </div>
        <span className="text-xs font-mono text-cyan-400/70 bg-cyan-950/30 px-2 py-0.5 rounded">
          {commitCount} commit{commitCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex gap-3 mt-3 text-xs font-mono">
        <span className="text-emerald-500">+{totalInsertions}</span>
        <span className="text-red-400">-{totalDeletions}</span>
      </div>
    </Link>
  );
}
