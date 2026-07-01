import type { FillQuestion } from '@quizly/types'
import { memo, useState } from 'react'
import { normalizeSql } from '@/hooks/useQuizState'
import { cn } from '@/lib/utils'
import { Button } from './motion/button'

interface FillCardProps {
  question: FillQuestion
  index: number
  done: boolean
  userAnswers?: string[]
  onSubmit: (qi: number, answers: string[]) => void
}

function FillCard({
  question,
  index,
  done,
  userAnswers,
  onSubmit,
}: FillCardProps) {
  const answersArr = Array.isArray(question.answer) ? question.answer : [question.answer || '']
  const blankCount = answersArr.length
  const [inputs, setInputs] = useState<string[]>(
    userAnswers ?? answersArr.map(() => ''),
  )

  const handleSubmit = () => {
    onSubmit(index, inputs)
  }

  return (
    <div className="flex flex-col gap-2.5 mt-1">
      {Array.from({ length: blankCount }).map((_, b) => {
        const isBlankCorrect = question.category?.name === 'SQL填空题'
          ? normalizeSql(inputs[b]) === normalizeSql(question.answer[b])
          : inputs[b] === question.answer[b]

        return (
          // eslint-disable-next-line react/no-array-index-key
          <div key={`blank-${b}`} className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-secondary whitespace-nowrap">
              {b + 1}
              .
            </span>
            <input
              type="text"
              className={cn(
                'flex-1 px-3.5 py-2 border border-border rounded-lg text-[14.5px] font-sans outline-none transition-colors duration-200 bg-background disabled:cursor-default text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500',
                done && isBlankCorrect && 'border-success-border bg-success-light',
                done && !isBlankCorrect && 'border-error-border bg-error-light',
              )}
              placeholder="请输入答案"
              disabled={done}
              value={inputs[b] || ''}
              onChange={e =>
                setInputs((prev) => {
                  const next = [...prev]
                  next[b] = e.target.value
                  return next
                })}
            />
          </div>
        )
      })}
      {!done && (
        <Button
          variant="primary"
          size="sm"
          className="self-end px-7 py-2 font-sans"
          onClick={handleSubmit}
        >
          提交答案
        </Button>
      )}
    </div>
  )
}

export default memo(FillCard)
