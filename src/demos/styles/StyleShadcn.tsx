import { useState, type CSSProperties } from 'react'
import { Bell, Check, Moon, Sun, MoreHorizontal } from 'lucide-react'

/**
 * shadcn/ui 風
 * CSS 変数(--background / --foreground / --muted / --border / --primary ...)でテーマを定義し、
 * zinc 系のニュートラルカラー・1px ボーダー・shadow-sm・角丸 0.5〜0.75rem・focus-visible リングで組む。
 * 右上のボタンでライト/ダークを切り替えると、変数だけが差し替わる。
 */
const LIGHT = {
  '--background': '#ffffff',
  '--foreground': '#09090b',
  '--card': '#ffffff',
  '--muted': '#f4f4f5',
  '--muted-foreground': '#71717a',
  '--border': '#e4e4e7',
  '--primary': '#18181b',
  '--primary-foreground': '#fafafa',
  '--ring': '#a1a1aa',
  '--page': '#fafafa',
} as CSSProperties

const DARK = {
  '--background': '#09090b',
  '--foreground': '#fafafa',
  '--card': '#09090b',
  '--muted': '#27272a',
  '--muted-foreground': '#a1a1aa',
  '--border': '#27272a',
  '--primary': '#fafafa',
  '--primary-foreground': '#18181b',
  '--ring': '#52525b',
  '--page': '#000000',
} as CSSProperties

const STATS = [
  ['128', 'Posts'],
  ['2.4k', 'Followers'],
  ['312', 'Following'],
] as const

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]'

export function StyleShadcn() {
  const [dark, setDark] = useState(false)
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(60)
  const [following, setFollowing] = useState(false)

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden text-[var(--foreground)] transition-colors duration-300"
      style={{ ...(dark ? DARK : LIGHT), background: 'var(--page)', fontFamily: 'Inter, ui-sans-serif, system-ui' }}
    >
      <button
        onClick={() => setDark((d) => !d)}
        aria-label="Toggle theme"
        className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--muted)] ${focusRing}`}
      >
        {dark ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      <div className="w-[310px] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-colors duration-300">
        {/* CardHeader */}
        <div className="flex items-center gap-3 p-5 pb-3">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--muted)] text-sm font-medium">
            MS
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold leading-none tracking-tight">Mika Sato</p>
              <span className="inline-flex items-center rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                Pro
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">Product Designer · Tokyo</p>
          </div>
          <button
            aria-label="More"
            className={`grid h-8 w-8 place-items-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] ${focusRing}`}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* stats */}
        <div className="mx-5 grid grid-cols-3 divide-x divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {STATS.map(([v, l]) => (
            <div key={l} className="py-2 text-center">
              <p className="text-sm font-semibold tabular-nums">{v}</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">{l}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4 p-5 pt-4">
          {/* Switch */}
          <div className="flex items-center justify-between">
            <label htmlFor="sc-notify" className="flex items-center gap-2 text-sm font-medium leading-none">
              <Bell size={14} className="text-[var(--muted-foreground)]" /> Notifications
            </label>
            <button
              id="sc-notify"
              role="switch"
              aria-checked={notify}
              onClick={() => setNotify((v) => !v)}
              className={`relative h-5 w-9 shrink-0 rounded-full border-2 border-transparent shadow-sm transition-colors ${focusRing}`}
              style={{ background: notify ? 'var(--primary)' : 'var(--border)' }}
            >
              <span
                className="block h-4 w-4 rounded-full bg-[var(--background)] shadow-lg ring-0 transition-transform"
                style={{ transform: `translateX(${notify ? 16 : 0}px)` }}
              />
            </button>
          </div>

          {/* Slider */}
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium">Volume</span>
              <span className="tabular-nums text-[var(--muted-foreground)]">{volume}%</span>
            </div>
            <div className="relative flex h-4 items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div className="absolute inset-y-0 left-0 bg-[var(--primary)]" style={{ width: `${volume}%` }} />
              </div>
              <div
                className="absolute h-4 w-4 rounded-full border border-[var(--primary)] bg-[var(--background)] shadow transition-shadow peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)]"
                style={{ left: `calc(${volume}% - ${volume * 0.16}px)` }}
              />
            </div>
          </div>

          {/* Input */}
          <input
            placeholder="Set a status…"
            className={`h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm shadow-sm transition-colors placeholder:text-[var(--muted-foreground)] ${focusRing}`}
          />

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFollowing((f) => !f)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] shadow transition-opacity hover:opacity-90 ${focusRing}`}
            >
              {following && <Check size={14} />}
              {following ? 'Following' : 'Follow'}
            </button>
            <button
              className={`inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-medium shadow-sm transition-colors hover:bg-[var(--muted)] ${focusRing}`}
            >
              Message
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
