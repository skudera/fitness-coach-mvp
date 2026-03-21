'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getWeekPlan, getTargetForExercise } from '@/lib/workout-data'
import {
  detectBasketballLoad,
  getFridayOutputLabel,
  getFridayOutputType,
  getFridayOutputWhy,
  getFridayWorkoutFromOutput,
  type FridayOutputType,
} from '@/lib/recovery-governor'
import {
  getWeeklySettings,
  getWeekStartDate,
  loadEquipmentPreferences,
  type WeeklySettingsRow,
} from '@/lib/storage-supabase'

export default function PlanPage() {
  const weekPlan = useMemo(() => getWeekPlan(), [])
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDay()
    return today >= 1 && today <= 5 ? today : 1
  })
  const [weeklySettings, setWeeklySettings] = useState<WeeklySettingsRow | null>(null)
  const [cardioPreference, setCardioPreference] = useState<string | null>(null)

  useEffect(() => {
    async function loadWeekly() {
      try {
        const weekStart = getWeekStartDate()
        const [weekly, prefs] = await Promise.all([
          getWeeklySettings(weekStart),
          loadEquipmentPreferences(),
        ])

        setWeeklySettings(weekly ?? null)
        setCardioPreference(prefs?.cardio_preference ?? null)
      } catch (error) {
        console.error('Plan page weekly settings load error', error)
        setWeeklySettings(null)
        setCardioPreference(null)
      }
    }

    loadWeekly()
  }, [])

  const selectedWorkout =
    weekPlan.find((item) => item.day === selectedDay)?.workout ?? weekPlan[0].workout

  const fridayOutput = useMemo<FridayOutputType | null>(() => {
    if (selectedWorkout.dayName !== 'Friday') return null

    return getFridayOutputType({
      basketballStatus: weeklySettings?.basketball_status ?? null,
      basketballTiming: weeklySettings?.basketball_timing ?? null,
      basketballImpact: weeklySettings?.basketball_impact ?? null,
      fridaySleepQuality: weeklySettings?.friday_sleep_quality ?? null,
      basketballMinutes: weeklySettings?.basketball_minutes ?? null,
      basketballActiveCalories: weeklySettings?.basketball_active_calories ?? null,
      basketballAvgHr: weeklySettings?.basketball_avg_hr ?? null,
    })
  }, [selectedWorkout.dayName, weeklySettings])

  const effectiveWorkout = useMemo(() => {
    if (selectedWorkout.dayName === 'Friday' && fridayOutput) {
      return getFridayWorkoutFromOutput(fridayOutput, cardioPreference)
    }
    return selectedWorkout
  }, [selectedWorkout, fridayOutput, cardioPreference])

  const detectedLoad = useMemo(() => {
    return detectBasketballLoad({
      minutes: weeklySettings?.basketball_minutes ?? 0,
      activeCalories: weeklySettings?.basketball_active_calories ?? 0,
      avgHr: weeklySettings?.basketball_avg_hr ?? 0,
    })
  }, [weeklySettings])

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
        <div className="label">{effectiveWorkout.dayName}</div>
        <h2 className="text-2xl font-semibold text-white">{effectiveWorkout.focus}</h2>
        <p className="text-slate-300">{effectiveWorkout.estimatedMinutes}</p>

        {selectedWorkout.dayName === 'Friday' ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Friday Governor Inputs</div>
            <div className="mt-2 text-sm text-slate-300">
              Basketball happened:{' '}
              <span className="capitalize text-white">
                {weeklySettings?.basketball_status ?? 'not answered'}
              </span>
            </div>

            {weeklySettings?.basketball_status === 'yes' ? (
              <>
                <div className="mt-1 text-sm text-slate-300">
                  Timing:{' '}
                  <span className="capitalize text-white">
                    {weeklySettings?.basketball_timing ?? 'not set'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Minutes:{' '}
                  <span className="text-white">
                    {weeklySettings?.basketball_minutes ?? '—'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Active Calories:{' '}
                  <span className="text-white">
                    {weeklySettings?.basketball_active_calories ?? '—'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Avg HR:{' '}
                  <span className="text-white">
                    {weeklySettings?.basketball_avg_hr ?? '—'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Morning feel:{' '}
                  <span className="capitalize text-white">
                    {weeklySettings?.friday_sleep_quality?.replaceAll('_', ' ') ?? 'not set'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Pain concern:{' '}
                  <span className="capitalize text-white">
                    {weeklySettings?.basketball_impact === 'pain_issue' ? 'yes' : weeklySettings?.basketball_impact === 'no_issue' ? 'no' : 'not set'}
                  </span>
                </div>
                <div className="mt-3 text-sm text-slate-300">
                  Detected Load:{' '}
                  <span className="capitalize text-white">{detectedLoad}</span>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {selectedWorkout.dayName === 'Friday' && fridayOutput ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">{getFridayOutputLabel(fridayOutput)}</div>
            <p className="mt-2 text-slate-100">{getFridayOutputWhy(fridayOutput)}</p>
          </div>
        ) : null}

        <div>
          <div className="label mb-2">Warmup</div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-slate-100">
            {effectiveWorkout.warmup}
          </div>
        </div>

        <div>
          <div className="label mb-2">Exercises</div>
          <div className="space-y-3">
            {effectiveWorkout.exercises.map((exercise) => {
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
            {effectiveWorkout.cardio}
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