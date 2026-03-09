'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { MetricCard } from '@/components/MetricCard'
import {
  loadBodyMetricsHistoryFromSupabase,
  loadCompletedSessionsFromSupabase,
  loadTodayCheckInFromSupabase,
  getLocalDateString,
  getTomorrowWorkoutLabel,
  type CompletedSessionRow,
} from '@/lib/storage-supabase'

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

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getTodayPlan() {
  const day = new Date().getDay()

  switch (day) {
    case 0:
      return {
        label: 'Sunday',
        focus: 'Recovery / Mobility',
        duration: '20–30 min optional',
      }
    case 1:
      return {
        label: 'Monday',
        focus: 'Chest / Shoulders / Cardio',
        duration: '74 min planned',
      }
    case 2:
      return {
        label: 'Tuesday',
        focus: 'Back / Core / Cardio',
        duration: '72 min planned',
      }
    case 3:
      return {
        label: 'Wednesday',
        focus: 'Legs / Core / Cardio',
        duration: '75 min planned',
      }
    case 4:
      return {
        label: 'Thursday',
        focus: 'Upper Mixed / Basketball',
        duration: 'Flexible day',
      }
    case 5:
      return {
        label: 'Friday',
        focus: 'Lower / Recovery Conditioning',
        duration: '70 min planned',
      }
    case 6:
      return {
        label: 'Saturday',
        focus: 'Optional Recovery / Mobility',
        duration: 'Optional',
      }
    default:
      return {
        label: 'Today',
        focus: 'Workout',
        duration: 'Planned',
      }
  }
}

export default function HomePage() {
  const [metrics, setMetrics] = useState<BodyMetricRow[]>([])
  const [todayCheckIn, setTodayCheckIn] = useState<BodyMetricRow | null>(null)
  const [sessions, setSessions] = useState<CompletedSessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [metricRows, sessionRows, todayRow] = await Promise.all([
          loadBodyMetricsHistoryFromSupabase(),
          loadCompletedSessionsFromSupabase(),
          loadTodayCheckInFromSupabase(),
        ])

        setMetrics(Array.isArray(metricRows) ? metricRows : [])
        setSessions(Array.isArray(sessionRows) ? sessionRows : [])
        setTodayCheckIn(todayRow ?? null)
      } catch (error) {
        console.error('Home load error', error)
        setMetrics([])
        setSessions([])
        setTodayCheckIn(null)
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

  const greeting = getGreeting()
  const todayPlan = getTodayPlan()
  const todayDate = getLocalDateString()

  const meaningfulSessions = useMemo(() => {
    return sessions.filter((session) => (session.duration_minutes ?? 0) >= 5)
  }, [sessions])

  const todayCompletedSession = useMemo(() => {
    return meaningfulSessions.find((session) => session.date === todayDate) ?? null
  }, [meaningfulSessions, todayDate])

  const lastMeaningfulWorkout = useMemo(() => {
    return meaningfulSessions[0] ?? null
  }, [meaningfulSessions])

  const nextWorkoutLabel = getTomorrowWorkoutLabel()

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Home</div>

        <h1 className="text-[2.15rem] font-semibold leading-tight tracking-tight text-white">
          {greeting}, Jonathan
        </h1>

        <p className="mt-2 text-[1rem] text-slate-300">
          Today&apos;s plan is already adjusted. No decisions needed.
        </p>
      </div>

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

          {todayCompletedSession ? (
            <>
              <div className="mt-3 text-[1.45rem] font-semibold leading-tight text-white">
                {todayPlan.label}: {todayPlan.focus}
              </div>

              <div className="mt-3 text-[1rem] font-semibold text-emerald-400">
                Completed ✅
              </div>

              <div className="mt-3 text-[0.95rem] text-slate-300">
                {todayCompletedSession.duration_minutes} min actual
              </div>

              <div className="mt-3 text-[0.9rem] text-slate-400">
                Next: {nextWorkoutLabel}
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 text-[1.7rem] font-semibold leading-tight text-white">
                {todayPlan.label}: {todayPlan.focus}
              </div>

              <div className="mt-4 text-[1rem] text-slate-300">
                {todayPlan.duration}
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="label">Last workout</div>

          <div className="mt-3 text-[1.7rem] font-semibold text-white">
            {loading
              ? '...'
              : lastMeaningfulWorkout?.duration_minutes != null
              ? `${lastMeaningfulWorkout.duration_minutes} min`
              : 'No workout yet'}
          </div>

          <div className="mt-4 text-[1rem] text-slate-300">
            {loading
              ? 'Loading…'
              : lastMeaningfulWorkout?.date ?? 'No completed session'}
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">Coach note</div>

        <p className="text-[1rem] leading-8 text-slate-100">
          Strength is improving and weight is trending down. Keep cardio steady this week.
        </p>

        <div className="label pt-2">This week&apos;s adjustments</div>

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

      <section className="grid grid-cols-2 gap-4">
        <Link
          href="/checkin"
          className={`block w-full rounded-[1.75rem] px-5 py-5 text-center text-[1rem] font-semibold transition ${
            todayCheckIn
              ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              : 'bg-white text-slate-900 hover:bg-slate-100'
          }`}
        >
          {todayCheckIn ? 'Check-In Complete ✅' : 'Monday Check-In'}
        </Link>

        <Link
          href="/workout"
          className="block w-full rounded-[1.75rem] bg-emerald-500 px-5 py-5 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
        >
          {todayCompletedSession ? 'Review Workout' : 'Start Workout'}
        </Link>
      </section>
    </div>
  )
}