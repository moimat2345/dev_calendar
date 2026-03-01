'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PluginInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  connected: boolean;
  lastSynced: string | null;
  eventCount: number;
}

interface SettingsData {
  profile: {
    username: string;
    githubId: number;
    avatarUrl: string | null;
    timezone: string;
    createdAt: string;
  };
  github: {
    projectCount: number;
    commitCount: number;
    lastSynced: string | null;
  };
  plugins: PluginInfo[];
}

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState('');
  const [savingTz, setSavingTz] = useState(false);
  const [tzSaved, setTzSaved] = useState(false);
  const [wipingScope, setWipingScope] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState<string | null>(null);
  const [wipeSuccess, setWipeSuccess] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [calendarDensity, setCalendarDensity] = useState<'normal' | 'compact'>('normal');
  const [rechecking, setRechecking] = useState(false);
  const [recheckResult, setRecheckResult] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user/settings')
      .then(res => res.json())
      .then((d: SettingsData) => {
        setData(d);
        setTimezone(d.profile.timezone);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const saved = localStorage.getItem('calendar-density');
    if (saved === 'compact') setCalendarDensity('compact');
  }, []);

  async function saveTimezone(tz: string) {
    setSavingTz(true);
    setTzSaved(false);
    try {
      await fetch('/api/user/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz }),
      });
      localStorage.setItem('tz', tz);
      setTimezone(tz);
      setTzSaved(true);
      setTimeout(() => setTzSaved(false), 2000);
    } catch {} finally {
      setSavingTz(false);
    }
  }

  async function handleWipe(scope: string) {
    setWipingScope(scope);
    setWipeSuccess(null);
    try {
      await fetch('/api/user/wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      setWipeSuccess(scope);
      setConfirmWipe(null);

      // Re-sync after wipe
      setSyncing(true);
      await fetch('/api/sync', { method: 'POST' });
      setSyncing(false);

      // Refresh settings data
      const res = await fetch('/api/user/settings');
      const d = await res.json();
      setData(d);
    } catch {} finally {
      setWipingScope(null);
    }
  }

  function handleDensityChange(d: 'normal' | 'compact') {
    setCalendarDensity(d);
    localStorage.setItem('calendar-density', d);
  }

  async function handleRecheck() {
    setRechecking(true);
    setRecheckResult(null);
    try {
      const res = await fetch('/api/spotify/recheck', { method: 'POST' });
      const data = await res.json();
      setRecheckResult(data.updated ?? 0);
    } catch {
      setRecheckResult(-1);
    } finally {
      setRechecking(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-white/5 rounded" />
          <div className="h-32 bg-white/5 rounded-lg" />
          <div className="h-32 bg-white/5 rounded-lg" />
          <div className="h-32 bg-white/5 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto text-neutral-500 font-mono text-sm">
        Erreur de chargement des paramètres.
      </div>
    );
  }

  const memberSince = new Date(data.profile.createdAt).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="font-mono text-lg font-semibold text-neutral-200 tracking-tight">
          <span className="text-cyan-400">&gt;</span> paramètres
        </h1>
      </div>

      {/* Profile */}
      <section className="rounded-lg border border-white/[0.06] bg-[#111118] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <h2 className="font-mono text-xs font-medium text-neutral-400 uppercase tracking-widest">
            Profil
          </h2>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            {data.profile.avatarUrl ? (
              <img
                src={data.profile.avatarUrl}
                alt={data.profile.username}
                className="w-14 h-14 rounded-full ring-2 ring-white/10"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-cyan-900/30 flex items-center justify-center text-xl font-mono text-cyan-400">
                {data.profile.username[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-mono text-sm font-medium text-neutral-200">
                {data.profile.username}
              </p>
              <p className="font-mono text-[10px] text-neutral-600 mt-0.5">
                github #{data.profile.githubId}
              </p>
              <p className="font-mono text-[10px] text-neutral-600">
                membre depuis {memberSince}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timezone */}
      <section className="rounded-lg border border-white/[0.06] bg-[#111118] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <h2 className="font-mono text-xs font-medium text-neutral-400 uppercase tracking-widest">
            Fuseau horaire
          </h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-neutral-500">
            Détermine la date attribuée à tes commits et écoutes.
          </p>
          <div className="flex items-center gap-3">
            <select
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value);
                saveTimezone(e.target.value);
              }}
              className="bg-[#0a0a0f] border border-white/10 rounded-md px-3 py-2 text-xs font-mono text-neutral-300 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-colors appearance-none cursor-pointer"
            >
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {savingTz && (
              <span className="text-[10px] font-mono text-neutral-600 animate-pulse">
                sauvegarde…
              </span>
            )}
            {tzSaved && (
              <span className="text-[10px] font-mono text-cyan-400">
                ✓ sauvegardé
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Connexions */}
      <section className="rounded-lg border border-white/[0.06] bg-[#111118] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <h2 className="font-mono text-xs font-medium text-neutral-400 uppercase tracking-widest">
            Connexions
          </h2>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {data.plugins.map(plugin => (
            <div key={plugin.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-bold"
                    style={{
                      backgroundColor: plugin.color + '15',
                      color: plugin.color,
                      border: `1px solid ${plugin.color}30`,
                    }}
                  >
                    {plugin.name[0]}
                  </div>
                  <div>
                    <p className="font-mono text-xs font-medium text-neutral-300">
                      {plugin.name}
                    </p>
                    <p className="text-[10px] text-neutral-600 mt-0.5">
                      {plugin.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {plugin.connected ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                      style={{
                        borderColor: plugin.color + '40',
                        color: plugin.color,
                        backgroundColor: plugin.color + '10',
                      }}
                    >
                      connecté
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-neutral-600">
                      non connecté
                    </span>
                  )}
                </div>
              </div>

              {plugin.connected && (
                <div className="mt-3 ml-11 space-y-2">
                  <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-600">
                    <span>
                      {plugin.id === 'github'
                        ? `${data.github.projectCount} projets · ${plugin.eventCount} commits`
                        : `${plugin.eventCount} événements`
                      }
                    </span>
                    {plugin.lastSynced && (
                      <span>
                        dernier sync : {new Date(plugin.lastSynced).toLocaleString('fr-FR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>

                  {/* Wipe button for this plugin */}
                  {confirmWipe === plugin.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-amber-400">
                        effacer {plugin.eventCount} éléments et re-sync ?
                      </span>
                      <button
                        onClick={() => handleWipe(plugin.id)}
                        disabled={wipingScope === plugin.id}
                        className="text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/40 bg-red-950/30 text-red-400 hover:bg-red-950/50 transition-colors disabled:opacity-50"
                      >
                        {wipingScope === plugin.id ? 'suppression…' : 'confirmer'}
                      </button>
                      <button
                        onClick={() => setConfirmWipe(null)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 text-neutral-500 hover:bg-white/5 transition-colors"
                      >
                        annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmWipe(plugin.id)}
                      className="text-[10px] font-mono text-neutral-600 hover:text-amber-400 transition-colors"
                    >
                      effacer les données &amp; re-sync →
                    </button>
                  )}

                  {wipeSuccess === plugin.id && (
                    <p className="text-[10px] font-mono text-cyan-400">
                      ✓ données effacées et re-synchronisées
                    </p>
                  )}

                  {/* Spotify-only: recheck contexts */}
                  {plugin.id === 'spotify' && (
                    <div className="pt-2 border-t border-white/[0.04] mt-2 space-y-1.5">
                      <button
                        onClick={handleRecheck}
                        disabled={rechecking}
                        className="text-[10px] font-mono text-neutral-500 hover:text-[#1DB954] transition-colors disabled:opacity-50"
                      >
                        {rechecking ? (
                          <span className="animate-pulse">re-vérification en cours…</span>
                        ) : (
                          're-vérifier les contextes (liked, playlists) →'
                        )}
                      </button>
                      {recheckResult !== null && recheckResult >= 0 && (
                        <p className="text-[10px] font-mono text-cyan-400">
                          ✓ {recheckResult} track{recheckResult !== 1 ? 's' : ''} mis à jour
                        </p>
                      )}
                      {recheckResult === -1 && (
                        <p className="text-[10px] font-mono text-red-400">
                          erreur lors de la re-vérification
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!plugin.connected && plugin.id !== 'github' && (
                <div className="mt-3 ml-11">
                  <a
                    href={`/api/${plugin.id}/connect`}
                    className="text-[10px] font-mono hover:underline transition-colors"
                    style={{ color: plugin.color }}
                  >
                    connecter {plugin.name} →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Apparence */}
      <section className="rounded-lg border border-white/[0.06] bg-[#111118] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <h2 className="font-mono text-xs font-medium text-neutral-400 uppercase tracking-widest">
            Apparence
          </h2>
        </div>
        <div className="p-5 space-y-4">
          {/* Theme */}
          <div>
            <p className="text-xs font-mono text-neutral-400 mb-2">Thème</p>
            <div className="flex gap-2">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-mono transition-colors border-cyan-400/40 bg-cyan-400/5 text-cyan-400"
              >
                <span className="w-3 h-3 rounded-full bg-[#0a0a0f] ring-1 ring-white/20" />
                sombre
              </button>
              <button
                disabled
                className="flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-mono transition-colors border-white/10 bg-white/[0.02] text-neutral-600 cursor-not-allowed"
              >
                <span className="w-3 h-3 rounded-full bg-neutral-200 ring-1 ring-white/20" />
                clair
                <span className="text-[8px] text-neutral-700 ml-1">bientôt</span>
              </button>
            </div>
          </div>

          {/* Calendar density */}
          <div>
            <p className="text-xs font-mono text-neutral-400 mb-2">Densité calendrier</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDensityChange('normal')}
                className={`px-3 py-2 rounded-md border text-xs font-mono transition-colors ${
                  calendarDensity === 'normal'
                    ? 'border-cyan-400/40 bg-cyan-400/5 text-cyan-400'
                    : 'border-white/10 bg-white/[0.02] text-neutral-500 hover:text-neutral-400 hover:border-white/20'
                }`}
              >
                normal
              </button>
              <button
                onClick={() => handleDensityChange('compact')}
                className={`px-3 py-2 rounded-md border text-xs font-mono transition-colors ${
                  calendarDensity === 'compact'
                    ? 'border-cyan-400/40 bg-cyan-400/5 text-cyan-400'
                    : 'border-white/10 bg-white/[0.02] text-neutral-500 hover:text-neutral-400 hover:border-white/20'
                }`}
              >
                compact
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-lg border border-red-500/20 bg-red-950/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-red-500/10">
          <h2 className="font-mono text-xs font-medium text-red-400/80 uppercase tracking-widest">
            Zone danger
          </h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-neutral-500">
            Supprime toutes les données (commits, écoutes, projets) et relance un sync complet.
          </p>

          {syncing && (
            <p className="text-[10px] font-mono text-cyan-400 animate-pulse">
              re-synchronisation en cours…
            </p>
          )}

          {confirmWipe === 'all' ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-red-400">
                Tout effacer ? Cette action est irréversible.
              </span>
              <button
                onClick={() => handleWipe('all')}
                disabled={wipingScope === 'all'}
                className="px-3 py-1.5 rounded-md border border-red-500/50 bg-red-950/50 text-xs font-mono text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-50"
              >
                {wipingScope === 'all' ? 'suppression…' : 'oui, tout effacer'}
              </button>
              <button
                onClick={() => setConfirmWipe(null)}
                className="px-3 py-1.5 rounded-md border border-white/10 text-xs font-mono text-neutral-500 hover:bg-white/5 transition-colors"
              >
                annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmWipe('all')}
              className="px-3 py-1.5 rounded-md border border-red-500/30 text-xs font-mono text-red-400/70 hover:text-red-400 hover:border-red-500/50 hover:bg-red-950/30 transition-colors"
            >
              tout effacer &amp; re-pull
            </button>
          )}

          {wipeSuccess === 'all' && (
            <p className="text-[10px] font-mono text-cyan-400">
              ✓ toutes les données ont été effacées et re-synchronisées
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
