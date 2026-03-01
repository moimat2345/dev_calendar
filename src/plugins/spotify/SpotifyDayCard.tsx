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

// --- Aggregations ---

interface GenreBreakdown {
  genre: string;
  percent: number;
}

function getTopGenres(events: ActivityEventData[], limit = 4): GenreBreakdown[] {
  const genreCount = new Map<string, number>();
  let total = 0;

  for (const e of events) {
    const genres = e.metadata?.genres as string[] | undefined;
    if (genres?.length) {
      for (const g of genres) {
        genreCount.set(g, (genreCount.get(g) || 0) + 1);
        total++;
      }
    }
  }

  if (total === 0) return [];

  return [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre, count]) => ({
      genre,
      percent: Math.round((count / total) * 100),
    }));
}

interface MoodInfo {
  label: string;
  color: string;
  valence: number;
  energy: number;
}

function getMood(events: ActivityEventData[]): MoodInfo | null {
  let totalValence = 0;
  let totalEnergy = 0;
  let count = 0;

  for (const e of events) {
    const v = e.metadata?.valence as number | undefined;
    const en = e.metadata?.energy as number | undefined;
    if (v !== undefined && en !== undefined) {
      totalValence += v;
      totalEnergy += en;
      count++;
    }
  }

  if (count === 0) return null;

  const valence = totalValence / count;
  const energy = totalEnergy / count;

  let label: string;
  let color: string;

  if (valence > 0.6 && energy > 0.6) {
    label = 'upbeat';
    color = '#22c55e'; // green
  } else if (valence > 0.6 && energy <= 0.6) {
    label = 'chill';
    color = '#06b6d4'; // cyan
  } else if (valence <= 0.4 && energy > 0.6) {
    label = 'intense';
    color = '#ef4444'; // red
  } else if (valence <= 0.4 && energy <= 0.4) {
    label = 'mélancolique';
    color = '#8b5cf6'; // purple
  } else {
    label = 'neutre';
    color = '#a3a3a3'; // neutral
  }

  return { label, color, valence, energy };
}

interface TopArtist {
  name: string;
  plays: number;
  totalMs: number;
}

function getTopArtists(events: ActivityEventData[], limit = 3): TopArtist[] {
  const artistMap = new Map<string, { plays: number; totalMs: number }>();

  for (const e of events) {
    // subtitle contains "Artist1, Artist2" — take primary artist
    const primary = e.subtitle?.split(', ')[0];
    if (!primary) continue;
    const existing = artistMap.get(primary) || { plays: 0, totalMs: 0 };
    existing.plays++;
    existing.totalMs += e.value || 0;
    artistMap.set(primary, existing);
  }

  return [...artistMap.entries()]
    .sort((a, b) => b[1].plays - a[1].plays)
    .slice(0, limit)
    .map(([name, data]) => ({ name, ...data }));
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

  // Events sorted by timestamp (newest first)
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const event of sorted) {
    const uri = event.metadata?.contextUri || null;
    const type = event.metadata?.contextType || null;

    // Start new session if context changes (compare both URI and type)
    if (!current || current.contextUri !== uri || current.contextType !== type) {
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

function ContextIcon({ type, size = 'sm' }: { type: string | null; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? "w-7 h-7 p-1.5 rounded-sm bg-white/[0.04] text-neutral-500" : "w-3.5 h-3.5 text-neutral-500";
  if (type === 'collection') {
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2.748l-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748z" />
      </svg>
    );
  }
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
    || (session.contextType === 'collection' ? 'Titres likés' : null)
    || (session.contextType === 'album' ? 'Album' : null)
    || 'Titres individuels';

  // Time range: events are newest-first, so last element is earliest
  const firstTime = session.events[session.events.length - 1]?.timestamp;
  const lastTime = session.events[0]?.timestamp;
  const timeRange = firstTime && lastTime
    ? `${formatTime(firstTime)} – ${formatTime(lastTime)}`
    : '';

  // Session cover: prefer context image (playlist/album cover), fallback to first track's album art
  const sessionCover = session.events.find(e => e.metadata?.contextImageUrl)?.metadata?.contextImageUrl
    || session.events.find(e => e.metadata?.albumImageUrl)?.metadata?.albumImageUrl
    || null;

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
        {sessionCover ? (
          <img
            src={sessionCover}
            alt=""
            className="w-7 h-7 rounded-sm flex-shrink-0"
          />
        ) : (
          <ContextIcon type={session.contextType} size="md" />
        )}
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
  const topGenres = getTopGenres(events);
  const mood = getMood(events);
  const topArtists = getTopArtists(events);

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
        {mood && (
          <>
            <span className="text-[10px] font-mono text-neutral-700">|</span>
            <span
              className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-sm"
              style={{
                color: mood.color,
                backgroundColor: mood.color + '15',
                border: `1px solid ${mood.color}30`,
              }}
            >
              {mood.label}
            </span>
          </>
        )}
      </div>

      {/* Genres + Top Artists */}
      {(topGenres.length > 0 || topArtists.length > 0) && (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {/* Genres */}
          {topGenres.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">genres</span>
              {topGenres.map(({ genre, percent }) => (
                <span
                  key={genre}
                  className="text-[10px] font-mono text-neutral-400"
                >
                  {genre} <span className="text-neutral-600">{percent}%</span>
                </span>
              ))}
            </div>
          )}

          {/* Top Artists */}
          {topArtists.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">top</span>
              {topArtists.map(({ name, plays, totalMs: ms }) => (
                <span
                  key={name}
                  className="text-[10px] font-mono text-neutral-400"
                >
                  {name} <span className="text-neutral-600">{plays}x · {formatTotalTime(ms)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sessions */}
      <div className="space-y-0.5">
        {sessions.map((session, i) => (
          <SessionRow key={`${session.contextUri}-${session.contextType}-${i}`} session={session} index={i} />
        ))}
      </div>
    </div>
  );
}
