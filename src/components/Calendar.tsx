'use client';

import { useState, useEffect } from 'react';
import { CalendarDay } from './CalendarDay';
import { MonthNav } from './MonthNav';
import { getMonthName, getDaysInMonth, getFirstDayOfMonth } from '@/lib/utils';
import type { DayActivity } from '@/lib/types';

interface CalendarProps {
  initialYear: number;
  initialMonth: number;
  initialDays: DayActivity[];
}

export function Calendar({ initialYear, initialMonth, initialDays }: CalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState<DayActivity[]>(initialDays);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (year === initialYear && month === initialMonth) {
      setDays(initialDays);
      return;
    }

    setLoading(true);
    fetch(`/api/activity?year=${year}&month=${month}`)
      .then(res => res.json())
      .then(data => {
        setDays(data.days || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, month, initialYear, initialMonth, initialDays]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  // Adjust for Monday start (0=Mon, 6=Sun)
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const activityMap = new Map<string, DayActivity>();
  for (const day of days) {
    activityMap.set(day.date, day);
  }

  const handlePrev = () => {
    if (month === 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    cells.push(<div key={`empty-${i}`} className="aspect-square" />);
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const activity = activityMap.get(dateStr);
    cells.push(
      <CalendarDay
        key={dateStr}
        date={dateStr}
        day={d}
        activity={activity}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <MonthNav
        month={month}
        year={year}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center text-xs font-mono text-neutral-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`grid grid-cols-7 gap-1 transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`}>
        {cells}
      </div>
    </div>
  );
}
