import type { ReactNode } from "react";

export default function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {title}
        </div>
        {right}
      </div>
      <div>{children}</div>
    </div>
  );
}
