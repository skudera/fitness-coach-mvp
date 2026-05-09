import type { BodyMetricRow, ExerciseLogRow, InBodyRow, WorkoutRow } from './storage-supabase'

export type FindingSeverity = 'info' | 'warning' | 'action'

export type CoachingFinding = {
  type:
    | 'stall'
    | 'discomfort'
    | 'partial'
    | 'progression_stall'
    | 'muscle_retention'
    | 'segmental_imbalance'
    | 'visceral_fat'
    | 'trunk_fat'
    | 'leg_lean_deficit'
    | 'ecw_tbw'
    | 'fat_loss_stall'
  severity: FindingSeverity
  title: string
  body: string
  affectedExercises?: string[]
  tier?: 1 | 2 | 3
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

    // True stall (both weight and BF flat) is handled by analyzeFatLossStall with tiered response
    return null
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

function analyzeSegmentalImbalance(assessments: InBodyRow[]): CoachingFinding | null {
  const latest = assessments[0]
  if (!latest) return null

  const notes: string[] = []

  if (latest.lean_right_arm != null && latest.lean_left_arm != null) {
    const gap = Math.abs(latest.lean_right_arm - latest.lean_left_arm)
    if (gap > 0.5) {
      const weaker = latest.lean_right_arm < latest.lean_left_arm ? 'right' : 'left'
      notes.push(
        `${weaker.charAt(0).toUpperCase() + weaker.slice(1)} arm is ${gap.toFixed(2)} lb behind — add an extra set of unilateral work on the ${weaker} side`
      )
    }
  }

  if (latest.lean_right_leg != null && latest.lean_left_leg != null) {
    const gap = Math.abs(latest.lean_right_leg - latest.lean_left_leg)
    if (gap > 1.0) {
      const weaker = latest.lean_right_leg < latest.lean_left_leg ? 'right' : 'left'
      notes.push(
        `${weaker.charAt(0).toUpperCase() + weaker.slice(1)} leg is ${gap.toFixed(2)} lb behind — prioritize single-leg work on the ${weaker} side`
      )
    }
  }

  if (!notes.length) return null

  return {
    type: 'segmental_imbalance',
    severity: 'info',
    title: 'Segmental lean imbalance',
    body: notes.join('. ') + '.',
  }
}

function analyzeVisceralFat(assessments: InBodyRow[]): CoachingFinding | null {
  const latest = assessments[0]
  if (!latest || latest.visceral_fat_level == null) return null

  const vfl = latest.visceral_fat_level

  if (vfl >= 10) {
    return {
      type: 'visceral_fat',
      severity: 'action',
      title: 'Visceral fat above target',
      body: `Visceral fat level is ${vfl} — target is under 10. Prioritize cardio completion every session and keep high-tension core work in the plan. Review weekly nutrition if not already tracking.`,
    }
  }

  if (vfl >= 8) {
    return {
      type: 'visceral_fat',
      severity: 'warning',
      title: 'Visceral fat approaching target zone',
      body: `Visceral fat level is ${vfl} — approaching the upper limit of 10. Keep cardio consistent and protect core work. Don't let these get skipped as accessory filler.`,
    }
  }

  return null
}

function analyzeTrunkFat(assessments: InBodyRow[]): CoachingFinding | null {
  const latest = assessments[0]
  if (!latest || latest.fat_trunk == null || !latest.body_fat_mass) return null

  const trunkRatio = latest.fat_trunk / latest.body_fat_mass

  if (trunkRatio > 0.60) {
    return {
      type: 'trunk_fat',
      severity: 'warning',
      title: 'Trunk-dominant fat distribution',
      body: `${(trunkRatio * 100).toFixed(0)}% of total body fat is concentrated in the trunk (${latest.fat_trunk} lb). High-tension core work is a structural priority — cable crunches, dead-bugs, and the ab machine should not be treated as optional filler.`,
    }
  }

  return null
}

function analyzeLegLeanDeficit(assessments: InBodyRow[]): CoachingFinding | null {
  const latest = assessments[0]
  if (!latest) return null

  const pcts = [latest.lean_right_leg_pct, latest.lean_left_leg_pct].filter(
    (p): p is number => p != null
  )
  if (!pcts.length) return null

  const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length

  if (avg < 95) {
    return {
      type: 'leg_lean_deficit',
      severity: 'info',
      title: 'Leg lean mass below ideal',
      body: `Average leg lean is ${avg.toFixed(1)}% of ideal (R: ${latest.lean_right_leg_pct?.toFixed(1) ?? '—'}%, L: ${latest.lean_left_leg_pct?.toFixed(1) ?? '—'}%). Leg day compound lifts — leg press, hack squat, and hamstring curl — are the primary levers for closing this gap.`,
    }
  }

  return null
}

function analyzeEcwTbw(assessments: InBodyRow[]): CoachingFinding | null {
  const latest = assessments[0]
  if (!latest || latest.ecw_tbw == null) return null

  const ratio = latest.ecw_tbw

  if (ratio > 0.42) {
    return {
      type: 'ecw_tbw',
      severity: 'warning',
      title: 'Body water balance elevated',
      body: `ECW/TBW ratio is ${ratio} — above the normal range of 0.36–0.39. An elevated ratio can signal inflammation or under-recovery. Prioritize sleep quality, reduce excess sodium, and evaluate whether training volume is sustainable.`,
    }
  }

  if (ratio > 0.40) {
    return {
      type: 'ecw_tbw',
      severity: 'info',
      title: 'Body water balance slightly elevated',
      body: `ECW/TBW ratio is ${ratio} — slightly above the 0.36–0.39 normal range. Monitor recovery quality. If it persists at the next assessment, consider recovery load and hydration habits.`,
    }
  }

  return null
}

function analyzeFatLossStall(
  metrics: BodyMetricRow[],
  inbodyAssessments: InBodyRow[]
): CoachingFinding | null {
  const sorted = [...metrics]
    .filter((m) => m.weight != null && m.body_fat != null && m.date)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (sorted.length < 4) return null

  // ECW/TBW noise filter — elevated water balance can mask true fat loss
  const latestInBody = inbodyAssessments[0]
  if (latestInBody?.ecw_tbw != null && latestInBody.ecw_tbw > 0.41) return null

  function windowRate(weeksBack: number): { weightRate: number; bfRate: number } | null {
    const cutoff = weeksAgoDate(weeksBack)
    const window = sorted.filter((m) => m.date >= cutoff)
    if (window.length < 2) return null

    const first = window[0]
    const last = window[window.length - 1]
    const days = daysBetween(first.date, last.date)
    if (days < 21) return null // need at least 3 weeks of spread

    const weeks = days / 7
    return {
      weightRate: ((last.weight ?? 0) - (first.weight ?? 0)) / weeks,
      bfRate: ((last.body_fat ?? 0) - (first.body_fat ?? 0)) / weeks,
    }
  }

  // Stalled = weight not dropping 0.3 lb/week AND BF% not dropping 0.04%/week
  function isStalled(r: { weightRate: number; bfRate: number } | null): boolean {
    if (!r) return false
    return r.weightRate > -0.3 && r.bfRate > -0.04
  }

  const w4 = windowRate(4)
  const w8 = windowRate(8)
  const w12 = windowRate(12)

  // InBody trunk context
  const trunkElevated =
    latestInBody?.fat_trunk != null &&
    latestInBody?.body_fat_mass != null &&
    latestInBody.body_fat_mass > 0 &&
    latestInBody.fat_trunk / latestInBody.body_fat_mass > 0.57

  const trunkNote = trunkElevated
    ? ' Trunk fat distribution from your last InBody supports this — cardio output is the right lever, and high-tension core work should stay non-negotiable.'
    : ''

  if (isStalled(w12)) {
    return {
      type: 'fat_loss_stall',
      severity: 'action',
      tier: 3,
      title: 'Extended plateau — Tier 3 response',
      body: `Both weight and body fat have been essentially flat for 12+ weeks. Recommended: protect compound lift load but cut 1 accessory movement per session this week, and redirect that time to higher-intensity cardio. Do not reduce weight on your main lifts — only reduce accessory volume.${trunkNote}`,
    }
  }

  if (isStalled(w8)) {
    return {
      type: 'fat_loss_stall',
      severity: 'warning',
      tier: 2,
      title: 'Fat loss plateau — Tier 2 response',
      body: `Weight and body fat have been flat for ~8 weeks. Recommended: add 10 min to cardio on Mon, Wed, and Fri this week. If recovery allows, a light Saturday conditioning session (20 min walk or bike) adds output without stressing the lifting days.${trunkNote}`,
    }
  }

  if (isStalled(w4)) {
    return {
      type: 'fat_loss_stall',
      severity: 'warning',
      tier: 1,
      title: 'Fat loss plateau — Tier 1 response',
      body: `Weight and body fat have been flat for ~4 weeks. Recommended: add 5 min to cardio on Mon and Wed this week. One targeted adjustment first — don't escalate before giving this a full week to show an effect.${trunkNote}`,
    }
  }

  return null
}

export function getInBodyDayNotes(
  dayName: string,
  assessment: InBodyRow | null
): string[] {
  if (!assessment) return []

  const notes: string[] = []

  const isUpperDay =
    dayName === 'Monday' || dayName === 'Tuesday' || dayName === 'Thursday'
  const isLegDay = dayName === 'Wednesday' || dayName === 'Friday'

  // Arm imbalance note — upper days
  if (isUpperDay && assessment.lean_right_arm != null && assessment.lean_left_arm != null) {
    const gap = Math.abs(assessment.lean_right_arm - assessment.lean_left_arm)
    if (gap > 0.5) {
      const weaker = assessment.lean_right_arm < assessment.lean_left_arm ? 'right' : 'left'
      notes.push(
        `${weaker.charAt(0).toUpperCase() + weaker.slice(1)} arm lean is ${gap.toFixed(2)} lb behind — consider an extra set on the ${weaker} side for isolation work today.`
      )
    }
  }

  // Leg lean deficit note — leg days
  if (isLegDay) {
    const pcts = [assessment.lean_right_leg_pct, assessment.lean_left_leg_pct].filter(
      (p): p is number => p != null
    )
    if (pcts.length) {
      const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length
      if (avg < 95) {
        notes.push(
          `Leg lean is ${avg.toFixed(1)}% of ideal — prioritize progressive overload on compound leg movements. Don't rush the weights.`
        )
      }
    }
  }

  // Trunk fat note — any day with core work (Mon/Tue/Wed/Thu)
  if (dayName !== 'Friday' && assessment.fat_trunk != null && assessment.body_fat_mass) {
    const ratio = assessment.fat_trunk / assessment.body_fat_mass
    if (ratio > 0.60) {
      notes.push(
        `Trunk fat is elevated (${assessment.fat_trunk} lb). Core work today is structural — not filler.`
      )
    }
  }

  return notes
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
    analyzeFatLossStall(metrics, inbodyAssessments),
    analyzeWeightTrend(metrics),
    analyzeMuscleRetention(inbodyAssessments),
    analyzeVisceralFat(inbodyAssessments),
    analyzeTrunkFat(inbodyAssessments),
    analyzeSegmentalImbalance(inbodyAssessments),
    analyzeLegLeanDeficit(inbodyAssessments),
    analyzeEcwTbw(inbodyAssessments),
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
