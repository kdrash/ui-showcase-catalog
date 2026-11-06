import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, Check, Copy, ExternalLink, LayoutGrid, Palette, Search, X } from 'lucide-react'
import { DEMOS } from './catalog/registry'
import { CATEGORIES, STYLES, TECH } from './catalog/meta'
import { DemoCard, StyleChip, TechBadge } from './catalog/DemoCard'
import { DemoModal } from './catalog/DemoModal'
import { LanguageSwitch } from './catalog/LanguageSwitch'
import { useCatalogLanguage } from './catalog/i18n'
import { categoryText, demoText, styleText, techText } from './catalog/localization'
import { englishDemoCopy } from './catalog/locales/demos.en'
import { copyText } from './catalog/prompt'
import type { CategoryId, StyleId, TechId } from './catalog/types'

type View = 'catalog' | 'tech' | 'styles'

const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[]
const usedTech = (Object.keys(TECH) as TechId[]).filter((t) => DEMOS.some((d) => d.tech.includes(t)))
const usedStyles = (Object.keys(STYLES) as StyleId[]).filter((s) => DEMOS.some((d) => d.styles.includes(s)))
const englishDemos = DEMOS.filter((demo) => englishDemoCopy[demo.id])

function toggle<T>(set: Set<T>, v: T) {
  const n = new Set(set)
  if (n.has(v)) n.delete(v)
  else n.add(v)
  return n
}

export function App() {
  const { t, language } = useCatalogLanguage()
  const [view, setView] = useState<View>('catalog')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [techFilter, setTechFilter] = useState<Set<TechId>>(new Set())
  const [styleFilter, setStyleFilter] = useState<Set<StyleId>>(new Set())
  const [query, setQuery] = useState('')
  const [englishOnly, setEnglishOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(() => location.hash.slice(1) || null)

  const open = DEMOS.find((d) => d.id === openId) ?? null

  useEffect(() => {
    const url = new URL(location.href)
    url.hash = openId ?? ''
    if (url.href !== location.href) history.replaceState(history.state, '', url)
  }, [openId])

  const englishFilter = language === 'en' && englishOnly
  const candidates = englishFilter ? englishDemos : DEMOS
  const filtered = useMemo(() => {
    const q = query.trim().normalize('NFKC').toLowerCase()
    return candidates.filter((d) => {
      if (category !== 'all' && d.category !== category) return false
      if (techFilter.size && !d.tech.some((t) => techFilter.has(t))) return false
      if (styleFilter.size && !d.styles.some((s) => styleFilter.has(s))) return false
      if (q) {
        const english = englishDemoCopy[d.id]
        const hay = [
          d.id,
          d.title,
          d.description,
          d.prompt,
          english?.title,
          english?.description,
          english?.prompt,
          CATEGORIES[d.category].label,
          categoryText(d.category, 'en').label,
          ...d.tech.map((id) => `${TECH[id].name} ${techText(id, 'en').name} ${TECH[id].pkg ?? ''}`),
          ...d.styles.map((id) => `${STYLES[id].name} ${styleText(id, 'en').name}`),
        ]
          .join(' ')
          .normalize('NFKC')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [candidates, category, techFilter, styleFilter, query])

  const filterByTech = useCallback((t: TechId) => {
    setView('catalog')
    setCategory('all')
    setTechFilter(new Set([t]))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  const filterByStyle = useCallback((s: StyleId) => {
    setView('catalog')
    setCategory('all')
    setStyleFilter(new Set([s]))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const hasFilter = category !== 'all' || techFilter.size > 0 || styleFilter.size > 0 || query !== '' || englishFilter
  const clearAll = () => {
    setCategory('all')
    setTechFilter(new Set())
    setStyleFilter(new Set())
    setQuery('')
    setEnglishOnly(false)
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* ───────── Sidebar ───────── */}
      <aside className="thin-scroll border-b border-white/10 bg-zinc-950/80 p-5 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 text-lg shadow-lg shadow-fuchsia-500/30">
              ✦
            </div>
            <div>
              <div className="font-bold leading-tight tracking-tight">UI Showcase</div>
              <div className="text-[11px] text-zinc-500">
                {t('summary', { demos: DEMOS.length, tech: usedTech.length, styles: usedStyles.length })}
              </div>
            </div>
          </div>
          <LanguageSwitch />
        </div>

        <nav aria-label={t('navigation')} className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 text-xs">
          {(
            [
              ['catalog', LayoutGrid],
              ['tech', BookOpen],
              ['styles', Palette],
            ] as const
          ).map(([k, Icon]) => (
            <button
              key={k}
              type="button"
              aria-pressed={view === k}
              onClick={() => setView(k)}
              className={`relative flex items-center justify-center gap-1 rounded-lg py-1.5 transition ${
                view === k ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {view === k && (
                <motion.span layoutId="view-pill" className="absolute inset-0 rounded-lg bg-white/10" />
              )}
              <Icon size={13} className="relative" />
              <span className="relative">{t(`views.${k}.label`)}</span>
            </button>
          ))}
        </nav>

        <label className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 focus-within:border-white/30">
          <Search size={14} className="text-zinc-500" />
          <input
            aria-label={t('search')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setView('catalog')
            }}
            placeholder={t('searchHint')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
          />
          {query && (
            <button type="button" aria-label={t('clearSearch')} onClick={() => setQuery('')} className="text-zinc-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </label>

        {language === 'en' && (
          <label className="mt-3 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-300">
            <input type="checkbox" checked={englishOnly} onChange={(event) => {
              setEnglishOnly(event.target.checked)
              setView('catalog')
            }} className="accent-fuchsia-400" />
            {t('englishOnly', { count: englishDemos.length })}
          </label>
        )}

        <SectionLabel>{t('categories')}</SectionLabel>
        <div className="flex flex-wrap gap-1 lg:flex-col">
          {(['all', ...CATEGORY_IDS] as const).map((c) => {
            const count = c === 'all' ? candidates.length : candidates.filter((d) => d.category === c).length
            const meta = c === 'all' ? undefined : categoryText(c, language)
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setCategory(c)
                  setView('catalog')
                  window.scrollTo({ top: 0 })
                }}
                className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                  active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                <span>
                  {meta ? `${meta.emoji} ${meta.label}` : `✨ ${t('all')}`}
                </span>
                <span className="font-mono text-[11px] text-zinc-500">{count}</span>
              </button>
            )
          })}
        </div>

        <SectionLabel>{t('styles')}</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {usedStyles.map((s) => (
            <StyleChip
              key={s}
              id={s}
              active={styleFilter.has(s)}
              onClick={() => {
                setStyleFilter((p) => toggle(p, s))
                setView('catalog')
              }}
            />
          ))}
        </div>

        <SectionLabel>{t('technology')}</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {usedTech.map((t) => (
            <TechBadge
              key={t}
              id={t}
              active={techFilter.has(t)}
              onClick={() => {
                setTechFilter((p) => toggle(p, t))
                setView('catalog')
              }}
            />
          ))}
        </div>

        {hasFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="mt-5 w-full rounded-lg border border-white/10 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            {t('clearFilters')}
          </button>
        )}
      </aside>

      {/* ───────── Main ───────── */}
      <main className="min-w-0 flex-1">
        <header className="shell-aurora relative overflow-hidden border-b border-white/10 px-6 py-10 sm:px-10">
          <div className="text-xs font-medium tracking-[0.3em] text-fuchsia-300/80">UI SHOWCASE CATALOG</div>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">
            {t(`views.${view}.title`)}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {t(`views.${view}.description`)}
          </p>
        </header>

        <div className="px-4 py-8 sm:px-8">
          {view === 'catalog' && (
            <CatalogView
              demos={filtered}
              onOpen={setOpenId}
              onTech={filterByTech}
              onStyle={filterByStyle}
              onClear={clearAll}
            />
          )}
          {view === 'tech' && <TechView onFilter={filterByTech} />}
          {view === 'styles' && <StylesView onFilter={filterByStyle} />}
        </div>
      </main>

      <AnimatePresence>{open && <DemoModal key={open.id} demo={open} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mt-6 mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">{children}</div>
}

function CatalogView({
  demos,
  onOpen,
  onTech,
  onStyle,
  onClear,
}: {
  demos: typeof DEMOS
  onOpen: (id: string) => void
  onTech: (t: TechId) => void
  onStyle: (s: StyleId) => void
  onClear: () => void
}) {
  const { t, language } = useCatalogLanguage()
  if (!demos.length)
    return (
      <div className="grid place-items-center py-24 text-center text-zinc-500">
        <div>
        {t('noResults')}
          <button type="button" onClick={onClear} className="mt-3 block w-full text-sm text-fuchsia-300 underline">
          {t('clearFilters')}
          </button>
        </div>
      </div>
    )
  return (
    <div className="space-y-14">
      {CATEGORY_IDS.map((c) => {
        const list = demos.filter((d) => d.category === c)
        if (!list.length) return null
        const meta = categoryText(c, language)
        return (
          <section key={c}>
            <div className="mb-5 flex items-baseline gap-3">
              <h2 className="text-xl font-bold tracking-tight">
                {meta.emoji} {meta.label}
              </h2>
              <span className="font-mono text-xs text-zinc-500">{list.length}</span>
              <span className="hidden text-sm text-zinc-500 sm:inline">— {meta.description}</span>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {list.map((d) => (
                <DemoCard
                  key={d.id}
                  demo={d}
                  onOpen={() => onOpen(d.id)}
                  onTech={onTech}
                  onStyle={onStyle}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TechView({ onFilter }: { onFilter: (t: TechId) => void }) {
  const { t, language } = useCatalogLanguage()
  const [copied, setCopied] = useState<string | null>(null)
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {usedTech.map((id) => {
        const m = techText(id, language)
        const demos = DEMOS.filter((d) => d.tech.includes(id))
        return (
          <div key={id} className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-lg font-bold">
                <span className="h-3 w-3 rounded-full" style={{ background: m.color, boxShadow: `0 0 12px ${m.color}` }} />
                {m.name}
              </div>
              <a href={m.url} target="_blank" rel="noreferrer" title={t('docs')} className="text-zinc-500 hover:text-white">
                <ExternalLink size={15} />
              </a>
            </div>
            {m.pkg && (
              <button
                type="button"
                title={t('copyInstall')}
                onClick={async () => {
                  if (await copyText(`npm i ${m.pkg}`)) {
                    setCopied(id)
                    setTimeout(() => setCopied(null), 1200)
                  }
                }}
                className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-emerald-300 hover:border-white/25"
              >
                <span className="truncate">$ npm i {m.pkg}</span>
                {copied === id ? <Check size={12} /> : <Copy size={12} />}
              </button>
            )}
            <p className="mt-3 text-sm text-zinc-300">{m.about}</p>
            <p className="mt-1.5 text-xs text-zinc-500">{t('useCases', { text: m.when })}</p>
            <div className="mt-4 flex flex-wrap gap-1">
              {demos.slice(0, 8).map((d) => {
                const copy = demoText(d, language)
                return <span key={d.id} lang={copy.language} className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400">{copy.title}</span>
              })}
              {demos.length > 8 && <span className="text-[11px] text-zinc-500">+{demos.length - 8}</span>}
            </div>
            <button
              type="button"
              onClick={() => onFilter(id)}
              className="mt-auto pt-4 text-left text-xs font-medium text-fuchsia-300 hover:text-fuchsia-200"
            >
              {t('viewLibraryDemos', { count: demos.length })}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function StylesView({ onFilter }: { onFilter: (s: StyleId) => void }) {
  const { t, language } = useCatalogLanguage()
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {usedStyles.map((s) => {
        const demos = DEMOS.filter((d) => d.styles.includes(s))
        const style = styleText(s, language)
        return (
          <button
            key={s}
            type="button"
            onClick={() => onFilter(s)}
            className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 text-left transition hover:border-fuchsia-400/40 hover:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-lg font-bold">{style.name}</div>
              <span className="shrink-0 font-mono text-xs text-zinc-500">{t('demoCount', { count: demos.length })}</span>
            </div>
            <code className="mt-1 block text-[11px] text-zinc-500">{s}</code>
            <p className="mt-3 text-sm text-zinc-300">{style.keywords}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {demos.slice(0, 6).map((d) => {
                const copy = demoText(d, language)
                return <span key={d.id} lang={copy.language} className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400">{copy.title}</span>
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
