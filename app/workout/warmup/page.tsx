'use client';

import Link from 'next/link';
import { ProgressBar } from '@/components/ProgressBar';
import { demoPlan } from '@/lib/mock-data';
import { loadWeeklyPlan } from '@/lib/storage';

export default function WarmupPage() {
  const plan = loadWeeklyPlan() ?? demoPlan;
  const workout = plan.days[0];

  return (
    <div className="space-y-4">
      <div>
        <div className="label">Warmup</div>
        <h1 className="text-2xl font-semibold">Start here</h1>
        <p className="mt-1 text-sm text-slate-400">Complete the warmup below, then move into exercise 1.</p>
      </div>

      <ProgressBar currentIndex={-1} totalExercises={workout.exercises.length} />

      <div className="card space-y-3">
        <div className="label">Today's warmup</div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-200">
          {workout.warmup.map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ul>
      </div>

      <Link href="/workout/exercise/0" className="block w-full rounded-2xl bg-white px-4 py-3 text-center font-medium text-slate-950">
        Next: Exercise 1
      </Link>
    </div>
  );
}
