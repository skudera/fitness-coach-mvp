interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
}

export function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {helper ? <div className="mt-1 text-sm text-slate-400">{helper}</div> : null}
    </div>
  );
}
