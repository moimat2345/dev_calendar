import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { getPlugin } from '@/plugins/registry';
import type { PluginDaySummary } from '@/plugins/types';
import type { DayActivity } from './types';

export interface UnifiedDayActivity extends DayActivity {
  totalWeight: number;
  sources: PluginDaySummary[];
}

export function getMonthActivity(
  userId: string,
  year: number,
  month: number
): Promise<{ year: number; month: number; days: UnifiedDayActivity[] }> {
  return unstable_cache(
    () => _getMonthActivity(userId, year, month),
    [`activity-month-${userId}-${year}-${month}`],
    { tags: [`activity-${userId}`], revalidate: 300 }
  )();
}

async function _getMonthActivity(
  userId: string,
  year: number,
  month: number
): Promise<{ year: number; month: number; days: UnifiedDayActivity[] }> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  // 1. GitHub commits
  const commits = await prisma.commit.findMany({
    where: {
      project: { userId },
      day: { gte: startDate, lt: endDate },
    },
    include: {
      project: { select: { slug: true, name: true } },
    },
    orderBy: { day: 'asc' },
  });

  // 2. Plugin events
  const events = await prisma.activityEvent.findMany({
    where: {
      userId,
      day: { gte: startDate, lt: endDate },
    },
    orderBy: { day: 'asc' },
  });

  // 3. Build unified day map
  const dayMap = new Map<string, UnifiedDayActivity>();

  function getDay(date: string): UnifiedDayActivity {
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        date,
        totalCommits: 0,
        projects: [],
        totalWeight: 0,
        sources: [],
      });
    }
    return dayMap.get(date)!;
  }

  // Process GitHub commits
  for (const commit of commits) {
    const day = getDay(commit.day);
    day.totalCommits++;

    const existing = day.projects.find(p => p.slug === commit.project.slug);
    if (existing) {
      existing.commitCount++;
    } else {
      day.projects.push({
        slug: commit.project.slug,
        name: commit.project.name,
        commitCount: 1,
      });
    }
  }

  // Process plugin events grouped by day + pluginId
  const eventsByDayPlugin = new Map<string, Map<string, typeof events>>();
  for (const event of events) {
    if (!eventsByDayPlugin.has(event.day)) {
      eventsByDayPlugin.set(event.day, new Map());
    }
    const pluginMap = eventsByDayPlugin.get(event.day)!;
    if (!pluginMap.has(event.pluginId)) {
      pluginMap.set(event.pluginId, []);
    }
    pluginMap.get(event.pluginId)!.push(event);
  }

  for (const [date, pluginMap] of eventsByDayPlugin) {
    const day = getDay(date);

    for (const [pluginId, pluginEvents] of pluginMap) {
      const plugin = getPlugin(pluginId);
      if (plugin) {
        const summary = plugin.getActivitySummary(
          pluginEvents.map(e => ({
            id: e.id,
            pluginId: e.pluginId,
            day: e.day,
            timestamp: e.timestamp.toISOString(),
            type: e.type,
            title: e.title,
            subtitle: e.subtitle,
            metadata: e.metadata as Record<string, any> | null,
            value: e.value,
          }))
        );
        day.sources.push(summary);
      }
    }
  }

  // Add GitHub as a source + compute totalWeight
  const githubPlugin = getPlugin('github');
  for (const [, day] of dayMap) {
    if (day.totalCommits > 0 && githubPlugin) {
      day.sources.unshift({
        pluginId: 'github',
        label: `${day.totalCommits} commit${day.totalCommits !== 1 ? 's' : ''}`,
        count: day.totalCommits,
        color: githubPlugin.color,
      });
    }
    day.totalWeight = day.sources.reduce((sum, s) => sum + s.count, 0);
  }

  const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  return { year, month, days };
}

export function getDayCommits(userId: string, date: string) {
  return unstable_cache(
    () => prisma.commit.findMany({
      where: { project: { userId }, day: date },
      include: { project: { select: { slug: true, name: true, fullName: true } } },
      orderBy: { date: 'desc' },
    }),
    [`activity-day-commits-${userId}-${date}`],
    { tags: [`activity-${userId}`], revalidate: 300 }
  )();
}

export function getDayPluginEvents(userId: string, date: string) {
  return unstable_cache(
    () => prisma.activityEvent.findMany({
      where: { userId, day: date },
      orderBy: { timestamp: 'desc' },
    }),
    [`activity-day-events-${userId}-${date}`],
    { tags: [`activity-${userId}`], revalidate: 300 }
  )();
}
