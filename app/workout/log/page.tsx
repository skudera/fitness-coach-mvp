'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { getWorkoutForToday } from '@/lib/workout-data'
import { saveWorkoutAndLogsToSupabase } from '@/lib/storage-supabase'

type SetRow = {
  weight: string
  reps: string
}

type ExerciseEntry = {
  sets: SetRow[]
  difficulty: string
  discomfort: string
  notes: string
}

function createEmptyExercise(): ExerciseEntry {
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

export default function WorkoutLogPage() {
  const workout = getWorkoutForToday()
  const [step, setStep] = useState(0) // 0 = warmup, 1..n exercises, n+1 = cardio
  const [startedAt] = useState(Date.now())
  const [completedCardio, setCompletedCardio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [entries, setEntries] = useState<ExerciseEntry[]>(
    workout.exercises.map(() => createEmptyExercise())
  )

  const totalExerciseSteps = workout.exercises.length
  const cardioStep = totalExerciseSteps + 1
  const currentExerciseIndex = step - 1

  const elapsedMinutes = useMemo(() => {
    return Math.max(1, Math.round((Date.now() - startedAt) / 60000))
  }, [startedAt, step])

  function updateSet(exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) {
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

  async function finishWorkout() {
    try {
      setSaving(true)
      setError('')

      const today = new Date().toISOString().slice(0, 10)
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
        exercise_order: workout.exercises,
        exercise_logs: exerciseLogs,
      })

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
      <div>
        <div className="label">Workout</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {workout.dayName}: {workout.focus}
        </h1>
        <p className="mt-2 text-slate-300">Elapsed: {elapsedMinutes} min</p>
      </div>

      <section className="card space-y-4">
        <div className="label">Progress</div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
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
      </section>

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

      {step > 0 && step <= totalExerciseSteps && (
        <section className="card space-y-4">
          <div className="label">
            Exercise {step} of {totalExerciseSteps}
          </div>

          <h2 className="text-2xl font-semibold text-white">
            {workout.exercises[currentExerciseIndex]}
          </h2>

          <p className="text-slate-300">Target: 3 sets</p>

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
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label mb-2">Difficulty</div>
              <select
                value={entries[currentExerciseIndex].difficulty}
                onChange={(e) =>
                  updateExerciseField(currentExerciseIndex, 'difficulty', e.target.value)
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                <option value="">Select</option>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <div className="label mb-2">Discomfort</div>
              <select
                value={entries[currentExerciseIndex].discomfort}
                onChange={(e) =>
                  updateExerciseField(currentExerciseIndex, 'discomfort', e.target.value)
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                <option value="None">None</option>
                <option value="Shoulder">Shoulder</option>
                <option value="Back">Back</option>
                <option value="Both">Both</option>
              </select>
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

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setStep((prev) => Math.max(0, prev - 1))}
              className="block w-full rounded-[1.75rem] bg-white px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Back
            </button>

            <button
              onClick={() =>
                setStep((prev) => (prev < totalExerciseSteps ? prev + 1 : cardioStep))
              }
              className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
            >
              {step === totalExerciseSteps ? 'Go to cardio' : 'Next exercise'}
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
              onClick={() => setStep(totalExerciseSteps)}
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