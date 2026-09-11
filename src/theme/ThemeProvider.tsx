import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultThemeId, getThemeDefinition, resolveTheme, themes, themeStorageKey } from './themes'
import type { ThemeDefinition, ThemeId } from './theme-types'

interface ThemeContextValue {
  theme: ThemeId
  activeTheme: ThemeDefinition
  themes: ThemeDefinition[]
  setTheme: (theme: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) metaThemeColor.setAttribute('content', getThemeDefinition(theme).themeColor)
}

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return defaultThemeId
  return resolveTheme(window.localStorage.getItem(themeStorageKey))
}

// initialTheme 供只读分享页锁定主题：不读写访客的 localStorage 偏好。
export function ThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme?: ThemeId }) {
  const [theme, setThemeState] = useState<ThemeId>(() => initialTheme ?? getInitialTheme())

  useEffect(() => {
    applyTheme(theme)
    if (initialTheme === undefined) window.localStorage.setItem(themeStorageKey, theme)
  }, [initialTheme, theme])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    activeTheme: getThemeDefinition(theme),
    themes,
    setTheme: setThemeState,
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
