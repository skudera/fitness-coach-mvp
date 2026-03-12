'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getWorkoutForToday,
  getTargetForExercise,
  getExerciseSubstitutions,
} from '@/lib/workout-data'
import { getLocalDateString, saveWorkoutAndLogsToSupabase } from '@/lib/storage-supabase'
import {
  loadWorkoutProgress,
  saveWorkoutProgress,
  clearWorkoutProgress,
  type WorkoutExerciseEntry,
  type WorkoutProgressState,
} from '@/lib/workout-log-state'

function createBlankSets() {
  return [
    { weight: '', reps: '' },
    { weight: '', reps: '' },
    { weight: '', reps: '' },
  ]
}

function buildInitialEntries(exercises: string[]): WorkoutExerciseEntry[] {
  return exercises.map((name) => ({
    name,
    substitutedFrom: null,
    sets: createBlankSets(),
    difficulty: '',
    discomfortLocation: 'None',
    discomfortSeverity: '',
    note: '',
  }))
}

function getNextPendingIndex(
  currentIndex: number,
  entriesLength: number,
  completedIndices: number[]
) {
  for (let i = currentIndex + 1; i < entriesLength; i += 1) {
    if (!completedIndices.includes(i)) return i
  }

  for (let i = 0; i < entriesLength; i += 1) {
    if (!completedIndices.includes(i)) return i
  }

  return -1
}

function parseFirstNumber(value: string) {
  const match = value.match(/\d+/)
  return match ? Number(match[0]) : 0
}

const difficultyOptions = ['Easy', 'Good', 'Hard', 'Too Hard']
const discomfortLocationOptions = ['None', 'Shoulder', 'Back', 'Other']
const discomfortSeverityOptions = ['Low', 'Medium', 'High']

export default function WorkoutLogPage() {
  const router = useRouter()
  const workout = useMemo(() => getWorkoutForToday(), [])
  const date = getLocalDateString()

  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [entries, setEntries] = useState<WorkoutExerciseEntry[]>(() =>
    buildInitialEntries(workout.exercises)
  )
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [completedCardio, setCompletedCardio] = useState(false)
  const [cardioMinutes, setCardioMinutes] = useState('')
  const [skippedIndices, setSkippedIndices] = useState<number[]>([])
  const [completedIndices, setCompletedIndices] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showSubstitutions, setShowSubstitutions] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [skipLock, setSkipLock] = useState(false)

  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const saved = loadWorkoutProgress(date, workout.dayName)

    if (saved) {
      setStartedAt(saved.startedAt ?? new Date().toISOString())
      setEntries(saved.entries)
      setCurrentIndex(typeof saved.currentIndex === 'number' ? saved.currentIndex : -1)
      setCompletedCardio(saved.completedCardio)
      setCardioMinutes(saved.cardioMinutes ?? '')
      setSkippedIndices(saved.skippedIndices)
      setCompletedIndices(saved.completedIndices)
    } else {
      setStartedAt(new Date().toISOString())
    }

    setIsLoaded(true)
  }, [date, workout.dayName])

  useEffect(() => {
    if (!isLoaded || !startedAt) return

    const progress: WorkoutProgressState = {
      date,
      dayName: workout.dayName,
      startedAt,
      currentIndex,
      completedCardio,
      cardioMinutes,
      skippedIndices,
      completedIndices,
      entries,
    }

    saveWorkoutProgress(progress)
  }, [
    isLoaded,
    startedAt,
    date,
    workout.dayName,
    currentIndex,
    completedCardio,
    cardioMinutes,
    skippedIndices,
    completedIndices,
    entries,
  ])

  useEffect(() => {
    if (!isLoaded) return

    const id = window.setTimeout(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)

    return () => window.clearTimeout(id)
  }, [currentIndex, isLoaded, showSubstitutions])

  const currentEntry = currentIndex >= 0 ? entries[currentIndex] : null
  const currentTarget = currentEntry ? getTargetForExercise(currentEntry.name) : null

  const nextPendingIndex = useMemo(() => {
    return getNextPendingIndex(currentIndex, entries.length, completedIndices)
  }, [currentIndex, entries.length, completedIndices])

  const nextLabel =
    nextPendingIndex >= 0 && entries[nextPendingIndex]
      ? entries[nextPendingIndex].name
      : completedIndices.length === entries.length
      ? 'Cardio / Finish'
      : '—'

  const strengthElapsedMinutes = useMemo(() => {
    if (!startedAt) return 1
    const start = new Date(startedAt).getTime()
    const now = Date.now()
    return Math.max(1, Math.round((now - start) / 60000))
  }, [startedAt])

  const plannedCardioMinutes = useMemo(() => {
    return parseFirstNumber(workout.cardio)
  }, [workout.cardio])

  const targetSessionMinutes = useMemo(() => {
    return parseFirstNumber(workout.estimatedMinutes)
  }, [workout.estimatedMinutes])

  const suggestedCardioMinutes = useMemo(() => {
    if (!targetSessionMinutes) return plannedCardioMinutes || 0

    const remaining = Math.max(0, targetSessionMinutes - strengthElapsedMinutes)
    if (!plannedCardioMinutes) return Math.min(remaining, 20)

    return Math.min(Math.max(plannedCardioMinutes, remaining), 20)
  }, [targetSessionMinutes, strengthElapsedMinutes, plannedCardioMinutes])

  const actualCardioMinutesNumber =
    completedCardio && cardioMinutes ? Number(cardioMinutes) : 0

  const totalProjectedMinutes = strengthElapsedMinutes + actualCardioMinutesNumber

  const substitutionOptions = currentEntry
    ? getExerciseSubstitutions(currentEntry.name).filter((option) => option !== currentEntry.name)
    : []

  function updateSetValue(setIndex: number, field: 'weight' | 'reps', value: string) {
    if (currentIndex < 0) return

    setEntries((prev) =>
      prev.map((entry, index) =>
        index === currentIndex
          ? {
              ...entry,
              sets: entry.sets.map((set, i) =>
                i === setIndex ? { ...set, [field]: value } : set
              ),
            }
          : entry
      )
    )
  }

  function updateCurrentField(
    field: 'difficulty' | 'discomfortLocation' | 'discomfortSeverity' | 'note',
    value: string
  ) {
    if (currentIndex < 0) return

    setEntries((prev) =>
      prev.map((entry, index) =>
        index === currentIndex ? { ...entry, [field]: value } : entry
      )
    )
  }

  function handleStartExercises() {
    setCurrentIndex(0)
    setShowSubstitutions(false)
  }

  function handleSkip() {
    if (currentIndex < 0 || skipLock) return

    setSkipLock(true)

    setSkippedIndices((prev) =>
      prev.includes(currentIndex) ? prev : [...prev, currentIndex]
    )

    const nextIndex = getNextPendingIndex(currentIndex, entries.length, completedIndices)

    if (nextIndex >= 0 && nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex)
    }

    setShowSubstitutions(false)

    window.setTimeout(() => {
      setSkipLock(false)
    }, 300)
  }

  function handleSubstitute(newExerciseName: string) {
    if (currentIndex < 0) return

    setEntries((prev) =>
      prev.map((entry, index) =>
        index === currentIndex
          ? {
              ...entry,
              substitutedFrom: entry.substitutedFrom ?? entry.name,
              name: newExerciseName,
            }
          : entry
      )
    )

    setShowSubstitutions(false)
  }

  function handleNext() {
    if (currentIndex < 0) return

    const updatedCompleted = completedIndices.includes(currentIndex)
      ? completedIndices
      : [...completedIndices, currentIndex]

    setCompletedIndices(updatedCompleted)
    setSkippedIndices((prev) => prev.filter((idx) => idx !== currentIndex))

    const nextIndex = getNextPendingIndex(currentIndex, entries.length, updatedCompleted)

    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex)
      setShowSubstitutions(false)
      return
    }

    setShowSubstitutions(false)
  }

  async function handleFinishWorkout() {
    try {
      setSaving(true)
      setError('')

      const safeCardioMinutes = completedCardio ? Number(cardioMinutes || 0) : 0
      const totalActualMinutes = strengthElapsedMinutes + safeCardioMinutes

      const exerciseLogs = entries.flatMap((entry, exerciseIndex) =>
        entry.sets.map((set, setIndex) => ({
          exercise_name: entry.name,
          exercise_index: exerciseIndex,
          set_number: setIndex + 1,
          weight: set.weight ? Number(set.weight) : null,
          reps: set.reps ? Number(set.reps) : null,
          difficulty: setIndex === entry.sets.length - 1 ? entry.difficulty || null : null,
          discomfort:
            setIndex === entry.sets.length - 1
              ? entry.discomfortLocation === 'None'
                ? null
                : `${entry.discomfortLocation}${entry.discomfortSeverity ? ` - ${entry.discomfortSeverity}` : ''}`
              : null,
          notes:
            setIndex === entry.sets.length - 1
              ? entry.substitutedFrom
                ? `Substituted from ${entry.substitutedFrom}${entry.note ? ` • ${entry.note}` : ''}`
                : entry.note || null
              : null,
        }))
      )

      await saveWorkoutAndLogsToSupabase({
        date,
        day_name: workout.dayName,
        focus: workout.focus,
        estimated_minutes: parseInt(workout.estimatedMinutes, 10) || null,
        actual_minutes: totalActualMinutes,
        strength_minutes: strengthElapsedMinutes,
        cardio_minutes: safeCardioMinutes,
        warmup_text: workout.warmup,
        cardio_text: workout.cardio,
        completed_cardio: completedCardio,
        exercise_order: entries.map((entry) => entry.name),
        exercise_logs: exerciseLogs,
      })

      clearWorkoutProgress(date, workout.dayName)
      router.push('/workout')
    } catch (err) {
      console.error(err)
      setError('Could not save workout. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const allExercisesCompleted = completedIndices.length === entries.length
  const isWarmupStep = currentIndex === -1

  return (
    <div className="space-y-4 pb-6">
      <div ref={scrollAnchorRef} />

      <div>
        <div className="label">Workout Log</div>
        <h1 className="text-xl font-semibold tracking-tight">
          {workout.dayName}: {workout.focus}
        </h1>
        <p className="mt-1 text-sm text-slate-300">{workout.estimatedMinutes}</p>
      </div>

      <section className="card space-y-3">
        <div className="label">Progress</div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isWarmupStep ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200'
            }`}
          >
            Warmup
          </div>

          {entries.map((entry, index) => {
            const isCurrent = currentIndex === index
            const isCompleted = completedIndices.includes(index)
            const isSkipped = skippedIndices.includes(index) && !isCompleted

            return (
              <div key={`${entry.name}-${index}`} className="relative">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                {isSkipped ? (
                  <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-950">
                    ↺
                  </div>
                ) : null}
              </div>
            )
          })}

          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              allExercisesCompleted ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-200'
            }`}
          >
            Cardio
          </div>
        </div>

        {!isWarmupStep && !allExercisesCompleted && currentEntry && currentTarget ? (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{currentEntry.name}</h2>
              <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {currentTarget.sets} × {currentTarget.reps}
              </div>
            </div>

            {currentEntry.substitutedFrom ? (
              <p className="text-xs text-amber-300">
                Substituted from {currentEntry.substitutedFrom}
              </p>
            ) : null}

            <p className="text-xs text-slate-400">Next: {nextLabel}</p>
          </div>
        ) : isWarmupStep ? (
          <div className="pt-1 text-xs text-slate-400">Warmup is included in tracked time.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
              <div className="label">Strength elapsed</div>
              <div className="mt-1 text-base font-semibold text-white">
                {strengthElapsedMinutes} min
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
              <div className="label">Planned cardio</div>
              <div className="mt-1 text-base font-semibold text-white">
                {plannedCardioMinutes || 0} min
              </div>
            </div>
          </div>
        )}
      </section>

      {isWarmupStep ? (
        <section className="card space-y-4">
          <div className="label">Warmup</div>
          <h2 className="text-lg font-semibold text-white">{workout.warmup}</h2>
          <p className="text-sm text-slate-400">
            Complete your warmup, then begin Exercise 1.
          </p>

          <button
            type="button"
            onClick={handleStartExercises}
            className="block w-full rounded-[1.5rem] bg-emerald-500 px-5 py-4 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
          >
            Start Exercise 1
          </button>
        </section>
      ) : !allExercisesCompleted && currentEntry ? (
        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-300">
              Exercise {currentIndex + 1} of {entries.length}
            </div>

            <button
              type="button"
              onClick={() => setShowSubstitutions((prev) => !prev)}
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
            >
              Substitute
            </button>
          </div>

          {showSubstitutions ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
              <div className="label">Substitute Exercise</div>
              <div className="mt-2 space-y-2">
                {substitutionOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSubstitute(option)}
                    className="block w-full rounded-xl bg-slate-800 px-3 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-slate-700"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {currentEntry.sets.map((set, setIndex) => (
              <div
                key={setIndex}
                className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3"
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Set {setIndex + 1}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={set.weight}
                    onChange={(e) => updateSetValue(setIndex, 'weight', e.target.value)}
                    inputMode="decimal"
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none"
                    placeholder="Weight"
                  />

                  <input
                    value={set.reps}
                    onChange={(e) => updateSetValue(setIndex, 'reps', e.target.value)}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none"
                    placeholder={currentTarget?.reps ?? 'Reps'}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="label">Final Set Difficulty</div>
            <div className="flex flex-wrap gap-2">
              {difficultyOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateCurrentField('difficulty', option)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${
                    currentEntry.difficulty === option
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="label">Discomfort Location</div>
            <div className="flex flex-wrap gap-2">
              {discomfortLocationOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    updateCurrentField('discomfortLocation', option)
                    if (option === 'None') {
                      updateCurrentField('discomfortSeverity', '')
                    }
                  }}
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${
                    currentEntry.discomfortLocation === option
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {currentEntry.discomfortLocation !== 'None' ? (
            <div className="space-y-2">
              <div className="label">Discomfort Severity</div>
              <div className="flex flex-wrap gap-2">
                {discomfortSeverityOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateCurrentField('discomfortSeverity', option)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold ${
                      currentEntry.discomfortSeverity === option
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <div className="label mb-2">Notes (optional)</div>
            <textarea
              value={currentEntry.note}
              onChange={(e) => updateCurrentField('note', e.target.value)}
              className="min-h-[84px] w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-3 py-3 text-white outline-none"
              placeholder="Optional notes"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipLock}
              className="rounded-[1.5rem] bg-white px-4 py-4 text-center text-[0.95rem] font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Skip for now
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="rounded-[1.5rem] bg-emerald-500 px-4 py-4 text-center text-[0.95rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
            >
              Next Exercise
            </button>
          </div>
        </section>
      ) : (
        <section className="card space-y-4">
          <div className="label">Cardio & Finish</div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">Strength elapsed</div>
              <div className="mt-2 text-[1.4rem] font-semibold text-white">
                {strengthElapsedMinutes} min
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">Suggested cardio</div>
              <div className="mt-2 text-[1.4rem] font-semibold text-white">
                {suggestedCardioMinutes} min
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Cardio Status</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCompletedCardio(true)
                  if (!cardioMinutes && suggestedCardioMinutes) {
                    setCardioMinutes(String(suggestedCardioMinutes))
                  }
                }}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  completedCardio
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                Completed
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompletedCardio(false)
                  setCardioMinutes('0')
                }}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  !completedCardio
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                Skipped
              </button>
            </div>

            {completedCardio ? (
              <div className="mt-4">
                <div className="label mb-2">Actual Cardio Minutes</div>
                <input
                  value={cardioMinutes}
                  onChange={(e) => setCardioMinutes(e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none"
                  placeholder={String(suggestedCardioMinutes || plannedCardioMinutes || 0)}
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Projected Total Duration</div>
            <div className="mt-2 text-[1.4rem] font-semibold text-white">
              {totalProjectedMinutes} min
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Strength and cardio are tracked separately so future workout-length logic can stay accurate.
            </p>
          </div>

          {error ? <p className="text-red-400">{error}</p> : null}

          <button
            type="button"
            onClick={handleFinishWorkout}
            disabled={saving}
            className="block w-full rounded-[1.5rem] bg-emerald-500 px-5 py-4 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Finish Workout'}
          </button>
        </section>
      )}
    </div>
  )
}