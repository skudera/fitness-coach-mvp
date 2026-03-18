import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  return data.user ?? null
}

export async function requireUserId() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Not signed in')
  }

  return user.id
}