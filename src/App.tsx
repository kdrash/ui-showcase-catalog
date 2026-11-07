import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, Check, Copy, ExternalLink, LayoutGrid, Palette, Search, X } from 'lucide-react'
import { DEMOS } from './catalog/registry'
import { CATEGORIES, STYLES, TECH } from './catalog/meta'
import { DemoCard, StyleChip, TechBadge } from './catalog/DemoCard'
import { DemoModal } from './catalog/DemoModal'
import { LanguageSwitch } from './catalog/LanguageSwitch'
import { MotionSwitch } from './catalog/MotionSwitch'
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
        <header className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <div className="flex items-center gap-2">
              <div aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-md bg-violet-400/10 text-sm text-violet-300">
                ✦
              </div>
              <div className="text-sm font-semibold tracking-tight">UI Showcase</div>
            </div>
            <div className="ml-auto flex items-center gap-0.5">
              <LanguageSwitch compact />
              <a
                href="https://github.com/kdrash/ui-showcase-catalog"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub (UI Showcase)"
                title="GitHub (UI Showcase)"
                className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-fuchsia-300"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                  <path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656" />
                </svg>
              </a>
            </div>
          </div>
          <p className="text-[11px] leading-5 text-zinc-400">
            {t('summary', { demos: DEMOS.length, tech: usedTech.length, styles: usedStyles.length })}
          </p>
          <MotionSwitch compact showHint />
        </header>

        <nav aria-label={t('navigation')} className="mt-3 grid grid-cols-3 gap-1 border-b border-white/10 text-xs">
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
              className="relative flex min-h-9 items-center justify-center gap-1 rounded-t-md px-1 text-zinc-400 transition hover:text-zinc-100 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-fuchsia-300 aria-pressed:text-zinc-100"
            >
              {view === k && (
                <motion.span aria-hidden="true" layoutId="view-indicator" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-violet-300/80" />
              )}
              <Icon aria-hidden="true" size={13} className="shrink-0" />
              <span>{t(`views.${k}.label`)}</span>
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
