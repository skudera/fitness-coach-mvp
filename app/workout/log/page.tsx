'use client'

import { useEffect, useMemo, useState } from 'react'
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
    discomfort: '',
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

export default function WorkoutLogPage() {
  const router = useRouter()
  const workout = useMemo(() => getWorkoutForToday(), [])
  const date = getLocalDateString()

  const [startedAt, setStartedAt] = useState<string>(new Date().toISOString())
  const [entries, setEntries] = useState<WorkoutExerciseEntry[]>(() =>
    buildInitialEntries(workout.exercises)
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedCardio, setCompletedCardio] = useState(false)
  const [skippedIndices, setSkippedIndices] = useState<number[]>([])
  const [completedIndices, setCompletedIndices] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showSubstitutions, setShowSubstitutions] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const saved = loadWorkoutProgress(date, workout.dayName)

    if (saved) {
      setStartedAt(saved.startedAt)
      setEntries(saved.entries)
      setCurrentIndex(saved.currentIndex)
      setCompletedCardio(saved.completedCardio)
      setSkippedIndices(saved.skippedIndices)
      setCompletedIndices(saved.completedIndices)
    }

    setIsLoaded(true)
  }, [date, workout.dayName])

  useEffect(() => {
    if (!isLoaded) return

    const progress: WorkoutProgressState = {
      date,
      dayName: workout.dayName,
      startedAt,
      currentIndex,
      completedCardio,
      skippedIndices,
      completedIndices,
      entries,
    }

    saveWorkoutProgress(progress)
  }, [
    isLoaded,
    date,
    workout.dayName,
    startedAt,
    currentIndex,
    completedCardio,
    skippedIndices,
    completedIndices,
    entries,
  ])

  const currentEntry = entries[currentIndex]
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

  const elapsedMinutes = useMemo(() => {
    const start = new Date(startedAt).getTime()
    const now = Date.now()
    return Math.max(1, Math.round((now - start) / 60000))
  }, [startedAt])

  const substitutionOptions = currentEntry
    ? getExerciseSubstitutions(currentEntry.name).filter((option) => option !== currentEntry.name)
    : []

  function updateSetValue(setIndex: number, field: 'weight' | 'reps', value: string) {
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
    field: 'difficulty' | 'discomfort' | 'note',
    value: string
  ) {
    setEntries((prev) =>
      prev.map((entry, index) =>
        index === currentIndex ? { ...entry, [field]: value } : entry
      )
    )
  }

  function handleSkip() {
    setSkippedIndices((prev) =>
      prev.includes(currentIndex) ? prev : [...prev, currentIndex]
    )

    const nextIndex = getNextPendingIndex(currentIndex, entries.length, completedIndices)
    if (nextIndex >= 0 && nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex)
    }

    setShowSubstitutions(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSubstitute(newExerciseName: string) {
    setEntries((prev) =>
      prev.map((entry, index) =>
        index === currentIndex
          ? {
              ...entry,
              substitutedFrom:
                entry.substitutedFrom ?? entry.name,
              name: newExerciseName,
            }
          : entry
      )
    )

    setShowSubstitutions(false)
  }

  function handleNext() {
    setCompletedIndices((prev) =>
      prev.includes(currentIndex) ? prev : [...prev, currentIndex]
    )
    setSkippedIndices((prev) => prev.filter((idx) => idx !== currentIndex))

    const nextIndex = getNextPendingIndex(
      currentIndex,
      entries.length,
      completedIndices.includes(currentIndex)
        ? completedIndices
        : [...completedIndices, currentIndex]
    )

    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex)
      setShowSubstitutions(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleFinishWorkout() {
    try {
      setSaving(true)
      setError('')

      const exerciseLogs = entries.flatMap((entry, exerciseIndex) =>
        entry.sets.map((set, setIndex) => ({
          exercise_name: entry.name,
          exercise_index: exerciseIndex,
          set_number: setIndex + 1,
          weight: set.weight ? Number(set.weight) : null,
          reps: set.reps ? Number(set.reps) : null,
          difficulty: setIndex === entry.sets.length - 1 ? entry.difficulty || null : null,
          discomfort: setIndex === entry.sets.length - 1 ? entry.discomfort || null : null,
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
        actual_minutes: elapsedMinutes,
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

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Workout Log</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {workout.dayName}: {workout.focus}
        </h1>
        <p className="mt-2 text-slate-300">{workout.estimatedMinutes}</p>
      </div>

      <section className="card space-y-4">
        <div className="label">Progress</div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-200">
            Warmup
          </div>

          {entries.map((entry, index) => {
            const isCurrent = currentIndex === index
            const isCompleted = completedIndices.includes(index)
            const isSkipped = skippedIndices.includes(index) && !isCompleted

            return (
              <div key={`${entry.name}-${index}`} className="relative">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
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

          <div className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-200">
            Cardio
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Target</div>
            <div className="mt-2 text-[1.1rem] font-semibold text-white">
              {currentTarget ? `${currentTarget.sets} × ${currentTarget.reps}` : '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Next</div>
            <div className="mt-2 text-[1.1rem] font-semibold text-white">
              {nextLabel}
            </div>
          </div>
        </div>
      </section>

      {!allExercisesCompleted ? (
        <section className="card space-y-4">
          <div className="label">Current Exercise</div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[1.9rem] font-semibold leading-tight text-white">
                {currentEntry?.name}
              </h2>
              {currentEntry?.substitutedFrom ? (
                <p className="mt-2 text-sm text-amber-300">
                  Substituted from {currentEntry.substitutedFrom}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setShowSubstitutions((prev) => !prev)}
              className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700"
            >
              Substitute
            </button>
          </div>

          {showSubstitutions ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">Substitute Exercise</div>
              <div className="mt-3 space-y-2">
                {substitutionOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSubstitute(option)}
                    className="block w-full rounded-xl bg-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-100 hover:bg-slate-700"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {currentEntry?.sets.map((set, setIndex) => (
              <div
                key={setIndex}
                className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
              >
                <div className="label">Set {setIndex + 1}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input
                    value={set.weight}
                    onChange={(e) => updateSetValue(setIndex, 'weight', e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none"
                    placeholder="Weight"
                  />
                  <input
                    value={set.reps}
                    onChange={(e) => updateSetValue(setIndex, 'reps', e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none"
                    placeholder="Reps"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">How did your final set feel?</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {['Easy', 'Good', 'Hard', 'Too Hard'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateCurrentField('difficulty', option)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                    currentEntry?.difficulty === option
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Discomfort</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {['None', 'Low', 'Medium', 'High'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateCurrentField('discomfort', option)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                    currentEntry?.discomfort === option
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-2">Notes (optional)</div>
            <textarea
              value={currentEntry?.note ?? ''}
              onChange={(e) => updateCurrentField('note', e.target.value)}
              className="min-h-[90px] w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-white outline-none"
              placeholder="Optional notes"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-[1.75rem] bg-white px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Skip for now
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
            >
              Next Exercise
            </button>
          </div>
        </section>
      ) : (
        <section className="card space-y-4">
          <div className="label">Finish Workout</div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Elapsed</div>
            <div className="mt-2 text-[1.8rem] font-semibold text-white">
              {elapsedMinutes} min
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Cardio</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCompletedCardio(true)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  completedCardio
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                Completed
              </button>
              <button
                type="button"
                onClick={() => setCompletedCardio(false)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  !completedCardio
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                Skipped
              </button>
            </div>
          </div>

          {error ? <p className="text-red-400">{error}</p> : null}

          <button
            type="button"
            onClick={handleFinishWorkout}
            disabled={saving}
            className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Finish Workout'}
          </button>
        </section>
      )}
    </div>
  )
}