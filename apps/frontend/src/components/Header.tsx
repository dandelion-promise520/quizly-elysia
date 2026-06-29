interface HeaderProps {
  total: number
}

export default function Header({ total }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 pt-14 pb-12 text-center">
      <span className="inline-block text-xs font-semibold tracking-wide text-teal-600 bg-teal-50 px-4 py-1.5 rounded-full mb-5 border border-teal-200">
        数据库系统原理
      </span>
      <h1 className="text-[30px] font-bold text-slate-900 tracking-tight mb-2">
        综合测试
      </h1>
      <p className="text-sm text-slate-500 max-w-[480px] mx-auto">
        共
        {' '}
        {total}
        {' '}
        题 · 每题 5 分 · 满分
        {' '}
        {total * 5}
        {' '}
        分 · 题目顺序与选项均已随机打乱
      </p>
    </header>
  )
}
