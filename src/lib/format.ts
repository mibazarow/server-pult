export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м ${s % 60}с`;
}

export function fmtMib(mib: number | null | undefined): string {
  if (mib == null) return "—";
  if (mib >= 1024) return `${(mib / 1024).toFixed(1)} ГБ`;
  return `${Math.round(mib)} МБ`;
}

export function fmtNum(v: number | null | undefined, suffix = ""): string {
  if (v == null) return "—";
  return `${Math.round(v * 10) / 10}${suffix}`;
}
