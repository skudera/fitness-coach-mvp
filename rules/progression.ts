import { CalibrationFeedback, Difficulty, DiscomfortType, ExerciseHistoryEntry } from '@/types';

export function getSuggestedWeight(history: ExerciseHistoryEntry[] | undefined): number | undefined {
  const latest = history?.at(-1);
  if (!latest?.weight) return undefined;

  if (latest.discomfort === 'shoulder' || latest.discomfort === 'back' || latest.discomfort === 'both') {
    return latest.weight;
  }

  if (latest.calibration === 'too-heavy') return Math.max(0, latest.weight - 5);
  if (latest.calibration === 'too-light') return latest.weight + 5;
  if (latest.difficulty === 'easy' && latest.avgReps >= 12) return latest.weight + 5;
  return latest.weight;
}

export function getSuggestedWeightReason(history: ExerciseHistoryEntry[] | undefined): string {
  const latest = history?.at(-1);
  if (!latest) return 'First time logging this exercise. Enter the weight you use today.';
  if (!latest.weight) return 'Last time no weight was captured. Enter today’s weight.';
  if (latest.calibration === 'too-light') return 'Weight increased from your last log because it was marked too light.';
  if (latest.calibration === 'too-heavy') return 'Weight held lower because your last log marked it too heavy.';
  if (latest.discomfort !== 'none') return 'Weight held because discomfort was logged last time.';
  if (latest.difficulty === 'easy' && latest.avgReps >= 12) return 'Weight nudged up because the last session looked comfortable.';
  return 'Using your most recent logged weight as today’s starting point.';
}

export function summarizeSetDifficulty(calibration: CalibrationFeedback | null, difficulty: Difficulty, discomfort: DiscomfortType): string {
  if (discomfort !== 'none') return 'Discomfort noted. Future recommendations will stay conservative.';
  if (calibration === 'too-light') return 'This will push the suggested weight up next time.';
  if (calibration === 'too-heavy') return 'This will keep the next suggestion conservative.';
  if (difficulty === 'easy') return 'Easy session logged. The app may progress the load next time.';
  return 'This result will be used for the next suggestion.';
}
