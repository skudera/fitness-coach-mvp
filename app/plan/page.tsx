'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getWorkoutForToday } from '@/lib/workout-data'
import {
  detectBasketballLoad,
  getFridayOutputLabel,
  getFridayOutputType,
  getFridayOutputWhy,
  getFridayWorkoutFromOutput,
  getGymAntiOfficeExercises,
  getHomeAntiOfficeExercises,
  type BasketballImpact,
  type BasketballTiming,
  type FridayOutputType,
  type FridaySleepQuality,
} from '@/lib/recovery-governor'
import {
  getLocalDateString,
  getWeekStartDate,
  getWeeklySettings,
  loadCompletedSessionsFromSupabase,
  loadEquipmentPreferences,
  saveWeeklyRecoverySettings,
  type CompletedSessionRow,
  type WeeklySettingsRow,
} from '@/lib/storage-supabase'
import { loadWorkoutProgress } from '@/lib/workout-log-state'

type OptionValue = string | null

function OptionGroup({
  title,
  options,
  value,
  onSelect,
  danger = false,
}: {
  title: string
  options: Array<{ label: string; value: string }>
  value: OptionValue
  onSelect: (value: string) => void
  danger?: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="label">{title}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? danger && option.value === 'pain_issue'
                    ? 'bg-rose-500 text-white'
                    : 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null | undefined
  onChange: (next: number | null) => void
}) {
  return (
    <div>
      <div className="label mb-2">{label}</div>
      <input
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value.trim()
          onChange(raw ? Number(raw) : null)
        }}
        inputMode="numeric"
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
      />
    </div>
  )
}

export default function WorkoutPage() {
  const baseWorkout = getWorkoutForToday()
  const [hasInProgressWorkout, setHasInProgressWorkout] = useState(false)
  const [weeklySettings, setWeeklySettings] = useState<WeeklySettingsRow | null>(null)
  const [cardioPreference, setCardioPreference] = useState<string | null>(null)
  const [completedToday, setCompletedToday] = useState<CompletedSessionRow | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const date = getLocalDateString()
        const saved = loadWorkoutProgress(date, baseWorkout.dayName)
        setHasInProgressWorkout(Boolean(saved))

        const weekStart = getWeekStartDate()
        const [weekly, sessions, prefs] = await Promise.all([
          getWeeklySettings(weekStart),
          loadCompletedSessionsFromSupabase(),
          loadEquipmentPreferences(),
        ])

        setWeeklySettings(weekly ?? null)
        setCardioPreference(prefs?.cardio_preference ?? null)

        const todays = (sessions ?? []).filter(
          (session) => session.date === date && (session.duration_minutes ?? 0) >= 5
        )
        setCompletedToday(todays[0] ?? null)
      } catch (error) {
        console.error('Workout page load error', error)
        setHasInProgressWorkout(false)
        setWeeklySettings(null)
        setCardioPreference(null)
        setCompletedToday(null)
      } finally {
        setLoaded(true)
      }
    }

    load()
  }, [baseWorkout.dayName])

  async function saveRecoveryUpdate(updates: Partial<WeeklySettingsRow>) {
    try {
      setSaving(true)
      const weekStart = getWeekStartDate()
      await saveWeeklyRecoverySettings(weekStart, updates)
      const refreshed = await getWeeklySettings(weekStart)
      setWeeklySettings(refreshed)
    } catch (error) {
      console.error('Recovery update save error', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleBasketballStatusChange(value: 'yes' | 'no') {
    if (value === 'no') {
      await saveRecoveryUpdate({
        basketball_status: 'no',
        basketball_timing: null,
        basketball_impact: null,
        basketball_minutes: null,
        basketball_active_calories: null,
        basketball_avg_hr: null,
        friday_sleep_quality: null,
      })
      return
    }

    await saveRecoveryUpdate({
      basketball_status: 'yes',
    })
  }

  const isFriday = baseWorkout.dayName === 'Friday'

  const detectedLoad = useMemo(() => {
    return detectBasketballLoad({
      minutes: weeklySettings?.basketball_minutes ?? 0,
      activeCalories: weeklySettings?.basketball_active_calories ?? 0,
      avgHr: weeklySettings?.basketball_avg_hr ?? 0,
    })
  }, [weeklySettings])

  const hasBasketballData = useMemo(() => {
    return (
      weeklySettings?.basketball_minutes != null &&
      weeklySettings?.basketball_active_calories != null &&
      weeklySettings?.basketball_avg_hr != null &&
      weeklySettings?.friday_sleep_quality != null
    )
  }, [weeklySettings])

  const fridayOutput = useMemo<FridayOutputType | null>(() => {
    if (!isFriday) return null

    return getFridayOutputType({
      basketballStatus: weeklySettings?.basketball_status ?? null,
      basketballTiming: weeklySettings?.basketball_timing ?? null,
      basketballImpact: weeklySettings?.basketball_impact ?? null,
      fridaySleepQuality: weeklySettings?.friday_sleep_quality ?? null,
      basketballMinutes: weeklySettings?.basketball_minutes ?? null,
      basketballActiveCalories: weeklySettings?.basketball_active_calories ?? null,
      basketballAvgHr: weeklySettings?.basketball_avg_hr ?? null,
    })
  }, [isFriday, weeklySettings])

  const effectiveWorkout = useMemo(() => {
    if (isFriday && fridayOutput) {
      return getFridayWorkoutFromOutput(fridayOutput, cardioPreference)
    }
    return baseWorkout
  }, [baseWorkout, isFriday, fridayOutput, cardioPreference])

  const guidedHomeFlow = useMemo(() => getHomeAntiOfficeExercises(), [])
  const guidedGymFlow = useMemo(() => getGymAntiOfficeExercises(), [])

  const showFridayDecisionGate = isFriday && !completedToday
  const basketballHappened = weeklySettings?.basketball_status === 'yes'
  const noBasketball = weeklySettings?.basketball_status === 'no'

  const isRecoveryOverride =
    fridayOutput === 'gym_anti_office' ||
    fridayOutput === 'home_anti_office' ||
    fridayOutput === 'walk_only' ||
    fridayOutput === 'full_rest'

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Workout</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {effectiveWorkout.dayName}: {effectiveWorkout.focus}
        </h1>
        <p className="mt-2 text-slate-300">{effectiveWorkout.estimatedMinutes}</p>
      </div>

      {completedToday ? (
        <section className="card space-y-4 border border-emerald-500/30">
          <div className="label">Completed</div>
          <p className="text-slate-100">Today’s workout has already been completed.</p>
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

      {showFridayDecisionGate ? (
        <section className="card space-y-5">
          <div className="label">Friday Morning Check</div>

          <OptionGroup
            title="Did basketball happen last night?"
            value={weeklySettings?.basketball_status ?? null}
            onSelect={(value) => handleBasketballStatusChange(value as 'yes' | 'no')}
            options={[
              { label: 'Yes', value: 'yes' },
              { label: 'No', value: 'no' },
            ]}
          />

          {basketballHappened ? (
            <>
              <OptionGroup
                title="What time did it end?"
                value={weeklySettings?.basketball_timing ?? null}
                onSelect={(value) =>
                  saveRecoveryUpdate({ basketball_timing: value as BasketballTiming })
                }
                options={[
                  { label: 'Standard time', value: 'standard' },
                  { label: 'Late (8–10pm)', value: 'late' },
                ]}
              />

              <div className="grid grid-cols-3 gap-3">
                <NumberInput
                  label="Minutes"
                  value={weeklySettings?.basketball_minutes}
                  onChange={(next) => saveRecoveryUpdate({ basketball_minutes: next })}
                />
                <NumberInput
                  label="Active Cals"
                  value={weeklySettings?.basketball_active_calories}
                  onChange={(next) =>
                    saveRecoveryUpdate({ basketball_active_calories: next })
                  }
                />
                <NumberInput
                  label="Avg HR"
                  value={weeklySettings?.basketball_avg_hr}
                  onChange={(next) => saveRecoveryUpdate({ basketball_avg_hr: next })}
                />
              </div>

              <OptionGroup
                title="How do you feel this morning?"
                value={weeklySettings?.friday_sleep_quality ?? null}
                onSelect={(value) =>
                  saveRecoveryUpdate({
                    friday_sleep_quality: value as FridaySleepQuality,
                  })
                }
                options={[
                  { label: 'Well rested', value: 'well_rested' },
                  { label: 'A little tired', value: 'a_little_tired' },
                  { label: 'Exhausted', value: 'exhausted' },
                ]}
              />

              <OptionGroup
                title="Any pain or injury concern from last night?"
                value={weeklySettings?.basketball_impact ?? null}
                onSelect={(value) =>
                  saveRecoveryUpdate({
                    basketball_impact: value as BasketballImpact,
                  })
                }
                options={[
                  { label: 'No', value: 'no_issue' },
                  { label: 'Yes', value: 'pain_issue' },
                ]}
                danger
              />

              {hasBasketballData ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
                  <div className="label">Detected Load</div>
                  <div className="mt-2 text-lg font-semibold capitalize text-white">
                    {detectedLoad}
                  </div>

                  {fridayOutput ? (
                    <>
                      <div className="label mt-4">{getFridayOutputLabel(fridayOutput)}</div>
                      <p className="mt-2 text-slate-100">{getFridayOutputWhy(fridayOutput)}</p>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-300">
                  Enter your basketball stats and sleep so the app can recommend Friday’s plan.
                </div>
              )}
            </>
          ) : null}

          {noBasketball ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">Today&apos;s recommendation</div>
              <p className="mt-2 text-slate-100">
                Basketball did not happen, so you&apos;re cleared for the regular Friday template.
              </p>
            </div>
          ) : null}

          <p className="text-sm text-slate-400">
            {saving ? 'Saving…' : 'This does not start the workout timer. It only decides your Friday plan.'}
          </p>
        </section>
      ) : null}

      <section className="card space-y-4">
        <div className="label">Warmup</div>
        <p className="text-slate-100">{effectiveWorkout.warmup}</p>
      </section>

      <section className="card space-y-4">
        <div className="label">Today&apos;s exercises</div>
        <div className="space-y-3">
          {effectiveWorkout.exercises.map((exercise) => (
            <div
              key={exercise}
              className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 text-slate-100"
            >
              {exercise}
            </div>
          ))}
        </div>
      </section>

      {fridayOutput === 'home_anti_office' ? (
        <section className="card space-y-4">
          <div className="label">Guided Home Flow</div>
          <div className="space-y-3">
            {guidedHomeFlow.map((exercise) => (
              <div
                key={exercise.name}
                className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{exercise.name}</div>
                  <div className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                    {exercise.duration}
                  </div>
                </div>
                <div className="mt-3 text-sm text-emerald-300">
                  Primary cue: {exercise.primaryCue}
                </div>
                <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-slate-300">
                  {exercise.extraCues.map((cue) => (
                    <li key={cue} className="list-disc">
                      {cue}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {fridayOutput === 'gym_anti_office' ? (
        <section className="card space-y-4">
          <div className="label">Guided Gym Flow</div>
          <div className="space-y-3">
            {guidedGymFlow.map((exercise) => (
              <div
                key={exercise.name}
                className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{exercise.name}</div>
                  <div className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                    {exercise.duration}
                  </div>
                </div>
                <div className="mt-3 text-sm text-emerald-300">
                  Primary cue: {exercise.primaryCue}
                </div>
                <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-slate-300">
                  {exercise.extraCues.map((cue) => (
                    <li key={cue} className="list-disc">
                      {cue}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card space-y-4">
        <div className="label">Cardio</div>
        <p className="text-slate-100">{effectiveWorkout.cardio}</p>
      </section>

      {!loaded ? null : completedToday ? (
        <Link
          href="/progress"
          className="block w-full rounded-[1.75rem] bg-slate-800 px-5 py-5 text-center text-[1rem] font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          View Progress
        </Link>
      ) : isRecoveryOverride ? (
        <Link
          href="/plan"
          className="block w-full rounded-[1.75rem] bg-slate-800 px-5 py-5 text-center text-[1rem] font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          Review This Recovery Plan
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