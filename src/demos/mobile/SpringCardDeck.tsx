import { useState } from 'react'
import { animated, to, useSprings } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { Heart, X } from 'lucide-react'
import { PhoneFrame } from './PhoneFrame'
import { art, type ArtKind } from '../_shared/art'

const CARDS: { title: string; sub: string; kind: ArtKind; seed: number }[] = [
  { title: '屋久島', sub: '鹿児島県 · 苔むす森', kind: 'landscape', seed: 2 },
  { title: '鳥取砂丘', sub: '鳥取県 · 風紋と夕日', kind: 'landscape', seed: 3 },
  { title: '直島', sub: '香川県 · アートの島', kind: 'geometric', seed: 5 },
  { title: '美瑛', sub: '北海道 · 丘と青い池', kind: 'landscape', seed: 1 },
  { title: '竹富島', sub: '沖縄県 · 赤瓦の集落', kind: 'gradient', seed: 6 },
  { title: '上高地', sub: '長野県 · 霧の河童橋', kind: 'landscape', seed: 4 },
]

const rest = (i: number) => ({ x: 0, y: -i * 4, scale: 1 - i * 0.02, rot: -4 + Math.random() * 8, delay: i * 70, opacity: 1 })
const from = () => ({ x: 0, rot: 0, scale: 1.4, y: -900, opacity: 1 })
// 上のカードほど配列の最後(描画順で手前)
const N = CARDS.length

export function SpringCardDeck() {
  const [gone] = useState(() => new Set<number>())
  const [stat, setStat] = useState({ like: 0, nope: 0 })
  const [props, api] = useSprings(N, (i) => ({ ...rest(N - 1 - i), from: from() }))

  const fling = (index: number, dir: number, vx = 2) => {
    gone.add(index)
    setStat((s) => (dir > 0 ? { ...s, like: s.like + 1 } : { ...s, nope: s.nope + 1 }))
    api.start((i) => {
      if (i !== index) return
      return { x: (260 + window.innerWidth / 2) * dir, rot: dir * 10 * vx, scale: 1, config: { friction: 50, tension: 200 } }
    })
    if (gone.size === N)
      setTimeout(() => {
        gone.clear()
        api.start((i) => ({ ...rest(N - 1 - i), delay: (N - 1 - i) * 90 }))
      }, 650)
  }

  const bind = useDrag(({ args: [index], active, movement: [mx], direction: [xDir], velocity: [vx] }) => {
    const i = index as number
    const trigger = vx > 0.25 || Math.abs(mx) > 110
    if (!active && trigger) return fling(i, xDir || Math.sign(mx) || 1, vx)
    api.start((k) => {
      if (k !== i) return
      return {
        x: active ? mx : 0,
        rot: active ? mx / 12 : 0,
        scale: active ? 1.05 : 1,
        y: active ? 0 : -(N - 1 - i) * 4,
        delay: undefined,
        config: { friction: 50, tension: active ? 800 : 500 },
      }
    })
  })

  const top = () => {
    for (let i = N - 1; i >= 0; i--) if (!gone.has(i)) return i
    return -1
  }

  return (
    <PhoneFrame
      screenClass="bg-gradient-to-b from-rose-50 to-amber-50"
      bg="bg-[radial-gradient(circle_at_60%_20%,#ffe4e6,#fafaf9_60%)]"
      side={
        <div className="space-y-2">
          <div className="text-base font-bold text-zinc-900">スプリング・カードデッキ</div>
          <p>カードをつかんで左右に投げると、速度に応じて回転しながら飛んでいきます。全部なくなると上から再び積み直し。</p>
          <p className="text-xs text-zinc-400">react-spring useSprings + @use-gesture useDrag</p>
        </div>
      }
    >
      <div className="absolute inset-x-0 top-11 flex items-center justify-between px-4 text-[11px] font-semibold text-zinc-500">
        <span>旅先をえらぶ</span>
        <span className="tabular-nums">
          <span className="text-emerald-500">♥ {stat.like}</span> · <span className="text-rose-400">✕ {stat.nope}</span>
        </span>
      </div>
      <div className="absolute inset-x-0 top-[70px] bottom-[86px]">
        {props.map(({ x, y, rot, scale }, i) => (
          <animated.div key={i} className="absolute inset-0 flex items-center justify-center will-change-transform" style={{ x, y }}>
            <animated.div
              {...bind(i)}
              style={{
                transform: to([rot, scale], (r, s) => `perspective(1200px) rotateX(8deg) rotateY(${r / 10}deg) rotateZ(${r}deg) scale(${s})`),
                touchAction: 'none',
              }}
              className="relative aspect-[3/4] w-[78%] cursor-grab overflow-hidden rounded-[22px] bg-white shadow-[0_18px_40px_-12px_rgba(50,30,30,.35)] select-none active:cursor-grabbing"
            >
              <img src={art(CARDS[i].kind, CARDS[i].seed, 360, 480)} className="pointer-events-none absolute inset-0 h-full w-full object-cover" alt="" draggable={false} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-white">
                <div className="text-lg font-bold">{CARDS[i].title}</div>
                <div className="text-[11px] opacity-85">{CARDS[i].sub}</div>
              </div>
              <animated.div
                style={{ opacity: x.to((v) => Math.min(1, Math.max(0, v / 90))) }}
                className="absolute top-4 left-3 -rotate-12 rounded-md border-2 border-emerald-400 px-2 text-sm font-black text-emerald-400"
              >
                行きたい
              </animated.div>
              <animated.div
                style={{ opacity: x.to((v) => Math.min(1, Math.max(0, -v / 90))) }}
                className="absolute top-4 right-3 rotate-12 rounded-md border-2 border-rose-400 px-2 text-sm font-black text-rose-400"
              >
                パス
              </animated.div>
            </animated.div>
          </animated.div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-7 flex justify-center gap-5">
        <button
          onClick={() => top() >= 0 && fling(top(), -1)}
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-rose-400 shadow-lg transition active:scale-90"
          aria-label="パス"
        >
          <X size={22} strokeWidth={3} />
        </button>
        <button
          onClick={() => top() >= 0 && fling(top(), 1)}
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-emerald-500 shadow-lg transition active:scale-90"
          aria-label="行きたい"
        >
          <Heart size={20} strokeWidth={3} fill="currentColor" />
        </button>
      </div>
    </PhoneFrame>
  )
}
