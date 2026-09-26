export default function ComingSoon({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-2 text-neutral-900">{title}</h1>
      <p className="text-sm text-neutral-500">{note}</p>
      <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-6 text-sm text-neutral-500">
        В разработке.
      </div>
    </div>
  );
}
