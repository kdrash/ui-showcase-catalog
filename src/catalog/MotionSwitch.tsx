import { ChevronDown } from 'lucide-react'
import { useCatalogLanguage } from './i18n'
import { motionMode, selectMotionMode, systemPrefersReduced, type MotionMode } from './motionPreference'

const options: MotionMode[] = ['system', 'full', 'reduce']

/** デモの動き(OSに従う / フル演出 / 減らす)の切り替え。切り替えるとページを再読み込みする */
export function MotionSwitch({ compact = false, showHint = false }: { compact?: boolean; showHint?: boolean }) {
  const { t } = useCatalogLanguage()
  const hint = showHint && motionMode === 'system' && systemPrefersReduced()

  if (compact) {
    return (
      <div>
        <label className="inline-flex max-w-full items-center gap-1.5 text-[11px] text-zinc-400">
          <span>{t('motion.label')}</span>
          <span className="relative inline-flex items-center">
            <select
              value={motionMode}
              title={t('motion.reloadNote')}
              onChange={(event) => selectMotionMode(event.currentTarget.value as MotionMode)}
              className="h-8 cursor-pointer appearance-none rounded-md bg-transparent pr-5 pl-1.5 font-medium text-zinc-300 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-fuchsia-300"
            >
              {options.map((option) => (
                <option key={option} value={option} className="bg-zinc-900">
                  {t(`motion.${option}`)}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" size={12} className="pointer-events-none absolute right-1" />
          </span>
        </label>
        {hint && <p className="max-w-64 text-[10px] leading-snug text-zinc-400">{t('motion.systemHint')}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        role="group"
        aria-label={t('motion.label')}
        title={t('motion.reloadNote')}
        className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-white/15 bg-zinc-950/90 p-0.5"
      >
        <span aria-hidden className="pr-0.5 pl-2 text-[10px] text-zinc-500">
          {t('motion.label')}
        </span>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={motionMode === option}
            onClick={() => selectMotionMode(option)}
            className="rounded-full px-2 py-1 text-[11px] leading-none font-medium text-zinc-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-fuchsia-300 aria-pressed:bg-white aria-pressed:text-zinc-900"
          >
            {t(`motion.${option}`)}
          </button>
        ))}
      </div>
      {hint && <p className="max-w-64 text-right text-[10px] leading-snug text-amber-300/90">{t('motion.systemHint')}</p>}
    </div>
  )
}
