import { supabase } from './supabase'

const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEFAULT_USER_ID!

export type BodyMetricRow = {
  id?: string
  date: string
  weight?: number | null
  body_fat?: number | null
  water_percent?: number | null
  waist?: number | null
  chest?: number | null
  thigh?: number | null
  bicep?: number | null
  notes?: string | null
  created_at?: string
}

export type CompletedSessionRow = {
  id?: string
  user_id?: string
  workout_id?: string | null
  date: string
  duration_minutes?: number | null
  completed_cardio?: boolean
  completed_sauna?: boolean
  created_at?: string
}

export type WorkoutRow = {
  id: string
  user_id?: string
  date: string
  day_name?: string | null
  focus?: string | null
  status?: string | null
  estimated_minutes?: number | null
  actual_minutes?: number | null
  warmup_text?: string | null
  cardio_json?: { text?: string } | null
  exercise_order?: string[] | null
  workout_json?: Record<string, unknown> | null
  created_at?: string
}

export type ExerciseLogRow = {
  id?: string
  workout_id: string
  exercise_name: string
  exercise_index?: number | null
  set_number: number
  weight?: number | null
  reps?: number | null
  difficulty?: string | null
  discomfort?: string | null
  notes?: string | null
  created_at?: string
}

export type EquipmentPreferences = {
  pressing_preference?: string | null
  row_preference?: string | null
  leg_press_preference?: string | null
  overhead_press_preference?: string | null
  core_preference?: string | null
  cardio_preference?: string | null
}

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTomorrowWorkoutLabel() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const day = tomorrow.getDay()

  switch (day) {
    case 0:
      return 'Sunday: Recovery / Mobility'
    case 1:
      return 'Monday: Chest / Shoulders / Cardio'
    case 2:
      return 'Tuesday: Back / Core / Cardio'
    case 3:
      return 'Wednesday: Legs / Core / Cardio'
    case 4:
      return 'Thursday: Upper Mixed / Basketball'
    case 5:
      return 'Friday: Lower / Recovery Conditioning'
    case 6:
      return 'Saturday: Optional Recovery / Mobility'
    default:
      return 'Next workout'
  }
}

export function getWeekStartDate() {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)
  return getLocalDateString(monday)
}

export async function loadBodyMetricsHistoryFromSupabase(): Promise<BodyMetricRow[]> {
  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .order('date', { ascending: true })

  if (error) {
    console.error('Supabase body metrics load error:', error)
    return []
  }

  return (data ?? []) as BodyMetricRow[]
}

export async function loadTodayCheckInFromSupabase(date?: string): Promise<BodyMetricRow | null> {
  const targetDate = date ?? getLocalDateString()

  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .eq('date', targetDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Supabase today check-in load error:', error)
    return null
  }

  return (data as BodyMetricRow | null) ?? null
}

export async function saveBodyMetricToSupabase(payload: {
  date: string
  weight?: number | null
  body_fat?: number | null
  water_percent?: number | null
  waist?: number | null
  chest?: number | null
  thigh?: number | null
  bicep?: number | null
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('body_metrics')
    .insert([
      {
        user_id: DEFAULT_USER_ID,
        ...payload,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Supabase body metric save error:', error)
    throw error
  }

  return data
}

type ExerciseSetLog = {
  exercise_name: string
  exercise_index: number
  set_number: number
  weight?: number | null
  reps?: number | null
  difficulty?: string | null
  discomfort?: string | null
  notes?: string | null
}

export async function saveWorkoutAndLogsToSupabase(payload: {
  date: string
  day_name: string
  focus: string
  estimated_minutes?: number | null
  actual_minutes?: number | null
  strength_minutes?: number | null
  cardio_minutes?: number | null
  warmup_text?: string | null
  cardio_text?: string | null
  completed_cardio?: boolean
  exercise_order?: string[]
  exercise_logs: ExerciseSetLog[]
}) {
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert([
      {
        user_id: DEFAULT_USER_ID,
        date: payload.date,
        day_name: payload.day_name,
        focus: payload.focus,
        status: 'completed',
        estimated_minutes: payload.estimated_minutes ?? null,
        actual_minutes: payload.actual_minutes ?? null,
        warmup_text: payload.warmup_text ?? null,
        cardio_json: payload.cardio_text ? { text: payload.cardio_text } : null,
        exercise_order: payload.exercise_order ?? [],
        workout_json: {
          focus: payload.focus,
          completed_cardio: payload.completed_cardio ?? false,
          strength_minutes: payload.strength_minutes ?? null,
          cardio_minutes: payload.cardio_minutes ?? null,
          total_minutes: payload.actual_minutes ?? null,
        },
      },
    ])
    .select()
    .single()

  if (workoutError) {
    console.error('Supabase workout save error:', workoutError)
    throw workoutError
  }

  if (payload.exercise_logs.length) {
    const { error: logsError } = await supabase
      .from('exercise_logs')
      .insert(
        payload.exercise_logs.map((log) => ({
          workout_id: workout.id,
          ...log,
        }))
      )

    if (logsError) {
      console.error('Supabase exercise logs save error:', logsError)
      throw logsError
    }
  }

  const { error: sessionError } = await supabase
    .from('completed_sessions')
    .insert([
      {
        user_id: DEFAULT_USER_ID,
        workout_id: workout.id,
        date: payload.date,
        duration_minutes: payload.actual_minutes ?? null,
        completed_cardio: payload.completed_cardio ?? false,
        completed_sauna: false,
      },
    ])

  if (sessionError) {
    console.error('Supabase completed session save error:', sessionError)
    throw sessionError
  }

  return workout
}

export async function loadCompletedSessionsFromSupabase(): Promise<CompletedSessionRow[]> {
  const { data, error } = await supabase
    .from('completed_sessions')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase completed sessions load error:', error)
    return []
  }

  return (data ?? []) as CompletedSessionRow[]
}

export async function getWeeklySettings(weekStart: string) {
  const { data, error } = await supabase
    .from('weekly_settings')
    .select('*')
    .eq('week_start', weekStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('weekly settings load error', error)
    return null
  }

  return data
}

export async function saveWeeklyBasketball(weekStart: string, status: string) {
  const { error } = await supabase
    .from('weekly_settings')
    .insert([
      {
        week_start: weekStart,
        basketball_status: status,
      },
    ])

  if (error) {
    console.error('weekly basketball save error', error)
  }
}

export async function loadWorkoutHistoryBundleFromSupabase(): Promise<{
  workouts: WorkoutRow[]
  logs: ExerciseLogRow[]
}> {
  const { data: workoutsData, error: workoutsError } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30)

  if (workoutsError) {
    console.error('Workout history load error:', workoutsError)
    return { workouts: [], logs: [] }
  }

  const workouts = (workoutsData ?? []) as WorkoutRow[]
  const workoutIds = workouts.map((w) => w.id).filter(Boolean)

  if (!workoutIds.length) {
    return { workouts, logs: [] }
  }

  const { data: logsData, error: logsError } = await supabase
    .from('exercise_logs')
    .select('*')
    .in('workout_id', workoutIds)
    .order('exercise_index', { ascending: true })
    .order('set_number', { ascending: true })

  if (logsError) {
    console.error('Exercise log history load error:', logsError)
    return { workouts, logs: [] }
  }

  return {
    workouts,
    logs: (logsData ?? []) as ExerciseLogRow[],
  }
}

export async function loadExerciseLogHistoryFromSupabase(
  exerciseNames: string[]
): Promise<ExerciseLogRow[]> {
  if (!exerciseNames.length) return []

  const uniqueNames = [...new Set(exerciseNames)]

  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .in('exercise_name', uniqueNames)
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    console.error('Exercise log suggestion load error:', error)
    return []
  }

  return (data ?? []) as ExerciseLogRow[]
}

export async function loadEquipmentPreferences(): Promise<EquipmentPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error loading preferences', error)
    return null
  }

  return data
}

export async function saveEquipmentPreferences(prefs: EquipmentPreferences) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert([prefs])

  if (error) {
    console.error('Error saving preferences', error)
  }
}