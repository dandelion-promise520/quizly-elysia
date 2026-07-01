import type { ChoiceQuestion } from '@quizly/types'
import { motion, useReducedMotion } from 'motion/react'
import { memo, useState } from 'react'
import { cn } from '@/lib/utils'
import { RadioGroup, RadioGroupItem } from './motion/radio'

interface ChoiceCardProps {
  question: ChoiceQuestion
  index: number
  done: boolean
  selectedIdx?: number
  onPick: (qi: number, oi: number) => void
}

function ChoiceCard({
  question,
  index,
  done,
  selectedIdx,
  onPick,
}: ChoiceCardProps) {
  const opts = question.shuffledOptions || question.options
  const correctIdx = question.correctShuffledIdx

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const reduce = useReducedMotion()

  return (
    <div onMouseLeave={() => !done && setHoveredIdx(null)}>
      <RadioGroup
        value={selectedIdx !== undefined ? String(selectedIdx) : undefined}
        onValueChange={val => !done && onPick(index, Number(val))}
        className="pl-0 gap-1.5"
      >
        {opts.map((opt: { label: string, text: string }, oi: number) => {
          const isCorrect = done && oi === correctIdx
          const isWrong = done && oi === selectedIdx && oi !== correctIdx
          const isSelected = oi === selectedIdx

          const optCls = cn(
            'relative isolate flex items-center gap-3 p-3 my-[2px] border rounded-xl cursor-pointer select-none bg-card transition-all duration-200',
            done ? 'cursor-default pointer-events-none border-border' : 'border-border hover:border-slate-300',
            isSelected && !done && 'border-accent ring-1 ring-accent',
            isCorrect && 'border-green-500/30 bg-green-500/10 dark:border-emerald-500/40 dark:bg-emerald-500/15 ring-1 ring-green-500/30 dark:ring-emerald-500/40',
            isWrong && 'border-destructive/30 bg-destructive/10 dark:border-destructive/40 dark:bg-destructive/20 ring-1 ring-destructive/30 dark:ring-destructive/40',
          )

          return (
            <div
              key={opt.label}
              className={optCls}
              onMouseEnter={() => !done && setHoveredIdx(oi)}
              onClick={() => !done && onPick(index, oi)}
            >
              {/* Sliding Hover Highlight */}
              {oi === hoveredIdx && oi !== selectedIdx && !done && (
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

              {/* Sliding Selection Highlight */}
              {oi === selectedIdx && !done && (
                <motion.span
                  layoutId={`choice-selected-${index}`}
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

              <RadioGroupItem
                value={String(oi)}
                disabled={done}
                isCorrectAnswer={done && oi === correctIdx}
                isWrongSelection={
                  done && oi === selectedIdx && oi !== correctIdx
                }
                className="pointer-events-none relative z-10"
              />
              <span className={cn(
                'relative z-10 text-[14.5px] leading-relaxed flex-1 min-w-0 break-words',
                isCorrect ? 'text-green-700 dark:text-emerald-300' : isWrong ? 'text-destructive dark:text-red-400' : 'text-foreground',
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
      </RadioGroup>
    </div>
  )
}

export default memo(ChoiceCard)
