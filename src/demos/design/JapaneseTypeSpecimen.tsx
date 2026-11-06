import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const settings = [
  { name: 'tight', spacing: '-.06em', leading: '1.25' },
  { name: 'standard', spacing: '.03em', leading: '1.65' },
  { name: 'loose', spacing: '.13em', leading: '2' },
] as const

export function JapaneseTypeSpecimen() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'typeSpecimen' })
  const [spacing, setSpacing] = useState(1)
  const [vertical, setVertical] = useState(false)
  const current = settings[spacing]

  return (
    <div className="@container flex h-full w-full flex-col overflow-hidden bg-[#eeeade] text-[#302b24]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#302b24]/35 px-[5%] py-2.5">
        <p className="font-mono text-[10px] font-bold tracking-[.18em]">活字見本帖 / TYPE SPECIMEN</p>
        <div className="flex flex-wrap gap-1.5">
          <div role="group" aria-label={t('group')} className="flex gap-1">
            {settings.map(({ name }, index) => (
              <button key={name} type="button" aria-pressed={spacing === index} onClick={() => setSpacing(index)}
                className="rounded-sm border border-current/35 px-2 py-1 text-[10px] aria-pressed:bg-[#302b24] aria-pressed:text-[#eeeade]">{t(name)}</button>
            ))}
          </div>
          <button type="button" aria-pressed={vertical} onClick={() => setVertical(!vertical)}
            className="rounded-sm border border-[#913d31] px-2 py-1 text-[10px] font-bold text-[#913d31] aria-pressed:bg-[#913d31] aria-pressed:text-white">{t('vertical')}</button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-[5%] pt-4 pb-[var(--solo-footer-clearance,1rem)] @lg:pt-6">
        <div className="mx-auto grid min-h-full max-w-5xl grid-rows-[1fr_auto]">
          <article lang="ja" className={`relative isolate grid min-h-67 overflow-hidden border-y border-[#302b24]/40 py-4 font-serif ${vertical ? 'content-center' : 'content-center gap-4'}`}
            style={{ letterSpacing: current.spacing, lineHeight: current.leading }}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-30 [background:repeating-linear-gradient(0deg,transparent_0_23px,#8b776c55_23px_24px)]" />
            <div className={vertical ? 'mx-auto flex flex-row-reverse items-start gap-3 @md:gap-8' : 'grid gap-2'}>
              <h2 className={vertical
                ? 'font-bold text-[clamp(1.45rem,3.7cqw,3rem)] [writing-mode:vertical-rl]'
                : 'text-[clamp(1.65rem,5.7cqw,4.4rem)] font-bold'}>
                <ruby>余白<rt className="text-[.34em] font-normal text-[#913d31]">よはく</rt></ruby>を、読む。
              </h2>
              <p className={vertical
                ? 'max-h-62 text-xs [writing-mode:vertical-rl] @md:text-sm'
                : 'max-w-[36em] text-[clamp(.83rem,2.1cqw,1.14rem)]'} style={{ lineHeight: 'inherit' }}>
                文字と文字のあいだには、短い息継ぎがある。{vertical && <br />}
                風の音を聞くように、一行ずつ。
              </p>
              <p className={`text-[10px] font-semibold text-[#913d31] ${vertical ? '[writing-mode:vertical-rl]' : 'font-mono'}`}>
                第<span className="[text-combine-upright:all]">12</span>号　活字と余白
              </p>
            </div>
          </article>
          <footer className="flex flex-wrap justify-between gap-2 pt-3 font-mono text-[9px] tracking-wider">
            <span>{t(vertical ? 'vertical' : 'horizontal')}</span>
            <output aria-label={t('settings')}>{t('values', current)}</output>
          </footer>
        </div>
      </div>
    </div>
  )
}
