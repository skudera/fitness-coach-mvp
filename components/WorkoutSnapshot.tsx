import { WorkoutDayPlan } from '@/types';

interface WorkoutSnapshotProps {
  workout: WorkoutDayPlan;
}

export function WorkoutSnapshot({ workout }: WorkoutSnapshotProps) {
  return (
    <div className="card space-y-4">
      <div>
        <div className="label">Today's workout</div>
        <h2 className="text-xl font-semibold text-white">{workout.dayName} — {workout.focus}</h2>
        <p className="mt-1 text-sm text-slate-400">Estimated time: {workout.estimatedMinutes} minutes</p>
      </div>

      <div>
        <div className="label">Warmup</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
          {workout.warmup.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div>
        <div className="label">Strength block</div>
        <ol className="mt-2 space-y-2 text-sm text-slate-200">
          {workout.exercises.map((exercise, index) => (
            <li key={exercise.id} className="rounded-xl bg-slate-800/60 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span>{index + 1}. {exercise.name}</span>
                <span className="text-slate-400">{exercise.equipmentGroup}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">{exercise.targetSets} × {exercise.repRange}{exercise.notes ? ` • ${exercise.notes}` : ''}</div>
            </li>
          ))}
        </ol>
      </div>

      {workout.cardio ? (
        <div>
          <div className="label">Cardio</div>
          <p className="mt-1 text-sm text-slate-200">{workout.cardio.machine} — {workout.cardio.minutes} min — HR {workout.cardio.hrTarget}</p>
        </div>
      ) : null}

      {workout.saunaRecommendation ? (
        <div>
          <div className="label">Sauna</div>
          <p className="mt-1 text-sm text-slate-200">{workout.saunaRecommendation}</p>
        </div>
      ) : null}
    </div>
  );
}
