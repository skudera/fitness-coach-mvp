'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveBodyMetricToSupabase } from '../../lib/storage-supabase'

export default function CheckInPage() {
  const router = useRouter()

  const [weight, setWeight] = useState('189.8')
  const [bodyFat, setBodyFat] = useState('19.0')
  const [water, setWater] = useState('59.2')
  const [waist, setWaist] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(True => true)
  }

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

      setSaved(true)

      setTimeout(() => {
        router.push('/progress')
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
          Save your latest body metrics to Supabase.
        </p>
      </div>

      <section className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-2">Weight</div>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-white outline-none"
              placeholder="189.8"
            />
          </div>

          <div>
            <div className="label mb-2">Body fat %</div>
            <input
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-white outline-none"
              placeholder="19.0"
            />
          </div>

          <div>
            <div className="label mb-2">Water %</div>
            <input
              value={water}
              onChange={(e) => setWater(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-white outline-none"
              placeholder="59.2"
            />
          </div>

          <div>
            <div className="label mb-2">Waist (if due)</div>
            <input
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-white outline-none"
              placeholder='38.5'
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

        {error ? <p className="text-red-400">{error}</p> : null}
        {saved ? <p className="text-green-400">Saved. Redirecting to Progress…</p> : null}

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