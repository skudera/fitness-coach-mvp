export default function PhotosPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="label">Photos</div>
        <h1 className="text-2xl font-semibold">Progress photo timeline</h1>
      </div>

      <div className="card space-y-2">
        <div className="label">Next reminder</div>
        <p className="text-sm text-slate-200">Front / side / back photos are due in 2 weeks.</p>
      </div>

      <div className="card">
        <div className="label">Photo comparison placeholder</div>
        <p className="mt-2 text-sm text-slate-300">Add side-by-side photo comparison here.</p>
      </div>
    </div>
  );
}
