'use client';

import { getMonthName } from '@/lib/utils';

interface MonthNavProps {
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthNav({ month, year, onPrev, onNext }: MonthNavProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={onPrev}
        className="p-2 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-cyan-400"
        aria-label="Previous month"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <h2 className="text-xl font-mono tracking-wider text-neutral-100">
        <span className="text-cyan-400">{getMonthName(month)}</span>
        <span className="text-neutral-500 ml-2">{year}</span>
      </h2>

      <button
        onClick={onNext}
        className="p-2 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-cyan-400"
        aria-label="Next month"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
