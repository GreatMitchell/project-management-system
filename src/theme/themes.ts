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
    description: '暗色冒险任务日志风格，用任务契约、路线事件与检查点强化行动反馈。',
    themeColor: '#17141f',
    preview: {
      background: '#17141f',
      surface: '#231d33',
      accent: '#ffb84d',
      highlight: '#93ff85',
    },
  },
  {
    id: 'golden',
    label: 'Golden',
    description: '黑漆底鎏金镶嵌：双金线装裱、八角铭牌节点与衬线镌刻，烛光式光泽，庄重华贵。',
    themeColor: '#14100a',
    preview: {
      background: '#14100a',
      surface: '#211b11',
      accent: '#e8b54a',
      highlight: '#f3dfa6',
    },
  },
  {
    id: 'guofeng',
    label: 'GuFeng',
    description: '宋版书页的暖纸烟墨：乌丝栏界行、装裱双线与楷书题签，朱砂只作印泥点睛。',
    themeColor: '#221e19',
    preview: {
      background: '#f0ece3',
      surface: '#fcf9f3',
      accent: '#ab3a30',
      highlight: '#35545c',
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
