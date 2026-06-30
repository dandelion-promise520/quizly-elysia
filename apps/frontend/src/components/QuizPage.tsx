import type { Course, Question } from '@quizly/types'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { checkAnswerCorrect, useQuizState } from '@/hooks/useQuizState'

import { getCourses, getQuestions } from '@/lib/api'
import DbSchemaHelper from './DbSchemaHelper'
import Header from './Header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './motion/select'
import { Tabs, TabsList, TabsTrigger } from './motion/tabs'
import ProgressBar from './ProgressBar'
import QuestionCard from './QuestionCard'
import QuizFooter from './QuizFooter'
import ResultBanner from './ResultBanner'
import Scoreboard from './Scoreboard'

export default function QuizPage() {
  const { data: initialQuestions = [], isLoading: isQuestionsLoading, error: questionsError, refetch: refetchQuestions } = useQuery<Question[]>({
    queryKey: ['questions'],
    queryFn: getQuestions,
  })

  const { data: courses = [], isLoading: isCoursesLoading, error: coursesError, refetch: refetchCourses } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: getCourses,
  })

  const [activeCourseTab, setActiveCourseTab] = useState<string>('')
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')

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

  const activeCourseIdStr = activeCourseTab || (courses[0] ? String(courses[0].id) : '')
  const activeCourseIdNum = activeCourseIdStr ? Number(activeCourseIdStr) : undefined
  const activeCourse = useMemo(
    () => courses.find(c => String(c.id) === activeCourseIdStr),
    [courses, activeCourseIdStr],
  )

  const categoryList = useMemo(
    () => activeCourse?.categories || [],
    [activeCourse],
  )

  const currentCategoryIdStr = activeCategoryId || (categoryList[0] ? String(categoryList[0].id) : '')
  const currentCategoryIdNum = currentCategoryIdStr ? Number(currentCategoryIdStr) : undefined

  const isDbOrSqlActive = useMemo(() => {
    const courseName = activeCourse?.name.toLowerCase() || ''
    const currentCategory = categoryList.find(cat => String(cat.id) === currentCategoryIdStr)
    const categoryName = currentCategory?.name.toLowerCase() || ''
    return courseName.includes('数据库') || courseName.includes('sql') || categoryName.includes('sql') || categoryName.includes('数据库')
  }, [activeCourse, categoryList, currentCategoryIdStr])

  // 当切换课程或课程分类列表变化时，自动将选中的 Tab 归到第一个分类的 ID
  useEffect(() => {
    const hasCurrent = categoryList.some(cat => String(cat.id) === activeCategoryId)
    if (categoryList.length > 0 && !hasCurrent) {
      setActiveCategoryId(String(categoryList[0].id))
    }
  }, [activeCourseIdStr, categoryList, activeCategoryId])

  const filteredItems = questions
    .map((q, i) => ({ q, originalIndex: i }))
    .filter((item) => {
      return item.q.courseId === activeCourseIdNum && item.q.categoryId === currentCategoryIdNum
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

  const isLoading = isQuestionsLoading || isCoursesLoading
  const error = questionsError || coursesError
  const refetch = () => {
    void refetchQuestions()
    void refetchCourses()
  }

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
            onClick={refetch}
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

      <div className="max-w-[720px] mx-auto px-5 pt-4 flex justify-between items-center">
        {/* 课程切换下拉菜单 */}
        {courses.length > 0
          ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">切换课程:</span>
                <Select value={activeCourseIdStr} onValueChange={setActiveCourseTab}>
                  <SelectTrigger className="w-[180px] h-8 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-medium focus:ring-1 focus:ring-teal-500 outline-none">
                    <SelectValue placeholder="切换课程" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          : (
              <div />
            )}

        <Link to="/admin" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
          进入管理后台 →
        </Link>
      </div>

      <main className="max-w-[720px] mx-auto px-5 py-6 pb-20">
        {courses.length > 0 && (
          <>
            {categoryList.length > 0 && (
              <div className="flex justify-center mb-4">
                <Tabs
                  value={currentCategoryIdStr}
                  onValueChange={setActiveCategoryId}
                  variant="segment"
                >
                  <TabsList className="flex flex-wrap gap-1">
                    {categoryList.map(cat => (
                      <TabsTrigger
                        key={cat.id}
                        value={String(cat.id)}
                        className="text-sm py-2 px-4 text-center"
                        wrapperClassName="flex justify-center"
                      >
                        {cat.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            {categoryList.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                当前课程未配置分类，请到后台为该课程添加分类。
              </div>
            )}

            {tabAllDone && <ResultBanner score={tabScore} total={tabTotal * 5} />}

            {categoryList.length > 0 && (
              <>
                <div className="text-sm font-semibold text-slate-900 mt-4 mb-4 pb-2.5 border-b-2 border-teal-600 inline-block">
                  题目列表
                </div>

                {filteredItems.length > 0 && (
                  filteredItems.map((item, idx) => {
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
                  })
                )}

                {filteredItems.length === 0 && (
                  <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white text-sm">
                    当前分类下暂无题目。
                  </div>
                )}

                {filteredItems.length > 0 && (
                  <QuizFooter
                    allDone={tabAllDone}
                    onSubmitAll={() => submitAll(activeCourseIdNum, currentCategoryIdNum)}
                    onReset={resetAll}
                  />
                )}
              </>
            )}
          </>
        )}

        {courses.length === 0 && (
          <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white text-sm">
            暂无已发布课程，请到后台管理添加课程并关联题目。
          </div>
        )}
      </main>
      {isDbOrSqlActive && <DbSchemaHelper />}
    </div>
  )
}
