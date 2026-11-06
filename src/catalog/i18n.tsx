import i18n from 'i18next'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { initReactI18next, useTranslation } from 'react-i18next'
import { catalogMessages } from './locales/catalog'
import { demoControls } from './locales/demoControls'

export const languages = ['ja', 'en'] as const
export type Language = typeof languages[number]

const preferenceKey = 'ui-showcase-language'

function isLanguage(value: unknown): value is Language {
  return value === 'ja' || value === 'en'
}

function initialLanguage(): Language {
  const shared = new URLSearchParams(location.search).get('lang')
  if (isLanguage(shared)) return shared
  try {
    const saved = localStorage.getItem(preferenceKey)
    if (isLanguage(saved)) return saved
  } catch {
    // Browsing modes that block storage can still switch languages.
  }
  return 'ja'
}

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

void i18n.use(initReactI18next).init({
  lng: initialLanguage(),
  supportedLngs: [...languages],
  fallbackLng: 'ja',
  ns: ['catalog', 'demoControls'],
  defaultNS: 'catalog',
  initAsync: false,
  resources: {
    ja: { catalog: catalogMessages.ja, demoControls: demoControls.ja },
    en: { catalog: catalogMessages.en, demoControls: demoControls.en },
  },
  interpolation: { escapeValue: false },
})

type CatalogLanguage = { t: ReturnType<typeof useTranslation<'catalog'>>['t']; language: Language }
const CatalogLanguageContext = createContext<CatalogLanguage | null>(null)

export function CatalogLanguageProvider({ children }: { children: ReactNode }) {
  const { t, i18n: instance } = useTranslation('catalog')
  const language: Language = instance.resolvedLanguage === 'en' ? 'en' : 'ja'
  const value = useMemo(() => ({ t, language }), [t, language])
  return <CatalogLanguageContext value={value}>{children}</CatalogLanguageContext>
}

export function useCatalogLanguage() {
  const context = useContext(CatalogLanguageContext)
  if (!context) throw new Error('CatalogLanguageProvider is missing')
  return context
}

export function selectLanguage(language: Language) {
  try {
    localStorage.setItem(preferenceKey, language)
  } catch {
    // The active language and shareable URL still work without storage.
  }
  const url = new URL(location.href)
  url.searchParams.set('lang', language)
  if (url.href !== location.href) history.replaceState(history.state, '', url)
  void i18n.changeLanguage(language)
}

export default i18n
