import type { MultiChoiceQuestion } from '@quizly/types'
import { motion, useReducedMotion } from 'motion/react'
import { memo, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './motion/button'
import { Checkbox } from './motion/checkbox'

interface MultiChoiceCardProps {
  question: MultiChoiceQuestion
  index: number
  done: boolean
  selectedIndices?: number[]
  onSubmit: (qi: number, indices: number[]) => void
}

function MultiChoiceCard({
  question,
  index,
  done,
  selectedIndices,
  onSubmit,
}: MultiChoiceCardProps) {
  const opts = question.shuffledOptions || question.options
  const correctIndices = question.correctShuffledIndices || []

  const [selected, setSelected] = useState<number[]>(selectedIndices || [])
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const reduce = useReducedMotion()

  // Keep state sync if selectedIndices changes (e.g. on reset)
  useEffect(() => {
    setSelected(selectedIndices || [])
  }, [selectedIndices])

  const toggleOption = (oi: number) => {
    if (done)
      return
    setSelected((prev) => {
      if (prev.includes(oi)) {
        return prev.filter(i => i !== oi)
      }
      else {
        return [...prev, oi].sort((a, b) => a - b)
      }
    })
  }

  const handleSubmit = () => {
    onSubmit(index, selected)
  }

  return (
    <div
      className="flex flex-col gap-2.5 mt-1"
      onMouseLeave={() => !done && setHoveredIdx(null)}
    >
      <div className="flex flex-col gap-1.5 pl-0">
        {opts.map((opt: { label: string, text: string }, oi: number) => {
          const isSelected = selected.includes(oi)
          const isCorrect = correctIndices.includes(oi)
          const isWrong = done && isSelected && !isCorrect

          const optCls = cn(
            'relative isolate flex items-center gap-3 p-3 my-[2px] border rounded-xl cursor-pointer select-none bg-card transition-all duration-200',
            done ? 'cursor-default pointer-events-none border-border' : 'border-border hover:border-slate-300',
            isSelected && !done && 'border-accent ring-1 ring-accent',
            done && isCorrect && 'border-green-500/30 bg-green-500/10 dark:border-emerald-500/40 dark:bg-emerald-500/15 ring-1 ring-green-500/30 dark:ring-emerald-500/40',
            isWrong && 'border-destructive/30 bg-destructive/10 dark:border-destructive/40 dark:bg-destructive/20 ring-1 ring-destructive/30 dark:ring-destructive/40',
          )

          return (
            <div
              key={opt.label}
              className={optCls}
              onMouseEnter={() => !done && setHoveredIdx(oi)}
              onClick={() => toggleOption(oi)}
            >
              {/* Sliding Hover Highlight */}
              {oi === hoveredIdx && !isSelected && !done && (
                <motion.span
                  layoutId={`choice-hover-${index}`}
                  className="absolute inset-0 z-[-1] rounded-xl bg-slate-100/70 dark:bg-white/5"
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          type: 'spring',
                          stiffness: 350,
                          damping: 30,
                        }
                  }
                />
              )}

              {/* Selection Highlight */}
              {isSelected && !done && (
                <motion.span
                  layoutId={`choice-selected-${index}-${oi}`}
                  className="absolute inset-0 z-[-1] rounded-xl bg-accent-light/70 dark:bg-accent-light"
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          type: 'spring',
                          stiffness: 380,
                          damping: 30,
                        }
                  }
                />
              )}

              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleOption(oi)}
                disabled={done}
                isCorrectAnswer={done && isCorrect}
                isWrongSelection={done && isSelected && !isCorrect}
                className="pointer-events-none relative z-10"
              />
              <span className={cn(
                'relative z-10 text-[14.5px] leading-relaxed flex-1 min-w-0 break-words',
                (done && isCorrect) ? 'text-green-700 dark:text-emerald-300' : isWrong ? 'text-destructive dark:text-red-400' : 'text-foreground',
              )}
              >
                <span className="opt-key font-bold mr-1">
                  {opt.label}
                  .
                </span>
                {opt.text}
              </span>
            </div>
          )
        })}
      </div>

      {!done && (
        <Button
          variant="primary"
          size="sm"
          className="self-end px-7 py-2 font-sans mt-2"
          onClick={handleSubmit}
          disabled={selected.length === 0}
        >
          提交答案
        </Button>
      )}
    </div>
  )
}

export default memo(MultiChoiceCard)
