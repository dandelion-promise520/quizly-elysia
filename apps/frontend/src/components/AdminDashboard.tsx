import type { Course, Question } from '@quizly/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import AdminQuestionEditor from '@/components/AdminQuestionEditor'
import AdminSidebar from '@/components/AdminSidebar'
import { Button } from '@/components/motion/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/motion/select'
import { batchBindQuestions, getCourses, getQuestions, saveCourses, saveQuestions, verifyAdminPassword } from '@/lib/api'

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('quizly_admin_authenticated') === 'true'
  })
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const [questions, setQuestions] = useState<Question[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)
  const [isNew, setIsNew] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
  const [tempCourses, setTempCourses] = useState<Course[]>([])

  const [isBatchMode, setIsBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [batchCourseId, setBatchCourseId] = useState<number | null>(null)
  const [batchCategoryId, setBatchCategoryId] = useState<number | null>(null)

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    verifyAdminPassword(passwordInput)
      .then((data) => {
        if (data.success) {
          sessionStorage.setItem('quizly_admin_authenticated', 'true')
          setIsAuthenticated(true)
          setAuthError(null)
        }
        else {
          setAuthError(data.error || '密码错误，请重新输入')
        }
      })
      .catch((err) => {
        console.error('密码验证出错:', err)
        setAuthError('网络错误或后端服务未启动')
      })
  }

  const { data: fetchedQuestions, isLoading: queryLoading, error: queryError, refetch } = useQuery<Question[]>({
    queryKey: ['questions'],
    queryFn: getQuestions,
    enabled: isAuthenticated,
  })

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: getCourses,
    enabled: isAuthenticated,
  })

  const handleOpenCourseModal = () => {
    setTempCourses(courses)
    setPageError(null)
    setIsCourseModalOpen(true)
  }

  const handleSaveCourses = async () => {
    try {
      const data = await saveCourses(tempCourses)
      if (data.success && data.courses) {
        void queryClient.invalidateQueries({ queryKey: ['courses'] })
        void queryClient.invalidateQueries({ queryKey: ['questions'] })
        setPageError(null)
        setIsCourseModalOpen(false)
      }
      else {
        setPageError(data.error || '保存课程失败')
      }
    }
    catch (err) {
      console.error('保存课程失败:', err)
      setPageError('保存课程失败')
    }
  }

  const handleToggleBatchMode = useCallback(() => {
    setIsBatchMode((prev) => {
      const next = !prev
      if (!next) {
        setSelectedIds(new Set())
      }
      return next
    })
  }, [])

  const handleToggleSelect = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      }
      else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback((ids: number[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        ids.forEach(id => next.add(id))
      }
      else {
        ids.forEach(id => next.delete(id))
      }
      return next
    })
  }, [])

  const handleOpenBatchModal = useCallback(() => {
    setBatchCourseId(null)
    setBatchCategoryId(null)
    setIsBatchModalOpen(true)
  }, [])

  const handleBatchBind = async () => {
    if (selectedIds.size === 0)
      return
    try {
      const res = await batchBindQuestions({
        questionIds: Array.from(selectedIds),
        courseId: batchCourseId,
        categoryId: batchCategoryId,
      })
      if (res.success) {
        void queryClient.invalidateQueries({ queryKey: ['questions'] })
        setIsBatchModalOpen(false)
        setIsBatchMode(false)
        setSelectedIds(new Set())
        setPageError(null)
      }
      else {
        setPageError(res.error || '批量修改失败')
      }
    }
    catch (err) {
      console.error('批量修改失败:', err)
      setPageError('网络错误，批量修改失败')
    }
  }

  useEffect(() => {
    if (fetchedQuestions) {
      setQuestions(fetchedQuestions)
      if (fetchedQuestions.length > 0) {
        setSelectedIndex(prev => (prev === null ? 0 : Math.min(prev, fetchedQuestions.length - 1)))
      }
      else {
        setSelectedIndex(null)
      }
    }
  }, [fetchedQuestions])

  const saveToDisk = useCallback(async (newQuestions: Question[]) => {
    try {
      const data = await saveQuestions(newQuestions)
      if (data.success && data.questions) {
        setQuestions(data.questions)
        void queryClient.invalidateQueries({ queryKey: ['questions'] })
      }
      else {
        throw new Error(data.error || 'Failed to save to database')
      }
    }
    catch (err) {
      console.error('保存数据库出错:', err)
      throw err
    }
  }, [queryClient])

  const handleSave = useCallback(
    async (q: Question) => {
      const next = [...questions]
      if (selectedIndex !== null) {
        next[selectedIndex] = q
      }
      setQuestions(next)
      setIsNew(false)
      try {
        await saveToDisk(next)
      }
      catch (err) {
        void refetch()
        throw err
      }
    },
    [questions, selectedIndex, saveToDisk, refetch],
  )

  const handleDelete = useCallback(
    (idx: number) => {
      const next = questions.filter((_, i) => i !== idx)
      setQuestions(next)

      if (selectedIndex === idx) {
        setSelectedIndex(next.length > 0 ? 0 : null)
      }
      else if (selectedIndex !== null && selectedIndex > idx) {
        setSelectedIndex(selectedIndex - 1)
      }

      setIsNew(false)
      void saveToDisk(next)
    },
    [questions, selectedIndex, saveToDisk],
  )

  const handleNew = () => {
    const emptyQ: Question = {
      type: '单选题',
      text: '',
      options: [
        { label: 'A', text: '选项 A' },
        { label: 'B', text: '选项 B' },
        { label: 'C', text: '选项 C' },
        { label: 'D', text: '选项 D' },
      ],
      answer: 'A',
    }
    const next = [...questions, emptyQ]
    setQuestions(next)
    setSelectedIndex(next.length - 1)
    setIsNew(true)
  }

  const handleExport = () => {
    const json = JSON.stringify(questions, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'questions.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file)
      return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (Array.isArray(data)) {
          setQuestions(data)
          saveToDisk(data)
          setSelectedIndex(0)
          setIsNew(false)
          setPageError(null)
        }
      }
      catch {
        setPageError('JSON 文件格式有误，请检查后重试。')
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current)
      fileInputRef.current.value = ''
  }
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden font-sans">
        {/* 背景动态渐变球 */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-teal-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">管理后台认证</h2>
          <p className="text-slate-400 text-sm mb-8 text-center">请输入管理员密码以访问控制台</p>

          <form onSubmit={handleAuthSubmit} className="w-full space-y-5">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入密码..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value)
                  if (authError)
                    setAuthError(null)
                }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-sm pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {authError && (
              <p className="text-red-400 text-xs mt-1 text-center font-medium animate-pulse">
                ⚠️
                {' '}
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-teal-600/20 cursor-pointer"
            >
              验证密码
            </button>
          </form>

          <Link
            to="/"
            className="text-xs text-slate-500 hover:text-teal-400 transition-colors mt-8 font-medium"
          >
            ← 返回答题页面
          </Link>
        </div>
      </div>
    )
  }

  if (queryLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-400">加载中...</div>
        </div>
      </div>
    )
  }

  if (queryError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md">
          <div className="text-red-500 text-lg font-semibold mb-2">加载失败</div>
          <div className="text-slate-600 text-sm mb-6">
            {queryError instanceof Error ? queryError.message : '数据加载失败，请确认后端服务是否启动'}
          </div>
          <Button variant="primary" onClick={() => { void refetch() }} className="px-6 py-2">
            重新加载
          </Button>
        </div>
      </div>
    )
  }

  const displayQuestion
    = selectedIndex !== null ? questions[selectedIndex] : null

  const renderCourseItems = () => {
    if (tempCourses.length === 0) {
      return (
        <div className="text-center py-8 text-slate-400 text-sm">
          目前暂无课程，请点击下方按钮新增。
        </div>
      )
    }

    return tempCourses.map((course, idx) => (
      <div key={course.id ?? `temp-${idx}`} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100/80 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md">课程</div>
          <input
            type="text"
            value={course.name}
            onChange={(e) => {
              const next = [...tempCourses]
              next[idx] = { ...next[idx], name: e.target.value }
              setTempCourses(next)
            }}
            placeholder="请输入课程名称"
            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg outline-none bg-white focus:border-teal-500 text-sm font-semibold focus:ring-1 focus:ring-teal-500 transition"
          />
          <button
            type="button"
            onClick={() => {
              const next = tempCourses.filter((_, i) => i !== idx)
              setTempCourses(next)
            }}
            className="w-8 h-8 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 flex items-center justify-center text-sm font-bold transition cursor-pointer"
            title="删除课程"
          >
            ×
          </button>
        </div>

        <div className="pl-6 border-l-2 border-slate-200/60 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">内部 Tab 分类:</span>
            <button
              type="button"
              onClick={() => {
                const next = [...tempCourses]
                const cats = [...(next[idx].categories || [])]
                cats.push({ id: undefined as any, name: '新分类', courseId: course.id })
                next[idx] = { ...next[idx], categories: cats }
                setTempCourses(next)
              }}
              className="text-[10px] font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded transition cursor-pointer"
            >
              + 添加分类
            </button>
          </div>

          {(course.categories || []).length === 0
            ? (
                <div className="text-[10px] text-slate-400 italic">暂无分类，请添加</div>
              )
            : (course.categories || []).map((cat, catIdx) => (
                <div key={cat.id ?? `cat-${catIdx}`} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => {
                      const next = [...tempCourses]
                      const cats = [...(next[idx].categories || [])]
                      cats[catIdx] = { ...cats[catIdx], name: e.target.value }
                      next[idx] = { ...next[idx], categories: cats }
                      setTempCourses(next)
                    }}
                    placeholder="分类名称"
                    className="flex-1 px-2.5 py-1 border border-slate-200 rounded-md outline-none bg-white focus:border-teal-500 text-xs focus:ring-1 focus:ring-teal-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...tempCourses]
                      const cats = (next[idx].categories || []).filter((_, i) => i !== catIdx)
                      next[idx] = { ...next[idx], categories: cats }
                      setTempCourses(next)
                    }}
                    className="w-6 h-6 rounded border border-red-50 text-red-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-xs font-semibold transition cursor-pointer"
                    title="删除分类"
                  >
                    ×
                  </button>
                </div>
              ))}
        </div>
      </div>
    ))
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar
        questions={questions}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        selectedId={selectedIndex}
        onSelect={(id) => {
          setSelectedIndex(id)
          setIsNew(false)
        }}
        onDelete={handleDelete}
        isBatchMode={isBatchMode}
        onToggleBatchMode={handleToggleBatchMode}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onOpenBatchModal={handleOpenBatchModal}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200">
          <Button
            variant="primary"
            size="sm"
            onClick={handleNew}
            className="px-5 py-2"
          >
            + 新增题目
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenCourseModal}
            className="px-5 py-2"
          >
            课程管理
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            className="px-5 py-2"
          >
            导出 JSON
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2"
          >
            导入 JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />

          <div className="flex-1" />

          <Link
            to="/"
            className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
          >
            ← 返回答题页面
          </Link>
        </div>

        {pageError && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {pageError}
          </div>
        )}

        {/* Editor */}
        {isBatchMode
          ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
                <div className="w-16 h-16 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center text-teal-600 mb-4 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">批量操作模式已启用</h3>
                <p className="text-slate-500 text-sm max-w-md mb-6">
                  在左侧侧边栏中勾选您需要修改的题目。
                  {selectedIds.size > 0
                    ? `已选中 ${selectedIds.size} 道题目，点击侧边栏下方的“修改所属课程与分类”即可进行批量修改。`
                    : '当前尚未选择任何题目。'}
                </p>
                {selectedIds.size > 0 && (
                  <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-xl p-4 text-left shadow-sm max-h-[300px] overflow-y-auto">
                    <div className="text-xs font-bold text-slate-400 mb-2.5 uppercase tracking-wider">已选题目列表:</div>
                    <div className="space-y-1.5">
                      {questions
                        .filter(q => q.id !== undefined && selectedIds.has(q.id))
                        .map((q, i) => (
                          <div key={q.id} className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="w-5 h-5 bg-teal-50 text-teal-600 font-bold rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">
                              {i + 1}
                            </span>
                            <span className="truncate flex-1 font-medium">{q.text}</span>
                            <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md flex-shrink-0 font-semibold">{q.type}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )
          : displayQuestion
            ? (
                <AdminQuestionEditor
                  key={isNew ? 'new' : String(selectedIndex)}
                  question={displayQuestion}
                  index={selectedIndex!}
                  onSave={handleSave}
                  isNew={isNew}
                  courses={courses}
                />
              )
            : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                  请选择或新增一道题目
                </div>
              )}
      </div>

      {/* Course Management Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">课程管理</h3>
                <p className="text-xs text-slate-500 mt-0.5">添加、修改或删除课程，删除课程将解除所有关联题目</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCourseModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 max-h-[60vh]">
              {renderCourseItems()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTempCourses(prev => [...prev, { id: undefined as any, name: '新课程', categories: [{ id: undefined as any, name: '基础题', courseId: undefined as any }] }])}
                className="px-4 py-2"
              >
                + 新增课程
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-700"
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveCourses}
                  className="px-5 py-2"
                >
                  保存并应用
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Update Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">批量修改所属课程与分类</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  将选中的
                  {selectedIds.size}
                  {' '}
                  道题目关联到指定的课程和分类
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  所属课程
                </label>
                <Select
                  value={batchCourseId ? String(batchCourseId) : 'none'}
                  onValueChange={(val) => {
                    const nextCourseId = val === 'none' ? null : Number(val)
                    const nextCourse = courses.find(c => c.id === nextCourseId)
                    const nextCategories = nextCourse?.categories || []
                    setBatchCourseId(nextCourseId)
                    setBatchCategoryId(nextCategories[0]?.id || null)
                  }}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="选择所属课程" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未分配课程 (清除)</SelectItem>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  分类
                </label>
                {batchCourseId
                  ? (
                      (() => {
                        const selectedCourse = courses.find(c => c.id === batchCourseId)
                        const categoryOptions = selectedCourse?.categories || []
                        if (categoryOptions.length > 0) {
                          return (
                            <Select
                              value={batchCategoryId ? String(batchCategoryId) : 'none'}
                              onValueChange={(val) => {
                                setBatchCategoryId(val === 'none' ? null : Number(val))
                              }}
                            >
                              <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="选择所属分类" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">未分配分类 (清除)</SelectItem>
                                {categoryOptions.map(cat => (
                                  <SelectItem key={cat.id} value={String(cat.id)}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )
                        }
                        return (
                          <div className="text-xs text-amber-600 bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
                            ⚠️ 当前选择的课程未配置任何内部分类，请先在顶部“课程管理”中配置分类。
                          </div>
                        )
                      })()
                    )
                  : (
                      <Select disabled value="disabled">
                        <SelectTrigger className="w-full bg-slate-50 text-slate-400 cursor-not-allowed">
                          <SelectValue placeholder="请先选择所属课程" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disabled">请先选择所属课程</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-700"
              >
                取消
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBatchBind}
                disabled={batchCourseId !== null && (courses.find(c => c.id === batchCourseId)?.categories || []).length === 0}
                className="px-5 py-2"
              >
                确认修改
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
