'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error('Auth session load error', error)
        setError('Unable to load your session.')
        setSession(null)
        setLoading(false)
        return
      }

      setSession(data.session ?? null)
      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setLoading(false)
      setError('')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signedInEmail = useMemo(() => {
    return session?.user?.email ?? ''
  }, [session])

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError('Enter your email address.')
      return
    }

    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin : undefined

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      console.error('Magic link error', error)
      setError(error.message || 'Unable to send magic link.')
      return
    }

    setMessage('Magic link sent. Open your email and tap the link to sign in.')
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="card w-full space-y-3 text-center">
          <div className="label">Security</div>
          <h1 className="text-2xl font-semibold tracking-tight">Loading session…</h1>
          <p className="text-slate-300">Checking your secure sign-in status.</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="card w-full space-y-5">
          <div>
            <div className="label">Secure access</div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to Fitness Coach</h1>
            <p className="mt-2 text-slate-300">
              Use your approved email address to receive a magic link.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleMagicLink}>
            <div className="space-y-2">
              <label className="label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-slate-500 focus:border-slate-500"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-2xl bg-white px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Send magic link
            </button>
          </form>

          <div className="text-sm text-slate-400">
            Once you sign in, the app will load only your data.
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-md px-4 pt-3">
        <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-300">
          Signed in as <span className="font-medium text-white">{signedInEmail}</span>
        </div>
      </div>
      {children}
    </>
  )
}