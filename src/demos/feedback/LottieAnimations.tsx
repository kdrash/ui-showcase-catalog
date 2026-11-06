import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web/build/player/lottie_light'
import type { AnimationItem } from 'lottie-web'
import { Pause, Play } from 'lucide-react'

/* ---------- 手書きの Lottie JSON ビルダー(After Effects 書き出しと同じ構造) ---------- */
type V = number | number[]
const st = <T,>(k: T) => ({ a: 0, k })
const ease = { i: { x: 0.3, y: 1 }, o: { x: 0.7, y: 0 } }
/** [frame, value][] → アニメーションするプロパティ */
const kf = (...keys: [number, V][]) => ({
  a: 1,
  k: keys.map(([t, s], i) => (i < keys.length - 1 ? { t, s: Array.isArray(s) ? s : [s], ...ease } : { t, s: Array.isArray(s) ? s : [s] })),
})
const rgb = (hex: string, a = 1) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).concat(a)
const tr = (p: unknown = st([0, 0]), s: unknown = st([100, 100]), o: unknown = st(100)) => ({ ty: 'tr', p, a: st([0, 0]), s, r: st(0), o, sk: st(0), sa: st(0) })
const fill = (hex: string) => ({ ty: 'fl', c: st(rgb(hex)), o: st(100), r: 1 })
const stroke = (hex: string, w: number, o: unknown = st(100)) => ({ ty: 'st', c: st(rgb(hex)), o, w: st(w), lc: 2, lj: 2, ml: 4 })
const ellipse = (s: unknown) => ({ ty: 'el', p: st([0, 0]), s, d: 1 })
const path = (v: number[][], i?: number[][], o?: number[][], c = false) => ({
  ty: 'sh',
  ks: st({ v, i: i ?? v.map(() => [0, 0]), o: o ?? v.map(() => [0, 0]), c }),
})
const group = (items: unknown[], t = tr()) => ({ ty: 'gr', it: [...items, t] })
const layer = (ind: number, shapes: unknown[], ks: Record<string, unknown> = {}, op = 90) => ({
  ddd: 0, ind, ty: 4, sr: 1, ao: 0, ip: 0, op, st: 0, bm: 0,
  ks: { o: st(100), r: st(0), p: st([100, 100, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), ...ks },
  shapes,
})
const comp = (op: number, layers: unknown[]) => ({ v: '5.7.4', fr: 60, ip: 0, op, w: 200, h: 200, ddd: 0, assets: [], layers })

// 1. 成功チェック: 円が弾んで出現 → チェックを線描画 → リングが広がって消える
const CHECK = comp(100, [
  layer(1, [group([path([[-24, 2], [-7, 19], [25, -15]]), { ty: 'tm', s: st(0), e: kf([18, 0], [44, 100]), o: st(0), m: 1 }, stroke('#ffffff', 11)])], {}, 100),
  layer(2, [group([ellipse(st([112, 112])), fill('#10b981')])], { s: kf([0, [0, 0, 100]], [16, [116, 116, 100]], [26, [100, 100, 100]]) }, 100),
  layer(3, [group([ellipse(kf([8, [112, 112]], [42, [176, 176]])), stroke('#34d399', 5, kf([8, 90], [42, 0]))])], {}, 100),
])

// 2. ローディングドット: 3つの点が時間差で跳ねる
const DOTS = comp(60, [0, 1, 2].map((n) => {
  const x = 60 + n * 40
  const d = n * 8
  return layer(n + 1, [group([ellipse(st([22, 22])), fill(['#6366f1', '#8b5cf6', '#ec4899'][n])])], {
    p: kf([0, [x, 112, 0]], [d, [x, 112, 0]], [d + 14, [x, 76, 0]], [d + 28, [x, 112, 0]], [60, [x, 112, 0]]),
    s: kf([0, [100, 100, 100]], [d + 26, [100, 100, 100]], [d + 30, [120, 80, 100]], [d + 36, [100, 100, 100]], [60, [100, 100, 100]]),
  }, 60)
}))

// 3. ハートポップ: ハートが弾んで登場し、粒が放射状に飛ぶ
const HEART_V = [[0, 32], [-38, -4], [-20, -30], [0, -16], [20, -30], [38, -4]]
const HEART_I = [[12, -10], [0, 16], [-12, 0], [-4, -10], [-10, 0], [0, -14]]
const HEART_O = [[-12, -10], [0, -14], [10, 0], [4, -10], [12, 0], [0, 16]]
const particles = Array.from({ length: 8 }, (_, k) => {
  const a = (k / 8) * Math.PI * 2 - Math.PI / 2
  const r = 70
  return group(
    [ellipse(st([10, 10])), fill(k % 2 ? '#fb7185' : '#fbbf24')],
    tr(kf([10, [Math.cos(a) * 30, Math.sin(a) * 30]], [36, [Math.cos(a) * r, Math.sin(a) * r]]), kf([10, [100, 100]], [36, [0, 0]]), kf([8, 0], [10, 100], [36, 100])),
  )
})
const HEART = comp(110, [
  layer(1, [group([path(HEART_V, HEART_I, HEART_O, true), fill('#f43f5e')])], {
    p: st([100, 104, 0]),
    s: kf([0, [0, 0, 100]], [12, [130, 130, 100]], [22, [88, 88, 100]], [32, [104, 104, 100]], [40, [100, 100, 100]]),
  }, 110),
  layer(2, particles, { p: st([100, 100, 0]) }, 110),
])

const ANIMS = [
  { name: '成功チェック', data: CHECK, bg: 'from-emerald-50 to-teal-100' },
  { name: 'ローディング', data: DOTS, bg: 'from-indigo-50 to-violet-100' },
  { name: 'いいね!', data: HEART, bg: 'from-rose-50 to-pink-100' },
]

export function LottieAnimations() {
  const boxes = useRef<(HTMLDivElement | null)[]>([])
  const items = useRef<AnimationItem[]>([])
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [pos, setPos] = useState(0)

  useEffect(() => {
    items.current = ANIMS.map((a, i) =>
      lottie.loadAnimation({ container: boxes.current[i]!, renderer: 'svg', loop: true, autoplay: true, animationData: a.data }),
    )
    const first = items.current[0]
    const off = first.addEventListener('enterFrame', () => setPos(first.currentFrame / (first.totalFrames - 1)))
    return () => {
      off()
      items.current.forEach((it) => it.destroy())
    }
  }, [])

  const toggle = () => {
    items.current.forEach((it) => (playing ? it.pause() : it.play()))
    setPlaying(!playing)
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white font-sans text-zinc-800">
      <div className="grid flex-1 grid-cols-3 gap-2 p-3">
        {ANIMS.map((a, i) => (
          <div key={a.name} className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${a.bg}`}>
            <div ref={(el) => void (boxes.current[i] = el)} className="aspect-square w-full max-w-[150px]" />
            <div className="pb-2 text-[11px] font-medium text-zinc-600">{a.name}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-zinc-100 px-4 py-2.5">
        <button onClick={toggle} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-900 text-white" aria-label={playing ? '一時停止' : '再生'}>
          {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={pos}
          onChange={(e) => {
            const v = Number(e.target.value)
            setPos(v)
            setPlaying(false)
            items.current.forEach((it) => it.goToAndStop(v * (it.totalFrames - 1), true))
          }}
          className="flex-1 accent-zinc-900"
          aria-label="シーク"
        />
        <div className="flex shrink-0 rounded-lg bg-zinc-100 p-0.5 text-[11px]">
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSpeed(s)
                items.current.forEach((it) => it.setSpeed(s))
              }}
              className={`rounded-md px-2 py-0.5 ${speed === s ? 'bg-white font-semibold shadow-sm' : 'text-zinc-500'}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
