'use client'

import { useEffect, useRef, useState } from 'react'
import {
  uploadInBodyImage,
  getInBodyImageSignedUrl,
  saveInBodyAssessment,
  loadInBodyAssessmentsFromSupabase,
  type InBodyRow,
} from '@/lib/storage-supabase'

type FormValues = {
  assessment_date: string
  weight: string
  smm: string
  body_fat_mass: string
  body_fat_percent: string
  bmi: string
  visceral_fat_level: string
  ecw_tbw: string
  bmr: string
  lean_right_arm: string
  lean_left_arm: string
  lean_trunk: string
  lean_right_leg: string
  lean_left_leg: string
  lean_right_arm_pct: string
  lean_left_arm_pct: string
  lean_trunk_pct: string
  lean_right_leg_pct: string
  lean_left_leg_pct: string
  fat_trunk: string
  notes: string
}

const emptyForm = (): FormValues => ({
  assessment_date: '',
  weight: '',
  smm: '',
  body_fat_mass: '',
  body_fat_percent: '',
  bmi: '',
  visceral_fat_level: '',
  ecw_tbw: '',
  bmr: '',
  lean_right_arm: '',
  lean_left_arm: '',
  lean_trunk: '',
  lean_right_leg: '',
  lean_left_leg: '',
  lean_right_arm_pct: '',
  lean_left_arm_pct: '',
  lean_trunk_pct: '',
  lean_right_leg_pct: '',
  lean_left_leg_pct: '',
  fat_trunk: '',
  notes: '',
})

function parsedToForm(parsed: Record<string, unknown>): FormValues {
  const s = (v: unknown) => (v != null ? String(v) : '')
  return {
    assessment_date: s(parsed.assessment_date),
    weight: s(parsed.weight),
    smm: s(parsed.smm),
    body_fat_mass: s(parsed.body_fat_mass),
    body_fat_percent: s(parsed.body_fat_percent),
    bmi: s(parsed.bmi),
    visceral_fat_level: s(parsed.visceral_fat_level),
    ecw_tbw: s(parsed.ecw_tbw),
    bmr: s(parsed.bmr),
    lean_right_arm: s(parsed.lean_right_arm),
    lean_left_arm: s(parsed.lean_left_arm),
    lean_trunk: s(parsed.lean_trunk),
    lean_right_leg: s(parsed.lean_right_leg),
    lean_left_leg: s(parsed.lean_left_leg),
    lean_right_arm_pct: s(parsed.lean_right_arm_pct),
    lean_left_arm_pct: s(parsed.lean_left_arm_pct),
    lean_trunk_pct: s(parsed.lean_trunk_pct),
    lean_right_leg_pct: s(parsed.lean_right_leg_pct),
    lean_left_leg_pct: s(parsed.lean_left_leg_pct),
    fat_trunk: s(parsed.fat_trunk),
    notes: '',
  }
}

function formToPayload(
  form: FormValues,
  imagePath: string | null
): Omit<InBodyRow, 'id' | 'user_id' | 'created_at'> {
  const n = (v: string) => (v.trim() !== '' ? Number(v) : null)
  return {
    assessment_date: form.assessment_date,
    weight: n(form.weight),
    smm: n(form.smm),
    body_fat_mass: n(form.body_fat_mass),
    body_fat_percent: n(form.body_fat_percent),
    bmi: n(form.bmi),
    visceral_fat_level: n(form.visceral_fat_level),
    ecw_tbw: n(form.ecw_tbw),
    bmr: n(form.bmr),
    lean_right_arm: n(form.lean_right_arm),
    lean_left_arm: n(form.lean_left_arm),
    lean_trunk: n(form.lean_trunk),
    lean_right_leg: n(form.lean_right_leg),
    lean_left_leg: n(form.lean_left_leg),
    lean_right_arm_pct: n(form.lean_right_arm_pct),
    lean_left_arm_pct: n(form.lean_left_arm_pct),
    lean_trunk_pct: n(form.lean_trunk_pct),
    lean_right_leg_pct: n(form.lean_right_leg_pct),
    lean_left_leg_pct: n(form.lean_left_leg_pct),
    fat_trunk: n(form.fat_trunk),
    image_path: imagePath,
    notes: form.notes.trim() || null,
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function VisceralBadge({ level }: { level: number | null | undefined }) {
  if (level == null) return <span className="text-slate-500">—</span>
  const color =
    level <= 9 ? 'text-emerald-400' : level <= 14 ? 'text-amber-400' : 'text-rose-400'
  return <span className={`font-semibold ${color}`}>{level}</span>
}

function LeanBalance({ label, right, left }: { label: string; right?: number | null; left?: number | null }) {
  if (right == null || left == null) return null
  const diff = Math.abs(right - left).toFixed(2)
  const balanced = Number(diff) <= 0.3
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={balanced ? 'text-slate-300' : 'text-amber-300'}>
        R {right.toFixed(2)} · L {left.toFixed(2)}
        {!balanced ? ` (Δ${diff})` : ''}
      </span>
    </div>
  )
}

function FieldRow({
  label,
  suffix,
  field,
  form,
  onChange,
  step = '0.1',
}: {
  label: string
  suffix: string
  field: keyof FormValues
  form: FormValues
  onChange: (field: keyof FormValues, value: string) => void
  step?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-36 shrink-0 text-sm text-slate-400">{label}</label>
      <div className="flex flex-1 items-center gap-1.5">
        <input
          type="number"
          step={step}
          value={form[field]}
          onChange={(e) => onChange(field, e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
          placeholder="—"
        />
        <span className="shrink-0 text-xs text-slate-500">{suffix}</span>
      </div>
    </div>
  )
}

export default function InBodyPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'idle' | 'parsing' | 'review' | 'saving'>('idle')
  const [form, setForm] = useState<FormValues>(emptyForm())
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [parseError, setParseError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [history, setHistory] = useState<InBodyRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)
  const [loadingImageId, setLoadingImageId] = useState<string | null>(null)

  useEffect(() => {
    loadInBodyAssessmentsFromSupabase()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [])

  function handleFieldChange(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setParseError('')
    setMode('parsing')

    try {
      const fd = new FormData()
      fd.append('image', file)

      const res = await fetch('/api/parse-inbody', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Parse failed')

      const parsed = await res.json()
      if (parsed.error) throw new Error(parsed.error)

      setForm(parsedToForm(parsed))
      setMode('review')
    } catch (err) {
      console.error(err)
      setParseError('Could not read the assessment. Check the image is clear and try again.')
      setMode('idle')
    }
  }

  async function handleSave() {
    if (!form.assessment_date) {
      setSaveError('Assessment date is required.')
      return
    }

    setSaveError('')
    setMode('saving')

    try {
      let imagePath: string | null = null
      if (imageFile) {
        imagePath = await uploadInBodyImage(imageFile)
      }

      await saveInBodyAssessment(formToPayload(form, imagePath))

      const refreshed = await loadInBodyAssessmentsFromSupabase()
      setHistory(refreshed)
      setForm(emptyForm())
      setImageFile(null)
      setImagePreview(null)
      setMode('idle')
    } catch (err) {
      console.error(err)
      setSaveError('Could not save assessment. Please try again.')
      setMode('review')
    }
  }

  async function handleViewImage(row: InBodyRow) {
    if (!row.image_path || !row.id) return
    setLoadingImageId(row.id)
    try {
      const url = await getInBodyImageSignedUrl(row.image_path)
      setViewingImageUrl(url)
    } catch {
      // ignore
    } finally {
      setLoadingImageId(null)
    }
  }

  const isSaving = mode === 'saving'

  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="label">InBody</div>
        <h1 className="text-2xl font-semibold tracking-tight">Body composition assessments</h1>
        <p className="mt-2 text-slate-300">
          Upload your InBody report — AI reads it, you review, then save.
        </p>
      </div>

      {/* View image modal */}
      {viewingImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewingImageUrl(null)}
        >
          <img
            src={viewingImageUrl}
            alt="InBody assessment"
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
        </div>
      ) : null}

      {/* Upload section */}
      {mode === 'idle' ? (
        <section className="card space-y-4">
          <div className="label">New Assessment</div>
          <p className="text-sm text-slate-400">
            Take a photo or screenshot of your InBody printout. AI will extract all values for you to review before saving.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="block w-full rounded-[1.5rem] bg-emerald-500 px-5 py-4 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400"
          >
            Upload Assessment
          </button>
          {parseError ? (
            <p className="text-sm text-rose-400">{parseError}</p>
          ) : null}
        </section>
      ) : null}

      {/* Parsing state */}
      {mode === 'parsing' ? (
        <section className="card space-y-4 text-center">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Uploading"
              className="mx-auto max-h-48 rounded-xl object-contain opacity-60"
            />
          ) : null}
          <div className="label">Reading assessment with AI…</div>
          <p className="text-sm text-slate-400">This takes a few seconds.</p>
          <div className="mx-auto h-1.5 w-32 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-full animate-pulse bg-emerald-500 rounded-full" />
          </div>
        </section>
      ) : null}

      {/* Review form */}
      {mode === 'review' || mode === 'saving' ? (
        <section className="card space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="label">Review Extracted Values</div>
            <button
              type="button"
              onClick={() => { setMode('idle'); setImageFile(null); setImagePreview(null) }}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>

          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Assessment"
              className="w-full rounded-xl object-contain max-h-48"
            />
          ) : null}

          <p className="text-xs text-slate-500">
            AI extracted these values. Edit anything before saving.
          </p>

          {/* Date */}
          <div className="flex items-center gap-3">
            <label className="w-36 shrink-0 text-sm text-slate-400">Assessment date</label>
            <input
              type="date"
              value={form.assessment_date}
              onChange={(e) => handleFieldChange('assessment_date', e.target.value)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
            />
          </div>

          {/* Core metrics */}
          <div className="space-y-2">
            <div className="label">Core Metrics</div>
            <FieldRow label="Weight" suffix="lb" field="weight" form={form} onChange={handleFieldChange} />
            <FieldRow label="Skeletal Muscle Mass" suffix="lb" field="smm" form={form} onChange={handleFieldChange} />
            <FieldRow label="Body Fat Mass" suffix="lb" field="body_fat_mass" form={form} onChange={handleFieldChange} />
            <FieldRow label="Body Fat %" suffix="%" field="body_fat_percent" form={form} onChange={handleFieldChange} />
            <FieldRow label="BMI" suffix="kg/m²" field="bmi" form={form} onChange={handleFieldChange} step="0.1" />
          </div>

          {/* Key indicators */}
          <div className="space-y-2">
            <div className="label">Key Indicators</div>
            <FieldRow label="Visceral Fat Level" suffix="/20" field="visceral_fat_level" form={form} onChange={handleFieldChange} step="1" />
            <FieldRow label="ECW/TBW Ratio" suffix="" field="ecw_tbw" form={form} onChange={handleFieldChange} step="0.001" />
            <FieldRow label="BMR" suffix="kcal" field="bmr" form={form} onChange={handleFieldChange} step="1" />
          </div>

          {/* Segmental lean */}
          <div className="space-y-2">
            <div className="label">Segmental Lean (lb / %)</div>
            {(['right_arm', 'left_arm', 'trunk', 'right_leg', 'left_leg'] as const).map((seg) => {
              const lbField = `lean_${seg}` as keyof FormValues
              const pctField = `lean_${seg}_pct` as keyof FormValues
              const segLabel = seg.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())
              return (
                <div key={seg} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-sm text-slate-400">{segLabel}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form[lbField]}
                    onChange={(e) => handleFieldChange(lbField, e.target.value)}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
                    placeholder="lb"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={form[pctField]}
                    onChange={(e) => handleFieldChange(pctField, e.target.value)}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
                    placeholder="%"
                  />
                </div>
              )
            })}
          </div>

          {/* Trunk fat */}
          <div className="space-y-2">
            <div className="label">Segmental Fat</div>
            <FieldRow label="Trunk Fat" suffix="lb" field="fat_trunk" form={form} onChange={handleFieldChange} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="label">Notes (optional)</div>
            <textarea
              value={form.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              className="min-h-[72px] w-full rounded-2xl border border-slate-700 bg-slate-900/40 px-3 py-3 text-sm text-white outline-none"
              placeholder="Anything to note about this assessment…"
            />
          </div>

          {saveError ? <p className="text-sm text-rose-400">{saveError}</p> : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="block w-full rounded-[1.5rem] bg-emerald-500 px-5 py-4 text-center text-[1rem] font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save Assessment'}
          </button>
        </section>
      ) : null}

      {/* History */}
      <section className="card space-y-4">
        <div className="label">Assessment History</div>

        {historyLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-400">No assessments saved yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((row, i) => {
              const prev = history[i + 1]
              const smmDelta = row.smm != null && prev?.smm != null ? row.smm - prev.smm : null
              const bfDelta = row.body_fat_percent != null && prev?.body_fat_percent != null
                ? row.body_fat_percent - prev.body_fat_percent
                : null

              return (
                <div
                  key={row.id ?? i}
                  className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 space-y-3"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-white">
                      {formatDate(row.assessment_date)}
                    </div>
                    {row.image_path ? (
                      <button
                        type="button"
                        onClick={() => handleViewImage(row)}
                        disabled={loadingImageId === row.id}
                        className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                      >
                        {loadingImageId === row.id ? 'Loading…' : 'View report'}
                      </button>
                    ) : null}
                  </div>

                  {/* Core metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-800/60 px-2 py-2">
                      <div className="label">Weight</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {row.weight != null ? `${row.weight} lb` : '—'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-800/60 px-2 py-2">
                      <div className="label">SMM</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {row.smm != null ? `${row.smm} lb` : '—'}
                        {smmDelta != null ? (
                          <span className={`ml-1 text-[10px] ${smmDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {smmDelta >= 0 ? '+' : ''}{smmDelta.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-800/60 px-2 py-2">
                      <div className="label">Body Fat</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {row.body_fat_percent != null ? `${row.body_fat_percent}%` : '—'}
                        {bfDelta != null ? (
                          <span className={`ml-1 text-[10px] ${bfDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {bfDelta >= 0 ? '+' : ''}{bfDelta.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Key indicators */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Visceral fat</span>
                      <VisceralBadge level={row.visceral_fat_level} />
                    </div>
                    {row.fat_trunk != null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Trunk fat</span>
                        <span className="font-semibold text-white">{row.fat_trunk} lb</span>
                      </div>
                    ) : null}
                    {row.ecw_tbw != null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">ECW/TBW</span>
                        <span className="font-semibold text-white">{row.ecw_tbw}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Lean balance */}
                  {(row.lean_right_arm != null || row.lean_right_leg != null) ? (
                    <div className="space-y-1 rounded-xl bg-slate-800/40 px-3 py-2">
                      <div className="label mb-1">Lean balance</div>
                      <LeanBalance label="Arms" right={row.lean_right_arm} left={row.lean_left_arm} />
                      <LeanBalance label="Legs" right={row.lean_right_leg} left={row.lean_left_leg} />
                    </div>
                  ) : null}

                  {row.notes ? (
                    <p className="text-xs text-slate-400">{row.notes}</p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
