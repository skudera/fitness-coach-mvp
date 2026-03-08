'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { loadBodyMetricsHistoryFromSupabase, type BodyMetricRow } from '../../lib/storage-supabase'

function formatValue(value?: number | null, suffix = '') {
  if (value == null) return '—'
  return `${value}${suffix}`
}

export default function ProgressPage() {
  const [metrics, setMetrics] = useState<BodyMetricRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const rows = await loadBodyMetricsHistoryFromSupabase()
        setMetrics(Array.isArray(rows) ? rows : [])
      } catch (error) {
        console.error('Progress load error', error)
        setMetrics([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const latest = useMemo(() => {
    return metrics.length ? metrics[metrics.length - 1] : null
  }, [metrics])

  const latestWithMeasurements = useMemo(() => {
    const reversed = [...metrics].reverse()
    return (
      reversed.find(
        (row) =>
          row.waist != null ||
          row.chest != null ||
          row.thigh != null ||
          row.bicep != null
      ) ?? null
    )
  }, [metrics])

  const chartData = useMemo(() => {
    return metrics.map((row) => ({
      date: row.date,
      weight: row.weight ?? null,
      bodyFat: row.body_fat ?? null,
      water: row.water_percent ?? null,
      waist: row.waist ?? null,
      chest: row.chest ?? null,
      thigh: row.thigh ?? null,
      bicep: row.bicep ?? null,
    }))
  }, [metrics])

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">Progress</div>
        <h1 className="text-2xl font-semibold tracking-tight">Body metrics history</h1>
      </div>

      <section className="card space-y-4">
        <div className="label">Latest checkpoint</div>

        {loading ? (
          <p className="text-slate-300">Loading progress…</p>
        ) : latest ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
                <div className="label">Weight</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {formatValue(latest.weight, ' lb')}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
                <div className="label">Body fat</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {formatValue(latest.body_fat, '%')}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
                <div className="label">Water</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {formatValue(latest.water_percent, '%')}
                </div>
              </div>
            </div>

            <p className="text-base text-slate-300">
              {latest.date} {latest.notes ? `• ${latest.notes}` : ''}
            </p>
          </>
        ) : (
          <p className="text-slate-300">No progress data found.</p>
        )}
      </section>

      <section className="card space-y-4">
        <div className="label">Weight trend</div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">Body fat trend</div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="bodyFat"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">Water trend</div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="water"
                stroke="#a78bfa"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">Measurements</div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Waist</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {formatValue(latestWithMeasurements?.waist, '"')}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Chest</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {formatValue(latestWithMeasurements?.chest, '"')}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Thigh</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {formatValue(latestWithMeasurements?.thigh, '"')}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Bicep</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {formatValue(latestWithMeasurements?.bicep, '"')}
            </div>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="label">History</div>

        {loading ? (
          <p className="text-slate-300">Loading history…</p>
        ) : metrics.length ? (
          <div className="space-y-3">
            {[...metrics].reverse().map((row) => (
              <div
                key={`${row.date}-${row.id ?? ''}`}
                className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
              >
                <div className="text-base font-semibold text-white">{row.date}</div>
                <div className="mt-1 text-sm text-slate-300">
                  Weight {formatValue(row.weight, ' lb')} • Body Fat {formatValue(row.body_fat, '%')} • Water {formatValue(row.water_percent, '%')}
                </div>
                {row.notes ? (
                  <div className="mt-2 text-sm text-slate-400">{row.notes}</div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-300">No history found.</p>
        )}
      </section>
    </div>
  )
}