import type { WorkoutDefinition } from './workout-data'

export type BasketballTiming = 'standard' | 'late' | null
export type BasketballImpact = 'no_issue' | 'pain_issue' | null
export type FridaySleepQuality = 'well_rested' | 'a_little_tired' | 'exhausted' | null
export type BasketballDetectedLoad = 'low' | 'medium' | 'high'

export type FridayOutputType =
  | 'regular'
  | 'gym_anti_office'
  | 'home_anti_office'
  | 'walk_only'
  | 'full_rest'

export type RecoveryExercise = {
  name: string
  duration: string
  primaryCue: string
  extraCues: string[]
}

export function getPreferredCardioMachine(cardioPreference?: string | null) {
  if (!cardioPreference) return 'Incline Walk'

  switch (cardioPreference) {
    case 'Elliptical':
      return 'Elliptical'
    case 'Bike':
      return 'Bike'
    case 'Treadmill':
      return 'Treadmill'
    case 'Curve treadmill':
      return 'Curve treadmill'
    default:
      return 'Incline Walk'
  }
}

export function detectBasketballLoad(params: {
  minutes?: number | null
  activeCalories?: number | null
  avgHr?: number | null
}): BasketballDetectedLoad {
  const minutes = params.minutes ?? 0
  const activeCalories = params.activeCalories ?? 0
  const avgHr = params.avgHr ?? 0

  if (
    minutes >= 90 ||
    activeCalories >= 800 ||
    (avgHr >= 130 && minutes >= 60)
  ) {
    return 'high'
  }

  if (
    minutes >= 45 ||
    activeCalories >= 400 ||
    avgHr >= 115
  ) {
    return 'medium'
  }

  return 'low'
}

export function getFridayOutputType(params: {
  basketballStatus?: string | null
  basketballTiming?: string | null
  basketballImpact?: string | null
  fridaySleepQuality?: string | null
  basketballMinutes?: number | null
  basketballActiveCalories?: number | null
  basketballAvgHr?: number | null
}): FridayOutputType {
  const {
    basketballStatus,
    basketballTiming,
    basketballImpact,
    fridaySleepQuality,
    basketballMinutes,
    basketballActiveCalories,
    basketballAvgHr,
  } = params

  if (basketballStatus !== 'yes') {
    return 'regular'
  }

  if (basketballImpact === 'pain_issue') {
    return 'full_rest'
  }

  const detectedLoad = detectBasketballLoad({
    minutes: basketballMinutes,
    activeCalories: basketballActiveCalories,
    avgHr: basketballAvgHr,
  })

  if (basketballTiming === 'late') {
    if (fridaySleepQuality === 'exhausted') return 'walk_only'
    return 'home_anti_office'
  }

  if (detectedLoad === 'high') {
    return fridaySleepQuality === 'exhausted' ? 'walk_only' : 'home_anti_office'
  }

  if (detectedLoad === 'medium') {
    if (fridaySleepQuality === 'well_rested') return 'gym_anti_office'
    if (fridaySleepQuality === 'a_little_tired') return 'home_anti_office'
    return 'walk_only'
  }

  if (detectedLoad === 'low') {
    if (fridaySleepQuality === 'well_rested') return 'regular'
    if (fridaySleepQuality === 'a_little_tired') return 'gym_anti_office'
    return 'home_anti_office'
  }

  return 'regular'
}

export function getFridayOutputLabel(output: FridayOutputType) {
  switch (output) {
    case 'regular':
      return 'Regular Friday Template'
    case 'gym_anti_office':
      return 'Gym Anti-Office Flow'
    case 'home_anti_office':
      return 'Home Anti-Office Flow'
    case 'walk_only':
      return 'Walk Only Recovery'
    case 'full_rest':
      return 'Full Rest'
    default:
      return 'Friday Plan'
  }
}

export function getFridayOutputWhy(output: FridayOutputType) {
  switch (output) {
    case 'regular':
      return 'You have enough recovery budget for the standard Friday session.'
    case 'gym_anti_office':
      return 'Friday should emphasize mobility, structural integrity, and an easy flush instead of another hard lower-body session.'
    case 'home_anti_office':
      return 'A lower-friction home recovery session is the smartest move based on your basketball load, timing, or sleep.'
    case 'walk_only':
      return 'Recovery is the priority today. A low-stress walk will help more than forcing another session.'
    case 'full_rest':
      return 'Pain or injury concern overrides training today. Rest is the correct call.'
    default:
      return ''
  }
}

export function getHomeAntiOfficeExercises(): RecoveryExercise[] {
  return [
    {
      name: '90/90 Hip Switches',
      duration: '2 min',
      primaryCue: 'Spine tall.',
      extraCues: [
        'Lead with the knee during the switch.',
        'Keep your sit-bones grounded as long as possible.',
        'If your lower back rounds, slow down and sit taller.',
      ],
    },
    {
      name: 'Couch Stretch',
      duration: '2 min each side',
      primaryCue: 'Squeeze the glute of the down leg.',
      extraCues: [
        'Keep your ribs down and core braced.',
        'Think tall kneeling, not leaning back.',
        'If you feel low back instead of hip, tuck your tailbone more.',
      ],
    },
    {
      name: 'Child’s Pose with Side Reach',
      duration: '2 min total',
      primaryCue: 'Keep hips to heels.',
      extraCues: [
        'Breathe into the side ribs.',
        'Actively crawl your fingers farther away.',
        'If hips lift, shorten the reach and breathe deeper.',
      ],
    },
    {
      name: 'Bird-Dogs',
      duration: '2 sets each side',
      primaryCue: 'Keep a glass of water on your lower back.',
      extraCues: [
        'Kick the heel back, not up.',
        'Reach the opposite fist long in front.',
        'If your hips rotate, shorten the range.',
      ],
    },
    {
      name: 'Glute Bridges',
      duration: '2–3 sets of 12–15',
      primaryCue: 'Drive through your heels.',
      extraCues: [
        'Flatten your lower back before you lift.',
        'Hold 2 seconds at the top.',
        'If hamstrings dominate, bring heels a little closer.',
      ],
    },
    {
      name: 'Box Breathing',
      duration: '4–5 min',
      primaryCue: 'Inhale 4, hold 4, exhale 4, hold 4.',
      extraCues: [
        'Keep shoulders relaxed.',
        'Breathe through the nose if possible.',
        'Use this to bring your system down.',
      ],
    },
  ]
}

export function getGymAntiOfficeExercises(): RecoveryExercise[] {
  return [
    {
      name: '90/90 Hip Switches',
      duration: '2 min',
      primaryCue: 'Spine tall.',
      extraCues: [
        'Lead with the knee.',
        'Stay grounded through the sit-bones.',
        'Slow down if you lose position.',
      ],
    },
    {
      name: 'Couch Stretch',
      duration: '2 min each side',
      primaryCue: 'Squeeze the glute of the down leg.',
      extraCues: [
        'Ribs down.',
        'Stay tall, do not arch.',
        'Tuck the tailbone if you feel low-back strain.',
      ],
    },
    {
      name: 'Child’s Pose with Side Reach',
      duration: '2 min total',
      primaryCue: 'Hips to heels.',
      extraCues: [
        'Breathe into the ribs.',
        'Actively reach long.',
        'Do not let the hips drift upward.',
      ],
    },
    {
      name: 'Dead Hangs',
      duration: '2 sets of 20–30 sec',
      primaryCue: 'Let the ribs and lats lengthen.',
      extraCues: [
        'Stay relaxed through the jaw and neck.',
        'Do not force through pain.',
        'Use a step for a controlled entry and exit.',
      ],
    },
    {
      name: 'Face Pulls (Light)',
      duration: '2–3 sets of 12–15',
      primaryCue: 'Squeeze the upper back, not the lower back.',
      extraCues: [
        'Keep ribs down.',
        'Pull to eye level.',
        'Treat this as posture work, not hypertrophy.',
      ],
    },
    {
      name: 'Goblet Squat Hold',
      duration: '2 sets of 20–30 sec',
      primaryCue: 'Sit into the hips and breathe.',
      extraCues: [
        'Keep heels grounded.',
        'Use the hold to open the hips, not grind the legs.',
        'Shorten the hold if knees feel cranky.',
      ],
    },
    {
      name: 'Band Pull-Aparts',
      duration: '2 sets of 15–20',
      primaryCue: 'Move from the shoulder blades.',
      extraCues: [
        'Keep shoulders down.',
        'Stay long through the neck.',
        'Do not shrug as the band opens.',
      ],
    },
  ]
}

export function getFridayWorkoutFromOutput(
  output: FridayOutputType,
  cardioPreference?: string | null
): WorkoutDefinition {
  const preferredCardio = getPreferredCardioMachine(cardioPreference)

  switch (output) {
    case 'gym_anti_office':
      return {
        dayName: 'Friday',
        focus: 'Anti-Office / Structural Integrity',
        estimatedMinutes: '40–45 min total',
        warmup: 'Dynamic mobility + decompression',
        exercises: [
          '90/90 Hip Switches',
          'Couch Stretch',
          'Child’s Pose with Side Reach',
          'Dead Hangs',
          'Face Pulls (Light)',
          'Goblet Squat Hold',
          'Band Pull-Aparts',
        ],
        cardio: `${preferredCardio} – 20 min zone 2 flush`,
        restDay: false,
      }

    case 'home_anti_office':
      return {
        dayName: 'Friday',
        focus: 'Home Anti-Office Recovery',
        estimatedMinutes: '22–25 min total',
        warmup: 'No gym commute. Start with mobility on the floor.',
        exercises: [
          '90/90 Hip Switches',
          'Couch Stretch',
          'Child’s Pose with Side Reach',
          'Bird-Dogs',
          'Glute Bridges',
          'Box Breathing',
        ],
        cardio: 'Optional 15–20 min outside walk after the flow',
        restDay: false,
      }

    case 'walk_only':
      return {
        dayName: 'Friday',
        focus: 'Walk Only Recovery',
        estimatedMinutes: '20–30 min total',
        warmup: 'Easy start. Keep effort low.',
        exercises: ['Optional easy mobility', 'Outside Walk'],
        cardio: '20–30 min easy walk only',
        restDay: false,
      }

    case 'full_rest':
      return {
        dayName: 'Friday',
        focus: 'Full Rest / Recovery Priority',
        estimatedMinutes: '0 min required',
        warmup: 'No formal training today.',
        exercises: [
          'Hydration',
          'Extra sleep if possible',
          'Very gentle mobility only if it feels good',
        ],
        cardio: 'No formal cardio required',
        restDay: true,
      }

    case 'regular':
    default:
      return {
        dayName: 'Friday',
        focus: 'Lower / Conditioning',
        estimatedMinutes: '50–60 min planned',
        warmup: '5 min treadmill + lower body mobility',
        exercises: [
          'Hack Squat',
          'Seated Hamstring Curl',
          'Adductor Machine',
          'Abductor Machine',
          'Rotary Calf',
          'Ab Machine',
        ],
        cardio: `${preferredCardio} – 15 min`,
        restDay: false,
      }
  }
}