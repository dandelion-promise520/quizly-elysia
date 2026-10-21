import type { LucideIcon } from 'lucide-react'
import { BookOpen, KeyRound, ListChecks } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export type AdminSection = 'questions' | 'courses' | 'api-keys'

interface NavItem {
  key: AdminSection
  label: string
  title: string
  icon: LucideIcon
}

const ITEMS: NavItem[] = [
  { key: 'questions', label: '题目', title: '题目管理', icon: ListChecks },
  { key: 'courses', label: '课程', title: '课程管理', icon: BookOpen },
  { key: 'api-keys', label: '密钥', title: 'API 密钥', icon: KeyRound },
]

interface AdminNavProps {
  active: AdminSection
  onChange: (section: AdminSection) => void
}

/** 后台左侧导航栏：宽度固定，只放图标和短标签 */
export default function AdminNav({ active, onChange }: AdminNavProps) {
  const reduce = useReducedMotion()

  return (
    <nav className="w-[88px] flex-shrink-0 bg-sidebar border-r border-border flex flex-col items-center py-4 gap-1.5">
      <div className="mb-4 flex flex-col items-center gap-1.5 select-none">
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
          Q
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">
          Quizly
        </span>
      </div>

      {ITEMS.map(({ key, label, title, icon: Icon }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            type="button"
            title={title}
            onClick={() => onChange(key)}
            className={cn(
              'relative w-[68px] py-2.5 rounded-xl flex flex-col items-center gap-1 transition-colors cursor-pointer',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-background',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="admin-nav-active"
                className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 400, damping: 32 }
                }
              />
            )}
            <Icon className="relative z-10 size-5" />
            <span className="relative z-10 text-[11px] font-semibold">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
