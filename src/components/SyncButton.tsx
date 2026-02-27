'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        // Show per-plugin results
        const parts = Object.entries(data.results || {})
          .filter(([, r]: [string, any]) => r.newEvents > 0)
          .map(([id, r]: [string, any]) => `+${r.newEvents} ${id}`);
        setResult(parts.length > 0 ? parts.join(', ') : 'up to date');
        router.refresh();
      } else {
        setResult('Sync failed');
      }
    } catch {
      setResult('Error');
    } finally {
      setSyncing(false);
      setTimeout(() => setResult(null), 3000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`
          px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-200
          border border-cyan-500/30
          ${syncing
            ? 'bg-cyan-900/20 text-cyan-600 cursor-wait'
            : 'bg-cyan-950/30 text-cyan-400 hover:bg-cyan-900/30 hover:border-cyan-400/50'
          }
        `}
      >
        {syncing ? (
          <span className="flex items-center gap-1.5">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            syncing...
          </span>
        ) : (
          '↻ sync'
        )}
      </button>

      {result && (
        <span className="text-xs font-mono text-emerald-400 animate-pulse">
          {result}
        </span>
      )}
    </div>
  );
}
