import type { WorkoutDefinition } from './workout-data'
import { getTargetForExercise } from './workout-data'

export type ExerciseSetting = {
  /** Leave this exercise out of planned workouts and substitution lists. */
  disabled?: boolean
  /** What to do instead. Empty means drop it. */
  replacement?: string | null
  /** When a PT or provider last reviewed and cleared pain on this exercise (ISO timestamp). */
  painReviewedAt?: string | null
}

export type ExerciseSettings = Record<string, ExerciseSetting>

export function applyExerciseSettings(
  workout: WorkoutDefinition,
  settings: ExerciseSettings
): WorkoutDefinition {
  if (!workout.exercises.some((name) => settings[name]?.disabled)) return workout

  const exercises: string[] = []
  const targets = { ...workout.targets }

  for (const name of workout.exercises) {
    if (!settings[name]?.disabled) {
      if (!exercises.includes(name)) exercises.push(name)
      continue
    }

    const replacement = settings[name]?.replacement
    if (!replacement || settings[replacement]?.disabled || exercises.includes(replacement)) continue
    if (workout.exercises.includes(replacement)) continue

    exercises.push(replacement)
    // Keep the planned number of sets; reps follow the replacement exercise.
    targets[replacement] = {
      ...getTargetForExercise(replacement),
      sets: getTargetForExercise(name, workout).sets,
    }
  }

  return { ...workout, exercises, targets }
}
