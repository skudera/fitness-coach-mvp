'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getWorkoutForToday } from '@/lib/workout-data'
import {
  getLocalDateString,
  getWeekStartDate,
  getWeeklySettings,
  loadCompletedSessionsFromSupabase,
  type CompletedSessionRow,
} from '@/lib/storage-supabase'
import { loadWorkoutProgress } from '@/lib/workout-log-state'

function getResolvedThursdayCardio(status: string) {
  if (status === 'yes') return 'Skip cardio if basketball happens'
  if (status === 'no') return 'Elliptical – 10 min'
  return 'Cardio optional depending on basketball'
}

export default function WorkoutPage() {
  const workout = getWorkoutForToday()
  const [hasInProgressWorkout, setHasInProgressWorkout] = useState(false)
  const [basketballStatus, setBasketballStatus] = useState('unsure')
  const [completedToday, setCompletedToday] = useState<CompletedSessionRow | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const date = getLocalDateString()
        const saved = loadWorkoutProgress(date, workout.dayName)
        setHasInProgressWorkout(Boolean(saved))

        const weekStart = getWeekStartDate()
        const weekly = await getWeeklySettings(weekStart)
        setBasketballStatus(weekly?.basketball_status ?? 'unsure')

        const sessions = await loadCompletedSessionsFromSupabase()
        const todays = (sessions ?? []).filter(
          (session) => session.date === date && (session.duration_minutes ?? 0) >= 5
        )
        setCompletedToday(todays[0] ?? null)
      } catch (error) {
        console.error('Workout page load error', error)
        setHasInProgressWorkout(false)
        setBasketballStatus('unsure')
        setCompletedToday(null)
      } finally {
        setLoaded(true)
      }
    }

    load()
  }, [workout.dayName])

  const cardioText = useMemo(() => {
    if (workout.dayName === 'Thursday') {
      return getResolvedThursdayCardio(basketballStatus)
    }
    return workout.cardio
  }, [workout.dayName, workout.cardio, basketballStatus])

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

      {completedToday ? (
        <section className="card space-y-4 border border-emerald-500/30">
          <div className="label">Completed</div>
          <p className="text-slate-100">
            Today’s workout has already been completed.
          </p>
          <p className="text-sm text-slate-400">
            Duration: {completedToday.duration_minutes ?? '—'} min
          </p>
        </section>
      ) : hasInProgressWorkout ? (
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
        <p className="text-slate-100">{cardioText}</p>
      </section>

      {!loaded ? null : completedToday ? (
        <Link
          href="/progress"
          className="block w-full rounded-[1.75rem] bg-slate-800 px-5 py-5 text-center text-[1rem] font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          View Progress
        </Link>
      ) : (
        <Link
          href="/workout/log"
          className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
        >
          {hasInProgressWorkout ? 'Resume Workout' : 'Start Workout'}
        </Link>
      )}
    </div>
  )
}