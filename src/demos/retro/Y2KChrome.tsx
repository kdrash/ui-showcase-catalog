import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'

/**
 * Y2K(2000年前後)風クローム × アクアのメディアプレイヤー。ライブラリは Motion と lucide のみ、質感は CSS。
 * - 金属クロームの筐体: 多段 linear-gradient + 非対称 border-radius
 * - アクアのジェルボタン: radial-gradient + 上部ハイライト(::before)
 * - 液晶: スクロールするタイトル(marquee)、ビジュアライザー(CSS keyframes、停止時は paused)
 * - ボリュームノブ: Pointer Events + setPointerCapture でドラッグ回転
 * - 曲名の切替は AnimatePresence
 */

const TRACKS = [
  { title: 'Cyber Bubblegum Dreams', artist: 'DJ Chrome', len: 214 },
  { title: 'Millennium Hyperlink', artist: 'Aqua Unit', len: 187 },
  { title: 'Liquid Crystal Love', artist: 'Holo Girls', len: 242 },
]

const CSS = `
@keyframes y2k-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
@keyframes y2k-bar { 0%,100% { transform: scaleY(.15) } 50% { transform: scaleY(1) } }
@keyframes y2k-twinkle { 0%,100% { opacity: .2; transform: scale(.6) rotate(0deg) } 50% { opacity: 1; transform: scale(1) rotate(45deg) } }
.y2k-chrome { background: linear-gradient(160deg, #fbfcfe 0%, #c6ccd7 16%, #8e97a8 32%, #f1f4f8 50%, #a9b1bf 66%, #eceff4 82%, #7c8597 100%);
  box-shadow: inset 0 2px 1px rgba(255,255,255,.9), inset 0 -3px 6px rgba(0,0,0,.25), 0 18px 40px -10px rgba(70,40,140,.45), 0 0 0 1px rgba(80,90,110,.5); }
.y2k-gel { position: relative; color: #fff; border: 1px solid rgba(0,60,120,.55);
  background: radial-gradient(ellipse at 50% 120%, #8ff3ff 0%, #2fb6ff 45%, #0b6fd8 100%);
  box-shadow: inset 0 -4px 8px rgba(0,40,120,.45), inset 0 2px 2px rgba(255,255,255,.6), 0 3px 8px rgba(0,80,180,.45);
  transition: transform .15s, filter .15s; }
.y2k-gel::before { content: ""; position: absolute; left: 14%; right: 14%; top: 5%; height: 45%; border-radius: 999px;
  background: linear-gradient(rgba(255,255,255,.95), rgba(255,255,255,.1)); pointer-events: none; }
.y2k-gel:hover { filter: brightness(1.12) saturate(1.2); }
.y2k-gel:active { transform: scale(.94); }
.y2k-gel.pink { border-color: rgba(140,0,90,.5); background: radial-gradient(ellipse at 50% 120%, #ffd1f5 0%, #ff6ad5 45%, #c2189b 100%);
  box-shadow: inset 0 -4px 8px rgba(120,0,80,.45), inset 0 2px 2px rgba(255,255,255,.6), 0 3px 10px rgba(220,40,170,.5); }
.y2k-lcd { background: linear-gradient(#08343f, #041f26); box-shadow: inset 0 2px 8px rgba(0,0,0,.8), 0 1px 0 rgba(255,255,255,.7); }
.y2k-lcd-text { color: #7dfcff; text-shadow: 0 0 6px rgba(125,252,255,.8); }
.y2k-bar { transform-origin: bottom; animation: y2k-bar var(--d) ease-in-out infinite; animation-delay: var(--delay); }
.y2k-paused .y2k-bar { animation-play-state: paused; }
.y2k-range { -webkit-appearance: none; appearance: none; height: 8px; border-radius: 99px; outline: none;
  background: linear-gradient(90deg, #4fd8ff var(--p), #9aa3b2 var(--p)); box-shadow: inset 0 1px 2px rgba(0,0,0,.45); }
.y2k-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; cursor: pointer;
  background: radial-gradient(circle at 35% 30%, #fff, #c9d1dc 40%, #6f7889); box-shadow: 0 1px 3px rgba(0,0,0,.5); }
.y2k-range::-moz-range-thumb { width: 16px; height: 16px; border: 0; border-radius: 50%; cursor: pointer;
  background: radial-gradient(circle at 35% 30%, #fff, #c9d1dc 40%, #6f7889); box-shadow: 0 1px 3px rgba(0,0,0,.5); }
.y2k-star { position: absolute; color: #fff; text-shadow: 0 0 8px #fff, 0 0 14px #c58bff; animation: y2k-twinkle var(--d) ease-in-out infinite; }
`

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const STARS = [
  { l: '8%', t: '14%', s: 18, d: '2.4s' },
  { l: '88%', t: '10%', s: 24, d: '3.1s' },
  { l: '92%', t: '72%', s: 14, d: '2s' },
  { l: '5%', t: '78%', s: 20, d: '2.8s' },
  { l: '50%', t: '6%', s: 12, d: '1.8s' },
  { l: '70%', t: '90%', s: 16, d: '2.6s' },
]

const BARS = Array.from({ length: 14 }, (_, i) => ({ d: `${0.5 + ((i * 37) % 7) / 10}s`, delay: `${-((i * 53) % 9) / 10}s` }))

export function Y2KChrome() {
  const [track, setTrack] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [pos, setPos] = useState(0)
  const [volume, setVolume] = useState(70)
  const knobDrag = useRef<{ y: number; v: number } | null>(null)
  const t = TRACKS[track]

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setPos((p) => p + 1), 1000)
    return () => clearInterval(id)
  }, [playing])

  useEffect(() => {
    if (pos >= t.len) {
      setTrack((i) => (i + 1) % TRACKS.length)
      setPos(0)
    }
  }, [pos, t.len])

  const change = (dir: 1 | -1) => {
    setTrack((i) => (i + dir + TRACKS.length) % TRACKS.length)
    setPos(0)
  }

  const onKnobDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    knobDrag.current = { y: e.clientY, v: volume }
  }
  const onKnobMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!knobDrag.current) return
    const next = knobDrag.current.v + (knobDrag.current.y - e.clientY) * 0.8
    setVolume(Math.round(Math.min(100, Math.max(0, next))))
  }
  const onKnobUp = () => {
    knobDrag.current = null
  }

  const progressPct = (pos / t.len) * 100

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 20% 20%, #ffffff 0%, transparent 35%), linear-gradient(135deg, #c9d6ff 0%, #e6dcff 30%, #ffd1f7 62%, #b5fffc 100%)',
        fontFamily: "Orbitron, 'Noto Sans JP', sans-serif",
      }}
    >
      <style>{CSS}</style>
      {/* bubbles & sparkles */}
      <div className="pointer-events-none absolute -left-10 top-6 h-40 w-40 rounded-full bg-gradient-to-br from-white/80 to-fuchsia-300/40 blur-[2px]" />
      <div className="pointer-events-none absolute -right-8 bottom-4 h-32 w-32 rounded-full bg-gradient-to-br from-white/80 to-cyan-300/40 blur-[2px]" />
      {STARS.map((s, i) => (
        <span
          key={i}
          className="y2k-star pointer-events-none"
          style={{ left: s.l, top: s.t, fontSize: s.s, ['--d' as string]: s.d } as CSSProperties}
        >
          ✦
        </span>
      ))}

      {/* player shell */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="y2k-chrome relative flex w-[min(92%,400px)] flex-col gap-3 px-6 pb-5 pt-4"
        style={{ borderRadius: '70px 34px 80px 40px / 44px 64px 36px 74px' }}
      >
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black italic tracking-[0.25em] text-[#3d4a63] drop-shadow-[0_1px_0_#fff]">AQUA·AMP 2000</span>
          <span className="flex gap-1">
            {['#ff6ad5', '#ffd23f', '#4fd8ff'].map((c) => (
              <i key={c} className="h-2.5 w-2.5 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,.8),0_0_4px_rgba(0,0,0,.3)]" style={{ background: c }} />
            ))}
          </span>
        </div>

        {/* LCD */}
        <div className={`y2k-lcd relative overflow-hidden rounded-[18px_8px_18px_8px] px-4 py-3 ${playing ? '' : 'y2k-paused'}`}>
          <div className="flex items-center justify-between text-[15px] leading-none" style={{ fontFamily: 'VT323, monospace' }}>
            <span className="y2k-lcd-text">{playing ? '▶ PLAY' : '❚❚ PAUSE'}</span>
            <span className="y2k-lcd-text tabular-nums">
              {fmt(pos)} / {fmt(t.len)}
            </span>
          </div>
          <div className="relative mt-1.5 h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={track}
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -18, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
              >
                <div
                  className="y2k-lcd-text flex w-max whitespace-nowrap text-[13px] font-bold tracking-wider"
                  style={{ animation: 'y2k-marquee 9s linear infinite', animationPlayState: playing ? 'running' : 'paused' }}
                >
                  {[0, 1].map((k) => (
                    <span key={k} className="pr-10">
                      ★ {t.artist} — {t.title}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-2 flex h-8 items-end gap-[3px]">
            {BARS.map((b, i) => (
              <span
                key={i}
                className="y2k-bar flex-1 rounded-t-sm bg-gradient-to-t from-[#1ad1ff] via-[#7dfcff] to-[#ff8af0]"
                style={{ height: '100%', ['--d' as string]: b.d, ['--delay' as string]: b.delay } as CSSProperties}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,.18),transparent_40%)]" />
        </div>

        {/* seek */}
        <input
          type="range"
          min={0}
          max={t.len}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="y2k-range w-full"
          style={{ ['--p' as string]: `${progressPct}%` } as CSSProperties}
          aria-label="seek"
        />

        {/* controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => change(-1)} className="y2k-gel grid h-9 w-11 place-items-center rounded-full" aria-label="previous">
              <SkipBack size={15} fill="currentColor" />
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="y2k-gel pink grid h-14 w-14 place-items-center rounded-full"
              aria-label={playing ? 'pause' : 'play'}
            >
              {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="translate-x-[2px]" />}
            </button>
            <button onClick={() => change(1)} className="y2k-gel grid h-9 w-11 place-items-center rounded-full" aria-label="next">
              <SkipForward size={15} fill="currentColor" />
            </button>
          </div>

          {/* volume knob */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#3d4a63]" style={{ fontFamily: 'VT323, monospace' }}>VOL {volume}</span>
            <div
              onPointerDown={onKnobDown}
              onPointerMove={onKnobMove}
              onPointerUp={onKnobUp}
              onPointerCancel={onKnobUp}
              className="relative h-12 w-12 cursor-ns-resize touch-none select-none rounded-full shadow-[0_3px_6px_rgba(0,0,0,.35),inset_0_1px_1px_#fff]"
              style={{ background: 'conic-gradient(from 200deg, #f6f8fb, #8e97a8, #f1f4f8, #a9b1bf, #f6f8fb)' }}
              title="ドラッグで音量調整"
            >
              <div
                className="absolute inset-1.5 rounded-full bg-gradient-to-b from-[#eef1f6] to-[#9aa3b2] shadow-[inset_0_1px_2px_rgba(0,0,0,.3)]"
                style={{ transform: `rotate(${-135 + volume * 2.7}deg)` }}
              >
                <span className="absolute left-1/2 top-1 h-2.5 w-1 -translate-x-1/2 rounded-full bg-[#ff6ad5] shadow-[0_0_6px_#ff6ad5]" />
              </div>
            </div>
          </div>
        </div>

        {/* playlist */}
        <div className="flex gap-1.5">
          {TRACKS.map((tr, i) => (
            <button
              key={tr.title}
              onClick={() => {
                setTrack(i)
                setPos(0)
                setPlaying(true)
              }}
              className={`flex-1 truncate rounded-full border px-2 py-1 text-[8px] font-bold tracking-wide transition ${i === track ? 'border-[#0b6fd8]/50 bg-white/70 text-[#0b6fd8] shadow-[0_0_8px_rgba(79,216,255,.6)]' : 'border-white/60 bg-white/30 text-[#4b5870] hover:bg-white/50'}`}
            >
              {String(i + 1).padStart(2, '0')}. {tr.title}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
