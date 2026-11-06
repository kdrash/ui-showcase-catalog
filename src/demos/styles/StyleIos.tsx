import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { BellRing, ChevronLeft, ChevronRight, Moon, Volume2, Wifi } from 'lucide-react'

/**
 * iOS 風(設定アプリ)
 * #f2f2f7 のグループ背景に、角丸 10px の白い「インセットグループ」リスト。
 * セル左に色付き角丸アイコン、区切り線はアイコンの右から始まる。スイッチは 51×31 の緑 #34c759。
 * 上部は Large Title + すりガラスのナビバー、ボタンは #007aff のカプセル。
 */
const SF = '-apple-system, "SF Pro Text", "Helvetica Neue", Inter, "Noto Sans JP", sans-serif'

function IosSwitch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300"
      style={{ background: on ? '#34c759' : '#e9e9eb' }}
    >
      <motion.span
        className="absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white"
        style={{ boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 3px 1px rgba(0,0,0,0.06)' }}
        animate={{ x: on ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
      />
    </button>
  )
}

function Cell({ icon, color, label, children, last }: { icon: ReactNode; color: string; label: string; children?: ReactNode; last?: boolean }) {
  return (
    <div className="flex min-h-[44px] items-center gap-3 pl-3.5">
      <span className="grid h-[29px] w-[29px] shrink-0 place-items-center rounded-[7px] text-white" style={{ background: color }}>
        {icon}
      </span>
      <div className={`flex min-h-[44px] flex-1 items-center justify-between pr-3.5 ${last ? '' : 'border-b-[0.5px] border-[#c6c6c8]'}`}>
        <span className="text-[16px] text-black">{label}</span>
        {children}
      </div>
    </div>
  )
}

export function StyleIos() {
  const [notify, setNotify] = useState(true)
  const [dnd, setDnd] = useState(false)
  const [volume, setVolume] = useState(55)
  const [following, setFollowing] = useState(false)

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e5e5ea]" style={{ fontFamily: SF, letterSpacing: '-0.01em' }}>
      <div className="thin-scroll relative mx-auto h-full max-w-[400px] overflow-y-auto bg-[#f2f2f7] pb-6">
        {/* nav bar */}
        <div className="sticky top-0 z-10 flex h-11 items-center justify-between border-b-[0.5px] border-black/10 bg-[#f2f2f7]/80 px-2 backdrop-blur-xl">
          <span className="flex items-center text-[17px] text-[#007aff]">
            <ChevronLeft size={22} strokeWidth={2.4} /> Settings
          </span>
          <span className="text-[17px] text-[#007aff]">Edit</span>
        </div>
        <h1 className="px-4 pb-2 pt-1 text-[32px] font-bold tracking-[-0.02em] text-black">Profile</h1>

        {/* profile group */}
        <div className="mx-4 flex items-center gap-3 rounded-[10px] bg-white p-3">
          <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-gradient-to-b from-[#a5b4fc] to-[#6366f1] text-xl font-semibold text-white">
            MS
          </div>
          <div className="flex-1">
            <p className="text-[20px] font-semibold text-black">Mika Sato</p>
            <p className="text-[13px] text-[#8e8e93]">Product Designer · 128 posts</p>
          </div>
          <ChevronRight size={18} className="text-[#c4c4c7]" />
        </div>

        <p className="mt-5 px-8 pb-1.5 text-[13px] uppercase text-[#6d6d72]">General</p>
        <div className="mx-4 overflow-hidden rounded-[10px] bg-white">
          <Cell icon={<BellRing size={16} />} color="#ff3b30" label="Notifications">
            <IosSwitch on={notify} onChange={() => setNotify((v) => !v)} label="Notifications" />
          </Cell>
          <Cell icon={<Moon size={16} />} color="#5856d6" label="Focus">
            <IosSwitch on={dnd} onChange={() => setDnd((v) => !v)} label="Focus" />
          </Cell>
          <Cell icon={<Wifi size={16} />} color="#007aff" label="Wi-Fi" last>
            <span className="flex items-center gap-1 text-[16px] text-[#8e8e93]">
              Home <ChevronRight size={16} className="text-[#c4c4c7]" />
            </span>
          </Cell>
        </div>

        <p className="mt-5 px-8 pb-1.5 text-[13px] uppercase text-[#6d6d72]">Sounds</p>
        <div className="mx-4 flex items-center gap-3 rounded-[10px] bg-white px-3.5 py-3">
          <Volume2 size={16} className="text-[#8e8e93]" />
          <div className="relative h-7 flex-1">
            <input
              type="range"
              value={volume}
              onChange={(e) => setVolume(+e.target.value)}
              aria-label="Volume"
              className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
            />
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#e5e5ea]" />
            <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#007aff]" style={{ width: `${volume}%` }} />
            <div
              className="absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-white"
              style={{ left: `calc(${volume}% - ${volume * 0.28}px)`, boxShadow: '0 0.5px 4px rgba(0,0,0,0.12), 0 6px 13px rgba(0,0,0,0.12)' }}
            />
          </div>
        </div>
        <p className="px-8 pt-1.5 text-[13px] text-[#6d6d72]">着信音と通知の音量を調整します。</p>

        <div className="mx-4 mt-5 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setFollowing((f) => !f)}
            className="h-[50px] rounded-[14px] bg-[#007aff] text-[17px] font-semibold text-white transition active:opacity-70"
          >
            {following ? 'Following' : 'Follow'}
          </button>
          <button className="h-[50px] rounded-[14px] bg-[#007aff]/10 text-[17px] font-semibold text-[#007aff] transition active:opacity-70">
            Message
          </button>
        </div>
      </div>
    </div>
  )
}
