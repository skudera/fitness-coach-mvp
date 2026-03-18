'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveBodyMetricToSupabase,
  saveWeeklyBasketball,
  getWeekStartDate,
  getWeeklySettings,
  loadBodyMetricsHistoryFromSupabase,
} from '@/lib/storage-supabase'

export default function CheckInPage() {
  const router = useRouter()

  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [water, setWater] = useState('')
  const [waist, setWaist] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [basketball, setBasketball] = useState('unsure')
  const [loadingWeekly, setLoadingWeekly] = useState(true)
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [history, weekly] = await Promise.all([
          loadBodyMetricsHistoryFromSupabase(),
          getWeeklySettings(getWeekStartDate()),
        ])

        const latest = [...history]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .find((row) => row.weight != null || row.body_fat != null || row.water_percent != null || row.waist != null)

        if (latest) {
          setWeight(latest.weight != null ? String(latest.weight) : '')
          setBodyFat(latest.body_fat != null ? String(latest.body_fat) : '')
          setWater(latest.water_percent != null ? String(latest.water_percent) : '')
          setWaist(latest.waist != null ? String(latest.waist) : '')
        }

        if (weekly?.basketball_status) {
          setBasketball(weekly.basketball_status)
        }
      } catch (err) {
        console.error('Could not load check-in defaults', err)
      } finally {
        setLoadingMetrics(false)
        setLoadingWeekly(false)
      }
    }

    loadInitialData()
  }, [])

  async function onSave() {
    try {
      setSaving(true)
      setError('')
      setSaved(false)

      const today = new Date().toISOString().slice(0, 10)

      await saveBodyMetricToSupabase({
        date: today,
        weight: weight ? Number(weight) : null,
        body_fat: bodyFat ? Number(bodyFat) : null,
        water_percent: water ? Number(water) : null,
        waist: waist ? Number(waist) : null,
        notes: notes || null,
      })

      const weekStart = getWeekStartDate()
      await saveWeeklyBasketball(weekStart, basketball)

      setSaved(true)

      setTimeout(() => {
        router.push('/')
      }, 700)
    } catch (err) {
      console.error(err)
      setError('Could not save check-in. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Monday check-in</div>
        <h1 className="text-2xl font-semibold tracking-tight">Update this week’s plan</h1>
        <p className="mt-2 text-slate-300">
          Save your latest body metrics and weekly basketball plan.
        </p>
      </div>

      <section className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {loadingMetrics ? (
            <p className="col-span-2 text-sm text-slate-400">Loading your latest check-in values…</p>
          ) : null}
          <div>
            <div className="label mb-2">Weight</div>
            <input
              value={weight}
              inputMode="decimal"
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-white outline-none"
              type="number"
              step="0.1"
              placeholder="189.8"
            />
          </div>

          <div>
            <div className="label mb-2">Body fat %</div>
            <input
              value={bodyFat}
              inputMode="decimal"
              onChange={(e) => setBodyFat(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-white outline-none"
              type="number"
              step="0.1"
              placeholder="19.0"
            />
          </div>

          <div>
            <div className="label mb-2">Water %</div>
            <input
              value={water}
              inputMode="decimal"
              onChange={(e) => setWater(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-white outline-none"
              type="number"
              step="0.1"
              placeholder="59.2"
            />
          </div>

          <div>
            <div className="label mb-2">Waist (if due)</div>
            <input
              value={waist}
              inputMode="decimal"
              onChange={(e) => setWaist(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-white outline-none"
              type="number"
              step="0.1"
              placeholder="38.5"
            />
          </div>
        </div>

        <div>
          <div className="label mb-2">Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[110px] w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-white outline-none"
            placeholder="Optional notes"
          />
        </div>

        <div>
          <div className="label mb-2">Basketball This Week</div>

          <div className="flex gap-3">
            {['yes', 'no', 'unsure'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setBasketball(option)}
                disabled={loadingWeekly}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  basketball === option
                    ? 'bg-emerald-500 text-slate-900'
                    : 'bg-slate-800 text-slate-200'
                } ${loadingWeekly ? 'opacity-60' : ''}`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>

          <p className="mt-2 text-sm text-slate-400">
            You can update this later in the week if your plans change.
          </p>
        </div>

        {error ? <p className="text-red-400">{error}</p> : null}
        {saved ? <p className="text-green-400">Saved. Redirecting home…</p> : null}

        <button
          onClick={onSave}
          disabled={saving}
          className="block w-full rounded-2xl bg-blue-600 px-5 py-4 text-center text-xl font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save check-in'}
        </button>
      </section>
    </div>
  )
}