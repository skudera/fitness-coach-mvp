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

function formatWeekLabel(date: string) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

type ProgressChartSectionProps = {
  title: string
  data: Array<{
    date: string
    weight: number | null
    bodyFat: number | null
    water: number | null
    waist: number | null
  }>
  dataKey: 'weight' | 'bodyFat' | 'water'
  stroke: string
  suffix: string
  yDomain: [number, number]
  yTicks: number[]
  yTickFormatter: (value: number) => string
}

function ProgressChartSection({
  title,
  data,
  dataKey,
  stroke,
  suffix,
  yDomain,
  yTicks,
  yTickFormatter,
}: ProgressChartSectionProps) {
  return (
    <section className="card space-y-4">
      <div className="label">{title}</div>
      <div className="w-full min-w-0 overflow-hidden rounded-xl">
        <ResponsiveContainer width="100%" height={256}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={formatWeekLabel}
            />
            <YAxis
              domain={yDomain}
              ticks={yTicks}
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(v) => yTickFormatter(Number(v))}
              width={40}
            />
            <Tooltip
              content={<MetricTooltip suffix={suffix} />}
              labelFormatter={(label) => formatWeekLabel(String(label))}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={stroke}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
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

  const historyRows = useMemo(() => {
    return [...metrics].reverse()
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

      <ProgressChartSection
        title="Weight trend"
        data={chartData}
        dataKey="weight"
        stroke="#22c55e"
        suffix=" lb"
        yDomain={[170, 200]}
        yTicks={[170, 175, 180, 185, 190, 195, 200]}
        yTickFormatter={(value) => String(Math.round(value))}
      />

      <ProgressChartSection
        title="Body fat trend"
        data={chartData}
        dataKey="bodyFat"
        stroke="#38bdf8"
        suffix="%"
        yDomain={[14, 21]}
        yTicks={[14, 15, 16, 17, 18, 19, 20, 21]}
        yTickFormatter={(value) => String(value)}
      />

      <ProgressChartSection
        title="Water trend"
        data={chartData}
        dataKey="water"
        stroke="#a78bfa"
        suffix="%"
        yDomain={[58, 63]}
        yTicks={[58, 58.5, 59, 59.5, 60, 60.5, 61, 61.5, 62, 62.5, 63]}
        yTickFormatter={(value) => value.toFixed(1)}
      />

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
        ) : historyRows.length ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/70">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">Week</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">Weight</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">Body Fat</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">Water</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">Waist</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row, index) => (
                  <tr
                    key={`${row.date}-${row.id ?? index}`}
                    className="border-t border-slate-700 bg-slate-900/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatWeekLabel(row.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatValue(row.weight, ' lb')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatValue(row.body_fat, '%')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatValue(row.water_percent, '%')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatValue(row.waist, '"')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-300">No history found.</p>
        )}
      </section>
    </div>
  )
}