import { memo } from 'react'

interface ProgressBarProps {
  answered: number
  total: number
}

function ProgressBar({ answered, total }: ProgressBarProps) {
  const pct = total > 0 ? (answered / total) * 100 : 0
  return (
    <div className="max-w-[720px] mt-4 mx-auto px-5">
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default memo(ProgressBar)
