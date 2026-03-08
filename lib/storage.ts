import { ActiveWorkoutSession, CompletedWorkoutSession, ExerciseHistoryEntry, WeeklyPlan, BodyMetrics, BasketballPlan } from '@/types';
import { seededBodyMetrics } from '@/lib/mock-data';

export const STORAGE_KEYS = {
  weeklyPlan: 'fitness-app-weekly-plan',
  mondayCheckIn: 'fitness-app-monday-checkin',
  exerciseHistory: 'fitness-app-exercise-history',
  activeSession: 'fitness-app-active-session',
  completedSessions: 'fitness-app-completed-sessions',
  bodyMetricsHistory: 'fitness-app-body-metrics-history',
  orderPrefix: 'fitness-app-order-',
} as const;

export interface SavedCheckIn {
  current: BodyMetrics;
  basketballThursday: BasketballPlan;
  savedAt: string;
}

function safeLoad<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
function safeSave<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const loadWeeklyPlan = () => safeLoad<WeeklyPlan>(STORAGE_KEYS.weeklyPlan);
export const saveWeeklyPlan = (plan: WeeklyPlan) => safeSave(STORAGE_KEYS.weeklyPlan, plan);
export const loadCheckIn = () => safeLoad<SavedCheckIn>(STORAGE_KEYS.mondayCheckIn);
export const saveCheckIn = (checkIn: SavedCheckIn) => safeSave(STORAGE_KEYS.mondayCheckIn, checkIn);
export const loadExerciseHistory = () => safeLoad<Record<string, ExerciseHistoryEntry[]>>(STORAGE_KEYS.exerciseHistory) ?? {};
export const saveExerciseHistory = (history: Record<string, ExerciseHistoryEntry[]>) => safeSave(STORAGE_KEYS.exerciseHistory, history);
export const loadCompletedSessions = () => safeLoad<CompletedWorkoutSession[]>(STORAGE_KEYS.completedSessions) ?? [];
export const saveCompletedSessions = (sessions: CompletedWorkoutSession[]) => safeSave(STORAGE_KEYS.completedSessions, sessions);
export const loadActiveSession = () => safeLoad<ActiveWorkoutSession>(STORAGE_KEYS.activeSession);
export const saveActiveSession = (session: ActiveWorkoutSession) => safeSave(STORAGE_KEYS.activeSession, session);
export function clearActiveSession() { if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEYS.activeSession); }

export function loadWorkoutOrder(dayName: string): string[] | null {
  return safeLoad<string[]>(`${STORAGE_KEYS.orderPrefix}${dayName}`);
}
export function saveWorkoutOrder(dayName: string, ids: string[]) {
  safeSave(`${STORAGE_KEYS.orderPrefix}${dayName}`, ids);
}

export function appendExerciseHistory(entry: ExerciseHistoryEntry) {
  const history = loadExerciseHistory();
  const list = history[entry.exerciseId] ?? [];
  history[entry.exerciseId] = [...list, entry].slice(-12);
  saveExerciseHistory(history);
}

export function getLatestExerciseEntry(exerciseId: string): ExerciseHistoryEntry | undefined {
  const history = loadExerciseHistory();
  return history[exerciseId]?.at(-1);
}

export function loadBodyMetricsHistory(): BodyMetrics[] {
  return safeLoad<BodyMetrics[]>(STORAGE_KEYS.bodyMetricsHistory) ?? seededBodyMetrics;
}

export function saveBodyMetricsHistory(history: BodyMetrics[]) {
  safeSave(STORAGE_KEYS.bodyMetricsHistory, history);
}

export function upsertBodyMetric(entry: BodyMetrics) {
  const history = loadBodyMetricsHistory();
  const normalizedDate = entry.date.slice(0, 10);
  const others = history.filter((item) => item.date.slice(0, 10) !== normalizedDate);
  const updated = [...others, { ...entry, date: normalizedDate }].sort((a, b) => a.date.localeCompare(b.date));
  saveBodyMetricsHistory(updated);
}
