import type { Question } from '@quizly/types'
import { useEffect, useState } from 'react'
import { useQuizState } from '@/hooks/useQuizState'
import { getQuestions } from '@/lib/api'
import Header from './Header'
import ProgressBar from './ProgressBar'
import QuestionCard from './QuestionCard'
import QuizFooter from './QuizFooter'
import ResultBanner from './ResultBanner'
import Scoreboard from './Scoreboard'

export default function QuizPage() {
  const [initialQuestions, setInitialQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = () => {
    setLoading(true)
    setError(null)
    getQuestions()
      .then((data) => {
        setInitialQuestions(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('加载题目出错:', err)
        setError('数据加载失败，请确认后端服务是否启动')
        setLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  const {
    questions,
    score,
    answered,
    total,
    answers,
    doneFlags,
    pickAnswer,
    submitMulti,
    submitFill,
    submitAll,
    resetAll,
    hydrated,
  } = useQuizState(initialQuestions)

  const allDone = answered >= total

  if (loading || !hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-400">加载中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
          <div className="text-red-500 text-lg font-semibold mb-2">加载失败</div>
          <div className="text-slate-600 text-sm mb-6">{error}</div>
          <button
            type="button"
            onClick={loadData}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <Header total={total} />
      <Scoreboard score={score} answered={answered} total={total} />
      <ProgressBar answered={answered} total={total} />

      <div className="max-w-[720px] mx-auto px-5 pt-4 text-right">
        <a href="#/admin" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
          进入管理后台 →
        </a>
      </div>

      <main className="max-w-[720px] mx-auto px-5 py-8 pb-20">
        {allDone && <ResultBanner score={score} total={total * 5} />}

        <div className="text-sm font-semibold text-slate-900 mt-11 mb-5 pb-2.5 border-b-2 border-teal-600 inline-block">
          题目列表
        </div>

        {questions.map((q: Question, i: number) => {
          const done = !!doneFlags[i]
          const saved = answers[String(i)]
          let selectedIdx: number | undefined
          let selectedIndices: number[] | undefined
          let userAnswers: string[] | undefined

          if (saved !== undefined) {
            if (typeof saved === 'number') {
              selectedIdx = saved
            }
            else if (Array.isArray(saved)) {
              if (q.type === '多选题') {
                selectedIndices = saved as number[]
              }
              else {
                userAnswers = saved as string[]
              }
            }
          }

          return (
            <QuestionCard
              key={q.id ?? `q-${i}`}
              question={q}
              index={i}
              done={done}
              selectedIdx={selectedIdx}
              selectedIndices={selectedIndices}
              userAnswers={userAnswers}
              onPick={pickAnswer}
              onSubmitMulti={submitMulti}
              onSubmitFill={submitFill}
            />
          )
        })}

        <QuizFooter
          allDone={allDone}
          onSubmitAll={submitAll}
          onReset={resetAll}
        />
      </main>
    </div>
  )
}
