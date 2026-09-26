import { useEffect, useRef, useState } from "react";

import { tailLog } from "../lib/api";

type Source = "llm" | "temps" | "job";

export default function Logs() {
  const [source, setSource] = useState<Source>("llm");
  const [jobId, setJobId] = useState("");
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    let alive = true;
    async function tick() {
      if (pausedRef.current) return;
      if (source === "job" && !jobId.trim()) {
        setText("(укажи ID задания)");
        return;
      }
      try {
        const t = await tailLog({ source, id: jobId.trim() || undefined, lines: 300 });
        if (alive) {
          setText(t);
          setErr(null);
        }
      } catch (e) {
        if (alive) setErr(String(e));
      }
    }
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [source, jobId]);

  const lines = text.split("\n");
  const shown = search.trim()
    ? lines.filter((l) => l.toLowerCase().includes(search.toLowerCase()))
    : lines;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <h1 className="text-xl font-semibold">Логи</h1>
        <select
          className={input + " w-44"}
          value={source}
          onChange={(e) => setSource(e.target.value as Source)}
        >
          <option value="llm">LLM (текущая модель)</option>
          <option value="temps">Температуры</option>
          <option value="job">Задание (по ID)</option>
        </select>
        {source === "job" && (
          <input
            className={input + " w-64"}
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="ID задания"
          />
        )}
        <input
          className={input + " w-56"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="поиск по строкам…"
        />
        <label className="flex items-center gap-1 text-xs text-neutral-500">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          пауза
        </label>
        <span className="text-xs text-neutral-400">
          {shown.length} строк{search.trim() ? " (фильтр)" : ""}
        </span>
      </div>

      {err && <div className="mb-2 text-sm text-red-600">✗ {err}</div>}

      <pre className="flex-1 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs leading-relaxed p-3 whitespace-pre-wrap">
        {shown.join("\n") || "(пусто)"}
      </pre>
    </div>
  );
}

const input =
  "rounded-md bg-white border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-sky-500";
