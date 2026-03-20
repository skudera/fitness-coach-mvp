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
        focus: 'Chest / Shoulders / Cardio',
        estimatedMinutes: '75 min planned',
        warmup: '5 min treadmill + shoulder mobility',
        exercises: [
          'Incline Chest Press Machine',
          'Flat Chest Press Machine',
          'Cable Lateral Raise',
          'Rear Delt Machine',
          'Pec Deck Fly',
          'Triceps Pressdown',
        ],
        cardio: 'Elliptical – 12 min',
        restDay: false,
      }

    case 2:
      return {
        dayName: 'Tuesday',
        focus: 'Back / Core / Cardio',
        estimatedMinutes: '75 min planned',
        warmup: '5 min treadmill + band work',
        exercises: [
          'Neutral Grip Lat Pulldown',
          'Seated Row Machine',
          'Straight Arm Pulldown',
          'Face Pull',
          'Cable Curl',
          'Cable Crunch',
        ],
        cardio: 'Bike – 12 min',
        restDay: false,
      }

    case 3:
      return {
        dayName: 'Wednesday',
        focus: 'Legs / Core / Cardio',
        estimatedMinutes: '75 min planned',
        warmup: '5 min treadmill + lower body mobility',
        exercises: [
          'Leg Press (45° Plate Loaded)',
          'Seated Hamstring Curl',
          'Leg Extension',
          'Rotary Calf',
          'Abductor Machine',
          'Ab Machine',
        ],
        cardio: 'Elliptical – 12 min',
        restDay: false,
      }

    case 4:
      return {
        dayName: 'Thursday',
        focus: 'Upper Mixed / Basketball',
        estimatedMinutes: '70 min planned',
        warmup: '5 min treadmill + upper mobility',
        exercises: [
          'Flat Chest Press Machine',
          'Neutral Grip Lat Pulldown',
          'Cable Lateral Raise',
          'Face Pull',
          'Cable Curl',
          'Triceps Pressdown',
        ],
        cardio: 'Cardio optional depending on basketball',
        restDay: false,
      }

    case 5:
      return {
        dayName: 'Friday',
        focus: 'Recovery / Conditioning',
        estimatedMinutes: '65–70 min planned',
        warmup: '5 min treadmill + mobility',
        exercises: [
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
        exercises: [
          'Mobility',
          'Stretching',
          'Light core',
          'Recovery walk',
        ],
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
    name.includes('press machine') ||
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
    name.includes('extension') ||
    name.includes('calf') ||
    name.includes('adductor') ||
    name.includes('abductor') ||
    name.includes('pressdown') ||
    name.includes('face pull')
  ) {
    return { sets: 3, reps: '10–15' }
  }

  if (
    name.includes('ab') ||
    name.includes('crunch') ||
    name.includes('mobility') ||
    name.includes('stretch') ||
    name.includes('plank')
  ) {
    return { sets: 3, reps: '12–15' }
  }

  return { sets: 3, reps: '8–12' }
}

export function getExerciseSubstitutions(exerciseName: string): string[] {
  const name = exerciseName.toLowerCase()

  if (name.includes('incline chest press machine')) {
    return ['Flat Chest Press Machine', 'Cable Chest Press', 'Assisted Dip']
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

  if (name.includes('neutral grip lat pulldown')) {
    return ['Assisted Pullup', 'Hammer Iso Row', 'Straight Arm Pulldown']
  }

  if (name.includes('seated row machine')) {
    return ['Hammer Iso Row', 'Chest Supported Row', 'Cable Row']
  }

  if (name.includes('straight arm pulldown')) {
    return ['Face Pull', 'Cable Row', 'Neutral Grip Lat Pulldown']
  }

  if (name.includes('face pull')) {
    return ['Rear Delt Machine', 'Cable Lateral Raise', 'Reverse Pec Deck']
  }

  if (name.includes('cable curl')) {
    return ['Hammer Curl', 'EZ Bar Curl', 'Preacher Curl Machine']
  }

  if (name.includes('cable crunch')) {
    return ['Ab Machine', 'Roman Chair Leg Raise', 'Plank']
  }

  if (name.includes('leg press (45')) {
    return ['Hack Squat', 'Seated Leg Press Machine', 'Smith Machine Squat']
  }

  if (name.includes('seated hamstring curl')) {
    return ['Hip Thrust Machine', 'Back Extension', 'Lying Leg Curl']
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
    return ['Cable Crunch', 'Roman Chair Leg Raise', 'Plank']
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
    'Incline Chest Press Machine': ['Incline Chest Press Machine', 'Incline DB Press'],
    'Flat Chest Press Machine': ['Flat Chest Press Machine', 'Machine Chest Press'],
    'Pec Deck Fly': ['Pec Deck Fly', 'Cable Fly', 'Pec Deck'],
    'Cable Fly': ['Cable Fly', 'Pec Deck Fly'],
    'Cable Chest Press': ['Cable Chest Press', 'Machine Chest Press'],
    'Triceps Pressdown': ['Triceps Pressdown', 'Triceps Pressdown Station'],
    'Overhead Rope Extension': ['Overhead Rope Extension'],
    'Assisted Dip': ['Assisted Dip', 'Machine Dip'],

    'Neutral Grip Lat Pulldown': ['Neutral Grip Lat Pulldown', 'Lat Pulldown'],
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
    'Back Extension': ['Back Extension', 'Hyperextension'],

    'Ab Machine': ['Ab Machine'],
    'Cable Crunch': ['Cable Crunch'],
    'Roman Chair Leg Raise': ['Roman Chair Leg Raise', "Captain's Chair"],
    'Plank': ['Plank'],
    'Cable Curl': ['Cable Curl'],
  }

  return map[exerciseName] ?? [exerciseName]
}