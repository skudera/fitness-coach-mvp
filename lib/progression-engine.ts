/**
 * Logs created before this date are ignored when suggesting weights. Pre-surgery
 * history overstates current strength, so the first session after the return
 * starts from what you enter, then normal progression resumes from there.
 * Weights only: recorded pain stays in force regardless of its date.
 */
export const PROGRESSION_FRESH_START = '2026-11-29'

/** First week back (Mon Nov 30 – Sun Dec 6): find comfortable weights, no increases. */
export const BASELINE_WEEK_END =
  process.env.NEXT_PUBLIC_BASELINE_WEEK_END ?? '2026-12-06'

export type ProgressionDirection = 'up' | 'down' | 'hold'

export type SuggestedLoad = {
  workingWeight: number
  setWeights: number[]
  note: string
  incrementText: string
  /** No load is recommended: swap the exercise, or get the pain reviewed first. */
  blocked?: 'substitute' | 'review'
}

type ExerciseCategory =
  | 'lowerCompound'
  | 'upperCompound'
  | 'accessory'
  | 'isolation'

type FormQuality = 'Clean' | 'Slight Breakdown' | 'Breakdown'

export function parseRepRange(value: string) {
  const match = value.match(/(\d+)\D+(\d+)/)
  if (match) {
    return { low: Number(match[1]), high: Number(match[2]) }
  }

  const single = value.match(/\d+/)
  const num = single ? Number(single[0]) : 0
  return { low: num, high: num }
}

export function getExerciseCategory(exerciseName: string): ExerciseCategory {
  const name = exerciseName.toLowerCase()

  if (name.includes('leg press') || name.includes('hack squat')) {
    return 'lowerCompound'
  }

  if (
    name.includes('press machine') ||
    name.includes('smith machine incline chest press') ||
    name.includes('vertical traction machine') ||
    name.includes('pulldown') ||
    name.includes('row') ||
    name.includes('shoulder press')
  ) {
    return 'upperCompound'
  }

  if (
    name.includes('seated hamstring curl') ||
    name.includes('hip thrust') ||
    name.includes('back extension') ||
    name.includes('assisted dip') ||
    name.includes('glute bridge')
  ) {
    return 'accessory'
  }

  return 'isolation'
}

function isCableLateralRaise(exerciseName: string) {
  return exerciseName.toLowerCase().includes('cable lateral raise')
}

function isHalfStepCableStackExercise(exerciseName: string) {
  const name = exerciseName.toLowerCase()

  return (
    name.includes('face pull') ||
    name.includes('triceps pressdown') ||
    name.includes('cable curl') ||
    name.includes('straight arm pulldown')
  )
}

function getHalfStepCableWeightAtIndex(index: number) {
  return 7.5 + index * 5
}

function snapToHalfStepCableWeight(value: number) {
  if (value <= 0) return 0
  if (value <= 7.5) return 7.5

  const index = Math.round((value - 7.5) / 5)
  return getHalfStepCableWeightAtIndex(index)
}

function getNextHalfStepCableWeight(weight: number) {
  if (weight < 7.5) return 7.5
  const index = Math.floor((weight - 7.5) / 5) + 1
  return getHalfStepCableWeightAtIndex(index)
}

function getPreviousHalfStepCableWeight(weight: number) {
  if (weight <= 7.5) return 7.5
  const index = Math.ceil((weight - 7.5) / 5) - 1
  return Math.max(7.5, getHalfStepCableWeightAtIndex(index))
}

function getFixedStep(exerciseName: string): number | null {
  const name = exerciseName.toLowerCase()

  // Light corrective work never takes the default 5 lb jump.
  if (name.includes('supported y raise')) return 2
  if (name.includes('vertical traction machine')) return 15
  if (name.includes('lat pulldown')) return 15
  if (name.includes('seated row machine')) return 15
  if (name.includes('flat chest press machine')) return 10
  if (name.includes('smith machine incline chest press')) return 10
  if (name.includes('seated hamstring curl')) return 10
  if (name.includes('leg extension')) return 10
  if (name.includes('ab machine')) return 10
  if (name.includes('rotary calf')) return 10
  if (name.includes('cable')) return 5

  return null
}

function getFlexibleProgressionStep(
  exerciseName: string,
  category: ExerciseCategory,
  direction: ProgressionDirection,
  topReps: number,
  repHigh: number
) {
  const name = exerciseName.toLowerCase()

  if (name.includes('leg press')) {
    return direction === 'up' && topReps >= repHigh + 2 ? 20 : 10
  }

  if (name.includes('hack squat')) {
    return direction === 'up' && topReps >= repHigh + 2 ? 10 : 5
  }

  if (category === 'lowerCompound') return 10
  return 5
}

function getCableLateralRaiseNext(weight: number) {
  if (weight < 5.5) return 5.5
  if (weight < 7.5) return 7.5
  return weight + 5
}

function getCableLateralRaisePrevious(weight: number) {
  if (weight <= 5.5) return 5.5
  if (weight <= 7.5) return 5.5
  return Math.max(7.5, weight - 5)
}

function getNextAllowedWeight(
  exerciseName: string,
  category: ExerciseCategory,
  currentWeight: number,
  topReps: number,
  repHigh: number
) {
  if (isCableLateralRaise(exerciseName)) {
    return getCableLateralRaiseNext(currentWeight)
  }

  if (isHalfStepCableStackExercise(exerciseName)) {
    return getNextHalfStepCableWeight(currentWeight)
  }

  const fixedStep = getFixedStep(exerciseName)
  if (fixedStep) {
    return currentWeight + fixedStep
  }

  return (
    currentWeight +
    getFlexibleProgressionStep(exerciseName, category, 'up', topReps, repHigh)
  )
}

function getPreviousAllowedWeight(
  exerciseName: string,
  category: ExerciseCategory,
  currentWeight: number,
  topReps: number,
  repHigh: number
) {
  if (isCableLateralRaise(exerciseName)) {
    return getCableLateralRaisePrevious(currentWeight)
  }

  if (isHalfStepCableStackExercise(exerciseName)) {
    return getPreviousHalfStepCableWeight(currentWeight)
  }

  const fixedStep = getFixedStep(exerciseName)
  if (fixedStep) {
    return Math.max(0, currentWeight - fixedStep)
  }

  return Math.max(
    0,
    currentWeight -
      getFlexibleProgressionStep(exerciseName, category, 'down', topReps, repHigh)
  )
}

function getIncrementText(
  exerciseName: string,
  category: ExerciseCategory,
  topReps: number,
  repHigh: number
) {
  if (isCableLateralRaise(exerciseName)) return 'machine-aware progression ladder'
  if (isHalfStepCableStackExercise(exerciseName))
    return '7.5 lb start, then 5 lb cable ladder'

  const fixedStep = getFixedStep(exerciseName)
  if (fixedStep) return `${fixedStep} lb stack jump`

  const step = getFlexibleProgressionStep(exerciseName, category, 'up', topReps, repHigh)
  return `${step} lb progression`
}

function normalizeFormQuality(lastDifficulty: string | null): FormQuality | null {
  if (!lastDifficulty) return null

  if (lastDifficulty === 'Clean') return 'Clean'
  if (lastDifficulty === 'Slight Breakdown') return 'Slight Breakdown'
  if (lastDifficulty === 'Breakdown') return 'Breakdown'

  if (lastDifficulty === 'Easy' || lastDifficulty === 'Good') return 'Clean'
  if (lastDifficulty === 'Hard') return 'Slight Breakdown'
  if (lastDifficulty === 'Too Hard') return 'Breakdown'

  return null
}

export type Effort = 'Easy' | 'Moderate' | 'Hard' | 'Very Hard'
export type PainSeverity = 'Mild' | 'Moderate' | 'Severe'

export type LoggedSet = {
  weight: number | null
  reps: number | null
}

/**
 * Reads the stored "Location - Severity" discomfort text. Sharp, radiating or
 * worsening pain counts as Severe. Older logs used Low / Medium / High, and a
 * location without a severity counts as Mild.
 */
export function parsePainSeverity(discomfort: string | null | undefined): PainSeverity | null {
  if (!discomfort || /^none/i.test(discomfort)) return null
  if (/severe|high|sharp|radiating|worsening/i.test(discomfort)) return 'Severe'
  if (/moderate|medium/i.test(discomfort)) return 'Moderate'
  return 'Mild'
}

const painRank: Record<PainSeverity, number> = { Mild: 1, Moderate: 2, Severe: 3 }

export function isWorseThan(current: PainSeverity | null, previous: PainSeverity | null) {
  return Boolean(current && previous && painRank[current] > painRank[previous])
}

/** Light control work: the app repeats your weights and never raises them for you. */
export function isCorrectiveExercise(exerciseName: string) {
  return /face pull|supported y raise|i-y-t|serratus|push-up plus|dead-bug|bird dog|pallof/i.test(
    exerciseName
  )
}

/** Keeps the heaviest sets at the end when today has a different set count. */
function fitToSetCount(weights: number[], setCount: number) {
  if (weights.length >= setCount) return weights.slice(weights.length - setCount)
  return [...Array(setCount - weights.length).fill(weights[0]), ...weights]
}

/**
 * Double progression across every working set: weight only goes up when all sets
 * reach the top of the rep range with clean form, Easy or Moderate effort and no
 * discomfort. Large jumps are introduced on the final set first.
 */
export function getMachineAwareSuggestion(input: {
  exerciseName: string
  targetRepRange: string
  setCount: number
  lastSets: LoggedSet[]
  lastDifficulty: string | null
  lastEffort: string | null
  lastPain: PainSeverity | null
  /** Severe pain was logged and has not been marked as reviewed. */
  reviewRequired?: boolean
  /** The last session's pain has since been marked as reviewed. */
  painReviewed?: boolean
  baselineWeek?: boolean
}): SuggestedLoad | null {
  const { exerciseName, targetRepRange, setCount, lastSets, lastEffort, lastPain } = input

  const blocked = (kind: 'substitute' | 'review', note: string): SuggestedLoad => ({
    workingWeight: 0,
    setWeights: [],
    note,
    incrementText: '',
    blocked: kind,
  })

  if (input.reviewRequired) {
    return blocked(
      'review',
      'Stop: severe, sharp, radiating or worsening pain was logged. No weight is recommended until this has been reviewed.'
    )
  }
  if (lastPain === 'Moderate' && !input.painReviewed) {
    return blocked(
      'substitute',
      'Moderate discomfort last time. Skip or substitute this exercise rather than just going lighter.'
    )
  }

  const topWeight = Math.max(0, ...lastSets.map((set) => set.weight ?? 0))
  if (!topWeight) {
    if (!lastPain) return null
    return {
      workingWeight: 0,
      setWeights: [],
      note: 'Discomfort is on record for this exercise. Start light and stop if it returns.',
      incrementText: '',
    }
  }

  const category = getExerciseCategory(exerciseName)
  const { low, high } = parseRepRange(targetRepRange)
  const formQuality = normalizeFormQuality(input.lastDifficulty)

  const lastWeights = lastSets.map((set) => set.weight || topWeight)
  const topReps = Math.max(
    0,
    ...lastSets.filter((set) => set.weight === topWeight).map((set) => set.reps ?? 0)
  )

  function result(weights: number[], note: string): SuggestedLoad {
    const setWeights = fitToSetCount(weights, setCount)
    return {
      workingWeight: Math.max(...setWeights),
      setWeights,
      note,
      incrementText: getIncrementText(exerciseName, category, topReps, high),
    }
  }

  const hold = (note: string) => result(lastWeights, note)
  const stepDown = (note: string) =>
    result(
      [getPreviousAllowedWeight(exerciseName, category, topWeight, topReps, high)],
      note
    )

  if (lastPain === 'Severe') {
    return stepDown('Pain reviewed. Restart one step lighter and stop if it returns.')
  }
  if (formQuality === 'Breakdown') {
    return stepDown('Reduced because form broke down. Rebuild with cleaner mechanics.')
  }
  if (lastPain) {
    return hold('Holding and monitoring: discomfort was logged last time, so no increase.')
  }
  if (isCorrectiveExercise(exerciseName)) {
    return hold(
      'Corrective exercise: movement quality comes first. Add weight yourself only when it feels controlled.'
    )
  }
  if (input.baselineWeek) {
    return hold('Baseline week: settle on comfortable weights. No increases yet.')
  }

  const complete = lastSets.every((set) => (set.weight ?? 0) > 0 && (set.reps ?? 0) > 0)
  if (!complete) {
    return hold('Holding: not every working set was logged last time.')
  }
  if (formQuality === 'Slight Breakdown') {
    return hold('Holding because of slight form breakdown. Own this load first.')
  }
  if (!formQuality || !lastEffort) {
    return hold('Holding: log both form and effort to qualify for an increase.')
  }
  if (lastSets.every((set) => (set.reps ?? 0) < low)) {
    return stepDown('Reduced because every set fell below the target reps.')
  }
  if (lastSets.some((set) => (set.reps ?? 0) < low)) {
    return hold('Holding because some sets fell below the target reps.')
  }
  if (lastEffort !== 'Easy' && lastEffort !== 'Moderate') {
    return hold(`Holding because last session felt ${lastEffort.toLowerCase()}.`)
  }

  const lighter = lastSets.filter((set) => (set.weight ?? 0) < topWeight)

  // Partway through moving to a heavier weight: shift one more set across.
  if (lighter.length) {
    if (lighter.every((set) => (set.reps ?? 0) >= high)) {
      const heavyCount = lastSets.length - lighter.length + 1
      const next = [...lastWeights].sort((a, b) => a - b)
      return result(
        next.map((weight, index) => (index >= next.length - heavyCount ? topWeight : weight)),
        'Moving one more set up to the heavier weight.'
      )
    }
    return hold('Holding until the lighter sets reach the top of the range.')
  }

  if (lastSets.some((set) => (set.reps ?? 0) < high)) {
    return hold('Holding until every set reaches the top of the rep range.')
  }

  const nextWeight = getNextAllowedWeight(exerciseName, category, topWeight, topReps, high)

  if (lastWeights.length > 1 && (nextWeight - topWeight) / topWeight >= 0.1) {
    return result(
      [...lastWeights.slice(1), nextWeight],
      'Earned an increase. It is a big jump, so try it on the final set first.'
    )
  }

  return result([nextWeight], 'Increased: every set hit the top of the range cleanly.')
}
