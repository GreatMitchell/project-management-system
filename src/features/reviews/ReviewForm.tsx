import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '../../components/Modal'
import { reviewInputSchema, type Review, type ReviewInput, type ReviewTrigger } from '../../domain/types'

const triggerLabels = { milestone: '里程碑验证', project_end: '项目结束', manual: '主动审视' }
export function ReviewForm({ open, review, trigger = 'manual', onClose, onSubmit }: { open: boolean; review?: Review | null; trigger?: ReviewTrigger; onClose: () => void; onSubmit: (input: ReviewInput) => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReviewInput>({ resolver: zodResolver(reviewInputSchema), defaultValues: { trigger, health: '', execution: '', systemAdjustment: '' } })
  useEffect(() => { if (open) reset(review ? { trigger: review.trigger, health: review.health, execution: review.execution, systemAdjustment: review.systemAdjustment } : { trigger, health: '', execution: '', systemAdjustment: '' }) }, [open, review, trigger, reset])
  return <Modal open={open} title="停下来审视路线" description="不是评价自己，而是检查项目、执行模式和系统是否符合现实。" onClose={onClose} width="max-w-2xl"><form className="space-y-5" onSubmit={handleSubmit(onSubmit)}><label className="field"><span>触发原因</span><select {...register('trigger')}>{Object.entries(triggerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>1. 当前项目健康度如何？</span><textarea rows={3} {...register('health')} placeholder="状态分布是否合理？有无长期卡顿？" />{errors.health && <small>{errors.health.message}</small>}</label><label className="field"><span>2. 最近的执行模式是否有问题？</span><textarea rows={3} {...register('execution')} placeholder="是否在某个环节停留过久？" />{errors.execution && <small>{errors.execution.message}</small>}</label><label className="field"><span>3. 系统本身是否需要调整？</span><textarea rows={3} {...register('systemAdjustment')} placeholder="里程碑划分、日志字段或流程需要变化吗？" />{errors.systemAdjustment && <small>{errors.systemAdjustment.message}</small>}</label><div className="flex justify-end gap-3"><button type="button" className="button-secondary" onClick={onClose}>取消</button><button className="button-primary" disabled={isSubmitting}>保存审视</button></div></form></Modal>
}
