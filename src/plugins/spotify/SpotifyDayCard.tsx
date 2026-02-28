'use client';

import { useState } from 'react';
import type { ActivityEventData } from '../types';

// --- Helpers ---

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

function getPeakHour(events: ActivityEventData[]): string | null {
  if (events.length === 0) return null;
  const hourMap = new Map<number, number>();
  for (const e of events) {
    const hour = new Date(e.timestamp).getHours();
    hourMap.set(hour, (hourMap.get(hour) || 0) + (e.value || 0));
  }
  let peakHour = 0;
  let peakMs = 0;
  for (const [hour, ms] of hourMap) {
    if (ms > peakMs) {
      peakHour = hour;
      peakMs = ms;
    }
  }
  return `${String(peakHour).padStart(2, '0')}:00`;
}

// --- Session grouping ---

interface Session {
  contextUri: string | null;
  contextType: string | null;
  contextName: string | null;
  events: ActivityEventData[];
  totalMs: number;
}

function groupIntoSessions(events: ActivityEventData[]): Session[] {
  const sessions: Session[] = [];
  let current: Session | null = null;

  // Events should be sorted by timestamp (oldest first for display)
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const event of sorted) {
    const uri = event.metadata?.contextUri || null;

    // Start new session if context changes
    if (!current || current.contextUri !== uri) {
      current = {
        contextUri: uri,
        contextType: event.metadata?.contextType || null,
        contextName: event.metadata?.contextName || null,
        events: [],
        totalMs: 0,
      };
      sessions.push(current);
    }

    current.events.push(event);
    current.totalMs += event.value || 0;
  }

  return sessions;
}

// --- Icons ---

function ContextIcon({ type }: { type: string | null }) {
  const cls = "w-3.5 h-3.5 text-neutral-500";
  if (type === 'playlist') {
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
        <path d="M15 14.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-5.5-2V0H11v12.5a1.5 1.5 0 1 1-3 0h1.5zM1 2.5h8v1H1zm0 3h8v1H1zm0 3h5v1H1z" />
      </svg>
    );
  }
  if (type === 'album') {
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z" />
        <path d="M8 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM5 8a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
      </svg>
    );
  }
  if (type === 'artist') {
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
        <path d="M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm-9 8c0-3.3 2.7-6 6-6s6 2.7 6 6H2z" />
      </svg>
    );
  }
  // Queue / direct play
  return (
    <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 2l8 6-8 6V2z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3 h-3 text-neutral-600 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M6.5 3l5 5-5 5V3z" />
    </svg>
  );
}

// --- Sub-components ---

function SessionRow({ session, index }: { session: Session; index: number }) {
  const [open, setOpen] = useState(false);
  const label = session.contextName
    || (session.contextType === 'album' ? 'Album' : null)
    || 'Titres individuels';
  const timeRange = session.events.length > 0
    ? `${formatTime(session.events[0].timestamp)} – ${formatTime(session.events[session.events.length - 1].timestamp)}`
    : '';

  return (
    <div
      className="group"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Session header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-md hover:bg-white/[0.03] transition-colors text-left"
      >
        <ChevronIcon open={open} />
        <ContextIcon type={session.contextType} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-mono text-neutral-300 truncate block">
            {label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-neutral-600 flex-shrink-0">
          {session.events.length} track{session.events.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[10px] font-mono text-neutral-600 flex-shrink-0 w-14 text-right">
          {formatTotalTime(session.totalMs)}
        </span>
        <span className="text-[10px] font-mono text-neutral-700 flex-shrink-0 w-24 text-right hidden sm:block">
          {timeRange}
        </span>
      </button>

      {/* Expanded tracks */}
      {open && (
        <div className="ml-5 border-l border-white/[0.06] pl-3 pb-1">
          {session.events.map((event, i) => (
            <div
              key={event.id}
              className="flex items-center gap-2.5 py-1.5 px-1.5 rounded hover:bg-white/[0.02] transition-colors"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              {event.metadata?.albumImageUrl ? (
                <img
                  src={event.metadata.albumImageUrl}
                  alt=""
                  className="w-7 h-7 rounded-sm flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-sm bg-white/[0.04] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono text-neutral-300 truncate">
                  {event.title}
                </p>
                <p className="text-[10px] font-mono text-neutral-600 truncate">
                  {event.subtitle}
                </p>
              </div>
              <span className="text-[10px] font-mono text-neutral-600 flex-shrink-0">
                {formatDuration(event.value || 0)}
              </span>
              <span className="text-[10px] font-mono text-neutral-700 flex-shrink-0 w-10 text-right">
                {formatTime(event.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export function SpotifyDayCard({ events }: { events: ActivityEventData[]; date: string }) {
  const totalMs = events.reduce((sum, e) => sum + (e.value || 0), 0);
  const peakHour = getPeakHour(events);
  const sessions = groupIntoSessions(events);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className="text-base font-mono font-bold tracking-tight"
          style={{ color: '#1DB954' }}
        >
          {formatTotalTime(totalMs)}
        </span>
        <span className="text-[10px] font-mono text-neutral-600">
          {events.length} track{events.length !== 1 ? 's' : ''}
        </span>
        {peakHour && (
          <>
            <span className="text-[10px] font-mono text-neutral-700">|</span>
            <span className="text-[10px] font-mono text-neutral-500">
              pic <span className="text-neutral-400">{peakHour}</span>
            </span>
          </>
        )}
      </div>

      {/* Sessions */}
      <div className="space-y-0.5">
        {sessions.map((session, i) => (
          <SessionRow key={`${session.contextUri}-${i}`} session={session} index={i} />
        ))}
      </div>
    </div>
  );
}
