'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getWorkoutForToday, getTargetForExercise } from '@/lib/workout-data'
import { saveWorkoutAndLogsToSupabase, getLocalDateString } from '@/lib/storage-supabase'
import {
  clearWorkoutProgress,
  loadWorkoutProgress,
  saveWorkoutProgress,
  type ExerciseEntryState,
} from '@/lib/workout-log-state'

function createEmptyExercise(): ExerciseEntryState {
  return {
    sets: [
      { weight: '', reps: '' },
      { weight: '', reps: '' },
      { weight: '', reps: '' },
    ],
    difficulty: '',
    discomfort: 'None',
    notes: '',
  }
}

const difficultyOptions = ['Easy', 'Moderate', 'Hard']
const discomfortOptions = ['None', 'Shoulder', 'Back', 'Both']

export default function WorkoutLogPage() {
  const workout = useMemo(() => getWorkoutForToday(), [])
  const today = useMemo(() => getLocalDateString(), [])

  const [step, setStep] = useState(0) // 0 = warmup, 1..n = exercises, n+1 = cardio
  const [startedAt, setStartedAt] = useState(Date.now())
  const [exerciseOrder, setExerciseOrder] = useState<number[]>([])
  const [entries, setEntries] = useState<ExerciseEntryState[]>([])
  const [completedCardio, setCompletedCardio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)

  const totalExercises = workout.exercises.length
  const cardioStep = totalExercises + 1

  useEffect(() => {
    const defaultEntries = workout.exercises.map(() => createEmptyExercise())
    const defaultOrder = workout.exercises.map((_, index) => index)

    const savedProgress = loadWorkoutProgress(today, workout.dayName)

    if (savedProgress) {
      setStartedAt(savedProgress.startedAt ?? Date.now())
      setStep(savedProgress.step ?? 0)
      setExerciseOrder(
        Array.isArray(savedProgress.exerciseOrder) && savedProgress.exerciseOrder.length
          ? savedProgress.exerciseOrder
          : defaultOrder
      )
      setEntries(
        Array.isArray(savedProgress.entries) && savedProgress.entries.length
          ? savedProgress.entries
          : defaultEntries
      )
      setCompletedCardio(Boolean(savedProgress.completedCardio))
    } else {
      setStartedAt(Date.now())
      setStep(0)
      setExerciseOrder(defaultOrder)
      setEntries(defaultEntries)
      setCompletedCardio(false)
    }

    setHydrated(true)
  }, [today, workout.dayName])

  useEffect(() => {
    if (!hydrated || saved) return

    saveWorkoutProgress(today, workout.dayName, {
      startedAt,
      step,
      exerciseOrder,
      entries,
      completedCardio,
    })
  }, [hydrated, saved, today, workout.dayName, startedAt, step, exerciseOrder, entries, completedCardio])

  const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))

  const currentExerciseIndex =
    step > 0 && step <= totalExercises ? exerciseOrder[step - 1] : null

  const currentExerciseName =
    currentExerciseIndex != null ? workout.exercises[currentExerciseIndex] : ''

  const nextExerciseName =
    step > 0 && step < totalExercises
      ? workout.exercises[exerciseOrder[step]]
      : step === totalExercises
      ? 'Cardio'
      : totalExercises > 0
      ? workout.exercises[exerciseOrder[0]]
      : ''

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) {
    setEntries((prev) => {
      const copy = [...prev]
      const exercise = { ...copy[exerciseIndex] }
      const sets = [...exercise.sets]
      sets[setIndex] = { ...sets[setIndex], [field]: value }
      exercise.sets = sets
      copy[exerciseIndex] = exercise
      return copy
    })
  }

  function updateExerciseField(
    exerciseIndex: number,
    field: 'difficulty' | 'discomfort' | 'notes',
    value: string
  ) {
    setEntries((prev) => {
      const copy = [...prev]
      copy[exerciseIndex] = { ...copy[exerciseIndex], [field]: value }
      return copy
    })
  }

  function handleSkipForNow() {
    if (currentExerciseIndex == null) return

    const currentPosition = step - 1

    setExerciseOrder((prev) => {
      const copy = [...prev]
      const [skipped] = copy.splice(currentPosition, 1)
      copy.push(skipped)
      return copy
    })
  }

  async function finishWorkout() {
    try {
      setSaving(true)
      setError('')

      const actualMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))

      const exerciseLogs = entries.flatMap((entry, exerciseIndex) =>
        entry.sets.map((setRow, setIndex) => ({
          exercise_name: workout.exercises[exerciseIndex],
          exercise_index: exerciseIndex,
          set_number: setIndex + 1,
          weight: setRow.weight ? Number(setRow.weight) : null,
          reps: setRow.reps ? Number(setRow.reps) : null,
          difficulty: entry.difficulty || null,
          discomfort: entry.discomfort || null,
          notes: entry.notes || null,
        }))
      )

      await saveWorkoutAndLogsToSupabase({
        date: today,
        day_name: workout.dayName,
        focus: workout.focus,
        estimated_minutes: null,
        actual_minutes: actualMinutes,
        warmup_text: workout.warmup,
        cardio_text: workout.cardio,
        completed_cardio: completedCardio,
        exercise_order: exerciseOrder.map((index) => workout.exercises[index]),
        exercise_logs: exerciseLogs,
      })

      clearWorkoutProgress(today, workout.dayName)
      setSaved(true)
    } catch (err) {
      console.error(err)
      setError('Could not save workout. Please try again.')
    } finally {
      setSaving(false)
    }
  }

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

  const progressItems = ['Warmup', ...workout.exercises.map((_, i) => `${i + 1}`), 'Cardio']

  return (
    <div className="space-y-6 pb-6">
      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-800 bg-slate-950/95 px-4 pb-4 pt-2 backdrop-blur">
        <div className="label">Workout</div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
          {progressItems.map((item, index) => {
            const active = index === step
            return (
              <div
                key={item}
                className={`rounded-full px-3 py-1 ${
                  active ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {item}
              </div>
            )
          })}
        </div>

        {step === 0 ? (
          <div className="mt-4">
            <h1 className="text-2xl font-semibold text-white">Warmup</h1>
            <p className="mt-1 text-slate-300">{workout.warmup}</p>
          </div>
        ) : step > 0 && step <= totalExercises ? (
          <div className="mt-4 space-y-2">
            <div className="label">
              Exercise {step} of {totalExercises}
            </div>

            <h1 className="text-2xl font-semibold text-white">{currentExerciseName}</h1>

            <p className="text-slate-300">
              Target: {getTargetForExercise(currentExerciseName).sets} × {getTargetForExercise(currentExerciseName).reps}
            </p>

            <p className="text-sm text-slate-400">
              Next: {nextExerciseName}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <h1 className="text-2xl font-semibold text-white">Cardio</h1>
            <p className="mt-1 text-slate-300">{workout.cardio}</p>
          </div>
        )}

        <p className="mt-3 text-sm text-slate-400">Elapsed: {elapsedMinutes} min</p>
      </div>

      {step === 0 && (
        <section className="card space-y-4">
          <div className="label">Warmup</div>
          <p className="text-slate-100">{workout.warmup}</p>

          <button
            onClick={() => setStep(1)}
            className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
          >
            Start first exercise
          </button>
        </section>
      )}

      {step > 0 && step <= totalExercises && currentExerciseIndex != null && (
        <section className="card space-y-4">
          <div className="space-y-4">
            {entries[currentExerciseIndex].sets.map((setRow, setIndex) => (
              <div
                key={setIndex}
                className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 space-y-3"
              >
                <div className="label">Set {setIndex + 1}</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="label mb-2">Weight</div>
                    <input
                      type="number"
                      step="0.5"
                      value={setRow.weight}
                      onChange={(e) =>
                        updateSet(currentExerciseIndex, setIndex, 'weight', e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                      placeholder="e.g. 7.5"
                    />
                  </div>

                  <div>
                    <div className="label mb-2">Reps</div>
                    <input
                      type="number"
                      value={setRow.reps}
                      onChange={(e) =>
                        updateSet(currentExerciseIndex, setIndex, 'reps', e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                      placeholder={`Target ${getTargetForExercise(currentExerciseName).reps}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="label mb-2">Difficulty</div>
            <div className="flex flex-wrap gap-2">
              {difficultyOptions.map((option) => {
                const active = entries[currentExerciseIndex].difficulty === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateExerciseField(currentExerciseIndex, 'difficulty', option)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="label mb-2">Discomfort</div>
            <div className="flex flex-wrap gap-2">
              {discomfortOptions.map((option) => {
                const active = entries[currentExerciseIndex].discomfort === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateExerciseField(currentExerciseIndex, 'discomfort', option)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="label mb-2">Notes (optional)</div>
            <textarea
              value={entries[currentExerciseIndex].notes}
              onChange={(e) =>
                updateExerciseField(currentExerciseIndex, 'notes', e.target.value)
              }
              className="min-h-[100px] w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              placeholder="Optional notes"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setStep((prev) => Math.max(0, prev - 1))}
              className="block w-full rounded-[1.5rem] bg-white px-4 py-4 text-center text-[0.95rem] font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Back
            </button>

            <button
              onClick={handleSkipForNow}
              className="block w-full rounded-[1.5rem] bg-slate-800 px-4 py-4 text-center text-[0.95rem] font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              Skip for now
            </button>

            <button
              onClick={() =>
                setStep((prev) => (prev < totalExercises ? prev + 1 : cardioStep))
              }
              className="block w-full rounded-[1.5rem] bg-emerald-500 px-4 py-4 text-center text-[0.95rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
            >
              {step === totalExercises ? 'Go to cardio' : 'Next'}
            </button>
          </div>
        </section>
      )}

      {step === cardioStep && !saved && (
        <section className="card space-y-4">
          <div className="label">Cardio</div>
          <p className="text-slate-100">{workout.cardio}</p>

          <label className="flex items-center gap-3 text-slate-100">
            <input
              type="checkbox"
              checked={completedCardio}
              onChange={(e) => setCompletedCardio(e.target.checked)}
            />
            Cardio completed
          </label>

          {error ? <p className="text-red-400">{error}</p> : null}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setStep(totalExercises)}
              className="block w-full rounded-[1.75rem] bg-white px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Back
            </button>

            <button
              onClick={finishWorkout}
              disabled={saving}
              className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Finish workout'}
            </button>
          </div>
        </section>
      )}

      {saved && (
        <section className="card space-y-4">
          <div className="label">Workout saved</div>
          <h2 className="text-2xl font-semibold text-white">Nice work.</h2>
          <p className="text-slate-300">
            Your workout was saved to Supabase.
          </p>

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
        </section>
      )}
    </div>
  )
}