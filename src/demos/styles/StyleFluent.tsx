import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Bell, ChevronRight, Home, Monitor, Palette, User, Volume2 } from 'lucide-react'

/**
 * Fluent Design(Windows 11 の設定アプリ風)
 * Mica: 壁紙の色をうっすら拾った不透明に近いウィンドウ背景(壁紙を強くぼかして白を重ねる)。
 * 左ナビは選択中の項目に 3px のアクセントバー、カードは #fbfbfb + 1px 枠 + 角丸 4〜8px。
 * トグルは Win11 の“枠線つまみ→塗り”スタイル、スライダーはつまみに内側の点。
 */
const ACCENT = '#005fb8'
const FONT = '"Segoe UI Variable Text", "Segoe UI", "Noto Sans JP", sans-serif'

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label="toggle"
      onClick={onChange}
      className="group relative h-5 w-10 rounded-full transition-colors"
      style={{ background: on ? ACCENT : 'rgba(0,0,0,0.04)', border: on ? `1px solid ${ACCENT}` : '1px solid rgba(0,0,0,0.6)' }}
    >
      <motion.span
        className="absolute top-1/2 -translate-y-1/2 rounded-full transition-[width,height] group-hover:h-[14px] group-hover:w-[14px] group-active:w-[17px]"
        style={{ height: 12, width: 12, background: on ? '#fff' : 'rgba(0,0,0,0.6)' }}
        animate={{ left: on ? 22 : 3 }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      />
    </button>
  )
}

function Row({ icon, title, sub, children }: { icon: ReactNode; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[4px] border border-black/[0.06] bg-[#fbfbfb]/90 px-3 py-2.5 transition-colors hover:bg-[#f6f6f6]">
      <span className="text-[#1a1a1a]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-[#1a1a1a]">{title}</p>
        {sub && <p className="text-[11px] text-[#5d5d5d]">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export function StyleFluent() {
  const [nav, setNav] = useState(1)
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(48)
  const [following, setFollowing] = useState(false)

  return (
    <div
      className="relative h-full w-full overflow-hidden p-4"
      style={{ fontFamily: FONT, background: 'radial-gradient(circle at 20% 30%, #3a7bd5 0%, transparent 45%), radial-gradient(circle at 80% 70%, #00c6ff 0%, transparent 45%), radial-gradient(circle at 60% 20%, #7f5af0 0%, transparent 40%), #0b2a5b' }}
    >
      {/* Win11 bloom */}
      <svg className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 opacity-60 blur-2xl" viewBox="0 0 100 100" aria-hidden>
        <path d="M50 20 C 65 35, 80 45, 85 60 C 70 55, 60 55, 50 70 C 40 55, 30 55, 15 60 C 20 45, 35 35, 50 20Z" fill="#4cc2ff" />
      </svg>

      {/* window with Mica */}
      <div className="relative mx-auto flex h-full max-w-[560px] flex-col overflow-hidden rounded-[8px] border border-white/40 shadow-[0_24px_48px_rgba(0,0,0,0.35)]" style={{ background: 'rgba(243,243,243,0.86)', backdropFilter: 'blur(60px) saturate(200%)' }}>
        {/* title bar */}
        <div className="flex h-8 shrink-0 items-center justify-between pl-3 text-[12px] text-[#1a1a1a]">
          <span className="flex items-center gap-2">
            <span className="grid h-4 w-4 place-items-center rounded-[3px] text-[9px] text-white" style={{ background: ACCENT }}>
              ⚙
            </span>
            Settings
          </span>
          <span className="flex h-full">
            {['—', '▢', '✕'].map((c, i) => (
              <span key={c} className={`grid h-full w-11 place-items-center text-[11px] ${i === 2 ? 'hover:bg-[#c42b1c] hover:text-white' : 'hover:bg-black/5'}`}>
                {c}
              </span>
            ))}
          </span>
        </div>
        <div className="flex min-h-0 flex-1">
          {/* nav pane */}
          <nav className="hidden w-[150px] shrink-0 flex-col gap-0.5 px-1.5 pt-1 min-[460px]:flex">
            <div className="mb-2 flex items-center gap-2 px-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#4cc2ff] to-[#005fb8] text-[12px] font-semibold text-white">MS</span>
              <div className="min-w-0 text-[11px] leading-tight text-[#1a1a1a]">
                <p className="font-semibold">Mika Sato</p>
                <p className="truncate text-[#5d5d5d]">mika@example.jp</p>
              </div>
            </div>
            {[
              [Home, 'Home'],
              [User, 'Accounts'],
              [Monitor, 'System'],
              [Palette, 'Personalization'],
            ].map(([Icon, label], i) => {
              const I = Icon as typeof Home
              return (
                <button
                  key={label as string}
                  onClick={() => setNav(i)}
                  className={`relative flex h-8 items-center gap-2.5 rounded-[4px] px-2.5 text-left text-[12px] text-[#1a1a1a] transition-colors ${nav === i ? 'bg-black/[0.06]' : 'hover:bg-black/[0.04]'}`}
                >
                  {nav === i && <motion.span layoutId="fluent-pill" className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full" style={{ background: ACCENT }} />}
                  <I size={14} />
                  {label as string}
                </button>
              )
            })}
          </nav>

          {/* content */}
          <div className="thin-scroll min-w-0 flex-1 overflow-y-auto px-4 pb-4">
            <p className="flex items-center gap-1 pb-3 pt-1 text-[22px] font-semibold text-[#1a1a1a]">
              Accounts <ChevronRight size={16} className="text-[#5d5d5d]" /> <span className="text-[16px] font-normal text-[#5d5d5d]">Profile</span>
            </p>
            <div className="mb-2 flex items-center gap-3 rounded-[6px] border border-black/[0.06] bg-[#fbfbfb]/90 p-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#4cc2ff] to-[#005fb8] text-[15px] font-semibold text-white">MS</span>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1a1a1a]">Mika Sato</p>
                <p className="text-[11px] text-[#5d5d5d]">Product Designer · 128 posts · 2.4k followers</p>
              </div>
            </div>
            <div className="space-y-1">
              <Row icon={<Bell size={16} />} title="Notifications" sub="Alerts from apps and system">
                <span className="mr-1 text-[12px] text-[#5d5d5d]">{notify ? 'On' : 'Off'}</span>
                <Toggle on={notify} onChange={() => setNotify((v) => !v)} />
              </Row>
              <Row icon={<Volume2 size={16} />} title="Volume">
                <div className="relative h-5 w-28">
                  <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
                  <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-black/40" />
                  <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ width: `${volume}%`, background: ACCENT }} />
                  <span
                    className="absolute top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,.1),0_1px_3px_rgba(0,0,0,.2)]"
                    style={{ left: `calc(${volume}% - ${volume * 0.2}px)` }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: ACCENT }} />
                  </span>
                </div>
              </Row>
            </div>
            <input
              placeholder="Display name"
              className="mt-2 h-8 w-full rounded-[4px] border border-black/10 border-b-black/40 bg-white/80 px-2.5 text-[12px] text-[#1a1a1a] outline-none focus:border-b-2 focus:border-b-[#005fb8] focus:bg-white"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="h-8 rounded-[4px] border border-black/10 bg-[#fbfbfb] px-4 text-[12px] text-[#1a1a1a] shadow-[0_1px_0_rgba(0,0,0,.12)] hover:bg-[#f6f6f6]">Message</button>
              <button
                onClick={() => setFollowing((f) => !f)}
                className="h-8 rounded-[4px] px-4 text-[12px] text-white shadow-[inset_0_-1px_0_rgba(0,0,0,.25)] transition hover:brightness-110"
                style={{ background: ACCENT }}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
