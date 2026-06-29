import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
} from 'motion/react'
import {
  type PointerEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react'
import { EASE_OUT, SPRING_PRESS } from '@/lib/ease'
import { useHoverCapable } from '@/lib/hooks/use-hover-capable'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends Omit<
  HTMLMotionProps<'button'>,
  'children'
> {
  variant?: ButtonVariant
  size?: ButtonSize
  pressScale?: number
  ripple?: boolean
  children?: ReactNode
}

interface Ripple { id: number, x: number, y: number, size: number }

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
  outline: 'border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-full',
  md: 'h-10 px-5 text-sm gap-2 rounded-full',
  lg: 'h-12 px-6 text-base gap-2 rounded-full',
  icon: 'h-8 w-8 rounded-lg',
}

export const Button = function Button(
  { ref, variant = 'primary', size = 'md', pressScale = 0.93, ripple = false, className, children, onPointerDown, ...rest }: ButtonProps & { ref?: React.RefObject<HTMLButtonElement | null> },
) {
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  const [ripples, setRipples] = useState<Ripple[]>([])
  const nextId = useRef(0)

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (ripple && !reduce) {
        const rect = event.currentTarget.getBoundingClientRect()
        const size = Math.max(rect.width, rect.height) * 2
        setRipples(prev => [
          ...prev,
          {
            id: nextId.current++,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            size,
          },
        ])
      }
      onPointerDown?.(event)
    },
    [ripple, reduce, onPointerDown],
  )

  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={reduce ? undefined : { scale: pressScale }}
      whileHover={reduce || !canHover ? undefined : { scale: 1.02 }}
      transition={SPRING_PRESS}
      onPointerDown={handlePointerDown}
      className={cn(
        'inline-flex items-center justify-center font-semibold select-none',
        'transition-colors duration-200 cursor-pointer',
        'disabled:pointer-events-none disabled:opacity-50',
        ripple && 'relative overflow-hidden',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...rest}
    >
      {ripple && !reduce
        ? (
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
              <AnimatePresence>
                {ripples.map(r => (
                  <motion.span
                    key={r.id}
                    className="absolute rounded-full bg-current"
                    style={{
                      left: r.x,
                      top: r.y,
                      width: r.size,
                      height: r.size,
                      x: '-50%',
                      y: '-50%',
                    }}
                    initial={{ scale: 0, opacity: 0.3 }}
                    animate={{ scale: 1, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.6, ease: EASE_OUT }}
                    onAnimationComplete={() =>
                      setRipples(prev => prev.filter(x => x.id !== r.id))}
                  />
                ))}
              </AnimatePresence>
            </span>
          )
        : null}
      {children}
    </motion.button>
  )
}
