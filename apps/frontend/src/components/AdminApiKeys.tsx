import type { ApiKeyItem } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/motion/alert'
import { AnimatedBadge } from '@/components/motion/animated-badge'
import { Button, StatefulButton } from '@/components/motion/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/motion/card'
import { CenterMorphModal, CenterMorphModalContent } from '@/components/motion/center-morph-modal'
import { Input } from '@/components/motion/input'
import { Loader } from '@/components/motion/loader'
import { Switch } from '@/components/motion/switch'
import { useToast } from '@/components/toast-provider'
import { createApiKey, deleteApiKey, listApiKeys, setApiKeyEnabled } from '@/lib/api'

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
  const toast = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyItem | null>(null)

  const { data: keys = [], isLoading, error: queryError, refetch } = useQuery<ApiKeyItem[]>({
    queryKey: ['api-keys'],
    queryFn: listApiKeys,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['api-keys'] })

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed || creating)
      return
    setCreating(true)
    try {
      const created = await createApiKey(trimmed)
      setNewKey(created.key)
      setName('')
      await refresh()
      toast.success('密钥已创建', `「${trimmed}」的明文只在下面显示这一次。`)
    }
    catch (err) {
      toast.error('创建失败', err instanceof Error ? err.message : '请稍后重试')
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
      toast.success('已复制到剪贴板')
    }
    catch {
      toast.error('复制失败', '浏览器拒绝了剪贴板写入，请手动选中复制')
    }
  }

  const handleToggle = async (item: ApiKeyItem) => {
    setPendingId(item.id)
    try {
      await setApiKeyEnabled(item.id, !item.enabled)
      await refresh()
      toast.success(item.enabled ? '密钥已停用' : '密钥已启用', item.name || undefined)
    }
    catch (err) {
      toast.error('操作失败', err instanceof Error ? err.message : '请稍后重试')
    }
    finally {
      setPendingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget)
      return
    const target = deleteTarget
    setPendingId(target.id)
    try {
      await deleteApiKey(target.id)
      setDeleteTarget(null)
      await refresh()
      toast.success('密钥已删除', target.name || undefined)
    }
    catch (err) {
      toast.error('删除失败', err instanceof Error ? err.message : '请稍后重试')
    }
    finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">API 密钥</h2>
          <p className="text-sm text-muted-foreground">
            给脚本或 AI 调用的长期凭证。请求时放进
            {' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">Authorization: Bearer &lt;key&gt;</code>
            {' '}
            或
            {' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">X-API-Key</code>
            {' '}
            请求头。读接口公开，不需要密钥。
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle as="h3">新建密钥</CardTitle>
            <CardDescription>起一个能认出来的名字，方便日后分辨是谁在用。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <Input
                className="flex-1"
                label="名称"
                placeholder="例如 ai-agent"
                value={name}
                onChange={setName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    void handleCreate()
                }}
              />
              <StatefulButton
                size="lg"
                state={creating ? 'loading' : 'idle'}
                loadingText="创建中"
                disabled={!name.trim()}
                onClick={() => void handleCreate()}
              >
                创建密钥
              </StatefulButton>
            </div>
          </CardContent>
        </Card>

        {newKey && (
          <Alert variant="warning">
            <AlertIcon />
            <AlertContent>
              <AlertTitle>密钥只显示这一次</AlertTitle>
              <AlertDescription>关掉这条提示后就再也看不到明文，请先复制保存。</AlertDescription>
              <code className="mt-2 block rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs break-all text-foreground">
                {newKey}
              </code>
            </AlertContent>
            <Button variant="secondary" size="sm" onClick={() => void handleCopy()}>
              <Copy />
              复制
            </Button>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle as="h3">已有密钥</CardTitle>
            <CardDescription>
              共
              {' '}
              {keys.length}
              {' '}
              个，停用后立即失效但记录保留。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader variant="dots" size={20} label="加载密钥" />
                加载中
              </div>
            )}

            {queryError && (
              <Alert variant="destructive">
                <AlertIcon />
                <AlertContent>
                  <AlertTitle>加载失败</AlertTitle>
                  <AlertDescription>
                    {queryError instanceof Error ? queryError.message : '请稍后重试'}
                  </AlertDescription>
                </AlertContent>
                <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                  重试
                </Button>
              </Alert>
            )}

            {!isLoading && !queryError && keys.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <KeyRound className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">还没有任何密钥，在上方输入名称创建一个。</p>
              </div>
            )}

            {keys.length > 0 && (
              <ul className="flex flex-col divide-y divide-border">
                {keys.map(item => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{item.name || '未命名'}</span>
                        <AnimatedBadge size="sm" status={item.enabled ? 'success' : 'neutral'}>
                          {item.enabled ? '启用中' : '已停用'}
                        </AnimatedBadge>
                      </div>
                      <code className="font-mono text-xs break-all text-muted-foreground">{maskKey(item)}</code>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>
                          创建
                          {' '}
                          {formatTime(item.createdAt)}
                        </span>
                        <span>
                          最近使用
                          {' '}
                          {formatTime(item.lastRequest)}
                        </span>
                      </div>
                    </div>

                    <Switch
                      checked={item.enabled}
                      disabled={pendingId === item.id}
                      ariaLabel={`切换 ${item.name || '未命名'} 的启用状态`}
                      onCheckedChange={() => void handleToggle(item)}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`删除 ${item.name || '未命名'}`}
                      disabled={pendingId === item.id}
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <CenterMorphModal open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}>
        <CenterMorphModalContent className="p-6" ariaLabel="删除密钥确认">
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-foreground">删除这个密钥？</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              「
              {deleteTarget?.name || '未命名'}
              」删除后立即失效，正在使用它的脚本会立刻收到 401，且无法恢复。
            </p>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="primary"
              disabled={pendingId !== null}
              onClick={() => void handleDelete()}
            >
              {pendingId ? '删除中' : '确认删除'}
            </Button>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>
    </div>
  )
}
