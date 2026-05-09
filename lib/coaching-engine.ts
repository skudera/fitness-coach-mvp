import type { BodyMetricRow, ExerciseLogRow, InBodyRow, WorkoutRow } from './storage-supabase'

export type FindingSeverity = 'info' | 'warning' | 'action'

export type CoachingFinding = {
  type: 'stall' | 'discomfort' | 'partial' | 'progression_stall' | 'muscle_retention'
  severity: FindingSeverity
  title: string
  body: string
  affectedExercises?: string[]
}

export type CoachingReport = {
  findings: CoachingFinding[]
  hasEnoughData: boolean
  dataWeeks: number
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000
  )
}

function weeksAgoDate(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n * 7)
  return d.toISOString().slice(0, 10)
}

function analyzeWeightTrend(metrics: BodyMetricRow[]): CoachingFinding | null {
  const sorted = [...metrics]
    .filter((m) => m.weight != null && m.date)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (sorted.length < 4) return null

  const recent = sorted.slice(-5)

  const weeklyRates: number[] = []
  for (let i = 1; i < recent.length; i++) {
    const days = daysBetween(recent[i - 1].date, recent[i].date)
    if (days === 0) continue
    const diff = (recent[i].weight ?? 0) - (recent[i - 1].weight ?? 0)
    weeklyRates.push((diff / days) * 7)
  }

  if (weeklyRates.length < 2) return null

  const avg = weeklyRates.reduce((a, b) => a + b, 0) / weeklyRates.length

  if (avg > -0.5) {
    const bfSorted = sorted.filter((m) => m.body_fat != null).slice(-4)
    const bfDropping =
      bfSorted.length >= 2 &&
      (bfSorted[bfSorted.length - 1].body_fat ?? 0) < (bfSorted[0].body_fat ?? 0)

    if (bfDropping) {
      return {
        type: 'stall',
        severity: 'info',
        title: 'Weight holding — recomp in progress',
        body: `Scale weight is averaging ${avg >= 0 ? '+' : ''}${avg.toFixed(1)} lb/week, but body fat is trending down. Lean mass is likely increasing. No action needed — this is the goal of recomp.`,
      }
    }

    return {
      type: 'stall',
      severity: 'warning',
      title: 'Weight trend stalled',
      body: `Scale weight is averaging ${avg >= 0 ? '+' : ''}${avg.toFixed(1)} lb/week over recent check-ins — below the −0.5 lb/week target. Consider adding 5 min to cardio on 2 sessions this week.`,
    }
  }

  return null
}

function analyzeDiscomfortPattern(
  logs: ExerciseLogRow[],
  workouts: WorkoutRow[]
): CoachingFinding | null {
  const cutoff = weeksAgoDate(3)
  const recentIds = new Set(workouts.filter((w) => w.date >= cutoff).map((w) => w.id))

  const flagged = logs.filter(
    (l) =>
      recentIds.has(l.workout_id) &&
      l.discomfort &&
      l.discomfort.trim() !== '' &&
      !l.discomfort.startsWith('None')
  )

  if (flagged.length < 3) return null

  const byLocation = new Map<string, Set<string>>()
  flagged.forEach((l) => {
    const loc = l.discomfort!.split(' -')[0].trim()
    if (!byLocation.has(loc)) byLocation.set(loc, new Set())
    byLocation.get(loc)!.add(l.exercise_name)
  })

  const summary = [...byLocation.entries()]
    .map(([loc, exs]) => `${loc}: ${[...exs].join(', ')}`)
    .join(' · ')

  return {
    type: 'discomfort',
    severity: 'warning',
    title: 'Recurring discomfort pattern',
    body: `${flagged.length} discomfort flags in the last 3 weeks — ${summary}. Review load and form on these movements before progressing weight.`,
    affectedExercises: [...new Set(flagged.map((l) => l.exercise_name))],
  }
}

function analyzeSessionCompletion(workouts: WorkoutRow[]): CoachingFinding | null {
  const cutoff = weeksAgoDate(4)
  const recent = workouts.filter((w) => w.date >= cutoff)

  const problematic = recent.filter(
    (w) => w.status === 'completed_partial' || w.status === 'missed'
  )

  if (problematic.length < 3) return null

  const partials = problematic.filter((w) => w.status === 'completed_partial').length
  const missed = problematic.filter((w) => w.status === 'missed').length

  return {
    type: 'partial',
    severity: 'warning',
    title: 'Session completion trend',
    body: `${problematic.length} sessions in the last 4 weeks were partial or missed (${partials} partial, ${missed} missed). Consider removing 1 accessory exercise from the heaviest day to protect completion rate.`,
  }
}

function analyzeProgressionStalls(
  logs: ExerciseLogRow[],
  workouts: WorkoutRow[]
): CoachingFinding | null {
  const workoutDates = new Map(workouts.map((w) => [w.id, w.date]))

  const logsWithForm = logs
    .filter((l) => l.difficulty && l.workout_id)
    .sort((a, b) => {
      const da = workoutDates.get(a.workout_id) ?? ''
      const db = workoutDates.get(b.workout_id) ?? ''
      return db.localeCompare(da)
    })

  // Per exercise: map workoutId → difficulty (first entry per session = most recent set)
  const byExercise = new Map<string, Map<string, string>>()
  logsWithForm.forEach((l) => {
    if (!byExercise.has(l.exercise_name)) byExercise.set(l.exercise_name, new Map())
    const sessions = byExercise.get(l.exercise_name)!
    if (!sessions.has(l.workout_id)) sessions.set(l.workout_id, l.difficulty!)
  })

  const stalled: string[] = []
  byExercise.forEach((sessions, name) => {
    const recent = [...sessions.values()].slice(0, 3)
    if (recent.length < 3) return
    const allBroken = recent.every(
      (d) => d === 'Slight Breakdown' || d === 'Breakdown'
    )
    if (allBroken) stalled.push(name)
  })

  if (!stalled.length) return null

  return {
    type: 'progression_stall',
    severity: 'action',
    title: 'Load review needed',
    body: `${stalled.join(', ')} ${stalled.length === 1 ? 'has' : 'have'} shown form breakdown across the last 3 sessions. Consider a deload set or weight reduction before pushing load again.`,
    affectedExercises: stalled,
  }
}

function analyzeMuscleRetention(assessments: InBodyRow[]): CoachingFinding | null {
  const sorted = [...assessments]
    .filter((a) => a.smm != null)
    .sort((a, b) => a.assessment_date.localeCompare(b.assessment_date))

  if (sorted.length < 2) return null

  const latest = sorted[sorted.length - 1]
  const prev = sorted[sorted.length - 2]
  const change = (latest.smm ?? 0) - (prev.smm ?? 0)

  if (change < -0.5) {
    return {
      type: 'muscle_retention',
      severity: 'warning',
      title: 'Muscle retention flag',
      body: `SMM dropped ${Math.abs(change).toFixed(1)} lb between InBody assessments (${prev.assessment_date} → ${latest.assessment_date}). Prioritize progressive overload on compound lifts and confirm protein targets are being met.`,
    }
  }

  return null
}

export function generateCoachingReport(params: {
  metrics: BodyMetricRow[]
  workouts: WorkoutRow[]
  exerciseLogs: ExerciseLogRow[]
  inbodyAssessments: InBodyRow[]
}): CoachingReport {
  const { metrics, workouts, exerciseLogs, inbodyAssessments } = params

  const hasEnoughData = metrics.length >= 4 || workouts.length >= 8

  const findings: CoachingFinding[] = [
    analyzeProgressionStalls(exerciseLogs, workouts),
    analyzeDiscomfortPattern(exerciseLogs, workouts),
    analyzeSessionCompletion(workouts),
    analyzeWeightTrend(metrics),
    analyzeMuscleRetention(inbodyAssessments),
  ].filter((f): f is CoachingFinding => f !== null)

  // Sort: action → warning → info
  const order: Record<FindingSeverity, number> = { action: 0, warning: 1, info: 2 }
  findings.sort((a, b) => order[a.severity] - order[b.severity])

  const oldest = metrics.length ? metrics[0] : null
  const newest = metrics.length ? metrics[metrics.length - 1] : null
  const dataWeeks =
    oldest && newest ? Math.round(daysBetween(oldest.date, newest.date) / 7) : 0

  return { findings, hasEnoughData, dataWeeks }
}
