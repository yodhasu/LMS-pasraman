export default function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-[#1F3D30]/8 overflow-hidden">
        <div className="h-full rounded-full bg-[#1F3D30] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-[#5C7A6E] w-9 text-right">{pct}%</span>
    </div>
  );
}
