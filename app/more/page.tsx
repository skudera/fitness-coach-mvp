'use client'

import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type MoreTileProps = {
  href: string
  title: string
  description: string
}

function MoreTile({ href, title, description }: MoreTileProps) {
  return (
    <Link
      href={href}
      className="flex min-h-[148px] flex-col justify-between rounded-[1.75rem] border border-slate-700 bg-slate-900/40 p-5 transition hover:bg-slate-800/60"
    >
      <div className="text-[1.05rem] font-semibold text-white">{title}</div>
      <div className="mt-4 text-sm leading-6 text-slate-400">{description}</div>
    </Link>
  )
}

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
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Tools, planning, and history
        </h1>
        <p className="mt-2 text-slate-300">
          Jump into the parts of the app you use most.
        </p>
      </div>

      <section className="space-y-4">
        <div className="label">Tools</div>

        <div className="grid grid-cols-2 gap-4">
          <MoreTile
            href="/plan"
            title="Weekly Plan"
            description="Preview each day’s workout before you start."
          />

          <MoreTile
            href="/checkin"
            title="Check-In"
            description="Update body metrics and weekly settings."
          />

          <MoreTile
            href="/preferences"
            title="Preferences"
            description="Choose equipment styles for planning and substitutions."
          />

          <MoreTile
            href="/history"
            title="History"
            description="Review completed workouts, sets, reps, and notes."
          />
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">Security</div>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-[1.5rem] border border-slate-700 bg-slate-900/40 px-5 py-4 text-left transition hover:bg-slate-800/60"
        >
          <div className="text-[1.05rem] font-semibold text-white">Sign out</div>
          <div className="mt-2 text-sm leading-6 text-slate-400">
            End your current session on this device.
          </div>
        </button>
      </section>
    </div>
  )
}