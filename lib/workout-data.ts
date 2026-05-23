export type WorkoutDefinition = {
  dayName: string
  focus: string
  estimatedMinutes: string
  warmup: string
  exercises: string[]
  cardio: string
  restDay: boolean
}

export type ExerciseTarget = {
  sets: number
  reps: string
}

export function getWorkoutForDay(day: number): WorkoutDefinition {
  switch (day) {
    case 0:
      return {
        dayName: 'Sunday',
        focus: 'Recovery / Mobility',
        estimatedMinutes: '20–30 min optional',
        warmup: 'Easy walk + mobility',
        exercises: [
          'Mobility Flow',
          'Hip Mobility',
          'Thoracic Rotation',
          'Hamstring Stretch',
          'Shoulder Mobility',
        ],
        cardio: 'Optional easy walk',
        restDay: true,
      }

    case 1:
      return {
        dayName: 'Monday',
        focus: 'Chest / Biceps / Posture',
        estimatedMinutes: '70 min planned',
        warmup: '5 min treadmill + band pull-aparts (2×15)',
        exercises: [
          'Flat Chest Press Machine',
          'Incline Chest Press Machine',
          'Cable Curl',
          'Hammer Curl',
          'Face Pull',
          'Dead-Bug',
        ],
        cardio: 'Curve treadmill – 12 min',
        restDay: false,
      }

    case 2:
      return {
        dayName: 'Tuesday',
        focus: 'Back / Rear Delts / Posture',
        estimatedMinutes: '75 min planned',
        warmup: '5 min treadmill + band pull-aparts (2×15)',
        exercises: [
          'Vertical Traction Machine',
          'Seated Row Machine',
          'Straight Arm Pulldown',
          'Rear Delt Machine',
          'Face Pull',
          'Weighted Cable Crunch',
        ],
        cardio: 'Curve treadmill – 12 min',
        restDay: false,
      }

    case 3:
      return {
        dayName: 'Wednesday',
        focus: 'Legs / Posterior Chain / Core',
        estimatedMinutes: '75 min planned',
        warmup: '5 min treadmill + lower body mobility',
        exercises: [
          'Seated Hamstring Curl',
          'Leg Press (45° Plate Loaded)',
          'Glute Bridge or Hip Thrust',
          'Leg Extension',
          'Ab Wheel or Dead-Bug',
          'Rotary Calf',
        ],
        cardio: 'Curve treadmill – 12 min',
        restDay: false,
      }

    case 4:
      return {
        dayName: 'Thursday',
        focus: 'Triceps / Shoulders (Corrective) / Core',
        estimatedMinutes: '65 min planned',
        warmup: '5 min treadmill + upper mobility + band pull-aparts',
        exercises: [
          'Triceps Pressdown',
          'Overhead Triceps Extension',
          'Cable Lateral Raise',
          'Rear Delt Machine',
          'Face Pull',
          "Captain's Chair Leg Raise",
        ],
        cardio: 'Optional depending on PT schedule',
        restDay: false,
      }

    case 5:
      return {
        dayName: 'Friday',
        focus: 'Legs / Arms / Conditioning',
        estimatedMinutes: '60–70 min planned',
        warmup: '5 min treadmill + lower body mobility',
        exercises: [
          'Hack Squat',
          'Seated Hamstring Curl',
          'Adductor Machine',
          'Abductor Machine',
          'Cable Curl',
          'Ab Machine',
        ],
        cardio: 'Curve treadmill – 15 min',
        restDay: false,
      }

    case 6:
      return {
        dayName: 'Saturday',
        focus: 'Optional Recovery / Mobility',
        estimatedMinutes: 'Optional',
        warmup: 'Easy walk + mobility',
        exercises: ['Mobility', 'Stretching', 'Light core', 'Recovery walk'],
        cardio: 'Optional light cardio',
        restDay: true,
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
  return [1, 2, 3, 4, 5].map((day) => ({
    day,
    workout: getWorkoutForDay(day),
  }))
}

export function getTargetForExercise(exerciseName: string): ExerciseTarget {
  const name = exerciseName.toLowerCase()

  // exact match for unilateral cue
  if (name === 'dead-bug') {
    return { sets: 3, reps: '8/side' }
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

  if (name.includes('incline chest press machine')) {
    return 'light load right side if needed'
  }

  if (name.includes('seated row machine')) {
    return 'squeeze scapulas at finish'
  }

  if (name.includes('cable lateral raise')) {
    return 'strict form, right side conservative'
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

export function getExerciseSubstitutions(exerciseName: string): string[] {
  const name = exerciseName.toLowerCase()

  if (name.includes('incline chest press machine')) {
    return ['Flat Chest Press Machine', 'Cable Chest Press', 'Pec Deck Fly']
  }

  if (name.includes('flat chest press machine')) {
    return ['Incline Chest Press Machine', 'Cable Chest Press', 'Pec Deck Fly']
  }

  if (name.includes('cable lateral raise')) {
    return ['Lateral Raise Machine', 'Rear Delt Machine', 'Face Pull']
  }

  if (name.includes('rear delt machine')) {
    return ['Face Pull', 'Cable Lateral Raise', 'Reverse Pec Deck']
  }

  if (name.includes('pec deck fly')) {
    return ['Cable Fly', 'Flat Chest Press Machine', 'Cable Chest Press']
  }

  if (name.includes('triceps pressdown')) {
    return ['Overhead Rope Extension', 'Assisted Dip', 'Cable Chest Press']
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
    'Hip Thrust Machine': ['Hip Thrust Machine', 'Glute Bridge Machine'],
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