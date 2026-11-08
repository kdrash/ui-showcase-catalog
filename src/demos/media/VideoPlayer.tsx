import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react'
import {
  Bell,
  BellRing,
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  ListVideo,
  Maximize,
  Maximize2,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RectangleHorizontal,
  Repeat,
  RotateCcw,
  Search,
  Settings,
  Settings2,
  Share2,
  SkipForward,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Bookmark,
  Video,
  Volume1,
  Volume2,
  VolumeX,
  X,
  ArrowDownWideNarrow,
  Type,
} from 'lucide-react'
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { FILMS, chapterAt, chapterEnd, clamp, drawFrame, fmtTime, type Film } from './VideoPlayer.film'

/**
 * 動画配信サービスの再生ページ(YouTube風)。サービス名「Utsuroi」・チャンネル・動画・コメントはすべて架空のオリジナル。
 * - 「動画」は動画ファイルではなく、currentTime を受け取って 1 フレームを描く Canvas 2D の純粋関数(VideoPlayer.film.ts)。
 *   海の夜明け・森・雨の街・オーロラの夜などのシーンをシード付き乱数の地形/粒子から描き、章の境目はオフスクリーンでクロスフェードする。
 *   だからシークすると本当に絵が変わり、シークバーのホバープレビューも同じ関数でその時刻のフレームを小さな canvas に描いている
 * - 再生は requestAnimationFrame で時刻を進めるだけ。読み込みは「先読み範囲」をタイマーで伸ばす擬似ネットワークで、
 *   範囲外へシークすると先読みがやり直しになりスピナーが出る。画質を下げると canvas の内部解像度が本当に下がり、先読みが速くなる
 * - シークバーはチャプターごとに区切られ、ホバー中の区間だけ太くなる。先読み範囲・ホバー位置・再生位置を重ねて描く
 * - 字幕は時刻付きキューから表示し、文字サイズ/文字色/背景を設定メニューで変えられる。設定メニューは階層ページを横スライドで切り替える
 * - 左右のダブルクリックで ±10 秒(連打で加算、波紋つき)、中央のダブルクリックで全画面。シングルクリックは少し待ってから再生/一時停止
 * - 操作がないと 2.6 秒でコントロールとカーソルが隠れる。キー操作(Space/k, j/l, ←→, ↑↓, m, c, f, t, i, 0-9)はプレーヤーにフォーカスがあるときだけ
 * - シアターモードは CSS グリッドの area 指定だけを切り替え、プレーヤーの DOM を作り直さない(canvas も状態もそのまま)。
 *   ミニプレーヤーは同じ要素を position: absolute に切り替え、motion の layout アニメーションで右下へ縮む
 * - 全画面はデモ内のプレーヤー要素に Fullscreen API。アンビエントモードは映像を小さな canvas に縮小コピーして大きくぼかし、背後に光を漏らす
 * - 最後まで再生すると「次の動画」のカウントダウン(SVG リング)。自動再生オフ/キャンセルで止まる
 * - useReducedMotion 時はレイアウトアニメーションと波紋をやめ、短いフェードだけにする
 */

const ACCENT = '#ff5b3a'
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
type Quality = 'auto' | '1080' | '720' | '480' | '360' | '144'
const QUALITIES: { id: Quality; label: string; px: number; hd?: boolean }[] = [
  { id: '1080', label: '1080p', px: 1920, hd: true },
  { id: '720', label: '720p', px: 1280, hd: true },
  { id: '480', label: '480p', px: 854 },
  { id: '360', label: '360p', px: 640 },
  { id: '144', label: '144p', px: 256 },
  { id: 'auto', label: '自動', px: 0 },
]
const BUF_RATE: Record<Quality, number> = { auto: 1, '1080': 0.6, '720': 0.9, '480': 1.5, '360': 2.4, '144': 4 }
const CC_SIZES = [
  { v: 0.8, label: '小' },
  { v: 1, label: '中' },
  { v: 1.35, label: '大' },
]
const CC_COLORS = [
  { c: '#ffffff', label: '白' },
  { c: '#ffe066', label: '黄' },
  { c: '#86ecff', label: '水色' },
  { c: '#b6ff9e', label: '黄緑' },
]
type CcBg = 'none' | 'semi' | 'solid'
const CC_BGS: { id: CcBg; label: string }[] = [
  { id: 'none', label: 'なし' },
  { id: 'semi', label: '半透明' },
  { id: 'solid', label: '黒' },
]
type MenuPage = 'main' | 'speed' | 'quality' | 'captions' | 'capstyle'
type Flash = { key: number; kind: 'play' | 'pause' }
type Ripple = { key: number; side: -1 | 1; sec: number }

const HEADER = 52

/* ───────────── 小物 ───────────── */

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
      <defs>
        <linearGradient id="tms-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb36b" />
          <stop offset="1" stopColor={ACCENT} />
        </linearGradient>
      </defs>
      <rect x="2" y="5" width="28" height="22" rx="7" fill="url(#tms-g)" />
      <path d="M16 10c2.6 3 4 5 4 7.2A4 4 0 0 1 12 17.2c0-1.4.7-2.6 1.7-3.6.2 1.3.9 2.2 1.8 2.4-.4-2 .1-4 .5-6Z" fill="#fff" />
    </svg>
  )
}

function Avatar({ hue, name, size = 36 }: { hue: number; name: string; size?: number }) {
  const id = `av-${hue}-${size}-${name.length}`
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="shrink-0 rounded-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 80% 68%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 40) % 360} 70% 42%)`} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill={`url(#${id})`} />
      <circle cx="20" cy="16" r="6.5" fill="rgba(255,255,255,0.85)" />
      <path d="M8 34c2-6 7-9 12-9s10 3 12 9" fill="rgba(255,255,255,0.85)" />
    </svg>
  )
}

/** 再生前に表示するポスターの時刻(秒) */
const POSTER_T = 3

const FrameThumb = memo(function FrameThumb({ film, t, className }: { film: Film; t: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (c && ctx) drawFrame(ctx, c.width, c.height, film, t)
  }, [film, t])
  return <canvas ref={ref} width={320} height={180} className={className} aria-hidden />
})

function Tip({ children, align = 'center' }: { children: ReactNode; align?: 'center' | 'left' | 'right' }) {
  const pos = align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'left' ? 'left-0' : 'right-0'
  return (
    <span
      className={`pointer-events-none absolute bottom-full mb-2.5 whitespace-nowrap rounded-md bg-black/85 px-2 py-1 text-[11.5px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/btn:opacity-100 group-focus-visible/btn:opacity-100 ${pos}`}
    >
      {children}
    </span>
  )
}

function IconBtn({
  label,
  tip,
  onClick,
  children,
  align,
  pressed,
  expanded,
  size = 'md',
}: {
  label: string
  tip?: string
  onClick: () => void
  children: ReactNode
  align?: 'center' | 'left' | 'right'
  pressed?: boolean
  expanded?: boolean
  size?: 'md' | 'sm'
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      onClick={onClick}
      className={`group/btn relative grid shrink-0 place-items-center rounded-full text-white/95 outline-none transition hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/80 active:scale-90 ${size === 'md' ? 'h-9 w-9' : 'h-8 w-8'}`}
    >
      {children}
      <Tip align={align}>{tip ?? label}</Tip>
    </button>
  )
}

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[18px] w-8 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/80 ${on ? '' : 'bg-white/25'}`}
      style={on ? { background: ACCENT } : undefined}
    >
      <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-[left] duration-200 ${on ? 'left-[16px]' : 'left-[2px]'}`} />
    </button>
  )
}

/* ───────────── シークバー ───────────── */

function Scrubber({
  film,
  time,
  buf,
  onSeek,
  onScrub,
  onHover,
  small,
}: {
  film: Film
  time: number
  buf: { s: number; e: number }
  onSeek: (t: number) => void
  onScrub: (v: boolean) => void
  onHover: (v: boolean) => void
  small: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const prevRef = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<{ t: number; x: number; w: number } | null>(null)
  const [drag, setDrag] = useState(false)
  const dur = film.duration

  const at = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    const x = clamp(clientX - r.left, 0, r.width)
    return { t: (x / r.width) * dur, x, w: r.width }
  }

  useLayoutEffect(() => {
    if (!hover) return
    const c = prevRef.current
    const ctx = c?.getContext('2d')
    if (c && ctx) drawFrame(ctx, c.width, c.height, film, hover.t)
  }, [hover, film])

  const hovering = hover !== null
  useEffect(() => onHover(hovering), [hovering, onHover])

  const hoverCh = hover ? chapterAt(film, hover.t) : -1
  const pW = small ? 128 : 168
  const pH = (pW * 9) / 16

  return (
    <div className="relative px-3">
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute bottom-full z-10 mb-3 flex flex-col items-center"
            style={{ left: 12 + clamp(hover.x, pW / 2, hover.w - pW / 2), x: '-50%' }}
          >
            <canvas
              ref={prevRef}
              width={pW * 2}
              height={pH * 2}
              style={{ width: pW, height: pH }}
              className="rounded-lg bg-black shadow-[0_6px_24px_rgba(0,0,0,0.6)] ring-2 ring-white/90"
            />
            <span className="mt-1.5 max-w-[200px] truncate text-[11.5px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
              {film.chapters[hoverCh].title}
            </span>
            <span className="text-[12px] font-medium tabular-nums text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{fmtTime(hover.t)}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="シークバー"
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${fmtTime(time)} / ${fmtTime(dur)}`}
        className="group/scrub relative flex h-4 cursor-pointer touch-none items-center rounded outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          const h = at(e.clientX)
          setDrag(true)
          onScrub(true)
          setHover(h)
          onSeek(h.t)
        }}
        onPointerMove={(e) => {
          const h = at(e.clientX)
          setHover(h)
          if (drag) onSeek(h.t)
        }}
        onPointerUp={(e) => {
          if (!drag) return
          e.currentTarget.releasePointerCapture(e.pointerId)
          setDrag(false)
          onScrub(false)
          if (e.pointerType !== 'mouse') setHover(null)
        }}
        onPointerCancel={() => {
          setDrag(false)
          onScrub(false)
          setHover(null)
        }}
        onPointerLeave={() => {
          if (!drag) setHover(null)
        }}
      >
        {film.chapters.map((ch, i) => {
          const s = ch.start
          const e = chapterEnd(film, i)
          const len = e - s
          const played = clamp((time - s) / len, 0, 1)
          const bl = clamp((buf.s - s) / len, 0, 1)
          const br = clamp((buf.e - s) / len, 0, 1)
          const hv = hover ? clamp((hover.t - s) / len, 0, 1) : 0
          const active = hoverCh === i
          return (
            <div key={i} className="flex h-full items-center px-[1.5px]" style={{ width: `${(len / dur) * 100}%` }}>
              <div
                className={`relative w-full overflow-hidden rounded-full bg-white/22 transition-[height] duration-150 ${active ? 'h-[6px]' : 'h-[3px] group-hover/scrub:h-[4px]'}`}
              >
                <div className="absolute inset-y-0 bg-white/30" style={{ left: `${bl * 100}%`, width: `${Math.max(0, br - bl) * 100}%` }} />
                <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: `${hv * 100}%` }} />
                <div className="absolute inset-y-0 left-0" style={{ width: `${played * 100}%`, background: ACCENT }} />
              </div>
            </div>
          )
        })}
        <span
          className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow transition-transform duration-150 ${drag ? 'scale-110' : 'scale-0 group-hover/scrub:scale-100 group-focus-visible/scrub:scale-100'}`}
          style={{ left: `${(time / dur) * 100}%`, background: ACCENT }}
        />
      </div>
    </div>
  )
}

/* ───────────── 音量 ───────────── */

function VolumeControl({
  volume,
  muted,
  onMute,
  onChange,
  compact,
}: {
  volume: number
  muted: boolean
  onMute: () => void
  onChange: (v: number) => void
  compact: boolean
}) {
  const [open, setOpen] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const v = muted ? 0 : volume
  const Icon = v === 0 ? VolumeX : v < 0.5 ? Volume1 : Volume2
  const setFrom = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect()
    onChange(clamp((clientX - r.left) / r.width, 0, 1))
  }
  return (
    <div
      className="flex items-center"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <IconBtn label={muted || v === 0 ? 'ミュート解除' : 'ミュート'} tip={muted || v === 0 ? 'ミュート解除 (m)' : 'ミュート (m)'} onClick={onMute} align="left">
        <Icon className="h-[21px] w-[21px]" />
      </IconBtn>
      {!compact && (
        <div className={`overflow-hidden transition-[width,opacity] duration-200 ${open ? 'w-[72px] opacity-100' : 'w-0 opacity-0'}`}>
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="音量"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(v * 100)}
            className="relative mx-1.5 flex h-8 w-[60px] cursor-pointer touch-none items-center rounded outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              setFrom(e.clientX)
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) setFrom(e.clientX)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(clamp(v - 0.05, 0, 1))
              else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(clamp(v + 0.05, 0, 1))
              else return
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <div className="h-[3px] w-full rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${v * 100}%` }} />
            </div>
            <span className="absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow" style={{ left: `${v * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────── 設定メニュー ───────────── */

type CcStyle = { size: number; color: string; bg: CcBg }

function MenuRow({
  icon,
  label,
  value,
  onClick,
  right,
}: {
  icon?: ReactNode
  label: string
  value?: string
  onClick?: () => void
  right?: ReactNode
}) {
  const inner = (
    <>
      {icon && <span className="grid h-5 w-5 shrink-0 place-items-center text-white/85">{icon}</span>}
      <span className="flex-1 text-left">{label}</span>
      {value && <span className="truncate text-white/60">{value}</span>}
      {right ?? (onClick && <ChevronRight className="h-4 w-4 shrink-0 text-white/60" />)}
    </>
  )
  if (!onClick) return <div className="flex min-h-10 items-center gap-3 px-3.5 py-1.5">{inner}</div>
  return (
    <button data-mi type="button" onClick={onClick} className="flex min-h-10 w-full items-center gap-3 px-3.5 py-1.5 outline-none hover:bg-white/8 focus-visible:bg-white/12">
      {inner}
    </button>
  )
}

function Seg<T extends string | number>({ items, value, onChange, label }: { items: { v: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-white/8 p-0.5">
      {items.map((it) => (
        <button
          key={String(it.v)}
          data-mi
          type="button"
          role="radio"
          aria-checked={value === it.v}
          onClick={() => onChange(it.v)}
          className={`flex-1 rounded-md px-2 py-1 text-[12px] outline-none transition focus-visible:ring-2 focus-visible:ring-white/70 ${value === it.v ? 'bg-white text-black' : 'text-white/80 hover:bg-white/10'}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

function SettingsMenu({
  page,
  setPage,
  maxH,
  speed,
  setSpeed,
  quality,
  setQuality,
  autoRes,
  ccOn,
  setCcOn,
  cc,
  setCc,
  ambient,
  setAmbient,
  loop,
  setLoop,
  reduce,
}: {
  page: MenuPage
  setPage: (p: MenuPage) => void
  maxH: number
  speed: number
  setSpeed: (v: number) => void
  quality: Quality
  setQuality: (q: Quality) => void
  autoRes: string
  ccOn: boolean
  setCcOn: (v: boolean) => void
  cc: CcStyle
  setCc: (v: CcStyle) => void
  ambient: boolean
  setAmbient: (v: boolean) => void
  loop: boolean
  setLoop: (v: boolean) => void
  reduce: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dir = page === 'main' ? -1 : 1
  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>(`[data-page="${page}"] [data-mi]`)
    first?.focus({ preventScroll: true })
  }, [page])
  const back = (to: MenuPage, title: string) => (
    <button
      data-mi
      type="button"
      onClick={() => setPage(to)}
      className="flex h-11 w-full items-center gap-2 border-b border-white/10 px-2.5 text-[13.5px] font-semibold outline-none hover:bg-white/8 focus-visible:bg-white/12"
    >
      <ChevronLeft className="h-4 w-4" />
      {title}
    </button>
  )
  const opt = (sel: boolean, label: ReactNode, onClick: () => void, key: string) => (
    <button
      key={key}
      data-mi
      type="button"
      role="menuitemradio"
      aria-checked={sel}
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2.5 px-3.5 text-left outline-none hover:bg-white/8 focus-visible:bg-white/12"
    >
      <span className="w-4">{sel && <Check className="h-4 w-4" />}</span>
      {label}
    </button>
  )
  const qLabel = QUALITIES.find((q) => q.id === quality)!
  let body: ReactNode
  if (page === 'main')
    body = (
      <div className="py-1.5">
        <MenuRow icon={<Sparkles className="h-4 w-4" />} label="アンビエントモード" right={<Switch on={ambient} onChange={setAmbient} label="アンビエントモード" />} />
        <MenuRow icon={<Repeat className="h-4 w-4" />} label="ループ再生" right={<Switch on={loop} onChange={setLoop} label="ループ再生" />} />
        <MenuRow icon={<Captions className="h-4 w-4" />} label="字幕" value={ccOn ? '日本語' : 'オフ'} onClick={() => setPage('captions')} />
        <MenuRow icon={<Gauge className="h-4 w-4" />} label="再生速度" value={speed === 1 ? '標準' : `${speed}`} onClick={() => setPage('speed')} />
        <MenuRow
          icon={<Settings2 className="h-4 w-4" />}
          label="画質"
          value={quality === 'auto' ? `自動 (${autoRes})` : qLabel.label}
          onClick={() => setPage('quality')}
        />
      </div>
    )
  else if (page === 'speed')
    body = (
      <div>
        {back('main', '再生速度')}
        <div className="py-1">{SPEEDS.map((s) => opt(s === speed, s === 1 ? '標準' : `${s}`, () => setSpeed(s), String(s)))}</div>
      </div>
    )
  else if (page === 'quality')
    body = (
      <div>
        {back('main', '画質')}
        <div className="py-1">
          {QUALITIES.map((q) =>
            opt(
              q.id === quality,
              <span className="flex items-center gap-1.5">
                {q.id === 'auto' ? `自動 (${autoRes})` : q.label}
                {q.hd && <span className="rounded-[3px] px-1 text-[9px] font-bold leading-[14px]" style={{ background: ACCENT }}>HD</span>}
              </span>,
              () => setQuality(q.id),
              q.id,
            ),
          )}
        </div>
      </div>
    )
  else if (page === 'captions')
    body = (
      <div>
        {back('main', '字幕')}
        <div className="py-1">
          {opt(!ccOn, 'オフ', () => setCcOn(false), 'off')}
          {opt(ccOn, '日本語', () => setCcOn(true), 'ja')}
        </div>
        <div className="border-t border-white/10 py-1">
          <MenuRow icon={<Type className="h-4 w-4" />} label="字幕のスタイル" onClick={() => setPage('capstyle')} />
        </div>
      </div>
    )
  else
    body = (
      <div>
        {back('captions', '字幕のスタイル')}
        <div className="space-y-3 px-3.5 py-3">
          <div className="space-y-1.5">
            <p className="text-[11.5px] text-white/60">文字サイズ</p>
            <Seg label="文字サイズ" items={CC_SIZES.map((s) => ({ v: s.v, label: s.label }))} value={cc.size} onChange={(v) => setCc({ ...cc, size: v })} />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11.5px] text-white/60">文字色</p>
            <div role="radiogroup" aria-label="文字色" className="flex gap-2">
              {CC_COLORS.map((c) => (
                <button
                  key={c.c}
                  data-mi
                  type="button"
                  role="radio"
                  aria-checked={cc.color === c.c}
                  aria-label={c.label}
                  onClick={() => setCc({ ...cc, color: c.c })}
                  className={`h-7 w-7 rounded-full outline-none ring-offset-2 ring-offset-[#1d1d20] transition focus-visible:ring-2 focus-visible:ring-white/80 ${cc.color === c.c ? 'ring-2 ring-white' : ''}`}
                  style={{ background: c.c }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11.5px] text-white/60">背景</p>
            <Seg label="背景" items={CC_BGS.map((b) => ({ v: b.id, label: b.label }))} value={cc.bg} onChange={(v) => setCc({ ...cc, bg: v })} />
          </div>
          <div className="grid h-12 place-items-center rounded-lg bg-[linear-gradient(135deg,#3b5f8f,#e79c7c)]">
            <span className="rounded px-1.5 py-0.5 text-[13px]" style={captionStyle(cc, 1)}>
              字幕のプレビュー
            </span>
          </div>
        </div>
      </div>
    )
  return (
    <motion.div
      ref={ref}
      role="menu"
      aria-label="設定"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 4 }}
      transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ maxHeight: maxH, transformOrigin: 'bottom right' }}
      className="absolute bottom-[60px] right-3 z-40 w-[260px] overflow-y-auto overflow-x-hidden rounded-xl bg-[#1d1d20]/92 text-[13px] text-white shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-xl [scrollbar-width:thin]"
      onPointerUp={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
        const items = [...(ref.current?.querySelectorAll<HTMLElement>(`[data-page="${page}"] [data-mi]`) ?? [])]
        const i = items.indexOf(document.activeElement as HTMLElement)
        const n = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]
        n?.focus()
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={page}
          data-page={page}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {body}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

function captionStyle(cc: CcStyle, scale: number): CSSProperties {
  return {
    color: cc.color,
    fontSize: `${scale}em`,
    background: cc.bg === 'solid' ? 'rgba(0,0,0,0.92)' : cc.bg === 'semi' ? 'rgba(8,8,10,0.62)' : 'transparent',
    textShadow: cc.bg === 'none' ? '0 0 4px #000, 0 1px 2px #000, 0 0 1px #000' : 'none',
  }
}

/* ───────────── ページ部品 ───────────── */

const InfoSection = memo(function InfoSection({ film, onJump, onToast }: { film: Film; onJump: (t: number) => void; onToast: (s: string) => void }) {
  const [sub, setSub] = useState(false)
  const [like, setLike] = useState<0 | 1 | -1>(0)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)
  return (
    <section className="min-w-0 pt-3">
      <h1 className="text-[16px] font-bold leading-snug tracking-tight @3xl:text-[18px]">{film.title}</h1>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar hue={film.hue} name={film.channel} size={38} />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-[14px] font-semibold">
              {film.channel}
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-white/60" aria-label="確認済み">
                <circle cx="8" cy="8" r="7" fill="currentColor" />
                <path d="m5 8.2 2 2 4-4.2" stroke="#0f0f11" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
            <p className="truncate text-[11.5px] text-white/55">{film.subs}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSub((v) => !v)
            onToast(sub ? '登録を解除しました' : `${film.channel} を登録しました`)
          }}
          className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 ${sub ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white text-black hover:bg-white/85'}`}
        >
          {sub && <BellRing className="h-4 w-4" />}
          {sub ? '登録済み' : 'チャンネル登録'}
        </button>
        <div className="flex items-center gap-2 @3xl:ml-auto">
          <div className="flex h-9 items-center rounded-full bg-white/10">
            <button
              type="button"
              aria-label="高く評価"
              aria-pressed={like === 1}
              onClick={() => setLike((l) => (l === 1 ? 0 : 1))}
              className="flex h-full items-center gap-1.5 rounded-l-full pl-3.5 pr-3 text-[13px] font-semibold outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <motion.span animate={like === 1 ? { rotate: [0, -18, 0], scale: [1, 1.25, 1] } : {}} transition={{ duration: 0.35 }}>
                <ThumbsUp className="h-[18px] w-[18px]" fill={like === 1 ? 'currentColor' : 'none'} />
              </motion.span>
              <NumberFlow value={film.likes + (like === 1 ? 1 : 0)} format={{ notation: 'compact', maximumFractionDigits: 1 }} locales="ja-JP" />
            </button>
            <span className="h-5 w-px bg-white/20" />
            <button
              type="button"
              aria-label="低く評価"
              aria-pressed={like === -1}
              onClick={() => setLike((l) => (l === -1 ? 0 : -1))}
              className="flex h-full items-center rounded-r-full pl-3 pr-3.5 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ThumbsDown className="h-[18px] w-[18px]" fill={like === -1 ? 'currentColor' : 'none'} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onToast('リンクをコピーしました')}
            className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-semibold outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Share2 className="h-4 w-4" />
            共有
          </button>
          <button
            type="button"
            aria-pressed={saved}
            onClick={() => {
              setSaved((v) => !v)
              onToast(saved ? '「後で見る」から削除しました' : '「後で見る」に保存しました')
            }}
            className="hidden h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-semibold outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 @md:flex"
          >
            <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
            {saved ? '保存済み' : '保存'}
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-white/[0.07] p-3 text-[13px] leading-relaxed">
        <p className="font-semibold">
          {film.views}　{film.ago}　<span className="font-medium text-[#8fb4ff]">{film.tags.join(' ')}</span>
        </p>
        <p className={`mt-1 whitespace-pre-line text-white/90 ${open ? '' : 'line-clamp-2'}`}>{film.desc}</p>
        {open && (
          <div className="mt-3">
            <p className="mb-1.5 font-semibold">チャプター</p>
            <ul className="space-y-0.5">
              {film.chapters.map((c, i) => (
                <li key={i}>
                  <button type="button" onClick={() => onJump(c.start)} className="rounded font-medium text-[#8fb4ff] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white/60">
                    {fmtTime(c.start)}
                  </button>{' '}
                  {c.title}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1.5 rounded font-semibold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white/60">
          {open ? '一部を表示' : 'もっと見る'}
        </button>
      </div>
    </section>
  )
})

const CommentsSection = memo(function CommentsSection({ film }: { film: Film }) {
  const [liked, setLiked] = useState<Record<number, boolean>>({})
  return (
    <section className="min-w-0 pb-6 pt-5">
      <div className="flex items-center gap-6">
        <h2 className="text-[16px] font-bold">コメント {film.comments.length * 104 + 8} 件</h2>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white/80">
          <ArrowDownWideNarrow className="h-4 w-4" />
          並べ替え
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Avatar hue={45} name="あなた" size={34} />
        <input
          aria-label="コメントを追加"
          placeholder="コメントを追加..."
          className="h-8 flex-1 border-b border-white/20 bg-transparent text-[13.5px] outline-none placeholder:text-white/45 focus:border-white"
        />
      </div>
      <ul className="mt-5 space-y-5">
        {film.comments.map((c, i) => (
          <li key={i} className="flex gap-3">
            <Avatar hue={c.hue} name={c.name} size={34} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px]">
                <span className="font-semibold">@{c.name}</span> <span className="text-white/50">{c.ago}</span>
              </p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed">{c.text}</p>
              <div className="mt-1 flex items-center gap-1 text-[12px] text-white/70">
                <button
                  type="button"
                  aria-label="高く評価"
                  aria-pressed={!!liked[i]}
                  onClick={() => setLiked((m) => ({ ...m, [i]: !m[i] }))}
                  className="grid h-8 w-8 place-items-center rounded-full outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <ThumbsUp className="h-4 w-4" fill={liked[i] ? 'currentColor' : 'none'} />
                </button>
                <span className="tabular-nums">{c.likes + (liked[i] ? 1 : 0)}</span>
                <button type="button" className="ml-3 rounded-full px-3 py-1.5 font-semibold outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60">
                  返信
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
})

function SidePanel({
  film,
  time,
  tab,
  setTab,
  autoplay,
  setAutoplay,
  onJump,
  onPlay,
}: {
  film: Film
  time: number
  tab: 'chapters' | 'next'
  setTab: (t: 'chapters' | 'next') => void
  autoplay: boolean
  setAutoplay: (v: boolean) => void
  onJump: (t: number) => void
  onPlay: (id: string) => void
}) {
  const cur = chapterAt(film, time)
  const idx = FILMS.findIndex((f) => f.id === film.id)
  const upNext = FILMS.map((_, k) => FILMS[(idx + 1 + k) % FILMS.length]).filter((f) => f.id !== film.id)
  return (
    <aside className="min-w-0 self-start pt-3">
      <div role="tablist" aria-label="サイドパネル" className="flex gap-2">
        {(
          [
            ['chapters', 'チャプター'],
            ['next', '次の動画'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`h-8 rounded-lg px-3 text-[13px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-white/70 ${tab === id ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/15'}`}
          >
            {label}
          </button>
        ))}
        {tab === 'next' && (
          <label className="ml-auto flex items-center gap-2 text-[12px] text-white/70">
            自動再生
            <Switch on={autoplay} onChange={setAutoplay} label="自動再生" />
          </label>
        )}
      </div>
      {tab === 'chapters' ? (
        <ul className="mt-3 space-y-1" role="tabpanel">
          {film.chapters.map((c, i) => {
            const e = chapterEnd(film, i)
            const prog = clamp((time - c.start) / (e - c.start), 0, 1)
            const active = i === cur
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onJump(c.start)}
                  aria-current={active ? 'true' : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl p-1.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-white/70 ${active ? 'bg-white/10' : 'hover:bg-white/[0.06]'}`}
                >
                  <div className="relative w-[112px] shrink-0 overflow-hidden rounded-lg">
                    <FrameThumb film={film} t={c.start + Math.min(12, (e - c.start) * 0.4)} className="block aspect-video w-full" />
                    {active && (
                      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/30">
                        <div className="h-full" style={{ width: `${prog * 100}%`, background: ACCENT }} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{c.title}</p>
                    <p className="mt-0.5 inline-block rounded bg-[#8fb4ff]/12 px-1.5 text-[11.5px] font-semibold tabular-nums text-[#8fb4ff]">{fmtTime(c.start)}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="mt-3 space-y-1" role="tabpanel">
          {upNext.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onPlay(f.id)}
                className="flex w-full gap-3 rounded-xl p-1.5 text-left outline-none transition hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <div className="relative w-[148px] shrink-0 overflow-hidden rounded-lg">
                  <FrameThumb film={f} t={f.thumbT} className="block aspect-video w-full" />
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10.5px] font-semibold tabular-nums">{fmtTime(f.duration)}</span>
                  {i === 0 && autoplay && (
                    <span className="absolute left-1 top-1 rounded px-1 text-[10px] font-bold" style={{ background: ACCENT }}>
                      次に再生
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{f.title}</p>
                  <p className="mt-1 truncate text-[11.5px] text-white/55">{f.channel}</p>
                  <p className="truncate text-[11.5px] text-white/55">
                    {f.views}・{f.ago}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

/* ───────────── 本体 ───────────── */

export function VideoPlayer() {
  const reduce = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef = useRef<HTMLCanvasElement>(null)

  const [root, setRoot] = useState({ w: 1100, h: 520 })
  const [surf, setSurf] = useState({ w: 640, h: 360 })
  const [filmId, setFilmId] = useState(FILMS[0].id)
  const film = FILMS.find((f) => f.id === filmId)!
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [buf, setBuf] = useState({ s: 0, e: 0 })
  const [buffering, setBuffering] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [quality, setQuality] = useState<Quality>('auto')
  const [ccOn, setCcOn] = useState(true)
  const [cc, setCc] = useState<CcStyle>({ size: 1, color: '#ffffff', bg: 'semi' })
  const [ambient, setAmbient] = useState(true)
  const [loop, setLoop] = useState(false)
  const [theater, setTheater] = useState(false)
  const [mini, setMini] = useState(false)
  const [fs, setFs] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  const [menu, setMenu] = useState<MenuPage | null>(null)
  const [chaptersOpen, setChaptersOpen] = useState(false)
  const [idle, setIdle] = useState(false)
  const [overControls, setOverControls] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [scrubHover, setScrubHover] = useState(false)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [pill, setPill] = useState<{ key: number; text: string } | null>(null)
  const [ripple, setRipple] = useState<Ripple | null>(null)
  const [sideTab, setSideTab] = useState<'chapters' | 'next'>('chapters')
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null)
  const [count, setCount] = useState(8)
  const [cancelled, setCancelled] = useState(false)

  const tRef = useRef(0)
  const bufRef = useRef({ s: 0, e: 0 })
  const live = useRef({ film, playing, ended, buffering, speed, loop, quality, volume, muted })
  useLayoutEffect(() => {
    live.current = { film, playing, ended, buffering, speed, loop, quality, volume, muted }
  })

  /* サイズ計測 */
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setRoot({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useLayoutEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSurf({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* 再生ループ */
  const setBufferingBoth = useCallback((v: boolean) => {
    live.current.buffering = v
    setBuffering(v)
  }, [])
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const L = live.current
      const b = bufRef.current
      if (!L.buffering) {
        let t = tRef.current + dt * L.speed
        if (b.e < L.film.duration && t > b.e) {
          t = b.e
          setBufferingBoth(true)
        }
        if (t >= L.film.duration) {
          if (L.loop) {
            t = 0
            if (b.s > 0) {
              b.s = 0
              b.e = 0
              setBufferingBoth(true)
            }
          } else {
            tRef.current = L.film.duration
            setTime(L.film.duration)
            setPlaying(false)
            setEnded(true)
            return
          }
        }
        tRef.current = t
        setTime(t)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, setBufferingBoth])

  /* 擬似ネットワーク: 再生位置の 36 秒先まで少しずつ先読みする */
  useEffect(() => {
    const id = window.setInterval(() => {
      const L = live.current
      const b = bufRef.current
      const t = tRef.current
      const target = Math.min(L.film.duration, t + 36)
      if (b.e < target) {
        b.e = Math.min(target, b.e + 1.8 * BUF_RATE[L.quality])
        setBuf({ ...b })
      }
      if (L.buffering && b.e >= Math.min(L.film.duration, t + 1.4)) setBufferingBoth(false)
    }, 200)
    return () => window.clearInterval(id)
  }, [setBufferingBoth])

  const seek = useCallback(
    (tt: number) => {
      const f = live.current.film
      const t = clamp(tt, 0, f.duration)
      tRef.current = t
      setTime(t)
      const b = bufRef.current
      if (t < b.s - 0.01 || t > b.e + 0.01) {
        b.s = t
        b.e = t
        setBuf({ ...b })
        setBufferingBoth(true)
      }
      if (t < f.duration - 0.01) setEnded(false)
      else {
        setEnded(true)
        setPlaying(false)
      }
    },
    [setBufferingBoth],
  )

  /* コントロールの自動非表示 */
  const idleTimer = useRef(0)
  const poke = useCallback(() => {
    setIdle(false)
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), 2600)
  }, [])
  useEffect(() => () => window.clearTimeout(idleTimer.current), [])

  const timers = useRef<Record<string, number>>({})
  const later = (k: string, ms: number, fn: () => void) => {
    window.clearTimeout(timers.current[k])
    timers.current[k] = window.setTimeout(fn, ms)
  }
  useEffect(() => {
    const t = timers.current
    return () => Object.values(t).forEach((id) => window.clearTimeout(id))
  }, [])

  const showPill = useCallback((text: string) => {
    setPill({ key: performance.now(), text })
    window.clearTimeout(timers.current.pill)
    timers.current.pill = window.setTimeout(() => setPill(null), 900)
  }, [])
  const showToast = useCallback((text: string) => {
    setToast({ key: performance.now(), text })
    window.clearTimeout(timers.current.toast)
    timers.current.toast = window.setTimeout(() => setToast(null), 2200)
  }, [])

  const togglePlay = useCallback(() => {
    const L = live.current
    if (L.ended) {
      seek(0)
      setPlaying(true)
      setFlash({ key: performance.now(), kind: 'play' })
      return
    }
    setPlaying(!L.playing)
    setFlash({ key: performance.now(), kind: L.playing ? 'pause' : 'play' })
  }, [seek])

  const seekStep = useCallback(
    (side: -1 | 1, sec: number) => {
      seek(tRef.current + side * sec)
      setRipple((r) => ({ key: performance.now(), side, sec: r && r.side === side ? r.sec + sec : sec }))
      window.clearTimeout(timers.current.ripple)
      timers.current.ripple = window.setTimeout(() => setRipple(null), 750)
    },
    [seek],
  )

  const changeVolume = useCallback(
    (v: number) => {
      const nv = clamp(Math.round(v * 100) / 100, 0, 1)
      setVolume(nv)
      setMuted(nv === 0)
      showPill(`音量 ${Math.round(nv * 100)}%`)
    },
    [showPill],
  )
  const toggleMute = useCallback(() => {
    const L = live.current
    if (L.muted || L.volume === 0) {
      setMuted(false)
      if (L.volume === 0) setVolume(0.5)
      showPill(`音量 ${Math.round((L.volume || 0.5) * 100)}%`)
    } else {
      setMuted(true)
      showPill('ミュート')
    }
  }, [showPill])

  const toggleFullscreen = useCallback(() => {
    const el = playerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
      return
    }
    setMini(false)
    if (!el.requestFullscreen) {
      showPill('全画面表示を利用できません')
      return
    }
    el.requestFullscreen().catch(() => showPill('全画面表示を利用できません'))
  }, [showPill])
  useEffect(() => {
    const on = () => setFs(document.fullscreenElement === playerRef.current && !!playerRef.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const idx = FILMS.findIndex((f) => f.id === filmId)
  const next = FILMS[(idx + 1) % FILMS.length]

  const loadFilm = useCallback(
    (id: string) => {
      const f = FILMS.find((x) => x.id === id)!
      live.current.film = f
      setFilmId(id)
      tRef.current = 0
      setTime(0)
      bufRef.current = { s: 0, e: 0 }
      setBuf({ s: 0, e: 0 })
      setBufferingBoth(true)
      setEnded(false)
      setCancelled(false)
      setMenu(null)
      setChaptersOpen(false)
      setPlaying(true)
      poke()
    },
    [poke, setBufferingBoth],
  )

  const jump = useCallback(
    (t: number) => {
      seek(t)
      setPlaying(true)
      scrollRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
      playerRef.current?.focus({ preventScroll: true })
    },
    [seek, reduce],
  )

  /* 終了画面のカウントダウン */
  const counting = ended && autoplay && !cancelled && !mini
  useEffect(() => {
    if (!counting) return
    setCount(8)
    const id = window.setInterval(() => setCount((c) => c - 1), 1000)
    return () => window.clearInterval(id)
  }, [counting])
  useEffect(() => {
    if (counting && count <= 0) loadFilm(next.id)
  }, [counting, count, loadFilm, next.id])

  /* レイアウト */
  const wide = root.w >= 720
  const side = clamp(root.w * 0.28, 290, 380)
  let pw: number
  let ph: number
  let grid: CSSProperties
  if (wide && !theater) {
    const maxW = root.w - 48 - side - 24
    const maxH = root.h - HEADER - 16 - 52
    pw = Math.max(320, Math.min(maxW, (maxH * 16) / 9))
    ph = (pw * 9) / 16
    grid = {
      gridTemplateColumns: `${pw}px ${side}px`,
      gridTemplateAreas: '"player side" "info side" "cmts side"',
      gridTemplateRows: 'auto auto 1fr',
      columnGap: 24,
      justifyContent: 'center',
      padding: '16px 24px 0',
    }
  } else if (wide) {
    pw = root.w
    ph = Math.min((root.w * 9) / 16, root.h - HEADER - 56)
    grid = {
      gridTemplateColumns: `minmax(0,1fr) ${side}px`,
      gridTemplateAreas: '"player player" "info side" "cmts side"',
      gridTemplateRows: 'auto auto 1fr',
      columnGap: 24,
    }
  } else {
    pw = root.w
    ph = Math.min((root.w * 9) / 16, (root.h - HEADER) * 0.62)
    grid = { gridTemplateColumns: 'minmax(0,1fr)', gridTemplateAreas: '"player" "info" "side" "cmts"' }
  }
  const padX: CSSProperties = wide && theater ? { paddingLeft: 24 } : !wide ? { paddingLeft: 12, paddingRight: 12 } : {}
  const padSide: CSSProperties = wide && theater ? { paddingRight: 24 } : !wide ? { paddingLeft: 12, paddingRight: 12 } : {}
  const mw = wide ? 330 : Math.min(260, root.w - 24)

  /* canvas の解像度 */
  const vw = Math.max(16, Math.min(surf.w, (surf.h * 16) / 9))
  const vh = (vw * 9) / 16
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1
  const autoPx = Math.min(1920, Math.round(vw * dpr))
  const autoRes = autoPx >= 1600 ? '1080p' : autoPx >= 1000 ? '720p' : autoPx >= 700 ? '480p' : '360p'
  const qPx = quality === 'auto' ? autoPx : QUALITIES.find((q) => q.id === quality)!.px
  const cw = Math.max(64, Math.round(qPx))
  const ch = Math.round((cw * 9) / 16)

  const lastGlow = useRef(0)
  useLayoutEffect(() => {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    // 再生前(0秒で停止中)は暗い冒頭ではなく、タイトルが出ている3秒目をポスターとして描く
    drawFrame(ctx, c.width, c.height, film, !playing && time === 0 ? POSTER_T : time)
    const g = glowRef.current
    const now = performance.now()
    if (g && (now - lastGlow.current > 90 || !playing)) {
      lastGlow.current = now
      g.getContext('2d')?.drawImage(c, 0, 0, g.width, g.height)
    }
  }, [time, film, cw, ch, playing, ambient, mini, theater])

  const cue = ccOn ? film.cues.find((q) => time >= q.s && time < q.e) : undefined
  const chIdx = chapterAt(film, time)
  const controlsVisible = !playing || !idle || menu !== null || scrubbing || chaptersOpen || overControls
  const compact = pw < 480 && !fs
  const showGlow = ambient && !mini && !fs && !(wide && theater)

  /* キーボード(プレーヤーにフォーカスがあるときだけ) */
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName
    if (e.key === 'Escape') {
      if (menu) setMenu(null)
      else if (chaptersOpen) setChaptersOpen(false)
      else if (mini) setMini(false)
      else return
      e.stopPropagation()
      playerRef.current?.focus({ preventScroll: true })
      return
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return
    if ((e.key === ' ' || e.key === 'Enter') && (tag === 'BUTTON' || tag === 'INPUT')) return
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
    const f = live.current.film
    switch (k) {
      case ' ':
      case 'k':
        togglePlay()
        break
      case 'j':
        seekStep(-1, 10)
        break
      case 'l':
        seekStep(1, 10)
        break
      case 'ArrowLeft':
        seekStep(-1, 5)
        break
      case 'ArrowRight':
        seekStep(1, 5)
        break
      case 'ArrowUp':
        changeVolume((muted ? 0 : volume) + 0.05)
        break
      case 'ArrowDown':
        changeVolume((muted ? 0 : volume) - 0.05)
        break
      case 'm':
        toggleMute()
        break
      case 'c':
        setCcOn((v) => !v)
        showPill(ccOn ? '字幕: オフ' : '字幕: 日本語')
        break
      case 'f':
        toggleFullscreen()
        break
      case 't':
        if (wide && !fs) setTheater((v) => !v)
        break
      case 'i':
        if (!fs) setMini((v) => !v)
        break
      case 'Home':
        seek(0)
        break
      case 'End':
        seek(f.duration)
        break
      case '>':
      case '<': {
        const i = SPEEDS.indexOf(speed)
        const s = SPEEDS[clamp(i + (k === '>' ? 1 : -1), 0, SPEEDS.length - 1)]
        setSpeed(s)
        showPill(`${s}x`)
        break
      }
      default:
        if (/^[0-9]$/.test(k)) seek((f.duration * Number(k)) / 10)
        else return
    }
    e.preventDefault()
    poke()
  }

  /* クリック/ダブルクリック */
  const tapRef = useRef<{ t: number; side: number; chain: boolean } | null>(null)
  const onSurfaceUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    poke()
    playerRef.current?.focus({ preventScroll: true })
    if (menu || chaptersOpen) {
      setMenu(null)
      setChaptersOpen(false)
      return
    }
    if (mini) {
      togglePlay()
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const s = x < 0.33 ? -1 : x > 0.67 ? 1 : 0
    const now = performance.now()
    const last = tapRef.current
    if (last && s !== 0 && last.side === s && now - last.t < (last.chain ? 700 : 320)) {
      window.clearTimeout(timers.current.tap)
      seekStep(s as -1 | 1, 10)
      tapRef.current = { t: now, side: s, chain: true }
      return
    }
    if (last && s === 0 && last.side === 0 && !last.chain && now - last.t < 320) {
      window.clearTimeout(timers.current.tap)
      tapRef.current = null
      toggleFullscreen()
      return
    }
    tapRef.current = { t: now, side: s, chain: false }
    later('tap', 240, togglePlay)
  }

  const springT: Transition = reduce ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 36 }
  const playerStyle: CSSProperties = fs
    ? { position: 'relative', width: '100%', height: '100%' }
    : mini
      ? { position: 'absolute', right: 12, bottom: 12, width: mw, zIndex: 40 }
      : { position: 'relative', width: pw, height: ph, margin: '0 auto' }

  const PlayIcon = ended ? RotateCcw : playing ? Pause : Play
  const capBottom = mini ? 8 : controlsVisible ? (compact ? 58 : 66) : 18
  const capFont = clamp(vh * 0.046, 10, 34) * cc.size

  return (
    <div
      ref={rootRef}
      className="@container relative flex h-full w-full flex-col overflow-hidden bg-[#0f0f11] font-sans text-[#f1f1f1] antialiased"
    >
      {/* ヘッダー */}
      <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-white/[0.06] px-3 @md:px-4">
        <div className="flex items-center gap-1.5">
          <Logo />
          <span className="text-[17px] font-bold tracking-tight">Utsuroi</span>
          <span className="mt-[-10px] text-[9px] font-medium text-white/50">JP</span>
        </div>
        <form className="mx-auto hidden h-9 w-full max-w-[460px] items-center @2xl:flex" onSubmit={(e) => e.preventDefault()}>
          <input
            aria-label="検索"
            placeholder="検索"
            className="h-full min-w-0 flex-1 rounded-l-full border border-white/15 bg-[#121214] px-4 text-[13.5px] outline-none placeholder:text-white/40 focus:border-[#5b8cff]"
          />
          <button type="submit" aria-label="検索" className="grid h-full w-14 place-items-center rounded-r-full border border-l-0 border-white/15 bg-white/[0.08] outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60">
            <Search className="h-[18px] w-[18px]" />
          </button>
        </form>
        <div className="ml-auto flex items-center gap-1 @2xl:ml-0">
          <button type="button" aria-label="検索" className="grid h-9 w-9 place-items-center rounded-full outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 @2xl:hidden">
            <Search className="h-5 w-5" />
          </button>
          <button type="button" aria-label="動画を投稿" className="hidden h-9 w-9 place-items-center rounded-full outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 @md:grid">
            <Video className="h-5 w-5" />
          </button>
          <button type="button" aria-label="通知 (3件)" className="relative grid h-9 w-9 place-items-center rounded-full outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9.5px] font-bold" style={{ background: ACCENT }}>
              3
            </span>
          </button>
          <span className="ml-1">
            <Avatar hue={45} name="あなた" size={30} />
          </span>
        </div>
      </header>

      <motion.div ref={scrollRef} layoutScroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]">
        <div className="grid" style={grid}>
          {/* プレーヤー枠(ミニプレーヤー中はここにプレースホルダー) */}
          <div style={{ gridArea: 'player', height: ph }} className={wide && theater ? 'bg-black' : ''}>
            {mini && (
              <div className="grid h-full place-items-center rounded-xl bg-white/[0.04] text-center" style={{ width: pw, margin: '0 auto' }}>
                <div>
                  <PictureInPicture2 className="mx-auto h-8 w-8 text-white/40" />
                  <p className="mt-2 text-[13px] text-white/60">ミニプレーヤーで再生中</p>
                  <button
                    type="button"
                    onClick={() => setMini(false)}
                    className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-[12.5px] font-semibold outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    ここで再生
                  </button>
                </div>
              </div>
            )}
            <motion.div
              ref={playerRef}
              layout={!fs}
              layoutDependency={`${mini}-${theater}-${Math.round(pw)}-${Math.round(ph)}-${fs}`}
              transition={springT}
              tabIndex={0}
              role="region"
              aria-label={`動画プレーヤー: ${film.title}`}
              onKeyDown={onKeyDown}
              onPointerMove={poke}
              onPointerLeave={() => {
                if (playing) setIdle(true)
                setOverControls(false)
              }}
              style={playerStyle}
              className={`group/player outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${mini ? 'overflow-hidden rounded-xl bg-[#1d1d20] shadow-[0_18px_50px_rgba(0,0,0,0.7)] ring-1 ring-white/10' : ''} ${!mini && wide && !theater && !fs ? 'rounded-xl' : ''}`}
            >
              {/* アンビエントライト */}
              <canvas
                ref={glowRef}
                width={48}
                height={27}
                aria-hidden
                className="pointer-events-none absolute transition-opacity duration-700"
                style={{
                  left: wide ? '-7%' : '-2%',
                  top: wide ? '-9%' : '-6%',
                  width: wide ? '114%' : '104%',
                  height: wide ? '118%' : '120%',
                  filter: 'blur(42px) saturate(1.7)',
                  opacity: showGlow ? (wide ? 0.75 : 0.5) : 0,
                }}
              />
              <div
                ref={surfaceRef}
                className={`${mini ? 'relative' : 'absolute inset-0'} overflow-hidden bg-black ${!mini && wide && !theater && !fs ? 'rounded-xl' : ''} ${!controlsVisible && playing ? 'cursor-none' : ''}`}
                style={mini ? { height: (mw * 9) / 16 } : undefined}
              >
                <canvas
                  ref={canvasRef}
                  width={cw}
                  height={ch}
                  aria-hidden
                  className="absolute"
                  style={{ width: vw, height: vh, left: (surf.w - vw) / 2, top: (surf.h - vh) / 2 }}
                />
                {/* クリック面 */}
                <div className="absolute inset-0" onPointerUp={onSurfaceUp} />

                {/* 字幕 */}
                <div
                  className={`pointer-events-none absolute inset-x-0 flex justify-center px-6 transition-[bottom,opacity] duration-200 ${scrubHover && !mini ? 'opacity-0' : ''}`}
                  style={{ bottom: capBottom }}
                >
                  <AnimatePresence mode="wait">
                    {cue && (
                      <motion.p
                        key={`${film.id}-${cue.s}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="max-w-[86%] text-center font-medium leading-snug"
                        style={{ fontSize: mini ? 11 : capFont }}
                      >
                        <span className="box-decoration-clone rounded px-[0.35em] py-[0.08em]" style={captionStyle(cc, 1)}>
                          {cue.text}
                        </span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* 中央の再生/一時停止フィードバック */}
                <AnimatePresence>
                  {flash && !mini && (
                    <motion.div
                      key={flash.key}
                      initial={{ opacity: 0.9, scale: reduce ? 1 : 0.7 }}
                      animate={{ opacity: 0, scale: reduce ? 1 : 1.35 }}
                      transition={{ duration: reduce ? 0.4 : 0.6, ease: 'easeOut' }}
                      onAnimationComplete={() => setFlash((f) => (f && f.key === flash.key ? null : f))}
                      className="pointer-events-none absolute left-1/2 top-1/2 -ml-8 -mt-8 grid h-16 w-16 place-items-center rounded-full bg-black/55"
                    >
                      {flash.kind === 'play' ? <Play className="ml-1 h-7 w-7" fill="currentColor" /> : <Pause className="h-7 w-7" fill="currentColor" />}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ±10秒の波紋 */}
                <AnimatePresence>
                  {ripple && !mini && (
                    <motion.div
                      key={ripple.side}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`pointer-events-none absolute inset-y-0 grid w-[38%] place-items-center overflow-hidden bg-white/[0.08] ${ripple.side < 0 ? 'left-0 rounded-r-[50%]' : 'right-0 rounded-l-[50%]'}`}
                    >
                      {!reduce && (
                        <motion.span
                          key={ripple.key}
                          initial={{ scale: 0, opacity: 0.35 }}
                          animate={{ scale: 3.2, opacity: 0 }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="absolute h-24 w-24 rounded-full bg-white"
                        />
                      )}
                      <div className="relative flex flex-col items-center gap-1">
                        <div className={`flex ${ripple.side < 0 ? 'flex-row-reverse' : ''}`}>
                          {[0, 1, 2].map((i) => (
                            <motion.svg
                              key={`${ripple.key}-${i}`}
                              viewBox="0 0 10 12"
                              className="h-3.5 w-3"
                              initial={{ opacity: 0.25 }}
                              animate={{ opacity: [0.25, 1, 0.25] }}
                              transition={{ duration: 0.6, delay: i * 0.12 }}
                            >
                              <path d={ripple.side > 0 ? 'M1 1l8 5-8 5z' : 'M9 1L1 6l8 5z'} fill="#fff" />
                            </motion.svg>
                          ))}
                        </div>
                        <span className="text-[12.5px] font-semibold tabular-nums">{ripple.sec}秒</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 音量・速度などの通知 */}
                <AnimatePresence>
                  {pill && !mini && (
                    <motion.div
                      key="pill"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="pointer-events-none absolute left-1/2 top-[14%] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-1.5 text-[13px] font-semibold tabular-nums"
                    >
                      {pill.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 読み込み中 */}
                {buffering && !ended && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center" role="status" aria-label="読み込み中">
                    <svg viewBox="0 0 50 50" className={`${mini ? 'h-8 w-8' : 'h-12 w-12'} ${reduce ? '' : 'animate-spin'}`}>
                      <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
                      <circle cx="25" cy="25" r="20" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray="40 126" />
                    </svg>
                  </div>
                )}

                {/* 上部のタイトル(全画面・シアター時) */}
                {!mini && (fs || (wide && theater)) && (
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-5 pb-10 pt-3.5 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <p className="truncate text-[15px] font-semibold">{film.title}</p>
                    <p className="text-[12px] text-white/70">{film.channel}</p>
                  </div>
                )}

                {/* 終了画面 */}
                <AnimatePresence>
                  {ended && !mini && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 z-[5] grid place-items-center bg-black/60 px-4 pb-12 backdrop-blur-[3px]"
                      onPointerUp={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          seek(0)
                          setPlaying(true)
                        }}
                        className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[12.5px] font-semibold outline-none backdrop-blur hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        もう一度見る
                      </button>
                      <div className={`flex items-center gap-4 ${ph < 300 ? 'flex-row' : 'flex-col'}`}>
                        <button
                          type="button"
                          onClick={() => loadFilm(next.id)}
                          aria-label={`次の動画を再生: ${next.title}`}
                          className="group relative shrink-0 overflow-hidden rounded-xl shadow-2xl outline-none ring-1 ring-white/15 focus-visible:ring-2 focus-visible:ring-white"
                          style={{ width: ph < 300 ? Math.min(150, pw * 0.36) : Math.min(300, pw * 0.42) }}
                        >
                          <FrameThumb film={next} t={next.thumbT} className="block aspect-video w-full transition-transform duration-300 group-hover:scale-105" />
                          <span className="absolute inset-0 grid place-items-center bg-black/30">
                            <span className="relative grid h-14 w-14 place-items-center">
                              <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
                                <circle cx="28" cy="28" r="25" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                                {counting && (
                                  <motion.circle
                                    cx="28"
                                    cy="28"
                                    r="25"
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray={157}
                                    initial={{ strokeDashoffset: 157 }}
                                    animate={{ strokeDashoffset: 0 }}
                                    transition={{ duration: 8, ease: 'linear' }}
                                  />
                                )}
                              </svg>
                              <Play className="relative ml-0.5 h-6 w-6" fill="currentColor" />
                            </span>
                          </span>
                          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 text-[10.5px] font-semibold tabular-nums">{fmtTime(next.duration)}</span>
                        </button>
                        <div className={ph < 300 ? 'min-w-0 max-w-[220px]' : 'max-w-[340px] text-center'}>
                          <p className="text-[11.5px] font-medium text-white/65" aria-live="polite">
                            {counting ? (
                              <>
                                次の動画 <span className="font-bold tabular-nums text-white">{Math.max(0, count)}</span> 秒後に再生
                              </>
                            ) : (
                              '次の動画'
                            )}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug">{next.title}</p>
                          <p className="mt-0.5 text-[11.5px] text-white/60">
                            {next.channel}・{next.views}
                          </p>
                          <div className={`mt-2.5 flex gap-2 ${ph < 300 ? '' : 'justify-center'}`}>
                            {counting && (
                              <button
                                type="button"
                                onClick={() => setCancelled(true)}
                                className="rounded-full bg-white/12 px-3.5 py-1.5 text-[12.5px] font-semibold outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70"
                              >
                                キャンセル
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => loadFilm(next.id)}
                              className="rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-black outline-none hover:bg-white/85 focus-visible:ring-2 focus-visible:ring-white/70"
                            >
                              今すぐ再生
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* チャプター一覧(プレーヤー内パネル) */}
                <AnimatePresence>
                  {chaptersOpen && !mini && (
                    <motion.aside
                      initial={reduce ? { opacity: 0 } : { x: '100%' }}
                      animate={reduce ? { opacity: 1 } : { x: 0 }}
                      exit={reduce ? { opacity: 0 } : { x: '100%' }}
                      transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 40 }}
                      className="absolute inset-y-0 right-0 z-30 flex w-[min(320px,82%)] flex-col bg-[#141416]/90 backdrop-blur-xl"
                      onPointerUp={(e) => e.stopPropagation()}
                      aria-label="チャプター"
                    >
                      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 pl-4 pr-1.5">
                        <p className="text-[14px] font-semibold">チャプター</p>
                        <IconBtn label="閉じる" onClick={() => setChaptersOpen(false)} size="sm" align="right">
                          <X className="h-4.5 w-4.5" />
                        </IconBtn>
                      </div>
                      <ul className="min-h-0 flex-1 overflow-y-auto p-1.5 [scrollbar-width:thin]">
                        {film.chapters.map((c, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => {
                                seek(c.start)
                                setPlaying(true)
                                setChaptersOpen(false)
                              }}
                              className={`flex w-full items-center gap-3 rounded-lg p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${i === chIdx ? 'bg-white/12' : 'hover:bg-white/[0.06]'}`}
                            >
                              <FrameThumb film={film} t={c.start + 8} className="aspect-video w-[88px] shrink-0 rounded-md" />
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-semibold">{c.title}</span>
                                <span className="text-[11.5px] tabular-nums text-[#8fb4ff]">{fmtTime(c.start)}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </motion.aside>
                  )}
                </AnimatePresence>

                {/* 通常のコントロール */}
                {!mini && (
                  <div
                    className={`absolute inset-x-0 bottom-0 z-10 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                    onPointerEnter={() => setOverControls(true)}
                    onPointerLeave={() => setOverControls(false)}
                  >
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                    <div className="relative">
                      <Scrubber film={film} time={time} buf={buf} onSeek={seek} onScrub={setScrubbing} onHover={setScrubHover} small={compact} />
                      <div className="flex h-11 items-center gap-0.5 px-1.5 pb-1">
                        <IconBtn label={ended ? 'もう一度再生' : playing ? '一時停止' : '再生'} tip={ended ? 'もう一度再生' : playing ? '一時停止 (k)' : '再生 (k)'} onClick={togglePlay} align="left">
                          <PlayIcon className="h-[21px] w-[21px]" fill={ended ? 'none' : 'currentColor'} />
                        </IconBtn>
                        {!compact && (
                          <IconBtn label="次の動画" onClick={() => loadFilm(next.id)}>
                            <SkipForward className="h-[19px] w-[19px]" fill="currentColor" />
                          </IconBtn>
                        )}
                        <VolumeControl volume={volume} muted={muted} onMute={toggleMute} onChange={changeVolume} compact={compact} />
                        <span className="ml-1 shrink-0 whitespace-nowrap text-[12.5px] font-medium tabular-nums text-white/95">
                          {fmtTime(time)} <span className="text-white/60">/ {fmtTime(film.duration)}</span>
                        </span>
                        {pw >= 400 && (
                          <button
                            type="button"
                            onClick={() => {
                              setMenu(null)
                              setChaptersOpen((v) => !v)
                            }}
                            aria-expanded={chaptersOpen}
                            aria-label={`チャプター一覧を開く (現在: ${film.chapters[chIdx].title})`}
                            className="ml-1 flex min-w-0 items-center gap-0.5 rounded-full px-2 py-1 text-[12.5px] text-white/90 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
                          >
                            <span className="text-white/50">・</span>
                            <span className="truncate">{film.chapters[chIdx].title}</span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          </button>
                        )}
                        <span className="flex-1" />
                        {pw < 400 && (
                          <IconBtn label="チャプター" onClick={() => setChaptersOpen((v) => !v)} expanded={chaptersOpen}>
                            <ListVideo className="h-5 w-5" />
                          </IconBtn>
                        )}
                        <IconBtn label={ccOn ? '字幕をオフ' : '字幕をオン'} tip="字幕 (c)" onClick={() => setCcOn((v) => !v)} pressed={ccOn}>
                          <span className="relative">
                            <Captions className="h-[21px] w-[21px]" />
                            <span
                              className={`absolute -bottom-1 left-0.5 right-0.5 h-[2.5px] rounded-full transition-transform duration-200 ${ccOn ? 'scale-x-100' : 'scale-x-0'}`}
                              style={{ background: ACCENT }}
                            />
                          </span>
                        </IconBtn>
                        {pw >= 560 && (
                          <button
                            type="button"
                            onClick={() => setMenu((m) => (m === 'speed' ? null : 'speed'))}
                            aria-label={`再生速度 ${speed}倍`}
                            className="group/btn relative mx-0.5 h-7 shrink-0 rounded-md px-2 text-[12px] font-semibold tabular-nums outline-none ring-1 ring-white/25 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80"
                          >
                            {speed}x
                            <Tip>再生速度 (&lt; &gt;)</Tip>
                          </button>
                        )}
                        <IconBtn label="設定" onClick={() => setMenu((m) => (m ? null : 'main'))} expanded={menu !== null} align="right">
                          <span className="relative">
                            <motion.span className="block" animate={{ rotate: menu ? 45 : 0 }} transition={{ duration: reduce ? 0 : 0.25 }}>
                              <Settings className="h-[20px] w-[20px]" />
                            </motion.span>
                            {(quality === '1080' || quality === '720' || (quality === 'auto' && autoPx >= 1000)) && (
                              <span className="absolute -right-1.5 -top-1 rounded-[3px] px-0.5 text-[7.5px] font-bold leading-[10px]" style={{ background: ACCENT }}>
                                HD
                              </span>
                            )}
                          </span>
                        </IconBtn>
                        {!fs && (
                          <IconBtn label="ミニプレーヤー" tip="ミニプレーヤー (i)" onClick={() => setMini(true)} align="right">
                            <PictureInPicture2 className="h-[19px] w-[19px]" />
                          </IconBtn>
                        )}
                        {wide && !fs && (
                          <IconBtn label={theater ? 'デフォルト表示' : 'シアターモード'} tip={theater ? 'デフォルト表示 (t)' : 'シアターモード (t)'} onClick={() => setTheater((v) => !v)} align="right" pressed={theater}>
                            <RectangleHorizontal className={`h-[20px] w-[20px] transition-transform ${theater ? 'scale-x-125' : ''}`} />
                          </IconBtn>
                        )}
                        <IconBtn label={fs ? '全画面表示を終了' : '全画面表示'} tip={fs ? '全画面表示を終了 (f)' : '全画面表示 (f)'} onClick={toggleFullscreen} align="right">
                          {fs ? <Minimize className="h-[19px] w-[19px]" /> : <Maximize className="h-[19px] w-[19px]" />}
                        </IconBtn>
                      </div>
                    </div>
                  </div>
                )}

                {/* ミニプレーヤーのコントロール */}
                {mini && (
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/player:opacity-100">
                    <div className="absolute inset-0 bg-black/35" />
                    <div className="pointer-events-auto absolute left-1 top-1">
                      <IconBtn label="プレーヤーに戻す" tip="プレーヤーに戻す (i)" onClick={() => setMini(false)} size="sm" align="left">
                        <Maximize2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                    <div className="pointer-events-auto absolute right-1 top-1">
                      <IconBtn
                        label="閉じる"
                        onClick={() => {
                          setPlaying(false)
                          setMini(false)
                          showToast('ミニプレーヤーを閉じました')
                        }}
                        size="sm"
                        align="right"
                      >
                        <X className="h-4 w-4" />
                      </IconBtn>
                    </div>
                    <div className="pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3">
                      <IconBtn label="10秒戻す" onClick={() => seek(tRef.current - 10)}>
                        <RotateCcw className="h-5 w-5" />
                      </IconBtn>
                      <IconBtn label={playing ? '一時停止' : '再生'} onClick={togglePlay}>
                        <PlayIcon className="h-7 w-7" fill={ended ? 'none' : 'currentColor'} />
                      </IconBtn>
                      <IconBtn label="10秒進める" onClick={() => seek(tRef.current + 10)}>
                        <RotateCcw className="h-5 w-5 -scale-x-100" />
                      </IconBtn>
                    </div>
                  </div>
                )}
                {mini && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
                    <div className="h-full" style={{ width: `${(time / film.duration) * 100}%`, background: ACCENT }} />
                  </div>
                )}

                {/* 設定メニュー */}
                <AnimatePresence>
                  {menu && !mini && (
                    <SettingsMenu
                      page={menu}
                      setPage={setMenu}
                      maxH={Math.max(120, surf.h - 72)}
                      speed={speed}
                      setSpeed={(s) => {
                        setSpeed(s)
                        setMenu('main')
                        showPill(`${s}x`)
                      }}
                      quality={quality}
                      setQuality={(q) => {
                        setQuality(q)
                        setMenu('main')
                      }}
                      autoRes={autoRes}
                      ccOn={ccOn}
                      setCcOn={setCcOn}
                      cc={cc}
                      setCc={setCc}
                      ambient={ambient}
                      setAmbient={setAmbient}
                      loop={loop}
                      setLoop={setLoop}
                      reduce={reduce}
                    />
                  )}
                </AnimatePresence>
              </div>
              {mini && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold">{film.title}</p>
                    <p className="truncate text-[11px] text-white/55">
                      {film.channel}・{film.chapters[chIdx].title}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <div style={{ ...padX, gridArea: 'info' }} className="min-w-0">
            <InfoSection key={film.id} film={film} onJump={jump} onToast={showToast} />
          </div>
          <div style={{ ...padSide, gridArea: 'side', paddingTop: wide && !theater ? 0 : 4 }} className="min-w-0">
            <SidePanel
              film={film}
              time={time}
              tab={sideTab}
              setTab={setSideTab}
              autoplay={autoplay}
              setAutoplay={setAutoplay}
              onJump={jump}
              onPlay={(id) => {
                loadFilm(id)
                scrollRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
              }}
            />
          </div>
          <div style={{ ...padX, gridArea: 'cmts' }} className="min-w-0">
            <CommentsSection key={film.id} film={film} />
          </div>
        </div>
      </motion.div>

      {/* トースト */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="status"
            className="pointer-events-none absolute bottom-4 left-4 z-50 rounded-lg bg-[#f1f1f1] px-4 py-2.5 text-[13px] font-medium text-[#0f0f11] shadow-xl"
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
