export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-80 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 rounded-lg bg-slate-100" />
        <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
          <div className="h-40 rounded-2xl bg-slate-100" />
          <div className="h-40 rounded-2xl bg-slate-100" />
          <div className="h-40 rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
