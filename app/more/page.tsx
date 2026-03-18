'use client'

import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function MorePage() {
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error', error)
      return
    }

    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">More</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tools, planning, and history
        </h1>
        <p className="mt-2 text-slate-300">
          Review your weekly plan, update settings, or look back at completed workouts.
        </p>
      </div>

      <section className="card space-y-4">
        <div className="label">Planning</div>

        <Link
          href="/plan"
          className="block rounded-2xl border border-slate-700 bg-slate-900/40 px-5 py-5 transition hover:bg-slate-800/60"
        >
          <div className="text-[1.1rem] font-semibold text-white">
            Weekly Plan Preview
          </div>

          <div className="mt-2 text-sm text-slate-400">
            View each day’s workout before you start.
          </div>
        </Link>

        <Link
          href="/checkin"
          className="block rounded-2xl border border-slate-700 bg-slate-900/40 px-5 py-5 transition hover:bg-slate-800/60"
        >
          <div className="text-[1.1rem] font-semibold text-white">
            Weekly Settings / Check-In
          </div>

          <div className="mt-2 text-sm text-slate-400">
            Update body metrics and basketball status for the current week.
          </div>
        </Link>
      </section>

      <section className="card space-y-4">
        <div className="label">Preferences</div>

        <Link
          href="/preferences"
          className="block rounded-2xl border border-slate-700 bg-slate-900/40 px-5 py-5 transition hover:bg-slate-800/60"
        >
          <div className="text-[1.1rem] font-semibold text-white">
            Equipment Preferences
          </div>

          <div className="mt-2 text-sm text-slate-400">
            Choose equipment styles the app should favor during substitutions and planning.
          </div>
        </Link>
      </section>

      <section className="card space-y-4">
        <div className="label">History</div>

        <Link
          href="/history"
          className="block rounded-2xl border border-slate-700 bg-slate-900/40 px-5 py-5 transition hover:bg-slate-800/60"
        >
          <div className="text-[1.1rem] font-semibold text-white">
            Workout History
          </div>

          <div className="mt-2 text-sm text-slate-400">
            Review completed workouts, sets, reps, duration, and notes.
          </div>
        </Link>
      </section>

      <section className="card space-y-4">
        <div className="label">Security</div>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-5 py-4 text-left transition hover:bg-slate-800/60"
        >
          <div className="text-[1.1rem] font-semibold text-white">Sign out</div>
          <div className="mt-2 text-sm text-slate-400">
            End your current session on this device.
          </div>
        </button>
      </section>
    </div>
  )
}