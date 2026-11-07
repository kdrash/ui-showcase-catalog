import { useCatalogLanguage } from './i18n'
import { motionMode, selectMotionMode, systemPrefersReduced, type MotionMode } from './motionPreference'

const options: MotionMode[] = ['system', 'full', 'reduce']

/** デモの動き(OSに従う / フル演出 / 減らす)の切り替え。切り替えるとページを再読み込みする */
export function MotionSwitch({ showHint = false }: { showHint?: boolean }) {
  const { t } = useCatalogLanguage()
  const hint = showHint && motionMode === 'system' && systemPrefersReduced()

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
