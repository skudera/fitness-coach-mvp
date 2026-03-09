export type LoggedSetRow = {
  weight: string
  reps: string
}

export type ExerciseEntryState = {
  sets: LoggedSetRow[]
  difficulty: string
  discomfort: string
  notes: string
}

export type WorkoutProgressState = {
  startedAt: number
  step: number
  exerciseOrder: number[]
  entries: ExerciseEntryState[]
  completedCardio: boolean
}

function getKey(date: string, dayName: string) {
  return `fitness-coach:workout-progress:${date}:${dayName}`
}

export function loadWorkoutProgress(date: string, dayName: string): WorkoutProgressState | null {
  try {
    const raw = localStorage.getItem(getKey(date, dayName))
    if (!raw) return null
    return JSON.parse(raw) as WorkoutProgressState
  } catch (error) {
    console.error('Could not load workout progress', error)
    return null
  }
}

export function saveWorkoutProgress(
  date: string,
  dayName: string,
  state: WorkoutProgressState
) {
  try {
    localStorage.setItem(getKey(date, dayName), JSON.stringify(state))
  } catch (error) {
    console.error('Could not save workout progress', error)
  }
}

export function clearWorkoutProgress(date: string, dayName: string) {
  try {
    localStorage.removeItem(getKey(date, dayName))
  } catch (error) {
    console.error('Could not clear workout progress', error)
  }
}