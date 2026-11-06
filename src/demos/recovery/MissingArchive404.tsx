import { ArrowUpLeft } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

const four = 'M111 18h45v111h25v38h-25v56h-45v-56H14v-36Zm0 63-45 48h45Z'
const route = 'M234 151c-15-31-2-64 24-79 30-17 66-7 80 17 15 27 3 56-24 67-18 7-42 0-48-17-7-18 4-34 21-37'

export function MissingArchive404() {
  const { t, i18n } = useTranslation('demoControls', { keyPrefix: 'missingArchive' })
  const reduced = useReducedMotion()

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#f3e7cc] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#22221e] [background-image:radial-gradient(#6e523b48_0.5px,transparent_0.7px)] [background-size:4px_4px] @md:px-5">
      <section className="mx-auto flex min-h-full max-w-4xl flex-col justify-center">
        <header className="flex items-baseline justify-between gap-3 border-y-2 border-[#25251f] py-1.5">
          <p className="font-serif text-[clamp(.9rem,3.1cqw,1.65rem)] leading-tight font-black tracking-tight">{t('archive')}</p>
          <p className="shrink-0 font-mono text-[8px] font-bold tracking-[.16em] @sm:text-[10px]">INDEX / 04.04</p>
        </header>
        <div className="relative isolate my-2 overflow-hidden border border-[#4a453b]/45 bg-[#f7edda] px-2 @sm:my-3">
          <svg viewBox="0 0 596 244" aria-hidden="true" className="mx-auto block h-auto max-h-60 w-full">
            <path d="M0 18h596M0 129h596M0 167h596M0 223h596M14 0v244M298 0v244M582 0v244" stroke="#cdbfa7" strokeWidth="1" strokeDasharray="4 5" />
            <path d={four} fill="#292720" fillRule="evenodd" />
            <path d={four} transform="translate(402 0)" fill="#292720" fillRule="evenodd" />
            <ellipse cx="298" cy="121" rx="82" ry="103" fill="#f7edda" stroke="#a33426" strokeWidth="2" strokeDasharray="6 6" />
            <path d="M208 121h180m-90-104v208M259 82l78 78m0-78-78 78" stroke="#a33426" strokeOpacity=".24" strokeDasharray="4 4" />
            <path d={route} fill="none" stroke="#a33426" strokeOpacity=".35" strokeWidth="2" />
            <motion.path d={route} fill="none" stroke="#a33426" strokeWidth="3" strokeLinecap="round"
              initial={reduced ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: .3 }} transition={{ duration: reduced ? 0 : 1.05, ease: 'easeInOut' }} />
            <circle cx="287" cy="102" r="5" fill="#a33426" />
            <path d="M374 30v15m-7-8h14M222 194v15m-7-7h14" stroke="#a33426" strokeWidth="2" />
          </svg>
          <span className="absolute right-[17%] bottom-[12%] -rotate-7 border-2 border-[#a33426] bg-[#f7edda] px-1.5 font-mono text-[clamp(.46rem,2.1cqw,.85rem)] font-black tracking-[.15em] text-[#a33426]">MISSING</span>
        </div>
        <div className="grid items-end gap-3 border-b-2 border-[#25251f] pb-3 @min-[28rem]:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="mb-0.5 font-mono text-[9px] font-black tracking-[.16em] text-[#9b3024]">404 / NOT FOUND</p>
            <h2 className="font-serif text-[clamp(1.25rem,5.2cqw,3rem)] leading-tight font-black tracking-tight [overflow-wrap:anywhere]">{t('title')}</h2>
            <p className="mt-1 max-w-[58ch] text-[clamp(.69rem,1.9cqw,.88rem)] leading-snug text-[#504538]">{t('body')}</p>
          </div>
          <a href={`?lang=${i18n.resolvedLanguage}`} className="inline-flex min-h-9 w-fit items-center gap-2 bg-[#27251f] px-3 py-1.5 text-[11px] font-bold text-[#fff6e1] shadow-[3px_3px_0_#a33426] hover:bg-[#8f2e23] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#a33426]">
            <ArrowUpLeft size={15} aria-hidden="true" />{t('home')}
          </a>
        </div>
        <footer aria-hidden="true" className="flex justify-between gap-2 pt-1.5 font-mono text-[8px] font-bold tracking-widest text-[#584a3c]">
          <span>ARCHIVE SHEET 04</span><span>● REG. MARK / A</span>
        </footer>
      </section>
    </div>
  )
}
