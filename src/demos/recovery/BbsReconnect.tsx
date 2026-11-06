import { useEffect, useState, type FormEvent } from 'react'
import { Cable, Check, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const button = 'inline-flex min-h-7 items-center justify-center gap-1.5 border-2 border-[#7188ad] bg-[#eef5ff] px-2 py-0.5 text-[11px] font-bold shadow-[inset_1px_1px_#fff,inset_-1px_-1px_#adbfdf] hover:bg-[#d7e7ff] active:shadow-none disabled:opacity-50'

export function BbsReconnect() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'bbsReconnect' })
  const [line, setLine] = useState<'offline' | 'dialing' | 'online'>('offline')
  const [draft, setDraft] = useState<string | null>(null)
  const [post, setPost] = useState('')
  const message = draft ?? t('sample')

  useEffect(() => {
    if (line !== 'dialing') return
    const timer = window.setTimeout(() => setLine('online'), 1250)
    return () => window.clearTimeout(timer)
  }, [line])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (line !== 'online' || !message.trim()) return
    setPost(message.trim())
    setDraft('')
  }

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#a8bce3] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#203451] [background-image:repeating-linear-gradient(135deg,#e5edff85_0_2px,transparent_2px_9px)]">
      <div className="mx-auto flex min-h-full max-w-3xl items-center">
        <section className="w-full border-2 border-[#526b97] bg-[#f3f5ff] shadow-[4px_4px_0_#6278a04d]">
          <header className="flex flex-wrap items-center justify-between gap-1 border-b-2 border-[#526b97] bg-linear-to-r from-[#fff0aa] via-[#ffeab8] to-[#f8bad5] px-3 py-2">
            <div>
              <p className="font-mono text-[9px] font-bold tracking-[.19em]">✦ NIGHT WINDOW BBS ✦</p>
              <h2 className="font-serif text-[clamp(1.1rem,4cqw,1.65rem)] leading-tight font-bold">{t('title')}</h2>
            </div>
            <span className="border border-[#826f85] bg-[#fff8d7] px-1.5 font-mono text-[9px] font-bold">NO. 0148</span>
          </header>
          <div className="grid gap-2 p-2.5 @min-[31rem]:grid-cols-[1fr_12rem]">
            <form onSubmit={submit} className="min-w-0 border border-[#8397bc] bg-white p-2">
              <label className="block text-xs font-bold">
                {t('draft')}
                <textarea value={message} onChange={(event) => setDraft(event.target.value)} maxLength={240} rows={3}
                  className="mt-1 block w-full resize-none rounded-none border border-[#6f82a6] bg-[#fffde9] p-1.5 text-xs font-normal text-[#203451] shadow-[inset_1px_1px_#ccd0cb]" />
              </label>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span aria-hidden="true" className="font-mono text-[9px] text-[#526a8a]">{message.length} / 240</span>
                <button type="submit" disabled={line !== 'online' || !message.trim()} className={button}><Send size={12} aria-hidden="true" />{t('send')}</button>
              </div>
            </form>
            <div className="flex min-w-0 flex-col gap-1.5 border border-[#8294b4] bg-[#dce7f8] p-2">
              <div className="flex items-center justify-between gap-2 border-b border-[#8294b4] pb-1">
                <span className="flex items-center gap-1 font-mono text-[9px] font-bold tracking-widest"><Cable size={13} aria-hidden="true" />MODEM / 56K</span>
                <span aria-hidden="true" className="flex gap-1">
                  <span className="size-1.5 bg-[#49607c]" />
                  <span className={line === 'dialing' ? 'size-1.5 bg-[#aa560b] motion-safe:animate-pulse' : 'size-1.5 bg-[#49607c]'} />
                  <span className={line === 'online' ? 'size-1.5 bg-[#178449]' : 'size-1.5 bg-[#983e5d]'} />
                </span>
              </div>
              <div role="status" className="space-y-0.5">
                <p className="text-xs font-black">{t(line)}</p>
                <p className="text-[10px] leading-snug">{t(`${line}Hint`)}</p>
              </div>
              <button type="button" className={`self-start ${button}`} disabled={line === 'dialing'}
                onClick={() => setLine(line === 'online' ? 'offline' : 'dialing')}>
                {t(line === 'online' ? 'disconnect' : 'reconnect')}
              </button>
            </div>
            {post && (
              <div role="status" className="min-w-0 border border-[#8b9bb4] bg-[#e1f3e5] px-2 py-1 text-[10px] @min-[31rem]:col-span-2">
                <p className="flex items-center gap-1 font-bold"><Check size={12} aria-hidden="true" />{t('sent')}</p>
                <p className="max-h-12 overflow-auto [overflow-wrap:anywhere] whitespace-pre-wrap">{post}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
