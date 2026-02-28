'use client';

import { useEffect, useState } from 'react';

export function TimezoneDetector() {
  const [prompt, setPrompt] = useState<{ current: string; detected: string } | null>(null);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const saved = localStorage.getItem('tz');

    if (!detected) return;

    if (!saved) {
      // First visit — save silently
      saveTimezone(detected);
    } else if (detected !== saved) {
      // Timezone changed (travel) — ask user
      setPrompt({ current: saved, detected });
    }
  }, []);

  function saveTimezone(tz: string) {
    fetch('/api/user/timezone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: tz }),
    }).then(() => {
      localStorage.setItem('tz', tz);
    }).catch(() => {});
  }

  function handleKeep() {
    setPrompt(null);
  }

  function handleUpdate() {
    if (prompt) {
      saveTimezone(prompt.detected);
    }
    setPrompt(null);
  }

  if (!prompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-md p-4 shadow-2xl">
        <p className="text-xs font-mono text-neutral-300 mb-1">
          Fuseau horaire modifi&eacute;
        </p>
        <p className="text-[10px] font-mono text-neutral-500 mb-3">
          <span className="text-neutral-400">{prompt.current}</span>
          {' → '}
          <span className="text-cyan-400">{prompt.detected}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            className="flex-1 px-3 py-1.5 rounded text-[10px] font-mono bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 transition-colors"
          >
            Mettre &agrave; jour
          </button>
          <button
            onClick={handleKeep}
            className="flex-1 px-3 py-1.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10 transition-colors"
          >
            Garder {prompt.current.split('/').pop()}
          </button>
        </div>
      </div>
    </div>
  );
}
