'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

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

  useEffect(() => {
    if (!cooldownSeconds) return

    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldownSeconds])

  const signedInEmail = useMemo(() => {
    return session?.user?.email ?? ''
  }, [session])

  async function handleSendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError('Enter your email address.')
      return
    }

    if (cooldownSeconds > 0) {
      setError(`Please wait ${cooldownSeconds}s before requesting another code.`)
      return
    }

    setSendingCode(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    })

    setSendingCode(false)

    if (error) {
      console.error('Send OTP error', error)
      setError(error.message || 'Unable to send code.')
      return
    }

    setEmail(normalizedEmail)
    setStep('code')
    setCode('')
    setCooldownSeconds(60)
    setMessage('A 6-digit code was sent to your email. Enter it below.')
  }

  async function handleVerifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedCode = code.trim()

    if (!normalizedEmail) {
      setError('Enter your email address.')
      setStep('email')
      return
    }

    if (!normalizedCode) {
      setError('Enter the code from your email.')
      return
    }

    setVerifyingCode(true)

    const {
      data: { session: nextSession },
      error,
    } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedCode,
      type: 'email',
    })

    setVerifyingCode(false)

    if (error) {
      console.error('Verify OTP error', error)
      setError(error.message || 'Invalid or expired code.')
      return
    }

    setSession(nextSession ?? null)
    setMessage('')
    setError('')
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
              Enter your email and then type the code sent to your inbox.
            </p>
          </div>

          {step === 'email' ? (
            <form className="space-y-4" onSubmit={handleSendCode}>
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
                disabled={sendingCode || cooldownSeconds > 0}
                className="w-full rounded-2xl bg-white px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingCode
                  ? 'Sending code...'
                  : cooldownSeconds > 0
                    ? `Resend available in ${cooldownSeconds}s`
                    : 'Send code'}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleVerifyCode}>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                Code sent to <span className="font-medium text-white">{email}</span>
              </div>

              <div className="space-y-2">
                <label className="label" htmlFor="code">
                  6-digit code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base tracking-[0.3em] text-white outline-none ring-0 placeholder:tracking-normal placeholder:text-slate-500 focus:border-slate-500"
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
                disabled={verifyingCode}
                className="w-full rounded-2xl bg-white px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifyingCode ? 'Verifying...' : 'Verify code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError('')
                  setMessage('')
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-base font-medium text-white transition hover:bg-slate-800/60"
              >
                Use a different email
              </button>

              <button
                type="button"
                onClick={async () => {
                  setError('')
                  setMessage('')

                  if (cooldownSeconds > 0) {
                    setError(`Please wait ${cooldownSeconds}s before requesting another code.`)
                    return
                  }

                  setSendingCode(true)

                  const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: {
                      shouldCreateUser: false,
                    },
                  })

                  setSendingCode(false)

                  if (error) {
                    console.error('Resend OTP error', error)
                    setError(error.message || 'Unable to resend code.')
                    return
                  }

                  setCooldownSeconds(60)
                  setMessage('A new code was sent to your email.')
                }}
                disabled={sendingCode || cooldownSeconds > 0}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-base font-medium text-white transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingCode
                  ? 'Sending code...'
                  : cooldownSeconds > 0
                    ? `Resend available in ${cooldownSeconds}s`
                    : 'Resend code'}
              </button>
            </form>
          )}

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