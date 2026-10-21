import type { LucideIcon } from 'lucide-react'
import { BookOpen, KeyRound, ListChecks } from 'lucide-react'
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
} from '@/components/motion/animated-sidebar'

export type AdminSection = 'questions' | 'courses' | 'api-keys'

interface NavItem {
  key: AdminSection
  label: string
  icon: LucideIcon
}

const ITEMS: NavItem[] = [
  { key: 'questions', label: '题目', icon: ListChecks },
  { key: 'courses', label: '课程', icon: BookOpen },
  { key: 'api-keys', label: '密钥', icon: KeyRound },
]

interface AdminNavProps {
  active: AdminSection
  onChange: (section: AdminSection) => void
}

/** 后台分区导航，直接用 beUI 的折叠侧边栏 */
export default function AdminNav({ active, onChange }: AdminNavProps) {
  return (
    <AnimatedSidebar collapsible="icon" ariaLabel="后台分区导航">
      <AnimatedSidebarHeader>
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            Q
          </span>
          <span className="truncate text-sm font-semibold text-foreground group-data-[state=collapsed]/sidebar:hidden">
            Quizly 后台
          </span>
        </div>
      </AnimatedSidebarHeader>

      <AnimatedSidebarContent>
        <AnimatedSidebarGroup>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              {ITEMS.map(({ key, label, icon: Icon }) => (
                <AnimatedSidebarMenuItem key={key}>
                  <AnimatedSidebarMenuButton
                    icon={<Icon />}
                    isActive={active === key}
                    onSelect={() => onChange(key)}
                  >
                    {label}
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              ))}
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
      </AnimatedSidebarContent>
    </AnimatedSidebar>
  )
}
