import type { Question } from '@quizly/types'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { checkAnswerCorrect, useQuizState } from '@/hooks/useQuizState'

import { getQuestions } from '@/lib/api'
import Header from './Header'
import { Tabs, TabsList, TabsTrigger } from './motion/tabs'
import ProgressBar from './ProgressBar'
import QuestionCard from './QuestionCard'
import QuizFooter from './QuizFooter'
import ResultBanner from './ResultBanner'
import Scoreboard from './Scoreboard'

export default function QuizPage() {
  const { data: initialQuestions = [], isLoading, error, refetch } = useQuery<Question[]>({
    queryKey: ['questions'],
    queryFn: getQuestions,
  })
  const [activeTab, setActiveTab] = useState<'basic' | 'sql'>('basic')

  const {
    questions,
    answers,
    doneFlags,
    pickAnswer,
    submitMulti,
    submitFill,
    submitAll,
    resetAll,
    hydrated,
  } = useQuizState(initialQuestions)

  const activeCategory = activeTab === 'sql' ? 'SQL填空题' : '基础题'

  const filteredItems = questions
    .map((q, i) => ({ q, originalIndex: i }))
    .filter((item) => {
      const isSql = item.q.category === 'SQL填空题'
      return activeTab === 'sql' ? isSql : !isSql
    })

  const tabTotal = filteredItems.length
  const tabAnswered = filteredItems.filter(item => doneFlags[item.originalIndex]).length

  // Calculate tab score
  const tabScore = filteredItems.reduce((acc, item) => {
    const isDone = doneFlags[item.originalIndex]
    if (!isDone)
      return acc
    const saved = answers[String(item.originalIndex)]
    if (saved === undefined)
      return acc
    const isRight = checkAnswerCorrect(item.q, saved)
    return acc + (isRight ? 5 : 0)
  }, 0)

  const tabAllDone = tabTotal > 0 && tabAnswered >= tabTotal

  if (isLoading || !hydrated) {
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
          <div className="text-slate-600 text-sm mb-6">
            {error instanceof Error ? error.message : '数据加载失败，请确认后端服务是否启动'}
          </div>
          <button
            type="button"
            onClick={() => { void refetch() }}
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
      <Header total={tabTotal} />
      <Scoreboard score={tabScore} answered={tabAnswered} total={tabTotal} />
      <ProgressBar answered={tabAnswered} total={tabTotal} />

      <div className="max-w-[720px] mx-auto px-5 pt-4 text-right">
        <Link to="/admin" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
          进入管理后台 →
        </Link>
      </div>

      <main className="max-w-[720px] mx-auto px-5 py-8 pb-20">
        <div className="flex justify-center mb-6">
          <Tabs
            value={activeTab}
            onValueChange={v => setActiveTab(v as 'basic' | 'sql')}
            variant="segment"
            className="w-full max-w-xs"
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger
                value="basic"
                className="text-sm py-2 w-full text-center"
                wrapperClassName="w-full flex justify-center"
              >
                基础理论题
              </TabsTrigger>
              <TabsTrigger
                value="sql"
                className="text-sm py-2 w-full text-center"
                wrapperClassName="w-full flex justify-center"
              >
                SQL操作题
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {tabAllDone && <ResultBanner score={tabScore} total={tabTotal * 5} />}

        <div className="text-sm font-semibold text-slate-900 mt-6 mb-5 pb-2.5 border-b-2 border-teal-600 inline-block">
          题目列表
        </div>

        {filteredItems.map((item, idx) => {
          const q = item.q
          const i = item.originalIndex
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
              displayIndex={idx + 1}
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
          allDone={tabAllDone}
          onSubmitAll={() => submitAll(activeCategory as 'SQL填空题' | '基础题')}
          onReset={resetAll}
        />
      </main>
    </div>
  )
}
