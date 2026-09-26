import type { JobState, Saved } from "../lib/api";

export default function JobPanel({
  job,
  saved,
  error,
  busy,
  onCancel,
}: {
  job: JobState | null;
  saved: Saved | null;
  error: string | null;
  busy: boolean;
  onCancel: () => void;
}) {
  if (!job && !error && !saved) return null;
  return (
    <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
      {job && (
        <div className="flex items-center gap-2">
          <StateBadge state={job.state} />
          <span className="text-neutral-700">{job.message}</span>
          <span className="text-neutral-400 text-xs">({job.stage})</span>
          {busy && (
            <button
              className="ml-auto rounded-md border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
              onClick={onCancel}
            >
              Отменить
            </button>
          )}
        </div>
      )}
      {saved && (
        <div className="mt-2 text-emerald-700 break-all">
          ✓ сохранено: {saved.path}
        </div>
      )}
      {error && <div className="mt-2 text-red-600">✗ {error}</div>}
      {job?.error && <div className="mt-2 text-red-600">✗ {job.error}</div>}
    </div>
  );
}

function StateBadge({ state }: { state: JobState["state"] }) {
  const map: Record<string, string> = {
    queued: "bg-neutral-200 text-neutral-700",
    running: "bg-sky-100 text-sky-700",
    done: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-amber-100 text-amber-700",
  };
  const label: Record<string, string> = {
    queued: "в очереди",
    running: "идёт",
    done: "готово",
    failed: "ошибка",
    cancelled: "отменено",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${map[state] ?? map.queued}`}>
      {label[state] ?? state}
    </span>
  );
}
