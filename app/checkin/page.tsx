'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getLocalDateString,
  getWeekStartDate,
  getWeeklySettings,
  loadBodyMetricsHistoryFromSupabase,
  loadTodayCheckInFromSupabase,
  saveBodyMetricToSupabase,
  saveWeeklyBasketball,
  type BodyMetricRow,
} from '@/lib/storage-supabase'

export default function CheckInPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alreadyCheckedInToday, setAlreadyCheckedInToday] = useState(false)

  const [history, setHistory] = useState<BodyMetricRow[]>([])
  const [basketballStatus, setBasketballStatus] = useState('unsure')

  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [waterPercent, setWaterPercent] = useState('')
  const [waist, setWaist] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const weekStart = getWeekStartDate()
        const [metricHistory, todayRow, weekly] = await Promise.all([
          loadBodyMetricsHistoryFromSupabase(),
          loadTodayCheckInFromSupabase(),
          getWeeklySettings(weekStart),
        ])

        setHistory(metricHistory ?? [])
        setAlreadyCheckedInToday(Boolean(todayRow))
        setBasketballStatus(weekly?.basketball_status ?? 'unsure')
      } catch (error) {
        console.error('Check-in load error', error)
        setHistory([])
        setAlreadyCheckedInToday(false)
        setBasketballStatus('unsure')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const lastCheckIn = useMemo(() => {
    if (!history.length) return null
    return history[history.length - 1] ?? null
  }, [history])

  async function handleSave() {
    try {
      setSaving(true)

      const date = getLocalDateString()

      await saveBodyMetricToSupabase({
        date,
        weight: weight.trim() ? Number(weight) : null,
        body_fat: bodyFat.trim() ? Number(bodyFat) : null,
        water_percent: waterPercent.trim() ? Number(waterPercent) : null,
        waist: waist.trim() ? Number(waist) : null,
        notes: notes.trim() || null,
      })

      await saveWeeklyBasketball(getWeekStartDate(), basketballStatus)
      router.push('/')
    } catch (error) {
      console.error('Check-in save error', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Monday Check-In</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Update this week’s plan
        </h1>
        <p className="mt-2 text-slate-300">
          Save your latest body metrics and weekly basketball plan.
        </p>
      </div>

      {lastCheckIn ? (
        <section className="card space-y-4">
          <div className="label">Last Check-In Reference</div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">Weight</div>
              <div className="mt-2 text-white">
                {lastCheckIn.weight != null ? `${lastCheckIn.weight}` : '—'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">Body Fat %</div>
              <div className="mt-2 text-white">
                {lastCheckIn.body_fat != null ? `${lastCheckIn.body_fat}` : '—'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">Water %</div>
              <div className="mt-2 text-white">
                {lastCheckIn.water_percent != null ? `${lastCheckIn.water_percent}` : '—'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="label">Waist</div>
              <div className="mt-2 text-white">
                {lastCheckIn.waist != null ? `${lastCheckIn.waist}` : '—'}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-2">Weight</div>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              placeholder="Enter current weight"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-4 text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div>
            <div className="label mb-2">Body Fat %</div>
            <input
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              inputMode="decimal"
              placeholder="Enter current body fat"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-4 text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div>
            <div className="label mb-2">Water %</div>
            <input
              value={waterPercent}
              onChange={(e) => setWaterPercent(e.target.value)}
              inputMode="decimal"
              placeholder="Enter current water %"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-4 text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div>
            <div className="label mb-2">Waist (if due)</div>
            <input
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              inputMode="decimal"
              placeholder="Enter waist measurement"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-4 text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div>
          <div className="label mb-2">Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Optional notes"
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-4 text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-3">
          <div className="label">Basketball This Week</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Yes', value: 'yes' },
              { label: 'No', value: 'no' },
              { label: 'Unsure', value: 'unsure' },
            ].map((option) => {
              const active = basketballStatus === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBasketballStatus(option.value)}
                  className={`rounded-2xl px-4 py-4 text-center text-base font-semibold transition ${
                    active
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <p className="text-sm text-slate-400">
            You can update this later in the week if your plans change.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full rounded-[1.75rem] bg-blue-600 px-5 py-5 text-center text-[1rem] font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {saving
            ? 'Saving...'
            : alreadyCheckedInToday
            ? 'Save updated check-in'
            : 'Save check-in'}
        </button>
      </section>
    </div>
  )
}