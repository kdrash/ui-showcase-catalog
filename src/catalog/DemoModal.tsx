import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Copy, ExternalLink, X } from 'lucide-react'
import { DemoPreview, StyleChip, TechBadge } from './DemoCard'
import { LanguageSwitch } from './LanguageSwitch'
import { useCatalogLanguage } from './i18n'
import { categoryText, demoText, styleText, techText } from './localization'
import { TECH } from './meta'
import { buildPrompt, copyText } from './prompt'
import { loadSource } from './registry'
import type { DemoEntry } from './types'

type Tab = 'prompt' | 'code' | 'tech'
const tabs = [['prompt', 'prompt'], ['code', 'code'], ['tech', 'technology']] as const

export function DemoModal({ demo, onClose }: { demo: DemoEntry; onClose: () => void }) {
  const { t, language } = useCatalogLanguage()
  const [tab, setTab] = useState<Tab>('prompt')
  const [code, setCode] = useState<string>('')
  const [sourceError, setSourceError] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const copyTextContent = demoText(demo, language)
  const category = categoryText(demo.category, language)
  const japaneseFallback = language === 'en' && copyTextContent.language === 'ja'
  const prompt = buildPrompt(demo, language)
  const promptKey = `prompt:${copyTextContent.language}`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    let alive = true
    loadSource(demo.file).then((s) => {
      if (alive) setCode(s)
    }).catch(() => {
      if (alive) setSourceError(true)
    })
    return () => {
      alive = false
    }
  }, [demo.file])

  const copy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  const installCmd =
    'npm i ' +
    demo.tech
      .map((t) => TECH[t].pkg)
      .filter((p): p is string => !!p && p !== 'react' && p !== 'tailwindcss')
      .join(' ')

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="thin-scroll flex w-full max-w-7xl flex-col overflow-x-hidden overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl lg:flex-row lg:overflow-hidden"
        initial={{ y: 30, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 30, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-[36dvh] shrink-0 border-b border-white/10 lg:h-auto lg:flex-[1.4] lg:border-r lg:border-b-0">
          <DemoPreview demo={demo} height="100%" />
        </div>

        <div className="flex min-w-0 shrink-0 flex-col lg:min-h-0 lg:max-w-[520px] lg:flex-1">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 p-3 sm:p-5">
            <div className="min-w-0">
              <div className="text-xs text-zinc-500">
                {category.emoji} {category.label}
              </div>
              <h2 lang={copyTextContent.language} className="mt-1 text-lg leading-tight font-bold tracking-tight sm:text-xl">{copyTextContent.title}</h2>
              <p lang={copyTextContent.language} className="mt-1 text-sm text-zinc-400">{copyTextContent.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {demo.tech.map((t) => (
                  <TechBadge key={t} id={t} />
                ))}
                {demo.styles.map((s) => (
                  <StyleChip key={s} id={s} />
                ))}
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <a
                href={`?solo=${encodeURIComponent(demo.id)}&lang=${language}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white"
                title={t('openSolo')}
              >
                <ExternalLink size={16} />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white"
                title={t('close')}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-white/10 px-3 pt-2 sm:px-5">
            <div className="flex gap-0.5">
              {tabs.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}
                  className={`relative px-1.5 py-2 text-xs transition sm:px-2.5 sm:text-sm ${tab === k ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  {t(label)}
                  {tab === k && <motion.span layoutId="modal-tab" className="absolute inset-x-1 -bottom-px h-0.5 rounded bg-fuchsia-400" />}
                </button>
              ))}
            </div>
            <div className="pb-1"><LanguageSwitch /></div>
          </div>

          <div className="thin-scroll min-w-0 p-3 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-auto">
            {tab === 'prompt' && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500">
                  {t(japaneseFallback ? 'japanesePromptHelp' : 'promptHelp')}
                </p>
                <pre lang={copyTextContent.language} className="whitespace-pre-wrap wrap-break-word rounded-xl border border-white/10 bg-zinc-900 p-4 font-sans text-[13px] leading-relaxed text-zinc-200">
                  {prompt}
                </pre>
                <button
                  type="button"
                  onClick={() => copy(promptKey, prompt)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
                >
                  {copied === promptKey ? <Check size={15} /> : <Copy size={15} />}
                  {t(copied === promptKey ? 'copied' : japaneseFallback ? 'copyJapanesePrompt' : 'copyPrompt')}
                </button>
                {installCmd !== 'npm i ' && (
                  <div>
                    <div className="mb-1.5 text-xs text-zinc-500">{t('install')}</div>
                    <button
                      type="button"
                      title={t('copyInstall')}
                      onClick={() => copy('install', installCmd)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-left font-mono text-xs text-emerald-300 hover:border-white/25"
                    >
                      <span className="truncate">$ {installCmd}</span>
                      {copied === 'install' ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === 'code' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <code className="min-w-0 wrap-break-word text-xs text-zinc-500">src/demos/{demo.file}</code>
                  <button
                    type="button"
                    onClick={() => copy('code', code)}
                    disabled={!code}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 disabled:opacity-50"
                  >
                    {copied === 'code' ? <Check size={12} /> : <Copy size={12} />} {t(copied === 'code' ? 'copied' : 'copyCode')}
                  </button>
                </div>
                <pre className="thin-scroll max-h-[65dvh] overflow-auto rounded-xl border border-white/10 bg-[#0d0d10] p-4 font-mono text-[12px] leading-relaxed text-zinc-300 lg:max-h-none">
                  {code || t(sourceError ? 'sourceError' : 'loading')}
                </pre>
              </div>
            )}

            {tab === 'tech' && (
              <div className="space-y-3">
                {demo.tech.map((id) => {
                  const m = techText(id, language)
                  return (
                    <div key={id} className="rounded-xl border border-white/10 bg-zinc-900/60 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                          {m.name}
                        </div>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                        >
                          {t('docs')} <ExternalLink size={11} />
                        </a>
                      </div>
                      {m.pkg && <code className="mt-1 block text-xs text-emerald-300">{m.pkg}</code>}
                      <p className="mt-1.5 text-[13px] text-zinc-300">{m.about}</p>
                      <p className="mt-1 text-xs text-zinc-500">{t('useCases', { text: m.when })}</p>
                    </div>
                  )
                })}
                {demo.styles.map((s) => {
                  const style = styleText(s, language)
                  return (
                    <div key={s} className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-3.5">
                      <div className="font-semibold text-fuchsia-100">{style.name}</div>
                      <p className="mt-1 text-[13px] text-zinc-300">{style.keywords}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
