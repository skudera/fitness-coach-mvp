export type RunPlan = {
  /** Total planned minutes, including warm-up and cool-down walks. */
  totalMinutes: number
  warmupWalkMinutes: number
  /** Repeating jog/walk rounds. Set walkMinutes to 0 for a continuous jog. */
  rounds: number
  jogMinutes: number
  walkMinutes: number
  cooldownWalkMinutes: number
  guidance: string
}

export type WorkoutDefinition = {
  dayName: string
  focus: string
  estimatedMinutes: string
  warmup: string
  exercises: string[]
  cardio: string
  restDay: boolean
  /** Defaults to 'lift'. Run days are logged on /workout/run, not the set logger. */
  kind?: 'lift' | 'run'
  run?: RunPlan
  /** Short stretch/mobility block done at the end of the session. */
  mobility?: string
  /** Per-day set/rep targets that override the exercise defaults. */
  targets?: Record<string, ExerciseTarget>
}

export type ExerciseTarget = {
  sets: number
  reps: string
  /** No external load — the logger hides the weight field. */
  bodyweight?: boolean
}

export function getWorkoutForDay(day: number): WorkoutDefinition {
  switch (day) {
    case 0:
      return {
        dayName: 'Sunday',
        focus: 'Lower Body / Glutes / Core',
        estimatedMinutes: '60 min planned',
        warmup: '5 min easy walk + hip mobility',
        exercises: [
          'Leg Press (45° Plate Loaded)',
          'Seated Hamstring Curl',
          'Hip Thrust Machine',
          'Leg Extension',
          'Abductor Machine',
          'Adductor Machine',
          'Rotary Calf',
          'Dead-Bug',
        ],
        targets: {
          'Leg Press (45° Plate Loaded)': { sets: 3, reps: '8–12' },
          'Seated Hamstring Curl': { sets: 3, reps: '10–12' },
          'Hip Thrust Machine': { sets: 3, reps: '10–15' },
          'Leg Extension': { sets: 2, reps: '10–12' },
          'Abductor Machine': { sets: 2, reps: '12–15' },
          'Adductor Machine': { sets: 2, reps: '12–15' },
          'Rotary Calf': { sets: 3, reps: '12–15' },
          'Dead-Bug': { sets: 3, reps: '8/side', bodyweight: true },
        },
        cardio: 'Optional easy walk – 10 min',
        mobility: '90/90 hip rotations, adductor rock-backs, hip-flexor stretch, figure-4',
        restDay: false,
      }

    case 1:
      return {
        dayName: 'Monday',
        focus: 'Chest / Triceps / Shoulders',
        estimatedMinutes: '60 min planned',
        warmup: '5 min easy walk + band pull-aparts (2×15)',
        exercises: [
          'Incline Chest Press Machine',
          'Flat Chest Press Machine',
          'Cable Fly',
          'Triceps Pressdown',
          'Cable Lateral Raise',
          'Face Pull',
          'Serratus Wall Slides',
          'Wall Push-Up Plus',
        ],
        targets: {
          'Incline Chest Press Machine': { sets: 3, reps: '8–12' },
          'Flat Chest Press Machine': { sets: 3, reps: '8–12' },
          'Cable Fly': { sets: 2, reps: '12–15' },
          'Triceps Pressdown': { sets: 3, reps: '10–12' },
          'Cable Lateral Raise': { sets: 2, reps: '12–15' },
          'Face Pull': { sets: 2, reps: '15' },
          'Serratus Wall Slides': { sets: 2, reps: '10', bodyweight: true },
          'Wall Push-Up Plus': { sets: 2, reps: '12', bodyweight: true },
        },
        cardio: 'Optional easy walk – 10 min',
        mobility: 'Gentle pec stretch, lat stretch, thoracic extension',
        restDay: false,
      }

    case 2:
      return {
        dayName: 'Tuesday',
        focus: 'Back / Biceps / Posture',
        estimatedMinutes: '60 min planned',
        warmup: '5 min easy walk + band pull-aparts (2×15)',
        exercises: [
          'Vertical Traction Machine',
          'Seated Row Machine',
          'Single-Arm Cable Row',
          'Straight Arm Pulldown',
          'Cable Curl',
          'Hammer Curl',
          'Face Pull',
          'Cable Pallof Press',
        ],
        targets: {
          'Vertical Traction Machine': { sets: 3, reps: '8–12' },
          'Seated Row Machine': { sets: 3, reps: '8–12' },
          'Single-Arm Cable Row': { sets: 2, reps: '10–12/side' },
          'Straight Arm Pulldown': { sets: 2, reps: '10–12' },
          'Cable Curl': { sets: 3, reps: '10–12' },
          'Hammer Curl': { sets: 2, reps: '10–12' },
          'Face Pull': { sets: 2, reps: '15' },
          'Cable Pallof Press': { sets: 2, reps: '10/side' },
        },
        cardio: 'Optional easy walk – 10 min',
        mobility: 'Thoracic extension, gentle lat and pec stretches',
        restDay: false,
      }

    case 3:
      return {
        dayName: 'Wednesday',
        focus: 'Aerobic Run (Outdoor)',
        estimatedMinutes: '43 min run + 5–10 min mobility',
        warmup: '8 min brisk walk',
        exercises: [],
        cardio: 'Easy run/walk intervals – outdoors',
        kind: 'run',
        run: {
          totalMinutes: 43,
          warmupWalkMinutes: 8,
          rounds: 3,
          jogMinutes: 9,
          walkMinutes: 1,
          cooldownWalkMinutes: 5,
          guidance:
            'Easy conversational pace, not race pace. If recovery is poor, walk the whole session instead.',
        },
        mobility: 'Hip-flexor stretch, figure-4, calf stretch, cat-cow',
        restDay: false,
      }

    case 4:
      return {
        dayName: 'Thursday',
        focus: 'Upper Body / Athletic Taper',
        estimatedMinutes: '60 min planned',
        warmup: '5 min easy walk + upper mobility + band pull-aparts',
        exercises: [
          'Incline Chest Press Machine',
          'Flat Chest Press Machine',
          'Vertical Traction Machine',
          'Chest Supported Row',
          'Cable Lateral Raise',
          'Triceps Pressdown',
          'Supported Y Raise',
          'Serratus Wall Slides',
          'Wall Push-Up Plus',
        ],
        targets: {
          'Incline Chest Press Machine': { sets: 3, reps: '10–12' },
          'Flat Chest Press Machine': { sets: 2, reps: '10–12' },
          'Vertical Traction Machine': { sets: 3, reps: '10–12' },
          'Chest Supported Row': { sets: 2, reps: '10–12' },
          'Cable Lateral Raise': { sets: 2, reps: '12–15' },
          'Triceps Pressdown': { sets: 2, reps: '12–15' },
          'Supported Y Raise': { sets: 2, reps: '8–10' },
          'Serratus Wall Slides': { sets: 2, reps: '10', bodyweight: true },
          'Wall Push-Up Plus': { sets: 2, reps: '12', bodyweight: true },
        },
        cardio: 'Optional easy walk – 10 min',
        mobility: 'Pec stretch, lat stretch, thoracic extension',
        restDay: false,
      }

    case 5:
      return {
        dayName: 'Friday',
        focus: 'Glutes / Core / Mobility',
        estimatedMinutes: '45 min planned',
        warmup: '5–10 min easy bike or treadmill',
        exercises: [
          'Hip Thrust Machine',
          'Seated Hamstring Curl',
          'Cable Glute Kickback',
          'Cable Pallof Press',
          'Dead-Bug',
          'Bird Dog',
        ],
        targets: {
          'Hip Thrust Machine': { sets: 2, reps: '12–15' },
          'Seated Hamstring Curl': { sets: 2, reps: '10–12' },
          'Cable Glute Kickback': { sets: 2, reps: '10–12/side' },
          'Cable Pallof Press': { sets: 3, reps: '10/side' },
          'Dead-Bug': { sets: 3, reps: '8/side', bodyweight: true },
          'Bird Dog': { sets: 2, reps: '8/side', bodyweight: true },
        },
        cardio: 'None planned – keep today light for Saturday’s run',
        mobility: 'Cat-cow, thread-the-needle, 90/90 hips, adductor rock-backs, hip-flexor, figure-4, gentle calf stretch, thoracic extension',
        restDay: false,
      }

    case 6:
      return {
        dayName: 'Saturday',
        focus: 'Endurance Run (Outdoor)',
        estimatedMinutes: '53 min run + 5–10 min mobility',
        warmup: '8 min brisk walk',
        exercises: [],
        cardio: 'Easy run/walk intervals – outdoors',
        kind: 'run',
        run: {
          totalMinutes: 53,
          warmupWalkMinutes: 8,
          rounds: 4,
          jogMinutes: 9,
          walkMinutes: 1,
          cooldownWalkMinutes: 5,
          guidance:
            'Relaxed endurance effort. Do not add speed and time together. If recovery is poor, walk the whole session instead.',
        },
        mobility: 'Hip-flexor stretch, figure-4, calf stretch, cat-cow',
        restDay: false,
      }

    default:
      return {
        dayName: 'Today',
        focus: 'Workout',
        estimatedMinutes: '',
        warmup: '',
        exercises: [],
        cardio: '',
        restDay: false,
      }
  }
}

export function getWorkoutForToday(): WorkoutDefinition {
  return getWorkoutForDay(new Date().getDay())
}

export function getWeekPlan() {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    workout: getWorkoutForDay(day),
  }))
}

export function getTargetForExercise(
  exerciseName: string,
  workout?: WorkoutDefinition
): ExerciseTarget {
  return workout?.targets?.[exerciseName] ?? getDefaultTarget(exerciseName)
}

function getDefaultTarget(exerciseName: string): ExerciseTarget {
  const name = exerciseName.toLowerCase()

  // exact match for unilateral cue
  if (name === 'dead-bug') {
    return { sets: 3, reps: '8/side', bodyweight: true }
  }

  if (name === 'bird dog') {
    return { sets: 2, reps: '8/side', bodyweight: true }
  }

  if (name.includes('supported y raise')) {
    return { sets: 2, reps: '8–10' }
  }

  if (name.includes('wall push-up plus')) {
    return { sets: 2, reps: '12', bodyweight: true }
  }

  if (name.includes('serratus wall slide')) {
    return { sets: 2, reps: '10', bodyweight: true }
  }

  if (name.includes('i-y-t')) {
    return { sets: 2, reps: '8–10 each' }
  }

  if (name.includes('pallof')) {
    return { sets: 3, reps: '10/side' }
  }

  if (name.includes('glute kickback')) {
    return { sets: 2, reps: '10–12/side' }
  }

  if (name.includes('single-arm cable row')) {
    return { sets: 3, reps: '10–12/side' }
  }

  if (name.includes('shoulder press machine')) {
    return { sets: 2, reps: '10' }
  }

  if (name.includes('cable fly') || name.includes('pec deck')) {
    return { sets: 3, reps: '12–15' }
  }

  // 3×8–10
  if (name.includes('ab wheel')) {
    return { sets: 3, reps: '8–10' }
  }

  // 3×15–20
  if (name.includes('face pull') || name.includes('rear delt')) {
    return { sets: 3, reps: '15–20' }
  }

  // 3×12–15
  if (
    name.includes('weighted cable crunch') ||
    name.includes('glute bridge') ||
    name.includes('hip thrust') ||
    name.includes('lateral raise') ||
    name.includes('adductor') ||
    name.includes('abductor') ||
    name.includes('ab machine') ||
    name.includes("captain's chair")
  ) {
    return { sets: 3, reps: '12–15' }
  }

  // 3×10–12
  if (
    name.includes('curl') ||
    name.includes('pressdown') ||
    name.includes('overhead triceps') ||
    name.includes('straight arm pulldown') ||
    name.includes('hamstring curl') ||
    name.includes('leg extension') ||
    name.includes('calf')
  ) {
    return { sets: 3, reps: '10–12' }
  }

  // 3×8–12
  if (
    name.includes('chest press machine') ||
    name.includes('vertical traction machine') ||
    name.includes('pulldown') ||
    name.includes('row') ||
    name.includes('leg press') ||
    name.includes('hack squat')
  ) {
    return { sets: 3, reps: '8–12' }
  }

  return { sets: 3, reps: '8–12' }
}

export function getExerciseCue(exerciseName: string): string | null {
  const name = exerciseName.toLowerCase()

  if (
    name.includes('flat chest press machine') ||
    name.includes('vertical traction machine') ||
    name.includes('leg press (45')
  ) {
    return '3-sec eccentric'
  }

  if (name.includes('supported y raise')) {
    return 'only if pain-free; light, chest supported'
  }

  if (name === 'bird dog') {
    return 'slow, hips level, longer holds'
  }

  if (name.includes('straight arm pulldown')) {
    return 'only if shoulder tolerates it'
  }

  if (name.includes('incline chest press machine')) {
    return 'light load right side if needed'
  }

  if (name.includes('seated row machine')) {
    return 'squeeze scapulas at finish'
  }

  if (name.includes('cable lateral raise')) {
    return 'only if tolerated; strict form, right side conservative'
  }

  if (name.includes('face pull')) {
    return 'posture priority'
  }

  if (name.includes('rear delt')) {
    return 'high rep, posture focus'
  }

  if (name.includes('weighted cable crunch')) {
    return 'high-tension core'
  }

  if (name.includes('dead-bug')) {
    return 'anti-extension core'
  }

  if (name.includes('ab wheel')) {
    return 'APT correction'
  }

  if (name.includes('glute bridge') || name.includes('hip thrust')) {
    return 'glute activation'
  }

  if (name.includes('overhead triceps')) {
    return 'left arm bias or both light'
  }

  if (name.includes('wall push-up plus')) {
    return 'push the wall away at the top — serratus'
  }

  if (name.includes('serratus wall slide')) {
    return 'slow, ribs down, shoulder blade glides'
  }

  if (name.includes('i-y-t')) {
    return 'very light, slow, pain-free range only'
  }

  if (name.includes('shoulder press machine')) {
    return 'light reintroduction — stop short of any pinch'
  }

  if (name.includes('cable fly')) {
    return 'only if pain-free and PT-approved; light, comfortable range'
  }

  if (name.includes('pallof')) {
    return 'resist rotation, exhale on press'
  }

  if (name.includes('glute kickback')) {
    return 'squeeze at the top, no lower-back swing'
  }

  if (name.includes('single-arm cable row')) {
    return 'full stretch, squeeze scapula at finish'
  }

  if (name.includes("captain's chair")) {
    return 'controlled eccentric'
  }

  if (name.includes('seated hamstring curl')) {
    return 'posterior chain priority'
  }

  if (name.includes('hack squat')) {
    return 'form-first'
  }

  if (name.includes('ab machine')) {
    return 'high-tension core'
  }

  return null
}

/** Never offered: these have caused shoulder pain. History and aliases are kept. */
export const EXCLUDED_EXERCISES = ['Rear Delt Machine', 'Reverse Pec Deck']

/** Not in the default program; offered as substitutions only with PT clearance. */
export const PT_CLEARANCE_EXERCISES = [
  'Shoulder Press Machine',
  'Overhead Triceps Extension',
  'Overhead Rope Extension',
]

export function getExerciseSubstitutions(exerciseName: string): string[] {
  return getAllSubstitutions(exerciseName).filter(
    (option) => !EXCLUDED_EXERCISES.includes(option)
  )
}

function getAllSubstitutions(exerciseName: string): string[] {
  const name = exerciseName.toLowerCase()

  if (name.includes('incline chest press machine')) {
    return ['Flat Chest Press Machine', 'Cable Chest Press', 'Pec Deck Fly']
  }

  if (name.includes('flat chest press machine')) {
    return ['Incline Chest Press Machine', 'Cable Chest Press', 'Pec Deck Fly']
  }

  if (name.includes('chest supported row')) {
    return ['Seated Row Machine', 'Hammer Iso Row', 'Cable Row']
  }

  if (name.includes('supported y raise')) {
    return ['Face Pull', 'Serratus Wall Slides', 'Band Pull-Aparts']
  }

  if (name === 'bird dog') {
    return ['Dead-Bug', 'Cable Pallof Press', 'Plank']
  }

  if (name.includes('cable lateral raise')) {
    return ['Lateral Raise Machine', 'Face Pull', 'Shoulder Press Machine']
  }

  if (name.includes('rear delt machine')) {
    return ['Face Pull', 'Cable Lateral Raise', 'Reverse Pec Deck']
  }

  if (name.includes('pec deck fly')) {
    return ['Cable Fly', 'Flat Chest Press Machine', 'Cable Chest Press']
  }

  if (name.includes('triceps pressdown')) {
    return ['Overhead Triceps Extension', 'Overhead Rope Extension', 'Assisted Dip', 'Cable Chest Press']
  }

  if (name.includes('vertical traction machine')) {
    return ['Assisted Pullup', 'Hammer Iso Row', 'Straight Arm Pulldown']
  }

  if (name.includes('seated row machine')) {
    return ['Hammer Iso Row', 'Chest Supported Row', 'Cable Row']
  }

  if (name.includes('straight arm pulldown')) {
    return ['Face Pull', 'Cable Row', 'Vertical Traction Machine']
  }

  if (name.includes('face pull')) {
    return ['Rear Delt Machine', 'Cable Lateral Raise', 'Reverse Pec Deck']
  }

  if (name.includes('cable curl')) {
    return ['Hammer Curl', 'EZ Bar Curl', 'Preacher Curl Machine']
  }

  if (name.includes('hammer curl')) {
    return ['Cable Curl', 'EZ Bar Curl', 'Preacher Curl Machine']
  }

  if (name.includes('overhead triceps')) {
    return ['Triceps Pressdown', 'Overhead Rope Extension', 'Assisted Dip']
  }

  if (name.includes('shoulder press machine')) {
    return ['Cable Lateral Raise', 'Lateral Raise Machine', 'Face Pull']
  }

  if (name.includes('i-y-t')) {
    return ['Face Pull', 'Rear Delt Machine', 'Band Pull-Aparts']
  }

  if (name.includes('serratus wall slide')) {
    return ['Wall Push-Up Plus', 'Face Pull', 'Band Pull-Aparts']
  }

  if (name.includes('wall push-up plus')) {
    return ['Serratus Wall Slides', 'Cable Fly', 'Pec Deck Fly']
  }

  if (name.includes('cable fly')) {
    return ['Pec Deck Fly', 'Flat Chest Press Machine', 'Cable Chest Press']
  }

  if (name.includes('pallof')) {
    return ['Dead-Bug', 'Weighted Cable Crunch', 'Plank']
  }

  if (name.includes('glute kickback')) {
    return ['Abductor Machine', 'Hip Thrust Machine', 'Back Extension']
  }

  if (name.includes('single-arm cable row')) {
    return ['Seated Row Machine', 'Hammer Iso Row', 'Cable Row']
  }

  if (name.includes('hip thrust machine')) {
    return ['Glute Bridge', 'Back Extension', 'Seated Hamstring Curl']
  }

  if (name.includes('weighted cable crunch')) {
    return ['Ab Machine', "Captain's Chair Leg Raise", 'Plank']
  }

  if (name.includes('ab wheel or dead-bug')) {
    return ['Ab Machine', 'Weighted Cable Crunch', 'Plank']
  }

  if (name.includes('dead-bug')) {
    return ['Ab Machine', 'Weighted Cable Crunch', 'Plank']
  }

  if (name.includes('glute bridge or hip thrust')) {
    return ['Hip Thrust Machine', 'Back Extension', 'Seated Hamstring Curl']
  }

  if (name.includes("captain's chair")) {
    return ['Weighted Cable Crunch', 'Ab Machine', 'Plank']
  }

  if (name.includes('leg press (45')) {
    return ['Hack Squat', 'Seated Leg Press Machine', 'Smith Machine Squat']
  }

  if (name.includes('seated hamstring curl')) {
    return ['Hip Thrust Machine', 'Glute Bridge', 'Lying Leg Curl']
  }

  if (name.includes('glute bridge')) {
    return ['Hip Thrust Machine', 'Back Extension', 'Seated Hamstring Curl']
  }

  if (name.includes('leg extension')) {
    return ['Hack Squat', 'Leg Press (45° Plate Loaded)', 'Smith Machine Squat']
  }

  if (name.includes('rotary calf')) {
    return ['Leg Press (45° Plate Loaded)', 'Hack Squat', 'Seated Leg Press Machine']
  }

  if (name.includes('abductor machine')) {
    return ['Adductor Machine', 'Hip Thrust Machine', 'Back Extension']
  }

  if (name.includes('ab machine')) {
    return ['Weighted Cable Crunch', "Captain's Chair Leg Raise", 'Plank']
  }

  if (name.includes('hack squat')) {
    return ['Leg Press (45° Plate Loaded)', 'Seated Leg Press Machine', 'Smith Machine Squat']
  }

  if (name.includes('adductor machine')) {
    return ['Abductor Machine', 'Hip Thrust Machine', 'Back Extension']
  }

  return ['Machine Variation', 'Cable Variation', 'Bodyweight Alternative']
}

export function applyCardioPreference(
  cardioText: string,
  preference: string | null | undefined
): string {
  if (!preference) return cardioText

  const lower = cardioText.toLowerCase()
  if (lower.includes('optional') || lower.includes('depending') || lower.includes('skip')) {
    return cardioText
  }

  const match = cardioText.match(/(\d+)\s*min/)
  if (!match) return cardioText

  return `${preference} – ${match[1]} min`
}

export function getExerciseHistoryAliases(exerciseName: string): string[] {
  const map: Record<string, string[]> = {
    'Flat Chest Press Machine': ['Flat Chest Press Machine', 'Machine Chest Press'],
    'Incline Chest Press Machine': [
      'Incline Chest Press Machine',
      'Smith Machine Incline Chest Press',
      'Incline DB Press',
    ],
    'Pec Deck Fly': ['Pec Deck Fly', 'Cable Fly', 'Pec Deck'],
    'Cable Fly': ['Cable Fly', 'Pec Deck Fly'],
    'Cable Chest Press': ['Cable Chest Press', 'Machine Chest Press'],
    'Triceps Pressdown': ['Triceps Pressdown', 'Triceps Pressdown Station'],
    'Overhead Rope Extension': ['Overhead Rope Extension'],
    'Assisted Dip': ['Assisted Dip', 'Machine Dip'],

    'Vertical Traction Machine': [
      'Vertical Traction Machine',
      'Neutral Grip Lat Pulldown',
      'Lat Pulldown',
      'Vertical Traction',
    ],
    'Seated Row Machine': ['Seated Row Machine', 'Seated Row'],
    'Hammer Iso Row': ['Hammer Iso Row', 'Hammer Strength Row'],
    'Chest Supported Row': ['Chest Supported Row', 'Chest Supported Row Machine'],
    'Cable Row': ['Cable Row'],
    'Straight Arm Pulldown': ['Straight Arm Pulldown', 'Straight Arm Pulldown Setup'],
    'Face Pull': ['Face Pull'],
    'Assisted Pullup': ['Assisted Pullup', 'Assisted Pull-Up'],

    'Cable Lateral Raise': ['Cable Lateral Raise', 'DB Lateral Raise'],
    'Lateral Raise Machine': ['Lateral Raise Machine'],
    'Rear Delt Machine': ['Rear Delt Machine', 'Reverse Pec Deck'],
    'Shoulder Press Machine': ['Shoulder Press Machine'],
    'Supported Y Raise': ['Supported Y Raise'],
    'Bird Dog': ['Bird Dog', 'Bird-Dogs'],
    'I-Y-T Raises': ['I-Y-T Raises', 'IYT Raises', 'Prone I-Y-T'],
    'Serratus Wall Slides': ['Serratus Wall Slides', 'Wall Slides'],
    'Wall Push-Up Plus': ['Wall Push-Up Plus', 'Push-Up Plus'],
    'Cable Pallof Press': ['Cable Pallof Press', 'Pallof Press'],
    'Cable Glute Kickback': ['Cable Glute Kickback', 'Glute Kickback Machine', 'Glute Kickback'],
    'Single-Arm Cable Row': ['Single-Arm Cable Row', 'One-Arm Cable Row', 'Cable Row'],

    'Leg Press (45° Plate Loaded)': [
      'Leg Press (45° Plate Loaded)',
      'Leg Press',
      '45 Degree Leg Press',
      '45-Degree Leg Press',
    ],
    'Seated Leg Press Machine': ['Seated Leg Press Machine', 'Linear Leg Press'],
    'Hack Squat': ['Hack Squat', 'Hack Squat or Leg Press'],
    'Leg Extension': ['Leg Extension'],
    'Seated Hamstring Curl': ['Seated Hamstring Curl', 'Hamstring Curl'],
    'Rotary Calf': ['Rotary Calf', 'Seated Calf Raise', 'Calf Raise'],
    'Adductor Machine': ['Adductor Machine', 'Adductor / Abductor'],
    'Abductor Machine': ['Abductor Machine', 'Hip Abductor'],
    'Hip Thrust Machine': [
      'Hip Thrust Machine',
      'Glute Bridge Machine',
      'Glute Bridge or Hip Thrust',
      'Smith Machine Hip Thrust',
    ],
    'Glute Bridge': ['Glute Bridge', 'Hip Bridge', 'Glute Bridge Machine'],
    'Back Extension': ['Back Extension', 'Hyperextension'],

    'Ab Machine': ['Ab Machine'],
    'Cable Crunch': ['Cable Crunch', 'Weighted Cable Crunch'],
    'Weighted Cable Crunch': ['Weighted Cable Crunch', 'Cable Crunch'],
    'Dead-Bug': ['Dead-Bug', 'Dead Bug', 'Weighted Dead-Bug'],
    'Ab Wheel or Dead-Bug': ['Ab Wheel or Dead-Bug', 'Ab Wheel', 'Dead-Bug'],
    'Glute Bridge or Hip Thrust': [
      'Glute Bridge or Hip Thrust',
      'Glute Bridge',
      'Hip Bridge',
      'Hip Thrust Machine',
    ],
    'Overhead Triceps Extension': ['Overhead Triceps Extension', 'Overhead Rope Extension'],
    'Hammer Curl': ['Hammer Curl'],
    "Captain's Chair Leg Raise": [
      "Captain's Chair Leg Raise",
      'Roman Chair Leg Raise',
      "Captain's Chair",
    ],
    Plank: ['Plank'],
    'Cable Curl': ['Cable Curl'],
  }

  return map[exerciseName] ?? [exerciseName]
}