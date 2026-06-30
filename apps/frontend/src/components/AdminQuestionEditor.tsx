import type { FillQuestion, Option, Question } from '@quizly/types'
import { useEffect, useState } from 'react'
import { Button, StatefulButton } from './motion/button'
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
}

interface Draft {
  type: '单选题' | '判断题' | '多选题' | '填空题'
  text: string
  options?: Option[]
  answer: string | string[]
  blanks?: string[]
  category?: string
}

function emptyDraft(type: Draft['type']): Draft {
  if (type === '填空题')
    return { type, text: '', answer: ['答案 1'], blanks: ['答案 1'] }
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
  }
}

export default function AdminQuestionEditor({
  question,
  index,
  onSave,
  isNew,
}: AdminQuestionEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => {
    const d = emptyDraft(question.type)
    d.text = question.text
    if ('options' in question)
      d.options = question.options
    d.answer = question.answer
    if ('blanks' in question)
      d.blanks = (question as FillQuestion).blanks
    d.category = question.category
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
    d.category = question.category
    setDraft(d)
  }, [question])

  const push = async () => {
    console.log('push function called inside AdminQuestionEditor!')
    setSaveState('loading')
    try {
      const q: Question = {
        type: draft.type,
        text: draft.text,
        answer: draft.answer,
        category: draft.category || '基础题',
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

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          {!isNew && (
            <span className="text-sm font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
              第
              {' '}
              {index + 1}
              {' '}
              题
            </span>
          )}
          <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
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

        {/* Category input */}
        <div className="max-w-lg">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            分类
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-teal-500 text-sm"
            value={draft.category || ''}
            onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
            placeholder="请输入分类，如：基础题、SQL填空题"
          />
        </div>

        {/* Question text */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            题干
          </label>
          <textarea
            className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-y min-h-[80px] text-sm"
            value={draft.text}
            onChange={e => setText(e.target.value)}
            placeholder="输入题干内容…"
          />
        </div>

        {/* Choice / Judgment editor */}
        {draft.type !== '填空题' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                选项
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addOption}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold px-2 h-7"
              >
                + 添加选项
              </Button>
            </div>

            {(draft.options ?? []).map((opt: Option, i: number) => (
              <div key={opt.label} className="flex items-center gap-2">
                <input
                  value={opt.label}
                  onChange={e => updateOption(i, 'label', e.target.value)}
                  className="w-10 px-2 py-2 text-sm border border-slate-200 rounded text-center font-bold outline-none focus:border-teal-500"
                />
                <input
                  value={opt.text}
                  onChange={e => updateOption(i, 'text', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded outline-none focus:border-teal-500"
                  placeholder="选项内容"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(i)}
                  className="w-8 h-8 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="删除选项"
                >
                  ×
                </Button>
              </div>
            ))}

            {draft.type !== '多选题' && typeof draft.answer === 'string' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
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
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
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
                      <button
                        key={opt.label}
                        type="button"
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
                        className={`w-10 h-10 rounded-lg border text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center ${
                          isCorrect
                            ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fill editor */}
        {draft.type === '填空题' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                填空答案（
                {(draft.blanks ?? []).length}
                {' '}
                空）
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addBlank}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold px-2 h-7"
              >
                + 添加空位
              </Button>
            </div>

            {(draft.blanks ?? []).map((_: string, i: number) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`blank-${i}`} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 w-6 text-center">
                  {i + 1}
                  .
                </span>
                <input
                  value={(draft.answer as string[])[i]}
                  onChange={e => updateBlank(i, e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded outline-none focus:border-teal-500"
                  placeholder={`第 ${i + 1} 空答案`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBlank(i)}
                  className="w-8 h-8 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="删除空位"
                >
                  ×
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
