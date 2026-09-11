import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Eye, LockKeyhole, MoreHorizontal, NotebookPen, ShieldCheck, Trophy } from 'lucide-react'
import { ReadOnlyContext } from '../components/ReadOnlyContext'
import { calculateRouteProgress, resolveCurrentRoute, resolveFocusedSubgraph } from '../domain/graph'
import { calculateProgress, calculateResearchProgress, statusLabels, statusStyles } from '../domain/rules'
import { TaskGraph, type GraphFocusRequest } from '../features/nodes/TaskGraph'
import { SHARE_DECRYPT_FAILED, decryptShareData } from '../features/share/crypto'
import { parsePlainEnvelopePayload, shareDataSchema, shareEnvelopeSchema, type ShareData, type ShareEnvelope } from '../features/share/shareData'
import { ThemeProvider } from '../theme/ThemeProvider'

declare global {
  interface Window { __PRAXIS_SHARE__?: string }
}

// 与主应用解耦的标签映射（避免为三个常量引入表单/列表组件）。
const milestoneResultLabels = { passed: '已通过', partial: '部分通过', failed: '未通过' } as const
const reviewTriggerLabels = { milestone: '里程碑验证', project_end: '项目结束', manual: '主动审视' } as const

type EncryptedEnvelope = Extract<ShareEnvelope, { encrypted: true }>
type ViewerStage = { kind: 'no-data' } | { kind: 'invalid' } | { kind: 'locked'; envelope: EncryptedEnvelope; error?: string } | { kind: 'ready'; data: ShareData }

function readInitialStage(): ViewerStage {
  const raw = typeof window === 'undefined' ? undefined : window.__PRAXIS_SHARE__
  if (!raw) return { kind: 'no-data' }
  try {
    const envelope = shareEnvelopeSchema.parse(JSON.parse(raw))
    if (!envelope.encrypted) return { kind: 'ready', data: shareDataSchema.parse(parsePlainEnvelopePayload(envelope.payload)) }
    return { kind: 'locked', envelope }
  } catch {
    return { kind: 'invalid' }
  }
}

export function SharedProjectViewerPage() {
  const [stage, setStage] = useState<ViewerStage>(readInitialStage)
  const [passphrase, setPassphrase] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const unlock = async (event: FormEvent) => {
    event.preventDefault()
    if (stage.kind !== 'locked' || unlocking || !passphrase) return
    setUnlocking(true)
    try {
      const data = shareDataSchema.parse(await decryptShareData(stage.envelope, passphrase))
      setStage({ kind: 'ready', data })
    } catch (error) {
      const failed = error instanceof Error && error.message === SHARE_DECRYPT_FAILED
      setStage({ kind: 'locked', envelope: stage.envelope, error: failed ? '口令错误，或文件已被篡改。' : '数据无效或已损坏。' })
    } finally {
      setUnlocking(false)
    }
  }

  if (stage.kind === 'ready') {
    return <ThemeProvider key={stage.data.shareOptions.theme} initialTheme={stage.data.shareOptions.theme}><ReadOnlyContext.Provider value={true}><ReadyView data={stage.data} /></ReadOnlyContext.Provider></ThemeProvider>
  }

  return <main className="grid min-h-screen place-items-center bg-app p-6"><div className="surface-card w-full max-w-md p-8 text-center">
    {stage.kind === 'locked' ? <>
      <LockKeyhole className="mx-auto text-accent-primary" size={30} />
      <h1 className="mt-4 font-serif text-2xl text-text-primary">此分享已加密</h1>
      <p className="mt-2 text-sm leading-6 text-text-secondary">输入分享者告知的口令解锁查看。口令不会保存在这个文件里。</p>
      <form className="mt-6 flex flex-col gap-3" onSubmit={unlock}>
        <input autoFocus className="w-full rounded-xl border border-line/15 bg-panel px-4 py-3 text-sm text-text-primary" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="输入口令" aria-label="口令" />
        <button className="button-primary justify-center" type="submit" disabled={unlocking || !passphrase}>{unlocking ? '正在解锁…' : '解锁查看'}</button>
      </form>
      {stage.error && <p className="mt-4 text-sm text-rose-400" role="alert">{stage.error}</p>}
    </> : stage.kind === 'no-data' ? <>
      <Eye className="mx-auto text-accent-primary" size={30} />
      <h1 className="mt-4 font-serif text-2xl text-text-primary">没有分享数据</h1>
      <p className="mt-2 text-sm leading-6 text-text-secondary">此文件不包含分享数据，请让分享者从刻度应用重新生成。</p>
    </> : <>
      <ShieldCheck className="mx-auto text-accent-primary" size={30} />
      <h1 className="mt-4 font-serif text-2xl text-text-primary">分享数据无效</h1>
      <p className="mt-2 text-sm leading-6 text-text-secondary">文件已损坏或格式不受支持，请向分享者索要重新生成的文件。</p>
    </>}
  </div></main>
}

function ReadyView({ data }: { data: ShareData }) {
  const { project, nodes, connections, milestones, reviews, shareOptions } = data
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<GraphFocusRequest | null>(null)
  const focusToken = useRef(0)

  useEffect(() => { document.title = `${project.title} · 只读分享` }, [project.title])

  // 深链 ?node=：进入时选中并聚焦；页内选择只同步 URL，不重复触发聚焦。
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('node')
    if (param && nodes.some((node) => node.id === param)) { setSelectedNodeId(param); setFocusRequest({ nodeId: param, token: (focusToken.current += 1) }) }
  }, [nodes])

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId)
    const url = new URL(window.location.href)
    if (nodeId) url.searchParams.set('node', nodeId); else url.searchParams.delete('node')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  const focusMilestoneNode = (nodeId: string) => {
    if (!nodes.some((node) => node.id === nodeId)) return
    selectNode(nodeId)
    setFocusRequest({ nodeId, token: (focusToken.current += 1) })
  }

  const noopSync = useCallback(() => {}, [])
  const noopAsync = useCallback(async () => {}, [])

  const currentRoute = project.type === 'research' ? resolveFocusedSubgraph(nodes, connections, project.focusedNodeIds) : resolveCurrentRoute(nodes, connections, project.activeNodeId)
  const progress = calculateProgress(nodes)
  const routeProgress = calculateRouteProgress(currentRoute.nodeIds, nodes)
  const researchProgress = project.type === 'research' ? calculateResearchProgress(nodes) : null

  return <div className="page-wrap">
    <header className="project-detail-hero surface-card mt-7 p-6 sm:p-8">
      <div className="relative z-[1] flex flex-col gap-7 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`status-badge ${statusStyles[project.status]}`}>{statusLabels[project.status]}</span>
            <span className="status-badge border-sky-400/30 bg-sky-500/10 text-sky-300"><Eye size={12} className="mr-1 inline" />只读快照</span>
            <span className="text-xs text-text-secondary">生成于 {new Date(data.sharedAt).toLocaleString('zh-CN')}</span>
          </div>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight text-text-primary sm:text-5xl">{project.title}</h1>
          <div className="mt-5 border-l-2 border-accent-primary pl-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-primary">现实触发</p>
            <p className="mt-2 leading-7 text-text-secondary">{project.trigger}</p>
          </div>
        </div>
      </div>
      <div className="relative z-[1] mt-8 border-t border-line/15 pt-6">
        {project.type === 'research' && researchProgress ? <>
          <div className="mb-2 flex justify-between text-xs text-text-secondary"><span>缺陷研究进度</span><span>{researchProgress.total > 0 ? `${researchProgress.conquered} / ${researchProgress.total} 已攻克` : '暂无缺陷节点'}</span></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2"><p className="text-xs text-amber-300">待攻克</p><p className="mt-1 font-serif text-2xl text-amber-400">{researchProgress.open}</p></div>
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2"><p className="text-xs text-emerald-300">已攻克</p><p className="mt-1 font-serif text-2xl text-emerald-400">{researchProgress.conquered}</p></div>
          </div>
          <p className="mt-2 text-[11px] text-text-secondary">重点关注 {project.focusedNodeIds.length} 个节点 · 核心 {project.coreNodeIds.length} 个</p>
        </> : <>
          <div className="mb-2 flex justify-between text-xs text-text-secondary"><span>{project.activeNodeId ? `${routeProgress.completed} / ${routeProgress.total} 当前路线节点完成` : '尚未追踪当前路线'}</span><span>{project.activeNodeId ? `${routeProgress.percent}%` : '—'}</span></div>
          <div className="progress-track h-2"><div className="progress-fill" style={{ width: `${project.activeNodeId ? routeProgress.percent : 0}%` }} /></div>
          <p className="mt-2 text-[11px] text-text-secondary">全图概况：{progress.completed} / {progress.total} 有效节点完成</p>
        </>}
      </div>
    </header>

    <div className="project-workspace mt-8 grid gap-8">
      <main>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">实践路线</p><h2 className="mt-1 font-serif text-3xl text-text-primary">路线图</h2></div>
        </div>
        {nodes.length ? <TaskGraph projectId={project.id} projectType={project.type} activeNodeId={project.activeNodeId} focusedNodeIds={project.focusedNodeIds} coreNodeIds={project.coreNodeIds} route={currentRoute} nodes={nodes} connections={connections} milestones={milestones} selectedNodeId={selectedNodeId} focusRequest={focusRequest} onSelectNode={(node) => selectNode(node.id)} onClearSelection={() => selectNode(null)} onAdvance={noopSync} onBranch={noopSync} onSetActive={noopSync} onClearActive={noopSync} onToggleFocused={noopSync} onToggleCore={noopSync} onEdit={noopSync} onDelete={noopSync} onMilestone={noopSync} onConnect={noopAsync} onDisconnect={noopAsync} onUpdateConnection={noopAsync} onSaveGraphPositions={noopAsync} /> : <div className="surface-ghost mt-6 p-14 text-center"><MoreHorizontal className="mx-auto text-accent-primary" /><h3 className="mt-4 font-serif text-2xl text-text-primary">分享生成时项目尚无节点</h3><p className="mt-2 text-sm text-text-secondary">等有内容后请分享者重新生成。</p></div>}
      </main>

      {/* 里程碑与复盘放在路线图下方横排，路线图获得完整宽度（仅情报面板分列） */}
      <aside className="grid gap-5 xl:grid-cols-2">
        {shareOptions.includeMilestones && milestones.length > 0 && (
          <section className="milestone-panel validation-terminal checkpoint-panel">
            <div className="flex items-center justify-between"><p className="milestone-kicker text-xs uppercase tracking-widest"><span className="theme-label-default">里程碑</span><span className="tech-only">Validation Terminal</span><span className="game-only">Quest Checkpoints</span></p><span className="checkpoint-emblem"><Trophy size={19} className="text-accent-primary" /></span></div>
            <p className="milestone-score mt-4 font-serif text-3xl text-[rgb(var(--milestone-fg))]">{milestones.filter((item) => item.result === 'passed').length}<span className="text-lg milestone-subtle"> / {milestones.length}</span></p>
            <p className="mt-1 text-xs milestone-subtle">验证通过</p>
            <div className="mt-5 space-y-3">{milestones.map((item) => <div key={item.id} className="rounded-2xl border border-line/15 bg-surface2/60 p-4">
              <div className="flex w-full items-center justify-between gap-2"><button className="truncate text-left text-sm font-medium text-text-primary hover:text-accent-primary" title="在路线图中定位" onClick={() => focusMilestoneNode(item.nodeId)}>{item.title}</button><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${item.result ? (item.result === 'passed' ? 'text-emerald-300 bg-emerald-500/12' : item.result === 'partial' ? 'text-amber-300 bg-amber-500/12' : 'text-rose-300 bg-rose-500/12') : 'bg-violet-500/12 text-violet-300'}`}>{item.result ? milestoneResultLabels[item.result] : '待验证'}</span></div>
              {item.validatedAt && <p className="mt-1 text-[10px] text-text-secondary">验证于 {new Date(item.validatedAt).toLocaleDateString('zh-CN')}</p>}
              {item.method && <p className="mt-2 text-xs leading-5 text-text-secondary">验证方式：{item.method}</p>}
              {item.criteria && <p className="mt-1 text-xs leading-5 text-text-secondary">通过标准：{item.criteria}</p>}
              {item.feeling && <p className="mt-1 text-xs leading-5 text-text-secondary">结果感受：{item.feeling}</p>}
            </div>)}</div>
          </section>
        )}
        {shareOptions.includeReviews && reviews.length > 0 && (
          <section className="diagnostic-panel surface-card p-6">
            <div className="relative z-[1] flex items-center justify-between">
              <div><p className="eyebrow"><span className="theme-label-default">反馈修正</span><span className="tech-only">Diagnostic Reports</span><span className="game-only">Journey Log</span></p><h3 className="mt-1 font-serif text-xl text-text-primary">审视记录</h3></div>
              <NotebookPen size={17} className="relative z-[1] text-text-secondary" />
            </div>
            <div className="relative z-[1] mt-5 space-y-3">{reviews.map((item) => <div key={item.id} className="review-card">
              <p className="text-[10px] uppercase tracking-widest text-text-secondary">{reviewTriggerLabels[item.trigger]} · {new Date(item.createdAt).toLocaleDateString('zh-CN')}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-accent-primary">健康度</p><p className="mt-0.5 text-sm leading-6 text-text-primary">{item.health}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-accent-primary">执行模式</p><p className="mt-0.5 text-sm leading-6 text-text-primary">{item.execution}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-accent-primary">系统调整</p><p className="mt-0.5 text-sm leading-6 text-text-primary">{item.systemAdjustment}</p>
            </div>)}</div>
          </section>
        )}
      </aside>
    </div>

    <footer className="mt-10 flex items-center justify-center gap-2 pb-10 text-xs text-text-secondary"><Eye size={13} />此页面为静态只读快照 · 由刻度（Praxis Path）生成 · 内容无法在此修改</footer>
  </div>
}
