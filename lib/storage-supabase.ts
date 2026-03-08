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