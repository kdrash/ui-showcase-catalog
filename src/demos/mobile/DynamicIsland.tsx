import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Pause, Phone, PhoneOff, SkipBack, SkipForward, Timer, MessageCircle } from 'lucide-react'
import { PhoneFrame } from './PhoneFrame'
import { art } from '../_shared/art'

type Mode = 'idle' | 'call' | 'timer' | 'music' | 'notify'

const SIZES: Record<string, string> = {
  idle: 'w-[31%] h-[24px]',
  compact: 'w-[80%] h-[30px]',
  notify: 'w-[calc(100%-14px)] h-[70px]',
  call: 'w-[calc(100%-14px)] h-[76px]',
  timer: 'w-[calc(100%-14px)] h-[76px]',
  music: 'w-[calc(100%-14px)] h-[148px]',
}

const Wave = ({ big }: { big?: boolean }) => (
  <span className={`flex items-center gap-[2px] ${big ? 'h-5' : 'h-3'}`}>
    {[0, 1, 2, 3, 4].map((i) => (
      <i
        key={i}
        className="w-[3px] rounded-full bg-gradient-to-t from-orange-400 to-pink-400"
        style={{ height: '100%', animation: `di-wave .${7 + i}s ease-in-out ${i * -0.13}s infinite alternate` }}
      />
    ))}
  </span>
)

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function DynamicIsland() {
  const [mode, setMode] = useState<Mode>('music')
  const [open, setOpen] = useState(false)
  const [sec, setSec] = useState(272)
  const [callSec, setCallSec] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setSec((s) => (s > 0 ? s - 1 : 300))
      setCallSec((s) => s + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (mode !== 'notify') return
    const t = setTimeout(() => setMode('idle'), 3200)
    return () => clearTimeout(t)
  }, [mode])

  const key = mode === 'idle' || mode === 'notify' ? mode : open ? mode : 'compact'
  const go = (m: Mode) => {
    setMode(m)
    setOpen(false)
    if (m === 'call') setCallSec(0)
  }

  return (
    <PhoneFrame dark island={false} screenClass="bg-black" bg="bg-[radial-gradient(circle_at_70%_10%,#3b0764,#0c0a09_65%)]">
      <style>{'@keyframes di-wave{from{transform:scaleY(.25)}to{transform:scaleY(1)}}'}</style>
      <img src={art('gradient', 5, 400, 860)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />

      {/* island */}
      <div className="absolute inset-x-0 top-2 z-50 flex justify-center">
        <motion.button
          layout
          onClick={() => mode !== 'idle' && mode !== 'notify' && setOpen((o) => !o)}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          style={{ borderRadius: open || mode === 'notify' ? 30 : 20 }}
          className={`relative overflow-hidden bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,.4)] ${SIZES[key]}`}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={key + mode}
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(6px)', transition: { duration: 0.12 } }}
              transition={{ delay: 0.12, duration: 0.25 }}
              className="absolute inset-0 flex items-center px-2.5 text-left"
            >
              {key === 'compact' && (
                <div className="flex w-full items-center justify-between text-[11px]">
                  {mode === 'music' && (
                    <>
                      <img src={art('landscape', 0, 60, 60)} className="h-5 w-5 rounded-md" alt="" />
                      <Wave />
                    </>
                  )}
                  {mode === 'call' && (
                    <>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Phone size={12} fill="currentColor" /> {fmt(callSec)}
                      </span>
                      <Wave />
                    </>
                  )}
                  {mode === 'timer' && (
                    <>
                      <Timer size={14} className="text-amber-400" />
                      <span className="font-semibold text-amber-400 tabular-nums">{fmt(sec)}</span>
                    </>
                  )}
                </div>
              )}
              {key === 'music' && (
                <div className="w-full px-1.5">
                  <div className="flex items-center gap-2.5">
                    <img src={art('landscape', 0, 120, 120)} className="h-11 w-11 rounded-xl" alt="" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold">夜明けのハイウェイ</div>
                      <div className="truncate text-[10px] text-zinc-400">Neon Tide</div>
                    </div>
                    <Wave big />
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[9px] text-zinc-500 tabular-nums">
                    1:12
                    <div className="h-1 flex-1 rounded-full bg-white/20">
                      <div className="h-full w-[38%] rounded-full bg-white" />
                    </div>
                    -2:04
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-6">
                    <SkipBack size={16} fill="currentColor" />
                    <Pause size={22} fill="currentColor" />
                    <SkipForward size={16} fill="currentColor" />
                  </div>
                </div>
              )}
              {key === 'call' && (
                <div className="flex w-full items-center gap-2 px-1">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold">ゆ</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-zinc-400">携帯 · {fmt(callSec)}</div>
                    <div className="truncate text-[13px] font-semibold">ゆうき</div>
                  </div>
                  <span onClick={(e) => (e.stopPropagation(), go('idle'))} className="grid h-9 w-9 place-items-center rounded-full bg-rose-500">
                    <PhoneOff size={15} />
                  </span>
                </div>
              )}
              {key === 'timer' && (
                <div className="flex w-full items-center justify-between px-2">
                  <div>
                    <div className="text-[10px] text-zinc-400">タイマー · パスタ</div>
                    <div className="text-2xl font-light text-amber-400 tabular-nums">{fmt(sec)}</div>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-500/25 text-amber-400">
                    <Pause size={15} fill="currentColor" />
                  </span>
                </div>
              )}
              {key === 'notify' && (
                <div className="flex w-full items-center gap-2.5 px-1.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500">
                    <MessageCircle size={17} fill="white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold">あおい</div>
                    <div className="truncate text-[11px] text-zinc-300">今夜19時に駅前で集合ね!🍜</div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* lock screen */}
      <div className="absolute inset-x-0 top-[17%] text-center text-white">
        <div className="text-[12px] font-medium opacity-80">11月6日 木曜日</div>
        <div className="text-[64px] leading-none font-semibold tracking-tight">9:41</div>
        <div className="mt-2 text-[10px] opacity-60">↑ 島をタップで展開</div>
      </div>
      <div className="absolute inset-x-3 bottom-6 flex flex-wrap justify-center gap-1.5">
        {(
          [
            ['music', '音楽'],
            ['call', '通話'],
            ['timer', 'タイマー'],
            ['notify', '通知'],
            ['idle', 'なし'],
          ] as [Mode, string][]
        ).map(([m, l]) => (
          <button
            key={m}
            onClick={() => go(m)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-medium backdrop-blur-md transition ${mode === m ? 'bg-white text-black' : 'bg-white/15 text-white hover:bg-white/25'}`}
          >
            {l}
          </button>
        ))}
      </div>
    </PhoneFrame>
  )
}
