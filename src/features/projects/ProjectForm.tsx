import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectInputSchema, type Project, type ProjectInput, projectTypes } from '../../domain/types'
import { statusLabels, projectTypeLabels } from '../../domain/rules'
import { Modal } from '../../components/Modal'

interface Props { open: boolean; project?: Project | null; onClose: () => void; onSubmit: (input: ProjectInput) => Promise<void> }
export function ProjectForm({ open, project, onClose, onSubmit }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProjectInput>({ resolver: zodResolver(projectInputSchema), defaultValues: { title: '', trigger: '', status: 'exploring', type: 'general' } })
  useEffect(() => { if (open) reset(project ? { title: project.title, trigger: project.trigger, status: project.status, type: project.type } : { title: '', trigger: '', status: 'exploring', type: 'general' }) }, [open, project, reset])
  return <Modal open={open} title={project ? '修正项目信息' : '开启一条新路线'} description="从真实需求或好奇出发，而不是先设定期限。" onClose={onClose}>
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <label className="field"><span>项目名称</span><input autoFocus {...register('title')} placeholder="例如：理解并搭建个人知识系统" />{errors.title && <small>{errors.title.message}</small>}</label>
      <label className="field"><span>现实触发</span><textarea rows={5} {...register('trigger')} placeholder="是什么问题、需求或好奇促使你开始？" />{errors.trigger && <small>{errors.trigger.message}</small>}</label>
      {!project && <label className="field"><span>项目类型</span><select {...register('type')}>{projectTypes.map((value) => <option key={value} value={value}>{projectTypeLabels[value]}</option>)}</select><small className="text-text-secondary">普通项目使用有向无环图，科研项目允许任意有向图</small></label>}
      {project && <label className="field"><span>当前状态</span><select {...register('status')}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <div className="flex justify-end gap-3 pt-2"><button type="button" className="button-secondary" onClick={onClose}>取消</button><button className="button-primary" disabled={isSubmitting}>{isSubmitting ? '保存中…' : project ? '保存修正' : '创建项目'}</button></div>
    </form>
  </Modal>
}
