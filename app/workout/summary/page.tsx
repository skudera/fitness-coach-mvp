'use client';

import Link from 'next/link';
import { loadCompletedSessions, loadWeeklyPlan } from '@/lib/storage';
import { demoPlan } from '@/lib/mock-data';

export default function WorkoutSummaryPage() {
  const plan = loadWeeklyPlan() ?? demoPlan;
  const workout = plan.days[0];
  const latestSession = loadCompletedSessions().at(-1) ?? null;
  const totalMinutes = latestSession?.totalMinutes ?? null;

  const timingMessage = totalMinutes === null
    ? 'Workout saved, but no session timing was found.'
    : totalMinutes > 80
      ? 'This ran long. The planner can trim future sessions if this pattern continues.'
      : totalMinutes < 65
        ? 'This finished quickly. The planner can add work if this becomes a pattern.'
        : 'This is in a good range for the 75-minute target.';

  return (
    <div className="space-y-4">
      <div>
        <div className="label">Workout summary</div>
        <h1 className="text-2xl font-semibold">Session complete</h1>
      </div>

      <div className="card space-y-2">
        <div className="label">Today’s recap</div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
          <li>{workout.exercises.length} prescribed strength exercises in today’s plan.</li>
          <li>{workout.cardio ? `${workout.cardio.machine}: ${workout.cardio.minutes} min at HR ${workout.cardio.hrTarget}.` : 'No cardio was prescribed today.'}</li>
          <li>{totalMinutes !== null ? `Session length: ${totalMinutes} minutes.` : 'Session timer not found yet.'}</li>
        </ul>
        <p className="text-sm text-slate-400">{timingMessage}</p>
      </div>

      <Link href="/" className="block w-full rounded-2xl bg-emerald-500 px-4 py-3 text-center font-medium text-slate-950">Back to home</Link>
    </div>
  );
}
