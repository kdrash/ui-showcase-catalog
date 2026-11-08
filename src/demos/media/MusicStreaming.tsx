import { AnimatePresence, motion, Reorder, useDragControls, useReducedMotion } from 'motion/react'
import {
  AudioLines,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePlus,
  Clock3,
  Disc3,
  Ellipsis,
  GripVertical,
  Heart,
  House,
  Library,
  Link2,
  ListPlus,
  ListMusic,
  Maximize2,
  MicVocal,
  Pause,
  Pin,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  User,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { SynthEngine } from './MusicStreaming.audio'
import { ArtistAvatar, CoverArt, extractColor, rgba, useCoverColor, type AnyCover, type RGB } from './MusicStreaming.cover'
import {
  ADDED_LABEL,
  ALBUM_BY_ID,
  ALBUMS,
  ARTISTS,
  GENRES,
  LIKED_INITIAL,
  LYRICS,
  PLAYLISTS,
  TRACKS,
  fmtDur,
  fmtTotal,
  type Album,
  type Playlist,
  type Track,
} from './MusicStreaming.data'

/**
 * 音楽ストリーミングアプリ(Spotify風)。サービス名「Otoha」・アーティスト・アルバム・曲・歌詞・ジャケットはすべて架空のオリジナル。
 * - 3 カラム(ライブラリ / メインビュー / キュー)+ 下部の再生バー。幅は ResizeObserver で測り、狭いとライブラリをアイコンだけのレールに、
 *   さらに狭いとモバイル版(下部タブ + ミニプレーヤーのカード)に切り替える。メインビュー内は @container/main のコンテナクエリ
 * - ジャケットは 8 種の描き方 × 4 色パレットの SVG。アルバム/プレイリストのヘッダーのグラデーションは、描いたジャケットを canvas に縮小して
 *   彩度で重み付けした平均色から作る。ホームのクイックタイルにホバーすると上部の色がそのジャケットの色へゆっくり変わる
 * - 再生位置は小さな外部ストア(useSyncExternalStore)に置き、rAF で進める。購読するのはシークバー・時間表示・歌詞だけなので、
 *   アプリ全体が毎フレーム再レンダーされることはない
 * - 曲一覧はホバーで番号→再生ボタン、再生中の曲は CSS keyframes のイコライザー。ダブルクリック/Enter で再生、… でキュー追加などのメニュー
 * - シャッフル(現在の曲を先頭に残して並べ替え)・リピート(オフ/全曲/1曲)・キュー(「次に再生」+コンテキストの続き)。キューは
 *   motion の Reorder でドラッグ並べ替え、Alt+↑↓ でも移動できる
 * - 歌詞は時刻付き。現在行をハイライトして自動スクロールし、手でスクロールすると同期を止めて「同期に戻る」ボタンを出す。行をクリックでシーク
 * - ジャケットを押すと全画面の再生画面。背景はジャケットを大きくぼかしたもので、ジャケットは layoutId で再生バーから拡大する
 * - 音は Tone.js の自動演奏(曲ごとの調・テンポ・進行)。再生ボタンを押したときに初めて読み込み、音量は小さめ、アンマウントで破棄する
 * - Space で再生/一時停止、Esc で全画面やメニューを閉じる(デモ内にフォーカスがあるときのみ)。useReducedMotion 時は短いフェードだけにする
 */

const ACC = '#2ee6a8'
const BG = '#121214'

/* ───────────── 再生位置ストア ───────────── */

type Clock = { get: () => number; set: (v: number) => void; subscribe: (f: () => void) => () => void }
function makeClock(): Clock {
  let pos = 0
  const subs = new Set<() => void>()
  return {
    get: () => pos,
    set: (v) => {
      pos = v
      subs.forEach((f) => f())
    },
    subscribe: (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
  }
}
const ClockCtx = createContext<Clock>(makeClock())
const usePos = () => {
  const c = useContext(ClockCtx)
  return useSyncExternalStore(c.subscribe, c.get, c.get)
}

/* ───────────── コレクション ───────────── */

type Route = { v: 'home' } | { v: 'search' } | { v: 'library' } | { v: 'col'; id: string }
interface Col {
  id: string
  kind: string
  title: string
  sub: string
  desc?: string
  cover: AnyCover
  tracks: string[]
  album?: Album
  editable: boolean
  isMix: boolean
}
type QItem = { uid: number; id: string }
type Repeat = 'off' | 'all' | 'one'

interface App {
  route: Route
  go: (r: Route) => void
  col: (id: string) => Col | null
  playlists: Playlist[]
  liked: string[]
  saved: string[]
  current: Track
  ctxId: string
  playing: boolean
  shuffle: boolean
  narrow: boolean
  reduce: boolean
  playCol: (id: string, trackId?: string) => void
  toggle: () => void
  toggleLike: (id: string) => void
  toggleSave: (id: string) => void
  setShuffle: (v: boolean) => void
  openMenu: (e: ReactMouseEvent, trackId: string, ctxId?: string) => void
  addToPlaylist: (plId: string, trackId: string) => void
  createPlaylist: () => void
  toast: (s: string) => void
}
const AppCtx = createContext<App>(null as unknown as App)
const useApp = () => useContext(AppCtx)

const hashStr = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0
function shuffled<T>(arr: T[], seed: number) {
  const a = [...arr]
  let s = seed || 1
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const compact = new Intl.NumberFormat('ja-JP')

/* ───────────── 小物 ───────────── */

function Logo({ small }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg viewBox="0 0 32 32" className={small ? 'h-7 w-7' : 'h-7 w-7'} aria-hidden>
        <circle cx="16" cy="16" r="15" fill={ACC} />
        <path d="M9 19c2-4 4-4 6 0s4 4 6 0" stroke="#0b0b0d" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M10 13c1.5-2.6 3-2.6 4.5 0" stroke="#0b0b0d" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </svg>
      {!small && <span className="text-[17px] font-extrabold tracking-tight">Otoha</span>}
    </span>
  )
}

function Eq({ playing, reduce, className = '' }: { playing: boolean; reduce: boolean; className?: string }) {
  return (
    <span className={`inline-flex h-3.5 items-end gap-[2px] ${className}`} aria-label={playing ? '再生中' : '一時停止中'} role="img">
      {[0.9, 0.55, 1.15, 0.7].map((d, i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom rounded-[1px]"
          style={{
            height: '100%',
            background: ACC,
            transform: `scaleY(${[0.55, 0.9, 0.4, 0.75][i]})`,
            animation: playing && !reduce ? `ms-eq ${d}s ease-in-out ${i * -0.23}s infinite` : undefined,
          }}
        />
      ))}
    </span>
  )
}

function Tip({ label, children, side = 'top' }: { label: string; children: ReactNode; side?: 'top' | 'right' | 'bottom' }) {
  const pos =
    side === 'top'
      ? 'bottom-full left-1/2 mb-2 -translate-x-1/2'
      : side === 'bottom'
        ? 'top-full left-1/2 mt-2 -translate-x-1/2'
        : 'left-full top-1/2 ml-2 -translate-y-1/2'
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-[#2a2a2e] px-2 py-1 text-[11.5px] font-semibold text-white opacity-0 shadow-lg transition-opacity delay-300 duration-150 group-hover/tip:opacity-100 ${pos}`}
      >
        {label}
      </span>
    </span>
  )
}

function RoundBtn({
  label,
  onClick,
  children,
  active,
  className = '',
  tip = true,
  side,
  pressed,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  active?: boolean
  className?: string
  tip?: boolean
  side?: 'top' | 'right' | 'bottom'
  pressed?: boolean
}) {
  const b = (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-white active:scale-95 ${active ? '' : 'text-white/70 hover:text-white'} ${className}`}
      style={active ? { color: ACC } : undefined}
    >
      {children}
      {active && <span className="absolute bottom-0 h-1 w-1 rounded-full" style={{ background: ACC }} />}
    </button>
  )
  return tip ? (
    <Tip label={label} side={side}>
      {b}
    </Tip>
  ) : (
    b
  )
}

function PlayFab({ playing, onClick, size = 48, label }: { playing: boolean; onClick: (e: ReactMouseEvent) => void; size?: number; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick(e)
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className="grid shrink-0 place-items-center rounded-full text-black shadow-[0_8px_18px_rgba(0,0,0,0.4)] outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-white active:scale-95"
      style={{ width: size, height: size, background: ACC }}
    >
      {playing ? <Pause style={{ width: size * 0.42, height: size * 0.42 }} fill="currentColor" /> : <Play style={{ width: size * 0.42, height: size * 0.42, marginLeft: size * 0.05 }} fill="currentColor" />}
    </button>
  )
}

function HeartBtn({ on, onClick, size = 16, className = '' }: { on: boolean; onClick: () => void; size?: number; className?: string }) {
  const { reduce } = useApp()
  return (
    <button
      type="button"
      aria-label={on ? 'お気に入りから削除' : 'お気に入りに追加'}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-white ${on ? '' : 'text-white/60 hover:text-white'} ${className}`}
      style={on ? { color: ACC } : undefined}
    >
      <motion.span key={String(on)} initial={on && !reduce ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }} className="grid">
        <Heart style={{ width: size, height: size }} fill={on ? 'currentColor' : 'none'} strokeWidth={2.2} />
      </motion.span>
      <AnimatePresence>
        {on && !reduce && (
          <motion.span
            key="ring"
            initial={{ scale: 0.4, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="pointer-events-none absolute inset-1 rounded-full border-2"
            style={{ borderColor: ACC }}
          />
        )}
      </AnimatePresence>
    </button>
  )
}

/* ───────────── シークバー・音量 ───────────── */

function Progress({ dur, onSeek, big }: { dur: number; onSeek: (t: number) => void; big?: boolean }) {
  const pos = usePos()
  const ref = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const shown = drag ?? Math.min(pos, dur)
  const at = (x: number) => {
    const r = ref.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (x - r.left) / r.width)) * dur
  }
  return (
    <div className={`flex w-full items-center gap-2 text-[11px] tabular-nums text-white/65 ${big ? 'flex-wrap' : ''}`}>
      <span className={big ? 'order-2 w-1/2' : 'w-10 text-right'}>{fmtDur(shown)}</span>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="再生位置"
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={Math.round(shown)}
        aria-valuetext={`${fmtDur(shown)} / ${fmtDur(dur)}`}
        className={`group/prog relative flex h-4 flex-1 cursor-pointer touch-none items-center rounded outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${big ? 'order-1 basis-full' : ''}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setDrag(at(e.clientX))
        }}
        onPointerMove={(e) => {
          if (drag !== null) setDrag(at(e.clientX))
        }}
        onPointerUp={(e) => {
          if (drag === null) return
          onSeek(at(e.clientX))
          setDrag(null)
        }}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, pos - 5))
          else if (e.key === 'ArrowRight') onSeek(Math.min(dur, pos + 5))
          else return
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <div className={`relative w-full overflow-hidden rounded-full bg-white/25 ${big ? 'h-1.5' : 'h-1'}`}>
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${drag !== null ? '' : 'bg-white group-hover/prog:bg-[var(--acc)]'}`}
            style={{ width: `${(shown / dur) * 100}%`, background: drag !== null ? ACC : undefined, ['--acc' as string]: ACC } as CSSProperties}
          />
        </div>
        <span
          className={`pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow transition-opacity ${drag !== null || big ? 'opacity-100' : 'opacity-0 group-hover/prog:opacity-100 group-focus-visible/prog:opacity-100'}`}
          style={{ left: `${(shown / dur) * 100}%` }}
        />
      </div>
      <span className={big ? 'order-3 w-[calc(50%-8px)] text-right' : 'w-10'}>{fmtDur(dur)}</span>
    </div>
  )
}

function VolumeSlider({ volume, muted, onChange, onMute }: { volume: number; muted: boolean; onChange: (v: number) => void; onMute: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const v = muted ? 0 : volume
  const Icon = v === 0 ? VolumeX : v < 0.5 ? Volume1 : Volume2
  const set = (x: number) => {
    const r = ref.current!.getBoundingClientRect()
    onChange(Math.min(1, Math.max(0, (x - r.left) / r.width)))
  }
  return (
    <div className="flex items-center gap-1">
      <RoundBtn label={v === 0 ? 'ミュート解除' : 'ミュート'} onClick={onMute}>
        <Icon className="h-[18px] w-[18px]" />
      </RoundBtn>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="音量"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        className="group/vol relative flex h-4 w-[92px] cursor-pointer touch-none items-center rounded outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          set(e.clientX)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e.clientX)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(0, v - 0.05))
          else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(1, v + 0.05))
          else return
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-colors group-hover/vol:bg-[var(--acc)]" style={{ width: `${v * 100}%`, ['--acc' as string]: ACC } as CSSProperties} />
        </div>
        <span className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/vol:opacity-100" style={{ left: `${v * 100}%` }} />
      </div>
    </div>
  )
}

/* ───────────── 曲の行 ───────────── */

const TrackRow = memo(function TrackRow({
  track,
  index,
  ctxId,
  playlistMode,
  added,
  isCurrent,
  isPlaying,
  liked,
  selected,
  onSelect,
}: {
  track: Track
  index: number
  ctxId: string
  playlistMode: boolean
  added?: string
  isCurrent: boolean
  isPlaying: boolean
  liked: boolean
  selected: boolean
  onSelect: (id: string) => void
}) {
  const app = useApp()
  const album = ALBUM_BY_ID[track.albumId]
  const play = () => (isCurrent ? app.toggle() : app.playCol(ctxId, track.id))
  const cols = playlistMode
    ? 'grid-cols-[minmax(0,1fr)_auto] @xl/main:grid-cols-[24px_minmax(0,1fr)_auto] @4xl/main:grid-cols-[24px_minmax(0,5fr)_minmax(0,3fr)_minmax(0,2fr)_auto]'
    : 'grid-cols-[minmax(0,1fr)_auto] @xl/main:grid-cols-[24px_minmax(0,1fr)_auto]'
  return (
    <div
      role="row"
      tabIndex={0}
      aria-selected={selected}
      aria-label={`${track.title} — ${track.artist}`}
      onClick={() => (app.narrow ? play() : onSelect(track.id))}
      onDoubleClick={play}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          play()
          e.preventDefault()
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        app.openMenu(e, track.id, ctxId)
      }}
      className={`group grid h-14 cursor-default items-center gap-3 rounded-md px-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60 @xl/main:gap-4 @xl/main:px-4 ${cols} ${selected ? 'bg-white/[0.14]' : 'hover:bg-white/[0.07]'}`}
    >
      <div className="relative hidden h-full items-center justify-end @xl/main:flex">
        {isCurrent && isPlaying ? (
          <>
            <Eq playing reduce={app.reduce} className="group-hover:hidden" />
            <button type="button" aria-label="一時停止" onClick={(e) => (e.stopPropagation(), app.toggle())} className="hidden text-white outline-none group-hover:block">
              <Pause className="h-4 w-4" fill="currentColor" />
            </button>
          </>
        ) : (
          <>
            <span className="text-[14px] tabular-nums text-white/60 group-hover:hidden" style={isCurrent ? { color: ACC } : undefined}>
              {index + 1}
            </span>
            <button type="button" aria-label={`${track.title}を再生`} onClick={(e) => (e.stopPropagation(), play())} className="hidden text-white outline-none group-hover:block">
              <Play className="h-4 w-4" fill="currentColor" />
            </button>
          </>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-3">
        {(playlistMode || app.narrow) && <CoverArt cover={album.cover} className="h-10 w-10 shrink-0 rounded" />}
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium leading-tight" style={isCurrent ? { color: ACC } : undefined}>
            {track.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-white/60">
            {track.explicit && <span className="rounded-[2px] bg-white/60 px-1 text-[9px] font-bold text-black">E</span>}
            {isCurrent && isPlaying && app.narrow && <Eq playing reduce={app.reduce} className="h-2.5 shrink-0" />}
            <span className="truncate group-hover:text-white/85">{track.artist}</span>
          </p>
        </div>
      </div>
      {playlistMode && (
        <button
          type="button"
          onClick={(e) => (e.stopPropagation(), app.go({ v: 'col', id: album.id }))}
          className="hidden truncate text-left text-[13px] text-white/60 outline-none hover:text-white hover:underline focus-visible:underline @4xl/main:block"
        >
          {album.title}
        </button>
      )}
      {playlistMode && <span className="hidden truncate text-[13px] text-white/60 @4xl/main:block">{added}</span>}
      <div className="flex items-center gap-1 @xl/main:gap-3">
        <HeartBtn on={liked} onClick={() => app.toggleLike(track.id)} className={liked ? '' : 'opacity-100 @xl/main:opacity-0 @xl/main:group-hover:opacity-100 @xl/main:focus-visible:opacity-100'} />
        <span className="hidden w-10 text-right text-[13px] tabular-nums text-white/60 @xl/main:block">{fmtDur(track.dur)}</span>
        <button
          type="button"
          aria-label={`${track.title}のその他のオプション`}
          onClick={(e) => {
            e.stopPropagation()
            app.openMenu(e, track.id, ctxId)
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          className="grid h-8 w-8 place-items-center rounded-full text-white/70 outline-none hover:text-white focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white @xl/main:opacity-0 @xl/main:group-hover:opacity-100"
        >
          <Ellipsis className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  )
})

/* ───────────── メインビューの上部バー ───────────── */

function TopBar({ canBack, canFwd, onBack, onFwd, children, bg, solid }: { canBack: boolean; canFwd: boolean; onBack: () => void; onFwd: () => void; children?: ReactNode; bg: string; solid: boolean }) {
  const { narrow } = useApp()
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center gap-2 px-3 @xl/main:px-5">
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-300" style={{ background: bg, opacity: solid ? 1 : 0 }} />
      {narrow && canBack && (
        <button type="button" aria-label="戻る" onClick={onBack} className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/60 outline-none focus-visible:ring-2 focus-visible:ring-white">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {!narrow && (
        <div className="relative flex gap-2">
          <button type="button" aria-label="戻る" disabled={!canBack} onClick={onBack} className="grid h-8 w-8 place-items-center rounded-full bg-black/60 outline-none transition hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="進む" disabled={!canFwd} onClick={onFwd} className="grid h-8 w-8 place-items-center rounded-full bg-black/60 outline-none transition hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className="relative flex min-w-0 flex-1 items-center gap-3">{children}</div>
      <div className="relative">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-black/60">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f5a524] text-[11px] font-bold text-black">ゆ</span>
        </span>
      </div>
    </div>
  )
}

/* ───────────── カード・棚 ───────────── */

function CollectionCard({ id, round }: { id: string; round?: boolean }) {
  const app = useApp()
  const c = app.col(id)
  if (!c) return null
  const active = app.ctxId === id
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => app.go({ v: 'col', id })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') app.go({ v: 'col', id })
      }}
      className="group w-[148px] shrink-0 cursor-pointer snap-start rounded-lg p-2.5 outline-none transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/60 @3xl/main:w-[170px]"
    >
      <div className="relative">
        <CoverArt cover={c.cover} className={`aspect-square w-full shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${round ? 'rounded-full' : 'rounded-md'}`} />
        <div
          className={`absolute bottom-2 right-2 transition duration-300 ${active && app.playing ? 'translate-y-0 opacity-100' : app.reduce ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100'}`}
        >
          <PlayFab playing={active && app.playing} onClick={() => (active ? app.toggle() : app.playCol(id))} label={active && app.playing ? `${c.title}を一時停止` : `${c.title}を再生`} />
        </div>
      </div>
      <p className="mt-2.5 truncate text-[14px] font-semibold" style={active ? { color: ACC } : undefined}>
        {c.title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-white/60">{c.isMix ? c.desc : c.album ? `${c.album.year}・${c.sub}` : `${c.kind}・${c.sub}`}</p>
    </div>
  )
}

function Shelf({ title, ids, sub }: { title: string; ids: string[]; sub?: string }) {
  const [all, setAll] = useState(false)
  return (
    <section className="mt-6">
      <div className="flex items-end justify-between gap-3 px-3 @xl/main:px-5">
        <div className="min-w-0">
          {sub && <p className="text-[12px] text-white/55">{sub}</p>}
          <h2 className="truncate text-[20px] font-bold tracking-tight hover:underline">{title}</h2>
        </div>
        <button type="button" onClick={() => setAll((v) => !v)} className="shrink-0 rounded text-[12.5px] font-bold text-white/60 outline-none hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white/60">
          {all ? '折りたたむ' : 'すべて表示'}
        </button>
      </div>
      <div className={`mt-2 px-1.5 @xl/main:px-3.5 ${all ? 'flex flex-wrap' : 'flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]'}`}>
        {ids.map((id) => (
          <CollectionCard key={id} id={id} />
        ))}
      </div>
    </section>
  )
}

/* ───────────── ホーム ───────────── */

const QUICK = ['liked', 'pl-drive', 'mix-1', 'al-yakou', 'al-koi', 'pl-coffee', 'al-onshitsu', 'mix-2']

function QuickTile({ id, onTint }: { id: string; onTint: (c: RGB) => void }) {
  const app = useApp()
  const ref = useRef<SVGSVGElement>(null)
  const c = app.col(id)!
  const active = app.ctxId === id
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => app.go({ v: 'col', id })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') app.go({ v: 'col', id })
      }}
      onPointerEnter={() => {
        if (ref.current) void extractColor(ref.current, c.cover.id).then((x) => x && onTint(x))
      }}
      onFocus={() => {
        if (ref.current) void extractColor(ref.current, c.cover.id).then((x) => x && onTint(x))
      }}
      className="group relative flex h-14 cursor-pointer items-center overflow-hidden rounded-md bg-white/[0.08] pr-2 outline-none transition-colors hover:bg-white/[0.18] focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <CoverArt ref={ref} cover={c.cover} className="h-14 w-14 shrink-0 shadow-[4px_0_12px_rgba(0,0,0,0.35)]" />
      <p className="min-w-0 flex-1 truncate px-3 text-[13.5px] font-bold">{c.title}</p>
      {active && app.playing ? (
        <span className="mr-1 group-hover:hidden">
          <Eq playing reduce={app.reduce} />
        </span>
      ) : null}
      <span className={`absolute right-2 top-1/2 -translate-y-1/2 ${active && app.playing ? 'hidden group-hover:block' : 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'}`}>
        <PlayFab size={34} playing={active && app.playing} onClick={() => (active ? app.toggle() : app.playCol(id))} label={`${c.title}を再生`} />
      </span>
    </div>
  )
}

function HomeView({ nav }: { nav: NavProps }) {
  const app = useApp()
  const [tint, setTint] = useState<RGB>([74, 52, 140])
  const [chip, setChip] = useState<'all' | 'music' | 'playlists'>('all')
  const [scrolled, setScrolled] = useState(false)
  const h = new Date().getHours()
  const hello = h < 5 ? 'こんばんは' : h < 11 ? 'おはようございます' : h < 18 ? 'こんにちは' : 'こんばんは'
  return (
    <Scroller onScrolled={setScrolled}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] transition-[background-color] duration-700" style={{ backgroundColor: rgba(tint, 1), maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.85), transparent)' }} />
      <TopBar {...nav} bg={rgba(tint, 1)} solid={scrolled}>
        {(
          [
            ['all', 'すべて'],
            ['music', '音楽'],
            ['playlists', 'プレイリスト'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={chip === k}
            onClick={() => setChip(k)}
            className={`h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-white ${chip === k ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}
          >
            {l}
          </button>
        ))}
      </TopBar>
      <div className="relative pb-8">
        <h1 className="px-3 pt-1 text-[22px] font-bold tracking-tight @xl/main:px-5 @3xl/main:text-[26px]">{hello}</h1>
        <div className="mt-3 grid grid-cols-2 gap-2 px-3 @xl/main:px-5 @3xl/main:grid-cols-4">
          {QUICK.map((id) => (
            <QuickTile key={id} id={id} onTint={setTint} />
          ))}
        </div>
        {chip !== 'music' && <Shelf title="あなたにおすすめのミックス" sub="ゆうき さんのために作成" ids={['mix-1', 'mix-2', 'mix-3', 'mix-radar']} />}
        {chip !== 'playlists' && <Shelf title="最近再生した項目" ids={['al-yakou', 'al-gunjo', 'al-koi', 'al-paper', 'al-laundro', 'al-mori']} />}
        {chip !== 'music' && <Shelf title="あなたのプレイリスト" ids={app.playlists.filter((p) => p.owner === 'あなた' && p.id !== 'liked').map((p) => p.id)} />}
        {chip !== 'playlists' && <Shelf title="新作リリース" sub="フォロー中のアーティストから" ids={['al-onshitsu', 'al-koi', 'al-solar', 'al-yakou', 'al-laundro']} />}
      </div>
    </Scroller>
  )
}

/* ───────────── スクロール領域 ───────────── */

function Scroller({ children, onScrolled, threshold = 40, bg }: { children: ReactNode; onScrolled?: (v: boolean) => void; threshold?: number; bg?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { narrow } = useApp()
  return (
    <div
      ref={ref}
      onScroll={(e) => onScrolled?.(e.currentTarget.scrollTop > threshold)}
      className={`relative h-full overflow-y-auto overscroll-contain [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin] ${narrow ? 'pb-24' : ''}`}
      style={bg ? { background: bg } : undefined}
    >
      {children}
    </div>
  )
}

/* ───────────── アルバム/プレイリスト ───────────── */

function CollectionView({ id, nav }: { id: string; nav: NavProps }) {
  const app = useApp()
  const c = app.col(id)
  const coverRef = useRef<SVGSVGElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const color = useCoverColor(coverRef, c?.cover ?? { id: 'none', liked: true })
  if (!c) return null
  const active = app.ctxId === id
  const total = c.tracks.reduce((s, t) => s + TRACKS[t].dur, 0)
  const playlistMode = !c.album
  const saved = c.album ? app.saved.includes(c.id) : false
  const artist = c.album ? ARTISTS.find((a) => a.id === c.album!.artistId) : null
  const recs = c.editable && c.tracks.length < 3 ? Object.values(TRACKS).filter((t) => !c.tracks.includes(t.id)).slice(3, 8) : []
  return (
    <Scroller onScrolled={setScrolled} threshold={210}>
      <TopBar {...nav} bg={`linear-gradient(${rgba(color, 1)}, ${rgba(color, 1)}), #000`} solid={scrolled}>
        <motion.div className="flex min-w-0 items-center gap-2.5" animate={{ opacity: scrolled ? 1 : 0, y: scrolled ? 0 : 6 }} transition={{ duration: 0.2 }} aria-hidden={!scrolled}>
          <PlayFab size={36} playing={active && app.playing} onClick={() => (active ? app.toggle() : app.playCol(id))} label={active && app.playing ? '一時停止' : '再生'} />
          <span className="truncate text-[18px] font-bold">{c.title}</span>
        </motion.div>
      </TopBar>
      <header className="relative -mt-14 px-3 pb-5 pt-16 @xl/main:px-5" style={{ background: `linear-gradient(180deg, ${rgba(color, 1)} 0%, ${rgba(color, 0.75)} 100%)` }}>
        <div className="flex flex-col items-center gap-4 @xl/main:flex-row @xl/main:items-end @xl/main:gap-6">
          <CoverArt ref={coverRef} cover={c.cover} label={`${c.title}のジャケット`} className="w-[150px] shrink-0 rounded shadow-[0_8px_40px_rgba(0,0,0,0.55)] @xl/main:w-[180px] @4xl/main:w-[210px]" />
          <div className="min-w-0 self-stretch @xl/main:self-auto">
            <p className="text-[12.5px] font-semibold">{c.kind}</p>
            <h1 className="mt-1 break-words text-[28px] font-black leading-[1.05] tracking-tight @xl/main:text-[40px] @4xl/main:text-[56px]">{c.title}</h1>
            {c.desc && !c.isMix && <p className="mt-2 text-[13px] text-white/70">{c.desc}</p>}
            {c.isMix && <p className="mt-2 text-[13px] text-white/70">{c.desc}</p>}
            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px]">
              {artist ? <ArtistAvatar name={artist.name} hue={artist.hue} className="h-6 w-6 rounded-full" /> : <Logo small />}
              <span className="font-bold">{c.sub}</span>
              {c.album && <span className="text-white/75">・{c.album.year}</span>}
              <span className="text-white/75">・{c.tracks.length}曲</span>
              {c.tracks.length > 0 && <span className="text-white/60">, {fmtTotal(total)}</span>}
            </p>
          </div>
        </div>
      </header>
      <div className="relative min-h-[calc(100%-260px)]" style={{ background: `linear-gradient(180deg, ${rgba(color, 0.42)} 0, ${BG} 240px)` }}>
        <div className="flex items-center gap-4 px-3 py-4 @xl/main:px-5">
          {c.tracks.length > 0 && <PlayFab size={54} playing={active && app.playing} onClick={() => (active ? app.toggle() : app.playCol(id))} label={active && app.playing ? '一時停止' : `${c.title}を再生`} />}
          <RoundBtn label={app.shuffle ? 'シャッフルをオフ' : 'シャッフル再生'} onClick={() => app.setShuffle(!app.shuffle)} active={app.shuffle} className="h-10 w-10" pressed={app.shuffle}>
            <Shuffle className="h-6 w-6" />
          </RoundBtn>
          {c.album && (
            <RoundBtn label={saved ? 'ライブラリから削除' : 'ライブラリに保存'} onClick={() => app.toggleSave(c.id)} className="h-10 w-10" pressed={saved}>
              {saved ? <CircleCheck className="h-7 w-7" fill={ACC} color="#000" /> : <CirclePlus className="h-7 w-7" />}
            </RoundBtn>
          )}
          {c.tracks.length > 0 && (
            <RoundBtn label="すべてキューに追加" onClick={() => c.tracks.forEach((t) => app.addToPlaylist('__queue', t))} className="h-10 w-10">
              <ListPlus className="h-6 w-6" />
            </RoundBtn>
          )}
        </div>
        {c.tracks.length > 0 ? (
          <div role="grid" aria-label={`${c.title}の曲`} className="px-1.5 pb-4 @xl/main:px-3.5">
            <div
              role="row"
              className={`mb-2 grid h-9 items-center gap-3 border-b border-white/10 px-2 text-[12.5px] text-white/55 @xl/main:gap-4 @xl/main:px-4 ${playlistMode ? 'grid-cols-[minmax(0,1fr)_auto] @xl/main:grid-cols-[24px_minmax(0,1fr)_auto] @4xl/main:grid-cols-[24px_minmax(0,5fr)_minmax(0,3fr)_minmax(0,2fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto] @xl/main:grid-cols-[24px_minmax(0,1fr)_auto]'}`}
            >
              <span className="hidden text-right @xl/main:block">#</span>
              <span>タイトル</span>
              {playlistMode && <span className="hidden @4xl/main:block">アルバム</span>}
              {playlistMode && <span className="hidden @4xl/main:block">追加日</span>}
              <span className="flex items-center justify-end gap-3 pr-10">
                <Clock3 className="hidden h-4 w-4 @xl/main:block" aria-label="再生時間" />
              </span>
            </div>
            {c.tracks.map((t, i) => (
              <TrackRow
                key={t}
                track={TRACKS[t]}
                index={i}
                ctxId={id}
                playlistMode={playlistMode}
                added={ADDED_LABEL(i + id.length)}
                isCurrent={active && app.current.id === t}
                isPlaying={app.playing}
                liked={app.liked.includes(t)}
                selected={sel === t}
                onSelect={setSel}
              />
            ))}
          </div>
        ) : (
          <div className="px-3 pb-4 @xl/main:px-5">
            <p className="text-[15px] font-semibold">このプレイリストはまだ空です</p>
            <p className="mt-1 text-[13px] text-white/60">気になる曲を追加しましょう。</p>
          </div>
        )}
        {recs.length > 0 && (
          <div className="px-3 pb-6 @xl/main:px-5">
            <h3 className="text-[17px] font-bold">おすすめ</h3>
            <p className="text-[12.5px] text-white/55">このプレイリストのタイトルをもとに選びました</p>
            <ul className="mt-2">
              {recs.map((t) => (
                <li key={t.id} className="flex h-14 items-center gap-3 rounded-md px-2 hover:bg-white/[0.07]">
                  <CoverArt cover={ALBUM_BY_ID[t.albumId].cover} className="h-10 w-10 rounded" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px]">{t.title}</p>
                    <p className="truncate text-[12.5px] text-white/60">{t.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => app.addToPlaylist(c.id, t.id)}
                    className="rounded-full border border-white/50 px-3.5 py-1 text-[13px] font-semibold outline-none hover:scale-105 hover:border-white focus-visible:ring-2 focus-visible:ring-white"
                  >
                    追加
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {c.album && (
          <div className="px-3 pb-8 text-[12px] text-white/55 @xl/main:px-5">
            <p className="text-[13.5px] text-white/80">{c.album.date}</p>
            <p className="mt-1">℗ {c.album.year} Otoha Records(架空のレーベル)</p>
          </div>
        )}
      </div>
    </Scroller>
  )
}

/* ───────────── 検索 ───────────── */

function SearchView({ nav }: { nav: NavProps }) {
  const app = useApp()
  const [q, setQ] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const s = q.trim().toLowerCase()
  const albums = s ? ALBUMS.filter((a) => `${a.title} ${a.artist} ${a.genre}`.toLowerCase().includes(s)) : []
  const tracks = s ? Object.values(TRACKS).filter((t) => `${t.title} ${t.artist} ${ALBUM_BY_ID[t.albumId].genre}`.toLowerCase().includes(s)).slice(0, 5) : []
  const top = albums[0]
  return (
    <Scroller onScrolled={setScrolled} threshold={8}>
      <TopBar {...nav} bg={BG} solid={scrolled}>
        <label className="flex h-10 w-full max-w-[380px] items-center gap-2 rounded-full bg-white/[0.1] px-3 ring-white/80 transition focus-within:bg-white/[0.14] focus-within:ring-2 hover:bg-white/[0.14]">
          <Search className="h-5 w-5 shrink-0 text-white/70" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="何を聴きたいですか？"
            aria-label="曲・アルバム・アーティストを検索"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-white/50"
          />
          {q && (
            <button type="button" aria-label="検索語を消去" onClick={() => setQ('')} className="rounded-full p-0.5 text-white/70 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </TopBar>
      <div className="px-3 pb-8 @xl/main:px-5">
        {!s ? (
          <>
            <h2 className="mt-2 text-[20px] font-bold">ジャンルを探す</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 @3xl/main:grid-cols-4">
              {GENRES.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => setQ(g.name)}
                  className="relative h-24 overflow-hidden rounded-lg p-3 text-left outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white @3xl/main:h-28"
                  style={{ background: g.color }}
                >
                  <span className="relative z-10 text-[16px] font-bold">{g.name}</span>
                  <CoverArt cover={ALBUM_BY_ID[g.cover].cover} className="absolute -bottom-2 -right-4 h-[70px] w-[70px] rotate-[25deg] rounded shadow-[0_4px_14px_rgba(0,0,0,0.4)] @3xl/main:h-20 @3xl/main:w-20" />
                </button>
              ))}
            </div>
          </>
        ) : albums.length === 0 && tracks.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-[18px] font-bold">「{q}」に一致する結果は見つかりませんでした</p>
            <p className="mt-2 text-[13px] text-white/60">キーワードのつづりを確認するか、別のキーワードで検索してください。</p>
          </div>
        ) : (
          <>
            <div className="mt-2 grid gap-5 @4xl/main:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              {top && (
                <section>
                  <h2 className="text-[20px] font-bold">トップの結果</h2>
                  <div
                    role="link"
                    tabIndex={0}
                    onClick={() => app.go({ v: 'col', id: top.id })}
                    onKeyDown={(e) => e.key === 'Enter' && app.go({ v: 'col', id: top.id })}
                    className="group relative mt-2 cursor-pointer rounded-lg bg-white/[0.06] p-5 outline-none transition hover:bg-white/[0.11] focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    <CoverArt cover={top.cover} className="h-24 w-24 rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.5)]" />
                    <p className="mt-4 truncate text-[26px] font-black tracking-tight">{top.title}</p>
                    <p className="mt-1 text-[13px] text-white/60">
                      {top.kind}・<span className="font-semibold text-white">{top.artist}</span>
                    </p>
                    <div className="absolute bottom-5 right-5 translate-y-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                      <PlayFab playing={app.ctxId === top.id && app.playing} onClick={() => (app.ctxId === top.id ? app.toggle() : app.playCol(top.id))} label={`${top.title}を再生`} />
                    </div>
                  </div>
                </section>
              )}
              {tracks.length > 0 && (
                <section className="min-w-0">
                  <h2 className="text-[20px] font-bold">曲</h2>
                  <div className="mt-2">
                    {tracks.map((t, i) => (
                      <TrackRow
                        key={t.id}
                        track={t}
                        index={i}
                        ctxId={t.albumId}
                        playlistMode
                        isCurrent={app.current.id === t.id}
                        isPlaying={app.playing}
                        liked={app.liked.includes(t.id)}
                        selected={false}
                        onSelect={() => {}}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
            {albums.length > 0 && (
              <div className="-mx-3 @xl/main:-mx-5">
                <Shelf title="アルバム" ids={albums.map((a) => a.id)} />
              </div>
            )}
          </>
        )}
      </div>
    </Scroller>
  )
}

/* ───────────── ライブラリ ───────────── */

type LibFilter = 'playlists' | 'albums' | 'artists' | null

function useLibraryItems(filter: LibFilter, q: string) {
  const app = useApp()
  return useMemo(() => {
    const pls = app.playlists.filter((p) => p.owner === 'あなた')
    const items: { id: string; kind: 'pl' | 'al' | 'ar'; title: string; sub: string; cover?: AnyCover; hue?: number; pinned?: boolean; target: string }[] = []
    if (filter === null || filter === 'playlists')
      pls.forEach((p) => items.push({ id: p.id, kind: 'pl', title: p.title, sub: p.id === 'liked' ? `プレイリスト・${app.liked.length}曲` : `プレイリスト・${p.owner}`, cover: p.cover, pinned: p.id === 'liked', target: p.id }))
    if (filter === null || filter === 'albums')
      app.saved.forEach((id) => {
        const a = ALBUM_BY_ID[id]
        items.push({ id, kind: 'al', title: a.title, sub: `${a.kind}・${a.artist}`, cover: a.cover, target: id })
      })
    if (filter === null || filter === 'artists')
      ARTISTS.slice(0, 6).forEach((ar) => items.push({ id: ar.id, kind: 'ar', title: ar.name, sub: 'アーティスト', hue: ar.hue, target: ALBUMS.find((a) => a.artistId === ar.id)!.id }))
    const s = q.trim().toLowerCase()
    return s ? items.filter((it) => it.title.toLowerCase().includes(s)) : items
  }, [app.playlists, app.saved, app.liked.length, filter, q])
}

function LibraryList({ rail, onNavigate }: { rail?: boolean; onNavigate?: () => void }) {
  const app = useApp()
  const [filter, setFilter] = useState<LibFilter>(null)
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const items = useLibraryItems(filter, q)
  const routeId = app.route.v === 'col' ? app.route.id : null
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex shrink-0 items-center ${rail ? 'flex-col gap-2 py-3' : 'justify-between px-4 pb-2 pt-3'}`}>
        <span className="flex items-center gap-2.5 text-[15px] font-bold text-white/80" title={rail ? 'ライブラリ' : undefined}>
          <Library className="h-6 w-6" aria-label={rail ? 'ライブラリ' : undefined} />
          {!rail && 'ライブラリ'}
        </span>
        <RoundBtn label="プレイリストを作成" onClick={app.createPlaylist} tip={false} className="bg-white/[0.06] hover:bg-white/[0.12]">
          <Plus className="h-[18px] w-[18px]" />
        </RoundBtn>
      </div>
      {!rail && (
        <>
          <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {filter && (
              <button type="button" aria-label="フィルターを解除" onClick={() => setFilter(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white">
                <X className="h-4 w-4" />
              </button>
            )}
            {(
              [
                ['playlists', 'プレイリスト'],
                ['albums', 'アルバム'],
                ['artists', 'アーティスト'],
              ] as const
            )
              .filter(([k]) => !filter || filter === k)
              .map(([k, l]) => (
                <motion.button
                  layout={!app.reduce}
                  key={k}
                  type="button"
                  aria-pressed={filter === k}
                  onClick={() => setFilter(filter === k ? null : k)}
                  className={`h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${filter === k ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {l}
                </motion.button>
              ))}
          </div>
          <div className="flex shrink-0 items-center justify-between px-2.5 pb-1">
            {searching ? (
              <label className="flex h-8 items-center gap-1.5 rounded bg-white/10 px-2">
                <Search className="h-4 w-4 text-white/60" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onBlur={() => !q && setSearching(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setQ('')
                      setSearching(false)
                      e.stopPropagation()
                    }
                  }}
                  placeholder="ライブラリ内を検索"
                  aria-label="ライブラリ内を検索"
                  className="w-32 bg-transparent text-[12.5px] outline-none placeholder:text-white/45"
                />
              </label>
            ) : (
              <RoundBtn label="ライブラリ内を検索" onClick={() => setSearching(true)} tip={false}>
                <Search className="h-4 w-4" />
              </RoundBtn>
            )}
            <span className="text-[12.5px] font-medium text-white/60">最近</span>
          </div>
        </>
      )}
      <ul className={`min-h-0 flex-1 overflow-y-auto pb-2 [scrollbar-width:thin] ${rail ? 'px-1.5' : 'px-2'}`}>
        {items.map((it) => {
          const playingHere = app.ctxId === it.target && it.kind !== 'ar'
          const activeRoute = routeId === it.target && it.kind !== 'ar'
          const art =
            it.kind === 'ar' ? (
              <ArtistAvatar name={it.title} hue={it.hue!} className="h-12 w-12 shrink-0 rounded-full" />
            ) : (
              <CoverArt cover={it.cover!} className="h-12 w-12 shrink-0 rounded-md" />
            )
          const btn = (
            <button
              type="button"
              onClick={() => {
                app.go({ v: 'col', id: it.target })
                onNavigate?.()
              }}
              aria-label={rail ? it.title : undefined}
              title={rail ? it.title : undefined}
              aria-current={activeRoute ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-md p-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 ${activeRoute ? 'bg-white/[0.1] hover:bg-white/[0.14]' : 'hover:bg-white/[0.07]'}`}
            >
              {art}
              {!rail && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium" style={playingHere ? { color: ACC } : undefined}>
                    {it.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-white/60">
                    {it.pinned && <Pin className="h-3 w-3 rotate-45" fill={ACC} color={ACC} />}
                    {it.sub}
                  </span>
                </span>
              )}
              {!rail && playingHere && app.playing && <Volume2 className="h-4 w-4 shrink-0" color={ACC} />}
            </button>
          )
          return <li key={`${it.kind}-${it.id}`}>{btn}</li>
        })}
        {items.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-white/55">見つかりませんでした</li>}
      </ul>
    </div>
  )
}

/* ───────────── 歌詞 ───────────── */

function LyricsView({ track, color, onSeek, compact, transparent }: { track: Track; color: RGB; onSeek: (t: number) => void; compact?: boolean; transparent?: boolean }) {
  const pos = usePos()
  const { reduce } = useApp()
  const lines = LYRICS[track.id]
  const box = useRef<HTMLDivElement>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const [sync, setSync] = useState(true)
  let cur = -1
  if (lines) for (let i = 0; i < lines.length; i++) if (lines[i].t <= pos + 0.15) cur = i
  useEffect(() => {
    setSync(true)
  }, [track.id])
  useEffect(() => {
    if (!sync || cur < 0) return
    const el = refs.current[cur]
    const b = box.current
    if (!el || !b) return
    b.scrollTo({ top: el.offsetTop - b.clientHeight * (compact ? 0.3 : 0.32), behavior: reduce ? 'auto' : 'smooth' })
  }, [cur, sync, compact, reduce])
  const stop = () => setSync(false)
  return (
    <div className="relative h-full" style={transparent ? undefined : { background: rgba(color, 1) }}>
      <div
        ref={box}
        onWheel={stop}
        onTouchMove={stop}
        className={`relative h-full overflow-y-auto [scrollbar-width:none] ${compact ? 'px-4 py-10' : 'px-6 py-[30%] @3xl/main:px-12'}`}
      >
        {!lines ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className={`${compact ? 'text-[20px]' : 'text-[28px]'} font-bold`}>{track.instrumental ? 'インストゥルメンタル' : '歌詞はまだありません'}</p>
              <p className="mt-2 text-[13px] text-white/70">{track.instrumental ? 'この曲には歌詞がありません。音だけをお楽しみください。' : 'この曲の歌詞はまだ登録されていません。'}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-1.5">
            {lines.map((l, i) => {
              const state = i < cur ? 'past' : i === cur ? 'now' : 'future'
              return (
                <button
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el
                  }}
                  type="button"
                  onClick={() => {
                    onSeek(l.t)
                    setSync(true)
                  }}
                  aria-current={state === 'now' ? 'true' : undefined}
                  className={`origin-left rounded text-left font-extrabold leading-tight tracking-tight outline-none transition-[color,transform,opacity] duration-300 hover:underline focus-visible:ring-2 focus-visible:ring-white ${compact ? 'text-[19px]' : 'text-[24px] @3xl/main:text-[30px]'} ${state === 'now' ? 'scale-[1.02] text-white' : state === 'past' ? 'text-white/60' : 'text-black/45 hover:text-white/80'}`}
                  style={transparent && state === 'future' ? { color: 'rgba(255,255,255,0.32)' } : undefined}
                >
                  {l.text}
                </button>
              )
            })}
            <p className="mt-10 text-[12px] font-semibold text-white/60">歌詞提供: Otoha Lyrics(架空)</p>
          </div>
        )}
      </div>
      <AnimatePresence>
        {!sync && lines && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => setSync(true)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-black shadow-lg outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-black"
          >
            同期に戻る
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────── キュー ───────────── */

function QueueRow({
  id,
  onPlay,
  onRemove,
  onMove,
  dragValue,
}: {
  id: string
  onPlay: () => void
  onRemove?: () => void
  onMove: (d: -1 | 1) => void
  dragValue: string | QItem
}) {
  const controls = useDragControls()
  const t = TRACKS[id]
  const { reduce } = useApp()
  return (
    <Reorder.Item
      value={dragValue}
      dragListener={false}
      dragControls={controls}
      layout={reduce ? undefined : 'position'}
      className="group relative flex h-14 items-center gap-2 rounded-md bg-transparent pr-1 hover:bg-white/[0.07]"
      whileDrag={{ scale: 1.02, backgroundColor: 'rgba(40,40,46,0.95)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
    >
      <button
        type="button"
        aria-label={`${t.title}を並べ替え (Alt+↑↓)`}
        onPointerDown={(e) => controls.start(e)}
        onKeyDown={(e) => {
          if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            onMove(e.key === 'ArrowUp' ? -1 : 1)
            e.preventDefault()
          }
        }}
        className="grid h-10 w-6 shrink-0 cursor-grab touch-none place-items-center rounded text-white/35 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onPlay} className="flex min-w-0 flex-1 items-center gap-2.5 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-white/60">
        <CoverArt cover={ALBUM_BY_ID[t.albumId].cover} className="h-10 w-10 shrink-0 rounded" />
        <span className="min-w-0">
          <span className="block truncate text-[14px]">{t.title}</span>
          <span className="block truncate text-[12px] text-white/60">{t.artist}</span>
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={`${t.title}をキューから削除`}
          onClick={onRemove}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 opacity-0 outline-none hover:text-white focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </Reorder.Item>
  )
}

function QueuePanel({
  queue,
  setQueue,
  upNext,
  setUpNext,
  ctxTitle,
  onJumpQueue,
  onJumpCtx,
  onClose,
}: {
  queue: QItem[]
  setQueue: (q: QItem[]) => void
  upNext: string[]
  setUpNext: (ids: string[]) => void
  ctxTitle: string
  onJumpQueue: (uid: number) => void
  onJumpCtx: (id: string) => void
  onClose: () => void
}) {
  const app = useApp()
  const t = app.current
  const moveIn = <T,>(arr: T[], i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= arr.length) return arr
    const a = [...arr]
    ;[a[i], a[j]] = [a[j], a[i]]
    return a
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between pl-4 pr-2">
        <h2 className="text-[16px] font-bold">キュー</h2>
        <RoundBtn label="閉じる" onClick={onClose} tip={false}>
          <X className="h-5 w-5" />
        </RoundBtn>
      </div>
      <motion.div layoutScroll className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 [scrollbar-width:thin]">
        <p className="px-2 pb-1 text-[14px] font-bold">再生中</p>
        <div className="flex h-14 items-center gap-2.5 rounded-md px-2">
          <CoverArt cover={ALBUM_BY_ID[t.albumId].cover} className="h-10 w-10 shrink-0 rounded" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px]" style={{ color: ACC }}>
              {t.title}
            </p>
            <p className="truncate text-[12px] text-white/60">{t.artist}</p>
          </div>
          {app.playing && <Eq playing reduce={app.reduce} />}
        </div>
        {queue.length > 0 && (
          <>
            <div className="mt-4 flex items-center justify-between px-2 pb-1">
              <p className="text-[14px] font-bold">次に再生</p>
              <button type="button" onClick={() => setQueue([])} className="rounded text-[12px] font-semibold text-white/60 outline-none hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white">
                キューをクリア
              </button>
            </div>
            <Reorder.Group as="div" axis="y" values={queue} onReorder={setQueue}>
              {queue.map((q, i) => (
                <QueueRow
                  key={q.uid}
                  id={q.id}
                  dragValue={q}
                  onPlay={() => onJumpQueue(q.uid)}
                  onRemove={() => setQueue(queue.filter((x) => x.uid !== q.uid))}
                  onMove={(d) => setQueue(moveIn(queue, i, d))}
                />
              ))}
            </Reorder.Group>
          </>
        )}
        <p className="mt-4 truncate px-2 pb-1 text-[14px] font-bold">
          次の曲: <span className="text-white/70">{ctxTitle}</span>
        </p>
        {upNext.length === 0 ? (
          <p className="px-2 py-3 text-[12.5px] text-white/50">このあとに再生する曲はありません</p>
        ) : (
          <Reorder.Group as="div" axis="y" values={upNext} onReorder={setUpNext}>
            {upNext.map((id, i) => (
              <QueueRow key={id} id={id} dragValue={id} onPlay={() => onJumpCtx(id)} onMove={(d) => setUpNext(moveIn(upNext, i, d))} />
            ))}
          </Reorder.Group>
        )}
      </motion.div>
    </div>
  )
}

/* ───────────── 本体 ───────────── */

type NavProps = { canBack: boolean; canFwd: boolean; onBack: () => void; onFwd: () => void }

export function MusicStreaming() {
  const reduce = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 1200, h: 600 })
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const narrow = size.w < 700
  const sidebar: 'none' | 'rail' | 'full' = narrow ? 'none' : size.w >= 1040 ? 'full' : 'rail'

  const clock = useMemo(makeClock, [])
  const [hist, setHist] = useState<{ stack: Route[]; i: number }>({ stack: [{ v: 'home' }], i: 0 })
  const route = hist.stack[hist.i]
  const [mainMode, setMainMode] = useState<'view' | 'lyrics'>('view')
  const [queueOpen, setQueueOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [expLyrics, setExpLyrics] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>(PLAYLISTS)
  const [liked, setLiked] = useState<string[]>(LIKED_INITIAL)
  const [saved, setSaved] = useState<string[]>(['al-yakou', 'al-paper', 'al-gunjo', 'al-koi', 'al-laundro'])
  const [player, setPlayer] = useState({ trackId: 'al-yakou-1', ctxId: 'al-yakou', order: ALBUM_BY_ID['al-yakou'].tracks, playing: false })
  const [shuffle, setShuffleState] = useState(false)
  const [repeat, setRepeat] = useState<Repeat>('off')
  const [queue, setQueue] = useState<QItem[]>([])
  const [volume, setVolume] = useState(0.6)
  const [muted, setMuted] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [menu, setMenu] = useState<{ x: number; y: number; trackId: string; ctxId?: string } | null>(null)
  const [toastMsg, setToastMsg] = useState<{ k: number; text: string } | null>(null)
  const uid = useRef(1)

  const current = TRACKS[player.trackId]
  const curAlbum = ALBUM_BY_ID[current.albumId]

  const toast = useCallback((text: string) => setToastMsg({ k: performance.now(), text }), [])
  useEffect(() => {
    if (!toastMsg) return
    const id = window.setTimeout(() => setToastMsg(null), 2200)
    return () => window.clearTimeout(id)
  }, [toastMsg])

  const col = useCallback(
    (id: string): Col | null => {
      const a = ALBUM_BY_ID[id]
      if (a) return { id, kind: a.kind, title: a.title, sub: a.artist, cover: a.cover, tracks: a.tracks, album: a, editable: false, isMix: false }
      const p = playlists.find((x) => x.id === id)
      if (!p) return null
      return {
        id,
        kind: p.kind === 'ミックス' ? 'プレイリスト' : '公開プレイリスト',
        title: p.title,
        sub: p.owner === 'あなた' ? 'ゆうき' : p.owner,
        desc: p.desc,
        cover: p.cover,
        tracks: id === 'liked' ? liked : p.tracks,
        editable: p.owner === 'あなた' && id !== 'liked',
        isMix: p.kind === 'ミックス',
      }
    },
    [playlists, liked],
  )

  const go = useCallback((r: Route) => {
    setMainMode('view')
    setHist((h) => {
      const cur = h.stack[h.i]
      if (JSON.stringify(cur) === JSON.stringify(r)) return h
      const stack = [...h.stack.slice(0, h.i + 1), r]
      return { stack, i: stack.length - 1 }
    })
  }, [])
  const nav: NavProps = {
    canBack: hist.i > 0,
    canFwd: hist.i < hist.stack.length - 1,
    onBack: () => setHist((h) => ({ ...h, i: Math.max(0, h.i - 1) })),
    onFwd: () => setHist((h) => ({ ...h, i: Math.min(h.stack.length - 1, h.i + 1) })),
  }

  /* 音(Tone.js) */
  const engine = useRef<SynthEngine | null>(null)
  const live = useRef({ player, volume, muted, soundOn })
  useLayoutEffect(() => {
    live.current = { player, volume, muted, soundOn }
  })
  const syncEngine = useCallback(() => {
    const e = engine.current
    const L = live.current
    if (!e) return
    const t = TRACKS[L.player.trackId]
    e.setTrack(ALBUM_BY_ID[t.albumId].sound, hashStr(t.id))
    e.setVolume(L.volume, L.muted)
    if (L.player.playing && L.soundOn) e.play()
    else e.pause()
  }, [])
  const kickAudio = useCallback(() => {
    if (!live.current.soundOn) return
    if (!engine.current) engine.current = new SynthEngine()
    void engine.current.ensure().then(() => syncEngine())
  }, [syncEngine])
  useEffect(() => {
    const e = engine.current
    if (!e) return
    const t = TRACKS[player.trackId]
    e.setTrack(ALBUM_BY_ID[t.albumId].sound, hashStr(t.id))
  }, [player.trackId])
  useEffect(() => {
    const e = engine.current
    if (!e) return
    if (player.playing && soundOn) e.play()
    else e.pause()
  }, [player.playing, soundOn])
  useEffect(() => {
    engine.current?.setVolume(volume, muted)
  }, [volume, muted])
  useEffect(() => () => engine.current?.dispose(), [])

  /* 再生操作 */
  const playCol = useCallback(
    (id: string, trackId?: string) => {
      const c = col(id)
      if (!c || !c.tracks.length) return
      const sh = shuffleRef.current
      const start = trackId ?? (sh ? c.tracks[hashStr(id + Date.now()) % c.tracks.length] : c.tracks[0])
      const order = sh ? [start, ...shuffled(c.tracks.filter((t) => t !== start), Date.now())] : c.tracks
      setPlayer({ trackId: start, ctxId: id, order, playing: true })
      clock.set(0)
      kickAudio()
    },
    [col, clock, kickAudio],
  )
  const shuffleRef = useRef(shuffle)
  shuffleRef.current = shuffle
  const toggle = useCallback(() => {
    setPlayer((p) => ({ ...p, playing: !p.playing }))
    kickAudio()
  }, [kickAudio])

  const setShuffle = useCallback(
    (v: boolean) => {
      setShuffleState(v)
      setPlayer((p) => {
        const c = col(p.ctxId)
        const base = c ? c.tracks : p.order
        return { ...p, order: v ? [p.trackId, ...shuffled(base.filter((t) => t !== p.trackId), Date.now())] : base }
      })
      toast(v ? 'シャッフル再生をオンにしました' : 'シャッフル再生をオフにしました')
    },
    [col, toast],
  )

  const next = useCallback(
    (auto = false) => {
      if (queue.length) {
        const [h, ...rest] = queue
        setQueue(rest)
        setPlayer((p) => ({ ...p, trackId: h.id, playing: true }))
        clock.set(0)
        return
      }
      setPlayer((p) => {
        const i = p.order.indexOf(p.trackId)
        let j = i + 1
        if (j >= p.order.length) {
          if (auto && repeat === 'off') return { ...p, trackId: p.order[0], playing: false }
          j = 0
        }
        return { ...p, trackId: p.order[j] }
      })
      clock.set(0)
    },
    [queue, repeat, clock],
  )
  const prev = useCallback(() => {
    if (clock.get() > 3) {
      clock.set(0)
      return
    }
    setPlayer((p) => {
      const i = p.order.indexOf(p.trackId)
      const j = i <= 0 ? (repeat === 'all' ? p.order.length - 1 : 0) : i - 1
      return { ...p, trackId: p.order[j] }
    })
    clock.set(0)
  }, [clock, repeat])

  const endRef = useRef<() => void>(() => {})
  endRef.current = () => {
    if (repeat === 'one') clock.set(0)
    else next(true)
  }

  useEffect(() => {
    if (!player.playing) return
    let raf = 0
    let last = performance.now()
    const dur = TRACKS[player.trackId].dur
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const p = clock.get() + dt
      if (p >= dur) {
        clock.set(dur)
        endRef.current()
      } else clock.set(p)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [player.playing, player.trackId, clock])

  const seek = useCallback((t: number) => clock.set(Math.max(0, Math.min(TRACKS[live.current.player.trackId].dur - 0.05, t))), [clock])

  const toggleLike = useCallback(
    (id: string) => {
      setLiked((l) => {
        const on = l.includes(id)
        toast(on ? 'お気に入りの曲から削除しました' : 'お気に入りの曲に追加しました')
        return on ? l.filter((x) => x !== id) : [id, ...l]
      })
    },
    [toast],
  )
  const toggleSave = useCallback(
    (id: string) => {
      setSaved((s) => {
        const on = s.includes(id)
        toast(on ? 'ライブラリから削除しました' : 'ライブラリに保存しました')
        return on ? s.filter((x) => x !== id) : [id, ...s]
      })
    },
    [toast],
  )
  const addToPlaylist = useCallback(
    (plId: string, trackId: string) => {
      if (plId === '__queue') {
        setQueue((q) => [...q, { uid: uid.current++, id: trackId }])
        toast('キューに追加しました')
        return
      }
      setPlaylists((ps) => ps.map((p) => (p.id === plId && !p.tracks.includes(trackId) ? { ...p, tracks: [...p.tracks, trackId] } : p)))
      toast(`「${playlists.find((p) => p.id === plId)?.title}」に追加しました`)
    },
    [toast, playlists],
  )
  const createPlaylist = useCallback(() => {
    const n = playlists.filter((p) => p.id.startsWith('my-')).length + 1
    const pals: [string, string, string, string][] = [
      ['#101828', '#7c5cff', '#2ee6a8', '#ffffff'],
      ['#1b0f0f', '#ff7a59', '#ffd166', '#fff7ea'],
      ['#071a1f', '#2bb3c0', '#ffe066', '#e8fbff'],
    ]
    const p: Playlist = {
      id: `my-${n}`,
      title: `マイプレイリスト #${n}`,
      desc: '',
      owner: 'あなた',
      kind: 'プレイリスト',
      cover: { id: `c-my-${n}`, style: 'orbs', pal: pals[(n - 1) % pals.length], label: `MY LIST ${n}` },
      tracks: [],
    }
    setPlaylists((ps) => [ps[0], p, ...ps.slice(1)])
    go({ v: 'col', id: p.id })
    toast('プレイリストを作成しました')
  }, [playlists, go, toast])

  const openMenu = useCallback((e: ReactMouseEvent, trackId: string, ctxId?: string) => {
    const r = rootRef.current!.getBoundingClientRect()
    setMenu({ x: e.clientX - r.left, y: e.clientY - r.top, trackId, ctxId })
  }, [])

  const app: App = {
    route,
    go,
    col,
    playlists,
    liked,
    saved,
    current,
    ctxId: player.ctxId,
    playing: player.playing,
    shuffle,
    narrow,
    reduce,
    playCol,
    toggle,
    toggleLike,
    toggleSave,
    setShuffle,
    openMenu,
    addToPlaylist,
    createPlaylist,
    toast,
  }

  /* キュー */
  const ci = player.order.indexOf(player.trackId)
  const upNext = player.order.slice(ci + 1)
  const setUpNext = (ids: string[]) => setPlayer((p) => ({ ...p, order: [...p.order.slice(0, p.order.indexOf(p.trackId) + 1), ...ids] }))
  const ctx = col(player.ctxId)

  /* ジャケット色(現在の曲) */
  const probeRef = useRef<SVGSVGElement>(null)
  const curColor = useCoverColor(probeRef, curAlbum.cover)
  const artSize = narrow ? Math.max(140, Math.min(size.w * 0.72, size.h - 370, 340)) : Math.max(160, Math.min(size.w * 0.34, size.h - 360, 400))

  const onKeyDown = (e: ReactKeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (e.key === 'Escape') {
      if (menu) setMenu(null)
      else if (expanded) setExpanded(false)
      else if (queueOpen && !(sidebar === 'full' && size.w >= 1180)) setQueueOpen(false)
      else if (mainMode === 'lyrics') setMainMode('view')
      else return
      e.stopPropagation()
      return
    }
    if (e.key === ' ' && tag !== 'INPUT' && tag !== 'BUTTON' && (e.target as HTMLElement).getAttribute('role') !== 'row') {
      toggle()
      e.preventDefault()
    }
  }

  const docked = queueOpen && size.w >= 1180 && !narrow
  const repeatNext: Record<Repeat, Repeat> = { off: 'all', all: 'one', one: 'off' }
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat

  const mainView =
    mainMode === 'lyrics' && !narrow ? (
      <LyricsView track={current} color={curColor} onSeek={seek} />
    ) : route.v === 'home' ? (
      <HomeView nav={nav} />
    ) : route.v === 'search' ? (
      <SearchView nav={nav} />
    ) : route.v === 'library' ? (
      <div className="h-full pb-24">
        <LibraryList />
      </div>
    ) : (
      <CollectionView key={route.id} id={route.id} nav={nav} />
    )

  const controls = (big?: boolean) => (
    <div className={`flex items-center justify-center ${big ? 'gap-5' : 'gap-2 @5xl:gap-4'}`}>
      <RoundBtn label={shuffle ? 'シャッフルをオフ' : 'シャッフルをオン'} onClick={() => setShuffle(!shuffle)} active={shuffle} pressed={shuffle} className={big ? 'h-10 w-10' : ''}>
        <Shuffle className={big ? 'h-6 w-6' : 'h-[18px] w-[18px]'} />
      </RoundBtn>
      <RoundBtn label="前へ" onClick={prev} className={big ? 'h-10 w-10 text-white' : ''}>
        <SkipBack className={big ? 'h-7 w-7' : 'h-5 w-5'} fill="currentColor" />
      </RoundBtn>
      <button
        type="button"
        aria-label={player.playing ? '一時停止' : '再生'}
        onClick={toggle}
        className={`grid place-items-center rounded-full bg-white text-black outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-95 ${big ? 'h-16 w-16' : 'h-9 w-9'}`}
      >
        {player.playing ? <Pause className={big ? 'h-7 w-7' : 'h-[18px] w-[18px]'} fill="currentColor" /> : <Play className={big ? 'ml-1 h-7 w-7' : 'ml-0.5 h-[18px] w-[18px]'} fill="currentColor" />}
      </button>
      <RoundBtn label="次へ" onClick={() => next()} className={big ? 'h-10 w-10 text-white' : ''}>
        <SkipForward className={big ? 'h-7 w-7' : 'h-5 w-5'} fill="currentColor" />
      </RoundBtn>
      <RoundBtn
        label={repeat === 'off' ? 'リピートをオン' : repeat === 'all' ? '1曲リピートをオン' : 'リピートをオフ'}
        onClick={() => {
          setRepeat(repeatNext[repeat])
          toast(repeat === 'off' ? '全曲リピート' : repeat === 'all' ? '1曲リピート' : 'リピートをオフにしました')
        }}
        active={repeat !== 'off'}
        className={big ? 'h-10 w-10' : ''}
      >
        <RepeatIcon className={big ? 'h-6 w-6' : 'h-[18px] w-[18px]'} />
      </RoundBtn>
    </div>
  )

  const coverMotion = reduce ? {} : { layoutId: 'ms-np-cover' }

  return (
    <AppCtx.Provider value={app}>
      <ClockCtx.Provider value={clock}>
        <div
          ref={rootRef}
          onKeyDown={onKeyDown}
          className="@container relative h-full w-full select-none overflow-hidden bg-black font-sans text-white antialiased"
        >
          <style>{`@keyframes ms-eq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}`}</style>
          <CoverArt key={curAlbum.cover.id} ref={probeRef} cover={curAlbum.cover} className="hidden" />
          {!narrow ? (
            <div className="flex h-full flex-col gap-2 p-2">
              <div className="flex min-h-0 flex-1 gap-2">
                <nav aria-label="メイン" className={`flex shrink-0 flex-col gap-2 ${sidebar === 'full' ? 'w-[300px]' : 'w-[72px]'}`}>
                  <div className="flex shrink-0 flex-col gap-1 rounded-lg p-2" style={{ background: BG }}>
                    <div className={`flex h-10 items-center ${sidebar === 'full' ? 'px-3' : 'justify-center'}`}>
                      <Logo small={sidebar !== 'full'} />
                    </div>
                    {(
                      [
                        ['home', 'ホーム', House],
                        ['search', '検索', Search],
                      ] as const
                    ).map(([v, label, Icon]) => {
                      const on = route.v === v && mainMode === 'view'
                      const b = (
                        <button
                          key={v}
                          type="button"
                          onClick={() => go({ v })}
                          aria-current={on ? 'page' : undefined}
                          aria-label={label}
                          className={`flex h-10 w-full items-center gap-4 rounded-md text-[15px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${sidebar === 'full' ? 'px-3' : 'justify-center'} ${on ? 'text-white' : 'text-white/60 hover:text-white'}`}
                        >
                          <Icon className="h-6 w-6" strokeWidth={on ? 2.6 : 2} />
                          {sidebar === 'full' && label}
                        </button>
                      )
                      return sidebar === 'full' ? (
                        b
                      ) : (
                        <Tip key={v} label={label} side="right">
                          {b}
                        </Tip>
                      )
                    })}
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden rounded-lg" style={{ background: BG }}>
                    <LibraryList rail={sidebar === 'rail'} />
                  </div>
                </nav>
                <main aria-label="メインビュー" className="@container/main relative min-w-0 flex-1 overflow-hidden rounded-lg" style={{ background: BG }}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={mainMode === 'lyrics' ? 'lyrics' : JSON.stringify(route)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      className="h-full"
                    >
                      {mainView}
                    </motion.div>
                  </AnimatePresence>
                </main>
                {docked && (
                  <aside aria-label="キュー" className="w-[300px] shrink-0 overflow-hidden rounded-lg" style={{ background: BG }}>
                    <QueuePanel
                      queue={queue}
                      setQueue={setQueue}
                      upNext={upNext}
                      setUpNext={setUpNext}
                      ctxTitle={ctx?.title ?? ''}
                      onJumpQueue={(u) => {
                        const it = queue.find((q) => q.uid === u)!
                        setQueue(queue.filter((q) => q.uid !== u))
                        setPlayer((p) => ({ ...p, trackId: it.id, playing: true }))
                        clock.set(0)
                        kickAudio()
                      }}
                      onJumpCtx={(id) => {
                        setPlayer((p) => ({ ...p, trackId: id, playing: true }))
                        clock.set(0)
                        kickAudio()
                      }}
                      onClose={() => setQueueOpen(false)}
                    />
                  </aside>
                )}
              </div>
              {/* 再生バー */}
              <footer aria-label="再生中" className="grid h-[68px] shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] items-center gap-3 px-2">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" aria-label="全画面の再生画面を開く" onClick={() => setExpanded(true)} className="group relative shrink-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-white">
                    {!expanded ? (
                      <motion.div {...coverMotion} className="h-14 w-14 overflow-hidden rounded shadow-lg">
                        <CoverArt cover={curAlbum.cover} className="h-full w-full" />
                      </motion.div>
                    ) : (
                      <div className="h-14 w-14 rounded bg-white/5" />
                    )}
                    <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                      <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                    </span>
                  </button>
                  <div className="min-w-0">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div key={current.id} initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -8 }} transition={{ duration: 0.2 }}>
                        <button type="button" onClick={() => go({ v: 'col', id: curAlbum.id })} className="block max-w-full truncate rounded text-left text-[14px] font-semibold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white">
                          {current.title}
                        </button>
                        <p className="truncate text-[12px] text-white/60">{current.artist}</p>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <HeartBtn on={liked.includes(current.id)} onClick={() => toggleLike(current.id)} />
                </div>
                <div className="flex min-w-0 flex-col items-center gap-0.5">
                  {controls()}
                  <div className="w-full max-w-[620px]">
                    <Progress dur={current.dur} onSeek={seek} />
                  </div>
                </div>
                <div className="flex min-w-0 items-center justify-end gap-0.5">
                  <RoundBtn label="歌詞" onClick={() => setMainMode((m) => (m === 'lyrics' ? 'view' : 'lyrics'))} active={mainMode === 'lyrics'} pressed={mainMode === 'lyrics'}>
                    <MicVocal className="h-[18px] w-[18px]" />
                  </RoundBtn>
                  <RoundBtn label="キュー" onClick={() => setQueueOpen((v) => !v)} active={queueOpen} pressed={queueOpen}>
                    <ListMusic className="h-[18px] w-[18px]" />
                  </RoundBtn>
                  <span className="hidden @[1100px]:inline-flex">
                    <RoundBtn
                      label={soundOn ? 'シンセ音声をオフ (Tone.js)' : 'シンセ音声をオン (Tone.js)'}
                      onClick={() => {
                        const v = !soundOn
                        setSoundOn(v)
                        live.current.soundOn = v
                        if (v) kickAudio()
                        toast(v ? 'Tone.js の自動演奏をオンにしました' : '音を止めました(再生表示は続きます)')
                      }}
                      active={soundOn}
                      pressed={soundOn}
                    >
                      <AudioLines className="h-[18px] w-[18px]" />
                    </RoundBtn>
                  </span>
                  <span className="hidden @4xl:flex">
                    <VolumeSlider
                      volume={volume}
                      muted={muted}
                      onChange={(v) => {
                        setVolume(v)
                        setMuted(v === 0)
                      }}
                      onMute={() => setMuted((m) => !m)}
                    />
                  </span>
                  <RoundBtn label="全画面表示" onClick={() => setExpanded(true)}>
                    <Maximize2 className="h-4 w-4" />
                  </RoundBtn>
                </div>
              </footer>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <main aria-label="メインビュー" className="@container/main relative min-h-0 flex-1 overflow-hidden" style={{ background: BG }}>
                {mainView}
              </main>
              {/* ミニプレーヤー */}
              <div
                role="button"
                tabIndex={0}
                aria-label={`再生中: ${current.title}。タップして全画面表示`}
                onClick={() => setExpanded(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setExpanded(true)
                }}
                className="absolute inset-x-2 bottom-[62px] z-20 flex h-14 cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg pl-2 pr-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)] outline-none transition-colors duration-500 focus-visible:ring-2 focus-visible:ring-white"
                style={{ background: rgba(curColor, 1) }}
              >
                {!expanded ? (
                  <motion.div {...coverMotion} className="h-10 w-10 shrink-0 overflow-hidden rounded">
                    <CoverArt cover={curAlbum.cover} className="h-full w-full" />
                  </motion.div>
                ) : (
                  <div className="h-10 w-10 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{current.title}</p>
                  <p className="truncate text-[12px] text-white/70">{current.artist}</p>
                </div>
                <HeartBtn on={liked.includes(current.id)} onClick={() => toggleLike(current.id)} size={20} className="h-10 w-10" />
                <button
                  type="button"
                  aria-label={player.playing ? '一時停止' : '再生'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle()
                  }}
                  className="grid h-10 w-10 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {player.playing ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6" fill="currentColor" />}
                </button>
                <MiniLine dur={current.dur} />
              </div>
              <nav aria-label="メイン" className="relative z-10 grid h-[58px] shrink-0 grid-cols-3 bg-gradient-to-t from-black via-black/95 to-black/80">
                {(
                  [
                    ['home', 'ホーム', House],
                    ['search', '検索', Search],
                    ['library', 'ライブラリ', Library],
                  ] as const
                ).map(([v, label, Icon]) => {
                  const on = route.v === v || (v === 'library' && route.v === 'col')
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => go({ v })}
                      aria-current={on ? 'page' : undefined}
                      className={`flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${on ? 'text-white' : 'text-white/55'}`}
                    >
                      <Icon className="h-6 w-6" strokeWidth={on ? 2.6 : 2} />
                      {label}
                    </button>
                  )
                })}
              </nav>
            </div>
          )}

          {/* キュー(オーバーレイ) */}
          <AnimatePresence>
            {queueOpen && !docked && (
              <motion.aside
                key="queue"
                aria-label="キュー"
                initial={reduce ? { opacity: 0 } : narrow ? { y: '100%' } : { x: 320, opacity: 0 }}
                animate={reduce ? { opacity: 1 } : narrow ? { y: 0 } : { x: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : narrow ? { y: '100%' } : { x: 320, opacity: 0 }}
                transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 38 }}
                className={`absolute z-40 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] ${narrow ? 'inset-0' : 'bottom-[84px] right-2 top-2 w-[320px] rounded-lg ring-1 ring-white/10'}`}
                style={{ background: '#18181b' }}
              >
                <QueuePanel
                  queue={queue}
                  setQueue={setQueue}
                  upNext={upNext}
                  setUpNext={setUpNext}
                  ctxTitle={ctx?.title ?? ''}
                  onJumpQueue={(u) => {
                    const it = queue.find((q) => q.uid === u)!
                    setQueue(queue.filter((q) => q.uid !== u))
                    setPlayer((p) => ({ ...p, trackId: it.id, playing: true }))
                    clock.set(0)
                    kickAudio()
                  }}
                  onJumpCtx={(id) => {
                    setPlayer((p) => ({ ...p, trackId: id, playing: true }))
                    clock.set(0)
                    kickAudio()
                  }}
                  onClose={() => setQueueOpen(false)}
                />
              </motion.aside>
            )}
          </AnimatePresence>

          {/* 全画面の再生画面 */}
          <AnimatePresence>
            {expanded && (
              <motion.section
                key="expanded"
                aria-label="再生画面"
                role="dialog"
                aria-modal="true"
                initial={reduce ? { opacity: 0 } : { y: '6%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { y: '6%', opacity: 0 }}
                transition={{ duration: reduce ? 0.15 : 0.32, ease: [0.2, 0.8, 0.2, 1] }}
                className="@container/exp absolute inset-0 z-50 overflow-hidden bg-black"
              >
                <div className="pointer-events-none absolute inset-0">
                  <CoverArt cover={curAlbum.cover} className="absolute left-1/2 top-1/2 h-[160%] w-[160%] -translate-x-1/2 -translate-y-1/2 opacity-80 blur-[70px] saturate-150" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${rgba(curColor, 0.35)} 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)` }} />
                </div>
                <div className="relative flex h-full flex-col px-4 pb-4 pt-2 @3xl/exp:px-10">
                  <div className="flex h-12 shrink-0 items-center justify-between">
                    <RoundBtn label="再生画面を閉じる" onClick={() => setExpanded(false)} tip={false} className="h-10 w-10 text-white">
                      <ChevronDown className="h-6 w-6" />
                    </RoundBtn>
                    <div className="min-w-0 text-center">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/60">再生元: {ctx?.kind ?? ''}</p>
                      <p className="truncate text-[13px] font-bold">{ctx?.title}</p>
                    </div>
                    <RoundBtn
                      label={expLyrics ? '歌詞を閉じる' : '歌詞を表示'}
                      onClick={() => setExpLyrics((v) => !v)}
                      tip={false}
                      active={expLyrics}
                      pressed={expLyrics}
                      className="h-10 w-10 @3xl/exp:invisible"
                    >
                      <MicVocal className="h-5 w-5" />
                    </RoundBtn>
                  </div>
                  <div className="grid min-h-0 flex-1 items-center gap-8 @3xl/exp:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="flex min-h-0 flex-col items-center justify-center gap-5 @3xl/exp:items-start">
                      {expLyrics && narrow ? (
                        <div className="w-full overflow-hidden rounded-xl" style={{ height: artSize, background: rgba(curColor, 0.9) }} >
                          <LyricsView track={current} color={curColor} onSeek={seek} compact />
                        </div>
                      ) : (
                        <motion.div
                          {...coverMotion}
                          className="aspect-square overflow-hidden rounded-lg shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
                          style={{ width: artSize }}
                        >
                          <CoverArt cover={curAlbum.cover} label={`${curAlbum.title}のジャケット`} className="h-full w-full" />
                        </motion.div>
                      )}
                      <div className="flex w-full max-w-[400px] items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.div key={current.id} initial={{ opacity: 0, x: reduce ? 0 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduce ? 0 : -20 }} transition={{ duration: 0.22 }}>
                              <p className="truncate text-[22px] font-black tracking-tight">{current.title}</p>
                              <p className="truncate text-[14px] text-white/70">{current.artist}</p>
                            </motion.div>
                          </AnimatePresence>
                        </div>
                        <HeartBtn on={liked.includes(current.id)} onClick={() => toggleLike(current.id)} size={24} className="h-11 w-11" />
                      </div>
                      <div className="w-full max-w-[400px]">
                        <Progress dur={current.dur} onSeek={seek} big />
                      </div>
                      <div className="w-full max-w-[400px]">{controls(true)}</div>
                      <div className="flex w-full max-w-[400px] items-center justify-between text-white/70">
                        <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: ACC }}>
                          <Disc3 className={`h-4 w-4 ${player.playing && !reduce ? 'animate-spin [animation-duration:3s]' : ''}`} />
                          {soundOn ? 'Tone.js シンセ' : 'このデバイス(無音)'}
                        </span>
                        <RoundBtn
                          label="キューを開く"
                          tip={false}
                          onClick={() => {
                            setExpanded(false)
                            setQueueOpen(true)
                          }}
                        >
                          <ListMusic className="h-5 w-5" />
                        </RoundBtn>
                      </div>
                    </div>
                    <div className="hidden h-full min-h-0 py-4 @3xl/exp:block">
                      <div className="h-full overflow-hidden rounded-2xl bg-black/25 ring-1 ring-white/10 backdrop-blur-sm">
                        <LyricsView track={current} color={curColor} onSeek={seek} compact transparent />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 曲のメニュー */}
          {menu && (
            <>
              <div className="absolute inset-0 z-[60]" onPointerDown={() => setMenu(null)} onContextMenu={(e) => (e.preventDefault(), setMenu(null))} />
              <TrackMenu
                x={menu.x}
                y={menu.y}
                w={size.w}
                h={size.h}
                track={TRACKS[menu.trackId]}
                onClose={() => setMenu(null)}
                playlists={playlists.filter((p) => p.owner === 'あなた' && p.id !== 'liked')}
                liked={liked.includes(menu.trackId)}
              />
            </>
          )}

          {/* トースト */}
          <div className={`pointer-events-none absolute inset-x-0 z-[70] flex justify-center ${narrow ? 'bottom-[128px]' : 'bottom-[92px]'}`} aria-live="polite">
            <AnimatePresence>
              {toastMsg && (
                <motion.div
                  key={toastMsg.k}
                  initial={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-lg px-4 py-2 text-[13.5px] font-semibold text-white shadow-xl"
                  style={{ background: '#2b7cf6' }}
                >
                  {toastMsg.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </ClockCtx.Provider>
    </AppCtx.Provider>
  )
}

function MiniLine({ dur }: { dur: number }) {
  const pos = usePos()
  return (
    <span className="pointer-events-none absolute inset-x-2 bottom-0 h-[2px] overflow-hidden rounded-full bg-white/25">
      <span className="block h-full bg-white" style={{ width: `${(pos / dur) * 100}%` }} />
    </span>
  )
}

function TrackMenu({
  x,
  y,
  w,
  h,
  track,
  onClose,
  playlists,
  liked,
}: {
  x: number
  y: number
  w: number
  h: number
  track: Track
  onClose: () => void
  playlists: Playlist[]
  liked: boolean
}) {
  const app = useApp()
  const ref = useRef<HTMLDivElement>(null)
  const [sub, setSub] = useState(false)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus()
  }, [])
  const MW = 250
  const left = Math.min(x, w - MW - 8)
  const MH = 230 + (sub ? playlists.length * 36 : 0)
  const top = Math.max(8, Math.min(y, h - MH - 8))
  const item = (label: string, icon: ReactNode, fn: () => void, extra?: ReactNode) => (
    <button
      type="button"
      role="menuitem"
      onClick={fn}
      className="flex h-9 w-full items-center gap-3 rounded-sm px-3 text-left text-[13.5px] outline-none hover:bg-white/10 focus-visible:bg-white/10"
    >
      <span className="text-white/70">{icon}</span>
      <span className="flex-1">{label}</span>
      {extra}
    </button>
  )
  return (
    <motion.div
      ref={ref}
      role="menu"
      aria-label={`${track.title}のメニュー`}
      initial={{ opacity: 0, scale: app.reduce ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12 }}
      className="absolute z-[61] w-[250px] origin-top-left rounded-md bg-[#282828] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
      style={{ left, top }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])]
          const i = items.indexOf(document.activeElement as HTMLElement)
          items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
          e.preventDefault()
        }
      }}
    >
      <div className="flex items-center gap-2.5 border-b border-white/10 px-2 pb-2 pt-1">
        <CoverArt cover={ALBUM_BY_ID[track.albumId].cover} className="h-9 w-9 rounded" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{track.title}</p>
          <p className="truncate text-[11.5px] text-white/55">
            {track.artist}・{compact.format(track.plays)}回再生
          </p>
        </div>
      </div>
      <div className="pt-1">
        {item('キューに追加', <ListMusic className="h-4 w-4" />, () => {
          app.addToPlaylist('__queue', track.id)
          onClose()
        })}
        {item(liked ? 'お気に入りの曲から削除' : 'お気に入りの曲に追加', <Heart className="h-4 w-4" fill={liked ? ACC : 'none'} color={liked ? ACC : 'currentColor'} />, () => {
          app.toggleLike(track.id)
          onClose()
        })}
        {item('プレイリストに追加', <Plus className="h-4 w-4" />, () => setSub((v) => !v), <ChevronRight className={`h-4 w-4 transition-transform ${sub ? 'rotate-90' : ''}`} />)}
        {sub && (
          <div className="ml-6 border-l border-white/10 pl-1">
            {playlists.map((p) => (
              <button
                key={p.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  app.addToPlaylist(p.id, track.id)
                  onClose()
                }}
                className="flex h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-[13px] outline-none hover:bg-white/10 focus-visible:bg-white/10"
              >
                {p.tracks.includes(track.id) ? <Check className="h-3.5 w-3.5" color={ACC} /> : <span className="w-3.5" />}
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        )}
        {item('アルバムへ移動', <Disc3 className="h-4 w-4" />, () => {
          app.go({ v: 'col', id: track.albumId })
          onClose()
        })}
        {item('アーティストへ移動', <User className="h-4 w-4" />, () => {
          app.go({ v: 'col', id: track.albumId })
          onClose()
        })}
        {item('曲のリンクをコピー', <Link2 className="h-4 w-4" />, () => {
          app.toast('リンクをコピーしました')
          onClose()
        })}
      </div>
    </motion.div>
  )
}
