import type { CoachingFinding } from './coaching-engine'

export type CoachingDecision = {
  type: string
  title: string
  change: string
  reason: string
}

export type CoachingOverrides = {
  generated_at: string
  cardio_add_minutes: Record<string, number>
  priority_exercises: string[]
  decisions: CoachingDecision[]
}

const CORE_EXERCISES = [
  'Dead-Bug',
  'Ab Wheel or Dead-Bug',
  'Weighted Cable Crunch',
  'Ab Machine',
  "Captain's Chair Leg Raise",
]

const LEG_COMPOUND_EXERCISES = [
  'Seated Hamstring Curl',
  'Leg Press (45° Plate Loaded)',
  'Hack Squat',
]

export function buildCoachingOverrides(
  findings: CoachingFinding[]
): CoachingOverrides | null {
  if (!findings.length) return null

  const cardioAdd: Record<string, number> = {}
  const priorityExercises = new Set<string>()
  const decisions: CoachingDecision[] = []

  for (const finding of findings) {
    switch (finding.type) {
      case 'fat_loss_stall': {
        const tier = finding.tier ?? 1
        if (tier === 1) {
          cardioAdd['Monday'] = (cardioAdd['Monday'] ?? 0) + 5
          cardioAdd['Wednesday'] = (cardioAdd['Wednesday'] ?? 0) + 5
          decisions.push({
            type: finding.type,
            title: finding.title,
            change: 'Cardio +5 min on Monday and Wednesday',
            reason: 'Weight and body fat flat for ~4 weeks',
          })
        } else if (tier === 2) {
          cardioAdd['Monday'] = (cardioAdd['Monday'] ?? 0) + 10
          cardioAdd['Wednesday'] = (cardioAdd['Wednesday'] ?? 0) + 10
          cardioAdd['Friday'] = (cardioAdd['Friday'] ?? 0) + 10
          decisions.push({
            type: finding.type,
            title: finding.title,
            change: 'Cardio +10 min on Monday, Wednesday, and Friday',
            reason: 'Weight and body fat flat for ~8 weeks',
          })
        } else {
          cardioAdd['Monday'] = (cardioAdd['Monday'] ?? 0) + 10
          cardioAdd['Wednesday'] = (cardioAdd['Wednesday'] ?? 0) + 10
          cardioAdd['Friday'] = (cardioAdd['Friday'] ?? 0) + 10
          decisions.push({
            type: finding.type,
            title: finding.title,
            change: 'Cardio +10 min on Mon/Wed/Fri and cut 1 accessory per session',
            reason: 'Weight and body fat flat for 12+ weeks',
          })
        }
        break
      }

      case 'visceral_fat': {
        CORE_EXERCISES.forEach((ex) => priorityExercises.add(ex))
        cardioAdd['Monday'] = (cardioAdd['Monday'] ?? 0) + 5
        cardioAdd['Wednesday'] = (cardioAdd['Wednesday'] ?? 0) + 5
        decisions.push({
          type: finding.type,
          title: finding.title,
          change: 'Core exercises priority + cardio +5 min on Mon and Wed',
          reason: 'Visceral fat level elevated — cardio output and core work are the levers',
        })
        break
      }

      case 'trunk_fat': {
        CORE_EXERCISES.forEach((ex) => priorityExercises.add(ex))
        decisions.push({
          type: finding.type,
          title: finding.title,
          change: 'Core exercises flagged as structural priority',
          reason: 'Trunk-dominant fat distribution — core work is not optional filler',
        })
        break
      }

      case 'leg_lean_deficit': {
        LEG_COMPOUND_EXERCISES.forEach((ex) => priorityExercises.add(ex))
        decisions.push({
          type: finding.type,
          title: finding.title,
          change: 'Leg compound lifts flagged as priority',
          reason: 'Leg lean mass below ideal — compound volume is the primary lever',
        })
        break
      }

      case 'muscle_retention': {
        LEG_COMPOUND_EXERCISES.forEach((ex) => priorityExercises.add(ex))
        decisions.push({
          type: finding.type,
          title: finding.title,
          change: 'Compound lifts flagged as priority to protect muscle retention',
          reason: 'SMM dropped between InBody assessments',
        })
        break
      }

      case 'discomfort': {
        decisions.push({
          type: finding.type,
          title: finding.title,
          change: `Review load on affected exercises before progressing weight`,
          reason: 'Recurring discomfort pattern in last 3 weeks',
        })
        break
      }

      case 'progression_stall': {
        decisions.push({
          type: finding.type,
          title: finding.title,
          change: `Deload: ${finding.affectedExercises?.join(', ') ?? 'flagged exercises'}`,
          reason: 'Form breakdown across 3 consecutive sessions — reduce load before pushing again',
        })
        break
      }
    }
  }

  if (!decisions.length) return null

  return {
    generated_at: new Date().toISOString().slice(0, 10),
    cardio_add_minutes: cardioAdd,
    priority_exercises: [...priorityExercises],
    decisions,
  }
}

export function hasCardioAdjustment(overrides: CoachingOverrides | null): boolean {
  if (!overrides) return false
  return Object.values(overrides.cardio_add_minutes).some((v) => v > 0)
}
