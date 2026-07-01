import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { SPRING_PRESS } from '@/lib/ease'
import { cn } from '@/lib/utils'

export interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
  isCorrectAnswer?: boolean
  isWrongSelection?: boolean
}

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  className,
  id: idProp,
  isCorrectAnswer,
  isWrongSelection,
}: CheckboxProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const reduce = useReducedMotion()

  let borderBgClass = ''
  if (isCorrectAnswer) {
    borderBgClass = 'border-success bg-success text-white'
  }
  else if (isWrongSelection) {
    borderBgClass = 'border-destructive bg-destructive text-white'
  }
  else if (checked) {
    borderBgClass = 'border-accent bg-accent text-white'
  }
  else {
    borderBgClass = 'border-slate-300 hover:border-slate-400 bg-white'
  }

  return (
    <motion.button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      whileTap={reduce || disabled ? undefined : { scale: 0.92 }}
      transition={SPRING_PRESS}
      className={cn(
        'relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 outline-none transition-colors duration-200 cursor-pointer',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-60',
        borderBgClass,
        className,
      )}
    >
      {checked || isCorrectAnswer || isWrongSelection
        ? (
            <svg
              className="h-3 w-3 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )
        : null}
    </motion.button>
  )
}
