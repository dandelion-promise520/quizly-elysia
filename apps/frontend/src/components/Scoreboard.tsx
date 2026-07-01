import { memo } from 'react'

interface ScoreboardProps {
  score: number
  answered: number
  total: number
}

function Scoreboard({ score, answered, total }: ScoreboardProps) {
  return (
    <div className="max-w-[720px] -mt-6 mx-auto px-5 relative z-[1]">
      <div className="bg-white border border-slate-200 rounded-xl px-7 py-5.5 flex items-center justify-between gap-5 shadow-md">
        <div className="text-center flex-1">
          <div className="text-[30px] font-bold text-teal-600 leading-none">{score}</div>
          <div className="text-xs text-slate-400 mt-1.5 font-medium">得分</div>
        </div>
        <div className="w-px h-10 bg-slate-200 flex-shrink-0" />
        <div className="text-center flex-1">
          <div className="text-[30px] font-bold text-teal-600 leading-none">{answered}</div>
          <div className="text-xs text-slate-400 mt-1.5 font-medium">已作答</div>
        </div>
        <div className="w-px h-10 bg-slate-200 flex-shrink-0" />
        <div className="text-center flex-1">
          <div className="text-[30px] font-bold text-teal-600 leading-none">{total - answered}</div>
          <div className="text-xs text-slate-400 mt-1.5 font-medium">剩余</div>
        </div>
      </div>
    </div>
  )
}

export default memo(Scoreboard)
