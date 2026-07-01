import type { ChoiceQuestion } from '@quizly/types'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { RadioGroup, RadioGroupItem } from './motion/radio'

interface ChoiceCardProps {
  question: ChoiceQuestion
  index: number
  done: boolean
  selectedIdx?: number
  onPick: (qi: number, oi: number) => void
}

export default function ChoiceCard({
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
          let optCls
            = 'relative isolate flex items-center gap-3 p-3 my-[2px] border rounded-xl cursor-pointer select-none bg-white transition-all duration-200'

          if (done) {
            optCls += ' cursor-default pointer-events-none border-slate-200'
            if (oi === correctIdx) {
              optCls += ' border-green-300 bg-green-50 ring-1 ring-green-300'
            }
            else if (oi === selectedIdx && oi !== correctIdx) {
              optCls += ' border-red-300 bg-red-50 ring-1 ring-red-300'
            }
          }
          else {
            if (oi === selectedIdx) {
              optCls += ' border-teal-600 ring-1 ring-teal-600'
            }
            else {
              optCls += ' border-slate-200 hover:border-slate-300'
            }
          }

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
                  className="absolute inset-0 z-[-1] rounded-xl bg-slate-100/70"
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
                  className="absolute inset-0 z-[-1] rounded-xl bg-teal-50/70"
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
              <span className="relative z-10 text-[14.5px] text-slate-900 leading-relaxed flex-1 min-w-0 break-words">
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
