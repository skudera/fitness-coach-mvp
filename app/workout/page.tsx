'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getWorkoutForToday } from '@/lib/workout-data'
import { getLocalDateString } from '@/lib/storage-supabase'
import { loadWorkoutProgress } from '@/lib/workout-log-state'

export default function WorkoutPage() {
  const workout = getWorkoutForToday()
  const [hasInProgressWorkout, setHasInProgressWorkout] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const date = getLocalDateString()
    const saved = loadWorkoutProgress(date, workout.dayName)
    setHasInProgressWorkout(Boolean(saved))
  }, [workout.dayName])

  if (workout.restDay) {
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
          <div className="label">Today</div>
          <p className="text-slate-100">
            This is a recovery / mobility day. No structured lifting log is required.
          </p>
        </section>

        <Link
          href="/progress"
          className="block w-full rounded-[1.75rem] bg-white px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          View Progress
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Workout</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {workout.dayName}: {workout.focus}
        </h1>
        <p className="mt-2 text-slate-300">{workout.estimatedMinutes}</p>
      </div>

      {hasInProgressWorkout ? (
        <section className="card space-y-4 border border-emerald-500/30">
          <div className="label">In progress</div>
          <p className="text-slate-100">
            You have an in-progress workout saved. You can resume right where you left off.
          </p>
        </section>
      ) : null}

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
          href="/workout/log"
          className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
        >
          {hasInProgressWorkout ? 'Resume Workout' : 'Start Workout'}
        </Link>
      </div>
    </div>
  )
}