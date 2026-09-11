import { Loader2, Share2, UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import type { ProjectBundle } from '../../domain/types'
import { useTheme } from '../../theme/ThemeProvider'
import { encryptShareData } from './crypto'
import { injectSharePayload } from './injectSharePayload'
import { buildPlainEnvelope, buildShareData, shareFileName, type ShareOptions } from './shareData'

interface Props { open: boolean; onClose: () => void; bundle: ProjectBundle }

// 生成自包含只读分享页：取回预构建的 viewer 模板，注入（可加密的）项目快照后下载。
// 上传到任意静态托管即可获得只读链接；更新重新生成上传，删除线上文件即撤销分享。
export function ShareDialog({ open, onClose, bundle }: Props) {
  const { theme, themes } = useTheme()
  const { notify } = useToast()
  const [includeMilestones, setIncludeMilestones] = useState(true)
  const [includeReviews, setIncludeReviews] = useState(false)
  const [shareTheme, setShareTheme] = useState(theme)
  const [passphrase, setPassphrase] = useState('')
  const [passphraseConfirm, setPassphraseConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setIncludeMilestones(true); setIncludeReviews(false); setShareTheme(theme); setPassphrase(''); setPassphraseConfirm(''); setError(null); setBusy(false) }
  }, [open, theme])

  const generate = async () => {
    if (busy) return
    if (passphrase && passphrase !== passphraseConfirm) { setError('两次输入的口令不一致。'); return }
    setBusy(true); setError(null)
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}share/viewer-template.html`, { cache: 'no-store' })
      if (!response.ok) throw new Error('TEMPLATE_MISSING')
      const sharedAt = new Date().toISOString()
      const options: ShareOptions = { includeMilestones, includeReviews, theme: shareTheme }
      const data = buildShareData(bundle, options, sharedAt)
      const encrypted = Boolean(passphrase)
      const envelope = encrypted ? await encryptShareData(data, passphrase) : buildPlainEnvelope(data)
      const html = injectSharePayload(await response.text(), envelope)
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = shareFileName(bundle.project.title, sharedAt, encrypted)
      anchor.click()
      URL.revokeObjectURL(url)
      notify('分享文件已生成，上传到静态托管后即可获得链接')
      onClose()
    } catch (caught) {
      if (caught instanceof Error && (caught.message === 'TEMPLATE_MISSING' || caught.message.startsWith('分享模板'))) setError(`未找到可用的分享模板。请先在本机运行 npm run build:share-template 生成，然后重试。`)
      else setError(caught instanceof Error ? caught.message : '生成分享文件失败')
    } finally {
      setBusy(false)
    }
  }

  return <Modal open={open} title="生成只读分享页" description="导出一个自包含的 HTML 快照，他人打开后只能查看、不能修改。" onClose={onClose} width="max-w-lg">
    <section>
      <p className="eyebrow">分享内容</p>
      <div className="mt-3 space-y-3 text-sm text-text-primary">
        <label className="flex items-start gap-3"><input type="checkbox" className="mt-0.5" checked={includeMilestones} onChange={(event) => setIncludeMilestones(event.target.checked)} /><span>包含里程碑（验证方式、通过标准与结果感受会一并包含）</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" className="mt-0.5" checked={includeReviews} onChange={(event) => setIncludeReviews(event.target.checked)} /><span>包含复盘记录（健康度、执行反思等较私密内容，默认不包含）</span></label>
      </div>
      <p className="mt-2 text-xs text-text-secondary">图谱、节点内容与连接关系始终包含。</p>
    </section>

    <section className="mt-6">
      <p className="eyebrow">外观主题</p>
      <select className="mt-3 w-full rounded-xl border border-line/15 bg-panel px-3 py-2.5 text-sm text-text-primary" value={shareTheme} onChange={(event) => setShareTheme(event.target.value as ShareOptions['theme'])} aria-label="分享页主题">
        {themes.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </section>

    <section className="mt-6">
      <p className="eyebrow">口令保护（可选）</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="password" className="w-full rounded-xl border border-line/15 bg-panel px-3 py-2.5 text-sm text-text-primary" placeholder="设置口令" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="new-password" />
        <input type="password" className="w-full rounded-xl border border-line/15 bg-panel px-3 py-2.5 text-sm text-text-primary" placeholder="确认口令" value={passphraseConfirm} onChange={(event) => setPassphraseConfirm(event.target.value)} autoComplete="new-password" />
      </div>
      <p className="mt-2 text-xs leading-5 text-text-secondary">{passphrase ? <>内容将以口令加密嵌入，文件名不含项目名。口令不会保存在任何地方，忘记后无法恢复内容；若托管方恶意篡改页面代码，仍可能窃取口令。</> : <>留空则任何获得链接的人可直接查看。</>}</p>
    </section>

    <section className="mt-6 rounded-2xl border border-line/15 bg-surface2/60 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-text-primary"><UploadCloud size={16} className="text-accent-primary" />如何获得链接</p>
      <p className="mt-2 text-xs leading-5 text-text-secondary">生成后把文件上传到任意静态托管（Netlify Drop、Cloudflare Pages、GitHub Pages 等）即可获得只读链接。更新内容：同名重新生成并上传，链接保持不变；撤销分享：删除线上文件。除上传的这一份快照外，本地数据不会离开这台电脑。</p>
    </section>

    {error && <p className="mt-5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm leading-6 text-text-primary" role="alert">{error}</p>}

    <div className="mt-6 flex justify-end gap-3">
      <button className="button-secondary" onClick={onClose} disabled={busy}>取消</button>
      <button className="button-primary" onClick={() => void generate()} disabled={busy || (Boolean(passphrase) && passphrase !== passphraseConfirm)}>{busy ? <><Loader2 size={16} className="animate-spin" />正在生成…</> : <><Share2 size={16} />生成分享文件</>}</button>
    </div>
  </Modal>
}
