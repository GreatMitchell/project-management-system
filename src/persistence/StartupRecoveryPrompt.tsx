import { useEffect, useState } from 'react'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { db } from '../db/database'
import { repository } from '../repositories/repository'
import { fileSystemPersistence } from './fileSystemProvider'
import type { SnapshotMetadata } from './types'

export function StartupRecoveryPrompt() {
  const [snapshot, setSnapshot] = useState<SnapshotMetadata | null>(null)
  const { notify } = useToast()

  useEffect(() => {
    let active = true
    void (async () => {
      if (await db.projects.count()) return
      const status = await fileSystemPersistence.getStatus()
      if (status.connection !== 'connected') return
      const [latest] = await fileSystemPersistence.listSnapshots()
      if (active && latest?.projectCount) setSnapshot(latest)
    })()
    return () => { active = false }
  }, [])

  const restore = async () => {
    if (!snapshot) return
    try {
      const data = await fileSystemPersistence.restoreSnapshot(snapshot.id)
      await repository.importData(data, 'replace')
      setSnapshot(null)
      notify('已从最近的本地快照恢复数据')
    } catch {
      notify('快照恢复失败，现有数据未被修改', 'error')
    }
  }

  return <Modal open={Boolean(snapshot)} title="发现可恢复的本地快照" description="当前浏览器中没有项目，但已授权目录里存在持久副本。" onClose={() => setSnapshot(null)}><div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm leading-6 text-text-primary"><strong>{snapshot?.projectCount} 个项目，{snapshot?.nodeCount} 个节点</strong><p>创建于 {snapshot && new Date(snapshot.createdAt).toLocaleString('zh-CN')}</p></div><p className="mt-4 text-sm leading-6 text-text-secondary">恢复会先校验快照，然后写入当前为空的本地数据库。快照文件本身不会被修改。</p><div className="mt-6 flex justify-end gap-3"><button className="button-secondary" onClick={() => setSnapshot(null)}>暂不恢复</button><button className="button-primary" onClick={restore}>恢复最近快照</button></div></Modal>
}
