'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProgressBar } from '@/components/ProgressBar';
import { demoPlan } from '@/lib/mock-data';
import { appendExerciseHistory, getLatestExerciseEntry, loadWeeklyPlan, loadWorkoutOrder } from '@/lib/storage';
import { CalibrationFeedback, Difficulty, DiscomfortType, SetLog } from '@/types';
import { getSuggestedWeight, getSuggestedWeightReason, summarizeSetDifficulty } from '@/rules/progression';

export default function ExercisePage() {
  const params = useParams<{ index: string }>();
  const index = Number(params.index ?? 0);
  const [saved, setSaved] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [discomfort, setDiscomfort] = useState<DiscomfortType>('none');
  const [calibration, setCalibration] = useState<CalibrationFeedback | null>(null);
  const plan = loadWeeklyPlan() ?? demoPlan;
  const monday = plan.days[0];
  const savedOrder = loadWorkoutOrder(monday.dayName);
  const workout = {
    ...monday,
    exercises: savedOrder
      ? savedOrder.map((id) => monday.exercises.find((ex) => ex.id === id)).filter(Boolean) as typeof monday.exercises
      : monday.exercises,
  };
  const exercise = workout.exercises[index];
  const latest = getLatestExerciseEntry(exercise.id);
  const firstTime = !latest;
  const suggestedWeight = getSuggestedWeight(latest ? [latest] : undefined);
  const helper = getSuggestedWeightReason(latest ? [latest] : undefined);

  const [sets, setSets] = useState<SetLog[]>(() => Array.from({ length: exercise.targetSets }, (_, i) => ({ setNumber: i + 1, weight: suggestedWeight, reps: 0 })));

  useEffect(() => {
    setSets(Array.from({ length: exercise.targetSets }, (_, i) => ({ setNumber: i + 1, weight: suggestedWeight, reps: 0 })));
    setSaved(false);
    setCalibration(null);
    setDifficulty('moderate');
    setDiscomfort('none');
  }, [exercise.id, exercise.targetSets, suggestedWeight]);

  const isLastExercise = index === workout.exercises.length - 1;
  const remaining = useMemo(() => {
    const exercisesLeft = workout.exercises.length - index - 1;
    return `${exercisesLeft} strength exercise${exercisesLeft === 1 ? '' : 's'} left${workout.cardio ? ' + cardio' : ''}`;
  }, [index, workout.cardio, workout.exercises.length]);

  function saveExercise() {
    const validWeights = sets.map((s) => s.weight).filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const validReps = sets.map((s) => s.reps).filter((v) => !Number.isNaN(v) && v > 0);
    appendExerciseHistory({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      date: new Date().toISOString(),
      dayName: workout.dayName,
      weight: validWeights.length ? validWeights[0] : undefined,
      avgReps: validReps.length ? Math.round(validReps.reduce((a, b) => a + b, 0) / validReps.length) : 0,
      difficulty,
      discomfort,
      calibration: calibration ?? undefined,
    });
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="label">Exercise {index + 1} of {workout.exercises.length}</div>
        <h1 className="text-2xl font-semibold">{exercise.name}</h1>
        <p className="text-sm text-slate-400">{remaining}</p>
      </div>

      <ProgressBar currentIndex={index} totalExercises={workout.exercises.length} />

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="label">Target</div>
            <div className="value">{exercise.targetSets} × {exercise.repRange}</div>
          </div>
          <div>
            <div className="label">Suggested weight</div>
            <div className="value">{typeof suggestedWeight === 'number' ? `${suggestedWeight} lbs` : 'Enter today’s weight'}</div>
          </div>
        </div>
        <p className="text-xs text-slate-400">{helper}</p>

        <div className="space-y-3">
          {sets.map((set, idx) => (
            <div key={set.setNumber} className="grid grid-cols-3 gap-2 rounded-xl bg-slate-800/60 p-3 text-sm">
              <div>
                <div className="label">Set</div>
                <div>{set.setNumber}</div>
              </div>
              <label>
                <div className="label">Weight</div>
                <input
                  type="number"
                  step="0.5"
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg bg-slate-900 px-2 py-2"
                  placeholder="lbs"
                  value={set.weight ?? ''}
                  onChange={(e) => {
                    const next = [...sets];
                    next[idx].weight = e.target.value === '' ? undefined : Number.parseFloat(e.target.value);
                    setSets(next);
                  }}
                />
              </label>
              <label>
                <div className="label">Reps</div>
                <input
                  type="number"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg bg-slate-900 px-2 py-2"
                  placeholder="reps"
                  value={set.reps || ''}
                  onChange={(e) => {
                    const next = [...sets];
                    next[idx].reps = e.target.value === '' ? 0 : Number.parseInt(e.target.value, 10);
                    setSets(next);
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <div>
          <div className="label">Difficulty</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            {(['easy', 'moderate', 'hard'] as const).map((option) => (
              <button key={option} onClick={() => setDifficulty(option)} className={`rounded-xl px-3 py-2 capitalize ${difficulty === option ? 'bg-white text-slate-950' : 'bg-slate-800 text-white'}`}>{option}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="label">Discomfort</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {(['none', 'shoulder', 'back', 'both'] as DiscomfortType[]).map((option) => (
              <button key={option} onClick={() => setDiscomfort(option)} className={`rounded-xl px-3 py-2 capitalize ${discomfort === option ? 'bg-white text-slate-950' : 'bg-slate-800 text-white'}`}>{option}</button>
            ))}
          </div>
        </div>
        {firstTime ? (
          <div>
            <div className="label">First-time calibration</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              {([
                ['too-light', 'Too light'],
                ['about-right', 'About right'],
                ['too-heavy', 'Too heavy'],
              ] as const).map(([value, label]) => (
                <button key={value} onClick={() => setCalibration(value)} className={`rounded-xl px-3 py-2 ${calibration === value ? 'bg-white text-slate-950' : 'bg-slate-800 text-white'}`}>{label}</button>
              ))}
            </div>
          </div>
        ) : null}
        <p className="text-xs text-slate-400">{summarizeSetDifficulty(calibration, difficulty, discomfort)}</p>
      </div>

      {saved ? <div className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">Saved. Next recommendation will use this log.</div> : null}

      <div className="grid grid-cols-3 gap-3">
        <Link href={index === 0 ? '/workout/warmup' : `/workout/exercise/${index - 1}`} className="rounded-2xl bg-slate-800 px-4 py-3 text-center font-medium text-white">Previous</Link>
        <button onClick={saveExercise} className="rounded-2xl bg-white px-4 py-3 text-center font-medium text-slate-950">Save</button>
        <Link href={isLastExercise ? '/workout/cardio' : `/workout/exercise/${index + 1}`} className="rounded-2xl bg-emerald-500 px-4 py-3 text-center font-medium text-slate-950">{isLastExercise ? 'Go to cardio' : 'Next'}</Link>
      </div>
    </div>
  );
}
