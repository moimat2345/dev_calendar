import type { PluginDefinition, ActivityEventData, PluginDaySummary } from '../types';
import { syncSpotifyForUser } from './lib';
import { SpotifyIcon } from './icon';
import { SpotifyDayCard } from './SpotifyDayCard';

export const spotifyPlugin: PluginDefinition = {
  id: 'spotify',
  name: 'Spotify',
  description: 'Track your daily music listening time',
  icon: SpotifyIcon({}),
  color: '#1DB954',

  async sync(userId, connection) {
    if (!connection.credentials) {
      return { newEvents: 0, message: 'Not connected' };
    }

    const result = await syncSpotifyForUser(
      userId,
      connection.credentials,
      connection.lastSynced
    );

    return {
      newEvents: result.newEvents,
      message: `${result.newEvents} new tracks`,
      updatedCredentials: result.credentials,
    };
  },

  getActivitySummary(events: ActivityEventData[]): PluginDaySummary {
    const totalMs = events.reduce((sum, e) => sum + (e.value || 0), 0);
    const hours = Math.floor(totalMs / 3_600_000);
    const mins = Math.floor((totalMs % 3_600_000) / 60_000);
    const label = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

    return {
      pluginId: 'spotify',
      label,
      count: events.length,
      color: '#1DB954',
    };
  },

  getActivityWeight(events: ActivityEventData[]): number {
    const totalMs = events.reduce((sum, e) => sum + (e.value || 0), 0);
    return Math.round(totalMs / 1_800_000); // 1 point per 30 min
  },

  DayDetailCard: SpotifyDayCard,
};
