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