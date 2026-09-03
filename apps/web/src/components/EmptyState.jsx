export function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line py-48 text-center">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {hint ? <p className="text-[13px] text-faint">{hint}</p> : null}
    </div>
  );
}
