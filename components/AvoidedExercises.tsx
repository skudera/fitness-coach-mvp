'use client'

import { useEffect, useState } from 'react'
import { loadExerciseSettings, saveExerciseSettings } from '@/lib/storage-supabase'
import type { ExerciseSetting, ExerciseSettings } from '@/lib/exercise-settings'
import {
  getExerciseSubstitutions,
  getWeekPlan,
  PT_CLEARANCE_EXERCISES,
} from '@/lib/workout-data'

const programExercises = [...new Set(getWeekPlan().flatMap((item) => item.workout.exercises))].sort()

export function AvoidedExercises() {
  const [settings, setSettings] = useState<ExerciseSettings>({})
  const [error, setError] = useState('')

  useEffect(() => {
    loadExerciseSettings().then(setSettings).catch(console.error)
  }, [])

  async function update(name: string, change: ExerciseSetting) {
    const next = { ...settings, [name]: { ...settings[name], ...change } }
    try {
      setError('')
      await saveExerciseSettings(next)
      setSettings(next)
    } catch (err) {
      console.error(err)
      setError('Could not save. Please try again.')
    }
  }

  return (
    <div className="card space-y-3">
      <div>
        <div className="label">Exercises to avoid</div>
        <p className="mt-1 text-sm text-slate-400">
          Turn off anything that keeps causing discomfort. Changes save immediately.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {programExercises.map((name) => {
        const disabled = Boolean(settings[name]?.disabled)
        return (
          <div key={name} className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-100">{name}</span>
              <button
                type="button"
                aria-label={`${disabled ? 'Allow' : 'Avoid'} ${name}`}
                onClick={() => update(name, { disabled: !disabled })}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  disabled ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200'
                }`}
              >
                {disabled ? 'Avoiding' : 'Avoid'}
              </button>
            </div>

            {disabled ? (
              <select
                aria-label={`Replacement for ${name}`}
                value={settings[name]?.replacement ?? ''}
                onChange={(e) => update(name, { replacement: e.target.value || null })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="">Leave it out</option>
                {getExerciseSubstitutions(name).map((option) => (
                  <option key={option} value={option}>
                    {option}
                    {PT_CLEARANCE_EXERCISES.includes(option) ? ' (only if PT-cleared)' : ''}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
