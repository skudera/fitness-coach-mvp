interface ProgressBarProps {
  currentIndex: number;
  totalExercises: number;
}

export function ProgressBar({ currentIndex, totalExercises }: ProgressBarProps) {
  const steps = ['Warmup', ...Array.from({ length: totalExercises }, (_, i) => `${i + 1}`), 'Cardio'];
  const currentStep = currentIndex + 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto text-xs text-slate-400">
        {steps.map((step, idx) => {
          const active = idx === currentStep;
          const completed = idx < currentStep;
          return (
            <div key={step + idx} className="flex items-center gap-2 whitespace-nowrap">
              <span className={`rounded-full px-2 py-1 ${active ? 'bg-white text-slate-950' : completed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                {step}
              </span>
              {idx < steps.length - 1 && <span>→</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
