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
          'Light mobility flow',
          'Hip mobility',
          'Thoracic rotation',
          'Hamstring stretch',
          'Shoulder mobility',
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
          'Incline DB Press',
          'Machine Chest Press',
          'Cable Lateral Raise',
          'Rear Delt Machine',
          'Cable Fly',
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
          'Lat Pulldown',
          'Seated Row',
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
          'Leg Press',
          'Seated Hamstring Curl',
          'Leg Extension',
          'Calf Raise',
          'Hip Abductor',
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
          'Machine Chest Press',
          'Lat Pulldown',
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
        focus: 'Lower / Recovery Conditioning',
        estimatedMinutes: '75 min planned',
        warmup: '5 min treadmill + mobility',
        exercises: [
          'Hack Squat or Leg Press',
          'Hamstring Curl',
          'Adductor Machine',
          'Abductor Machine',
          'Calf Raise',
          'Cable Crunch',
        ],
        cardio: 'Treadmill incline walk – 12 min',
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
    name.includes('press') ||
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
    name.includes('stretch')
  ) {
    return { sets: 3, reps: '12–15' }
  }

  return { sets: 3, reps: '8–12' }
}

export function getExerciseSubstitutions(exerciseName: string): string[] {
  const name = exerciseName.toLowerCase()

  if (name.includes('incline db press')) {
    return ['Machine Chest Press', 'Cable Chest Press', 'Incline Push-Up']
  }

  if (name.includes('machine chest press')) {
    return ['Cable Chest Press', 'Incline DB Press', 'Push-Up']
  }

  if (name.includes('cable lateral raise')) {
    return ['Machine Lateral Raise', 'Rear Delt Machine', 'Face Pull']
  }

  if (name.includes('rear delt')) {
    return ['Face Pull', 'Cable Lateral Raise', 'Reverse Pec Deck']
  }

  if (name.includes('cable fly')) {
    return ['Pec Deck', 'Machine Chest Press', 'Push-Up']
  }

  if (name.includes('triceps pressdown')) {
    return ['Overhead Rope Extension', 'Machine Dip', 'Close-Grip Push-Up']
  }

  if (name.includes('lat pulldown')) {
    return ['Neutral-Grip Pulldown', 'High Row Machine', 'Assisted Pull-Up']
  }

  if (name.includes('seated row')) {
    return ['Chest Supported Row', 'Cable Row', 'Hammer Strength Row']
  }

  if (name.includes('straight arm pulldown')) {
    return ['Cable Row', 'Lat Prayer Pulldown', 'Face Pull']
  }

  if (name.includes('face pull')) {
    return ['Rear Delt Machine', 'Cable Lateral Raise', 'Reverse Pec Deck']
  }

  if (name.includes('cable curl')) {
    return ['Hammer Curl', 'EZ Bar Curl', 'Preacher Curl Machine']
  }

  if (name.includes('cable crunch')) {
    return ['Ab Machine', 'Decline Crunch', 'Plank']
  }

  if (name.includes('leg press')) {
    return ['Hack Squat', 'Smith Squat', 'Goblet Squat']
  }

  if (name.includes('hamstring curl')) {
    return ['Lying Leg Curl', 'Nordic Curl', 'Glute Bridge']
  }

  if (name.includes('leg extension')) {
    return ['Split Squat', 'Goblet Squat', 'Wall Sit']
  }

  if (name.includes('calf raise')) {
    return ['Seated Calf Raise', 'Leg Press Calf Raise', 'Bodyweight Calf Raise']
  }

  if (name.includes('hip abductor')) {
    return ['Lateral Band Walk', 'Cable Hip Abduction', 'Glute Bridge']
  }

  if (name.includes('ab machine')) {
    return ['Cable Crunch', 'Dead Bug', 'Plank']
  }

  if (name.includes('hack squat')) {
    return ['Leg Press', 'Smith Squat', 'Goblet Squat']
  }

  if (name.includes('adductor machine')) {
    return ['Cable Adduction', 'Bodyweight Side Lunge', 'Split Squat']
  }

  if (name.includes('abductor machine')) {
    return ['Hip Abductor', 'Lateral Band Walk', 'Cable Hip Abduction']
  }

  return ['Cable Variation', 'Machine Variation', 'Bodyweight Alternative']
}