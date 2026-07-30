export type ThemeId = 'calm' | 'tech' | 'game'

export interface ThemeDefinition {
  id: ThemeId
  label: string
  description: string
  themeColor: string
  preview: {
    background: string
    surface: string
    accent: string
    highlight: string
  }
}
