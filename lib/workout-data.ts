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
        focus: 'Chest / Shoulders / Biceps / Core / Cardio',
        estimatedMinutes: '75 min planned',
        warmup: '5 min treadmill + shoulder mobility',
        exercises: [
          'Smith Machine Incline Chest Press',
          'Flat Chest Press Machine',
          'Cable Lateral Raise',
          'Rear Delt Machine',
          'Cable Curl',
          'Weighted Dead-Bug',
        ],
        cardio: 'Elliptical – 12 min',
        restDay: false,
      }

    case 2:
      return {
        dayName: 'Tuesday',
        focus: 'Back / Triceps / Core / Cardio',
        estimatedMinutes: '75 min planned',
        warmup: '5 min treadmill + band work',
        exercises: [
          'Vertical Traction Machine',
          'Seated Row Machine',
          'Straight Arm Pulldown',
          'Face Pull',
          'Triceps Pressdown',
          'Weighted Cable Crunch',
        ],
        cardio: 'Bike – 12 min',
        restDay: false,
      }

    case 3:
      return {
        dayName: 'Wednesday',
        focus: 'Legs / Posterior Chain / Core / Cardio',
        estimatedMinutes: '75 min planned',
        warmup: '5 min treadmill + lower body mobility',
        exercises: [
          'Seated Hamstring Curl',
          'Leg Press (45° Plate Loaded)',
          'Glute Bridge',
          'Leg Extension',
          'Weighted Dead-Bug',
          'Rotary Calf',
        ],
        cardio: 'Elliptical – 12 min',
        restDay: false,
      }

    case 4:
      return {
        dayName: 'Thursday',
        focus: 'Upper Mixed / Core / Basketball',
        estimatedMinutes: '70 min planned',
        warmup: '5 min treadmill + upper mobility',
        exercises: [
          'Flat Chest Press Machine',
          'Vertical Traction Machine',
          'Cable Lateral Raise',
          'Face Pull',
          'Cable Curl',
          "Captain's Chair Leg Raise",
        ],
        cardio: 'Cardio optional depending on basketball',
        restDay: false,
      }

    case 5:
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
        cardio: 'Preferred cardio machine – 15 min',
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

  if (
    name.includes('smith machine incline chest press') ||
    name.includes('flat chest press machine') ||
    name.includes('vertical traction machine') ||
    name.includes('pulldown') ||
    name.includes('row') ||
    name.includes('leg press') ||
    name.includes('hack squat')
  ) {
    return { sets: 3, reps: '8–12' }
  }

  if (
    name.includes('lateral raise') ||
    name.includes('rear delt') ||
    name.includes('fly') ||
    name.includes('curl') ||
    name.includes('calf') ||
    name.includes('adductor') ||
    name.includes('abductor') ||
    name.includes('pressdown') ||
    name.includes('face pull') ||
    name.includes('hamstring curl') ||
    name.includes('leg extension')
  ) {
    return { sets: 3, reps: '8–12' }
  }

  if (
    name.includes('weighted cable crunch') ||
    name.includes('weighted dead-bug') ||
    name.includes("captain's chair")
  ) {
    return { sets: 3, reps: '8–12' }
  }

  if (
    name.includes('ab machine') ||
    name.includes('crunch') ||
    name.includes('mobility') ||
    name.includes('stretch') ||
    name.includes('plank') ||
    name.includes('bird-dog') ||
    name.includes('glute bridge') ||
    name.includes('dead hang') ||
    name.includes('child')
  ) {
    return { sets: 3, reps: '10–15' }
  }

  return { sets: 3, reps: '8–12' }
}

export function getExerciseCue(exerciseName: string): string | null {
  const name = exerciseName.toLowerCase()

  if (
    name.includes('smith machine incline chest press') ||
    name.includes('flat chest press machine') ||
    name.includes('vertical traction machine') ||
    name.includes('leg press (45')
  ) {
    return '3-sec eccentric'
  }

  if (name.includes('cable lateral raise')) {
    return 'Clean reps only'
  }

  if (name.includes('weighted cable crunch')) {
    return 'Brace hard, no momentum'
  }

  if (name.includes('weighted dead-bug')) {
    return 'Slow control, ribs down'
  }

  if (name.includes("captain's chair")) {
    return 'Controlled eccentric'
  }

  if (name.includes('glute bridge')) {
    return 'Pause and squeeze at top'
  }

  if (name.includes('seated hamstring curl')) {
    return 'Control the lowering phase'
  }

  return null
}

export function getExerciseSubstitutions(exerciseName: string): string[] {
  const name = exerciseName.toLowerCase()

  if (name.includes('smith machine incline chest press')) {
    return ['Flat Chest Press Machine', 'Cable Chest Press', 'Assisted Dip']
  }

  if (name.includes('flat chest press machine')) {
    return ['Smith Machine Incline Chest Press', 'Cable Chest Press', 'Pec Deck Fly']
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

  if (name.includes('weighted cable crunch')) {
    return ['Ab Machine', "Captain's Chair Leg Raise", 'Plank']
  }

  if (name.includes('weighted dead-bug')) {
    return ['Ab Machine', 'Weighted Cable Crunch', 'Plank']
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

export function getExerciseHistoryAliases(exerciseName: string): string[] {
  const map: Record<string, string[]> = {
    'Smith Machine Incline Chest Press': [
      'Smith Machine Incline Chest Press',
      'Incline Chest Press Machine',
      'Incline DB Press',
      'Smith Incline Press',
    ],
    'Flat Chest Press Machine': ['Flat Chest Press Machine', 'Machine Chest Press'],
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
    'Weighted Dead-Bug': ['Weighted Dead-Bug', 'Dead-Bug', 'Dead Bug'],
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