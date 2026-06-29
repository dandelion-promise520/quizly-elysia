interface ResultBannerProps {
  score: number
  total: number
}

export default function ResultBanner({ score, total }: ResultBannerProps) {
  const pct = Math.round((score / total) * 100)
  let grade: string
  let color: string
  let bg: string
  if (pct >= 90) {
    grade = '优秀'
    color = '#166534'
    bg = '#dcfce7'
  }
  else if (pct >= 80) {
    grade = '良好'
    color = '#15803d'
    bg = '#bbf7d0'
  }
  else if (pct >= 70) {
    grade = '中等'
    color = '#a16207'
    bg = '#fef08a'
  }
  else if (pct >= 60) {
    grade = '及格'
    color = '#c2410c'
    bg = '#fed7aa'
  }
  else {
    grade = '不及格'
    color = '#991b1b'
    bg = '#fecaca'
  }

  return (
    <div className="text-center py-9 mb-6 rounded-xl bg-white border border-slate-200 shadow-md">
      <div className="text-[56px] font-bold text-teal-600 leading-none">
        {score}
        {' '}
        /
        {total}
      </div>
      <div className="text-sm text-slate-400 mt-2">
        总分
        {total}
        {' '}
        分
      </div>
      <span
        className="text-lg font-semibold mt-3.5 inline-block px-6 rounded-full"
        style={{ color, background: bg }}
      >
        {grade}
      </span>
    </div>
  )
}
