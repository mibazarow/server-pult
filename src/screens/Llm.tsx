import { useCallback, useEffect, useState, type ReactNode } from "react";

import Card from "../components/Card";
import {
  llmList,
  llmStart,
  llmStatus,
  llmStop,
  type LlmStatus,
  type ModelInfo,
} from "../lib/api";
import { fmtDuration, fmtMib } from "../lib/format";

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-neutral-100 text-neutral-600",
    sky: "bg-sky-100 text-sky-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`text-[11px] rounded-full px-2 py-0.5 ${tones[tone] ?? tones.neutral}`}>
      {children}
    </span>
  );
}

export default function Llm() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [status, setStatus] = useState<LlmStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([llmList(), llmStatus()]);
      setModels(list.models);
      setStatus(st);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  async function switchTo(m: ModelInfo) {
    if (status?.running && status.model === m.id) return;
    const ok = confirm(
      status?.running
        ? `Выгрузить «${status.model}» и загрузить «${m.id}»?`
        : `Загрузить «${m.id}»?`,
    );
    if (!ok) return;
    setBusy(m.id);
    setErr(null);
    try {
      await llmStart(m.id);
      await refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function stop() {
    if (!confirm("Остановить загруженную модель?")) return;
    setBusy("__stop");
    setErr(null);
    try {
      await llmStop();
      await refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">LLM</h1>
        <button
          className="rounded-md px-3 py-1.5 text-sm border border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          onClick={stop}
          disabled={!status?.running || busy !== null}
        >
          Остановить
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Текущая модель">
          {status?.running ? (
            <>
              <div className="text-base font-medium mb-2">{status.model ?? "неизвестная"}</div>
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge tone="green">работает</Badge>
                {status.api_ok ? <Badge>API ок</Badge> : <Badge tone="amber">API молчит</Badge>}
                {status.foreign_owner && <Badge tone="amber">владелец: {status.owner}</Badge>}
              </div>
              <div className="text-sm text-neutral-500">
                PID {status.pid} · порт {status.port} · VRAM {fmtMib(status.vram_mib)}
                <br />
                загружена {fmtDuration(status.uptime_s)}
              </div>
            </>
          ) : (
            <div className="text-sm text-neutral-500">Модель не загружена.</div>
          )}
        </Card>

        <div className="xl:col-span-2">
          <Card title={`Модели (${models.length})`}>
            <div className="divide-y divide-neutral-100">
              {models.map((m) => {
                const current = status?.running && status.model === m.id;
                const loading = busy === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => switchTo(m)}
                    disabled={busy !== null || current}
                    className={
                      "w-full text-left flex items-center justify-between gap-3 py-2.5 px-1 rounded-md " +
                      (current
                        ? "bg-sky-50"
                        : "hover:bg-neutral-50 disabled:hover:bg-transparent")
                    }
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {m.id}
                        {current && <span className="text-sky-600"> — загружена</span>}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <Badge>{m.engine}</Badge>
                        {m.reasoning && <Badge tone="sky">reasoning</Badge>}
                        {m.vision && <Badge>vision</Badge>}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400 shrink-0">
                      {loading ? "загружаю…" : current ? "" : "загрузить"}
                    </div>
                  </button>
                );
              })}
              {models.length === 0 && (
                <div className="text-sm text-neutral-500 py-2">Список пуст.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
