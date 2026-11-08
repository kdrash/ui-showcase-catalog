import { Suspense, useEffect, useRef, useState } from 'react'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { DemoErrorBoundary, DemoFallback } from './helpers'
import { LanguageSwitch } from './LanguageSwitch'
import { MotionSwitch } from './MotionSwitch'
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
      <SoloControls backHref={`?lang=${language}#${encodeURIComponent(demo.id)}`} />
    </div>
  )
}

/**
 * 右下の切り替えボタン類。デモ自身の操作ボタンに重ならないよう、数秒操作がなければ小さな丸ボタンに畳む。
 * ポインタを乗せる・フォーカスする・押すと開く
 */
function SoloControls({ backHref }: { backHref: string }) {
  const { t } = useCatalogLanguage()
  const [open, setOpen] = useState(true)
  const hovering = useRef(false)
  const timer = useRef<number | undefined>(undefined)

  const scheduleClose = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (!hovering.current) setOpen(false)
    }, 3500)
  }
  useEffect(() => {
    scheduleClose()
    return () => window.clearTimeout(timer.current)
  }, [])

  return (
    <div
      className="absolute right-3 bottom-3 z-[60] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-end gap-1.5"
      onPointerEnter={() => {
        hovering.current = true
        setOpen(true)
      }}
      onPointerLeave={() => {
        hovering.current = false
        scheduleClose()
      }}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleClose()
      }}
    >
      {open ? (
        <>
          <MotionSwitch />
          <LanguageSwitch />
          <a
            href={backHref}
            data-solo-back
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-black/80"
          >
            <ArrowLeft size={12} /> {t('back')}
          </a>
        </>
      ) : (
        <>
          <a
            href={backHref}
            data-solo-back
            aria-label={t('back')}
            title={t('back')}
            className="grid size-8 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur hover:bg-black/80"
          >
            <ArrowLeft size={13} />
          </a>
          <button
            type="button"
            aria-label={t('soloControls')}
            title={t('soloControls')}
            onClick={() => setOpen(true)}
            className="grid size-8 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur hover:bg-black/80"
          >
            <SlidersHorizontal size={13} />
          </button>
        </>
      )}
    </div>
  )
}
