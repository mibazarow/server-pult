export default function Confirm({
  open,
  title,
  okText = "ОК",
  onOk,
  onCancel,
}: {
  open: boolean;
  title: string;
  okText?: string;
  onOk: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-96 rounded-xl border border-neutral-200 bg-white p-5 shadow-lg">
        <div className="mb-4 text-sm text-neutral-800">{title}</div>
        <div className="flex justify-end gap-2">
          <button className={btn} onClick={onCancel}>
            Отмена
          </button>
          <button className={btnPrimary} onClick={onOk}>
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}

const btn =
  "rounded-md px-4 py-1.5 text-sm border border-neutral-300 text-neutral-700 hover:bg-neutral-100";
const btnPrimary =
  "rounded-md px-4 py-1.5 text-sm bg-sky-600 text-white hover:bg-sky-500";
