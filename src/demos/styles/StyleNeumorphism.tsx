import { useState } from 'react'
import { motion } from 'motion/react'
import { Heart, MessageCircle } from 'lucide-react'

/**
 * Neumorphism (Soft UI)
 * 背景とパーツを同じ色 (#e0e5ec) にし、左上に白い光・右下に青灰色の影を落として
 * 「浮き出る (raised)」「凹む (inset)」を表現する。押下時は raised → inset に切り替え。
 */
const css = `
.neu-root   { background:#e0e5ec; color:#3d4468; }
.neu-raised { background:#e0e5ec; box-shadow: 9px 9px 16px rgb(163 177 198 / .6), -9px -9px 16px rgb(255 255 255 / .5); }
.neu-raised-sm { background:#e0e5ec; box-shadow: 5px 5px 10px rgb(163 177 198 / .6), -5px -5px 10px rgb(255 255 255 / .6); }
.neu-inset  { background:#e0e5ec; box-shadow: inset 4px 4px 8px rgb(163 177 198 / .6), inset -4px -4px 8px rgb(255 255 255 / .5); }
.neu-btn    { transition: box-shadow .15s ease, transform .15s ease; }
.neu-btn:active { box-shadow: inset 4px 4px 8px rgb(163 177 198 / .6), inset -4px -4px 8px rgb(255 255 255 / .5); }
.neu-accent { background: linear-gradient(145deg,#7b73ff,#5a51e8); color:#fff;
              box-shadow: 5px 5px 10px rgb(163 177 198 / .8), -5px -5px 10px rgb(255 255 255 / .7); }
.neu-accent:active { box-shadow: inset 3px 3px 6px rgb(40 30 140 / .45), inset -3px -3px 6px rgb(255 255 255 / .25); }
.neu-field::placeholder { color:#9aa3b5; }
.neu-field:focus { outline:none; box-shadow: inset 5px 5px 10px rgb(163 177 198 / .7), inset -5px -5px 10px rgb(255 255 255 / .6), 0 0 0 2px rgb(108 99 255 / .25); }
`

const STATS = [
  ['128', 'Posts'],
  ['2.4k', 'Followers'],
  ['312', 'Following'],
] as const

export function StyleNeumorphism() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(55)
  const [following, setFollowing] = useState(false)

  return (
    <div className="neu-root relative grid h-full w-full place-items-center overflow-hidden font-sans">
      <style>{css}</style>
      <div className="neu-raised w-[300px] rounded-[28px] p-5">
        {/* header */}
        <div className="flex items-center gap-3">
          <div className="neu-raised-sm grid h-14 w-14 place-items-center rounded-full">
            <div className="neu-inset grid h-11 w-11 place-items-center rounded-full text-sm font-bold text-[#6c63ff]">MS</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">Mika Sato</p>
            <p className="text-xs text-[#8b93a7]">Product Designer</p>
          </div>
          <button aria-label="Like" className="neu-raised-sm neu-btn grid h-9 w-9 place-items-center rounded-full text-[#ff6b8b]">
            <Heart size={15} fill="currentColor" />
          </button>
        </div>

        {/* stats: 凹んだ井戸の中に並べる */}
        <div className="neu-inset mt-4 grid grid-cols-3 rounded-2xl py-2.5 text-center">
          {STATS.map(([value, label]) => (
            <div key={label}>
              <p className="text-[15px] font-bold tabular-nums">{value}</p>
              <p className="text-[10px] text-[#8b93a7]">{label}</p>
            </div>
          ))}
        </div>

        {/* toggle */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[13px] font-medium">Notifications</span>
          <button
            role="switch"
            aria-checked={notify}
            aria-label="Notifications"
            onClick={() => setNotify((v) => !v)}
            className="neu-inset relative h-7 w-[52px] rounded-full"
          >
            <motion.span
              className={`absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full ${notify ? 'neu-accent' : 'neu-raised-sm'}`}
              animate={{ x: notify ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            />
          </button>
        </div>

        {/* slider */}
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-[13px] font-medium">
            <span>Volume</span>
            <span className="tabular-nums text-[#8b93a7]">{volume}%</span>
          </div>
          <div className="relative h-6">
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="neu-inset absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full p-[3px]">
              <div
                className="h-full rounded-full"
                style={{ width: `${volume}%`, background: 'linear-gradient(90deg,#a29bff,#6c63ff)' }}
              />
            </div>
            <div
              className="neu-raised-sm absolute top-0 grid h-6 w-6 place-items-center rounded-full"
              style={{ left: `calc(${volume}% - ${volume * 0.24}px)` }}
            >
              <span className="h-2 w-2 rounded-full bg-[#6c63ff]" />
            </div>
          </div>
        </div>

        {/* input */}
        <input
          placeholder="Write a status…"
          className="neu-inset neu-field mt-4 h-10 w-full rounded-2xl px-4 text-[13px] text-[#3d4468]"
        />

        {/* buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setFollowing((f) => !f)}
            className="neu-accent neu-btn h-10 rounded-2xl text-[13px] font-bold"
          >
            {following ? 'Following' : 'Follow'}
          </button>
          <button className="neu-raised-sm neu-btn flex h-10 items-center justify-center gap-1.5 rounded-2xl text-[13px] font-bold text-[#6c63ff]">
            <MessageCircle size={14} /> Message
          </button>
        </div>
      </div>
    </div>
  )
}
