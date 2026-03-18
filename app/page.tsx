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
  getWeeklySettings,
  getWeekStartDate,
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

type CoachContent = {
  title: string
  body: string
  bullets?: string[]
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
      return { label: 'Sunday', focus: 'Recovery / Mobility', duration: '20–30 min optional' }
    case 1:
      return { label: 'Monday', focus: 'Chest / Shoulders / Cardio', duration: '74 min planned' }
    case 2:
      return { label: 'Tuesday', focus: 'Back / Core / Cardio', duration: '72 min planned' }
    case 3:
      return { label: 'Wednesday', focus: 'Legs / Core / Cardio', duration: '75 min planned' }
    case 4:
      return { label: 'Thursday', focus: 'Upper Mixed / Basketball', duration: 'Flexible day' }
    case 5:
      return { label: 'Friday', focus: 'Lower / Recovery Conditioning', duration: '70 min planned' }
    case 6:
      return { label: 'Saturday', focus: 'Optional Recovery / Mobility', duration: 'Optional' }
    default:
      return { label: 'Today', focus: 'Workout', duration: 'Planned' }
  }
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getCurrentWeekdays() {
  const today = new Date()
  const currentDay = today.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const labels = ['M', 'T', 'W', 'T', 'F']

  return labels.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      label,
      date: getLocalDateString(date),
    }
  })
}

function getWorkoutStreak(sessionDates: string[]) {
  if (!sessionDates.length) return 0

  const uniqueSorted = [...new Set(sessionDates)]
    .map((date) => parseLocalDate(date))
    .sort((a, b) => b.getTime() - a.getTime())

  let streak = 1

  for (let i = 1; i < uniqueSorted.length; i += 1) {
    const prev = uniqueSorted[i - 1]
    const curr = uniqueSorted[i]
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000)

    if (diffDays === 1 || (prev.getDay() === 1 && curr.getDay() === 5 && diffDays === 3)) {
      streak += 1
    } else {
      break
    }
  }

  return streak
}

function buildCoachContent(params: {
  latestMetric: BodyMetricRow | null
  oldestMetric: BodyMetricRow | null
  todayCompletedSession: CompletedSessionRow | null
  todayCheckIn: BodyMetricRow | null
  lastMeaningfulWorkout: CompletedSessionRow | null
  streakCount: number
  basketballStatus: string
  todayPlan: { label: string; focus: string; duration: string }
  loading: boolean
}): CoachContent {
  const {
    latestMetric,
    oldestMetric,
    todayCompletedSession,
    todayCheckIn,
    lastMeaningfulWorkout,
    streakCount,
    basketballStatus,
    todayPlan,
    loading,
  } = params

  const isMonday = new Date().getDay() === 1
  const isThursday = new Date().getDay() === 4
  const nextWorkoutLabel = getTomorrowWorkoutLabel()

  if (loading) {
    return {
      title: 'Coach',
      body: 'Loading coaching guidance…',
    }
  }

  const weightDelta =
    latestMetric?.weight != null && oldestMetric?.weight != null
      ? Number((latestMetric.weight - oldestMetric.weight).toFixed(1))
      : null

  const bodyFatDelta =
    latestMetric?.body_fat != null && oldestMetric?.body_fat != null
      ? Number((latestMetric.body_fat - oldestMetric.body_fat).toFixed(1))
      : null

  if (todayCompletedSession) {
    return {
      title: 'Coach',
      body: `Today’s workout is already complete. Nice job protecting the routine and keeping momentum moving.`,
      bullets: [
        'Hydrate well and keep the rest of the day simple.',
        'Review the workout if you want to double-check sets, reps, and notes.',
        `Next up: ${nextWorkoutLabel}.`,
      ],
    }
  }

  if (isMonday && !todayCheckIn) {
    return {
      title: 'Coach',
      body: `Before you start chasing the week, lock in your Monday check-in. A quick body-metrics update keeps your progress honest and easier to interpret.`,
      bullets: [
        'Complete the Monday check-in near the top of the dashboard.',
        `Then start ${todayPlan.focus}.`,
        'Keep the workout simple—good logging beats overthinking.',
      ],
    }
  }

  if (isThursday && basketballStatus === 'yes') {
    return {
      title: 'Coach',
      body: `Basketball is marked in play for Thursday, so today should stay focused on the plan without adding unnecessary extra fatigue.`,
      bullets: [
        'Finish the planned work first.',
        'Do not chase extra volume just because you feel good.',
        'Save your legs and joints for basketball if that is still on tonight.',
      ],
    }
  }

  if (weightDelta != null && weightDelta < 0 && streakCount >= 2) {
    return {
      title: 'Coach',
      body: `Weight is down ${Math.abs(weightDelta)} lbs from your earliest logged checkpoint, and your current streak is ${streakCount}. That’s meaningful momentum.`,
      bullets: [
        `Today’s focus: ${todayPlan.focus}.`,
        `Planned duration: ${todayPlan.duration}.`,
        'Keep logging cleanly and let consistency keep doing the work.',
      ],
    }
  }

  if (bodyFatDelta != null && bodyFatDelta < 0) {
    return {
      title: 'Coach',
      body: `Body fat is down ${Math.abs(bodyFatDelta)}% from your baseline. Stay steady and let consistency keep doing the work.`,
      bullets: [
        `Today’s focus: ${todayPlan.focus}.`,
        'Do not overcomplicate the session.',
        'Complete the plan before worrying about extras.',
      ],
    }
  }

  if (streakCount >= 3) {
    return {
      title: 'Coach',
      body: `You’re on a ${streakCount}-workout streak. Today is less about hype and more about protecting the streak with another solid, clean session.`,
      bullets: [
        `Today’s focus: ${todayPlan.focus}.`,
        'Accurate set logging matters more than forcing progression.',
        'Complete the planned workout before worrying about anything extra.',
      ],
    }
  }

  if (lastMeaningfulWorkout) {
    return {
      title: 'Coach',
      body: `The priority today is straightforward: get back in, complete the planned session, and keep the routine moving.`,
      bullets: [
        `Planned session: ${todayPlan.focus}.`,
        `Expected duration: ${todayPlan.duration}.`,
        'Use the Start Workout button near the top and keep the flow simple.',
      ],
    }
  }

  return {
    title: 'Coach',
    body: `You’ve got the structure in place. Start stacking workouts and the progress data will begin to tell the story.`,
    bullets: [
      `Today’s focus: ${todayPlan.focus}.`,
      'Focus on completion, not perfection.',
      'Once a few workouts are logged, the coaching gets more useful.',
    ],
  }
}

export default function HomePage() {
  const [metrics, setMetrics] = useState<BodyMetricRow[]>([])
  const [todayCheckIn, setTodayCheckIn] = useState<BodyMetricRow | null>(null)
  const [sessions, setSessions] = useState<CompletedSessionRow[]>([])
  const [basketballStatus, setBasketballStatus] = useState('unsure')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const weekStart = getWeekStartDate()

        const [metricRows, sessionRows, todayRow, weekly] = await Promise.all([
          loadBodyMetricsHistoryFromSupabase(),
          loadCompletedSessionsFromSupabase(),
          loadTodayCheckInFromSupabase(),
          getWeeklySettings(weekStart),
        ])

        setMetrics(Array.isArray(metricRows) ? metricRows : [])
        setSessions(Array.isArray(sessionRows) ? sessionRows : [])
        setTodayCheckIn(todayRow ?? null)
        setBasketballStatus(weekly?.basketball_status ?? 'unsure')
      } catch (error) {
        console.error('Home load error', error)
        setMetrics([])
        setSessions([])
        setTodayCheckIn(null)
        setBasketballStatus('unsure')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const latestMetric = useMemo(() => (metrics.length ? metrics[metrics.length - 1] : null), [metrics])
  const oldestMetric = useMemo(() => (metrics.length ? metrics[0] : null), [metrics])

  const latestWaist = useMemo(() => {
    const reversed = [...metrics].reverse()
    const row = reversed.find((m) => m.waist != null)
    return row?.waist ?? null
  }, [metrics])

  const greeting = getGreeting()
  const todayPlan = getTodayPlan()
  const todayDate = getLocalDateString()

  const meaningfulSessions = useMemo(
    () => sessions.filter((session) => (session.duration_minutes ?? 0) >= 5),
    [sessions]
  )

  const meaningfulSessionDates = useMemo(
    () => meaningfulSessions.map((session) => session.date),
    [meaningfulSessions]
  )

  const todayCompletedSession = useMemo(
    () => meaningfulSessions.find((session) => session.date === todayDate) ?? null,
    [meaningfulSessions, todayDate]
  )

  const lastMeaningfulWorkout = useMemo(
    () => meaningfulSessions[0] ?? null,
    [meaningfulSessions]
  )

  const nextWorkoutLabel = getTomorrowWorkoutLabel()

  const weekProgress = useMemo(() => {
    const weekdays = getCurrentWeekdays()
    const completedSet = new Set(meaningfulSessionDates)

    return weekdays.map((day) => ({
      ...day,
      completed: completedSet.has(day.date),
    }))
  }, [meaningfulSessionDates])

  const perfectWeek = useMemo(() => {
    return weekProgress.every((day) => day.completed)
  }, [weekProgress])

  const streakCount = useMemo(() => getWorkoutStreak(meaningfulSessionDates), [meaningfulSessionDates])

  const coach = useMemo(
    () =>
      buildCoachContent({
        latestMetric,
        oldestMetric,
        todayCompletedSession,
        todayCheckIn,
        lastMeaningfulWorkout,
        streakCount,
        basketballStatus,
        todayPlan,
        loading,
      }),
    [
      latestMetric,
      oldestMetric,
      todayCompletedSession,
      todayCheckIn,
      lastMeaningfulWorkout,
      streakCount,
      basketballStatus,
      todayPlan,
      loading,
    ]
  )

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

      <section className="card space-y-4">
        <div className="label">Momentum</div>

        <div>
          <div className="label">Week Progress</div>
          <div className="mt-3 flex items-center justify-between gap-2">
            {weekProgress.map((day, index) => (
              <div key={`${day.date}-${index}`} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                    day.completed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {day.completed ? '✓' : day.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <div className="label">Streak</div>
          <div className="mt-2 text-[1.3rem] font-semibold text-white">
            {loading ? '...' : `${streakCount} workout${streakCount === 1 ? '' : 's'} in a row`}
          </div>

          {perfectWeek && !loading ? (
            <div className="mt-3 text-[1rem] font-semibold text-emerald-400">
              Perfect week: 5 for 5 🔥
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Link
          href="/checkin"
          className={`block w-full rounded-[1.75rem] px-5 py-5 text-center text-[1rem] font-semibold transition ${
            todayCheckIn ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-white text-slate-900 hover:bg-slate-100'
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

      <section className="card">
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
            <div className="mt-3 text-[1.6rem] font-semibold leading-tight text-white">
              {todayPlan.label}: {todayPlan.focus}
            </div>
            <div className="mt-4 text-[1rem] text-slate-300">
              {todayPlan.duration}
            </div>
          </>
        )}
      </section>

      <section className="card space-y-4">
        <div className="label">{coach.title}</div>
        <p className="text-[1rem] leading-8 text-slate-100">{coach.body}</p>

        {coach.bullets?.length ? (
          <>
            <div className="label pt-2">Focus today</div>
            <ul className="space-y-3 pl-6 text-[0.95rem] leading-7 text-slate-200">
              {coach.bullets.map((bullet, index) => (
                <li key={`${bullet}-${index}`} className="list-disc">
                  {bullet}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Weight"
          value={loading ? '...' : latestMetric?.weight != null ? `${latestMetric.weight} lb` : '—'}
        />
        <MetricCard
          label="Body Fat"
          value={loading ? '...' : latestMetric?.body_fat != null ? `${latestMetric.body_fat}%` : '—'}
        />
        <MetricCard
          label="Waist"
          value={loading ? '...' : latestWaist != null ? `${latestWaist}"` : '—'}
        />
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="label">Weekly mode</div>
          <div className="mt-3 text-[1.2rem] font-semibold text-white">recomp steady</div>
        </div>

        <div className="card">
          <div className="label">Thursday basketball</div>
          <div className="mt-3 text-[1.2rem] font-semibold capitalize text-white">
            {basketballStatus}
          </div>
        </div>

        <div className="card">
          <div className="label">Last workout</div>
          <div className="mt-3 text-[1.2rem] font-semibold text-white">
            {loading
              ? '...'
              : lastMeaningfulWorkout?.duration_minutes != null
                ? `${lastMeaningfulWorkout.duration_minutes} min`
                : 'No workout yet'}
          </div>
          <div className="mt-3 text-[0.9rem] text-slate-400">
            {loading ? 'Loading…' : lastMeaningfulWorkout?.date ?? 'No completed session'}
          </div>
        </div>
      </section>
    </div>
  )
}