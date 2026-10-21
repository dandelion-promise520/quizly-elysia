import type { Option, Question } from '@quizly/types'
import { Check, Search, Trash2 } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { AnimatedBadge } from './motion/animated-badge'
import { Button } from './motion/button'
import { Checkbox } from './motion/checkbox'
import { Input } from './motion/input'
import { Tabs, TabsList, TabsTrigger } from './motion/tabs'

interface AdminSidebarProps {
  questions: Question[]
  search: string
  onSearchChange: (v: string) => void
  typeFilter: string
  onTypeFilterChange: (v: string) => void
  selectedId: number | null
  onSelect: (id: number | null) => void
  onDelete: (id: number) => void
  isBatchMode: boolean
  onToggleBatchMode: () => void
  selectedIds: Set<number>
  onToggleSelect: (id: number, checked: boolean) => void
  onSelectAll: (ids: number[], checked: boolean) => void
  onOpenBatchModal: () => void
}

const TYPE_LABELS: Record<string, string> = {
  '': '全部',
  '单选题': '单选',
  '多选题': '多选',
  '判断题': '判断',
  '填空题': '填空',
}

function AdminSidebar({
  questions,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  selectedId,
  onSelect,
  onDelete,
  isBatchMode,
  onToggleBatchMode,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onOpenBatchModal,
}: AdminSidebarProps) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (typeFilter && q.type !== typeFilter)
        return false
      if (search) {
        const options = 'options' in q ? (q.options as Option[]) : []
        const blanks = 'blanks' in q ? (q.blanks as string[]) : []
        const haystack = [q.text, ...options.map(o => o.text), ...blanks].join(' ')
        return haystack.toLowerCase().includes(search.toLowerCase())
      }
      return true
    })
  }, [questions, typeFilter, search])

  const allSelected = filtered.length > 0
    && filtered.every(q => q.id !== undefined && selectedIds.has(q.id))

  return (
    <aside className="flex h-full w-[340px] flex-shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">题目管理</h2>

        <Input
          leftIcon={<Search />}
          placeholder="搜索题干或选项"
          value={search}
          onChange={onSearchChange}
        />

        <Tabs
          value={typeFilter}
          onValueChange={onTypeFilterChange}
          variant="segment"
          className="w-full"
        >
          <TabsList className="w-full">
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <TabsTrigger key={val || 'all'} value={val}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            共
            {' '}
            {questions.length}
            {' '}
            题 · 筛选出
            {' '}
            {filtered.length}
            {' '}
            题
          </span>
          <Button
            variant={isBatchMode ? 'primary' : 'ghost'}
            size="sm"
            onClick={onToggleBatchMode}
          >
            {isBatchMode ? '退出批量' : '批量操作'}
          </Button>
        </div>

        {isBatchMode && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background p-2.5">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => {
                const filteredIds = filtered
                  .map(q => q.id)
                  .filter((id): id is number => id !== undefined)
                onSelectAll(filteredIds, checked)
              }}
              label={`全选当前筛选（${filtered.length} 题）`}
            />
            <span className="text-xs text-muted-foreground">
              已选
              {' '}
              {selectedIds.size}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            没有匹配的题目
          </p>
        )}

        <ul className="divide-y divide-border">
          {filtered.map((q) => {
            const realIdx = questions.indexOf(q)
            const isSelected = selectedId === realIdx
            const isChecked = q.id !== undefined && selectedIds.has(q.id)
            const needConfirm = confirmDelete === realIdx
            const preview = q.text.length > 40 ? `${q.text.slice(0, 40)}…` : q.text

            return (
              <li
                key={q.id ?? `temp-${realIdx}`}
                className={
                  isSelected && !isBatchMode
                    ? 'flex cursor-pointer items-start gap-2.5 bg-muted px-4 py-3'
                    : 'flex cursor-pointer items-start gap-2.5 px-4 py-3 transition-colors hover:bg-muted/60'
                }
                onClick={() => {
                  if (isBatchMode) {
                    if (q.id !== undefined)
                      onToggleSelect(q.id, !isChecked)
                  }
                  else {
                    onSelect(realIdx)
                  }
                }}
              >
                {isBatchMode
                  ? (
                      <span className="mt-0.5 flex-shrink-0">
                        <Checkbox
                          checked={isChecked}
                          disabled={q.id === undefined}
                          aria-label={`选择第 ${realIdx + 1} 题`}
                          onCheckedChange={(checked) => {
                            if (q.id !== undefined)
                              onToggleSelect(q.id, checked)
                          }}
                        />
                      </span>
                    )
                  : (
                      <span className="mt-0.5 flex-shrink-0 text-xs text-muted-foreground tabular-nums">
                        {realIdx + 1}
                      </span>
                    )}

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm text-foreground">{preview || '（空题干）'}</span>
                  <AnimatedBadge size="sm" status="neutral">{q.type}</AnimatedBadge>
                </div>

                {!isBatchMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={needConfirm ? '确认删除这道题' : '删除这道题'}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (needConfirm) {
                        onDelete(realIdx)
                        setConfirmDelete(null)
                      }
                      else {
                        setConfirmDelete(realIdx)
                      }
                    }}
                  >
                    {needConfirm ? <Check /> : <Trash2 />}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {isBatchMode && (
        <div className="border-t border-border p-4">
          <Button
            className="w-full"
            disabled={selectedIds.size === 0}
            onClick={onOpenBatchModal}
          >
            修改所属课程与分类（
            {selectedIds.size}
            ）
          </Button>
        </div>
      )}
    </aside>
  )
}

export default memo(AdminSidebar)
