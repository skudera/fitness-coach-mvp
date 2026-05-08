'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error('Auth session load error', error)
        setError('Unable to load your session.')
      }

      setSession(data?.session ?? null)
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

  const signedInEmail = useMemo(() => session?.user?.email ?? '', [session])

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      setError('Enter your email and password.')
      return
    }

    setSigningIn(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    setSigningIn(false)

    if (error) {
      console.error('Sign in error', error)
      setError(error.message || 'Invalid email or password.')
    }
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
            <p className="mt-2 text-slate-300">Enter your email and password.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSignIn}>
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

            <div className="space-y-2">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-slate-500 focus:border-slate-500"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={signingIn}
              className="w-full rounded-2xl bg-white px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingIn ? 'Signing in…' : 'Sign in'}
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
