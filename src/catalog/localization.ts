import { CATEGORIES, STYLES, TECH } from './meta'
import { englishCategories, englishStyles, englishTechnologies } from './locales/metadata.en'
import { englishDemoCopy } from './locales/demos.en'
import type { Language } from './i18n'
import type { CategoryId, DemoEntry, StyleId, TechId } from './types'

export function categoryText(id: CategoryId, language: Language) {
  const category = CATEGORIES[id]
  if (language === 'ja') return category
  const [label, description] = englishCategories[id]
  return { ...category, label, description }
}

export function styleText(id: StyleId, language: Language) {
  if (language === 'ja') return STYLES[id]
  const [name, keywords] = englishStyles[id]
  return { name, keywords }
}

export function techText(id: TechId, language: Language) {
  const tech = TECH[id]
  if (language === 'ja') return tech
  const [about, when] = englishTechnologies[id]
  return { ...tech, name: id === 'webgl' ? 'Raw WebGL' : tech.name, about, when }
}

export function demoText(demo: DemoEntry, language: Language) {
  const translation = language === 'en' && englishDemoCopy[demo.id]
  if (translation) return { ...translation, language: 'en' as const }
  const { title, description, prompt } = demo
  return { title, description, prompt, language: 'ja' as const }
}
