import { zodResolver } from '@hookform/resolvers/zod'
import { useLayoutEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '../../components/Modal'
import { statusLabels } from '../../domain/rules'
import { nodeInputSchema, type NodeInput, type PraxisNode } from '../../domain/types'

export function NodeForm({ open, node, defaultType = 'question', onClose, onSubmit }: { open: boolean; node?: PraxisNode | null; defaultType?: NodeInput['type']; onClose: () => void; onSubmit: (input: NodeInput) => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<NodeInput>({ resolver: zodResolver(nodeInputSchema), defaultValues: { type: defaultType, content: '', status: 'exploring', log: '' } })
  useLayoutEffect(() => { if (open) reset(node ? { type: node.type, content: node.content, status: node.status, log: node.log } : { type: defaultType, content: '', status: defaultType === 'result' ? 'completed' : 'exploring', log: '' }) }, [open, node, defaultType, reset])
  return <Modal open={open} title={node ? '修正节点' : '添加实践节点'} description="节点不是待办事项，而是路线上的认识与行动。" onClose={onClose}><form className="space-y-5" onSubmit={handleSubmit(onSubmit)}><label className="field"><span>节点类型</span><select {...register('type')}><option value="question">问题 · 明确需要认识什么</option><option value="solution">方案 · 记录准备如何实践</option><option value="result">结果 · 保存客观产出</option></select></label><label className="field"><span>节点内容</span><textarea autoFocus rows={5} {...register('content')} placeholder="具体记录问题、尝试或结果…" />{errors.content && <small>{errors.content.message}</small>}</label><label className="field"><span>状态</span><select {...register('status')}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="field"><span>附加日志 <em className="font-normal text-text-secondary">（客观成果与主观感受）</em></span><textarea rows={4} {...register('log')} placeholder="做成了什么？感受如何？有什么意外？" /></label><div className="flex justify-end gap-3"><button type="button" className="button-secondary" onClick={onClose}>取消</button><button className="button-primary" disabled={isSubmitting}>保存节点</button></div></form></Modal>
}
