import type { Course, Question } from '@quizly/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Eye, EyeOff, ListChecks, Lock, Mail, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import AdminApiKeys from '@/components/AdminApiKeys'
import AdminNav, { type AdminSection } from '@/components/AdminNav'
import AdminQuestionEditor from '@/components/AdminQuestionEditor'
import AdminSidebar from '@/components/AdminSidebar'
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/motion/alert'
import { AnimatedBadge } from '@/components/motion/animated-badge'
import { AnimatedSidebarProvider } from '@/components/motion/animated-sidebar'
import { Button, ButtonLink } from '@/components/motion/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/motion/card'
import { CenterMorphModal, CenterMorphModalContent } from '@/components/motion/center-morph-modal'
import { Input } from '@/components/motion/input'
import { Loader } from '@/components/motion/loader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/motion/select'
import { useToast } from '@/components/toast-provider'
import { batchBindQuestions, getCourses, getQuestions, hasSession, saveCourses, saveQuestions, signIn, signOut } from '@/lib/api'

export default function AdminDashboard() {
  const toast = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(hasSession)
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const [questions, setQuestions] = useState<Question[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)
  const [isNew, setIsNew] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tempCourses, setTempCourses] = useState<Course[]>([])

  // 侧边栏当前分区，可用 ?section=api-keys 直接定位到某个分区
  const [section, setSection] = useState<AdminSection>(() => {
    const wanted = new URLSearchParams(window.location.search).get('section')
    return wanted === 'courses' || wanted === 'api-keys' ? wanted : 'questions'
  })

  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false)
  const [importData, setImportData] = useState<Question[] | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const [isBatchMode, setIsBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [batchCourseId, setBatchCourseId] = useState<number | null>(null)
  const [batchCategoryId, setBatchCategoryId] = useState<number | null>(null)

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting)
      return
    setIsSubmitting(true)
    try {
      const { error } = await signIn(emailInput.trim(), passwordInput)
      if (error) {
        setAuthError(error)
        toast.error('登录失败', error)
        return
      }
      setAuthError(null)
      setIsAuthenticated(true)
      toast.success('登录成功', '已进入管理后台')
    }
    catch (err) {
      console.error('登录出错:', err)
      const message = err instanceof Error ? err.message : '网络错误或后端服务未启动'
      setAuthError(message)
      toast.error('登录失败', message)
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setIsAuthenticated(false)
    setPasswordInput('')
    toast.info('已退出登录')
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

  const handleSectionChange = (next: AdminSection) => {
    // 进入课程分区时把服务端数据同步到编辑副本
    if (next === 'courses')
      setTempCourses(courses)
    setIsBatchMode(false)
    setSelectedIds(new Set())
    setPageError(null)
    setSection(next)
  }

  const handleSaveCourses = async () => {
    try {
      const data = await saveCourses(tempCourses)
      if (data.success && data.courses) {
        void queryClient.invalidateQueries({ queryKey: ['courses'] })
        void queryClient.invalidateQueries({ queryKey: ['questions'] })
        setPageError(null)
        setTempCourses(data.courses)
        toast.success('课程已保存', `共 ${data.courses.length} 个课程`)
      }
      else {
        const message = data.error || '保存课程失败'
        setPageError(message)
        toast.error('保存课程失败', message)
      }
    }
    catch (err) {
      console.error('保存课程失败:', err)
      setPageError('保存课程失败')
      toast.error('保存课程失败', err instanceof Error ? err.message : '请检查网络后重试')
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
        toast.success('已批量修改', `${selectedIds.size} 道题目已更新所属课程与分类`)
      }
      else {
        const message = res.error || '批量修改失败'
        setPageError(message)
        toast.error('批量修改失败', message)
      }
    }
    catch (err) {
      console.error('批量修改失败:', err)
      setPageError('网络错误，批量修改失败')
      toast.error('批量修改失败', err instanceof Error ? err.message : '请检查网络后重试')
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
        toast.success('题目已保存')
      }
      catch (err) {
        void refetch()
        toast.error('保存失败', err instanceof Error ? err.message : '请稍后重试')
        throw err
      }
    },
    [questions, selectedIndex, saveToDisk, refetch, toast],
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
        .then(() => toast.success('题目已删除'))
        .catch((err) => {
          toast.error('删除失败', err instanceof Error ? err.message : '请稍后重试')
          void refetch()
        })
    },
    [questions, selectedIndex, saveToDisk, refetch, toast],
  )

  const handleSelect = useCallback((id: number | null) => {
    setSelectedIndex(id)
    setIsNew(false)
  }, [])

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
    toast.success('已导出 questions.json', `共 ${questions.length} 道题目`)
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
          setImportData(data)
          setIsImportConfirmOpen(true)
          setPageError(null)
        }
        else {
          setPageError('导入失败：JSON 文件不是一个题目数组。')
          toast.error('导入失败', 'JSON 文件不是一个题目数组')
        }
      }
      catch {
        setPageError('JSON 文件格式有误，请检查后重试。')
        toast.error('导入失败', 'JSON 文件格式有误')
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current)
      fileInputRef.current.value = ''
  }

  const executeImport = async () => {
    if (!importData)
      return
    setIsImporting(true)
    try {
      await saveToDisk(importData)
      setIsImportConfirmOpen(false)
      setImportData(null)
      setSelectedIndex(0)
      setIsNew(false)
      toast.success('导入完成', `已写入 ${importData.length} 道题目`)
    }
    catch (err: any) {
      setPageError(`导入失败：${err.message || err}`)
      toast.error('导入失败', err instanceof Error ? err.message : '请检查文件后重试')
    }
    finally {
      setIsImporting(false)
    }
  }
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle as="h2">管理后台</CardTitle>
            <CardDescription>使用管理员账号登录控制台</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <Input
                label="邮箱"
                type="email"
                required
                autoComplete="username"
                placeholder="admin@quizly.dev"
                value={emailInput}
                onChange={(value) => {
                  setEmailInput(value)
                  if (authError)
                    setAuthError(null)
                }}
                leftIcon={<Mail />}
                autoFocus
              />

              <Input
                label="密码"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="请输入密码"
                value={passwordInput}
                onChange={(value) => {
                  setPasswordInput(value)
                  if (authError)
                    setAuthError(null)
                }}
                leftIcon={<Lock />}
                error={authError ?? undefined}
                rightIcon={(
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                )}
              />

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? '登录中' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          返回答题页面
        </Link>
      </div>
    )
  }

  if (queryLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader variant="dots" size={28} label="加载题目数据" />
        <p className="text-sm text-muted-foreground">正在加载题目数据</p>
      </div>
    )
  }

  if (queryError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle as="h2">加载失败</CardTitle>
            <CardDescription>
              {queryError instanceof Error ? queryError.message : '数据加载失败，请确认后端服务是否启动'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => { void refetch() }}>
              重新加载
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const displayQuestion
    = selectedIndex !== null ? questions[selectedIndex] : null

  const renderCourseItems = () => {
    if (tempCourses.length === 0) {
      return (
        <div className="py-10 text-center text-sm text-muted-foreground">
          还没有课程，点下方「新增课程」开始配置。
        </div>
      )
    }

    const updateCourse = (idx: number, patch: Partial<Course>) => {
      const next = [...tempCourses]
      next[idx] = { ...next[idx], ...patch }
      setTempCourses(next)
    }

    return tempCourses.map((course, idx) => (
      <Card key={course.id ?? `temp-${idx}`} size="compact">
        <CardHeader>
          <Input
            value={course.name}
            onChange={value => updateCourse(idx, { name: value })}
            placeholder="课程名称"
          />
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`删除课程 ${course.name || '未命名'}`}
              onClick={() => {
                setTempCourses(tempCourses.filter((_, i) => i !== idx))
                toast.info('课程已从列表中移除', '记得点「保存并应用」才会生效')
              }}
            >
              <Trash2 />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">内部分类</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const categories = [...(course.categories || [])]
                categories.push({ id: undefined as any, name: '新分类', courseId: course.id })
                updateCourse(idx, { categories })
              }}
            >
              <Plus />
              添加分类
            </Button>
          </div>

          {(course.categories || []).length === 0
            ? (
                <p className="text-xs text-muted-foreground">还没有分类，添加后题目才能归类。</p>
              )
            : (course.categories || []).map((cat, catIdx) => (
                <div key={cat.id ?? `cat-${catIdx}`} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    value={cat.name}
                    placeholder="分类名称"
                    onChange={(value) => {
                      const categories = [...(course.categories || [])]
                      categories[catIdx] = { ...categories[catIdx], name: value }
                      updateCourse(idx, { categories })
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`删除分类 ${cat.name || '未命名'}`}
                    onClick={() => {
                      const categories = (course.categories || []).filter((_, i) => i !== catIdx)
                      updateCourse(idx, { categories })
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
        </CardContent>
      </Card>
    ))
  }

  return (
    <AnimatedSidebarProvider defaultOpen={false} className="h-screen overflow-hidden bg-background">
      <AdminNav active={section} onChange={handleSectionChange} />

      {section === 'questions' && (
        <AdminSidebar
          questions={questions}
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          selectedId={selectedIndex}
          onSelect={handleSelect}
          onDelete={handleDelete}
          isBatchMode={isBatchMode}
          onToggleBatchMode={handleToggleBatchMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onOpenBatchModal={handleOpenBatchModal}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-card px-6 py-3">
          {section === 'questions' && (
            <>
              <Button size="sm" onClick={handleNew}>
                <Plus />
                新增题目
              </Button>

              <Button variant="secondary" size="sm" onClick={handleExport}>
                导出 JSON
              </Button>

              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                导入 JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </>
          )}

          <div className="flex-1" />

          <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
            退出登录
          </Button>

          <ButtonLink variant="ghost" size="sm" href="/">
            返回答题页面
          </ButtonLink>
        </div>

        {pageError && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertIcon />
              <AlertContent>
                <AlertTitle>操作未完成</AlertTitle>
                <AlertDescription>{pageError}</AlertDescription>
              </AlertContent>
            </Alert>
          </div>
        )}

        {/* Editor */}
        {section === 'api-keys'
          ? (
              <AdminApiKeys />
            )
          : section === 'courses'
            ? (
                <div className="flex min-h-0 flex-1 flex-col bg-background">
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="mx-auto flex max-w-3xl flex-col gap-4">
                      <header className="flex flex-col gap-1">
                        <h2 className="text-xl font-semibold text-foreground">课程管理</h2>
                        <p className="text-sm text-muted-foreground">
                          增删改课程与它下面的分类；删除课程会解除其下所有题目的关联。
                        </p>
                      </header>
                      {renderCourseItems()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border bg-card px-6 py-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setTempCourses(prev => [...prev, { id: undefined as any, name: '新课程', categories: [{ id: undefined as any, name: '基础题', courseId: undefined as any }] }])}
                    >
                      <Plus />
                      新增课程
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTempCourses(courses)
                          toast.info('已重置为已保存的内容')
                        }}
                      >
                        重置
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveCourses}
                      >
                        保存并应用
                      </Button>
                    </div>
                  </div>
                </div>
              )
            : isBatchMode
              ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background p-8 text-center">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <ListChecks className="size-6" />
                    </span>
                    <h3 className="text-base font-semibold text-foreground">批量操作模式</h3>
                    <p className="max-w-md text-sm text-muted-foreground">
                      在左侧列表里勾选要修改的题目。
                      {selectedIds.size > 0
                        ? `已选中 ${selectedIds.size} 道，点侧边栏下方的「修改所属课程与分类」继续。`
                        : '当前还没有选中任何题目。'}
                    </p>
                    {selectedIds.size > 0 && (
                      <Card className="max-h-[320px] w-full max-w-md overflow-y-auto text-left">
                        <CardHeader>
                          <CardTitle as="h4">已选题目</CardTitle>
                          <CardDescription>
                            共
                            {selectedIds.size}
                            {' '}
                            道
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="flex flex-col divide-y divide-border">
                            {questions
                              .filter(q => q.id !== undefined && selectedIds.has(q.id))
                              .map((q, i) => (
                                <li key={q.id} className="flex items-center gap-2 py-2 text-sm">
                                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                                  <span className="flex-1 truncate text-foreground">{q.text}</span>
                                  <AnimatedBadge size="sm" status="neutral">{q.type}</AnimatedBadge>
                                </li>
                              ))}
                          </ul>
                        </CardContent>
                      </Card>
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
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                      请选择或新增一道题目
                    </div>
                  )}
      </div>

      <CenterMorphModal open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <CenterMorphModalContent className="flex flex-col gap-5 p-6" ariaLabel="批量修改所属课程与分类">
          <div className="flex flex-col gap-1 pr-8">
            <h3 className="text-base font-semibold text-foreground">批量修改所属课程与分类</h3>
            <p className="text-sm text-muted-foreground">
              选中的
              {' '}
              {selectedIds.size}
              {' '}
              道题目会一起更新。
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="px-1 text-sm font-medium text-foreground">所属课程</span>
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择所属课程" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未分配课程（清除）</SelectItem>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="px-1 text-sm font-medium text-foreground">分类</span>
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
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="选择所属分类" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">未分配分类（清除）</SelectItem>
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
                        <Alert variant="warning">
                          <AlertIcon />
                          <AlertContent>
                            <AlertTitle>这门课还没有分类</AlertTitle>
                            <AlertDescription>先到「课程管理」里给它加分类，再回来批量绑定。</AlertDescription>
                          </AlertContent>
                        </Alert>
                      )
                    })()
                  )
                : (
                    <Select disabled value="disabled">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="请先选择所属课程" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">请先选择所属课程</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsBatchModalOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleBatchBind}
              disabled={batchCourseId !== null && (courses.find(c => c.id === batchCourseId)?.categories || []).length === 0}
            >
              确认修改
            </Button>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>

      <CenterMorphModal open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
        <CenterMorphModalContent className="flex flex-col gap-5 p-6" ariaLabel="确认导入题目">
          <div className="flex flex-col gap-1 pr-8">
            <h3 className="text-base font-semibold text-foreground">确认导入题目</h3>
            <p className="text-sm text-muted-foreground">
              导入会覆盖当前数据库里的全部题目，无法撤销。
            </p>
          </div>

          {importData && (
            <Alert variant="destructive">
              <AlertIcon />
              <AlertContent>
                <AlertTitle>
                  将写入
                  {' '}
                  {importData.length}
                  {' '}
                  道题目
                </AlertTitle>
                <AlertDescription>现有题目会被整体替换，建议先导出一份备份。</AlertDescription>
              </AlertContent>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsImportConfirmOpen(false)}>
              取消
            </Button>
            <Button disabled={isImporting} onClick={() => void executeImport()}>
              {isImporting ? '导入中' : '确认导入'}
            </Button>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>
    </AnimatedSidebarProvider>
  )
}
