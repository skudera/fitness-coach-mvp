'use client';

import { useEffect, useState } from 'react';
import { demoPlan } from '@/lib/mock-data';
import { loadCompletedSessions, loadWeeklyPlan } from '@/lib/storage';

export default function MorePage() {
  const [plan, setPlan] = useState(demoPlan);
  const [avgDuration, setAvgDuration] = useState<string>('—');

  useEffect(() => {
    setPlan(loadWeeklyPlan() ?? demoPlan);
    const sessions = loadCompletedSessions();
    if (sessions.length) {
      const avg = Math.round(sessions.reduce((sum, s) => sum + s.totalMinutes, 0) / sessions.length);
      setAvgDuration(`${avg} min`);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="label">More</div>
        <h1 className="text-2xl font-semibold">Weekly plan & settings</h1>
      </div>

      <div className="card space-y-3">
        <div className="label">This week</div>
        <div className="space-y-2 text-sm text-slate-200">
          {plan.days.map((day) => (
            <div key={day.dayName} className="rounded-xl bg-slate-800/60 px-3 py-2">
              <div className="font-medium">{day.dayName} — {day.focus}</div>
              <div className="text-slate-400">{day.estimatedMinutes} min planned</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="label">Timing insight</div>
        <p className="mt-2 text-sm text-slate-300">Average completed workout duration: {avgDuration}</p>
      </div>
    </div>
  );
}
