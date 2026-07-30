import type { ThemeDefinition, ThemeId } from './theme-types'

export const defaultThemeId: ThemeId = 'calm'
export const themeStorageKey = 'praxis-path-theme'

export const themes: ThemeDefinition[] = [
  {
    id: 'calm',
    label: 'Calm',
    description: '米纸背景与沉静墨色，适合长时间规划与整理。',
    themeColor: '#18231f',
    preview: {
      background: '#f4f1e8',
      surface: '#fffdf8',
      accent: '#c5913f',
      highlight: '#52675d',
    },
  },
  {
    id: 'tech',
    label: 'Tech',
    description: '深色数据控制台风格，强化信号感、结构线与高亮反馈。',
    themeColor: '#08111f',
    preview: {
      background: '#08111f',
      surface: '#0f1b2d',
      accent: '#4fd1ff',
      highlight: '#7ef7c8',
    },
  },
  {
    id: 'game',
    label: 'Game',
    description: '轻量任务成就风，像在推进任务面板与收集进度奖励。',
    themeColor: '#17141f',
    preview: {
      background: '#17141f',
      surface: '#231d33',
      accent: '#ffb84d',
      highlight: '#93ff85',
    },
  },
]

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return themes.some((theme) => theme.id === value)
}

export function resolveTheme(themeId: string | null | undefined): ThemeId {
  return isThemeId(themeId) ? themeId : defaultThemeId
}

export function getThemeDefinition(themeId: ThemeId) {
  return themes.find((theme) => theme.id === themeId) ?? themes[0]
}
