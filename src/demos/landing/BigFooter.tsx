import { useRef } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, ArrowUp, ArrowUpRight } from 'lucide-react'

const COLS = [
  { h: '製品', items: ['機能一覧', '料金プラン', '連携アプリ', '更新情報', 'ロードマップ'] },
  { h: '会社', items: ['私たちについて', '採用情報', 'ニュース', 'お問い合わせ'] },
  { h: 'リソース', items: ['ドキュメント', 'ブログ', 'コミュニティ', 'ステータス'] },
  { h: '法務', items: ['利用規約', 'プライバシー', 'セキュリティ', 'Cookie 設定'] },
]
const SOCIAL = ['X', 'IG', 'YT', 'GH']
const WORD = 'KAZENOTE'

export function BigFooter() {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} className="@container relative h-full w-full overflow-x-hidden overflow-y-auto bg-[#0e0e0c] font-[Inter,'Noto_Sans_JP',sans-serif] text-[#ecebe4]">
      {/* フッターの上に来る“ページの終わり”っぽいCTA */}
      <section className="flex flex-col items-start justify-between gap-5 border-b border-white/10 px-6 py-7 @3xl:flex-row @3xl:items-end">
        <h2 className="text-[clamp(24px,4.6cqw,52px)] leading-[1.05] font-semibold tracking-tight">
          風のように軽い
          <br />
          <span className="text-[#c6f432]">ノート</span>を、今日から。
        </h2>
        <a href="#" onClick={(e) => e.preventDefault()} className="group inline-flex items-center gap-3 rounded-full bg-[#c6f432] px-6 py-3 font-semibold text-black">
          無料ではじめる
          <span className="grid h-7 w-7 place-items-center rounded-full bg-black text-[#c6f432] transition group-hover:rotate-45">
            <ArrowUpRight size={15} />
          </span>
        </a>
      </section>

      <footer className="relative px-6 pt-10">
        <div className="grid gap-10 @3xl:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <p className="text-sm font-semibold">ニュースレター</p>
            <p className="mt-1 text-xs text-white/50">月に一度、新機能とちょっとした読みものを。</p>
            <form onSubmit={(e) => e.preventDefault()} className="mt-4 flex border-b border-white/30 focus-within:border-[#c6f432]">
              <input placeholder="メールアドレス" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-white/30" />
              <button className="p-2 text-white/70 hover:text-[#c6f432]" aria-label="登録">
                <ArrowRight size={16} />
              </button>
            </form>
            <div className="mt-6 flex gap-2">
              {SOCIAL.map((s) => (
                <a
                  key={s}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-[11px] font-bold text-white/70 transition hover:border-[#c6f432] hover:bg-[#c6f432] hover:text-black"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 @xl:grid-cols-4">
            {COLS.map((c) => (
              <div key={c.h}>
                <p className="mb-3 text-[11px] tracking-[0.2em] text-white/40 uppercase">{c.h}</p>
                <ul className="space-y-2 text-[13px]">
                  {c.items.map((i) => (
                    <li key={i}>
                      <a href="#" onClick={(e) => e.preventDefault()} className="group relative text-white/75 hover:text-white">
                        {i}
                        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-[#c6f432] transition group-hover:scale-x-100" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[11px] text-white/40">
          <span>© 2026 Kazenote Inc. — Made in Tokyo</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c6f432]" /> 全システム正常稼働中
          </span>
          <button
            onClick={() => ref.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-white/70 hover:border-white/40 hover:text-white"
          >
            <ArrowUp size={12} /> トップへ
          </button>
        </div>

        {/* 巨大なワードマーク: 下半分が見切れる。ビューに入ると1文字ずつせり上がる */}
        <div className="pointer-events-none mt-4 -mb-[0.28em] flex justify-between overflow-hidden text-[clamp(56px,16.5cqw,230px)] leading-none font-black tracking-[-0.06em] select-none">
          {WORD.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ y: '70%', opacity: 0 }}
              whileInView={{ y: '0%', opacity: 1 }}
              viewport={{ root: ref, amount: 0.2, once: false }}
              transition={{ delay: i * 0.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="bg-gradient-to-b from-[#ecebe4] to-[#ecebe4]/10 bg-clip-text text-transparent"
            >
              {ch}
            </motion.span>
          ))}
        </div>
      </footer>
    </div>
  )
}
