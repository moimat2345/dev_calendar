'use client';

import { useRouter } from 'next/navigation';
import { getActivityLevel } from '@/lib/utils';
import type { DayActivity } from '@/lib/types';

interface CalendarDayProps {
  date: string;
  day: number;
  activity?: DayActivity;
}

const levelColors = [
  'bg-neutral-900/50 hover:bg-neutral-800/50',           // 0: no activity
  'bg-emerald-900/40 hover:bg-emerald-800/50 shadow-sm shadow-emerald-900/20',  // 1: low
  'bg-emerald-700/40 hover:bg-emerald-600/50 shadow-sm shadow-emerald-700/20',  // 2: medium
  'bg-cyan-600/40 hover:bg-cyan-500/50 shadow-sm shadow-cyan-600/20',           // 3: high
  'bg-cyan-400/50 hover:bg-cyan-300/60 shadow-md shadow-cyan-400/30',           // 4: very high
];

export function CalendarDay({ date, day, activity }: CalendarDayProps) {
  const router = useRouter();
  const weight = activity?.totalWeight ?? activity?.totalCommits ?? 0;
  const level = getActivityLevel(weight);
  const isToday = date === new Date().toLocaleDateString('en-CA');
  const hasActivity = weight > 0;

  return (
    <button
      onClick={() => hasActivity && router.push(`/dashboard/day/${date}`)}
      className={`
        aspect-square rounded-md p-1.5 flex flex-col justify-between
        transition-all duration-200 border
        ${levelColors[level]}
        ${isToday ? 'border-cyan-400/60 ring-1 ring-cyan-400/30' : 'border-white/5'}
        ${hasActivity ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <span className={`text-xs font-mono ${isToday ? 'text-cyan-400' : 'text-neutral-400'}`}>
        {day}
      </span>

      {hasActivity && (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-mono text-cyan-300/80">
            {weight}
          </span>
          {/* Source dots — one colored dot per plugin */}
          <div className="flex gap-0.5 flex-wrap justify-end">
            {activity?.sources?.map((source) => (
              <div
                key={source.pluginId}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: source.color + 'B3' }}
                title={source.label}
              />
            ))}
            {/* Fallback: project dots if no sources yet */}
            {!activity?.sources?.length && activity?.projects.slice(0, 4).map((p) => (
              <div
                key={p.slug}
                className="w-1.5 h-1.5 rounded-full bg-cyan-400/70"
                title={p.name}
              />
            ))}
          </div>
        </div>
      )}
    </button>
  );
}
