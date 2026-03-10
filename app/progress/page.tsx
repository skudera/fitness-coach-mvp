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

function getYAxisDomain(values: Array<number | null | undefined>, paddingPercent = 0.02) {
  const clean = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))

  if (!clean.length) return [0, 100]

  const min = Math.min(...clean)
  const max = Math.max(...clean)

  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * paddingPercent)
    return [Math.floor(min - pad), Math.ceil(max + pad)]
  }

  const range = max - min
  const pad = range * paddingPercent

  return [Number((min - pad).toFixed(2)), Number((max + pad).toFixed(2))]
}

function MetricTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean
  payload?: Array<{ value?: number | null }>
  label?: string
  suffix: string
}) {
  if (!active || !payload || !payload.length) return null

  const value = payload[0]?.value

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-lg">
      <div className="font-semibold">{label}</div>
      <div className="mt-1 text-slate-300">
        {value != null ? `${value}${suffix}` : '—'}
      </div>
    </div>
  )
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
    return reversed.find((row) => row.waist != null) ?? null
  }, [metrics])

  const chartData = useMemo(() => {
    return metrics.map((row) => ({
      date: row.date,
      weight: row.weight ?? null,
      bodyFat: row.body_fat ?? null,
      water: row.water_percent ?? null,
      waist: row.waist ?? null,
    }))
  }, [metrics])

  const weightDomain = useMemo(
    () => getYAxisDomain(chartData.map((row) => row.weight), 0.08),
    [chartData]
  )

  const bodyFatDomain = useMemo(
    () => getYAxisDomain(chartData.map((row) => row.bodyFat), 0.1),
    [chartData]
  )

  const waterDomain = useMemo(
    () => getYAxisDomain(chartData.map((row) => row.water), 0.05),
    [chartData]
  )

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
        <div className="h-64 min-h-[16rem] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                domain={weightDomain}
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(v) => String(Math.round(Number(v)))}
                tickCount={6}
              />
              <Tooltip content={<MetricTooltip suffix=" lb" />} />
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
        <div className="h-64 min-h-[16rem] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                domain={bodyFatDomain}
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(v) => Number(v).toFixed(1)}
                tickCount={6}
              />
              <Tooltip content={<MetricTooltip suffix="%" />} />
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
        <div className="h-64 min-h-[16rem] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                domain={waterDomain}
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(v) => Number(v).toFixed(1)}
                tickCount={6}
              />
              <Tooltip content={<MetricTooltip suffix="%" />} />
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

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="label">Waist</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {formatValue(latestWithMeasurements?.waist, '"')}
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