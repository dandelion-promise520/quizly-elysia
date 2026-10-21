import type { ApiKeyItem } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, KeyRound, Loader2, Plus, Power, Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/motion/button'
import { Input } from '@/components/motion/input'
import { createApiKey, deleteApiKey, listApiKeys, setApiKeyEnabled } from '@/lib/api'
import { cn } from '@/lib/utils'

function formatTime(value: ApiKeyItem['createdAt'] | null | undefined): string {
  if (!value)
    return '从未使用'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime()))
    return '未知'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 列表里只可能拿到开头几位，完整 key 仅在创建时返回一次 */
function maskKey(item: ApiKeyItem): string {
  const head = item.prefix ? `${item.prefix}_${item.start ?? ''}` : (item.start ?? '')
  return head ? `${head}${'•'.repeat(18)}` : '••••••••••••'
}

export default function AdminApiKeys() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: keys = [], isLoading, error: queryError } = useQuery<ApiKeyItem[]>({
    queryKey: ['api-keys'],
    queryFn: listApiKeys,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['api-keys'] })

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed || creating)
      return
    setCreating(true)
    setError(null)
    setNewKey(null)
    try {
      const created = await createApiKey(trimmed)
      setNewKey(created.key)
      setName('')
      await refresh()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    }
    finally {
      setCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!newKey)
      return
    try {
      await navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(setCopied, 1600, false)
    }
    catch {
      setError('浏览器拒绝了剪贴板写入，请手动选中复制')
    }
  }

  const handleToggle = async (item: ApiKeyItem) => {
    setPendingId(item.id)
    setError(null)
    try {
      await setApiKeyEnabled(item.id, !item.enabled)
      await refresh()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
    finally {
      setPendingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setPendingId(id)
    setError(null)
    try {
      await deleteApiKey(id)
      setConfirmId(null)
      await refresh()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
    finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-8 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-bold text-foreground">API 密钥</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            给脚本或 AI 调用的长期凭证，可绕过登录直接写接口。请求时放在
            {' '}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 text-xs font-mono">Authorization: Bearer &lt;key&gt;</code>
            {' '}
            或
            {' '}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 text-xs font-mono">X-API-Key</code>
            {' '}
            请求头里。读接口本身公开，不需要密钥。
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">新建密钥</h3>
          </div>
          <div className="flex items-center gap-2.5">
            <Input
              value={name}
              onChange={setName}
              placeholder="给密钥起个名字，例如 ai-agent"
              className="flex-1"
              classNames={{ field: 'bg-background' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  void handleCreate()
              }}
            />
            <Button
              variant="primary"
              onClick={() => void handleCreate()}
              disabled={creating || !name.trim()}
              className="h-11 px-6 shrink-0"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              创建
            </Button>
          </div>
        </div>

        {newKey && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-warning">
              <TriangleAlert className="size-4" />
              <span className="text-sm font-bold">密钥只显示这一次，关掉就再也看不到</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-background border border-border text-xs font-mono text-foreground break-all">
                {newKey}
              </code>
              <Button variant="secondary" onClick={() => void handleCopy()} className="px-4 py-2 shrink-0">
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2 bg-background">
            <KeyRound className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">已有密钥</h3>
            <span className="text-xs text-muted-foreground">
              共
              {' '}
              {keys.length}
              {' '}
              个
            </span>
          </div>

          {isLoading && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              加载中
            </div>
          )}

          {queryError && (
            <div className="px-5 py-10 text-center text-sm text-destructive">
              {queryError instanceof Error ? queryError.message : '加载失败'}
            </div>
          )}

          {!isLoading && !queryError && keys.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              还没有任何密钥，在上方输入名称创建一个。
            </div>
          )}

          {keys.map((item) => {
            const busy = pendingId === item.id
            const needConfirm = confirmId === item.id
            return (
              <div
                key={item.id}
                className="px-5 py-4 border-b border-border last:border-b-0 flex items-center gap-4 flex-wrap"
              >
                <div className="flex-1 min-w-[220px] flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {item.name || '未命名'}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        item.enabled
                          ? 'text-success bg-success/10'
                          : 'text-muted-foreground bg-muted',
                      )}
                    >
                      {item.enabled ? '启用中' : '已停用'}
                    </span>
                  </div>
                  <code className="text-xs font-mono text-muted-foreground break-all">
                    {maskKey(item)}
                  </code>
                </div>

                <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground w-[172px] whitespace-nowrap">
                  <span>
                    创建
                    {' '}
                    {formatTime(item.createdAt)}
                  </span>
                  <span className={cn(!item.lastRequest && 'opacity-60')}>
                    最近使用
                    {' '}
                    {formatTime(item.lastRequest)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    onClick={() => void handleToggle(item)}
                    disabled={busy}
                    className="px-3 py-1.5 text-xs"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
                    {item.enabled ? '停用' : '启用'}
                  </Button>
                  <Button
                    variant={needConfirm ? 'primary' : 'ghost'}
                    onClick={() => {
                      if (needConfirm)
                        void handleDelete(item.id)
                      else
                        setConfirmId(item.id)
                    }}
                    disabled={busy}
                    className={cn(
                      'px-3 py-1.5 text-xs',
                      needConfirm
                        ? 'bg-destructive hover:bg-destructive/90 text-white'
                        : 'text-destructive hover:text-destructive',
                    )}
                  >
                    {needConfirm ? <Check className="size-3.5" /> : <Trash2 className="size-3.5" />}
                    {needConfirm ? '确认删除' : '删除'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
