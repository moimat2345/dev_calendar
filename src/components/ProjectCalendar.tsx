'use client';

import { useState, useEffect } from 'react';
import { MonthNav } from './MonthNav';
import { getMonthName, getDaysInMonth, getFirstDayOfMonth, getActivityLevel } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface ProjectDay {
  date: string;
  commitCount: number;
}

interface ProjectCalendarProps {
  slug: string;
  initialYear: number;
  initialMonth: number;
  initialDays: ProjectDay[];
}

const levelColors = [
  'bg-neutral-900/50',
  'bg-emerald-900/40 shadow-sm shadow-emerald-900/20',
  'bg-emerald-700/40 shadow-sm shadow-emerald-700/20',
  'bg-cyan-600/40 shadow-sm shadow-cyan-600/20',
  'bg-cyan-400/50 shadow-md shadow-cyan-400/30',
];

export function ProjectCalendar({ slug, initialYear, initialMonth, initialDays }: ProjectCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState<ProjectDay[]>(initialDays);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (year === initialYear && month === initialMonth) {
      setDays(initialDays);
      return;
    }

    setLoading(true);
    fetch(`/api/project/${slug}?year=${year}&month=${month}`)
      .then(res => res.json())
      .then(data => {
        setDays(data.days || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, month, slug, initialYear, initialMonth, initialDays]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const dayMap = new Map<string, number>();
  for (const d of days) {
    dayMap.set(d.date, d.commitCount);
  }

  const handlePrev = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else { setMonth(m => m - 1); }
  };

  const handleNext = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else { setMonth(m => m + 1); }
  };

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(<div key={`empty-${i}`} className="aspect-square" />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = dayMap.get(dateStr) || 0;
    const level = getActivityLevel(count);
    const isToday = dateStr === new Date().toISOString().split('T')[0];

    cells.push(
      <button
        key={dateStr}
        onClick={() => count > 0 && router.push(`/dashboard/project/${slug}/day/${dateStr}`)}
        className={`
          aspect-square rounded-md p-1.5 flex flex-col justify-between
          transition-all duration-200 border
          ${levelColors[level]}
          ${isToday ? 'border-cyan-400/60 ring-1 ring-cyan-400/30' : 'border-white/5'}
          ${count > 0 ? 'cursor-pointer hover:border-cyan-500/30' : 'cursor-default'}
        `}
      >
        <span className={`text-xs font-mono ${isToday ? 'text-cyan-400' : 'text-neutral-400'}`}>
          {d}
        </span>
        {count > 0 && (
          <span className="text-[10px] font-mono text-cyan-300/80 text-right">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <MonthNav month={month} year={year} onPrev={handlePrev} onNext={handleNext} />
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center text-xs font-mono text-neutral-500 py-2">{day}</div>
        ))}
      </div>
      <div className={`grid grid-cols-7 gap-1 transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`}>
        {cells}
      </div>
    </div>
  );
}
