interface ProgressBarProps {
  answered: number
  total: number
}

export default function ProgressBar({ answered, total }: ProgressBarProps) {
  const pct = total > 0 ? (answered / total) * 100 : 0
  return (
    <div className="max-w-[720px] mt-4 mx-auto px-5">
      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-600 rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
