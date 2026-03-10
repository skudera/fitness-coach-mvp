'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  loadWorkoutHistoryBundleFromSupabase,
  type ExerciseLogRow,
  type WorkoutRow,
} from '@/lib/storage-supabase'

function groupLogsByExercise(logs: ExerciseLogRow[]) {
  const grouped = new Map<string, ExerciseLogRow[]>()

  for (const log of logs) {
    const key = `${log.exercise_index ?? 0}-${log.exercise_name}`
    const existing = grouped.get(key) ?? []
    existing.push(log)
    grouped.set(key, existing)
  }

  return Array.from(grouped.entries()).map(([key, rows]) => ({
    key,
    exerciseName: rows[0]?.exercise_name ?? 'Exercise',
    rows,
  }))
}

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([])
  const [logs, setLogs] = useState<ExerciseLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [openWorkoutId, setOpenWorkoutId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const bundle = await loadWorkoutHistoryBundleFromSupabase()
        setWorkouts(bundle.workouts)
        setLogs(bundle.logs)
      } catch (error) {
        console.error('History page load error', error)
        setWorkouts([])
        setLogs([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const logsByWorkout = useMemo(() => {
    const map = new Map<string, ExerciseLogRow[]>()

    for (const log of logs) {
      const existing = map.get(log.workout_id) ?? []
      existing.push(log)
      map.set(log.workout_id, existing)
    }

    return map
  }, [logs])

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Workout History</div>
        <h1 className="text-2xl font-semibold tracking-tight">Review completed sessions</h1>
        <p className="mt-2 text-slate-300">
          Tap a workout to see the logged exercises and sets.
        </p>
      </div>

      {loading ? (
        <section className="card">
          <p className="text-slate-300">Loading workout history…</p>
        </section>
      ) : workouts.length === 0 ? (
        <section className="card">
          <p className="text-slate-300">No completed workouts yet.</p>
        </section>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => {
            const workoutLogs = logsByWorkout.get(workout.id) ?? []
            const groupedExercises = groupLogsByExercise(workoutLogs)
            const isOpen = openWorkoutId === workout.id

            return (
              <section key={workout.id} className="card space-y-4">
                <button
                  type="button"
                  onClick={() => setOpenWorkoutId(isOpen ? null : workout.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="label">{workout.date}</div>
                      <div className="mt-2 text-[1.2rem] font-semibold text-white">
                        {workout.day_name ?? 'Workout'}: {workout.focus ?? 'Session'}
                      </div>
                      <div className="mt-2 text-sm text-slate-400">
                        {workout.actual_minutes ?? '—'} min
                      </div>
                    </div>

                    <div className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                      {isOpen ? 'Hide' : 'View'}
                    </div>
                  </div>
                </button>

                {isOpen ? (
                  <div className="space-y-4 border-t border-slate-800 pt-4">
                    {groupedExercises.length === 0 ? (
                      <p className="text-slate-400">No exercise logs found.</p>
                    ) : (
                      groupedExercises.map((group) => (
                        <div
                          key={group.key}
                          className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
                        >
                          <div className="font-semibold text-white">{group.exerciseName}</div>

                          <div className="mt-3 space-y-2">
                            {group.rows.map((row) => (
                              <div
                                key={`${group.key}-${row.set_number}`}
                                className="flex items-center justify-between text-sm text-slate-300"
                              >
                                <span>Set {row.set_number}</span>
                                <span>
                                  {row.weight ?? '—'} lb × {row.reps ?? '—'}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-400">
                            <div>Difficulty: {group.rows[0]?.difficulty ?? '—'}</div>
                            <div>Discomfort: {group.rows[0]?.discomfort ?? '—'}</div>
                          </div>

                          {group.rows[0]?.notes ? (
                            <div className="mt-3 text-sm text-slate-400">
                              Notes: {group.rows[0]?.notes}
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}