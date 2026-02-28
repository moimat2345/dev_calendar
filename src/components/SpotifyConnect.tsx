'use client';

import { useEffect, useState } from 'react';

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export function SpotifyConnect() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch('/api/spotify/status')
      .then(res => res.json())
      .then(data => {
        setStatus(data.connected ? 'connected' : 'disconnected');

        if (!data.connected) return;

        // Auto-sync if never synced OR last sync was > 2h ago
        const shouldSync = !data.lastSynced
          || (Date.now() - new Date(data.lastSynced).getTime()) > STALE_THRESHOLD_MS;

        if (shouldSync) {
          setSyncing(true);
          fetch('/api/sync', { method: 'POST' })
            .then(res => res.json())
            .then(() => {
              // Refresh the page to show new data
              window.location.reload();
            })
            .catch(err => console.error('Auto-sync failed:', err))
            .finally(() => setSyncing(false));
        }
      })
      .catch(() => setStatus('disconnected'));
  }, []);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/spotify/disconnect', { method: 'DELETE' });
      setStatus('disconnected');
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="w-6 h-6 rounded bg-white/5 animate-pulse" />
    );
  }

  if (status === 'connected') {
    return (
      <button
        onClick={handleDisconnect}
        disabled={disconnecting}
        className="group flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono transition-all duration-200 border border-[#1DB954]/30 bg-[#1DB954]/10 text-[#1DB954] hover:border-red-500/40 hover:bg-red-950/20 hover:text-red-400"
        title="Disconnect Spotify"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
        <span className="group-hover:hidden">{syncing ? 'syncing…' : 'spotify'}</span>
        <span className="hidden group-hover:inline">disconnect</span>
      </button>
    );
  }

  return (
    <a
      href="/api/spotify/connect"
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono transition-all duration-200 border border-white/10 bg-white/[0.02] text-neutral-500 hover:border-[#1DB954]/40 hover:bg-[#1DB954]/10 hover:text-[#1DB954]"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
      + spotify
    </a>
  );
}
