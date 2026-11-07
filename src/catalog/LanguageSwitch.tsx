import { languages, selectLanguage, useCatalogLanguage } from './i18n'

const labels = { ja: '日本語', en: 'English' } as const

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { t, language } = useCatalogLanguage()
  const groupClass = compact
    ? 'inline-flex shrink-0 items-center'
    : 'inline-flex shrink-0 items-center gap-0.5 rounded-full border border-white/15 bg-zinc-950/90 p-0.5'
  const buttonClass = compact
    ? 'min-h-8 min-w-7 rounded-md text-[11px] font-medium text-zinc-400 hover:bg-white/5 aria-pressed:bg-white/7 aria-pressed:text-zinc-100'
    : 'rounded-full px-2 py-1 text-[11px] leading-none font-medium text-zinc-300 hover:bg-white/10 aria-pressed:bg-white aria-pressed:text-zinc-900'

  return (
    <div role="group" aria-label={t('language')} className={groupClass}>
      {languages.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-label={compact ? `${option.toUpperCase()} (${labels[option]})` : undefined}
          title={compact ? labels[option] : undefined}
          aria-pressed={language === option}
          onClick={() => selectLanguage(option)}
          className={`${buttonClass} focus-visible:outline-2 focus-visible:outline-fuchsia-300`}
        >
          {compact ? option.toUpperCase() : labels[option]}
        </button>
      ))}
    </div>
  )
}
