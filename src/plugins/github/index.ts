import type { PluginDefinition, ActivityEventData, PluginDaySummary } from '../types';
import { syncUserData } from '@/lib/sync';
import { GitHubIcon } from './icon';
import { GitHubDayCard } from './GitHubDayCard';

export const githubPlugin: PluginDefinition = {
  id: 'github',
  name: 'GitHub',
  description: 'Track commits across your repositories',
  icon: GitHubIcon({}),
  color: '#00ffcc',

  async sync(userId, _connection) {
    const result = await syncUserData(userId);
    return { newEvents: result.newCommits, message: `${result.newCommits} new commits` };
  },

  getActivitySummary(events: ActivityEventData[]): PluginDaySummary {
    return {
      pluginId: 'github',
      label: `${events.length} commit${events.length !== 1 ? 's' : ''}`,
      count: events.length,
      color: '#00ffcc',
    };
  },

  getActivityWeight(events: ActivityEventData[]): number {
    return events.length;
  },

  DayDetailCard: GitHubDayCard,
};
