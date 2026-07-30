import { ArchiveRestore, CheckCircle2, Clock3, Download, FileJson, FolderOpen, HardDrive, RefreshCw, ShieldCheck, Unplug, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { fileSystemPersistence } from '../../persistence/fileSystemProvider'
import type { PersistenceStatus, SnapshotMetadata } from '../../persistence/types'
import { emptyPersistenceStatus } from '../../persistence/types'
import { repository } from '../../repositories/repository'
import { useTheme } from '../../theme/ThemeProvider'
import type { ThemeDefinition, ThemeId } from '../../theme/theme-types'

export function SettingsPage() {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<unknown>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [status, setStatus] = useState<PersistenceStatus>(emptyPersistenceStatus)
  const [snapshots, setSnapshots] = useState<SnapshotMetadata[]>([])
  const [restoring, setRestoring] = useState<SnapshotMetadata | null>(null)
  const [busy, setBusy] = useState(false)
  const { notify } = useToast()
  const { theme, themes, setTheme } = useTheme()

  const refresh = async () => {
    setStatus(await fileSystemPersistence.getStatus())
    setSnapshots(await fileSystemPersistence.listSnapshots())
  }

  useEffect(() => { void refresh() }, [])

  const connect = async () => {
    try {
      setBusy(true)
      await fileSystemPersistence.connect()
      await refresh()
      notify('自动备份目录已连接')
      await snapshotNow()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      notify('无法连接该目录', 'error')
    } finally { setBusy(false) }
  }

  const reconnect = async () => {
    try {
      setBusy(true)
      const next = await fileSystemPersistence.reconnect()
      await refresh()
      notify(next.connection === 'connected' ? '目录权限已恢复' : '仍未获得目录权限', next.connection === 'connected' ? 'success' : 'error')
    } finally { setBusy(false) }
  }

  const disconnect = async () => {
    await fileSystemPersistence.disconnect()
    await refresh()
    notify('已停止自动文件备份，已有快照仍保留在文件夹中', 'info')
  }

  const snapshotNow = async () => {
    try {
      setBusy(true)
      await fileSystemPersistence.saveSnapshot(await repository.exportData())
      await refresh()
      notify('本地快照已创建')
    } catch {
      notify('创建快照失败，请检查目录权限', 'error')
    } finally { setBusy(false) }
  }

  const restoreSnapshot = async () => {
    if (!restoring) return
    try {
      const data = await fileSystemPersistence.restoreSnapshot(restoring.id)
      await repository.importData(data, 'replace')
      setRestoring(null)
      notify('已从快照恢复本地数据')
    } catch {
      setRestoring(null)
      notify('快照无效或无法读取，现有数据未修改', 'error')
    }
  }

  const download = async () => {
    const data = await repository.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `praxis-path-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    notify('备份文件已导出')
  }

  const selectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try { setPending(JSON.parse(await file.text())) } catch { notify('无法读取该 JSON 文件', 'error') }
    event.target.value = ''
  }

  const restore = async () => {
    try {
      await repository.importData(pending, mode)
      setPending(null)
      notify(mode === 'replace' ? '本地数据已从备份恢复' : '备份数据已合并')
    } catch {
      notify('备份结构无效，未修改现有数据', 'error')
      setPending(null)
    }
  }

  const connected = status.connection === 'connected'

  return <div className="page-wrap"><header className="border-b border-line/15 pb-8"><p className="eyebrow">本地数据</p><h1 className="page-title">数据设置</h1><p className="mt-3 max-w-3xl text-text-secondary">IndexedDB 负责实时工作数据；授权的电脑文件夹保存浏览器之外的不可变快照。数据修改静默 10 秒后会自动备份。</p></header>
    <section className="surface-card mt-8 p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow">界面主题</p><h2 className="mt-1 font-serif text-2xl text-text-primary">选择你的操作氛围</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">主题会即时生效并保存在本机。Calm 适合沉静整理，Tech 强调结构掌控，Game 强化行动感与进度反馈。</p></div><div className="rounded-full border border-line/15 bg-surface px-3 py-2 text-xs text-text-secondary">当前主题：<span className="font-semibold text-text-primary">{themes.find((item) => item.id === theme)?.label}</span></div></div><div className="mt-6 grid gap-4 lg:grid-cols-3">{themes.map((option) => <ThemeChoice key={option.id} option={option} themeId={theme} onSelect={setTheme} />)}</div></section>
    <section className="surface-card mt-6 overflow-hidden"><div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-center"><div className="flex gap-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface2 text-text-secondary'}`}><HardDrive /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-2xl text-text-primary">自动本地快照</h2>{connected && <span className="status-badge border-emerald-400/30 bg-emerald-500/10 text-emerald-400"><CheckCircle2 size={12} />已连接</span>}</div><p className="mt-2 text-sm leading-6 text-text-secondary">{status.connection === 'unsupported' ? status.lastError : connected ? `保存到“${status.directoryName}”中的 snapshots 文件夹` : status.connection === 'permission-required' ? '目录记录仍在，但浏览器需要你重新授予访问权限。' : '选择一个普通文件夹或 OneDrive 同步文件夹，建立浏览器之外的持久副本。'}</p>{status.lastSnapshotAt && <p className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary"><Clock3 size={13} />最近备份：{new Date(status.lastSnapshotAt).toLocaleString('zh-CN')} · 当前保留 {status.snapshotCount} 份</p>}</div></div><div className="flex flex-wrap gap-2">{connected ? <><button className="button-primary" disabled={busy} onClick={snapshotNow}><RefreshCw size={16} />立即备份</button><button className="button-secondary" onClick={disconnect}><Unplug size={16} />断开</button></> : status.connection === 'permission-required' ? <><button className="button-primary" disabled={busy} onClick={reconnect}><FolderOpen size={16} />重新授权</button><button className="button-secondary" onClick={connect}>改选目录</button></> : <button className="button-primary" disabled={busy || status.connection === 'unsupported'} onClick={connect}><FolderOpen size={17} />选择备份目录</button>}</div></div>{connected && <div className="border-t border-line/15 bg-surface2/45 px-7 py-5"><p className="text-xs leading-5 text-text-secondary">保留策略：最近 24 小时最多 10 份；30 天内每天保留 1 份；更早每月保留 1 份。清理浏览器站点数据不会删除文件夹里的快照，但需要重新选择目录。</p></div>}</section>
    {connected && <section className="surface-card mt-6 p-7"><div className="flex items-center justify-between"><div><p className="eyebrow">历史副本</p><h2 className="mt-1 font-serif text-2xl text-text-primary">可恢复快照</h2></div><button className="icon-button" onClick={refresh} title="刷新列表"><RefreshCw size={16} /></button></div>{snapshots.length ? <div className="mt-5 divide-y divide-line/15">{snapshots.slice(0, 20).map((snapshot) => <div key={snapshot.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-text-primary">{new Date(snapshot.createdAt).toLocaleString('zh-CN')}</p><p className="mt-1 text-xs text-text-secondary">{snapshot.projectCount} 个项目 · {snapshot.nodeCount} 个节点 · {formatSize(snapshot.size)}</p></div><button className="button-secondary !px-3 !py-2" onClick={() => setRestoring(snapshot)}><ArchiveRestore size={15} />恢复此快照</button></div>)}</div> : <p className="mt-5 rounded-2xl bg-surface2/60 p-5 text-sm text-text-secondary">尚无快照。点击“立即备份”，或修改任意项目后等待 10 秒。</p>}</section>}
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="surface-card p-7"><DownloadCard /><button className="button-primary mt-6" onClick={download}><FileJson size={17} />导出 JSON</button></section><section className="surface-card p-7"><UploadCard /><div className="mt-5 flex gap-4 text-sm text-text-secondary"><label className="flex items-center gap-2"><input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} />合并数据</label><label className="flex items-center gap-2"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />覆盖本地数据</label></div><input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={selectFile} /><button className="button-secondary mt-6" onClick={() => input.current?.click()}><Upload size={17} />选择备份文件</button></section></div>
    <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm leading-6 text-text-primary"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-400" size={19} /><p>本阶段不会把数据上传到服务器。若选择 OneDrive 等同步目录，文件是否上传由该桌面同步软件负责；这些完整快照仅用于备份，不作为未来多端并发写入的同步数据库。</p></div>
    <ConfirmDialog open={pending !== null} title={mode === 'replace' ? '覆盖全部本地数据？' : '合并备份数据？'} message={mode === 'replace' ? '现有项目及所有关联记录将先被清空，再写入备份。此操作无法撤销。' : '同 ID 的记录将由备份版本替换，其他本地记录会保留。'} danger={mode === 'replace'} confirmLabel={mode === 'replace' ? '确认覆盖' : '确认合并'} onClose={() => setPending(null)} onConfirm={restore} />
    <ConfirmDialog open={Boolean(restoring)} title="恢复这个本地快照？" message="当前浏览器内的项目、节点、验证和审视记录将由所选快照完整替换。快照文件不会被删除。" danger confirmLabel="确认恢复" onClose={() => setRestoring(null)} onConfirm={restoreSnapshot} />
  </div>
}

function ThemeChoice({ option, themeId, onSelect }: { option: ThemeDefinition; themeId: ThemeId; onSelect: (theme: ThemeId) => void }) {
  const active = themeId === option.id
  return <button className={`theme-choice ${active ? 'theme-choice-active' : ''}`} onClick={() => onSelect(option.id)}><div className="flex items-center gap-2"><h3 className="font-serif text-lg text-text-primary">{option.label}</h3>{active && <span className="rounded-full bg-accent-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-text-inverse">当前</span>}</div><p className="mt-2 text-sm leading-6 text-text-secondary">{option.description}</p><div className="mt-4 grid grid-cols-[1.1fr_0.9fr] gap-3"><div className="h-24 rounded-2xl border border-white/10" style={{ background: `linear-gradient(160deg, ${option.preview.background}, ${option.preview.surface})` }} /><div className="space-y-3"><div className="h-10 rounded-xl border border-white/10" style={{ backgroundColor: option.preview.surface }} /><div className="flex gap-2"><div className="h-10 flex-1 rounded-xl border border-white/10" style={{ backgroundColor: option.preview.accent }} /><div className="h-10 flex-1 rounded-xl border border-white/10" style={{ backgroundColor: option.preview.highlight }} /></div></div></div></button>
}

function DownloadCard() { return <><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400"><Download /></span><h2 className="mt-5 font-serif text-2xl text-text-primary">手动导出</h2><p className="mt-2 text-sm leading-6 text-text-secondary">作为自动快照之外的可携带副本，下载一份完整且可阅读的 JSON。</p></> }
function UploadCard() { return <><span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-500/15 text-sky-400"><Upload /></span><h2 className="mt-5 font-serif text-2xl text-text-primary">导入 JSON</h2><p className="mt-2 text-sm leading-6 text-text-secondary">从其他位置选择备份文件，校验后合并或覆盖当前数据。</p></> }
function formatSize(bytes: number) { return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB` }
