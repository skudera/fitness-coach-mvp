export type ProgressionDirection = 'up' | 'down' | 'hold'

export type SuggestedLoad = {
  workingWeight: number
  setWeights: number[]
  note: string
  incrementText: string
}

type ExerciseCategory =
  | 'lowerCompound'
  | 'upperCompound'
  | 'accessory'
  | 'isolation'

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
    name.includes('assisted dip')
  ) {
    return 'accessory'
  }

  return 'isolation'
}

function roundToNearestFive(value: number) {
  return Math.round(value / 5) * 5
}

function isCableLateralRaise(exerciseName: string) {
  return exerciseName.toLowerCase().includes('cable lateral raise')
}

function getFixedStep(exerciseName: string): number | null {
  const name = exerciseName.toLowerCase()

  if (name.includes('lat pulldown')) return 15
  if (name.includes('seated row machine')) return 15
  if (name.includes('chest press machine')) return 10
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

  const fixedStep = getFixedStep(exerciseName)
  if (fixedStep) {
    return currentWeight + fixedStep
  }

  return currentWeight + getFlexibleProgressionStep(exerciseName, category, 'up', topReps, repHigh)
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

  const fixedStep = getFixedStep(exerciseName)
  if (fixedStep) {
    return Math.max(0, currentWeight - fixedStep)
  }

  return Math.max(
    0,
    currentWeight - getFlexibleProgressionStep(exerciseName, category, 'down', topReps, repHigh)
  )
}

function getRampOffsets(exerciseName: string, category: ExerciseCategory) {
  const name = exerciseName.toLowerCase()

  if (name.includes('leg press')) return [20, 10, 0]
  if (name.includes('hack squat')) return [10, 5, 0]

  const fixedStep = getFixedStep(exerciseName)
  if (fixedStep && category === 'upperCompound') return [fixedStep, 0, 0]
  if (fixedStep && category === 'lowerCompound') return [fixedStep * 2, fixedStep, 0]

  if (category === 'lowerCompound') return [20, 10, 0]
  if (category === 'upperCompound') return [10, 0, 0]
  return [0, 0, 0]
}

function buildSetSuggestions(
  exerciseName: string,
  workingWeight: number,
  category: ExerciseCategory
): number[] {
  const offsets = getRampOffsets(exerciseName, category)

  return offsets.map((offset) => {
    const raw = Math.max(0, workingWeight - offset)

    if (isCableLateralRaise(exerciseName)) {
      if (raw <= 0) return 0
      if (raw <= 5.5) return 5.5
      if (raw <= 7.5) return 7.5
      return raw
    }

    const fixedStep = getFixedStep(exerciseName)
    if (fixedStep) {
      return Math.max(0, roundToNearestFive(raw))
    }

    return Math.max(0, roundToNearestFive(raw))
  })
}

function getIncrementText(exerciseName: string, category: ExerciseCategory, topReps: number, repHigh: number) {
  if (isCableLateralRaise(exerciseName)) return 'machine-aware progression ladder'

  const fixedStep = getFixedStep(exerciseName)
  if (fixedStep) return `${fixedStep} lb stack jump`

  const step = getFlexibleProgressionStep(exerciseName, category, 'up', topReps, repHigh)
  return `${step} lb progression`
}

export function getMachineAwareSuggestion(input: {
  exerciseName: string
  targetRepRange: string
  topWeight: number
  topReps: number
  lastDifficulty: string | null
}): SuggestedLoad {
  const { exerciseName, targetRepRange, topWeight, topReps, lastDifficulty } = input
  const category = getExerciseCategory(exerciseName)
  const repRange = parseRepRange(targetRepRange)

  let workingWeight = topWeight
  let note = 'Holding at last session weight until reps earn progression'

  const hitTopOfRange = topReps >= repRange.high
  const belowRange = topReps < repRange.low
  const withinRangeNotReady = topReps >= repRange.low && topReps < repRange.high

  if ((lastDifficulty === 'Easy' || lastDifficulty === 'Good') && hitTopOfRange) {
    workingWeight = getNextAllowedWeight(exerciseName, category, topWeight, topReps, repRange.high)
    note = 'Increased because prior reps reached the top of the target range'
  } else if (lastDifficulty === 'Too Hard' && belowRange) {
    workingWeight = getPreviousAllowedWeight(exerciseName, category, topWeight, topReps, repRange.high)
    note = 'Reduced because prior reps missed the target range and felt too hard'
  } else if (withinRangeNotReady) {
    workingWeight = topWeight
    note = 'Holding because prior reps only reached the lower or middle part of the range'
  } else if (belowRange) {
    workingWeight = topWeight
    note = 'Holding because prior reps missed the target range'
  }

  return {
    workingWeight,
    setWeights: buildSetSuggestions(exerciseName, workingWeight, category),
    note,
    incrementText: getIncrementText(exerciseName, category, topReps, repRange.high),
  }
}
