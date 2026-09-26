import { useState, type ReactNode } from "react";

import JobPanel from "../components/JobPanel";
import { useJob } from "../hooks/useJob";
import { runMusic, runSfx } from "../lib/api";

export default function Audio() {
  const [tab, setTab] = useState<"music" | "sfx">("music");
  const jobCtl = useJob();

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">Аудио</h1>

      <div className="flex gap-2 mb-5">
        <Tab active={tab === "music"} onClick={() => setTab("music")}>
          Музыка (ACE-Step)
        </Tab>
        <Tab active={tab === "sfx"} onClick={() => setTab("sfx")}>
          Звук (MOSS-SoundEffect)
        </Tab>
      </div>

      {tab === "music" ? <MusicForm ctl={jobCtl} /> : <SfxForm ctl={jobCtl} />}

      <JobPanel
        job={jobCtl.job}
        saved={jobCtl.saved}
        error={jobCtl.error}
        busy={jobCtl.busy}
        onCancel={jobCtl.cancel}
      />
    </div>
  );
}

function MusicForm({ ctl }: { ctl: ReturnType<typeof useJob> }) {
  const [caption, setCaption] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [duration, setDuration] = useState(60);
  const [steps, setSteps] = useState(8);
  const [guidance, setGuidance] = useState(7.0);
  const [starting, setStarting] = useState(false);

  async function go() {
    if (!caption.trim()) return;
    setStarting(true);
    try {
      const r = await runMusic({
        caption,
        lyrics: lyrics.trim() ? lyrics : undefined,
        duration,
        steps,
        guidance,
      });
      ctl.start(r.job_id);
    } catch (e) {
      alert(String(e));
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <textarea
        className={input + " h-20 resize-y mb-3"}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="стиль и настроение: epic orchestral battle theme, 120 bpm, drums and brass"
      />
      <textarea
        className={input + " h-24 resize-y mb-3"}
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        placeholder="текст песни (необязательно; если пусто — инструментал). Теги: [verse] / [chorus]"
      />
      <div className="flex gap-3 flex-wrap items-end">
        <NumField label="Длительность, с" value={duration} onChange={setDuration} />
        <NumField label="Steps" value={steps} onChange={setSteps} />
        <NumField label="Guidance" value={guidance} onChange={setGuidance} step={0.1} />
      </div>
      <div className="mt-5">
        <button className={btnPrimary} onClick={go} disabled={starting || ctl.busy}>
          {ctl.busy ? "Генерация…" : "Сгенерировать музыку"}
        </button>
      </div>
    </div>
  );
}

function SfxForm({ ctl }: { ctl: ReturnType<typeof useJob> }) {
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(5);
  const [steps, setSteps] = useState(100);
  const [cfg, setCfg] = useState(4.0);
  const [seed, setSeed] = useState(0);
  const [starting, setStarting] = useState(false);

  async function go() {
    if (!prompt.trim()) return;
    setStarting(true);
    try {
      const r = await runSfx({ prompt, seconds, steps, cfg, seed });
      ctl.start(r.job_id);
    } catch (e) {
      alert(String(e));
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <textarea
        className={input + " h-20 resize-y mb-3"}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="clash of two swords, metal impact, sharp"
      />
      <div className="flex gap-3 flex-wrap items-end">
        <NumField label="Длительность, с" value={seconds} onChange={setSeconds} />
        <NumField label="Steps" value={steps} onChange={setSteps} />
        <NumField label="CFG" value={cfg} onChange={setCfg} step={0.1} />
        <NumField label="Seed" value={seed} onChange={setSeed} />
      </div>
      <div className="mt-5">
        <button className={btnPrimary} onClick={go} disabled={starting || ctl.busy}>
          {ctl.busy ? "Генерация…" : "Сгенерировать звук"}
        </button>
      </div>
      <div className="mt-2 text-xs text-neutral-400">
        MOSS-SoundEffect (Apache-2.0), 48 кГц mono. Генерация может занять несколько минут.
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block w-36">
      <div className="text-xs text-neutral-500 mb-1">{label}</div>
      <input
        className={input}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-md px-3 py-1.5 text-sm border " +
        (active
          ? "border-sky-500 bg-sky-50 text-sky-700"
          : "border-neutral-300 text-neutral-600 hover:bg-neutral-100")
      }
    >
      {children}
    </button>
  );
}

const input =
  "w-full rounded-md bg-white border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500";
const btnPrimary =
  "rounded-md px-4 py-2 text-sm bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50";
