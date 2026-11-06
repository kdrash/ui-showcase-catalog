import { Suspense, useState } from 'react'
import { Check, Code2, Copy, Maximize2 } from 'lucide-react'
import { DemoErrorBoundary, DemoFallback, LazyMount } from './helpers'
import { useCatalogLanguage } from './i18n'
import { demoText, styleText, techText } from './localization'
import { buildPrompt, copyText } from './prompt'
import type { DemoEntry, StyleId, TechId } from './types'

export function TechBadge({ id, onClick, active }: { id: TechId; onClick?: () => void; active?: boolean }) {
  const { language } = useCatalogLanguage()
  const t = techText(id, language)
  return (
    <button
      type="button"
      onClick={onClick}
      title={t.pkg ? `npm: ${t.pkg}` : t.name}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] transition ${
        active
          ? 'border-white/40 bg-white/15 text-white'
          : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25 hover:bg-white/10'
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
      {t.name}
    </button>
  )
}

export function StyleChip({ id, onClick, active }: { id: StyleId; onClick?: () => void; active?: boolean }) {
  const { language } = useCatalogLanguage()
  const style = styleText(id, language)
  return (
    <button
      type="button"
      onClick={onClick}
      title={style.keywords}
      className={`rounded-full px-2.5 py-0.5 text-[11px] transition ${
        active
          ? 'bg-fuchsia-500/30 text-fuchsia-100 ring-1 ring-fuchsia-400/60'
          : 'bg-fuchsia-500/10 text-fuchsia-200/80 hover:bg-fuchsia-500/20'
      }`}
    >
      {style.name}
    </button>
  )
}

export function DemoPreview({ demo, height }: { demo: DemoEntry; height?: number | string }) {
  const C = demo.component
  return (
    <LazyMount
      keepMounted={!demo.heavy}
      className="relative w-full overflow-hidden bg-zinc-950"
      style={{ height: height ?? demo.height ?? 320 }}
    >
      <DemoErrorBoundary>
        <Suspense fallback={<DemoFallback />}>
          <C />
        </Suspense>
      </DemoErrorBoundary>
    </LazyMount>
  )
}

export function DemoCard({
  demo,
  onOpen,
  onTech,
  onStyle,
}: {
  demo: DemoEntry
  onOpen: () => void
  onTech: (t: TechId) => void
  onStyle: (s: StyleId) => void
}) {
  const { t, language } = useCatalogLanguage()
  const [copiedLanguage, setCopiedLanguage] = useState<string | null>(null)
  const copy = demoText(demo, language)
  const copied = copiedLanguage === copy.language
  const japaneseFallback = language === 'en' && copy.language === 'ja'
  return (
    <article
      id={`demo-${demo.id}`}
      className={`group flex scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-xl shadow-black/30 transition hover:border-white/20 ${
        demo.wide ? 'md:col-span-2' : ''
      }`}
    >
      <div className="border-b border-white/10">
        <DemoPreview demo={demo} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 lang={copy.language} className="font-semibold tracking-tight text-zinc-50">{copy.title}</h3>
            <p lang={copy.language} className="mt-1 text-[13px] leading-relaxed text-zinc-400">{copy.description}</p>
            {japaneseFallback && <span className="mt-1 inline-block text-[10px] font-medium text-zinc-400">{t('japaneseContent')}</span>}
          </div>
          <button
            type="button"
            onClick={onOpen}
            title={t('openDetails')}
            className="shrink-0 rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:border-white/30 hover:text-white"
          >
            <Maximize2 size={15} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {demo.tech.map((t) => (
            <TechBadge key={t} id={t} onClick={() => onTech(t)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {demo.styles.map((s) => (
            <StyleChip key={s} id={s} onClick={() => onStyle(s)} />
          ))}
        </div>
        <div className="mt-auto flex gap-2 pt-1">
          <button
            type="button"
            onClick={async () => {
              if (await copyText(buildPrompt(demo, language))) {
                setCopiedLanguage(copy.language)
                setTimeout(() => setCopiedLanguage(null), 1600)
              }
            }}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200 active:scale-[0.98]"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {t(copied ? 'copied' : japaneseFallback ? 'copyJapanesePrompt' : 'copyPrompt')}
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/10"
          >
            <Code2 size={14} /> {t('code')}
          </button>
        </div>
      </div>
    </article>
  )
}
