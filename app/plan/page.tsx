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
  getEffectiveWorkoutDayNumber,
  hasActiveWeeklyReorder,
  getWeekStartDate,
  getWeeklySettings,
  loadEquipmentPreferences,
  saveWeeklyDayOrder,
  clearWeeklyDayOrder,
  type WeeklySettingsRow,
} from '@/lib/storage-supabase'

function getDayEmphasis(dayName: string) {
  switch (dayName) {
    case 'Monday':
      return {
        title: 'Monday emphasis',
        body: 'Chest and shoulder work should stay controlled. Prioritize clean reps and a slow lowering phase on primary machine presses.',
      }
    case 'Tuesday':
      return {
        title: 'Tuesday emphasis',
        body: 'Back work stays controlled and core work should be treated as high-tension work, not just filler at the end.',
      }
    case 'Wednesday':
      return {
        title: 'Wednesday emphasis',
        body: 'Leg day should bias hamstrings, glutes, and trunk tension so the session supports posture and pelvic position, not just quad fatigue.',
      }
    case 'Thursday':
      return {
        title: 'Thursday emphasis',
        body: 'Mixed upper day should stay clean and athletic. Keep lateral raises strict and avoid swinging or chasing sloppy reps before basketball.',
      }
    case 'Friday':
      return {
        title: 'Friday emphasis',
        body: 'Friday should reflect your basketball recovery inputs first. Let the governor decide whether this is a normal lift, a recovery flow, or a lighter day.',
      }
    default:
      return null
  }
}

function getExerciseCoachingTags(dayName: string, exerciseName: string) {
  const name = exerciseName.toLowerCase()
  const tags: string[] = []

  if (
    name.includes('chest press machine') ||
    name.includes('smith machine incline chest press') ||
    name.includes('vertical traction machine') ||
    name.includes('lat pulldown') ||
    name.includes('leg press')
  ) {
    tags.push('3-sec eccentric')
  }

  if (name.includes('cable crunch') || name.includes('ab machine') || name.includes('dead-bug')) {
    tags.push('high-tension core')
  }

  if (dayName === 'Wednesday' && name.includes('hamstring curl')) {
    tags.push('posterior chain priority')
  }

  if (dayName === 'Wednesday' && (name.includes('glute bridge') || name.includes('abductor machine'))) {
    tags.push('glute support')
  }

  if (dayName === 'Thursday' && name.includes('lateral raise')) {
    tags.push('strict form')
  }

  if (
    name.includes('chest press machine') ||
    name.includes('smith machine incline chest press') ||
    name.includes('vertical traction machine') ||
    name.includes('lat pulldown') ||
    name.includes('row') ||
    name.includes('hack squat') ||
    name.includes('leg press')
  ) {
    tags.push('form-first progression')
  }

  return tags
}

const weekdayOptions = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
]

export default function PlanPage() {
  const weekPlan = useMemo(() => getWeekPlan(), [])
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDay()
    return today >= 1 && today <= 5 ? today : 1
  })
  const [weeklySettings, setWeeklySettings] = useState<WeeklySettingsRow | null>(null)
  const [cardioPreference, setCardioPreference] = useState<string | null>(null)
  const [showReorderPanel, setShowReorderPanel] = useState(false)
  const [dayOrderDraft, setDayOrderDraft] = useState<Record<string, string>>({})
  const [reorderSaving, setReorderSaving] = useState(false)

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

  useEffect(() => {
    const draft: Record<string, string> = {}
    for (const { day } of weekdayOptions) {
      const effective = getEffectiveWorkoutDayNumber(day, weeklySettings)
      draft[String(day)] = String(effective)
    }
    setDayOrderDraft(draft)
  }, [weeklySettings])

  const effectiveWeekPlan = useMemo(() => {
    return weekPlan.map(({ day }) => {
      const effectiveDay = getEffectiveWorkoutDayNumber(day, weeklySettings)
      const effectiveWorkout =
        weekPlan.find((item) => item.day === effectiveDay)?.workout ?? weekPlan[0].workout

      return {
        day,
        workout: effectiveWorkout,
        swappedFrom: effectiveDay !== day ? effectiveDay : null,
      }
    })
  }, [weekPlan, weeklySettings])

  const selectedWorkout =
    effectiveWeekPlan.find((item) => item.day === selectedDay)?.workout ?? effectiveWeekPlan[0].workout

  const selectedBaseWorkout =
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

  const dayEmphasis = useMemo(
    () => getDayEmphasis(effectiveWorkout.dayName),
    [effectiveWorkout.dayName]
  )

  const hasActiveReorder = hasActiveWeeklyReorder(weeklySettings)

  async function handleSaveOrder() {
    try {
      setReorderSaving(true)
      const weekStart = getWeekStartDate()
      const orderMap: Record<string, number> = {}
      let hasChanges = false
      for (const { day } of weekdayOptions) {
        const assigned = Number(dayOrderDraft[String(day)] ?? day)
        orderMap[String(day)] = assigned
        if (assigned !== day) hasChanges = true
      }
      if (hasChanges) {
        await saveWeeklyDayOrder(weekStart, orderMap)
      } else {
        await clearWeeklyDayOrder(weekStart)
      }
      const refreshed = await getWeeklySettings(weekStart)
      setWeeklySettings(refreshed)
      setShowReorderPanel(false)
    } catch (error) {
      console.error('Save day order error', error)
    } finally {
      setReorderSaving(false)
    }
  }

  async function handleResetOrder() {
    try {
      setReorderSaving(true)
      const weekStart = getWeekStartDate()
      await clearWeeklyDayOrder(weekStart)
      const refreshed = await getWeeklySettings(weekStart)
      setWeeklySettings(refreshed)
      setShowReorderPanel(false)
    } catch (error) {
      console.error('Reset day order error', error)
    } finally {
      setReorderSaving(false)
    }
  }

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
        <div className="flex items-center justify-between gap-3">
          <div className="label">This Week</div>
          <button
            type="button"
            onClick={() => setShowReorderPanel((prev) => !prev)}
            className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            {showReorderPanel ? 'Close' : 'Reorder Days'}
          </button>
        </div>

        {hasActiveReorder && !showReorderPanel ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/40 p-4">
            <div className="label">Active Weekly Reorder</div>
            <div className="mt-2 space-y-1">
              {weekdayOptions
                .filter(({ day }) => getEffectiveWorkoutDayNumber(day, weeklySettings) !== day)
                .map(({ day, label }) => {
                  const effectiveDay = getEffectiveWorkoutDayNumber(day, weeklySettings)
                  const workout = weekPlan.find((item) => item.day === effectiveDay)?.workout
                  return (
                    <div key={day} className="text-sm text-slate-100">
                      {label} → {workout?.dayName ?? '?'} workout
                    </div>
                  )
                })}
            </div>
          </div>
        ) : null}

        {showReorderPanel ? (
          <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Reorder Workout Days</div>
            <p className="text-sm text-slate-300">
              Assign any workout to any day. This changes the current week only.
            </p>

            <div className="space-y-3">
              {weekdayOptions.map(({ day, label }) => (
                <div key={day} className="flex items-center gap-3">
                  <div className="w-20 shrink-0 text-sm text-slate-300">{label}</div>
                  <select
                    value={dayOrderDraft[String(day)] ?? String(day)}
                    onChange={(e) =>
                      setDayOrderDraft((prev) => ({ ...prev, [String(day)]: e.target.value }))
                    }
                    className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white"
                  >
                    {weekdayOptions.map((opt) => {
                      const workout = weekPlan.find((item) => item.day === opt.day)?.workout
                      return (
                        <option key={opt.day} value={opt.day}>
                          {workout?.dayName ?? opt.label}: {workout?.focus ?? ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={reorderSaving}
                className="rounded-[1.25rem] bg-emerald-500 px-4 py-4 text-center text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {reorderSaving ? 'Saving…' : 'Apply Order'}
              </button>

              <button
                type="button"
                onClick={handleResetOrder}
                disabled={reorderSaving || !hasActiveReorder}
                className="rounded-[1.25rem] bg-slate-800 px-4 py-4 text-center text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
              >
                Reset to Default
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-5 gap-2">
          {effectiveWeekPlan.map(({ day, workout, swappedFrom }) => {
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
                <div>{['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][day]}</div>
                {swappedFrom != null ? (
                  <div className="mt-1 text-[10px] font-medium opacity-80">
                    from {workout.dayName.slice(0, 3)}
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">{effectiveWorkout.dayName}</div>
        <h2 className="text-2xl font-semibold text-white">{effectiveWorkout.focus}</h2>
        <p className="text-slate-300">{effectiveWorkout.estimatedMinutes}</p>

        {selectedBaseWorkout.dayName !== effectiveWorkout.dayName ? (
          <div className="rounded-2xl border border-amber-500/30 bg-slate-900/40 p-4">
            <div className="label">Day Swap Applied</div>
            <p className="mt-2 text-slate-100">
              This calendar day normally shows <span className="font-semibold">{selectedBaseWorkout.dayName}</span>, but this week it is using <span className="font-semibold">{effectiveWorkout.dayName}</span>.
            </p>
          </div>
        ) : null}

        {dayEmphasis ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">{dayEmphasis.title}</div>
            <p className="mt-2 text-slate-100">{dayEmphasis.body}</p>
          </div>
        ) : null}

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
                    {weeklySettings?.basketball_impact === 'pain_issue'
                      ? 'yes'
                      : weeklySettings?.basketball_impact === 'no_issue'
                        ? 'no'
                        : 'not set'}
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
              const tags = getExerciseCoachingTags(effectiveWorkout.dayName, exercise)

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

                  {tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <div
                          key={`${exercise}-${tag}`}
                          className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-emerald-300"
                        >
                          {tag}
                        </div>
                      ))}
                    </div>
                  ) : null}
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

        {effectiveWorkout.dayName !== 'Friday' ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Progression rule</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Progression should stay form-first. Clean reps earn normal progression. Slight
              breakdown means hold the load. Clear breakdown means reduce load next time.
            </p>
          </div>
        ) : null}
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