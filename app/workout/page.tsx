'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getWorkoutForDay, getTargetForExercise, applyCardioPreference } from '@/lib/workout-data'
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
  getEffectiveWorkoutDayNumber,
  getLocalDateString,
  getWeekStartDate,
  getWeeklySettings,
  loadCompletedSessionsFromSupabase,
  loadEquipmentPreferences,
  loadTodayWorkoutRecordFromSupabase,
  saveWeeklyRecoverySettings,
  saveWorkoutOutcomeToSupabase,
  type CompletedSessionRow,
  type WeeklySettingsRow,
  type WorkoutRow,
} from '@/lib/storage-supabase'
import { loadWorkoutProgress } from '@/lib/workout-log-state'

type OptionValue = string | null
type OutcomeMode = 'alternative' | 'missed' | null

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
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div>
      <div className="label mb-2">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
      />
    </div>
  )
}

function getDayEmphasis(dayName: string) {
  switch (dayName) {
    case 'Monday':
      return {
        title: "Today's emphasis",
        body: 'Machine pressing only - right shoulder loading stays conservative. Face pulls and dead-bugs are the priority, not the finisher. Treat posture work as the most important thing you do today.',
      }
    case 'Tuesday':
      return {
        title: "Today's emphasis",
        body: 'Pulling emphasis is your best friend right now - builds the upper back strength that corrects rounded shoulders. Scapula squeeze on every row, high reps on rear delts and face pulls.',
      }
    case 'Wednesday':
      return {
        title: "Today's emphasis",
        body: 'Hamstring and glute bias directly addresses anterior pelvic tilt. Posterior chain strength pulls your pelvis into neutral over time. Own the eccentric on leg press.',
      }
    case 'Thursday':
      return {
        title: "Today's emphasis",
        body: 'Lateral raises stay strict and light. No overhead pressing - shoulder work is purely corrective and isolation-based today.',
      }
    case 'Friday':
      return {
        title: "Today's emphasis",
        body: 'Lower body second hit of the week with arm volume added. Friday governor still applies based on energy and PT schedule.',
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
    name.includes('vertical traction machine') ||
    name.includes('lat pulldown') ||
    name.includes('leg press')
  ) {
    tags.push('3-sec eccentric')
  }

  if (
    name.includes('cable crunch') ||
    name.includes('ab machine') ||
    name.includes('dead-bug') ||
    name.includes('ab wheel')
  ) {
    tags.push('high-tension core')
  }

  if (name.includes('face pull') || name.includes('rear delt')) {
    tags.push('posture priority')
  }

  if (dayName === 'Wednesday' && name.includes('hamstring curl')) {
    tags.push('posterior chain priority')
  }

  if (dayName === 'Wednesday' && (name.includes('glute bridge') || name.includes('hip thrust'))) {
    tags.push('glute activation')
  }

  if (name.includes('lateral raise')) {
    tags.push('strict form')
  }

  if (
    name.includes('chest press machine') ||
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

function getFridayUnlockMessage(params: {
  basketballStatus: string | null | undefined
  hasBasketballData: boolean
  fridayOutput: FridayOutputType | null
}) {
  const { basketballStatus, hasBasketballData, fridayOutput } = params

  if (basketballStatus !== 'yes') {
    return 'Finish the Friday check first to unlock today’s plan.'
  }

  if (!hasBasketballData) {
    return 'Save your basketball stats and morning feel to unlock today’s plan.'
  }

  if (fridayOutput === 'walk_only') {
    return 'Today is a walk-only recovery day. No lifting session to start.'
  }

  if (fridayOutput === 'full_rest') {
    return 'Today is a full rest day based on your recovery inputs.'
  }

  return 'Finish the Friday check first to unlock today’s plan.'
}

export default function WorkoutPage() {
  const todayDay = new Date().getDay()

  const [hasInProgressWorkout, setHasInProgressWorkout] = useState(false)
  const [weeklySettings, setWeeklySettings] = useState<WeeklySettingsRow | null>(null)
  const [cardioPreference, setCardioPreference] = useState<string | null>(null)
  const [completedToday, setCompletedToday] = useState<CompletedSessionRow | null>(null)
  const [todayWorkoutRecord, setTodayWorkoutRecord] = useState<WorkoutRow | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  const [showOutcomeForm, setShowOutcomeForm] = useState(false)
  const [outcomeMode, setOutcomeMode] = useState<OutcomeMode>(null)
  const [alternativeReason, setAlternativeReason] = useState<string | null>(null)
  const [missReason, setMissReason] = useState<string | null>(null)
  const [outcomeNote, setOutcomeNote] = useState('')
  const [countsForStreak, setCountsForStreak] = useState(true)

  const [minutesInput, setMinutesInput] = useState('')
  const [activeCaloriesInput, setActiveCaloriesInput] = useState('')
  const [avgHrInput, setAvgHrInput] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const date = getLocalDateString()
        const weekStart = getWeekStartDate()

        const [weekly, sessions, prefs, todayRecord] = await Promise.all([
          getWeeklySettings(weekStart),
          loadCompletedSessionsFromSupabase(),
          loadEquipmentPreferences(),
          loadTodayWorkoutRecordFromSupabase(date),
        ])

        setWeeklySettings(weekly ?? null)
        setCardioPreference(prefs?.cardio_preference ?? null)
        setTodayWorkoutRecord(todayRecord ?? null)

        const effectiveDay = getEffectiveWorkoutDayNumber(todayDay, weekly ?? null)
        const effectiveWorkout = getWorkoutForDay(effectiveDay)
        const saved = loadWorkoutProgress(date, effectiveWorkout.dayName)
        setHasInProgressWorkout(Boolean(saved))

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
        setTodayWorkoutRecord(null)
      } finally {
        setLoaded(true)
      }
    }

    load()
  }, [todayDay])

  useEffect(() => {
    setMinutesInput(
      weeklySettings?.basketball_minutes != null
        ? String(weeklySettings.basketball_minutes)
        : ''
    )
    setActiveCaloriesInput(
      weeklySettings?.basketball_active_calories != null
        ? String(weeklySettings.basketball_active_calories)
        : ''
    )
    setAvgHrInput(
      weeklySettings?.basketball_avg_hr != null
        ? String(weeklySettings.basketball_avg_hr)
        : ''
    )
  }, [
    weeklySettings?.basketball_minutes,
    weeklySettings?.basketball_active_calories,
    weeklySettings?.basketball_avg_hr,
  ])

  async function refreshTodayRecord() {
    const date = getLocalDateString()
    const todayRecord = await loadTodayWorkoutRecordFromSupabase(date)
    setTodayWorkoutRecord(todayRecord ?? null)
  }

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

  async function handleSaveFridayStats() {
    await saveRecoveryUpdate({
      basketball_minutes: minutesInput.trim() ? Number(minutesInput) : null,
      basketball_active_calories: activeCaloriesInput.trim()
        ? Number(activeCaloriesInput)
        : null,
      basketball_avg_hr: avgHrInput.trim() ? Number(avgHrInput) : null,
    })
  }

  const effectiveDay = useMemo(
    () => getEffectiveWorkoutDayNumber(todayDay, weeklySettings),
    [todayDay, weeklySettings]
  )

  const baseWorkout = useMemo(
    () => getWorkoutForDay(effectiveDay),
    [effectiveDay]
  )

  async function handleLogGovernorRestDay() {
    const date = getLocalDateString()
    try {
      setSaving(true)
      const reason = fridayOutput === 'full_rest' ? 'governor_full_rest' : 'governor_walk_only'
      const record = await saveWorkoutOutcomeToSupabase({
        date,
        day_name: effectiveWorkout.dayName,
        focus: effectiveWorkout.focus,
        status: 'alternative_completed',
        alternative_reason: reason,
        outcome_note: 'Governor-mandated recovery day based on basketball inputs',
        counts_for_streak: true,
      })
      setTodayWorkoutRecord(record)
    } catch (error) {
      console.error('Log governor rest day error', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveOutcome() {
    const date = getLocalDateString()

    try {
      setSaving(true)

      if (outcomeMode === 'alternative') {
        if (!alternativeReason) return

        await saveWorkoutOutcomeToSupabase({
          date,
          day_name: baseWorkout.dayName,
          focus: baseWorkout.focus,
          status: 'alternative_completed',
          alternative_reason: alternativeReason,
          outcome_note: outcomeNote.trim() || null,
          counts_for_streak: countsForStreak,
        })
      }

      if (outcomeMode === 'missed') {
        if (!missReason) return

        await saveWorkoutOutcomeToSupabase({
          date,
          day_name: baseWorkout.dayName,
          focus: baseWorkout.focus,
          status: 'missed',
          miss_reason: missReason,
          outcome_note: outcomeNote.trim() || null,
          counts_for_streak: false,
        })
      }

      await refreshTodayRecord()
      setShowOutcomeForm(false)
    } catch (error) {
      console.error('Save outcome error', error)
    } finally {
      setSaving(false)
    }
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

  const canStartFridayWorkout =
    !isFriday ||
    noBasketball ||
    (basketballHappened &&
      hasBasketballData &&
      fridayOutput != null &&
      fridayOutput !== 'walk_only' &&
      fridayOutput !== 'full_rest')

  const alternativeLogged = todayWorkoutRecord?.status === 'alternative_completed'
  const missedLogged = todayWorkoutRecord?.status === 'missed'
  const partialLogged = todayWorkoutRecord?.status === 'completed_partial'
  const hasOutcomeLogged = alternativeLogged || missedLogged
  const dayEmphasis = useMemo(
    () => getDayEmphasis(effectiveWorkout.dayName),
    [effectiveWorkout.dayName]
  )

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Workout</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {effectiveWorkout.dayName}: {effectiveWorkout.focus}
        </h1>
        <p className="mt-2 text-slate-300">{effectiveWorkout.estimatedMinutes}</p>
      </div>

      {dayEmphasis ? (
        <section className="card space-y-4">
          <div className="label">{dayEmphasis.title}</div>
          <p className="text-slate-100">{dayEmphasis.body}</p>
        </section>
      ) : null}

      {completedToday ? (
        <section className="card space-y-4 border border-emerald-500/30">
          <div className="label">Completed</div>
          <p className="text-slate-100">Today’s workout has already been completed.</p>
          <p className="text-sm text-slate-400">
            Duration: {completedToday.duration_minutes ?? '—'} min
          </p>
          {partialLogged && todayWorkoutRecord?.outcome_note ? (
            <p className="text-sm text-slate-400">Partial note: {todayWorkoutRecord.outcome_note}</p>
          ) : null}
        </section>
      ) : alternativeLogged ? (
        <section className="card space-y-4 border border-emerald-500/30">
          <div className="label">Alternative Workout Logged</div>
          <p className="text-slate-100">Today was logged as an alternative workout.</p>
          <p className="text-sm text-slate-400">
            Reason: {todayWorkoutRecord?.alternative_reason?.replaceAll('_', ' ') ?? '—'}
          </p>
          {todayWorkoutRecord?.outcome_note ? (
            <p className="text-sm text-slate-400">Note: {todayWorkoutRecord.outcome_note}</p>
          ) : null}
        </section>
      ) : missedLogged ? (
        <section className="card space-y-4 border border-amber-500/30">
          <div className="label">Workout Marked Missed</div>
          <p className="text-slate-100">Today’s workout was marked as missed.</p>
          <p className="text-sm text-slate-400">
            Reason: {todayWorkoutRecord?.miss_reason?.replaceAll('_', ' ') ?? '—'}
          </p>
          {todayWorkoutRecord?.outcome_note ? (
            <p className="text-sm text-slate-400">Note: {todayWorkoutRecord.outcome_note}</p>
          ) : null}
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
                  value={minutesInput}
                  onChange={setMinutesInput}
                />
                <NumberInput
                  label="Active Cals"
                  value={activeCaloriesInput}
                  onChange={setActiveCaloriesInput}
                />
                <NumberInput
                  label="Avg HR"
                  value={avgHrInput}
                  onChange={setAvgHrInput}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveFridayStats}
                className="w-full rounded-[1.5rem] bg-white px-5 py-4 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Save Basketball Stats
              </button>

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
            {saving
              ? 'Saving…'
              : 'This does not start the workout timer. It only decides your Friday plan.'}
          </p>
        </section>
      ) : null}

      {!completedToday && !hasOutcomeLogged ? (
        <section className="card space-y-4">
          <div className="label">Need a different path?</div>
          <button
            type="button"
            onClick={() => setShowOutcomeForm((prev) => !prev)}
            className="w-full rounded-[1.5rem] border border-slate-700 bg-slate-900/40 px-5 py-4 text-left transition hover:bg-slate-800/60"
          >
            <div className="text-[1rem] font-semibold text-white">Can’t do this workout?</div>
            <div className="mt-2 text-sm text-slate-400">
              Log an alternative workout or mark today’s workout as missed.
            </div>
          </button>

          {showOutcomeForm ? (
            <div className="space-y-5 rounded-[1.5rem] border border-slate-700 bg-slate-900/40 p-4">
              <OptionGroup
                title="Choose one"
                value={outcomeMode}
                onSelect={(value) => {
                  const next = value as OutcomeMode
                  setOutcomeMode(next)
                  setAlternativeReason(null)
                  setMissReason(null)
                  setCountsForStreak(next === 'alternative')
                }}
                options={[
                  { label: 'Alternative workout', value: 'alternative' },
                  { label: 'Missed workout', value: 'missed' },
                ]}
              />

              {outcomeMode === 'alternative' ? (
                <>
                  <OptionGroup
                    title="Alternative workout type"
                    value={alternativeReason}
                    onSelect={(value) => {
                      setAlternativeReason(value)
                      if (value === 'personal_training') {
                        setCountsForStreak(true)
                      }
                    }}
                    options={[
                      { label: 'Home workout', value: 'home_workout' },
                      { label: 'Hotel workout', value: 'hotel_workout' },
                      { label: 'Outdoor run', value: 'outdoor_run' },
                      { label: 'Walk only', value: 'walk_only' },
                      { label: 'Basketball only', value: 'basketball_only' },
                      { label: 'Recovery flow', value: 'recovery_flow' },
                      { label: 'Personal training session', value: 'personal_training' },
                      { label: 'Other', value: 'other' },
                    ]}
                  />

                  <OptionGroup
                    title="Count this toward consistency?"
                    value={countsForStreak ? 'yes' : 'no'}
                    onSelect={(value) => setCountsForStreak(value === 'yes')}
                    options={[
                      { label: 'Yes', value: 'yes' },
                      { label: 'No', value: 'no' },
                    ]}
                  />
                </>
              ) : null}

              {outcomeMode === 'missed' ? (
                <OptionGroup
                  title="Why was it missed?"
                  value={missReason}
                  onSelect={(value) => setMissReason(value)}
                  options={[
                    { label: 'Sick', value: 'sick' },
                    { label: 'Woke up late', value: 'woke_up_late' },
                    { label: 'Work travel', value: 'work_travel' },
                    { label: 'Family / schedule', value: 'family_schedule' },
                    { label: 'Recovery needed', value: 'recovery_needed' },
                    { label: 'Equipment issue', value: 'equipment_issue' },
                    { label: 'Other', value: 'other' },
                  ]}
                />
              ) : null}

              {outcomeMode ? (
                <div>
                  <div className="label mb-2">Optional note</div>
                  <textarea
                    value={outcomeNote}
                    onChange={(e) => setOutcomeNote(e.target.value)}
                    rows={3}
                    placeholder="Anything helpful to remember about today?"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleSaveOutcome}
                disabled={
                  saving ||
                  (outcomeMode === 'alternative' && !alternativeReason) ||
                  (outcomeMode === 'missed' && !missReason) ||
                  !outcomeMode
                }
                className="w-full rounded-[1.5rem] bg-white px-5 py-4 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Today’s Outcome'}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="card space-y-4">
        <div className="label">Warmup</div>
        <p className="text-slate-100">{effectiveWorkout.warmup}</p>
      </section>

      <section className="card space-y-4">
        <div className="label">Today&apos;s exercises</div>
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
        <p className="text-slate-100">{applyCardioPreference(effectiveWorkout.cardio, cardioPreference)}</p>
      </section>

      <section className="card space-y-4">
        <div className="label">Progression rule</div>
        <p className="text-sm leading-6 text-slate-300">
          Progression should stay form-first. Clean reps earn normal progression. Slight
          breakdown should hold the load. Clear breakdown should reduce the load next time.
        </p>
      </section>

      {!loaded ? null : completedToday ? (
        <Link
          href="/progress"
          className="block w-full rounded-[1.75rem] bg-slate-800 px-5 py-5 text-center text-[1rem] font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          View Progress
        </Link>
      ) : hasOutcomeLogged ? (
        <Link
          href="/history"
          className="block w-full rounded-[1.75rem] bg-slate-800 px-5 py-5 text-center text-[1rem] font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          View History
        </Link>
      ) : canStartFridayWorkout ? (
        <Link
          href="/workout/log"
          className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
        >
          {hasInProgressWorkout ? 'Resume Workout' : 'Start Workout'}
        </Link>
      ) : fridayOutput === 'full_rest' || fridayOutput === 'walk_only' ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleLogGovernorRestDay}
            disabled={saving}
            className="block w-full rounded-[1.75rem] bg-slate-700 px-5 py-5 text-center text-[1rem] font-semibold text-slate-100 transition hover:bg-slate-600 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Log Recovery Day'}
          </button>
          <p className="text-center text-xs text-slate-500">
            Governor-mandated rest days count toward your streak.
          </p>
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-slate-700 bg-slate-900/40 px-5 py-5 text-center text-[1rem] font-semibold text-slate-200">
          {getFridayUnlockMessage({
            basketballStatus: weeklySettings?.basketball_status,
            hasBasketballData,
            fridayOutput,
          })}
        </div>
      )}
    </div>
  )
}