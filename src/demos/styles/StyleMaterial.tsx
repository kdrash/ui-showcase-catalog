import { useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, EllipsisVertical } from 'lucide-react'

/**
 * Material Design 3 (Material You)
 * M3 のカラーロール (primary / container / surface / outline) とトークン値をそのまま使用。
 * ・Elevated card: surface-container-low + elevation 1
 * ・Switch: 52×32 トラック、ON でハンドルが 16→24px に拡大しチェックアイコン
 * ・Filled text field: フローティングラベル + 下線 (active indicator)
 * ・ボタンは押した位置から広がる Ripple + hover の state layer (8%)
 */
const M = {
  primary: '#6750a4',
  onPrimary: '#ffffff',
  primaryContainer: '#eaddff',
  onPrimaryContainer: '#21005d',
  surface: '#fef7ff',
  surfaceContainerLow: '#f7f2fa',
  surfaceContainerHighest: '#e6e0e9',
  onSurface: '#1d1b20',
  onSurfaceVariant: '#49454f',
  outline: '#79747e',
}

const elevation1 = '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)'

type Ripple = { id: number; x: number; y: number; size: number }

/** クリック位置から円が広がる Material Ripple */
function RippleButton({
  children,
  className = '',
  style,
  onClick,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}) {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const addRipple = (e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const size = Math.hypot(r.width, r.height) * 2
    setRipples((prev) => [
      ...prev,
      { id: performance.now(), x: e.clientX - r.left - size / 2, y: e.clientY - r.top - size / 2, size },
    ])
  }
  return (
    <button onPointerDown={addRipple} onClick={onClick} className={`group relative overflow-hidden ${className}`} style={style}>
      {/* state layer (hover 8%) */}
      <span className="pointer-events-none absolute inset-0 bg-current opacity-0 transition-opacity group-hover:opacity-[0.08]" />
      {ripples.map((rp) => (
        <motion.span
          key={rp.id}
          className="pointer-events-none absolute rounded-full bg-current"
          style={{ left: rp.x, top: rp.y, width: rp.size, height: rp.size }}
          initial={{ scale: 0, opacity: 0.2 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }}
          onAnimationComplete={() => setRipples((prev) => prev.filter((p) => p.id !== rp.id))}
        />
      ))}
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </button>
  )
}

export function StyleMaterial() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(40)
  const [status, setStatus] = useState('')
  const [focused, setFocused] = useState(false)
  const [following, setFollowing] = useState(false)
  const floated = focused || status.length > 0

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden"
      style={{ background: M.surface, color: M.onSurface, fontFamily: 'Roboto, Inter, system-ui, sans-serif' }}
    >
      <div className="w-[300px] rounded-xl p-4" style={{ background: M.surfaceContainerLow, boxShadow: elevation1 }}>
        {/* header */}
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-full text-sm font-medium"
            style={{ background: M.primaryContainer, color: M.onPrimaryContainer }}
          >
            MS
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium leading-6">Mika Sato</p>
            <p className="text-sm leading-5" style={{ color: M.onSurfaceVariant }}>
              Product Designer
            </p>
          </div>
          <RippleButton className="grid h-10 w-10 place-items-center rounded-full" style={{ color: M.onSurfaceVariant }}>
            <EllipsisVertical size={20} />
          </RippleButton>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-3 text-center">
          {[
            ['128', 'Posts'],
            ['2.4k', 'Followers'],
            ['312', 'Following'],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-[22px] leading-7">{value}</p>
              <p className="text-xs font-medium tracking-[0.5px]" style={{ color: M.onSurfaceVariant }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* M3 switch */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm">Notifications</span>
          <button
            role="switch"
            aria-checked={notify}
            aria-label="Notifications"
            onClick={() => setNotify((v) => !v)}
            className="relative h-8 w-[52px] rounded-full"
            style={{
              background: notify ? M.primary : M.surfaceContainerHighest,
              border: `2px solid ${notify ? M.primary : M.outline}`,
              transition: 'background .2s, border-color .2s',
            }}
          >
            <motion.span
              className="absolute top-1/2 grid place-items-center rounded-full"
              style={{ y: '-50%' }}
              initial={false}
              animate={{
                x: notify ? 22 : 6,
                width: notify ? 24 : 16,
                height: notify ? 24 : 16,
                backgroundColor: notify ? M.onPrimary : M.outline,
              }}
              whileTap={{ scale: 1.15 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            >
              {notify && <Check size={16} strokeWidth={2.5} color={M.onPrimaryContainer} />}
            </motion.span>
          </button>
        </div>

        {/* M3 slider */}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-sm">
            <span>Volume</span>
            <span style={{ color: M.onSurfaceVariant }}>{volume}</span>
          </div>
          <div className="relative h-5">
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ background: M.surfaceContainerHighest }} />
            <div
              className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
              style={{ width: `${volume}%`, background: M.primary }}
            />
            <div
              className="absolute top-0 h-5 w-5 rounded-full transition-shadow peer-hover:shadow-[0_0_0_10px_rgba(103,80,164,0.08)] peer-active:shadow-[0_0_0_10px_rgba(103,80,164,0.14)]"
              style={{ left: `calc(${volume}% - ${volume * 0.2}px)`, background: M.primary }}
            />
          </div>
        </div>

        {/* M3 filled text field */}
        <div className="relative mt-3 h-14 rounded-t" style={{ background: M.surfaceContainerHighest }}>
          <motion.label
            htmlFor="m3-status"
            className="pointer-events-none absolute left-4 top-4 origin-left text-base"
            initial={false}
            animate={{ y: floated ? -9 : 0, scale: floated ? 0.75 : 1, color: focused ? M.primary : M.onSurfaceVariant }}
            transition={{ duration: 0.15 }}
          >
            Status
          </motion.label>
          <input
            id="m3-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="h-full w-full bg-transparent px-4 pb-1.5 pt-5 text-base outline-none"
            style={{ color: M.onSurface, caretColor: M.primary }}
          />
          <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: M.onSurfaceVariant }} />
          <motion.span
            className="absolute inset-x-0 bottom-0 h-[2px]"
            style={{ background: M.primary }}
            initial={false}
            animate={{ scaleX: focused ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* buttons: Filled + Outlined */}
        <div className="mt-4 flex justify-end gap-2">
          <RippleButton
            className="h-10 rounded-full px-6 text-sm font-medium tracking-[0.1px]"
            style={{ border: `1px solid ${M.outline}`, color: M.primary }}
          >
            Message
          </RippleButton>
          <RippleButton
            onClick={() => setFollowing((f) => !f)}
            className="h-10 rounded-full px-6 text-sm font-medium tracking-[0.1px] transition-shadow hover:shadow-[0px_1px_2px_rgba(0,0,0,0.3),0px_1px_3px_1px_rgba(0,0,0,0.15)]"
            style={{ background: M.primary, color: M.onPrimary }}
          >
            {following && <Check size={16} />}
            {following ? 'Following' : 'Follow'}
          </RippleButton>
        </div>
      </div>
    </div>
  )
}
