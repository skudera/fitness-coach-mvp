'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getWeekPlan, getTargetForExercise } from '@/lib/workout-data'
import { getWeeklySettings, getWeekStartDate } from '@/lib/storage-supabase'

export default function PlanPage() {
  const weekPlan = useMemo(() => getWeekPlan(), [])
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDay()
    return today >= 1 && today <= 5 ? today : 1
  })
  const [basketballStatus, setBasketballStatus] = useState('unsure')

  useEffect(() => {
    async function loadWeekly() {
      try {
        const weekStart = getWeekStartDate()
        const weekly = await getWeeklySettings(weekStart)
        setBasketballStatus(weekly?.basketball_status ?? 'unsure')
      } catch (error) {
        console.error('Plan page weekly settings load error', error)
        setBasketballStatus('unsure')
      }
    }

    loadWeekly()
  }, [])

  const selectedWorkout =
    weekPlan.find((item) => item.day === selectedDay)?.workout ?? weekPlan[0].workout

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Weekly Plan</div>
        <h1 className="text-2xl font-semibold tracking-tight">Preview your workouts</h1>
        <p className="mt-2 text-slate-300">
          Select a day to view the full workout plan.
        </p>
      </div>

      <section className="card space-y-4">
        <div className="label">This Week</div>
        <div className="grid grid-cols-5 gap-2">
          {weekPlan.map(({ day, workout }) => {
            const active = selectedDay === day
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {workout.dayName.slice(0, 3)}
              </button>
            )
          })}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">{selectedWorkout.dayName}</div>
        <h2 className="text-2xl font-semibold text-white">{selectedWorkout.focus}</h2>
        <p className="text-slate-300">{selectedWorkout.estimatedMinutes}</p>

        {selectedWorkout.dayName === 'Thursday' ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Basketball This Week</div>
            <div className="mt-2 text-[1.1rem] font-semibold text-white capitalize">
              {basketballStatus}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Thursday still includes a workout. Basketball is treated as bonus activity.
            </p>
          </div>
        ) : null}

        <div>
          <div className="label mb-2">Warmup</div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-slate-100">
            {selectedWorkout.warmup}
          </div>
        </div>

        <div>
          <div className="label mb-2">Exercises</div>
          <div className="space-y-3">
            {selectedWorkout.exercises.map((exercise) => {
              const target = getTargetForExercise(exercise)
              return (
                <div
                  key={exercise}
                  className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-slate-100">{exercise}</div>
                    <div className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                      {target.sets} × {target.reps}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
<div className="label mb-2">Cardio</div>

<div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-slate-100">
  {selectedWorkout.dayName === 'Thursday'
    ? basketballStatus === 'yes'
      ? 'Skip cardio if basketball happens'
      : basketballStatus === 'unsure'
      ? 'Cardio optional depending on basketball'
      : 'Elliptical – 10 min'
    : selectedWorkout.cardio}
</div>
        </div>
      </section>

      <Link
        href="/workout"
        className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
      >
        Go to Workout
      </Link>
    </div>
  )
}