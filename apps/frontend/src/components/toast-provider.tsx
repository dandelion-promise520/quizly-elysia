import type { ReactNode } from 'react'
import type { ToastInput, ToastStatus } from '@/components/motion/animated-toast-stack'
import { createContext, useCallback, useContext, useMemo } from 'react'
import { AnimatedToastStack, useAnimatedToastStack } from '@/components/motion/animated-toast-stack'

export interface ToastApi {
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  loading: (title: string, description?: string) => string
  update: (id: string, patch: Partial<ToastInput>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** 全局轻提示，统一走 beUI 的 Animated Toast Stack */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, showToast, updateToast, dismissToast } = useAnimatedToastStack({
    defaultDuration: 3600,
    limit: 3,
  })

  const push = useCallback(
    (status: ToastStatus, title: string, description?: string) =>
      showToast({ status, title, description, duration: status === 'loading' ? 0 : undefined }),
    [showToast],
  )

  const api = useMemo<ToastApi>(() => ({
    success: (title, description) => push('success', title, description),
    error: (title, description) => push('error', title, description),
    info: (title, description) => push('info', title, description),
    loading: (title, description) => push('loading', title, description),
    update: updateToast,
    dismiss: dismissToast,
  }), [dismissToast, push, updateToast])

  return (
    <ToastContext value={api}>
      {children}
      <AnimatedToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        position="bottom-right"
        fixed
        maxVisible={3}
      />
    </ToastContext>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context)
    throw new Error('useToast 必须在 ToastProvider 内使用')
  return context
}
