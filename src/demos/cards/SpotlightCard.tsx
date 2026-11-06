import { useRef, type CSSProperties, type MouseEvent } from 'react'
import { Cpu, Globe, ShieldCheck, Zap } from 'lucide-react'

const FEATURES = [
  { icon: Zap, title: 'Edge Functions', text: '世界中のエッジで 50ms 以内に応答' },
  { icon: ShieldCheck, title: 'Zero Trust', text: 'すべてのリクエストを暗号化して検証' },
  { icon: Globe, title: 'Global CDN', text: '120 拠点から静的アセットを配信' },
  { icon: Cpu, title: 'AI Inference', text: 'GPU 推論をサーバーレスで実行' },
]

/**
 * コンテナの mousemove で、各カードからの相対座標を CSS 変数 --x / --y に書き込む。
 * 外枠(1px)と内側に radial-gradient(at var(--x) var(--y)) を敷くことで、
 * カーソル付近のボーダーだけが光る Linear / Vercel 風スポットライト。
 */
export function SpotlightCard() {
  const cards = useRef<(HTMLDivElement | null)[]>([])

  const onMove = (e: MouseEvent) => {
    for (const card of cards.current) {
      if (!card) continue
      const r = card.getBoundingClientRect()
      card.style.setProperty('--x', `${e.clientX - r.left}px`)
      card.style.setProperty('--y', `${e.clientY - r.top}px`)
    }
  }

  return (
    <div
      onMouseMove={onMove}
      className="group/grid relative grid h-full w-full grid-cols-2 content-center gap-3 overflow-hidden bg-[#050507] p-5"
    >
      {FEATURES.map(({ icon: Icon, title, text }, i) => (
        <div
          key={title}
          ref={(el) => {
            cards.current[i] = el
          }}
          className="relative rounded-xl p-px"
          style={
            {
              '--x': '-999px',
              '--y': '-999px',
              background:
                'radial-gradient(220px circle at var(--x) var(--y), rgba(129,140,248,0.9), transparent 40%), rgba(255,255,255,0.08)',
            } as CSSProperties
          }
        >
          <div className="relative h-full overflow-hidden rounded-[11px] bg-[#0c0c10] p-4">
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/grid:opacity-100"
              style={{
                background: 'radial-gradient(320px circle at var(--x) var(--y), rgba(129,140,248,0.13), transparent 40%)',
              }}
            />
            <div className="relative">
              <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-indigo-300">
                <Icon size={16} />
              </div>
              <h4 className="text-sm font-semibold text-zinc-100">{title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
