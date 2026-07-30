import { ArchiveRestore, FolderKanban, Menu, Route, Settings, X } from 'lucide-react'
import { AutoSnapshotController } from '../persistence/AutoSnapshotController'
import { StartupRecoveryPrompt } from '../persistence/StartupRecoveryPrompt'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/projects', label: '项目路线', icon: FolderKanban },
  { to: '/reviews', label: '审视记录', icon: ArchiveRestore },
  { to: '/settings', label: '数据设置', icon: Settings },
]

export function AppShell() {
  const [open, setOpen] = useState(false)
  return <div className="min-h-screen bg-paper text-ink"><AutoSnapshotController /><StartupRecoveryPrompt /><button className="fixed left-4 top-4 z-40 rounded-xl bg-ink p-2.5 text-white lg:hidden" onClick={() => setOpen(true)} aria-label="打开导航"><Menu size={20} /></button>{open && <button className="fixed inset-0 z-40 bg-ink/30 lg:hidden" aria-label="关闭导航遮罩" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-ink px-5 py-7 text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex items-center justify-between px-2"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-paper text-ink"><Route size={22} /></span><div><strong className="font-serif text-xl tracking-wide">践途</strong><p className="text-[10px] uppercase tracking-[.22em] text-white/45">Praxis Path</p></div></div><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="关闭导航"><X /></button></div><nav className="mt-12 space-y-2">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${isActive ? 'bg-white text-ink' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}><Icon size={18} />{label}</NavLink>)}</nav><div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4"><p className="font-serif text-sm text-white/90">实践不是计划的终点，</p><p className="mt-1 font-serif text-sm text-white/90">而是认识的新起点。</p><div className="mt-4 h-px bg-white/10" /><p className="mt-3 text-[10px] tracking-widest text-white/35">本地存储 · 数据属于你</p></div></aside>
    <main className="min-h-screen lg:pl-72"><Outlet /></main></div>
}
