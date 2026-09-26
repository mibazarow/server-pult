import { useState, type ReactNode } from "react";

import JobPanel from "../components/JobPanel";
import { useGlobalJob } from "../state/job";
import { runImage } from "../lib/api";

const DEFAULT_POSITIVE =
  "masterpiece, best quality, highly detailed, sharp focus, professional lighting, " +
  "realistic anatomy, correct proportions, natural pose";

const DEFAULT_NEGATIVE =
  "low quality, worst quality, blurry, lowres, jpeg artifacts, extra fingers, " +
  "extra limbs, deformed hands, bad anatomy, bad proportions, mutated, disfigured, " +
  "watermark, text, signature, cropped, out of frame";

type Size = { label: string; w: number; h: number };
type Group = { group: string; items: Size[] };

const SIZES: Group[] = [
  {
    group: "Квадрат",
    items: [
      { label: "512 × 512", w: 512, h: 512 },
      { label: "640 × 640", w: 640, h: 640 },
      { label: "768 × 768", w: 768, h: 768 },
      { label: "896 × 896", w: 896, h: 896 },
      { label: "1024 × 1024", w: 1024, h: 1024 },
      { label: "1152 × 1152", w: 1152, h: 1152 },
      { label: "1280 × 1280", w: 1280, h: 1280 },
      { label: "1536 × 1536", w: 1536, h: 1536 },
    ],
  },
  {
    group: "Горизонтально",
    items: [
      { label: "1024 × 768", w: 1024, h: 768 },
      { label: "1280 × 1024", w: 1280, h: 1024 },
      { label: "1152 × 896", w: 1152, h: 896 },
      { label: "1344 × 768", w: 1344, h: 768 },
      { label: "1280 × 720", w: 1280, h: 720 },
      { label: "1536 × 864", w: 1536, h: 864 },
    ],
  },
  {
    group: "Вертикально",
    items: [
      { label: "768 × 1024", w: 768, h: 1024 },
      { label: "1024 × 1280", w: 1024, h: 1280 },
      { label: "896 × 1152", w: 896, h: 1152 },
      { label: "768 × 1344", w: 768, h: 1344 },
      { label: "720 × 1280", w: 720, h: 1280 },
      { label: "864 × 1536", w: 864, h: 1536 },
    ],
  },
];

const FLAT: Size[] = SIZES.flatMap((g) => g.items);

export default function Images() {
  const [prompt, setPrompt] = useState(DEFAULT_POSITIVE);
  const [negative, setNegative] = useState(DEFAULT_NEGATIVE);
  const [sizeLabel, setSizeLabel] = useState("1024 × 1024");
  const [steps, setSteps] = useState(50);
  const [cfg, setCfg] = useState(4.0);
  const [upscale, setUpscale] = useState(false);
  const [starting, setStarting] = useState(false);
  const { job, saved, error, busy, start, cancel } = useGlobalJob();

  async function generate() {
    if (!prompt.trim()) return;
    setStarting(true);
    try {
      const s = FLAT.find((x) => x.label === sizeLabel) ?? FLAT[4];
      const r = await runImage({
        prompt,
        negative,
        width: s.w,
        height: s.h,
        steps,
        cfg,
        upscale,
      });
      start(r.job_id);
    } catch (e) {
      alert(String(e));
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Картинки</h1>
      <p className="text-sm text-neutral-500 mb-5">
        Z-Image; результат сохраняется в ~/Downloads/generated. Промты уже заполнены —
        правь под задачу.
      </p>

      <label className="block mb-3">
        <div className="text-xs text-neutral-500 mb-1">Позитивный промт</div>
        <textarea
          className={input + " h-28 resize-y"}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <Hint>Что нарисовать: сюжет, стиль, детали, освещение. Чем конкретнее — тем точнее.</Hint>
      </label>

      <label className="block mb-3">
        <div className="text-xs text-neutral-500 mb-1">Негативный промт</div>
        <textarea
          className={input + " h-20 resize-y"}
          value={negative}
          onChange={(e) => setNegative(e.target.value)}
        />
        <Hint>
          Чего не должно быть. Помогает убрать лишние пальцы, деформации рук,
          артефакты и водяные знаки.
        </Hint>
      </label>

      <div className="flex gap-4 flex-wrap items-start">
        <label className="block w-48">
          <div className="text-xs text-neutral-500 mb-1">Размер</div>
          <select
            className={input}
            value={sizeLabel}
            onChange={(e) => setSizeLabel(e.target.value)}
          >
            {SIZES.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((s) => (
                  <option key={s.label} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Hint>
            Больше размер — выше детализация и дольше генерация. Для персонажа бери
            вертикальный.
          </Hint>
        </label>

        <NumField
          label="Шаги (steps)"
          value={steps}
          onChange={setSteps}
          hint="Число проходов диффузии. Больше — детальнее и дольше. Обычно 25–50."
        />
        <NumField
          label="CFG"
          value={cfg}
          onChange={setCfg}
          step={0.1}
          hint="Насколько строго следовать промту. Выше — точнее, но возможны артефакты. Обычно 3–7."
        />
      </div>

      <label className="flex items-start gap-2 text-sm mt-4">
        <input
          type="checkbox"
          className="mt-1"
          checked={upscale}
          onChange={(e) => setUpscale(e.target.checked)}
        />
        <span>
          SUPIR ×2
          <Hint>
            После генерации увеличит картинку ровно в 2 раза в обе стороны и добавит
            детали. Работает дольше и может слегка менять изображение.
          </Hint>
        </span>
      </label>

      <div className="mt-5">
        <button className={btnPrimary} onClick={generate} disabled={starting || busy}>
          {busy ? "Генерация…" : "Генерировать"}
        </button>
      </div>

      <JobPanel job={job} saved={saved} error={error} busy={busy} onCancel={cancel} />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  hint?: ReactNode;
}) {
  return (
    <label className="block w-40">
      <div className="text-xs text-neutral-500 mb-1">{label}</div>
      <input
        className={input}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <Hint>{hint}</Hint>}
    </label>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <div className="text-[11px] leading-snug text-neutral-400 mt-1">{children}</div>;
}

const input =
  "w-full rounded-md bg-white border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500";
const btnPrimary =
  "rounded-md px-4 py-2 text-sm bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50";
