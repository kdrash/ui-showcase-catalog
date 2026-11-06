import { useRef, useState, type MouseEvent } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'

/**
 * ペーパー・切り絵
 * 波形に切った色紙を何層も重ね、各層に filter: drop-shadow で“紙の厚み”の影を付ける。
 * マウスで奥の層ほど小さく動くパララックス。カードは紙(ノイズの繊維感)+ 折り返した角、
 * ボタンは紙のタブ(押すと影が縮んで紙が沈む)。
 */
const LAYERS = ['#ffe8c2', '#ffc98b', '#ff9f68', '#f2706d', '#c94f7c', '#7a3e7d']
const FIBER = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0.12 0'/></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>",
)}")`

function wave(i: number) {
  const base = 40 + i * 12
  const amp = 8 + (i % 3) * 3
  let d = `M0 ${base}`
  for (let x = 0; x < 400; x += 50) d += ` Q ${x + 25} ${base + ((x / 50 + i) % 2 === 0 ? -amp : amp)} ${x + 50} ${base}`
  return `${d} V 140 H 0 Z`
}

function Layer({ i, mx, my }: { i: number; mx: ReturnType<typeof useSpring>; my: ReturnType<typeof useSpring> }) {
  const depth = (i + 1) * 4
  const x = useTransform(mx, (v) => v * depth)
  const y = useTransform(my, (v) => v * depth * 0.5)
  return (
    <motion.svg className="absolute inset-x-[-6%] bottom-[-4%] h-[70%] w-[112%]" viewBox="0 0 400 140" preserveAspectRatio="none" style={{ x, y, filter: 'drop-shadow(0 -3px 4px rgba(80,20,40,.35))' }} aria-hidden>
      <path d={wave(i)} fill={LAYERS[i]} />
    </motion.svg>
  )
}

export function StylePaper() {
  const ref = useRef<HTMLDivElement>(null)
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const mx = useSpring(rx, { stiffness: 80, damping: 18 })
  const my = useSpring(ry, { stiffness: 80, damping: 18 })
  const cardX = useTransform(mx, (v) => v * -6)
  const cardY = useTransform(my, (v) => v * -4)
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(52)
  const [following, setFollowing] = useState(false)

  const onMove = (e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    rx.set(((e.clientX - r.left) / r.width - 0.5) * 2)
    ry.set(((e.clientY - r.top) / r.height - 0.5) * 2)
  }

  return (
    <div ref={ref} onMouseMove={onMove} className="relative grid h-full w-full place-items-center overflow-hidden" style={{ background: 'linear-gradient(180deg,#fff6e6,#ffe3c7)', fontFamily: '"Space Grotesk", "Noto Sans JP", sans-serif' }}>
      {/* sun cut-out */}
      <div className="absolute left-[12%] top-[10%] h-20 w-20 rounded-full bg-[#ffd166]" style={{ filter: 'drop-shadow(0 3px 4px rgba(120,60,20,.3))' }} />
      {LAYERS.map((_, i) => (
        <Layer key={i} i={i} mx={mx} my={my} />
      ))}

      <motion.div
        className="relative w-[270px] p-4 text-[#4a2c3d]"
        style={{
          background: '#fffaf0',
          backgroundImage: FIBER,
          clipPath: 'polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%)',
          filter: 'drop-shadow(0 2px 1px rgba(80,30,40,.18)) drop-shadow(0 10px 14px rgba(80,30,40,.25))',
          x: cardX,
          y: cardY,
        }}
      >
        {/* folded corner */}
        <span className="absolute right-0 top-0 h-[26px] w-[26px]" style={{ background: 'linear-gradient(225deg, transparent 50%, #f0dcc0 50%)', boxShadow: '-2px 2px 3px rgba(80,30,40,.2)' }} />
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14">
            <span className="absolute inset-0 rounded-full bg-[#f2706d]" style={{ filter: 'drop-shadow(0 2px 2px rgba(80,30,40,.35))' }} />
            <span className="absolute inset-[6px] rounded-full bg-[#ffc98b]" style={{ filter: 'drop-shadow(0 2px 2px rgba(80,30,40,.35))' }} />
            <span className="absolute inset-0 grid place-items-center text-[16px] font-bold">MS</span>
          </div>
          <div>
            <p className="text-[19px] font-bold leading-tight">Mika Sato</p>
            <p className="text-[12px] text-[#8a5a6a]">paper craft designer ✂</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {[
            ['128', 'posts', '#ffe8c2'],
            ['2.4k', 'fans', '#ffc98b'],
            ['312', 'follow', '#ff9f68'],
          ].map(([v, l, c]) => (
            <div key={l} className="py-1.5" style={{ background: c, filter: 'drop-shadow(0 2px 1px rgba(80,30,40,.25))' }}>
              <p className="text-[15px] font-bold">{v}</p>
              <p className="text-[10px]">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[13px] font-semibold">
          <span>Notifications</span>
          <button role="switch" aria-checked={notify} aria-label="Notifications" onClick={() => setNotify((v) => !v)} className="relative h-7 w-12 rounded-full" style={{ background: notify ? '#c94f7c' : '#ead7c0', boxShadow: 'inset 0 2px 3px rgba(80,30,40,.3)' }}>
            <motion.span className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-[#fffaf0]" style={{ filter: 'drop-shadow(0 2px 2px rgba(80,30,40,.35))' }} animate={{ left: notify ? 23 : 3 }} />
          </button>
        </div>
        <div className="relative mt-3 h-5">
          <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#ead7c0]" style={{ boxShadow: 'inset 0 1px 2px rgba(80,30,40,.3)' }} />
          <div className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#f2706d]" style={{ width: `${volume}%` }} />
          <span className="absolute top-0 h-5 w-5 rounded-full bg-[#fffaf0]" style={{ left: `calc(${volume}% - ${volume * 0.2}px)`, filter: 'drop-shadow(0 2px 2px rgba(80,30,40,.4))' }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setFollowing((f) => !f)}
            className="h-10 text-[14px] font-bold text-[#fffaf0] transition-[filter,transform] active:translate-y-0.5"
            style={{ background: '#c94f7c', filter: following ? 'drop-shadow(0 1px 0 rgba(80,30,40,.4))' : 'drop-shadow(0 4px 2px rgba(80,30,40,.35))' }}
          >
            {following ? 'Following ✓' : 'Follow'}
          </button>
          <button className="h-10 bg-[#ffe8c2] text-[14px] font-bold transition-[filter,transform] active:translate-y-0.5" style={{ filter: 'drop-shadow(0 4px 2px rgba(80,30,40,.3))' }}>
            Message
          </button>
        </div>
      </motion.div>
    </div>
  )
}
