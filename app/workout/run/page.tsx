'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { getWorkoutForDay } from '@/lib/workout-data'
import {
  getEffectiveWorkoutDayNumber,
  getLocalDateString,
  getWeekStartDate,
  getWeeklySettings,
  loadCoachingOverrides,
  saveWorkoutAndLogsToSupabase,
  type CoachingOverrides,
  type WeeklySettingsRow,
} from '@/lib/storage-supabase'

const effortOptions = ['Easy', 'Moderate', 'Hard'] as const
const discomfortOptions = ['None', 'Knee', 'Back', 'Shoulder', 'Foot / Ankle', 'Other'] as const

function ChipGroup<T extends string>({
  title,
  options,
  value,
  onSelect,
}: {
  title: string
  options: readonly T[]
  value: T | null
  onSelect: (next: T) => void
}) {
  return (
    <div className="space-y-2">
      <div className="label">{title}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              value === option
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function RunLogPage() {
  const router = useRouter()
  const date = getLocalDateString()
  const todayDay = new Date().getDay()

  const [weeklySettings, setWeeklySettings] = useState<WeeklySettingsRow | null>(null)
  const [coachingOverrides, setCoachingOverrides] = useState<CoachingOverrides | null>(null)
  const [loaded, setLoaded] = useState(false)

  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [effort, setEffort] = useState<(typeof effortOptions)[number] | null>(null)
  const [discomfort, setDiscomfort] = useState<(typeof discomfortOptions)[number]>('None')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [weekly, overrides] = await Promise.all([
          getWeeklySettings(getWeekStartDate()),
          loadCoachingOverrides(),
        ])
        setWeeklySettings(weekly ?? null)
        setCoachingOverrides(overrides ?? null)
      } catch (err) {
        console.error('Run page load error', err)
      } finally {
        setLoaded(true)
      }
    }
    load()
  }, [])

  const workout = useMemo(
    () => getWorkoutForDay(getEffectiveWorkoutDayNumber(todayDay, weeklySettings)),
    [todayDay, weeklySettings]
  )

  const run = workout.run
  const coachingAdd = coachingOverrides?.cardio_add_minutes?.[workout.dayName] ?? 0
  const plannedMinutes = run ? run.totalMinutes + coachingAdd : 0

  useEffect(() => {
    if (plannedMinutes && !minutes) setMinutes(String(plannedMinutes))
    // Only prefill once the plan is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannedMinutes])

  async function handleSave() {
    if (!run) return
    const actualMinutes = Number(minutes)
    if (!actualMinutes || actualMinutes < 1) {
      setError('Enter how many minutes you were out.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const noteParts = [
        effort ? `Effort: ${effort}` : null,
        discomfort !== 'None' ? `Discomfort: ${discomfort}` : null,
        note.trim() || null,
      ].filter(Boolean)

      await saveWorkoutAndLogsToSupabase({
        date,
        day_name: workout.dayName,
        focus: workout.focus,
        status: 'completed',
        outcome_note: noteParts.length ? noteParts.join(' · ') : null,
        estimated_minutes: plannedMinutes,
        actual_minutes: actualMinutes,
        strength_minutes: 0,
        cardio_minutes: actualMinutes,
        warmup_text: workout.warmup,
        cardio_text: workout.cardio,
        completed_cardio: true,
        exercise_order: [],
        exercise_logs: [],
        workout_extra: {
          type: 'run',
          distance_miles: distance.trim() ? Number(distance) : null,
          effort,
          discomfort,
        },
      })

      router.push('/workout')
    } catch (err) {
      console.error(err)
      setError('Could not save run. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return <div className="text-sm text-slate-400">Loading…</div>
  }

  if (!run) {
    return (
      <div className="space-y-4">
        <div className="card space-y-2">
          <div className="label">Run log</div>
          <p className="text-slate-100">Today isn&apos;t a run day in this week&apos;s plan.</p>
        </div>
        <Link
          href="/workout"
          className="block w-full rounded-[1.75rem] bg-slate-800 px-5 py-5 text-center text-[1rem] font-semibold text-slate-100"
        >
          Back to Workout
        </Link>
      </div>
    )
  }

  const intervalText =
    run.walkMinutes > 0
      ? `${run.rounds} × (${run.jogMinutes} min easy jog + ${run.walkMinutes} min walk)`
      : `${run.rounds * run.jogMinutes} min continuous easy jog`

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">{workout.dayName}</div>
        <h1 className="text-2xl font-semibold tracking-tight">{workout.focus}</h1>
      </div>

      <section className="card space-y-4">
        <div className="label">Today&apos;s run</div>
        <ol className="list-decimal space-y-2 pl-5 text-slate-100">
          <li>{run.warmupWalkMinutes} min brisk walk</li>
          <li>{intervalText}</li>
          <li>{run.cooldownWalkMinutes} min easy walk</li>
        </ol>
        <div className="text-sm text-slate-400">
          About {plannedMinutes} min total
          {coachingAdd ? ` (includes +${coachingAdd} min from your coaching plan)` : ''}
        </div>
        <p className="text-sm leading-6 text-slate-300">{run.guidance}</p>
      </section>

      {workout.mobility ? (
        <section className="card space-y-2">
          <div className="label">Mobility after</div>
          <p className="text-slate-100">{workout.mobility}</p>
        </section>
      ) : null}

      <section className="card space-y-5">
        <div className="label">Log it</div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-2">Minutes out</div>
            <input
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>
          <div>
            <div className="label mb-2">Miles (optional)</div>
            <input
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>
        </div>

        <ChipGroup title="Effort" options={effortOptions} value={effort} onSelect={setEffort} />
        <ChipGroup
          title="Anything bother you?"
          options={discomfortOptions}
          value={discomfort}
          onSelect={setDiscomfort}
        />

        <div>
          <div className="label mb-2">Notes (optional)</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Finish Run'}
        </button>
      </section>
    </div>
  )
}
