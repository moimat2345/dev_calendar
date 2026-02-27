'use client';

import type { ActivityEventData } from '../types';

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTotalTime(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}min`;
  return `${mins}min`;
}

export function SpotifyDayCard({ events }: { events: ActivityEventData[]; date: string }) {
  const totalMs = events.reduce((sum, e) => sum + (e.value || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono font-semibold" style={{ color: '#1DB954' }}>
          {formatTotalTime(totalMs)}
        </span>
        <span className="text-[10px] font-mono text-neutral-600">
          {events.length} track{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-1">
        {events.map(event => (
          <div
            key={event.id}
            className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-white/[0.02] transition-colors group"
          >
            {event.metadata?.albumImageUrl && (
              <img
                src={event.metadata.albumImageUrl}
                alt=""
                className="w-8 h-8 rounded-sm flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-neutral-300 truncate">
                {event.title}
              </p>
              <p className="text-[10px] font-mono text-neutral-600 truncate">
                {event.subtitle}
                {event.metadata?.albumName && (
                  <span className="text-neutral-700"> / {event.metadata.albumName}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-mono text-neutral-600">
                {formatDuration(event.value || 0)}
              </span>
              <span className="text-[10px] font-mono text-neutral-700">
                {formatTime(event.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
