import { languages, selectLanguage, useCatalogLanguage } from './i18n'

const labels = { ja: '日本語', en: 'English' } as const

export function LanguageSwitch() {
  const { t, language } = useCatalogLanguage()

  return (
    <div role="group" aria-label={t('language')} className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-white/15 bg-zinc-950/90 p-0.5">
      {languages.map((option) => (
        <button key={option} type="button" lang={option} aria-pressed={language === option}
          onClick={() => selectLanguage(option)}
          className="rounded-full px-2 py-1 text-[11px] leading-none font-medium text-zinc-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-fuchsia-300 aria-pressed:bg-white aria-pressed:text-zinc-900">
          {labels[option]}
        </button>
      ))}
    </div>
  )
}
