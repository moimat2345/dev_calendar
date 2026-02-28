'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

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
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-neutral-400 hover:text-cyan-400 hover:bg-white/5 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              paramètres
            </Link>
            <div className="border-t border-white/10 my-1" />
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
