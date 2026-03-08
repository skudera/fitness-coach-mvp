'use client';

import { useRouter } from 'next/navigation';
import { ProgressBar } from '@/components/ProgressBar';
import { demoPlan } from '@/lib/mock-data';
import { clearActiveSession, loadActiveSession, loadCompletedSessions, loadWeeklyPlan, saveCompletedSessions } from '@/lib/storage';

export default function CardioPage() {
  const router = useRouter();
  const plan = loadWeeklyPlan() ?? demoPlan;
  const workout = plan.days[0];

  function finishWorkout() {
    const active = loadActiveSession();
    if (!active) {
      router.push('/workout/summary');
      return;
    }

    const total = Math.max(1, Math.round((Date.now() - new Date(active.startedAt).getTime()) / 60000));
    const sessions = loadCompletedSessions();
    sessions.push({
      dayName: active.dayName,
      startedAt: active.startedAt,
      completedAt: new Date().toISOString(),
      totalMinutes: total,
      cardioCompleted: Boolean(workout.cardio),
    });
    saveCompletedSessions(sessions);
    clearActiveSession();
    router.push('/workout/summary');
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="label">Cardio</div>
        <h1 className="text-2xl font-semibold">Finish the session</h1>
        <p className="mt-1 text-sm text-slate-400">Complete the cardio prescription, then tap finish.</p>
      </div>

      <ProgressBar currentIndex={workout.exercises.length} totalExercises={workout.exercises.length} />

      <div className="card space-y-3">
        {workout.cardio ? (
          <>
            <div className="label">Today's cardio</div>
            <div className="text-lg font-semibold text-white">{workout.cardio.machine}</div>
            <div className="text-sm text-slate-300">{workout.cardio.minutes} minutes</div>
            <div className="text-sm text-slate-400">Target HR: {workout.cardio.hrTarget}</div>
          </>
        ) : (
          <>
            <div className="label">No cardio prescribed</div>
            <div className="text-sm text-slate-300">You can finish the workout now.</div>
          </>
        )}
      </div>

      <button onClick={finishWorkout} className="block w-full rounded-2xl bg-emerald-500 px-4 py-3 text-center font-medium text-slate-950">
        Finish workout
      </button>
    </div>
  );
}
