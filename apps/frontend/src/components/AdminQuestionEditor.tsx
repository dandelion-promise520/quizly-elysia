import type { Course, FillQuestion, Option, Question } from '@quizly/types'
import { Plus, Trash2 } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import { Button, StatefulButton } from './motion/button'
import { Input } from './motion/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './motion/select'
import { Tabs, TabsList, TabsTrigger } from './motion/tabs'

interface AdminQuestionEditorProps {
  question: Question
  index: number
  onSave: (q: Question) => Promise<void> | void
  isNew: boolean
  courses: Course[]
}

interface Draft {
  type: '单选题' | '判断题' | '多选题' | '填空题'
  text: string
  options?: Option[]
  answer: string | string[]
  blanks?: string[]
  categoryId?: number | null
  courseId?: number | null
}

function emptyDraft(type: Draft['type']): Draft {
  if (type === '填空题')
    return { type, text: '', answer: ['答案 1'], blanks: ['答案 1'], courseId: null, categoryId: null }
  const labels = type === '判断题' ? ['A', 'B'] : ['A', 'B', 'C', 'D']
  const texts
    = type === '判断题'
      ? ['正确', '错误']
      : ['选项 A', '选项 B', '选项 C', '选项 D']
  return {
    type,
    text: '',
    options: labels.map((l, i) => ({ label: l, text: texts[i] })),
    answer: labels[0],
    courseId: null,
    categoryId: null,
  }
}

function createDraftForTypeChange(prev: Draft, nextType: Draft['type']): Draft {
  if (nextType === '填空题') {
    return { ...emptyDraft(nextType), text: prev.text }
  }

  if (nextType === '判断题') {
    const answer
      = prev.answer === 'B'
        || (typeof prev.answer === 'string' && prev.answer.split(',').includes('B'))
        ? 'B'
        : 'A'
    return {
      type: nextType,
      text: prev.text,
      options: [
        { label: 'A', text: '正确' },
        { label: 'B', text: '错误' },
      ],
      answer,
      courseId: prev.courseId,
      categoryId: prev.categoryId,
    }
  }

  const defaultOptions = [
    { label: 'A', text: '选项 A' },
    { label: 'B', text: '选项 B' },
    { label: 'C', text: '选项 C' },
    { label: 'D', text: '选项 D' },
  ]
  const options
    = prev.options && prev.options.length > 0 ? prev.options : defaultOptions
  const validLabels = options.map(opt => opt.label)
  const answerLabels = Array.isArray(prev.answer)
    ? prev.answer.flatMap(value =>
        value.split(',').map(label => label.trim()),
      )
    : prev.answer.split(',').map(label => label.trim())
  const filteredLabels = answerLabels.filter(label =>
    validLabels.includes(label),
  )
  const answer
    = nextType === '多选题'
      ? filteredLabels.join(',') || validLabels[0]
      : filteredLabels[0] || validLabels[0]

  return {
    type: nextType,
    text: prev.text,
    options,
    answer,
    courseId: prev.courseId,
    categoryId: prev.categoryId,
  }
}

function AdminQuestionEditor({
  question,
  index,
  onSave,
  isNew,
  courses,
}: AdminQuestionEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => {
    const d = emptyDraft(question.type)
    d.text = question.text
    if ('options' in question)
      d.options = question.options
    d.answer = question.answer
    if ('blanks' in question)
      d.blanks = (question as FillQuestion).blanks
    d.categoryId = question.categoryId
    d.courseId = question.courseId
    return d
  })
  const [saveState, setSaveState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')

  useEffect(() => {
    const d = emptyDraft(question.type)
    d.text = question.text
    if ('options' in question)
      d.options = question.options
    d.answer = question.answer
    if ('blanks' in question)
      d.blanks = (question as FillQuestion).blanks
    d.categoryId = question.categoryId
    d.courseId = question.courseId
    setDraft(d)
  }, [question])

  const push = async () => {
    console.log('push function called inside AdminQuestionEditor!')
    setSaveState('loading')
    try {
      const q: Question = {
        id: question.id,
        type: draft.type,
        text: draft.text,
        answer: draft.answer,
        categoryId: draft.categoryId || null,
        courseId: draft.courseId || null,
        ...(draft.options ? { options: draft.options } : {}),
        ...(draft.blanks ? { blanks: draft.blanks } : {}),
      } as Question
      console.log('pushing question data to onSave:', q)
      await onSave(q)
      setSaveState('success')
      setTimeout(() => setSaveState('idle'), 1500)
    }
    catch (err) {
      console.error('error inside push function:', err)
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 1500)
    }
  }

  const setText = (v: string) => setDraft(d => ({ ...d, text: v }))

  const updateOption = (i: number, field: 'label' | 'text', v: string) => {
    setDraft((d) => {
      if (!d.options)
        return d
      const opts = [...d.options]
      opts[i] = { ...opts[i], [field]: v }
      return { ...d, options: opts }
    })
  }

  const setAnswerLabel = (v: string) => setDraft(d => ({ ...d, answer: v }))

  const addOption = () => {
    setDraft((d) => {
      const opts = [...(d.options ?? [])]
      const nextLabel = String.fromCharCode(65 + opts.length)
      opts.push({ label: nextLabel, text: `选项 ${nextLabel}` })
      return { ...d, options: opts }
    })
  }

  const removeOption = (i: number) => {
    setDraft((d) => {
      if (!d.options)
        return d
      const opts = d.options.filter((_, j) => j !== i)
      const ans = d.answer as string
      const removed = d.options[i]?.label ?? ''
      let newAnswer = ans
      if (d.type === '多选题') {
        const correctLabels = ans
          .split(',')
          .map(s => s.trim())
          .filter(l => l !== removed)
        newAnswer = correctLabels.join(',')
      }
      else {
        newAnswer = ans === removed ? (opts[0]?.label ?? '') : ans
      }
      return { ...d, options: opts, answer: newAnswer }
    })
  }

  const addBlank = () => {
    setDraft((d) => {
      const arr = [...(d.blanks ?? []), `答案 ${(d.blanks?.length ?? 0) + 1}`]
      return { ...d, blanks: arr, answer: arr }
    })
  }

  const updateBlank = (i: number, v: string) => {
    setDraft((d) => {
      const blanks = [...(d.blanks ?? [])]
      const answer = [...(d.answer as string[])]
      blanks[i] = v
      answer[i] = v
      return { ...d, blanks, answer }
    })
  }

  const removeBlank = (i: number) => {
    setDraft((d) => {
      const blanks = (d.blanks ?? []).filter((_, j) => j !== i)
      const answer = (d.answer as string[]).filter((_, j) => j !== i)
      return { ...d, blanks, answer }
    })
  }

  const selectedCourse = courses.find(c => c.id === draft.courseId)
  const categoryOptions = selectedCourse?.categories || []

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          {!isNew && (
            <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
              第
              {' '}
              {index + 1}
              {' '}
              题
            </span>
          )}
          <span className="text-sm font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {draft.type}
          </span>
        </div>

        {/* Type selector */}
        <Tabs
          value={draft.type}
          onValueChange={(val) => {
            const nextType = val as Draft['type']
            setDraft(d => createDraftForTypeChange(d, nextType))
          }}
          variant="segment"
          className="max-w-lg"
        >
          <TabsList className="justify-start gap-2">
            <TabsTrigger
              value="单选题"
              className="text-sm px-3 py-2 min-w-[72px]"
            >
              单选
            </TabsTrigger>
            <TabsTrigger
              value="多选题"
              className="text-sm px-3 py-2 min-w-[72px]"
            >
              多选
            </TabsTrigger>
            <TabsTrigger
              value="判断题"
              className="text-sm px-3 py-2 min-w-[72px]"
            >
              判断
            </TabsTrigger>
            <TabsTrigger
              value="填空题"
              className="text-sm px-3 py-2 min-w-[72px]"
            >
              填空
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Course selector */}
        <div className="max-w-lg">
          <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
            所属课程
          </label>
          <Select
            value={draft.courseId ? String(draft.courseId) : 'none'}
            onValueChange={(val) => {
              const nextCourseId = val === 'none' ? null : Number(val)
              const nextCourse = courses.find(c => c.id === nextCourseId)
              const nextCategories = nextCourse?.categories || []
              setDraft(d => ({
                ...d,
                courseId: nextCourseId,
                categoryId: nextCategories[0]?.id || null, // 切换课程时自动将其分类归到该课程的第一个分类下
              }))
            }}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="选择所属课程" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">未分配课程</SelectItem>
              {courses.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category selector */}
        <div className="max-w-lg">
          <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
            分类
          </label>
          {categoryOptions.length > 0
            ? (
                <Select
                  value={draft.categoryId ? String(draft.categoryId) : ''}
                  onValueChange={(val) => {
                    setDraft(d => ({ ...d, categoryId: val ? Number(val) : null }))
                  }}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="选择所属分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            : (
                <div className="text-xs text-warning bg-warning/10 px-4 py-3 rounded-lg border border-warning/30 inline-block w-full">
                  当前选择的课程未配置任何内部分类，请先在左侧「课程管理」中配置分类。
                </div>
              )}
        </div>

        {/* Question text */}
        <div>
          <label className="block text-sm font-semibold text-foreground/80 mb-1.5">
            题干
          </label>
          <textarea
            className="w-full px-4 py-3 border border-border rounded-lg outline-none bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/40 resize-y min-h-[80px] text-sm placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/70"
            value={draft.text}
            onChange={e => setText(e.target.value)}
            placeholder="输入题干内容…"
          />
        </div>

        {/* Choice / Judgment editor */}
        {draft.type !== '填空题' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground/80">
                选项
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addOption}
              >
                <Plus />
                添加选项
              </Button>
            </div>

            {(draft.options ?? []).map((opt: Option, i: number) => (
              <div key={opt.label} className="flex items-center gap-2">
                <Input
                  className="w-14 shrink-0"
                  value={opt.label}
                  onChange={value => updateOption(i, 'label', value)}
                />
                <Input
                  className="flex-1"
                  value={opt.text}
                  onChange={value => updateOption(i, 'text', value)}
                  placeholder="选项内容"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(i)}
                  aria-label={`删除选项 ${opt.label}`}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}

            {draft.type !== '多选题' && typeof draft.answer === 'string' && (
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-semibold text-foreground/80">
                  正确答案
                </label>
                <Select value={draft.answer} onValueChange={setAnswerLabel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择正确答案" />
                  </SelectTrigger>
                  <SelectContent>
                    {(draft.options ?? []).map((opt: Option) => (
                      <SelectItem key={opt.label} value={opt.label}>
                        {opt.label}
                        {' '}
                        —
                        {opt.text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {draft.type === '多选题' && typeof draft.answer === 'string' && (
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-semibold text-foreground/80">
                  正确答案（可多选）
                </label>
                <div className="flex gap-2.5">
                  {(draft.options ?? []).map((opt: Option) => {
                    const correctLabels = (draft.answer as string)
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                    const isCorrect = correctLabels.includes(opt.label)
                    return (
                      <Button
                        key={opt.label}
                        variant={isCorrect ? 'primary' : 'secondary'}
                        size="icon"
                        aria-label={`${isCorrect ? '取消' : '设为'}正确答案 ${opt.label}`}
                        aria-pressed={isCorrect}
                        onClick={() => {
                          let nextLabels
                          if (isCorrect) {
                            nextLabels = correctLabels.filter(
                              l => l !== opt.label,
                            )
                          }
                          else {
                            nextLabels = [...correctLabels, opt.label]
                          }
                          const order = (draft.options ?? []).map(
                            o => o.label,
                          )
                          nextLabels.sort(
                            (a, b) => order.indexOf(a) - order.indexOf(b),
                          )
                          setDraft(d => ({
                            ...d,
                            answer: nextLabels.join(','),
                          }))
                        }}
                      >
                        {opt.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fill editor */}
        {draft.type === '填空题' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground/80">
                填空答案（
                {(draft.blanks ?? []).length}
                {' '}
                空）
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addBlank}
              >
                <Plus />
                添加空位
              </Button>
            </div>

            {(draft.blanks ?? []).map((_: string, i: number) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`blank-${i}`} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm text-muted-foreground tabular-nums">
                  {i + 1}
                  .
                </span>
                <Input
                  className="flex-1"
                  value={(draft.answer as string[])[i]}
                  onChange={value => updateBlank(i, value)}
                  placeholder={`第 ${i + 1} 空答案`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBlank(i)}
                  aria-label={`删除第 ${i + 1} 空`}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <StatefulButton
            variant="primary"
            size="md"
            state={saveState}
            onClick={push}
            loadingText={isNew ? '创建中' : '保存中'}
            successText={isNew ? '创建成功' : '保存成功'}
            errorText="保存失败"
            className="px-8 py-2.5"
          >
            {isNew ? '创建题目' : '保存修改'}
          </StatefulButton>
        </div>
      </div>
    </div>
  )
}

export default memo(AdminQuestionEditor)
