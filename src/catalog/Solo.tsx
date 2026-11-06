import { Suspense, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { DemoErrorBoundary, DemoFallback } from './helpers'
import { LanguageSwitch } from './LanguageSwitch'
import { useCatalogLanguage } from './i18n'
import { demoText } from './localization'
import { DEMOS } from './registry'

/** ?solo=<demo-id> で、そのデモだけを画面いっぱいに表示する単体ページ */
export function Solo({ id }: { id: string }) {
  const { t, language } = useCatalogLanguage()
  const demo = DEMOS.find((d) => d.id === id)
  const title = demo && demoText(demo, language).title

  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} | UI Showcase Catalog`
    return () => { document.title = previous }
  }, [title])

  if (!demo)
    return (
      <div className="grid h-screen place-items-center text-zinc-400">
        <div className="text-center">
          <div>{t('demoNotFound', { id })}</div>
          <a href={`?lang=${language}`} className="mt-3 inline-block text-fuchsia-300 underline">
            {t('back')}
          </a>
          <div className="mt-4"><LanguageSwitch /></div>
        </div>
      </div>
    )
  const C = demo.component
  return (
    <div className="relative h-screen w-screen overflow-hidden [--solo-footer-clearance:3rem]">
      <div className="isolate h-full w-full">
        <DemoErrorBoundary>
          <Suspense fallback={<DemoFallback />}>
            <C />
          </Suspense>
        </DemoErrorBoundary>
      </div>
      <div className="absolute right-3 bottom-3 z-[60] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-end gap-1.5">
        <LanguageSwitch />
        <a
          href={`?lang=${language}#${encodeURIComponent(demo.id)}`}
          data-solo-back
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-black/80"
        >
          <ArrowLeft size={12} /> {t('back')}
        </a>
      </div>
    </div>
  )
}
