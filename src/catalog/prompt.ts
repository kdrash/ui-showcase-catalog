import i18n, { type Language } from './i18n'
import { demoText, styleText, techText } from './localization'
import type { DemoEntry } from './types'

/** 「プロンプトをコピー」で渡す全文 */
export function buildPrompt(d: DemoEntry, language: Language): string {
  const copy = demoText(d, language)
  const t = i18n.getFixedT(copy.language, 'catalog')
  const tech = d.tech
    .filter((t) => t !== 'react')
    .map((t) => {
      const m = techText(t, copy.language)
      return m.pkg ? `${m.name} (npm: ${m.pkg})` : m.name
    })
    .join(', ')
  const styles = d.styles.map((s) => {
    const { name, keywords } = styleText(s, copy.language)
    return copy.language === 'en' ? `${name} (${keywords})` : `${name}(${keywords})`
  }).join(' / ')
  return [
    t('promptText.title', { title: copy.title }),
    copy.prompt,
    '',
    t('promptText.tech', { tech: tech || 'React' }),
    t('promptText.style', { styles }),
    t('promptText.source', { file: `src/demos/${d.file}` }),
  ].join('\n')
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}
