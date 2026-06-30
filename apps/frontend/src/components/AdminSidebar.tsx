import type { Option, Question } from '@quizly/types'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
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

export default function AdminSidebar({
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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const reduce = useReducedMotion()

  const filtered = questions.filter((q) => {
    if (typeFilter && q.type !== typeFilter)
      return false
    if (search) {
      const options = 'options' in q ? (q.options as Option[]) : []
      const blanks = 'blanks' in q ? (q.blanks as string[]) : []
      const haystack = [q.text, ...options.map(o => o.text), ...blanks].join(
        ' ',
      )
      return haystack.toLowerCase().includes(search.toLowerCase())
    }
    return true
  })

  return (
    <aside className="w-[340px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <h2 className="text-base font-bold text-slate-900">题目管理</h2>

        <input
          type="text"
          placeholder="搜索题干或选项…"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />

        <Tabs
          value={typeFilter}
          onValueChange={onTypeFilterChange}
          variant="segment"
          className="w-full"
        >
          <TabsList className="w-full justify-between">
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <TabsTrigger
                key={val}
                value={val}
                className="flex-1 text-xs px-2.5 py-1.5"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div>
            共
            {' '}
            {questions.length}
            {' '}
            题，筛选
            {' '}
            {filtered.length}
            {' '}
            题
          </div>
          <button
            type="button"
            onClick={onToggleBatchMode}
            className={`px-2 py-1 rounded border text-xs font-semibold cursor-pointer transition-all duration-200 ${
              isBatchMode
                ? 'bg-teal-600 border-teal-600 text-white shadow-sm hover:bg-teal-500'
                : 'bg-white border-slate-200 text-teal-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {isBatchMode ? '退出批量' : '批量操作'}
          </button>
        </div>

        {isBatchMode && (
          <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs transition-all">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={
                  filtered.length > 0
                  && filtered.every(q => q.id !== undefined && selectedIds.has(q.id))
                }
                onChange={(e) => {
                  const filteredIds = filtered
                    .map(q => q.id)
                    .filter((id): id is number => id !== undefined)
                  onSelectAll(filteredIds, e.target.checked)
                }}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer accent-teal-600"
              />
              全选当前筛选 (
              {filtered.length}
              {' '}
              题)
            </label>
            <div className="text-slate-500 font-bold">
              已选
              {' '}
              {selectedIds.size}
              {' '}
              题
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto bg-white relative z-0"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {filtered.map((q) => {
          const realIdx = questions.indexOf(q)
          const isSelected = selectedId === realIdx
          const isChecked = q.id !== undefined && selectedIds.has(q.id)
          const needConfirm = confirmDelete === realIdx
          const preview
            = q.text.length > 40 ? `${q.text.slice(0, 40)}…` : q.text

          return (
            <div
              key={q.id ?? `temp-${realIdx}`}
              className={[
                'relative flex items-start gap-2.5 px-4 py-3 cursor-pointer border-b border-slate-100 transition-colors',
                isSelected && !isBatchMode ? 'bg-teal-50 border-l-4 border-l-teal-600' : '',
                isChecked && isBatchMode ? 'bg-teal-50/50' : '',
              ].join(' ')}
              onClick={() => {
                if (isBatchMode) {
                  if (q.id !== undefined) {
                    onToggleSelect(q.id, !isChecked)
                  }
                }
                else {
                  onSelect(realIdx)
                }
              }}
              onMouseEnter={() => setHoveredIdx(realIdx)}
            >
              {/* Sliding Hover Highlight */}
              {realIdx === hoveredIdx && !isSelected && !isBatchMode && (
                <motion.span
                  layoutId="admin-sidebar-hover"
                  className="absolute inset-0 z-[-1] bg-slate-100"
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

              {isBatchMode
                ? (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={q.id === undefined}
                      onClick={e => e.stopPropagation()}
                      onChange={(e) => {
                        if (q.id !== undefined) {
                          onToggleSelect(q.id, e.target.checked)
                        }
                      }}
                      className="relative z-10 rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 mt-1 cursor-pointer accent-teal-600 flex-shrink-0"
                    />
                  )
                : (
                    <span className="relative z-10 text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                      {realIdx + 1}
                    </span>
                  )}

              <span className="relative z-10 text-[10px] font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                {q.type}
              </span>
              <span className="relative z-10 flex-1 text-sm text-slate-700 truncate">
                {preview}
              </span>

              {!isBatchMode && (
                <button
                  type="button"
                  className={[
                    'relative z-10 flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs transition',
                    needConfirm
                      ? 'bg-red-600 text-white'
                      : 'text-slate-400 hover:text-red-500 hover:bg-red-50',
                  ].join(' ')}
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
                  title={needConfirm ? '确认删除' : '删除'}
                >
                  {needConfirm ? '✓' : '×'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {isBatchMode && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={onOpenBatchModal}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer text-center ${
              selectedIds.size === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/10'
            }`}
          >
            修改所属课程与分类 (
            {selectedIds.size}
            )
          </button>
        </div>
      )}
    </aside>
  )
}
