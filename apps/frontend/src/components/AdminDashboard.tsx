import type { Question } from '@quizly/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import AdminQuestionEditor from '@/components/AdminQuestionEditor'
import AdminSidebar from '@/components/AdminSidebar'
import { Button } from '@/components/motion/button'
import { getQuestions, saveQuestions, verifyAdminPassword } from '@/lib/api'

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('quizly_admin_authenticated') === 'true'
  })
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const [questions, setQuestions] = useState<Question[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)
  const [isNew, setIsNew] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        }
      }
      catch {
        // eslint-disable-next-line no-alert
        alert('JSON 文件格式有误，请检查后重试。')
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

        {/* Editor */}
        {displayQuestion
          ? (
              <AdminQuestionEditor
                key={isNew ? 'new' : String(selectedIndex)}
                question={displayQuestion}
                index={selectedIndex!}
                onSave={handleSave}
                isNew={isNew}
              />
            )
          : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                请选择或新增一道题目
              </div>
            )}
      </div>
    </div>
  )
}
