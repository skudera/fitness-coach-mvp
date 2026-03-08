export type WeeklyMode = 'recomp-steady' | 'fat-loss-push' | 'deload' | 'performance-week';
export type DiscomfortType = 'none' | 'shoulder' | 'back' | 'both';
export type BasketballPlan = 'yes' | 'no' | 'unsure';
export type Difficulty = 'easy' | 'moderate' | 'hard';
export type CalibrationFeedback = 'too-light' | 'about-right' | 'too-heavy';

export interface BodyMetrics {
  date: string;
  weight: number;
  bodyFat: number;
  waterPercent: number;
  waist?: number;
  chest?: number;
  thigh?: number;
  bicep?: number;
  notes?: string;
}

export interface ExercisePlan {
  id: string;
  name: string;
  equipmentGroup: string;
  category: 'compound' | 'isolation' | 'core';
  targetSets: number;
  repRange: string;
  suggestedWeight?: number;
  notes?: string;
}

export interface CardioPlan {
  machine: 'elliptical' | 'treadmill' | 'curve treadmill' | 'stairmaster' | 'stationary bike' | 'rower';
  minutes: number;
  hrTarget: string;
}

export interface WorkoutDayPlan {
  dayName: string;
  focus: string;
  estimatedMinutes: number;
  warmup: string[];
  exercises: ExercisePlan[];
  cardio?: CardioPlan;
  saunaRecommendation?: string;
}

export interface WeeklyPlan {
  mode: WeeklyMode;
  coachNote: string;
  basketballThursday: BasketballPlan;
  days: WorkoutDayPlan[];
  adjustments: string[];
}

export interface SetLog {
  setNumber: number;
  weight?: number;
  reps: number;
}

export interface ExerciseHistoryEntry {
  exerciseId: string;
  exerciseName: string;
  date: string;
  dayName: string;
  weight?: number;
  avgReps: number;
  difficulty: Difficulty;
  discomfort: DiscomfortType;
  calibration?: CalibrationFeedback;
}

export interface ActiveWorkoutSession {
  dayName: string;
  startedAt: string;
}

export interface CompletedWorkoutSession {
  dayName: string;
  startedAt: string;
  completedAt: string;
  totalMinutes: number;
  cardioCompleted: boolean;
}
