'use client'

import Link from 'next/link'
import { getWorkoutForToday } from '@/lib/workout-data'

export default function WorkoutPage() {
  const workout = getWorkoutForToday()

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Workout</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {workout.dayName}: {workout.focus}
        </h1>
        <p className="mt-2 text-slate-300">{workout.estimatedMinutes}</p>
      </div>

      <section className="card space-y-4">
        <div className="label">Warmup</div>
        <p className="text-slate-100">{workout.warmup}</p>
      </section>

      <section className="card space-y-4">
        <div className="label">Today&apos;s exercises</div>
        <div className="space-y-3">
          {workout.exercises.map((exercise) => (
            <div
              key={exercise}
              className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-slate-100"
            >
              {exercise}
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">Cardio</div>
        <p className="text-slate-100">{workout.cardio}</p>
      </section>

      <div className="grid grid-cols-1 gap-4">
        <Link
          href={workout.restDay ? '/progress' : '/workout/log'}
          className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
        >
          {workout.restDay ? 'View Progress' : 'Start Workout'}
        </Link>
      </div>
    </div>
  )
}