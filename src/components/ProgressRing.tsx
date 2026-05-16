export default function ProgressRing({ pct, size = 80, label }: { pct: number; size?: number; label?: string }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f2937" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#f59e0b" strokeWidth="6" fill="none"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-white font-bold text-lg leading-none">{pct}%</div>
        {label && <div className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">{label}</div>}
      </div>
    </div>
  )
}
