import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AudioLines, BatteryCharging, Camera, Clock, CloudSun, Compass, Heart, Image, Mail, MapPin, MessageCircle, Pause, Phone, SkipForward,
  type LucideIcon,
} from 'lucide-react'
import { PhoneFrame } from './PhoneFrame'
import { art } from '../_shared/art'

const glass = 'rounded-[20px] bg-white/20 ring-1 ring-white/30 backdrop-blur-xl text-white shadow-lg shadow-black/10'

type App = { id: string; name: string; icon: LucideIcon; bg: string }
const APPS: App[] = [
  { id: 'photos', name: '写真', icon: Image, bg: 'from-amber-300 to-rose-400' },
  { id: 'maps', name: 'マップ', icon: MapPin, bg: 'from-emerald-300 to-sky-500' },
  { id: 'clock', name: '時計', icon: Clock, bg: 'from-zinc-700 to-black' },
  { id: 'compass', name: 'コンパス', icon: Compass, bg: 'from-slate-500 to-slate-800' },
]
const DOCK: App[] = [
  { id: 'phone', name: '電話', icon: Phone, bg: 'from-lime-400 to-green-600' },
  { id: 'msg', name: 'メッセージ', icon: MessageCircle, bg: 'from-lime-400 to-emerald-500' },
  { id: 'mail', name: 'メール', icon: Mail, bg: 'from-sky-400 to-blue-600' },
  { id: 'cam', name: 'カメラ', icon: Camera, bg: 'from-zinc-300 to-zinc-500' },
]

function Jiggle({ on, i, children, className = '' }: { on: boolean; i: number; children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`} style={on ? { animation: `iw-jiggle .26s ease-in-out ${(i % 4) * -0.07}s infinite alternate` } : undefined}>
      {children}
    </div>
  )
}

function Icon({ app, edit, i, onRemove, label = true }: { app: App; edit: boolean; i: number; onRemove?: () => void; label?: boolean }) {
  return (
    <Jiggle on={edit} i={i} className="flex flex-col items-center gap-1">
      <div className={`grid aspect-square w-full place-items-center rounded-[22%] bg-gradient-to-br text-white shadow-md ${app.bg}`}>
        <app.icon className="h-[46%] w-[46%]" strokeWidth={2.2} />
      </div>
      {label && <span className="truncate text-[9.5px] font-medium text-white drop-shadow">{app.name}</span>}
      {edit && onRemove && (
        <button onClick={onRemove} className="absolute -top-1.5 -left-1.5 grid h-4 w-4 place-items-center rounded-full bg-zinc-200/90 text-[11px] leading-none font-bold text-zinc-700">
          −
        </button>
      )}
    </Jiggle>
  )
}

function Ring({ r, pct, color }: { r: number; pct: number; color: string }) {
  const c = 2 * Math.PI * r
  return (
    <>
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeOpacity=".25" strokeWidth="9" />
      <motion.circle
        cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1.4, ease: 'easeOut' }}
      />
    </>
  )
}

export function IosWidgets() {
  const [edit, setEdit] = useState(false)
  const [apps, setApps] = useState(APPS)
  const press = useRef<number | undefined>(undefined)
  const startPress = () => {
    clearTimeout(press.current)
    press.current = window.setTimeout(() => setEdit(true), 550)
  }
  const endPress = () => clearTimeout(press.current)

  return (
    <PhoneFrame dark screenClass="bg-sky-900" bg="bg-[radial-gradient(circle_at_20%_20%,#dbeafe,#fafaf9_60%)]">
      <style>{'@keyframes iw-jiggle{from{transform:rotate(-1.6deg)}to{transform:rotate(1.6deg)}}'}</style>
      <img src={art('landscape', 1, 400, 860)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div
        className="absolute inset-0 flex touch-none flex-col px-[7%] pt-12 select-none"
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onContextMenu={(e) => e.preventDefault()}
      >
        <AnimatePresence>
          {edit && (
            <motion.button
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setEdit(false)}
              className="absolute top-11 right-4 z-30 rounded-full bg-white/85 px-3 py-0.5 text-[11px] font-semibold text-zinc-900"
            >
              完了
            </motion.button>
          )}
        </AnimatePresence>
        <div className="grid grid-cols-4 gap-x-[6%] gap-y-[9px]">
          {/* weather */}
          <Jiggle on={edit} i={0} className="col-span-2">
            <div className={`${glass} aspect-square bg-gradient-to-b from-sky-400/70 to-blue-600/70 p-2.5`}>
              <div className="text-[10px] font-semibold">渋谷区</div>
              <div className="text-[28px] leading-tight font-light">18°</div>
              <CloudSun size={16} className="mt-0.5" />
              <div className="mt-0.5 text-[9px] font-medium opacity-90">晴れ時々曇り</div>
              <div className="text-[9px] opacity-80">最高21° 最低12°</div>
            </div>
          </Jiggle>
          {/* calendar */}
          <Jiggle on={edit} i={1} className="col-span-2">
            <div className="aspect-square rounded-[20px] bg-white p-2.5 text-zinc-900 shadow-lg">
              <div className="text-[9px] font-bold tracking-wide text-rose-500">木曜日</div>
              <div className="text-[28px] leading-none font-light">6</div>
              <div className="mt-1.5 border-l-2 border-violet-500 pl-1.5">
                <div className="truncate text-[9.5px] font-semibold">デザインレビュー</div>
                <div className="text-[8.5px] text-zinc-500">14:00–15:00</div>
              </div>
              <div className="mt-1 border-l-2 border-emerald-500 pl-1.5">
                <div className="truncate text-[9.5px] font-semibold">ジム</div>
              </div>
            </div>
          </Jiggle>
          {/* music (medium) */}
          <Jiggle on={edit} i={2} className="col-span-4">
            <div className={`${glass} flex aspect-[2.15/1] items-center gap-3 p-2.5`}>
              <img src={art('gradient', 5, 160, 160)} className="aspect-square h-full rounded-xl shadow-md" alt="" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[9px] opacity-80">
                  <AudioLines size={10} /> 再生中
                </div>
                <div className="truncate text-[12px] font-semibold">春の午後</div>
                <div className="truncate text-[10px] opacity-80">Lofi Kissa</div>
                <div className="mt-2 flex items-center gap-3">
                  <Pause size={15} fill="currentColor" />
                  <SkipForward size={14} fill="currentColor" />
                </div>
              </div>
            </div>
          </Jiggle>
          {/* rings */}
          <Jiggle on={edit} i={3} className="col-span-2">
            <div className="flex aspect-square flex-col items-center justify-center rounded-[20px] bg-black/85 p-2 text-white shadow-lg">
              <svg viewBox="0 0 100 100" className="h-[70%] -rotate-90">
                <Ring r={40} pct={0.82} color="#fb2c5b" />
                <Ring r={29} pct={0.64} color="#a3e635" />
                <Ring r={18} pct={0.9} color="#22d3ee" />
              </svg>
              <div className="mt-0.5 text-[9px] font-semibold tabular-nums">
                <span className="text-rose-400">412</span>/<span className="text-lime-400">26</span>/<span className="text-cyan-400">9</span>
              </div>
            </div>
          </Jiggle>
          {/* battery */}
          <Jiggle on={edit} i={4} className="col-span-2">
            <div className={`${glass} grid aspect-square grid-cols-2 place-items-center gap-1 p-2.5`}>
              {[
                ['📱', 0.86],
                ['🎧', 0.42],
                ['⌚', 0.67],
                ['', 0],
              ].map(([e, v], k) =>
                e ? (
                  <div key={k} className="relative grid h-[85%] place-items-center">
                    <svg viewBox="0 0 40 40" className="absolute inset-0 m-auto h-full -rotate-90">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="white" strokeOpacity=".25" strokeWidth="4" />
                      <circle cx="20" cy="20" r="16" fill="none" stroke={(v as number) < 0.5 ? '#facc15' : '#4ade80'} strokeWidth="4" strokeLinecap="round" strokeDasharray={100.5} strokeDashoffset={100.5 * (1 - (v as number))} />
                    </svg>
                    <span className="text-[11px]">{e}</span>
                  </div>
                ) : (
                  <div key={k} className="text-center text-[9px] leading-tight font-semibold">
                    <BatteryCharging size={13} className="mx-auto" />
                    86%
                  </div>
                ),
              )}
            </div>
          </Jiggle>
          {/* apps */}
          <AnimatePresence>
            {apps.map((a, i) => (
              <motion.div key={a.id} layout exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Icon app={a} edit={edit} i={i + 5} onRemove={() => setApps((xs) => xs.filter((x) => x.id !== a.id))} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {!edit && <div className="mt-auto mb-[78px] text-center text-[9px] text-white/80 drop-shadow">長押しで編集モード</div>}
      </div>
      {/* dock */}
      <div className={`${glass} absolute inset-x-[4%] bottom-3.5 z-20 grid grid-cols-4 gap-[6%] rounded-[26px] px-[5%] py-2.5`}>
        {DOCK.map((a, i) => (
          <Icon key={a.id} app={a} edit={edit} i={i} label={false} />
        ))}
      </div>
      {!apps.length && (
        <button onClick={() => setApps(APPS)} className="absolute top-1/2 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-[11px] text-zinc-900">
          <Heart size={10} className="mr-1 inline" />
          アプリを戻す
        </button>
      )}
    </PhoneFrame>
  )
}

