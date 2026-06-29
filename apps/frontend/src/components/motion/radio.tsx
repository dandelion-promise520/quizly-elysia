import { motion, MotionConfig, useReducedMotion } from 'motion/react'
import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useState,
} from 'react'
import { SPRING_LAYOUT, SPRING_PRESS } from '@/lib/ease'
import { cn } from '@/lib/utils'

interface RadioCtxType {
  value: string
  setValue: (value: string) => void
  layoutId: string
}

const RadioCtx = createContext<RadioCtxType | null>(null)

function useRadioGroup() {
  const ctx = useContext(RadioCtx)
  if (!ctx) {
    throw new Error('RadioGroupItem must be used inside <RadioGroup>')
  }
  return ctx
}

export interface RadioGroupProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: ReactNode
  className?: string
  orientation?: 'vertical' | 'horizontal'
}

export function RadioGroup({
  value,
  defaultValue = '',
  onValueChange,
  children,
  className,
  orientation = 'vertical',
}: RadioGroupProps) {
  const [internal, setInternal] = useState(defaultValue)
  const layoutId = useId()
  const reduce = useReducedMotion()
  const controlled = value !== undefined
  const current = controlled ? value : internal
  const setValue = (next: string) => {
    if (!controlled)
      setInternal(next)
    onValueChange?.(next)
  }

  return (
    <MotionConfig transition={reduce ? { duration: 0 } : SPRING_LAYOUT}>
      <RadioCtx value={{ value: current, setValue, layoutId }}>
        <div
          role="radiogroup"
          className={cn(
            'flex gap-3',
            orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
            className,
          )}
        >
          {children}
        </div>
      </RadioCtx>
    </MotionConfig>
  )
}

export interface RadioGroupItemProps {
  value: string
  label?: string
  disabled?: boolean
  className?: string
  id?: string
  isCorrectAnswer?: boolean
  isWrongSelection?: boolean
}

export function RadioGroupItem({
  value,
  label,
  disabled,
  className,
  id: idProp,
  isCorrectAnswer,
  isWrongSelection,
}: RadioGroupItemProps) {
  const { value: groupValue, setValue, layoutId } = useRadioGroup()
  const autoId = useId()
  const id = idProp ?? autoId
  const reduce = useReducedMotion()
  const selected = groupValue === value

  const showDot = selected || isCorrectAnswer || isWrongSelection

  let borderBgClass = ''
  if (isCorrectAnswer) {
    borderBgClass = 'border-green-600 bg-green-50'
  }
  else if (isWrongSelection) {
    borderBgClass = 'border-red-600 bg-red-50'
  }
  else if (selected) {
    borderBgClass = 'border-teal-600 bg-teal-50'
  }
  else {
    borderBgClass = 'border-slate-300 hover:border-slate-400 bg-white'
  }

  let dotColorClass = 'bg-teal-600'
  if (isCorrectAnswer) {
    dotColorClass = 'bg-green-600'
  }
  else if (isWrongSelection) {
    dotColorClass = 'bg-red-600'
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex items-center gap-3',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <motion.button
        id={id}
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={() => !disabled && setValue(value)}
        whileTap={reduce || disabled ? undefined : { scale: 0.92 }}
        transition={SPRING_PRESS}
        data-state={selected ? 'checked' : 'unchecked'}
        className={cn(
          'relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 outline-none transition-colors duration-200 cursor-pointer',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-60',
          borderBgClass,
        )}
      >
        {showDot
          ? (
              <motion.span
                layoutId={selected ? layoutId : undefined}
                className={cn('absolute inset-1 rounded-full', dotColorClass)}
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
              />
            )
          : null}
      </motion.button>
      {label
        ? (
            <span className={cn('select-none text-sm text-slate-700', disabled && 'opacity-60')}>
              {label}
            </span>
          )
        : null}
    </label>
  )
}
