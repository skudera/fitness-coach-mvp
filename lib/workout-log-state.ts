export type WorkoutSetInput = {
  weight: string
  reps: string
}

export type WorkoutExerciseEntry = {
  name: string
  substitutedFrom?: string | null
  sets: WorkoutSetInput[]
  difficulty: string
  discomfortLocation: string
  discomfortSeverity: string
  note: string
}

export type WorkoutProgressState = {
  date: string
  dayName: string
  startedAt: string
  currentIndex: number
  completedCardio: boolean
  cardioMinutes: string
  skippedIndices: number[]
  completedIndices: number[]
  entries: WorkoutExerciseEntry[]
}

function getStorageKey(date: string, dayName: string) {
  return `fitness-coach-workout:${date}:${dayName}`
}

export function loadWorkoutProgress(date: string, dayName: string): WorkoutProgressState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getStorageKey(date, dayName))
    if (!raw) return null

    const parsed = JSON.parse(raw) as WorkoutProgressState

    parsed.entries = (parsed.entries ?? []).map((entry) => ({
      ...entry,
      discomfortLocation:
        typeof (entry as any).discomfortLocation === 'string'
          ? (entry as any).discomfortLocation
          : 'None',
      discomfortSeverity:
        typeof (entry as any).discomfortSeverity === 'string'
          ? (entry as any).discomfortSeverity
          : '',
    }))

    if (typeof parsed.currentIndex !== 'number') {
      parsed.currentIndex = -1
    }

    if (typeof parsed.cardioMinutes !== 'string') {
      parsed.cardioMinutes = ''
    }

    return parsed
  } catch (error) {
    console.error('loadWorkoutProgress error', error)
    return null
  }
}

export function saveWorkoutProgress(progress: WorkoutProgressState) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      getStorageKey(progress.date, progress.dayName),
      JSON.stringify(progress)
    )
  } catch (error) {
    console.error('saveWorkoutProgress error', error)
  }
}

export function clearWorkoutProgress(date: string, dayName: string) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(getStorageKey(date, dayName))
  } catch (error) {
    console.error('clearWorkoutProgress error', error)
  }
}