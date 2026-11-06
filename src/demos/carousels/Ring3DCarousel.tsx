import { useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
  type PanInfo,
} from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS = [
  { label: 'Aries', emoji: '🐏', hue: 0 },
  { label: 'Taurus', emoji: '🐂', hue: 40 },
  { label: 'Gemini', emoji: '👯', hue: 80 },
  { label: 'Cancer', emoji: '🦀', hue: 140 },
  { label: 'Leo', emoji: '🦁', hue: 190 },
  { label: 'Virgo', emoji: '🌾', hue: 230 },
  { label: 'Libra', emoji: '⚖️', hue: 270 },
  { label: 'Scorpio', emoji: '🦂', hue: 310 },
]

const N = ITEMS.length
const STEP = 360 / N
const PANEL_W = 112
const RADIUS = Math.round(PANEL_W / 2 / Math.tan(Math.PI / N)) + 36

/** 0〜360 を -180〜180 に正規化 */
const normalize = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180

function Panel({ index, rotation }: { index: number; rotation: MotionValue<number> }) {
  const item = ITEMS[index]
  // パネルがどれだけ正面を向いているかで明るさを変える
  const facing = useTransform(rotation, (r) => Math.cos((normalize(index * STEP + r) * Math.PI) / 180))
  const opacity = useTransform(facing, [-1, 1], [0.25, 1])
  const filter = useTransform(facing, (f) => `brightness(${0.5 + 0.5 * f}) saturate(${0.6 + 0.4 * f})`)

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 flex flex-col items-center justify-center rounded-2xl border border-white/20 text-white shadow-2xl"
      style={{
        width: PANEL_W,
        height: 150,
        marginLeft: -PANEL_W / 2,
        marginTop: -75,
        transform: `rotateY(${index * STEP}deg) translateZ(${RADIUS}px)`,
        background: `linear-gradient(160deg, hsl(${item.hue} 90% 60%), hsl(${item.hue + 40} 80% 30%))`,
        opacity,
        filter,
      }}
    >
      <span className="text-5xl drop-shadow-lg">{item.emoji}</span>
      <span className="mt-2 text-xs font-semibold uppercase tracking-[0.2em]">{item.label}</span>
    </motion.div>
  )
}

/**
 * CSS 3D(perspective + preserve-3d + rotateY/translateZ)でパネルを円環に配置。
 * Motion の onPan でドラッグ量を回転角に加算、離すと速度を加味した位置へスプリングでスナップ。
 */
export function Ring3DCarousel() {
  const rotation = useMotionValue(0)
  const [active, setActive] = useState(0)

  useMotionValueEvent(rotation, 'change', (r) => {
    setActive((((Math.round(-r / STEP) % N) + N) % N))
  })

  const snapTo = (target: number) => {
    animate(rotation, target, { type: 'spring', stiffness: 140, damping: 22 })
  }

  const onPanEnd = (_: PointerEvent, info: PanInfo) => {
    const projected = rotation.get() + info.velocity.x * 0.12
    snapTo(Math.round(projected / STEP) * STEP)
  }

  return (
    <div className="relative flex h-full w-full select-none flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#1e1b4b,#030014_70%)]">
      <div className="pointer-events-none absolute bottom-6 left-1/2 h-16 w-[70%] -translate-x-1/2 rounded-[50%] bg-indigo-500/20 blur-2xl" />
      <motion.div
        className="relative h-[230px] w-full cursor-grab touch-none active:cursor-grabbing"
        style={{ perspective: 900 }}
        onPanStart={() => rotation.stop()}
        onPan={(_, info) => rotation.set(rotation.get() + info.delta.x * 0.35)}
        onPanEnd={onPanEnd}
      >
        <motion.div
          className="absolute inset-0"
          style={{ transformStyle: 'preserve-3d', rotateY: rotation, z: -RADIUS }}
        >
          {ITEMS.map((_, i) => (
            <Panel key={i} index={i} rotation={rotation} />
          ))}
        </motion.div>
      </motion.div>

      <div className="relative mt-1 flex items-center gap-4 text-white">
        <button
          onClick={() => snapTo(Math.round(rotation.get() / STEP) * STEP + STEP)}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/5 hover:bg-white/15"
          aria-label="前へ"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="w-20 text-center text-xs uppercase tracking-[0.25em] text-white/80">
          {ITEMS[active].label}
        </span>
        <button
          onClick={() => snapTo(Math.round(rotation.get() / STEP) * STEP - STEP)}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/5 hover:bg-white/15"
          aria-label="次へ"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
