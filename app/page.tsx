'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { MetricCard } from '@/components/MetricCard'
import { loadBodyMetricsHistoryFromSupabase } from '@/lib/storage-supabase'

type BodyMetricRow = {
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
}

export default function HomePage() {
  const [metrics, setMetrics] = useState<BodyMetricRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const rows = await loadBodyMetricsHistoryFromSupabase()
        setMetrics(Array.isArray(rows) ? rows : [])
      } catch (error) {
        console.error('Home metrics load error', error)
        setMetrics([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const latestMetric = useMemo(() => {
    return metrics.length ? metrics[metrics.length - 1] : null
  }, [metrics])

  const latestWaist = useMemo(() => {
    const reversed = [...metrics].reverse()
    const row = reversed.find((m) => m.waist != null)
    return row?.waist ?? null
  }, [metrics])

  return (
    <div className="space-y-6 pb-6">

      {/* HEADER */}

      <div>
        <div className="label">Home</div>

        <h1 className="text-[2.15rem] font-semibold leading-tight tracking-tight text-white">
          Good morning, Jonathan
        </h1>

        <p className="mt-2 text-[1rem] text-slate-300">
          Today's plan is already adjusted. No decisions needed.
        </p>
      </div>

      {/* BODY METRICS */}

      <section className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Weight"
          value={
            loading
              ? '...'
              : latestMetric?.weight != null
              ? `${latestMetric.weight} lb`
              : '—'
          }
        />

        <MetricCard
          label="Body Fat"
          value={
            loading
              ? '...'
              : latestMetric?.body_fat != null
              ? `${latestMetric.body_fat}%`
              : '—'
          }
        />

        <MetricCard
          label="Waist"
          value={
            loading
              ? '...'
              : latestWaist != null
              ? `${latestWaist}"`
              : '—'
          }
        />
      </section>

      {/* DASHBOARD CARDS */}

      <section className="grid grid-cols-2 gap-4">

        <div className="card">
          <div className="label">Weekly mode</div>
          <div className="mt-3 text-[1.7rem] font-semibold text-white">
            recomp steady
          </div>
        </div>

        <div className="card">
          <div className="label">Basketball Thursday</div>
          <div className="mt-3 text-[1.7rem] font-semibold text-white">
            Not planned
          </div>
        </div>

        <div className="card">
          <div className="label">Latest weight</div>

          <div className="mt-3 text-[1.7rem] font-semibold text-white">
            {loading
              ? '...'
              : latestMetric?.weight != null
              ? `${latestMetric.weight} lbs`
              : '—'}
          </div>

          <div className="mt-3 text-[0.9rem] text-slate-400">
            {loading ? 'Loading…' : latestMetric?.date ?? 'No date'}
          </div>
        </div>

        <div className="card">
          <div className="label">Body fat</div>

          <div className="mt-3 text-[1.7rem] font-semibold text-white">
            {loading
              ? '...'
              : latestMetric?.body_fat != null
              ? `${latestMetric.body_fat}%`
              : '—'}
          </div>

          <div className="mt-3 text-[0.9rem] text-slate-400">
            Latest loaded checkpoint
          </div>
        </div>

        <div className="card">
          <div className="label">Today</div>

          <div className="mt-3 text-[1.7rem] font-semibold leading-tight text-white">
            Chest / Shoulders / Cardio
          </div>

          <div className="mt-4 text-[1rem] text-slate-300">
            74 min planned
          </div>
        </div>

        <div className="card">
          <div className="label">Last workout</div>

          <div className="mt-3 text-[1.7rem] font-semibold text-white">
            1 min
          </div>

          <div className="mt-4 text-[1rem] text-slate-300">
            Actual duration
          </div>
        </div>

      </section>

      {/* COACH NOTE */}

      <section className="card space-y-4">

        <div className="label">Coach note</div>

        <p className="text-[1rem] leading-8 text-slate-100">
          Strength is improving and weight is trending down. Keep cardio steady this week.
        </p>

        <div className="label pt-2">This week's adjustments</div>

        <ul className="space-y-3 pl-6 text-[0.95rem] leading-7 text-slate-200">
          <li className="list-disc">
            Increase lateral raise weight from 20 to 25 lbs.
          </li>

          <li className="list-disc">
            Thursday cardio restored because basketball is not planned.
          </li>

          <li className="list-disc">
            Friday sauna changed to optional only after all planned work is finished.
          </li>
        </ul>

      </section>

      {/* ACTION BUTTONS */}

      <section className="grid grid-cols-2 gap-4">

        <Link
          href="/checkin"
          className="block w-full rounded-[1.75rem] bg-white px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          Monday Check-In
        </Link>

        <Link
          href="/workout"
          className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
        >
          Start Workout
        </Link>

      </section>

    </div>
  )
}