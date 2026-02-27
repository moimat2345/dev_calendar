'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

interface UserNavProps {
  username: string;
  avatarUrl?: string | null;
}

export function UserNav({ username, avatarUrl }: UserNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="w-6 h-6 rounded-full ring-1 ring-white/10" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-cyan-900/50 flex items-center justify-center text-xs font-mono text-cyan-400">
            {username[0].toUpperCase()}
          </div>
        )}
        <span className="text-xs font-mono text-neutral-400">{username}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-neutral-900 border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px]">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full text-left px-3 py-2 text-xs font-mono text-neutral-400 hover:text-red-400 hover:bg-white/5 transition-colors"
            >
              sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
