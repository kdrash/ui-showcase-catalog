import { useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, Heart, MoreHorizontal, Pause, Play, SkipBack, SkipForward } from 'lucide-react'

const BG = '#e4e9f0'
/** 凸(raised): 右下に暗い影、左上に白い影 */
const RAISED = '8px 8px 16px #bec8d6, -8px -8px 16px #ffffff'
const RAISED_SM = '4px 4px 8px #bec8d6, -4px -4px 8px #ffffff'
/** 凹(pressed): 同じ影を inset で */
const PRESSED = 'inset 4px 4px 8px #bec8d6, inset -4px -4px 8px #ffffff'

const DURATION = 204

function NeuButton({
  children,
  pressed,
  onClick,
  size = 40,
  label,
}: {
  children: ReactNode
  pressed?: boolean
  onClick?: () => void
  size?: number
  label: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="grid place-items-center rounded-full text-slate-500 transition-[box-shadow,color] duration-200 hover:text-slate-700"
      style={{ width: size, height: size, background: BG, boxShadow: pressed ? PRESSED : RAISED_SM }}
    >
      {children}
    </button>
  )
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * Neumorphism: 背景と同じ色の要素に、明暗2方向の box-shadow を付けて「浮き出し」「凹み」を表現。
 * 再生中は再生ボタンが凹み、ジャケットが回転(CSS animation + animation-play-state)。
 */
export function NeumorphicPlayer() {
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(false)
  const [time, setTime] = useState(48)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setTime((t) => (t + 0.25) % DURATION), 250)
    return () => window.clearInterval(id)
  }, [playing])

  const pct = (time / DURATION) * 100

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden" style={{ background: BG }}>
      <style>{`@keyframes neu-spin { to { transform: rotate(360deg) } }`}</style>
      <div className="w-[260px] rounded-[32px] p-5" style={{ background: BG, boxShadow: RAISED }}>
        <div className="flex items-center justify-between">
          <NeuButton label="戻る" size={34}>
            <ChevronLeft size={16} />
          </NeuButton>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Now Playing</span>
          <NeuButton label="メニュー" size={34}>
            <MoreHorizontal size={16} />
          </NeuButton>
        </div>

        <div className="mx-auto my-4 grid h-[120px] w-[120px] place-items-center rounded-full" style={{ boxShadow: RAISED }}>
          <div
            className="grid h-[104px] w-[104px] place-items-center rounded-full"
            style={{
              background: 'conic-gradient(from 0deg,#a5b4fc,#f0abfc,#fda4af,#fde68a,#a5b4fc)',
              animation: 'neu-spin 8s linear infinite',
              animationPlayState: playing ? 'running' : 'paused',
            }}
          >
            <div className="h-6 w-6 rounded-full" style={{ background: BG, boxShadow: PRESSED }} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-700">Lo-fi Breeze</div>
            <div className="text-[11px] text-slate-400">Soft Static</div>
          </div>
          <NeuButton label="お気に入り" size={34} pressed={liked} onClick={() => setLiked((l) => !l)}>
            <Heart size={14} className={liked ? 'text-rose-500' : ''} fill={liked ? 'currentColor' : 'none'} />
          </NeuButton>
        </div>

        <div className="mt-3">
          <div className="relative h-2 rounded-full" style={{ boxShadow: PRESSED }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-300 to-violet-400"
              style={{ width: `${pct}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${pct}%`, background: BG, boxShadow: RAISED_SM }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate-400">
            <span>{fmt(time)}</span>
            <span>{fmt(DURATION)}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-5">
          <NeuButton label="前の曲" onClick={() => setTime(0)}>
            <SkipBack size={16} />
          </NeuButton>
          <NeuButton label={playing ? '一時停止' : '再生'} size={56} pressed={playing} onClick={() => setPlaying((p) => !p)}>
            {playing ? (
              <Pause size={20} className="text-violet-500" />
            ) : (
              <Play size={20} className="ml-0.5 text-violet-500" />
            )}
          </NeuButton>
          <NeuButton label="次の曲" onClick={() => setTime(0)}>
            <SkipForward size={16} />
          </NeuButton>
        </div>
      </div>
    </div>
  )
}
