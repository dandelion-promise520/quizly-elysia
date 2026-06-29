import { motion, MotionConfig, type Transition, useReducedMotion } from 'motion/react'
import { createContext, type ReactNode, useContext, useId, useState } from 'react'
import { EASE_OUT } from '@/lib/ease'
import { cn } from '@/lib/utils'

type Variant = 'pill' | 'underline' | 'segment'

interface Ctx {
  value: string
  setValue: (v: string) => void
  layoutId: string
  variant: Variant
}

const TabsCtx = createContext<Ctx | null>(null)

function useTabs() {
  const ctx = useContext(TabsCtx)
  if (!ctx)
    throw new Error('Tabs.* must be used inside <Tabs>')
  return ctx
}

const transition: Transition = {
  type: 'spring',
  stiffness: 170,
  damping: 24,
  mass: 1.2,
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  variant = 'pill',
  children,
  className,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  variant?: Variant
  children: ReactNode
  className?: string
}) {
  const [internal, setInternal] = useState(defaultValue ?? '')
  const layoutId = useId()
  const reduce = useReducedMotion()
  const controlled = value !== undefined
  const current = controlled ? value : internal
  const setValue = (v: string) => {
    if (!controlled)
      setInternal(v)
    onValueChange?.(v)
  }
  return (
    <MotionConfig transition={reduce ? { duration: 0 } : transition}>
      <TabsCtx value={{ value: current, setValue, layoutId, variant }}>
        <motion.div layoutRoot className={className}>
          {children}
        </motion.div>
      </TabsCtx>
    </MotionConfig>
  )
}

const listClasses: Record<Variant, string> = {
  pill: 'inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 border border-slate-200/50',
  underline: 'inline-flex items-center gap-1 border-b border-slate-200',
  segment: 'inline-flex items-center gap-0 rounded-lg bg-slate-100 p-0.5 border border-slate-200/50',
}

export function TabsList({ children, className }: { children: ReactNode, className?: string }) {
  const { variant } = useTabs()
  return (
    <div role="tablist" className={cn(listClasses[variant], className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
  indicatorClassName,
}: {
  value: string
  children: ReactNode
  className?: string
  indicatorClassName?: string
}) {
  const { value: current, setValue, layoutId, variant } = useTabs()
  const active = current === value

  if (variant === 'underline') {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setValue(value)}
        className={cn(
          'relative isolate px-3 pb-2.5 pt-1 -mb-px text-sm font-semibold transition-colors min-h-[40px] inline-flex items-center cursor-pointer',
          active ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800',
          className,
        )}
      >
        {children}
        {active
          ? (
              <motion.span
                layoutId={layoutId}
                className={cn(
                  'absolute -bottom-px left-0 right-0 h-[2px] bg-teal-600',
                  indicatorClassName,
                )}
              />
            )
          : null}
      </button>
    )
  }

  const radius = variant === 'pill' ? 'rounded-full' : 'rounded-md'

  return (
    <div className="relative cursor-pointer">
      {active
        ? (
            <motion.span
              layoutId={layoutId}
              style={{ borderRadius: variant === 'pill' ? 9999 : 6 }}
              className={cn(
                'absolute inset-0 bg-white shadow-sm border border-slate-200/20',
                radius,
                indicatorClassName,
              )}
            />
          )
        : null}
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setValue(value)}
        className={cn(
          'relative z-10 inline-flex items-center justify-center whitespace-nowrap bg-transparent px-3.5 py-1.5 text-sm font-semibold transition-colors outline-none cursor-pointer',
          active ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800',
          radius,
          className,
        )}
      >
        {children}
      </button>
    </div>
  )
}

export function TabsContent({ value, children, className }: { value: string, children: ReactNode, className?: string }) {
  const { value: current } = useTabs()
  const reduce = useReducedMotion()
  const active = current === value
  if (!active) {
    return (
      <div hidden className={className}>
        {children}
      </div>
    )
  }
  return (
    <motion.div
      key={value}
      initial={{ opacity: 0, y: reduce ? 0 : 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className={cn('mt-4', className)}
    >
      {children}
    </motion.div>
  )
}
