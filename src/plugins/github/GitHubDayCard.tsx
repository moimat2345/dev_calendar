'use client';

import type { ActivityEventData } from '../types';

export function GitHubDayCard({ events, date }: { events: ActivityEventData[]; date: string }) {
  // GitHub uses the native CommitCard rendering in the day view,
  // so this component is only used as a fallback for the plugin interface.
  return (
    <div className="space-y-1">
      {events.map(event => (
        <div key={event.id} className="text-xs font-mono text-neutral-400 py-1">
          <span className="text-cyan-500/70">{event.metadata?.shortHash}</span>
          <span className="ml-2">{event.title}</span>
        </div>
      ))}
    </div>
  );
}
