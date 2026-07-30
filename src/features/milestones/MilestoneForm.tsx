import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '../../components/Modal'
import { milestoneInputSchema, type Milestone, type MilestoneInput } from '../../domain/types'

export function MilestoneForm({ open, milestone, onClose, onSubmit, onDelete }: { open: boolean; milestone?: Milestone | null; onClose: () => void; onSubmit: (input: MilestoneInput) => Promise<void>; onDelete?: () => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MilestoneInput>({ resolver: zodResolver(milestoneInputSchema), defaultValues: { title: '', method: '', criteria: '', result: null, feeling: '' } })
  const milestoneId = milestone?.id
  useEffect(() => {
    if (!open) return
    reset(milestone ? { title: milestone.title, method: milestone.method, criteria: milestone.criteria, result: milestone.result, feeling: milestone.feeling } : { title: '', method: '', criteria: '', result: null, feeling: '' })
    // The entity object can be refreshed by Dexie while the modal is open; only a target change should reset user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, milestoneId, reset])
  return <Modal open={open} title={milestone ? '执行里程碑验证' : '设为里程碑'} description="先写清如何验证和什么算通过，再诚实记录实践结果。" onClose={onClose} width="max-w-2xl"><form className="space-y-5" onSubmit={handleSubmit(onSubmit)}><label className="field"><span>里程碑名称</span><input {...register('title')} placeholder="例如：完成可供自己连续使用的原型" />{errors.title && <small>{errors.title.message}</small>}</label><div className="grid gap-5 md:grid-cols-2"><label className="field"><span>验证方式</span><textarea rows={4} {...register('method')} placeholder="跑通 Demo、实际使用一次…" />{errors.method && <small>{errors.method.message}</small>}</label><label className="field"><span>通过标准</span><textarea rows={4} {...register('criteria')} placeholder="出现什么结果才算通过？" />{errors.criteria && <small>{errors.criteria.message}</small>}</label></div><label className="field"><span>验证结果</span><select {...register('result', { setValueAs: (value) => value || null })}><option value="">待验证</option><option value="passed">通过</option><option value="partial">部分通过</option><option value="failed">未通过</option></select></label><label className="field"><span>结果感受</span><textarea rows={4} {...register('feeling')} placeholder="满意吗？有什么意外？接下来想做什么？" /></label><div className="flex justify-between gap-3">{milestone && onDelete ? <button type="button" className="text-sm text-rose-700" onClick={onDelete}>取消里程碑</button> : <span />}<div className="flex gap-3"><button type="button" className="button-secondary" onClick={onClose}>取消</button><button className="button-primary" disabled={isSubmitting}>{milestone ? '保存验证' : '创建里程碑'}</button></div></div></form></Modal>
}
