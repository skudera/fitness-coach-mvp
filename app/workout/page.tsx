'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getWorkoutForToday } from '@/lib/workout-data'
import {
  getLocalDateString,
  getTomorrowWorkoutLabel,
  loadCompletedSessionsFromSupabase,
  type CompletedSessionRow,
} from '@/lib/storage-supabase'
import { loadWorkoutProgress } from '@/lib/workout-log-state'

export default function WorkoutPage() {
  const workout = getWorkoutForToday()
  const [hasInProgressWorkout, setHasInProgressWorkout] = useState(false)
  const [sessions, setSessions] = useState<CompletedSessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const date = getLocalDateString()
    const saved = loadWorkoutProgress(date, workout.dayName)
    setHasInProgressWorkout(Boolean(saved))
  }, [workout.dayName])

  useEffect(() => {
    async function load() {
      try {
        const rows = await loadCompletedSessionsFromSupabase()
        setSessions(Array.isArray(rows) ? rows : [])
      } catch (error) {
        console.error('Workout page session load error', error)
        setSessions([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const todayDate = getLocalDateString()

  const todayCompletedSession = useMemo(() => {
    return (
      sessions.find(
        (session) =>
          session.date === todayDate && (session.duration_minutes ?? 0) >= 5
      ) ?? null
    )
  }, [sessions, todayDate])

  const nextWorkoutLabel = getTomorrowWorkoutLabel()

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

  if (!loading && todayCompletedSession) {
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
          <div className="label">Status</div>
          <h2 className="text-2xl font-semibold text-white">
            Workout completed ✅
          </h2>
          <p className="text-slate-300">
            You already finished today&apos;s workout.
          </p>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="label">Actual duration</div>
            <div className="mt-2 text-[1.7rem] font-semibold text-emerald-400">
              {todayCompletedSession.duration_minutes} min
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Next up</div>
            <div className="mt-2 text-[1.1rem] font-semibold text-white">
              {nextWorkoutLabel}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/progress"
            className="block w-full rounded-[1.75rem] bg-white px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            View Progress
          </Link>

          <Link
            href="/"
            className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
          >
            Back Home
          </Link>
        </div>
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