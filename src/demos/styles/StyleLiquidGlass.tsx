import { useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { Heart, MessageCircle, Play } from 'lucide-react'
import { art } from '../_shared/art'

/**
 * Liquid Glass(Apple 2025 風)
 * 「ぼかすガラス」ではなく「背景を屈折させる厚いガラス」。
 * 1) Canvas で角丸矩形の“縁だけ内側へずらす”ディスプレイスメントマップを生成(R=x, G=y, 128 が中立)
 * 2) <filter> の feImage でそのマップを読み、feDisplacementMap で背景を歪ませる
 * 3) それを CSS の backdrop-filter: url(#filter) で要素の背後に適用(Chromium のみ。他は blur にフォールバック)
 * 4) 内側の白いハイライト(inset box-shadow)と薄い白で厚みを出す
 */
function makeDisplacementMap(w: number, h: number, radius: number, bezel: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - w / 2
      const py = y + 0.5 - h / 2
      const qx = Math.abs(px) - (w / 2 - radius)
      const qy = Math.abs(py) - (h / 2 - radius)
      // 角丸矩形の符号付き距離(内側が負)
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
      const inside = -sd
      let dx = 0
      let dy = 0
      if (inside >= 0 && inside < bezel) {
        const t = 1 - inside / bezel
        const s = t * t * (3 - 2 * t) // smoothstep: 縁ほど強く屈折
        let nx: number
        let ny: number
        if (qx > 0 && qy > 0) {
          nx = qx
          ny = qy
        } else if (qx > qy) {
          nx = 1
          ny = 0
        } else {
          nx = 0
          ny = 1
        }
        const len = Math.hypot(nx, ny) || 1
        dx = -(nx / len) * Math.sign(px) * s
        dy = -(ny / len) * Math.sign(py) * s
      }
      const i = (y * w + x) * 4
      img.data[i] = 128 + dx * 127
      img.data[i + 1] = 128 + dy * 127
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

function GlassFilter({ id, w, h, radius, bezel, scale }: { id: string; w: number; h: number; radius: number; bezel: number; scale: number }) {
  const map = useMemo(() => makeDisplacementMap(w, h, radius, bezel), [w, h, radius, bezel])
  return (
    <filter id={id} x="0" y="0" width={w} height={h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feImage href={map} x="0" y="0" width={w} height={h} preserveAspectRatio="none" result="map" />
      <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result="refracted" />
      <feColorMatrix in="refracted" type="saturate" values="1.5" />
    </filter>
  )
}

const supportsSvgBackdrop =
  typeof navigator !== 'undefined' && /Chrome|Chromium|Edg\//.test(navigator.userAgent) && !/Firefox/.test(navigator.userAgent)

const glass = (filterId: string): CSSProperties => ({
  backdropFilter: supportsSvgBackdrop ? `url(#${filterId})` : 'blur(6px) saturate(160%)',
  WebkitBackdropFilter: 'blur(6px) saturate(160%)',
  background: 'rgba(255,255,255,0.08)',
  boxShadow:
    'inset 1.5px 1.5px 0 rgba(255,255,255,0.75), inset -1px -1px 0 rgba(255,255,255,0.35), inset 0 0 18px rgba(255,255,255,0.18), 0 10px 30px rgba(0,0,0,0.25)',
})

const CARD = { w: 290, h: 300, r: 36 }
const LENS = { w: 120, h: 120, r: 60 }

export function StyleLiquidGlass() {
  const uid = useId().replace(/:/g, '')
  const cardF = `lg-card-${uid}`
  const lensF = `lg-lens-${uid}`
  const pillF = `lg-pill-${uid}`
  const bounds = useRef<HTMLDivElement>(null)
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(64)
  const [liked, setLiked] = useState(false)
  const bg = useMemo(() => art('landscape', 5, 1200, 800), [])

  return (
    <div ref={bounds} className="relative grid h-full w-full place-items-center overflow-hidden text-white" style={{ fontFamily: 'Inter, "Noto Sans JP", sans-serif' }}>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <GlassFilter id={cardF} w={CARD.w} h={CARD.h} radius={CARD.r} bezel={34} scale={70} />
        <GlassFilter id={lensF} w={LENS.w} h={LENS.h} radius={LENS.r} bezel={44} scale={90} />
        <GlassFilter id={pillF} w={120} h={40} radius={20} bezel={16} scale={40} />
      </svg>

      {/* 屈折が分かるように、模様と文字のある背景をゆっくり動かす */}
      <motion.div
        className="absolute inset-[-10%]"
        style={{ backgroundImage: `url("${bg}")`, backgroundSize: 'cover' }}
        animate={{ x: ['0%', '-4%', '0%'], y: ['0%', '3%', '0%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.0) 0 22px, rgba(255,255,255,0.22) 22px 24px), repeating-linear-gradient(0deg, rgba(0,0,0,0) 0 22px, rgba(0,0,0,0.12) 22px 24px)',
        }}
      />
      <p className="pointer-events-none absolute left-4 top-3 select-none text-[64px] font-black leading-[0.85] tracking-tighter text-white/85 mix-blend-overlay">
        LIQUID
        <br />
        GLASS
      </p>

      {/* カード */}
      <div className="relative flex flex-col rounded-[36px] p-5" style={{ width: CARD.w, height: CARD.h, ...glass(cardF) }}>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/25 text-sm font-semibold shadow-[inset_1px_1px_0_rgba(255,255,255,.8)]">
            MS
          </div>
          <div className="[text-shadow:0_1px_8px_rgba(0,0,0,.35)]">
            <p className="text-[17px] font-semibold">Mika Sato</p>
            <p className="text-xs text-white/80">Product Designer</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[13px] [text-shadow:0_1px_6px_rgba(0,0,0,.35)]">
          <span>Notifications</span>
          <button
            role="switch"
            aria-checked={notify}
            aria-label="Notifications"
            onClick={() => setNotify((v) => !v)}
            className="relative h-7 w-[52px] rounded-full transition-colors"
            style={{ background: notify ? 'rgba(52,199,89,0.9)' : 'rgba(255,255,255,0.25)' }}
          >
            <motion.span
              className="absolute top-[2px] h-6 w-8 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
              animate={{ left: notify ? 18 : 2 }}
              whileTap={{ scaleX: 1.25, scaleY: 1.15, backgroundColor: 'rgba(255,255,255,0.55)' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        <div className="mt-3 relative h-6">
          <input
            type="range"
            value={volume}
            onChange={(e) => setVolume(+e.target.value)}
            aria-label="Volume"
            className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
          />
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/30" />
          <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white" style={{ width: `${volume}%` }} />
          <div
            className="absolute top-1/2 h-6 w-9 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
            style={{ left: `calc(${volume}% - ${volume * 0.36}px)` }}
          />
        </div>

        <div className="mt-auto flex items-center gap-2">
          <button
            className="mr-auto flex h-10 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition active:scale-95"
            style={{ width: 120, ...glass(pillF), background: 'rgba(255,255,255,0.18)' }}
          >
            <Play size={14} fill="currentColor" /> Follow
          </button>
          <button
            aria-label="Message"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15 shadow-[inset_1px_1px_0_rgba(255,255,255,.7),inset_-1px_-1px_0_rgba(255,255,255,.3)] transition active:scale-95"
          >
            <MessageCircle size={16} />
          </button>
          <button
            aria-label="Like"
            onClick={() => setLiked((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15 shadow-[inset_1px_1px_0_rgba(255,255,255,.7),inset_-1px_-1px_0_rgba(255,255,255,.3)] transition active:scale-95"
          >
            <Heart size={16} fill={liked ? '#ff375f' : 'none'} color={liked ? '#ff375f' : 'currentColor'} />
          </button>
        </div>
      </div>

      {/* ドラッグできるレンズ */}
      <motion.div
        drag
        dragConstraints={bounds}
        dragMomentum={false}
        whileDrag={{ scale: 1.08 }}
        className="absolute right-[8%] top-[12%] cursor-grab rounded-full active:cursor-grabbing"
        style={{ width: LENS.w, height: LENS.h, ...glass(lensF), background: 'rgba(255,255,255,0.04)' }}
      >
        <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] font-semibold tracking-wider text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,.5)]">
          DRAG ME
        </span>
      </motion.div>
    </div>
  )
}
