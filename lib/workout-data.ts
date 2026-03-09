export type WorkoutDefinition = {
  dayName: string
  focus: string
  estimatedMinutes: string
  warmup: string
  exercises: string[]
  cardio: string
  restDay: boolean
}

export function getWorkoutForToday(): WorkoutDefinition {
  const day = new Date().getDay()

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
        estimatedMinutes: '74 min planned',
        warmup: '5 min treadmill + shoulder mobility',
        exercises: [
          'Incline DB Press',
          'Machine Chest Press',
          'DB Lateral Raise',
          'Rear Delt Machine',
          'Cable Fly',
        ],
        cardio: 'Elliptical – 15 min',
        restDay: false,
      }
    case 2:
      return {
        dayName: 'Tuesday',
        focus: 'Back / Core / Cardio',
        estimatedMinutes: '72 min planned',
        warmup: '5 min treadmill + band work',
        exercises: [
          'Lat Pulldown',
          'Seated Row',
          'Straight Arm Pulldown',
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
          'Ab Machine',
        ],
        cardio: 'Elliptical – 12 min',
        restDay: false,
      }
    case 4:
      return {
        dayName: 'Thursday',
        focus: 'Upper Mixed / Basketball',
        estimatedMinutes: 'Flexible day',
        warmup: '5 min treadmill + upper mobility',
        exercises: [
          'Machine Chest Press',
          'Lat Pulldown',
          'Cable Lateral Raise',
          'Face Pull',
          'Optional Curl',
        ],
        cardio: 'Skip cardio if basketball happens',
        restDay: false,
      }
    case 5:
      return {
        dayName: 'Friday',
        focus: 'Lower / Recovery Conditioning',
        estimatedMinutes: '70 min planned',
        warmup: '5 min treadmill + mobility',
        exercises: [
          'Hack Squat or Leg Press',
          'Hamstring Curl',
          'Adductor / Abductor',
          'Calf Raise',
          'Cable Crunch',
        ],
        cardio: 'Treadmill incline walk – 10 min',
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