import { WeeklyPlan, BodyMetrics } from '@/types';

export const demoPlan: WeeklyPlan = {
  mode: 'recomp-steady',
  coachNote: 'Strength is improving and weight is trending down. Keep cardio steady this week.',
  basketballThursday: 'yes',
  adjustments: [
    'Unknown exercise weights start blank until you log them.',
    'Basketball Thursday reduces redundant conditioning.',
    'Workout duration is tracked so the plan can move toward 75 minutes.'
  ],
  days: [
    {
      dayName: 'Monday',
      focus: 'Chest / Shoulders / Cardio',
      estimatedMinutes: 74,
      warmup: ['5 min treadmill walk', 'Band shoulder warmup'],
      exercises: [
        { id: 'incline-db-press', name: 'Incline DB Press', equipmentGroup: 'dumbbells', category: 'compound', targetSets: 3, repRange: '8–12' },
        { id: 'machine-chest-press', name: 'Machine Chest Press', equipmentGroup: 'chest machines', category: 'compound', targetSets: 3, repRange: '8–12' },
        { id: 'db-lateral-raise', name: 'DB Lateral Raise', equipmentGroup: 'dumbbells', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'rear-delt-machine', name: 'Rear Delt Machine', equipmentGroup: 'shoulder machines', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'cable-fly', name: 'Cable Fly', equipmentGroup: 'cable station', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'face-pull', name: 'Face Pull', equipmentGroup: 'cable station', category: 'isolation', targetSets: 3, repRange: '10–15' },
      ],
      cardio: { machine: 'elliptical', minutes: 12, hrTarget: '120–135 bpm' },
      saunaRecommendation: 'Not recommended today.'
    },
    {
      dayName: 'Tuesday',
      focus: 'Back / Core / Cardio',
      estimatedMinutes: 75,
      warmup: ['5 min rower', 'Band pull-aparts'],
      exercises: [
        { id: 'lat-pulldown', name: 'Lat Pulldown', equipmentGroup: 'back machines', category: 'compound', targetSets: 3, repRange: '8–12' },
        { id: 'seated-cable-row', name: 'Seated Cable Row', equipmentGroup: 'cable station', category: 'compound', targetSets: 3, repRange: '8–12' },
        { id: 'straight-arm-pulldown', name: 'Straight Arm Pulldown', equipmentGroup: 'cable station', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'chest-supported-row', name: 'Chest Supported Row', equipmentGroup: 'back machines', category: 'compound', targetSets: 3, repRange: '8–12' },
        { id: 'rear-delt-machine-2', name: 'Rear Delt Machine', equipmentGroup: 'shoulder machines', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'cable-crunch', name: 'Cable Crunch', equipmentGroup: 'core station', category: 'core', targetSets: 3, repRange: '10–15' },
      ],
      cardio: { machine: 'stairmaster', minutes: 12, hrTarget: '120–135 bpm' },
      saunaRecommendation: 'Optional only if session finishes early.'
    },
    {
      dayName: 'Wednesday',
      focus: 'Legs / Core / Cardio',
      estimatedMinutes: 75,
      warmup: ['5 min treadmill walk', 'Hip mobility'],
      exercises: [
        { id: 'leg-press', name: 'Leg Press', equipmentGroup: 'leg machines', category: 'compound', targetSets: 3, repRange: '8–12' },
        { id: 'seated-ham-curl', name: 'Seated Ham Curl', equipmentGroup: 'leg machines', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'leg-extension', name: 'Leg Extension', equipmentGroup: 'leg machines', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'abductor-machine', name: 'Abductor Machine', equipmentGroup: 'leg machines', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'adductor-machine', name: 'Adductor Machine', equipmentGroup: 'leg machines', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'ab-machine', name: 'Ab Machine', equipmentGroup: 'core station', category: 'core', targetSets: 3, repRange: '10–15' },
      ],
      cardio: { machine: 'stationary bike', minutes: 10, hrTarget: '120–130 bpm' },
      saunaRecommendation: 'Not recommended today.'
    },
    {
      dayName: 'Thursday',
      focus: 'Upper Mixed / Basketball Adjusted',
      estimatedMinutes: 60,
      warmup: ['5 min treadmill walk', 'Upper body mobility'],
      exercises: [
        { id: 'neutral-db-press', name: 'Neutral Grip DB Press', equipmentGroup: 'dumbbells', category: 'compound', targetSets: 3, repRange: '8–12' },
        { id: 'neutral-grip-pulldown', name: 'Neutral Grip Pulldown', equipmentGroup: 'back machines', category: 'compound', targetSets: 3, repRange: '8–12' },
        { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', equipmentGroup: 'cable station', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'face-pull-2', name: 'Face Pull', equipmentGroup: 'cable station', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'pec-fly-machine', name: 'Pec Fly Machine', equipmentGroup: 'chest machines', category: 'isolation', targetSets: 3, repRange: '10–15' },
      ],
      saunaRecommendation: 'Skip sauna today. Basketball planned tonight.'
    },
    {
      dayName: 'Friday',
      focus: 'Lower / Recovery Conditioning',
      estimatedMinutes: 70,
      warmup: ['5 min treadmill walk', 'Lower body mobility'],
      exercises: [
        { id: 'hack-squat', name: 'Hack Squat', equipmentGroup: 'leg machines', category: 'compound', targetSets: 3, repRange: '8–12' },
        { id: 'lying-ham-curl', name: 'Lying Ham Curl', equipmentGroup: 'leg machines', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'standing-calf-raise', name: 'Standing Calf Raise', equipmentGroup: 'leg machines', category: 'isolation', targetSets: 3, repRange: '10–15' },
        { id: 'goblet-squat', name: 'Goblet Squat', equipmentGroup: 'dumbbells', category: 'compound', targetSets: 3, repRange: '8–12' },
        { id: 'roman-chair-leg-raise', name: 'Roman Chair Leg Raise', equipmentGroup: 'core station', category: 'core', targetSets: 3, repRange: '10–15' },
      ],
      cardio: { machine: 'treadmill', minutes: 12, hrTarget: '115–130 bpm' },
      saunaRecommendation: 'Recommended for 10 minutes if basketball happened Thursday and all prescribed work is complete.'
    }
  ]
};


export const seededBodyMetrics: BodyMetrics[] = [
  { date: '2025-12-29', weight: 195.5, bodyFat: 20.1, waterPercent: 59.0, notes: 'Baseline' },
  { date: '2026-01-12', weight: 190.4, bodyFat: 19.3, waterPercent: 59.4 },
  { date: '2026-01-15', weight: 193.8, bodyFat: 19.7, waterPercent: 59.1 },
  { date: '2026-01-19', weight: 190.4, bodyFat: 19.2, waterPercent: 59.4 },
  { date: '2026-01-26', weight: 189.2, bodyFat: 18.8, waterPercent: 59.7 },
  { date: '2026-02-02', weight: 189.2, bodyFat: 18.8, waterPercent: 59.7 },
  { date: '2026-02-09', weight: 187.2, bodyFat: 18.3, waterPercent: 60.1 },
  { date: '2026-02-16', weight: 185.0, bodyFat: 17.9, waterPercent: 60.4, waist: 38.5, chest: 40.5, thigh: 21.0, bicep: 13.0, notes: 'Waist: 38.5” | Chest: 40.5” | Thigh: 21.0” | Bicep: 13.0”' },
  { date: '2026-02-23', weight: 185.0, bodyFat: 18.0, waterPercent: 60.3 },
  { date: '2026-03-02', weight: 184.0, bodyFat: 17.8, waterPercent: 60.5, notes: 'Next weigh-in checkpoint' },
];
