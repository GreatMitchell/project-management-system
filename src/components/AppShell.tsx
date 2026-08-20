import { ArchiveRestore, FolderKanban, Menu, PanelLeftClose, PanelLeftOpen, Route, Settings, X } from 'lucide-react'
import { AutoSnapshotController } from '../persistence/AutoSnapshotController'
import { StartupRecoveryPrompt } from '../persistence/StartupRecoveryPrompt'
import { useLayoutEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/projects', label: '项目路线', icon: FolderKanban },
  { to: '/reviews', label: '审视记录', icon: ArchiveRestore },
  { to: '/settings', label: '数据设置', icon: Settings },
]

const sidebarStorageKey = 'praxis-path-sidebar'

function getInitialCollapsed() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(sidebarStorageKey) === 'collapsed'
}

export function AppShell() {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  useLayoutEffect(() => {
    document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'expanded'
    window.localStorage.setItem(sidebarStorageKey, collapsed ? 'collapsed' : 'expanded')
  }, [collapsed])

  return (
    <div className="min-h-screen bg-app text-text-primary transition-colors duration-300">
      <AutoSnapshotController />
      <StartupRecoveryPrompt />

      <button
        className="fixed left-4 top-4 z-40 rounded-2xl border border-line/20 bg-sidebar/95 p-2.5 text-sidebar-fg shadow-glow lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="打开导航"
      >
        <Menu size={20} />
      </button>

      {open && (
        <button
          className="fixed inset-0 z-40 bg-overlay/55 backdrop-blur-sm lg:hidden"
          aria-label="关闭导航遮罩"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-72 flex-col px-5 py-7 shadow-card transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'app-sidebar-collapsed' : ''}`}
      >
        <div className="sidebar-system-label tech-only" aria-hidden="true"><span>SYSTEM / PRAXIS</span><span>LOCAL NODE · ONLINE</span></div>
        <div className="sidebar-header flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-primary text-text-inverse shadow-glow">
              <Route size={22} />
            </span>
            <div className="sidebar-brand-text">
              <strong className="sidebar-brand-text font-serif text-xl tracking-wide text-sidebar-fg">刻度</strong>
              <p className="sidebar-brand-text text-[10px] uppercase tracking-[.22em] text-sidebar-fg/55">Praxis Path</p>
            </div>
          </div>
          <button className="sidebar-collapse-toggle hidden lg:grid" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'} aria-expanded={!collapsed} title={collapsed ? '展开侧边栏' : '收起侧边栏'}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button className="text-sidebar-fg/75 transition hover:text-sidebar-fg lg:hidden" onClick={() => setOpen(false)} aria-label="关闭导航">
            <X />
          </button>
        </div>

        <nav className="mt-12 space-y-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              data-label={label}
              title={collapsed ? label : undefined}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `sidebar-link flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${isActive ? 'sidebar-link-active' : 'sidebar-link-idle'}`
              }
            >
              <Icon size={18} />
              <span className="sidebar-link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-quote sidebar-collapsible mt-auto rounded-[calc(var(--radius-card)-0.25rem)] p-4 backdrop-blur-sm">
          <p className="font-serif text-sm text-sidebar-fg/92">只有人们的社会实践，才是人们对于外界认识的真理性的标准。</p>
          <p className="mt-1 font-serif text-sm text-sidebar-fg/92"></p>
          <div className="mt-4 h-px bg-sidebar-fg/12" />
          <p className="mt-3 text-[10px] tracking-widest text-sidebar-fg/42">本地存储 · 数据属于你</p>
        </div>
      </aside>

      <main className="app-main min-h-screen lg:pl-72">
        <Outlet />
      </main>
    </div>
  )
}
