import { BodyMetrics, BasketballPlan, WeeklyMode, WeeklyPlan } from '@/types';
import { demoPlan } from '@/lib/mock-data';

export interface MondayCheckInInput {
  current: BodyMetrics;
  previous?: BodyMetrics;
  basketballThursday: BasketballPlan;
}

export function determineWeeklyMode(input: MondayCheckInInput): WeeklyMode {
  if (!input.previous) return 'recomp-steady';

  const weightDelta = input.current.weight - input.previous.weight;
  const bodyFatDelta = input.current.bodyFat - input.previous.bodyFat;

  if (weightDelta >= 0.2 && bodyFatDelta >= 0.1) return 'fat-loss-push';
  if (weightDelta <= -0.4 && bodyFatDelta <= -0.1) return 'recomp-steady';
  return 'performance-week';
}

export function generateWeeklyPlan(input: MondayCheckInInput): WeeklyPlan {
  const mode = determineWeeklyMode(input);
  const base = structuredClone(demoPlan);
  base.mode = mode;
  base.basketballThursday = input.basketballThursday;

  // Reset any demo-only adjustments before rebuilding.
  base.adjustments = ['Increase lateral raise weight from 20 to 25 lbs.'];

  if (input.basketballThursday === 'yes') {
    const thursday = base.days.find((day) => day.dayName === 'Thursday');
    const friday = base.days.find((day) => day.dayName === 'Friday');
    if (thursday) {
      thursday.focus = 'Upper Mixed / Basketball Adjusted';
      thursday.cardio = undefined;
      thursday.estimatedMinutes = 56;
      thursday.saunaRecommendation = 'Skip sauna today. Basketball planned tonight.';
    }
    if (friday) {
      friday.saunaRecommendation = 'Recommended for 10 minutes if basketball happened Thursday.';
    }
    base.adjustments.push('Remove Thursday cardio because basketball is planned.');
    base.adjustments.push('Recommend sauna Friday only if basketball happens Thursday.');
  }

  if (input.basketballThursday === 'no') {
    const thursday = base.days.find((day) => day.dayName === 'Thursday');
    const friday = base.days.find((day) => day.dayName === 'Friday');
    if (thursday) {
      thursday.cardio = { machine: 'elliptical', minutes: 12, hrTarget: '120–135 bpm' };
      thursday.estimatedMinutes = 68;
      thursday.focus = 'Upper Mixed';
      thursday.saunaRecommendation = 'No sauna today. Keep the session focused on lifting and prescribed cardio.';
    }
    if (friday) {
      friday.saunaRecommendation = 'Optional 10 minutes only if all lifting and cardio are completed.';
    }
    base.adjustments.push('Thursday cardio restored because basketball is not planned.');
    base.adjustments.push('Friday sauna changed to optional only after all planned work is finished.');
  }

  if (input.basketballThursday === 'unsure') {
    base.adjustments.push('Thursday remains flexible. If basketball happens, remove Thursday cardio and keep Friday lighter.');
  }

  if (mode === 'fat-loss-push') {
    base.coachNote = 'Fat loss has slowed. Cardio was increased on two days while keeping strength work stable.';
    for (const day of ['Tuesday', 'Friday']) {
      const workout = base.days.find((d) => d.dayName === day);
      if (workout?.cardio) workout.cardio.minutes += 5;
    }
    base.adjustments.push('Added 5 cardio minutes to Tuesday and Friday.');
  }

  return base;
}
