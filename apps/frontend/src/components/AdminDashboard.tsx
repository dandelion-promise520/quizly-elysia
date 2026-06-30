import type { Question } from '@quizly/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import AdminQuestionEditor from '@/components/AdminQuestionEditor'
import AdminSidebar from '@/components/AdminSidebar'
import { Button } from '@/components/motion/button'
import { getQuestions, saveQuestions } from '@/lib/api'

export default function AdminDashboard() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)
  const [isNew, setIsNew] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = () => {
    setLoading(true)
    setError(null)
    getQuestions()
      .then((data) => {
        setQuestions(data)
        setLoading(false)
        if (data.length > 0) {
          setSelectedIndex(0)
        }
        else {
          setSelectedIndex(null)
        }
      })
      .catch((err) => {
        console.error('加载管理后台数据出错:', err)
        setError('数据加载失败，请确认后端服务是否启动')
        setLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  const saveToDisk = async (newQuestions: Question[]) => {
    try {
      const data = await saveQuestions(newQuestions)
      if (data.success && data.questions) {
        setQuestions(data.questions)
      }
      else if (!data.success) {
        console.error('Failed to save to database:', data.error)
      }
    }
    catch (err) {
      console.error('Network error when saving to database:', err)
    }
  }

  const handleSave = useCallback(
    (q: Question) => {
      const next = [...questions]
      if (selectedIndex !== null) {
        next[selectedIndex] = q
      }
      setQuestions(next)
      setIsNew(false)
      void saveToDisk(next)
    },
    [questions, selectedIndex],
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
    [questions, selectedIndex],
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

  if (loading) {
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md">
          <div className="text-red-500 text-lg font-semibold mb-2">加载失败</div>
          <div className="text-slate-600 text-sm mb-6">{error}</div>
          <Button variant="primary" onClick={loadData} className="px-6 py-2">
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

          <a
            href="#/"
            className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
          >
            ← 返回答题页面
          </a>
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
