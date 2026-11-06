import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { Home, Image as ImageIcon, MessageCircle, Mic, Users } from 'lucide-react'
import { art } from '../_shared/art'

/**
 * Spatial(visionOS 風)
 * 部屋(背景画像)の中に、すりガラスのウィンドウが奥行きをもって浮かぶ。
 * - ウィンドウ: 白 18% + blur(40px) saturate(180%)、角丸 32px、柔らかい影、上辺にハイライト
 * - 左に縦長カプセルのタブバー(オーナメント)、下にウィンドウを掴むバー
 * - マウスで全体が rotateX/Y(視差)し、手前の要素ほど大きく動く
 * - ボタンは hover で白く光る(視線フォーカスのハイライトに相当)
 */
const glass = {
  background: 'rgba(255,255,255,0.16)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 0 0 1px rgba(255,255,255,0.12), 0 30px 60px rgba(0,0,0,0.35)',
}

export function StyleSpatial() {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 120, damping: 20 })
  const sy = useSpring(my, { stiffness: 120, damping: 20 })
  const rotY = useTransform(sx, [-1, 1], [-8, 8])
  const rotX = useTransform(sy, [-1, 1], [6, -6])
  const ornX = useTransform(sx, [-1, 1], [-10, 10])
  const ornY = useTransform(sy, [-1, 1], [-6, 6])
  const bgX = useTransform(sx, [-1, 1], [12, -12])
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(60)
  const [tab, setTab] = useState(0)
  const [following, setFollowing] = useState(false)
  const bg = useMemo(() => art('landscape', 1, 1200, 800), [])

  const onMove = (e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1)
    my.set(((e.clientY - r.top) / r.height) * 2 - 1)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(0)
        my.set(0)
      }}
      className="relative grid h-full w-full place-items-center overflow-hidden text-white"
      style={{ perspective: 900, fontFamily: '-apple-system, "SF Pro Display", Inter, sans-serif' }}
    >
      <motion.div className="absolute inset-[-6%] bg-cover bg-center" style={{ backgroundImage: `url("${bg}")`, x: bgX, filter: 'saturate(1.1) brightness(.85)' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />

      <motion.div className="relative flex items-center gap-3" style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}>
        {/* ornament: tab bar */}
        <motion.div className="flex flex-col gap-1.5 rounded-full p-1.5" style={{ ...glass, x: ornX, y: ornY, translateZ: 40 }}>
          {[Home, Users, ImageIcon, MessageCircle].map((Icon, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              aria-label={`tab ${i}`}
              className={`grid h-10 w-10 place-items-center rounded-full transition ${tab === i ? 'bg-white/35' : 'hover:bg-white/20'}`}
            >
              <Icon size={17} />
            </button>
          ))}
        </motion.div>

        <div className="flex flex-col items-center" style={{ transformStyle: 'preserve-3d' }}>
          {/* window */}
          <div className="w-[270px] rounded-[32px] p-5" style={glass}>
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-white/60 to-white/20 text-lg font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,.7)]">
                MS
              </div>
              <div>
                <p className="text-[19px] font-semibold tracking-tight">Mika Sato</p>
                <p className="text-[12px] text-white/70">Product Designer</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
              {[
                ['128', 'Posts'],
                ['2.4k', 'Followers'],
                ['312', 'Following'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-black/10 py-1.5">
                  <p className="text-[15px] font-semibold">{v}</p>
                  <p className="text-[10px] text-white/65">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-black/10 px-3 py-2 text-[13px]">
              <span>Notifications</span>
              <button role="switch" aria-checked={notify} aria-label="Notifications" onClick={() => setNotify((v) => !v)} className="relative h-6 w-10 rounded-full transition-colors" style={{ background: notify ? '#30d158' : 'rgba(255,255,255,.25)' }}>
                <motion.span className="absolute top-[2px] h-5 w-5 rounded-full bg-white shadow" animate={{ left: notify ? 18 : 2 }} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-black/10 px-3 py-2.5">
              <Mic size={14} className="text-white/70" />
              <div className="relative h-4 flex-1">
                <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
                <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/20" />
                <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white" style={{ width: `${volume}%` }} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setFollowing((f) => !f)}
                className="h-10 rounded-full bg-white/25 text-[14px] font-semibold transition hover:bg-white/45 hover:shadow-[0_0_24px_rgba(255,255,255,.45)]"
              >
                {following ? 'Following' : 'Follow'}
              </button>
              <button className="h-10 rounded-full bg-black/15 text-[14px] font-semibold transition hover:bg-white/30 hover:shadow-[0_0_24px_rgba(255,255,255,.35)]">Message</button>
            </div>
          </div>
          {/* window grabber */}
          <div className="mt-2.5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white/50" />
            <span className="h-2 w-24 rounded-full bg-white/60" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
