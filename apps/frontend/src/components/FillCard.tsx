import type { FillQuestion } from '@quizly/types'
import { useState } from 'react'
import { Button } from './motion/button'

interface FillCardProps {
  question: FillQuestion
  index: number
  done: boolean
  userAnswers?: string[]
  onSubmit: (qi: number, answers: string[]) => void
}

export default function FillCard({
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
      {Array.from({ length: blankCount }).map((_, b) => (
        <div key={`blank-${b}`} className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">
            {b + 1}
            .
          </span>
          <input
            type="text"
            className="flex-1 px-3.5 py-2 border border-slate-200 rounded-lg text-[14.5px] font-sans outline-none transition-colors duration-200 bg-white disabled:cursor-default"
            placeholder="请输入答案"
            disabled={done}
            value={inputs[b] || ''}
            onChange={e =>
              setInputs((prev) => {
                const next = [...prev]
                next[b] = e.target.value
                return next
              })}
            style={
              done
                ? {
                    borderColor:
                      inputs[b] === question.answer[b]
                        ? 'var(--color-success-border)'
                        : 'var(--color-error-border)',
                    backgroundColor:
                      inputs[b] === question.answer[b]
                        ? 'var(--color-success-light)'
                        : 'var(--color-error-light)',
                  }
                : undefined
            }
          />
        </div>
      ))}
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
