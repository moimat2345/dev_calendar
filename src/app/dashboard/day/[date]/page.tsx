import { auth } from "@/lib/auth";
import { getDayCommits, getDayPluginEvents } from "@/lib/activity";
import { CommitCard } from "@/components/CommitCard";
import { getPlugin } from "@/plugins/registry";
import Link from "next/link";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const session = await auth();
  const userId = session?.user?.id as string;

  const commits = await getDayCommits(userId, date);

  // Group by project
  const grouped = new Map<string, {
    slug: string;
    name: string;
    fullName: string;
    commits: typeof commits;
  }>();

  for (const c of commits) {
    if (!grouped.has(c.project.slug)) {
      grouped.set(c.project.slug, {
        slug: c.project.slug,
        name: c.project.name,
        fullName: c.project.fullName,
        commits: [],
      });
    }
    grouped.get(c.project.slug)!.commits.push(c);
  }

  const projects = Array.from(grouped.values()).sort((a, b) => b.commits.length - a.commits.length);

  // Fetch plugin events for this day
  const pluginEvents = await getDayPluginEvents(userId, date);

  // Group by pluginId
  const eventsByPlugin = new Map<string, typeof pluginEvents>();
  for (const event of pluginEvents) {
    if (!eventsByPlugin.has(event.pluginId)) {
      eventsByPlugin.set(event.pluginId, []);
    }
    eventsByPlugin.get(event.pluginId)!.push(event);
  }

  const current = new Date(date + 'T12:00:00');
  const prev = new Date(current);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(current);
  next.setDate(next.getDate() + 1);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const prevDate = fmt(prev);
  const nextDate = fmt(next);
  const isToday = date === fmt(new Date());

  const displayDate = current.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs font-mono text-neutral-600 hover:text-cyan-400 transition-colors">
          &larr; back to calendar
        </Link>

        <div className="flex items-center justify-between mt-2">
          <Link
            href={`/dashboard/day/${prevDate}`}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-cyan-400"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <h1 className="text-xl font-mono font-bold text-neutral-200">{displayDate}</h1>

          {!isToday ? (
            <Link
              href={`/dashboard/day/${nextDate}`}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-cyan-400"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ) : (
            <div className="w-9" />
          )}
        </div>

        <p className="text-xs font-mono text-neutral-600 mt-1">
          {commits.length} commit{commits.length !== 1 ? 's' : ''} across {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-6">
        {/* GitHub commits grouped by project */}
        {projects.map(project => (
          <div key={project.slug}>
            <div className="flex items-center justify-between mb-2">
              <Link
                href={`/dashboard/project/${project.slug}`}
                className="group flex items-center gap-2"
              >
                <h2 className="text-sm font-mono font-semibold text-neutral-300 group-hover:text-cyan-400 transition-colors">
                  {project.name}
                </h2>
                <span className="text-[10px] font-mono text-neutral-600">{project.fullName}</span>
                <span className="text-[10px] text-cyan-500/40 group-hover:text-cyan-400 transition-colors">&rarr;</span>
              </Link>
              <span className="text-[10px] font-mono text-neutral-600">
                {project.commits.length} commit{project.commits.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-1.5 pl-3 border-l border-white/5">
              {project.commits.map(commit => (
                <CommitCard
                  key={commit.id}
                  id={commit.id}
                  shortHash={commit.shortHash}
                  message={commit.message}
                  body={commit.body}
                  authorName={commit.authorName}
                  date={typeof commit.date === 'string' ? commit.date : commit.date.toISOString()}
                  filesChanged={commit.filesChanged}
                  insertions={commit.insertions}
                  deletions={commit.deletions}
                  detailsFetched={commit.detailsFetched}
                  projectSlug={project.slug}
                  projectName={project.name}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Plugin event sections */}
        {Array.from(eventsByPlugin.entries()).map(([pluginId, events]) => {
          const plugin = getPlugin(pluginId);
          if (!plugin) return null;
          const PluginCard = plugin.DayDetailCard;
          return (
            <div key={pluginId}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4" style={{ color: plugin.color }}>
                  {plugin.icon}
                </div>
                <h2 className="text-sm font-mono font-semibold text-neutral-300">
                  {plugin.name}
                </h2>
                <span className="text-[10px] font-mono text-neutral-600">
                  {events.length} event{events.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="pl-3 border-l border-white/5">
                <PluginCard
                  date={date}
                  events={events.map(e => ({
                    id: e.id,
                    pluginId: e.pluginId,
                    day: e.day,
                    timestamp: typeof e.timestamp === 'string' ? e.timestamp : e.timestamp.toISOString(),
                    type: e.type,
                    title: e.title,
                    subtitle: e.subtitle,
                    metadata: e.metadata as Record<string, any> | null,
                    value: e.value,
                  }))}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
