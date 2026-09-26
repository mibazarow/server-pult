import { useEffect, useState } from "react";

import Card from "../components/Card";
import { llmStatus, systemStatus, type LlmStatus, type SystemStatus } from "../lib/api";
import { fmtDuration, fmtMib, fmtNum } from "../lib/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900">{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const [sys, setSys] = useState<SystemStatus | null>(null);
  const [llm, setLlm] = useState<LlmStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const [s, l] = await Promise.all([systemStatus(), llmStatus()]);
        if (!alive) return;
        setSys(s);
        setLlm(l);
        setErr(null);
      } catch (e) {
        if (alive) setErr(String(e));
      }
    }
    tick();
    const id = setInterval(tick, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Дашборд</h1>
        <span className="text-xs text-neutral-400">обновление раз в 10 с</span>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card title="GPU">
          <Stat label="Модель" value={sys?.gpu.name ?? "—"} />
          <Stat label="Загрузка" value={fmtNum(sys?.gpu.util, " %")} />
          <Stat
            label="VRAM"
            value={
              sys?.gpu.vram_used_mib != null
                ? `${fmtMib(sys.gpu.vram_used_mib)} / ${fmtMib(sys.gpu.vram_total_mib)}`
                : "—"
            }
          />
          <Stat label="Питание" value={fmtNum(sys?.gpu.power_w, " Вт")} />
          <Stat label="Температура" value={fmtNum(sys?.gpu.temp_c, " °C")} />
        </Card>

        <Card title="CPU / RAM">
          <Stat label="Load (1m)" value={fmtNum(sys?.cpu.load1)} />
          <Stat label="Температура CPU" value={fmtNum(sys?.cpu.temp_c, " °C")} />
          <Stat
            label="RAM"
            value={
              sys?.ram.used_mib != null
                ? `${fmtMib(sys.ram.used_mib)} / ${fmtMib(sys.ram.total_mib)}`
                : "—"
            }
          />
          <Stat label="Аптайм" value={fmtDuration(sys?.uptime_s)} />
        </Card>

        <Card title="Диск">
          <Stat
            label="Свободно"
            value={
              sys?.disk.free_gb != null
                ? `${fmtNum(sys.disk.free_gb, " ГБ")} из ${fmtNum(sys.disk.total_gb, " ГБ")}`
                : "—"
            }
          />
        </Card>

        <Card
          title="Сейчас на GPU"
          right={
            llm?.running ? (
              <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">
                LLM работает
              </span>
            ) : (
              <span className="text-xs rounded-full bg-neutral-100 text-neutral-500 px-2 py-0.5">
                GPU свободна
              </span>
            )
          }
        >
          {llm?.running ? (
            <>
              <Stat label="Модель" value={llm.model ?? "неизвестная"} />
              <Stat label="Движок/порт" value={`:${llm.port}`} />
              <Stat label="PID / владелец" value={`${llm.pid ?? "—"} / ${llm.owner ?? "—"}`} />
              <Stat label="Загружена" value={fmtDuration(llm.uptime_s)} />
              <Stat label="API" value={llm.api_ok ? "отвечает" : "не отвечает"} />
              {llm.foreign_owner && (
                <div className="mt-2 text-xs text-amber-600">
                  ⚠ запущена от «{llm.owner}» — менеджер ею не управляет
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-neutral-500">Модель не загружена.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
