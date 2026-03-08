'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutSnapshot } from '@/components/WorkoutSnapshot';
import { demoPlan } from '@/lib/mock-data';
import { getLatestExerciseEntry, loadActiveSession, loadWeeklyPlan, saveActiveSession, saveWorkoutOrder, loadWorkoutOrder } from '@/lib/storage';
import { WorkoutDayPlan } from '@/types';
import { getSuggestedWeight, getSuggestedWeightReason } from '@/rules/progression';

function withSuggestions(workout: WorkoutDayPlan): WorkoutDayPlan {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => {
      const latest = getLatestExerciseEntry(exercise.id);
      const history = latest ? [latest] : undefined;
      return {
        ...exercise,
        suggestedWeight: getSuggestedWeight(history),
        notes: getSuggestedWeightReason(history),
      };
    }),
  };
}

export default function WorkoutPage() {
  const router = useRouter();
  const [baseWorkout, setBaseWorkout] = useState<WorkoutDayPlan>(withSuggestions(demoPlan.days[0]));
  const [order, setOrder] = useState(baseWorkout.exercises);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const savedPlan = loadWeeklyPlan() ?? demoPlan;
    const monday = withSuggestions(savedPlan.days[0]);
    const savedOrder = loadWorkoutOrder(monday.dayName);
    const exercises = savedOrder
      ? savedOrder.map((id) => monday.exercises.find((ex) => ex.id === id)).filter(Boolean) as typeof monday.exercises
      : monday.exercises;
    setBaseWorkout(monday);
    setOrder(exercises);
    setStarted(Boolean(loadActiveSession()));
  }, []);

  const equipmentGroups = useMemo(() => [...new Set(order.map((exercise) => exercise.equipmentGroup))], [order]);
  const workout = { ...baseWorkout, exercises: order };

  function move(index: number, direction: 'up' | 'down') {
    const next = [...order];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setOrder(next);
    saveWorkoutOrder(workout.dayName, next.map((x) => x.id));
  }

  function startWorkout() {
    saveWorkoutOrder(workout.dayName, order.map((x) => x.id));
    saveActiveSession({ dayName: workout.dayName, startedAt: new Date().toISOString() });
    setStarted(true);
    router.push('/workout/warmup');
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="label">Workout</div>
        <h1 className="text-2xl font-semibold">Pre-workout snapshot</h1>
      </div>

      <WorkoutSnapshot workout={workout} />

      <div className="card space-y-3">
        <div>
          <div className="label">Optional reordering</div>
          <p className="mt-1 text-sm text-slate-400">Arrange exercises in the order you want. The app saves this and uses it next time.</p>
        </div>
        <div className="space-y-2">
          {order.map((exercise, index) => (
            <div key={exercise.id} className="flex items-center justify-between rounded-xl bg-slate-800/60 px-3 py-2">
              <div>
                <div className="font-medium">{index + 1}. {exercise.name}</div>
                <div className="text-xs text-slate-400">{exercise.equipmentGroup}</div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-slate-700 px-2 py-1 text-xs" onClick={() => move(index, 'up')}>Up</button>
                <button className="rounded-lg bg-slate-700 px-2 py-1 text-xs" onClick={() => move(index, 'down')}>Down</button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-500">Detected equipment zones today: {equipmentGroups.join(', ')}</div>
      </div>

      <button onClick={startWorkout} className="block w-full rounded-2xl bg-white px-4 py-3 text-center font-medium text-slate-950">{started ? 'Restart workout from warmup' : 'Start workout'}</button>
    </div>
  );
}
