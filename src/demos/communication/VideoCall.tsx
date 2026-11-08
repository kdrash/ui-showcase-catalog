import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Captions,
  CaptionsOff,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  Ellipsis,
  Hand,
  LayoutGrid,
  Link2,
  Mic,
  MicOff,
  MonitorUp,
  PanelsTopLeft,
  PhoneOff,
  Pin,
  PinOff,
  ScreenShareOff,
  Search,
  Send,
  Settings2,
  SmilePlus,
  Sparkles,
  Star,
  Users,
  Video,
  VideoOff,
  Volume2,
  WifiLow,
  X,
  MessageSquareText,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { MadoiMark, ShareThumb, Slide, SLIDE_TITLES, VideoArt, type Look, type SceneKind } from './VideoCall.art'

/**
 * ビデオ会議 UI。サービス名「Madoi Meet」・ロゴ・参加者・会議の内容・スライドはすべて架空のオリジナル。
 * - 参加前のロビー(カメラのプレビュー・マイクの音量メーター・デバイス選択・背景エフェクト・表示名)→「参加しています…」→ 通話
 * - 参加者の「映像」は SVG の部屋 + 上半身のキャラクター。待機中の揺れ・まばたき・窓の雲・夜景の灯りは CSS keyframes、
 *   口の開き・頭のうなずき・発話リング・名札の音量バーは requestAnimationFrame で各タイルの要素に書き込む CSS 変数 --lvl だけで動かす。
 *   音量は「台本」の話者に音節のゆらぎ(sin)とバリューノイズのゲートを掛けた疑似音声で作り、立ち上がり速く・減衰ゆっくりで平滑化
 * - 台本の進行がそのまま字幕(話者名 + 1文字ずつ表示)になり、スピーカー表示の大きなタイルも話者に合わせて入れ替わる。
 *   ミュート中の人は話す直前にミュートを外し、話し終えると戻す
 * - タイルの位置はすべて JS で計算(グリッドは列数を総当たりして 16:9〜6:5 の範囲で一番大きくなる配置、最終行は中央寄せ)し、
 *   Motion で x/y/width/height をアニメーション。グリッド ⇄ スピーカー ⇄ 画面共有の切り替えや入退室でタイルが滑らかに動く
 * - 画面共有はピッカー(画面全体/ウィンドウ/タブ)から選ぶと、架空のブランドガイドラインのスライドが大きく映り、←→ でページ送り
 * - コントロールバー: マイク・カメラ・画面共有・リアクション(絵文字が揺れながら浮かび上がる)・挙手・字幕・チャット・参加者・退出(確認つき)。
 *   狭い幅では一部を「その他」メニューにまとめ、パネルは全面のシートになる
 * - 上部に経過時間・録画中バッジ・ネットワーク品質(押すと遅延などの詳細)。入退室・ネットワーク低下・ミュート中の発話はトーストで知らせる
 * - キーボード: M マイク、V カメラ、H 挙手、C 字幕、Esc で重なっている UI を閉じる(デモ内にフォーカスがあるときだけ)。
 *   useReducedMotion 時はキャラクターの待機アニメと浮かぶ演出を止め、配置換えは短いフェードにする
 */

/* ───────────── 参加者と台本 ───────────── */

type PId = 'me' | 'morikawa' | 'hasebe' | 'onodera' | 'nakamura' | 'murakami'
type Person = { name: string; short: string; hue: number; scene: SceneKind; look: Look; seed: number; host?: boolean }
const PEOPLE: Record<PId, Person> = {
  me: { name: '宮下 遥', short: '宮下', hue: 228, scene: 'room', seed: 1, look: { skin: '#f4d6c0', hair: '#2b2130', style: 'bob', shirt: '#6d7fd6', accent: '#fff' } },
  morikawa: { name: '森川 拓海', short: '森川', hue: 18, scene: 'study', seed: 2, host: true, look: { skin: '#eac2a0', hair: '#1d1a1f', style: 'short', shirt: '#2f3b4c', glasses: true, accent: '#cfd6e2' } },
  hasebe: { name: '長谷部 さくら', short: '長谷部', hue: 338, scene: 'studio', seed: 3, look: { skin: '#f6d9c6', hair: '#5a3424', style: 'long', shirt: '#f2efe8', accent: '#c96e5a' } },
  onodera: { name: '小野寺 健', short: '小野寺', hue: 152, scene: 'night', seed: 4, look: { skin: '#dcb08c', hair: '#151317', style: 'crop', shirt: '#3d6b58' } },
  nakamura: { name: '中村 理央', short: '中村', hue: 268, scene: 'kitchen', seed: 5, look: { skin: '#f1cfb4', hair: '#3a2a22', style: 'bun', shirt: '#d98b3a', accent: '#fff3' } },
  murakami: { name: '村上 葵', short: '村上', hue: 192, scene: 'plants', seed: 6, look: { skin: '#f3d3bd', hair: '#22303c', style: 'bob', shirt: '#4f9aa8', glasses: true } },
}
const REMOTES: PId[] = ['morikawa', 'hasebe', 'onodera', 'nakamura', 'murakami']
const ALL: PId[] = [...REMOTES, 'me']

const SCRIPT: { who: PId; text: string; askShare?: boolean }[] = [
  { who: 'morikawa', text: 'それでは始めます。今日はリブランディング v3 の最終確認です。' },
  { who: 'hasebe', text: 'よろしくお願いします。最後に撮影の段取りも少しだけください。' },
  { who: 'morikawa', text: '了解です。まず、ロゴを小さく使ったときに潰れる件から見ていきましょう。' },
  { who: 'onodera', text: '16px 以下のときは、切れ込みのない簡易版マークに切り替える案を作りました。' },
  { who: 'morikawa', text: 'いいですね。ファビコンもそれで統一できそうです。' },
  { who: 'murakami', text: 'ポスター展の告知でも、新しいマークを先に使って大丈夫ですか？' },
  { who: 'morikawa', text: '大丈夫です。来月の頭には正式に切り替えるので。' },
  { who: 'hasebe', text: '夕凪オレンジ、紙に刷ると本当にきれいでした。写真映えもしそうです。' },
  { who: 'nakamura', text: '背景のベージュとのコントラストだけ、本文では気をつけたいですね。' },
  { who: 'morikawa', text: '本文は墨色に寄せましょう。宮下さん、そのあたりスライドで見せてもらえますか？', askShare: true },
  { who: 'onodera', text: '封筒は窓付きの長3、経理からも OK が出ました。' },
  { who: 'hasebe', text: '撮影は17日の午前で押さえています。小物の準備をお願いします。' },
]

type PState = { present: boolean; muted: boolean; cam: boolean; hand: boolean; weak?: boolean }
const INITIAL_PARTS: Record<Exclude<PId, 'me'>, PState> = {
  morikawa: { present: true, muted: false, cam: true, hand: false },
  hasebe: { present: true, muted: false, cam: true, hand: false },
  onodera: { present: true, muted: true, cam: true, hand: false, weak: true },
  nakamura: { present: true, muted: false, cam: false, hand: false },
  murakami: { present: false, muted: false, cam: true, hand: false },
}

type ChatMsg = { id: string; from: PId; text: string; at: string }
const SEED_CHAT: ChatMsg[] = [
  { id: 'c1', from: 'morikawa', text: '今日の資料です 📎 brand_v3_feedback.pdf', at: '14:01' },
  { id: 'c2', from: 'nakamura', text: 'カメラの調子が悪いので音声だけで失礼します🙏', at: '14:03' },
]

type Bg = 'none' | 'blur' | 'beach' | 'library'
const BGS: { id: Bg; label: string }[] = [
  { id: 'none', label: 'なし' },
  { id: 'blur', label: 'ぼかし' },
  { id: 'beach', label: '海辺' },
  { id: 'library', label: '書斎' },
]
const REACTIONS = ['👏', '😂', '❤️', '🎉', '👍', '😮']
const MEETING_BASE_SEC = 14 * 60 + 5

/* ───────────── 疑似音声 ───────────── */

const hash1 = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}
const vnoise = (x: number) => {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return hash1(i) * (1 - u) + hash1(i + 1) * u
}
const speechLevel = (t: number, seed: number) => {
  const syl = Math.abs(Math.sin(t * Math.PI * 4.4 + seed * 3))
  const gate = vnoise(t * 2.3 + seed * 17) > 0.3 ? 1 : 0.12
  return Math.min(1, (0.22 + 0.78 * syl) * gate * (0.5 + 0.65 * vnoise(t * 6.5 + seed * 5)))
}

/* ───────────── レイアウト計算 ───────────── */

type Rect = { x: number; y: number; w: number; h: number }
const GAP = 8

function gridRects(n: number, W: number, H: number): Rect[] {
  if (n <= 0 || W <= 0 || H <= 0) return []
  let best = { area: -1, cols: 1, w: 0, h: 0 }
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    let w = (W - GAP * (cols - 1)) / cols
    let h = (H - GAP * (rows - 1)) / rows
    if (w / h > 16 / 9) w = h * (16 / 9)
    if (w / h < 6 / 5) h = w / (6 / 5)
    const area = w * h
    if (area > best.area + 1) best = { area, cols, w, h }
  }
  const { cols, w, h } = best
  const rows = Math.ceil(n / cols)
  const totalH = rows * h + (rows - 1) * GAP
  const y0 = (H - totalH) / 2
  const out: Rect[] = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols)
    const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols
    const c = i - r * cols
    const rowW = inRow * w + (inRow - 1) * GAP
    out.push({ x: (W - rowW) / 2 + c * (w + GAP), y: y0 + r * (h + GAP), w, h })
  }
  return out
}

/** スピーカー表示: 大きなメイン + 右(広い)または下(狭い)のフィルムストリップ */
function speakerRects(stripIds: string[], W: number, H: number) {
  const strip = new Map<string, Rect>()
  let overflow: { rect: Rect; count: number } | null = null
  const n = stripIds.length
  if (W >= 640) {
    const sw = Math.max(140, Math.min(220, W * 0.2))
    const main = { x: 0, y: 0, w: W - sw - GAP, h: H }
    if (n) {
      const th = Math.min(sw * (9 / 16), (H - GAP * (n - 1)) / n)
      const tw = Math.min(sw, th * (16 / 9))
      const total = n * th + (n - 1) * GAP
      stripIds.forEach((id, i) => strip.set(id, { x: W - sw + (sw - tw) / 2, y: (H - total) / 2 + i * (th + GAP), w: tw, h: th }))
    }
    return { main: n ? main : { x: 0, y: 0, w: W, h: H }, strip, overflow }
  }
  const sh = Math.max(64, Math.min(92, H * 0.2))
  const main = { x: 0, y: 0, w: W, h: n ? H - sh - GAP : H }
  if (n) {
    const tw0 = sh * (16 / 11)
    const fit = Math.max(1, Math.floor((W + GAP) / (tw0 + GAP)))
    const visible = n > fit ? fit - 1 : n
    const slots = n > fit ? fit : n
    const tw = Math.min((W - GAP * (slots - 1)) / slots, sh * (16 / 9))
    const total = slots * tw + (slots - 1) * GAP
    const x0 = (W - total) / 2
    stripIds.slice(0, visible).forEach((id, i) => strip.set(id, { x: x0 + i * (tw + GAP), y: H - sh, w: tw, h: sh }))
    if (n > fit) overflow = { rect: { x: x0 + visible * (tw + GAP), y: H - sh, w: tw, h: sh }, count: n - visible }
  }
  return { main, strip, overflow }
}

/* ───────────── 共通 ───────────── */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]'
const pad = (n: number) => String(n).padStart(2, '0')
const fmtDur = (s: number, hours = false) => (s >= 3600 || hours ? `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`)
const clockStr = (offsetSec: number) => {
  const base = 14 * 60 + Math.floor(offsetSec / 60)
  return `${Math.floor(base / 60)}:${pad(base % 60)}`
}

const STYLES = `
@keyframes nv-sway { 0%,100% { transform: translate(0,0) rotate(0deg) } 30% { transform: translate(0.6px,-0.5px) rotate(0.8deg) } 65% { transform: translate(-0.7px,0.2px) rotate(-0.9deg) } }
@keyframes nv-tilt { 0%,100% { transform: rotate(0deg) } 40% { transform: rotate(2.2deg) } 75% { transform: rotate(-1.6deg) } }
@keyframes nv-blink { 0%,93%,100% { transform: scaleY(1) } 95.5% { transform: scaleY(0.08) } }
@keyframes nv-twinkle { 0%,100% { opacity: 1 } 50% { opacity: 0.25 } }
@keyframes nv-glow { 0%,100% { opacity: 0.85 } 50% { opacity: 1 } }
@keyframes nv-drift { from { transform: translateX(-26px) } to { transform: translateX(30px) } }
@keyframes nv-leaf { 0%,100% { transform: rotate(-2deg) } 50% { transform: rotate(2.5deg) } }
@keyframes nv-steam { 0% { transform: translateY(4px); opacity: 0 } 30% { opacity: 0.8 } 100% { transform: translateY(-8px); opacity: 0 } }
@keyframes nv-wave { from { transform: translateX(0) } to { transform: translateX(40px) } }
@keyframes nv-rec { 0%,100% { opacity: 1 } 50% { opacity: 0.25 } }
.nv-root .nv-sway { animation: nv-sway 7s ease-in-out infinite }
.nv-root .nv-tilt { animation: nv-tilt 9s ease-in-out infinite }
.nv-root .nv-blink { animation: nv-blink 4.6s linear infinite }
.nv-root .nv-twinkle { animation: nv-twinkle 3s ease-in-out infinite }
.nv-root .nv-glow { animation: nv-glow 5s ease-in-out infinite }
.nv-root .nv-drift { animation: nv-drift 26s linear infinite alternate }
.nv-root .nv-leaf { animation: nv-leaf 6s ease-in-out infinite }
.nv-root .nv-steam { animation: nv-steam 2.6s ease-out infinite }
.nv-root .nv-wave { animation: nv-wave 7s linear infinite }
.nv-root .nv-rec { animation: nv-rec 1.6s ease-in-out infinite }
.nv-root.nv-still .nv-sway, .nv-root.nv-still .nv-tilt, .nv-root.nv-still .nv-drift, .nv-root.nv-still .nv-leaf,
.nv-root.nv-still .nv-steam, .nv-root.nv-still .nv-wave, .nv-root.nv-still .nv-twinkle, .nv-root.nv-still .nv-glow { animation: none }
.nv-ring { opacity: clamp(0, calc((var(--lvl, 0) - 0.07) * 4), 1) }
.nv-bar { height: calc(3px + var(--lvl, 0) * var(--k) * 11px); transition: height 60ms }
`

/** 押したボタンが消えてフォーカスが body に落ちても、デモを操作中ならルートへ戻す(ショートカットを効かせ続ける) */
function useKeepFocus(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let engaged = false
    const down = (e: PointerEvent) => {
      engaged = el.contains(e.target as Node)
    }
    const fin = () => {
      engaged = true
    }
    const mo = new MutationObserver(() => {
      if (engaged && (document.activeElement === document.body || document.activeElement === null)) el.focus({ preventScroll: true })
    })
    document.addEventListener('pointerdown', down, true)
    el.addEventListener('focusin', fin)
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      document.removeEventListener('pointerdown', down, true)
      el.removeEventListener('focusin', fin)
      mo.disconnect()
    }
  }, [ref])
}

function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setSize({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

/** コールバック ref で要素のサイズを測る(あとからマウントされる要素用) */
function useMeasure() {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const ro = useRef<ResizeObserver | null>(null)
  const ref = useCallback((el: HTMLElement | null) => {
    ro.current?.disconnect()
    ro.current = null
    if (!el) return
    setSize({ w: el.clientWidth, h: el.clientHeight })
    ro.current = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.current.observe(el)
  }, [])
  useEffect(() => () => ro.current?.disconnect(), [])
  return [ref, size] as const
}

function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [ref, open, onClose])
}

type RegisterLevel = (id: PId, slot?: string) => (el: HTMLElement | null) => void

function Avatar({ id, size, ring, register }: { id: PId; size: number; ring?: boolean; register?: RegisterLevel }) {
  const p = PEOPLE[id]
  return (
    <span ref={register?.(id, 'list')} className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {ring && (
        <span
          aria-hidden
          className="nv-ring absolute -inset-[3px] rounded-full border-2 border-[#5eead4]"
          style={{ transform: 'scale(calc(1 + var(--lvl, 0) * 0.08))' }}
        />
      )}
      <span
        aria-hidden
        className="grid size-full place-items-center rounded-full font-semibold text-white"
        style={{ fontSize: size * 0.42, background: `linear-gradient(140deg, hsl(${p.hue} 70% 62%), hsl(${p.hue + 30} 60% 40%))`, boxShadow: 'inset 0 -2px 6px rgb(0 0 0 / 0.2)' }}
      >
        {p.name[0]}
      </span>
    </span>
  )
}

function LevelBars({ muted }: { muted?: boolean }) {
  if (muted)
    return (
      <span className="grid size-[18px] place-items-center rounded-full bg-[#ef4444] text-white">
        <MicOff size={11} strokeWidth={2.5} />
      </span>
    )
  return (
    <span className="flex h-[18px] w-[18px] items-center justify-center gap-[2px] rounded-full bg-[#5eead4]/18" aria-hidden>
      {[0.55, 1, 0.7].map((k, i) => (
        <span key={i} className="nv-bar w-[2.5px] rounded-full bg-[#5eead4]" style={{ ['--k' as string]: k } as CSSProperties} />
      ))}
    </span>
  )
}

/* ───────────── タイル ───────────── */

type TileProps = {
  id: PId
  rect: Rect
  state: PState
  me?: boolean
  bg?: Bg
  pinned?: boolean
  sharingIcon?: boolean
  reduced: boolean
  register: RegisterLevel
  onPin?: () => void
  big?: boolean
}

function Tile({ id, rect, state, me, bg, pinned, sharingIcon, reduced, register, onPin, big }: TileProps) {
  const p = PEOPLE[id]
  const small = rect.w < 150
  const scene: SceneKind = me ? (bg === 'beach' ? 'beach' : bg === 'library' ? 'library' : 'room') : p.scene
  return (
    <motion.div
      ref={register(id)}
      role="group"
      aria-label={`${p.name}${me ? '（あなた）' : ''}${state.muted ? '、ミュート中' : ''}${state.cam ? '' : '、カメラオフ'}${state.hand ? '、挙手中' : ''}`}
      className={cx('group/tile absolute top-0 left-0 overflow-hidden bg-[#1c2029]', big ? 'rounded-2xl' : 'rounded-xl')}
      initial={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h, opacity: 0, scale: reduced ? 1 : 0.92 }}
      animate={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
      transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 32, opacity: { duration: 0.25 } }}
    >
      {state.cam ? (
        <div className={cx('absolute inset-0', state.weak && 'blur-[0.6px] saturate-[0.9]')}>
          <VideoArt scene={scene} look={p.look} seed={p.seed} blur={me && bg === 'blur'} />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#2a3040,#171a22)]">
          <span className="relative">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-[#5eead4]/25"
              style={{ transform: `scale(calc(1 + var(--lvl, 0) * ${state.muted ? 0 : 0.45}))`, transition: 'transform 80ms' }}
            />
            <Avatar id={id} size={Math.max(36, Math.min(96, rect.h * 0.36))} />
          </span>
        </div>
      )}
      {/* 発話リング */}
      {!state.muted && <span aria-hidden className={cx('nv-ring pointer-events-none absolute inset-0 border-[3px] border-[#5eead4]', big ? 'rounded-2xl' : 'rounded-xl')} />}
      {/* 名札 */}
      <div className={cx('absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1.5 rounded-lg bg-black/50 py-1 pr-2 pl-1 text-white backdrop-blur-sm', small && 'pr-1')}>
        <LevelBars muted={state.muted} />
        {!small && (
          <span className="truncate text-[11.5px] font-medium">
            {p.name}
            {me && <span className="text-white/60">（あなた）</span>}
          </span>
        )}
        {sharingIcon && <MonitorUp size={12} className="shrink-0 text-[#5eead4]" />}
      </div>
      {/* 挙手 */}
      <AnimatePresence>
        {state.hand && (
          <motion.span
            initial={reduced ? { opacity: 0 } : { scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="absolute top-1.5 left-1.5 grid size-7 place-items-center rounded-full bg-[#fbbf24] text-[14px] shadow-lg"
            aria-hidden
          >
            ✋
          </motion.span>
        )}
      </AnimatePresence>
      {state.weak && !small && (
        <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-black/45 text-[#fbbf24] group-hover/tile:opacity-0" title="接続が不安定です">
          <WifiLow size={13} />
        </span>
      )}
      {onPin && !small && (
        <button
          type="button"
          onClick={onPin}
          aria-label={pinned ? `${p.name} の固定を解除` : `${p.name} を固定表示`}
          aria-pressed={pinned}
          className={cx(
            'absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-opacity hover:bg-black/75',
            FOCUS,
            pinned ? 'opacity-100' : 'opacity-0 group-hover/tile:opacity-100 focus-visible:opacity-100',
          )}
        >
          {pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
      )}
    </motion.div>
  )
}

/* ───────────── 字幕 ───────────── */

type Speech = { key: number; who: PId; text: string; start: number; dur: number }

function CaptionBar({ speech, prev, compact }: { speech: Speech | null; prev: Speech | null; compact?: boolean }) {
  const [, force] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => force((n) => n + 1), 80)
    return () => window.clearInterval(t)
  }, [])
  const now = performance.now()
  const shown = speech ? speech.text.slice(0, Math.ceil(speech.text.length * Math.min(1, (now - speech.start) / (speech.dur * 0.92)))) : ''
  const line = (s: Speech, text: string, dim?: boolean) => (
    <div className={cx('flex gap-2', dim && 'opacity-55')}>
      <span className="shrink-0 font-semibold text-[#5eead4]">{PEOPLE[s.who].short}</span>
      <span className={cx('min-w-0', compact && 'line-clamp-2')}>{text}</span>
    </div>
  )
  return (
    <div aria-live="off" className={cx('pointer-events-none mx-auto w-fit max-w-[min(680px,calc(100%-24px))] rounded-xl bg-black/72 text-white shadow-lg backdrop-blur-sm', compact ? 'px-3 py-1.5 text-[12px] leading-snug' : 'px-3.5 py-2 text-[13px] leading-relaxed')}>
      {!compact && prev && prev.key !== speech?.key && line(prev, prev.text, true)}
      {speech ? line(speech, shown) : !prev && <span className="text-white/60">字幕を待っています…</span>}
    </div>
  )
}

/* ───────────── 本体 ───────────── */

type Toast = { id: number; text: string; who?: PId; icon?: ReactNode; tone?: 'warn' }
type Floater = { id: number; emoji: string; who: PId; x: number }
type Phase = 'lobby' | 'joining' | 'call' | 'left'
type Panel = 'chat' | 'people' | null

export function VideoCall() {
  const reduced = Boolean(useReducedMotion())
  const rootRef = useRef<HTMLDivElement>(null)
  const root = useSize(rootRef)
  const [stageRef, stage] = useMeasure()
  useKeepFocus(rootRef)

  const [phase, setPhase] = useState<Phase>('lobby')
  const [name, setName] = useState(PEOPLE.me.name)
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const [bg, setBg] = useState<Bg>('none')
  const [devices, setDevices] = useState({ camera: '内蔵 HD カメラ', mic: '既定 - 内蔵マイク', speaker: '内蔵スピーカー' })
  const [testing, setTesting] = useState(false)
  const [parts, setParts] = useState(INITIAL_PARTS)
  const [layout, setLayout] = useState<'grid' | 'speaker'>('grid')
  const [pinned, setPinned] = useState<PId | null>(null)
  const [sharing, setSharing] = useState(false)
  const [slide, setSlide] = useState(0)
  const [picker, setPicker] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [chat, setChat] = useState<ChatMsg[]>(SEED_CHAT)
  const [unread, setUnread] = useState(0)
  const [draft, setDraft] = useState('')
  const [captions, setCaptions] = useState(true)
  const [hand, setHand] = useState(false)
  const [menu, setMenu] = useState<'react' | 'more' | 'leave' | 'net' | null>(null)
  const [floaters, setFloaters] = useState<Floater[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [speech, setSpeech] = useState<Speech | null>(null)
  const [prevSpeech, setPrevSpeech] = useState<Speech | null>(null)
  const [dominant, setDominant] = useState<PId>('morikawa')
  const [net, setNet] = useState<'good' | 'fair'>('good')
  const [shareHint, setShareHint] = useState(false)
  const [joinedAt, setJoinedAt] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [rating, setRating] = useState(0)
  const [query, setQuery] = useState('')

  const narrow = root.w > 0 && root.w < 640
  const inCall = phase === 'call'

  /* 音量ループ: 登録された要素へ --lvl を毎フレーム書き込む */
  const levelEls = useRef(new Map<PId, Set<HTMLElement>>())
  const regCache = useRef(new Map<string, (el: HTMLElement | null) => void>())
  const register = useCallback<RegisterLevel>((id, slot = 'tile') => {
    let fn = regCache.current.get(`${id}:${slot}`)
    if (!fn) {
      let last: HTMLElement | null = null
      fn = (el) => {
        const set = levelEls.current.get(id) ?? new Set()
        if (last) set.delete(last)
        if (el) set.add(el)
        last = el
        levelEls.current.set(id, set)
      }
      regCache.current.set(`${id}:${slot}`, fn)
    }
    return fn
  }, [])
  const live = useRef({ speaker: null as PId | null, mic, parts, phase })
  live.current.mic = mic
  live.current.parts = parts
  live.current.phase = phase

  // 画面外では音量計算を止める
  const visible = useRef(true)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (phase === 'left') return
    let raf = 0
    const lv: Partial<Record<PId, number>> = {}
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible.current) return
      const t = now / 1000
      const L = live.current
      for (const id of ALL) {
        let target: number
        if (id === 'me') {
          // 自分: 部屋の小さな物音 + ロビーではときどき話している(マイクテスト)
          const talk = L.phase === 'lobby' ? vnoise(t * 0.45) > 0.55 : vnoise(t * 0.3 + 40) > 0.82
          target = talk ? speechLevel(t, 9) * 0.85 : 0.03 + 0.05 * vnoise(t * 5)
        } else if (L.speaker === id) target = speechLevel(t, PEOPLE[id].seed)
        else target = 0.012 + 0.03 * vnoise(t * 3 + PEOPLE[id].seed * 9)
        const cur = lv[id] ?? 0
        const next = cur + (target - cur) * (target > cur ? 0.5 : 0.14)
        lv[id] = next
        const audible = id === 'me' ? L.mic : !L.parts[id as Exclude<PId, 'me'>].muted
        const v = audible ? next : 0
        levelEls.current.get(id)?.forEach((el) => el.style.setProperty('--lvl', v.toFixed(3)))
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  /* トースト */
  const notify = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((ts) => [...ts.slice(-2), { ...t, id }])
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3400)
  }, [])

  /* リアクション */
  const react = useCallback(
    (emoji: string, who: PId = 'me') => {
      const id = Date.now() + Math.random()
      setFloaters((f) => [...f.slice(-14), { id, emoji, who, x: 8 + Math.random() * 18 }])
      window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 3600)
    },
    [],
  )

  /* チャット */
  const panelRef = useRef(panel)
  panelRef.current = panel
  const pushChat = useCallback((m: Omit<ChatMsg, 'id' | 'at'>, at: string) => {
    setChat((c) => [...c, { ...m, id: `m${Date.now()}${Math.random()}`, at }])
    if (panelRef.current !== 'chat' && m.from !== 'me') setUnread((n) => n + 1)
  }, [])
  const nowClock = () => clockStr(MEETING_BASE_SEC + (performance.now() - joinedAt) / 1000)

  /* 通話中の台本と出来事 */
  useEffect(() => {
    if (phase !== 'call') return
    const timers: number[] = []
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    let idx = -1
    let stopped = false
    const step = () => {
      if (stopped) return
      const ps = live.current.parts
      for (let k = 0; k < SCRIPT.length; k++) {
        idx = (idx + 1) % SCRIPT.length
        const w = SCRIPT[idx].who
        if (w !== 'me' && ps[w as Exclude<PId, 'me'>].present) break
      }
      const line = SCRIPT[idx]
      const who = line.who as Exclude<PId, 'me'>
      const dur = 1500 + line.text.length * 105
      const wasMuted = live.current.parts[who].muted
      if (wasMuted) setParts((p) => ({ ...p, [who]: { ...p[who], muted: false } }))
      setParts((p) => (p[who].hand ? { ...p, [who]: { ...p[who], hand: false } } : p))
      const s: Speech = { key: Date.now(), who, text: line.text, start: performance.now(), dur }
      live.current.speaker = who
      setSpeech((cur) => {
        if (cur) setPrevSpeech(cur)
        return s
      })
      setDominant(who)
      if (line.askShare) {
        setShareHint(true)
        later(9000, () => setShareHint(false))
      }
      later(dur, () => {
        live.current.speaker = null
        if (wasMuted) later(500, () => setParts((p) => ({ ...p, [who]: { ...p[who], muted: true } })))
        later(650 + Math.random() * 500, step)
      })
    }
    later(1400, step)
    // 出来事
    later(4500, () => pushChat({ from: 'onodera', text: '封筒のモックアップ、共有フォルダに置きました' }, '14:06'))
    later(6500, () => {
      setParts((p) => ({ ...p, murakami: { ...p.murakami, present: true } }))
      notify({ text: '村上 葵さんが参加しました', who: 'murakami' })
    })
    later(12000, () => react('👏', 'hasebe'))
    later(14500, () => react('🎉', 'murakami'))
    later(17000, () => {
      setNet('fair')
      notify({ text: 'ネットワークが不安定です。映像の画質を下げています', icon: <WifiLow size={15} />, tone: 'warn' })
      later(7000, () => setNet('good'))
    })
    later(21000, () => pushChat({ from: 'murakami', text: '途中からすみません！ 搬入日の件はあとで共有します🙏' }, '14:07'))
    later(26000, () => setParts((p) => ({ ...p, hasebe: { ...p.hasebe, hand: true } })))
    later(34000, () => {
      if (!live.current.mic) notify({ text: 'ミュート中です。話すときはマイクをオンにしてください（M）', icon: <MicOff size={15} />, tone: 'warn' })
    })
    later(46000, () => {
      setParts((p) => ({ ...p, nakamura: { ...p.nakamura, present: false } }))
      notify({ text: '中村 理央さんが退出しました', who: 'nakamura' })
    })
    later(53000, () => {
      setParts((p) => ({ ...p, nakamura: { ...p.nakamura, present: true } }))
      notify({ text: '中村 理央さんが再参加しました', who: 'nakamura' })
    })
    return () => {
      stopped = true
      live.current.speaker = null
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [phase, notify, pushChat, react])

  /* 経過時間 */
  useEffect(() => {
    if (phase !== 'call') return
    const t = window.setInterval(() => setElapsed(Math.floor((performance.now() - joinedAt) / 1000)), 1000)
    return () => window.clearInterval(t)
  }, [phase, joinedAt])

  /* 参加 / 退出 */
  const join = () => {
    setPhase('joining')
    window.setTimeout(() => {
      setPhase('call')
      setJoinedAt(performance.now())
      setElapsed(0)
      setParts(INITIAL_PARTS)
      setSpeech(null)
      setPrevSpeech(null)
      setSharing(false)
      setHand(false)
      setPanel(null)
      setUnread(0)
      setChat(SEED_CHAT)
      notify({ text: 'このミーティングは録画されています', icon: <Circle size={11} className="fill-[#ef4444] text-[#ef4444]" /> })
    }, 1100)
  }
  const leave = () => {
    setMenu(null)
    setPhase('left')
    setRating(0)
  }

  /* 操作 */
  const toggleMic = () => setMic((m) => !m)
  const toggleCam = () => setCam((c) => !c)
  const toggleHand = () => {
    notify({ text: hand ? '手を下ろしました' : '手を挙げました', icon: <Hand size={15} /> })
    setHand(!hand)
  }
  const openPanel = (p: Panel) => {
    setPanel((cur) => (cur === p ? null : p))
    if (p === 'chat') setUnread(0)
    setMenu(null)
  }
  const startShare = () => {
    setPicker(false)
    setSharing(true)
    setSlide(0)
    setShareHint(false)
    notify({ text: '画面の共有を開始しました', icon: <MonitorUp size={15} /> })
  }
  const stopShare = () => {
    setSharing(false)
    notify({ text: '画面の共有を停止しました', icon: <ScreenShareOff size={15} /> })
  }
  const sendChat = () => {
    const text = draft.trim()
    if (!text) return
    pushChat({ from: 'me', text }, nowClock())
    setDraft('')
    window.setTimeout(() => pushChat({ from: 'morikawa', text: 'ありがとうございます！ 確認します👍' }, nowClock()), 2600)
  }
  useEffect(() => {
    if (sharing) {
      const t = window.setTimeout(() => react('👏', 'morikawa'), 2500)
      return () => window.clearTimeout(t)
    }
  }, [sharing, slide, react])

  /* キーボード */
  const onKeyDown = (e: ReactKeyboardEvent) => {
    const target = e.target as HTMLElement
    const typing = !!target.closest('input, textarea, select')
    if (e.key === 'Escape') {
      if (picker) setPicker(false)
      else if (menu) setMenu(null)
      else if (panel) setPanel(null)
      else if (pinned) setPinned(null)
      else return
      e.preventDefault()
      return
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return
    if (phase !== 'call' && phase !== 'lobby') return
    const k = e.key.toLowerCase()
    if (k === 'm') toggleMic()
    else if (k === 'v') toggleCam()
    else if (k === 'h' && inCall) toggleHand()
    else if (k === 'c' && inCall) setCaptions((c) => !c)
    else if (sharing && e.key === 'ArrowRight') setSlide((s) => Math.min(SLIDE_TITLES.length - 1, s + 1))
    else if (sharing && e.key === 'ArrowLeft') setSlide((s) => Math.max(0, s - 1))
    else return
    e.preventDefault()
  }

  /* タイル配置 */
  const present = REMOTES.filter((id) => parts[id as Exclude<PId, 'me'>].present)
  const order: PId[] = [...present, 'me']
  const stateOf = (id: PId): PState => (id === 'me' ? { present: true, muted: !mic, cam, hand } : parts[id as Exclude<PId, 'me'>])
  const presentation = sharing
  const effLayout = presentation || pinned ? 'speaker' : layout
  const mainId: PId | 'share' = presentation ? 'share' : pinned ?? (dominant !== 'me' && present.includes(dominant) ? dominant : present[0] ?? 'me')
  const rects = useMemo(() => {
    const m = new Map<string, Rect>()
    let overflow: { rect: Rect; count: number } | null = null
    const W = stage.w
    const H = stage.h - (narrow && captions ? 50 : 0)
    if (!W || H <= 0) return { m, overflow }
    if (effLayout === 'grid') {
      gridRects(order.length, W, H).forEach((r, i) => m.set(order[i], r))
    } else {
      const stripIds = order.filter((id) => id !== mainId)
      const s = speakerRects(stripIds, W, H)
      m.set(mainId, s.main)
      s.strip.forEach((r, id) => m.set(id, r))
      overflow = s.overflow
    }
    return { m, overflow }
  }, [effLayout, order.join(','), mainId, stage.w, stage.h, narrow, captions]) // eslint-disable-line react-hooks/exhaustive-deps

  const shareRect = rects.m.get('share')

  /* ───────── 描画 ───────── */

  const ctrlBtn = (opts: {
    label: string
    kbd?: string
    on?: boolean
    danger?: boolean
    active?: boolean
    onClick: () => void
    children: ReactNode
    badge?: number
    pulse?: boolean
    pressed?: boolean
  }) => (
    <span className="group/tip relative">
      <button
        type="button"
        aria-label={opts.label}
        aria-pressed={opts.pressed}
        onClick={opts.onClick}
        className={cx(
          'relative grid size-11 place-items-center rounded-full transition-colors',
          FOCUS,
          opts.danger ? 'bg-[#ef4444] text-white hover:bg-[#f05252]' : opts.active ? 'bg-[#5eead4] text-[#0b1e1b] hover:bg-[#7ff0dd]' : 'bg-[#2a2f3a] text-[#e6e9ef] hover:bg-[#353b48]',
        )}
      >
        {opts.pulse && !reduced && <span aria-hidden className="absolute -inset-1 animate-ping rounded-full border-2 border-[#5eead4]" />}
        {opts.children}
        {!!opts.badge && (
          <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#5eead4] px-1 text-[10px] font-bold text-[#0b1e1b] ring-2 ring-[#111318]">{opts.badge}</span>
        )}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-md bg-[#e6e9ef] px-2 py-1 text-[11px] font-medium whitespace-nowrap text-[#111318] opacity-0 shadow-lg transition-opacity delay-300 group-hover/tip:opacity-100">
        {opts.label}
        {opts.kbd && <kbd className="ml-1.5 rounded bg-black/10 px-1 font-sans">{opts.kbd}</kbd>}
      </span>
    </span>
  )

  const micMeter = (
    <div ref={register('me', 'meter')} className="flex h-4 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="w-[5px] rounded-sm"
          style={{
            height: `${6 + i * 0.7}px`,
            background: i > 11 ? '#f87171' : i > 8 ? '#fbbf24' : '#5eead4',
            opacity: `clamp(0.14, calc(var(--lvl, 0) * 16 - ${i}), 1)`,
          }}
        />
      ))}
    </div>
  )

  /* ロビー */
  const lobby = (
    <div className="flex h-full flex-col overflow-y-auto [scrollbar-width:thin]">
      <header className="flex h-14 shrink-0 items-center gap-2.5 px-5">
        <MadoiMark size={26} />
        <span className="text-[16px] font-bold tracking-tight text-white">Madoi Meet</span>
        <span className="ml-auto flex items-center gap-2 text-[12px] text-[#9aa3b2]">
          <span className="hidden @md:inline">haruka@tomoshibi-lab.jp</span>
          <Avatar id="me" size={28} />
        </span>
      </header>
      <div className="grid flex-1 content-center gap-6 px-5 pb-6 @3xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] @3xl:gap-10 @3xl:px-10">
        {/* プレビュー */}
        <div className="min-w-0">
          <div ref={register('me', 'preview')} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#1c2029] shadow-[0_20px_60px_-20px_rgb(0_0_0/0.8)]">
            <AnimatePresence mode="wait" initial={false}>
              {cam ? (
                <motion.div key={`on-${bg}`} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <VideoArt scene={bg === 'beach' ? 'beach' : bg === 'library' ? 'library' : 'room'} look={PEOPLE.me.look} seed={1} blur={bg === 'blur'} />
                </motion.div>
              ) : (
                <motion.div key="off" className="absolute inset-0 grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <div className="text-center">
                    <div className="mx-auto w-fit">
                      <Avatar id="me" size={72} />
                    </div>
                    <div className="mt-3 text-[13px] text-[#9aa3b2]">カメラはオフです</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {mic && <span aria-hidden className="nv-ring pointer-events-none absolute inset-0 rounded-2xl border-[3px] border-[#5eead4]" />}
            <div className="absolute top-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-[11.5px] text-white backdrop-blur-sm">{name.trim() || '名前未設定'}</div>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
              <button
                type="button"
                onClick={toggleMic}
                aria-label={mic ? 'マイクをオフ' : 'マイクをオン'}
                aria-pressed={!mic}
                className={cx('grid size-12 place-items-center rounded-full backdrop-blur transition-colors', FOCUS, mic ? 'border border-white/30 bg-black/30 text-white hover:bg-black/45' : 'bg-[#ef4444] text-white')}
              >
                {mic ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button
                type="button"
                onClick={toggleCam}
                aria-label={cam ? 'カメラをオフ' : 'カメラをオン'}
                aria-pressed={!cam}
                className={cx('grid size-12 place-items-center rounded-full backdrop-blur transition-colors', FOCUS, cam ? 'border border-white/30 bg-black/30 text-white hover:bg-black/45' : 'bg-[#ef4444] text-white')}
              >
                {cam ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2 text-[12px] text-[#9aa3b2]">
              {mic ? <Mic size={14} /> : <MicOff size={14} className="text-[#f87171]" />}
              {micMeter}
            </div>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="背景エフェクト">
              <Sparkles size={14} className="mr-1 text-[#9aa3b2]" aria-hidden />
              {BGS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={bg === b.id}
                  onClick={() => setBg(b.id)}
                  className={cx('h-7 rounded-full border px-2.5 text-[11.5px] transition-colors', FOCUS, bg === b.id ? 'border-[#5eead4] bg-[#5eead4]/15 text-[#5eead4]' : 'border-white/12 text-[#c3c9d4] hover:bg-white/6')}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* 参加の準備 */}
        <div className="min-w-0">
          <div className="text-[12px] font-medium tracking-wide text-[#5eead4]">11月12日(木) 14:00〜15:00</div>
          <h2 className="mt-1 text-[24px] leading-tight font-bold text-white">デザイン定例</h2>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex -space-x-2">
              {(['morikawa', 'hasebe', 'onodera', 'nakamura'] as PId[]).map((id) => (
                <span key={id} className="rounded-full ring-2 ring-[#111318]">
                  <Avatar id={id} size={26} />
                </span>
              ))}
            </div>
            <span className="text-[12.5px] text-[#c3c9d4]">森川さん、長谷部さんほか 2 人が参加中</span>
          </div>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-[11.5px] text-[#9aa3b2]">表示名</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#1c2029] px-3 text-[13.5px] text-white outline-none transition-colors focus:border-[#5eead4]"
            />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-2 @md:grid-cols-3 @3xl:grid-cols-1">
            {(
              [
                { k: 'camera', icon: Video, label: 'カメラ', opts: ['内蔵 HD カメラ', 'Lumo C2（USB）'] },
                { k: 'mic', icon: Mic, label: 'マイク', opts: ['既定 - 内蔵マイク', 'Kotone USB マイク'] },
                { k: 'speaker', icon: Volume2, label: 'スピーカー', opts: ['内蔵スピーカー', 'ヘッドホン（Bluetooth）'] },
              ] as const
            ).map((d) => (
              <label key={d.k} className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-[#1c2029] pr-1 pl-3 focus-within:border-[#5eead4]">
                <d.icon size={15} className="shrink-0 text-[#9aa3b2]" aria-hidden />
                <span className="sr-only">{d.label}</span>
                <select
                  value={devices[d.k]}
                  onChange={(e) => setDevices((v) => ({ ...v, [d.k]: e.target.value }))}
                  className="h-full min-w-0 flex-1 cursor-pointer bg-transparent text-[12.5px] text-[#e6e9ef] outline-none [&>option]:bg-[#1c2029]"
                >
                  {d.opts.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                {d.k === 'speaker' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTesting(true)
                      window.setTimeout(() => setTesting(false), 2200)
                    }}
                    className={cx('flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[11.5px] text-[#5eead4] hover:bg-white/6', FOCUS)}
                  >
                    {testing ? (
                      <span className="flex h-3 items-end gap-[2px]" aria-label="再生中">
                        {[0, 1, 2, 3].map((i) => (
                          <motion.span key={i} className="w-[2px] rounded-full bg-[#5eead4]" animate={reduced ? { height: 8 } : { height: [3, 12, 5, 10, 3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }} />
                        ))}
                      </span>
                    ) : (
                      'テスト'
                    )}
                  </button>
                )}
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={join}
              disabled={phase === 'joining'}
              className={cx('inline-flex h-11 items-center gap-2 rounded-full bg-[#5eead4] px-6 text-[14px] font-bold text-[#0b1e1b] shadow-[0_10px_30px_-10px_rgb(94_234_212/0.7)] transition hover:bg-[#7ff0dd] disabled:opacity-70', FOCUS)}
            >
              {phase === 'joining' ? (
                <>
                  <motion.span className="size-4 rounded-full border-2 border-[#0b1e1b] border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                  参加しています…
                </>
              ) : (
                '今すぐ参加'
              )}
            </button>
            <span className="text-[11.5px] text-[#7d8696]">
              <kbd className="font-sans">M</kbd> マイク・<kbd className="font-sans">V</kbd> カメラ
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  /* パネル */
  const sortedPeople = [...order].sort((a, b) => Number(stateOf(b).hand) - Number(stateOf(a).hand) || (a === 'me' ? -1 : b === 'me' ? 1 : 0))
  const panelEl = panel && (
    <motion.aside
      key={panel}
      aria-label={panel === 'chat' ? 'チャット' : '参加者'}
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          setPanel(null)
        }
      }}
      className={cx('flex min-h-0 flex-col overflow-hidden rounded-2xl bg-[#f5f7fa] text-[#1b2130]', narrow ? 'absolute inset-2 z-30' : 'w-[300px] shrink-0')}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#e3e7ee] pr-2 pl-4">
        <h3 className="text-[14px] font-semibold">{panel === 'chat' ? '通話中のメッセージ' : `参加者（${order.length}）`}</h3>
        <button type="button" onClick={() => setPanel(null)} aria-label="パネルを閉じる" className="ml-auto grid size-8 place-items-center rounded-full text-[#5b6477] hover:bg-black/6 focus-visible:outline-2 focus-visible:outline-[#0f766e]">
          <X size={17} />
        </button>
      </div>
      {panel === 'chat' ? (
        <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 [scrollbar-width:thin]" ref={(el) => el?.scrollTo({ top: el.scrollHeight })}>
            <div className="rounded-lg bg-[#e8edf3] px-3 py-2 text-[11px] leading-relaxed text-[#5b6477]">メッセージは通話の参加者全員に表示され、通話が終わると消えます。</div>
            <AnimatePresence initial={false}>
              {chat.map((m) => (
                <motion.div key={m.id} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex gap-2.5">
                  <Avatar id={m.from} size={26} />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-semibold">{m.from === 'me' ? 'あなた' : PEOPLE[m.from].name}</span>
                      <span className="text-[10.5px] text-[#8d95a7]">{m.at}</span>
                    </div>
                    <div className="mt-0.5 text-[12.5px] leading-relaxed break-words text-[#2b3242]">{m.text}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <form
            className="m-3 flex items-center gap-1 rounded-full border border-[#dfe3ea] bg-white py-1 pr-1 pl-4 focus-within:border-[#0f766e]"
            onSubmit={(e) => {
              e.preventDefault()
              sendChat()
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="メッセージを送信" aria-label="メッセージを入力" className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#8d95a7]" />
            <button type="submit" disabled={!draft.trim()} aria-label="送信" className="grid size-8 place-items-center rounded-full bg-[#0f766e] text-white transition-opacity disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]">
              <Send size={14} />
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="flex gap-2 px-3 pt-3">
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#dfe3ea] bg-white px-3 focus-within:border-[#0f766e]">
              <Search size={14} className="text-[#8d95a7]" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="参加者を検索" aria-label="参加者を検索" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none" />
            </label>
            <button
              type="button"
              onClick={() => notify({ text: '招待リンクをコピーしました', icon: <Link2 size={15} /> })}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#0f766e] px-3 text-[12px] font-semibold text-white hover:bg-[#0d6961] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
            >
              <Copy size={13} />
              招待
            </button>
          </div>
          <div className="mt-2 mb-1 px-4 text-[11px] font-semibold tracking-wide text-[#8d95a7]">このミーティング</div>
          <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]">
            <AnimatePresence initial={false}>
              {sortedPeople
                .filter((id) => !query.trim() || PEOPLE[id].name.includes(query.trim()))
                .map((id) => {
                  const st = stateOf(id)
                  return (
                    <motion.li key={id} layout={reduced ? false : 'position'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-black/4">
                      <Avatar id={id} size={32} ring={!st.muted} register={register} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">
                          {id === 'me' ? name.trim() || PEOPLE.me.name : PEOPLE[id].name}
                          {id === 'me' && <span className="text-[#8d95a7]">（あなた）</span>}
                        </div>
                        {(PEOPLE[id].host || st.weak) && <div className="text-[11px] text-[#8d95a7]">{PEOPLE[id].host ? '主催者' : '接続が不安定'}</div>}
                      </div>
                      {st.hand && <span aria-label="挙手中" className="text-[15px]">✋</span>}
                      <span className={st.muted ? 'text-[#ef4444]' : 'text-[#5b6477]'} aria-label={st.muted ? 'ミュート中' : 'マイクオン'}>
                        {st.muted ? <MicOff size={15} /> : <Mic size={15} />}
                      </span>
                      <span className={st.cam ? 'text-[#5b6477]' : 'text-[#ef4444]'} aria-label={st.cam ? 'カメラオン' : 'カメラオフ'}>
                        {st.cam ? <Video size={15} /> : <VideoOff size={15} />}
                      </span>
                    </motion.li>
                  )
                })}
            </AnimatePresence>
          </ul>
        </>
      )}
    </motion.aside>
  )

  /* 通話画面 */
  const net2 = net === 'good'
  const callView = (
    <div className="flex h-full flex-col pb-[var(--solo-footer-clearance,0px)]">
      {/* 上部バー */}
      <div className="flex h-12 shrink-0 items-center gap-2 px-3">
        <MadoiMark size={22} />
        <span className="min-w-0 truncate text-[13.5px] font-semibold text-white">デザイン定例</span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#ef4444]/15 px-1.5 py-0.5 text-[10.5px] font-bold tracking-wider text-[#f87171]" title="このミーティングは録画されています">
          <span className="nv-rec size-1.5 rounded-full bg-[#ef4444]" />
          REC
        </span>
        <span className="shrink-0 text-[12.5px] text-[#9aa3b2] tabular-nums" aria-label="経過時間">
          {fmtDur(MEETING_BASE_SEC + elapsed, true)}
        </span>
        <span className="ml-auto" />
        <span className="relative">
          <button
            type="button"
            onClick={() => setMenu(menu === 'net' ? null : 'net')}
            aria-label={`ネットワーク品質: ${net2 ? '良好' : '不安定'}`}
            aria-expanded={menu === 'net'}
            className={cx('flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] hover:bg-white/8', FOCUS, net2 ? 'text-[#9aa3b2]' : 'text-[#fbbf24]')}
          >
            <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
              {[5, 8, 11, 14].map((h, i) => (
                <span key={h} className="w-[3px] rounded-sm transition-colors" style={{ height: h, background: i < (net2 ? 4 : 2) ? (net2 ? '#5eead4' : '#fbbf24') : '#3a4150' }} />
              ))}
            </span>
            <span className="hidden @md:inline">{net2 ? '良好' : '不安定'}</span>
          </button>
          <AnimatePresence>{menu === 'net' && <NetPopover good={net2} onClose={() => setMenu(null)} />}</AnimatePresence>
        </span>
        <div className="hidden items-center rounded-full bg-[#1c2029] p-0.5 @md:flex" role="radiogroup" aria-label="レイアウト">
          {(
            [
              { id: 'grid', label: 'グリッド', icon: LayoutGrid },
              { id: 'speaker', label: 'スピーカー', icon: PanelsTopLeft },
            ] as const
          ).map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={layout === l.id}
              aria-label={`${l.label}表示`}
              disabled={presentation}
              onClick={() => {
                setLayout(l.id)
                setPinned(null)
              }}
              className={cx('relative grid h-7 w-9 place-items-center rounded-full transition-colors disabled:opacity-40', FOCUS, effLayout === l.id ? 'text-[#0b1e1b]' : 'text-[#9aa3b2] hover:text-white')}
            >
              {effLayout === l.id && <motion.span layoutId={reduced ? undefined : 'nv-layout-pill'} className="absolute inset-0 rounded-full bg-[#5eead4]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <l.icon size={15} className="relative" />
            </button>
          ))}
        </div>
      </div>

      {/* ステージ + パネル */}
      <div className="relative flex min-h-0 flex-1 gap-2 px-2">
        <div ref={stageRef} className="relative min-h-0 min-w-0 flex-1">
          {/* 共有中のスライド */}
          <AnimatePresence>
            {presentation && shareRect && (
              <motion.div
                key="share"
                className="absolute top-0 left-0 overflow-hidden rounded-2xl bg-[#0b0d12]"
                initial={{ x: shareRect.x, y: shareRect.y, width: shareRect.w, height: shareRect.h, opacity: 0 }}
                animate={{ x: shareRect.x, y: shareRect.y, width: shareRect.w, height: shareRect.h, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 32, opacity: { duration: 0.25 } }}
              >
                <div className="absolute inset-0 grid place-items-center p-3 pt-11">
                  <div className="aspect-video max-h-full w-full max-w-full overflow-hidden rounded-md shadow-2xl" style={{ maxWidth: `calc((${shareRect.h}px - 56px) * 16 / 9)` }}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div key={slide} className="size-full" initial={{ opacity: 0, x: reduced ? 0 : 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduced ? 0 : -16 }} transition={{ duration: 0.22 }}>
                        <Slide index={slide} />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="absolute inset-x-0 top-0 flex h-10 items-center gap-2 bg-gradient-to-b from-black/60 to-transparent px-3 text-white">
                  <MonitorUp size={14} className="shrink-0 text-[#5eead4]" />
                  <span className="min-w-0 truncate text-[12px]">あなたが「ブランドガイドライン v3」を共有しています</span>
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    <button type="button" aria-label="前のスライド" disabled={slide === 0} onClick={() => setSlide((s) => s - 1)} className={cx('grid size-7 place-items-center rounded-full hover:bg-white/15 disabled:opacity-30', FOCUS)}>
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[11.5px] tabular-nums">
                      {slide + 1} / {SLIDE_TITLES.length}
                    </span>
                    <button type="button" aria-label="次のスライド" disabled={slide === SLIDE_TITLES.length - 1} onClick={() => setSlide((s) => s + 1)} className={cx('grid size-7 place-items-center rounded-full hover:bg-white/15 disabled:opacity-30', FOCUS)}>
                      <ChevronRight size={16} />
                    </button>
                    <button type="button" onClick={stopShare} className={cx('ml-1 h-7 rounded-full bg-[#ef4444] px-3 text-[11.5px] font-semibold hover:bg-[#f05252]', FOCUS)}>
                      共有を停止
                    </button>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* 参加者タイル */}
          <AnimatePresence>
            {order.map((id) => {
              const r = rects.m.get(id)
              if (!r) return null
              return (
                <Tile
                  key={id}
                  id={id}
                  rect={r}
                  state={stateOf(id)}
                  me={id === 'me'}
                  bg={bg}
                  big={id === mainId}
                  pinned={pinned === id}
                  sharingIcon={id === 'me' && sharing}
                  reduced={reduced}
                  register={register}
                  onPin={presentation ? undefined : () => setPinned((p) => (p === id ? null : id))}
                />
              )
            })}
          </AnimatePresence>
          {rects.overflow && (
            <button
              type="button"
              onClick={() => openPanel('people')}
              className={cx('absolute grid place-items-center rounded-xl bg-[#2a2f3a] text-[13px] font-semibold text-white hover:bg-[#353b48]', FOCUS)}
              style={{ left: rects.overflow.rect.x, top: rects.overflow.rect.y, width: rects.overflow.rect.w, height: rects.overflow.rect.h }}
              aria-label={`ほか ${rects.overflow.count} 人を表示`}
            >
              +{rects.overflow.count}
            </button>
          )}
          {/* リアクション */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <AnimatePresence>
              {floaters.map((f) => (
                <motion.div
                  key={f.id}
                  className="absolute bottom-3 flex flex-col items-center"
                  style={{ left: `${f.x}%` }}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={reduced ? { opacity: [0, 1, 1, 0], y: -30, scale: 1 } : { opacity: [0, 1, 1, 0], y: -Math.max(160, stage.h * 0.7), x: [0, 14, -12, 8, 0], scale: [0.5, 1.15, 1, 1] }}
                  transition={{ duration: reduced ? 2 : 3.2, ease: 'easeOut', times: reduced ? undefined : [0, 0.1, 0.75, 1] }}
                >
                  <span className="text-[30px] drop-shadow-[0_4px_8px_rgb(0_0_0/0.4)]">{f.emoji}</span>
                  <span className="mt-0.5 rounded-full bg-black/55 px-1.5 text-[10px] text-white">{f.who === 'me' ? 'あなた' : PEOPLE[f.who].short}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {/* 字幕 */}
          <AnimatePresence>
            {captions && (
              <motion.div className={cx('pointer-events-none absolute inset-x-0 z-20', narrow ? 'bottom-0' : 'bottom-3')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.18 }}>
                <CaptionBar speech={speech} prev={prevSpeech} compact={narrow} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence mode="popLayout">{panelEl}</AnimatePresence>
      </div>

      {/* コントロールバー */}
      <div className="relative flex h-[68px] shrink-0 items-center gap-2 px-3">
        <div className="hidden min-w-0 flex-1 items-center gap-2 text-[12.5px] text-[#c3c9d4] @3xl:flex">
          <span className="tabular-nums">{clockStr(MEETING_BASE_SEC + elapsed)}</span>
          <span className="text-[#4a5262]">|</span>
          <span className="truncate">nagi.meet/tmb-qkrw-akr</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 @3xl:flex-none">
          {ctrlBtn({ label: mic ? 'マイクをオフ' : 'マイクをオン', kbd: 'M', danger: !mic, pressed: !mic, onClick: toggleMic, children: mic ? <Mic size={19} /> : <MicOff size={19} /> })}
          {ctrlBtn({ label: cam ? 'カメラをオフ' : 'カメラをオン', kbd: 'V', danger: !cam, pressed: !cam, onClick: toggleCam, children: cam ? <Video size={19} /> : <VideoOff size={19} /> })}
          {ctrlBtn({
            label: sharing ? '共有を停止' : '画面を共有',
            active: sharing,
            pulse: shareHint && !sharing,
            onClick: () => (sharing ? stopShare() : setPicker(true)),
            children: sharing ? <ScreenShareOff size={19} /> : <MonitorUp size={19} />,
          })}
          <span className="relative">
            {ctrlBtn({ label: 'リアクション', active: menu === 'react', onClick: () => setMenu(menu === 'react' ? null : 'react'), children: <SmilePlus size={19} /> })}
            <AnimatePresence>
              {menu === 'react' && (
                <Popover onClose={() => setMenu(null)} className="bottom-full left-1/2 mb-3 -translate-x-1/2" label="リアクション">
                  <div className="flex gap-0.5 p-1">
                    {REACTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => react(e)}
                        aria-label={`${e} を送る`}
                        className="grid size-10 place-items-center rounded-xl text-[22px] transition-transform hover:scale-125 hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-[#5eead4] motion-reduce:hover:scale-100"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </Popover>
              )}
            </AnimatePresence>
          </span>
          {!narrow && ctrlBtn({ label: hand ? '手を下ろす' : '手を挙げる', kbd: 'H', active: hand, pressed: hand, onClick: toggleHand, children: <Hand size={19} /> })}
          {!narrow && ctrlBtn({ label: captions ? '字幕をオフ' : '字幕をオン', kbd: 'C', active: captions, pressed: captions, onClick: () => setCaptions((c) => !c), children: captions ? <Captions size={19} /> : <CaptionsOff size={19} /> })}
          {narrow && (
            <span className="relative">
              {ctrlBtn({ label: 'その他の操作', active: menu === 'more', badge: unread, onClick: () => setMenu(menu === 'more' ? null : 'more'), children: <Ellipsis size={19} /> })}
              <AnimatePresence>
                {menu === 'more' && (
                  <Popover onClose={() => setMenu(null)} className="right-0 bottom-full mb-3 w-56" label="その他の操作">
                    {[
                      { label: hand ? '手を下ろす' : '手を挙げる', icon: <Hand size={16} />, run: toggleHand, on: hand },
                      { label: captions ? '字幕をオフ' : '字幕をオン', icon: <Captions size={16} />, run: () => setCaptions((c) => !c), on: captions },
                      { label: layout === 'grid' ? 'スピーカー表示' : 'グリッド表示', icon: layout === 'grid' ? <PanelsTopLeft size={16} /> : <LayoutGrid size={16} />, run: () => setLayout((l) => (l === 'grid' ? 'speaker' : 'grid')) },
                      { label: `チャット${unread ? `（${unread}）` : ''}`, icon: <MessageSquareText size={16} />, run: () => openPanel('chat') },
                      { label: '参加者', icon: <Users size={16} />, run: () => openPanel('people') },
                    ].map((it) => (
                      <button
                        key={it.label}
                        type="button"
                        onClick={() => {
                          it.run()
                          setMenu(null)
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-[#e6e9ef] hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-[#5eead4]"
                      >
                        <span className={it.on ? 'text-[#5eead4]' : 'text-[#9aa3b2]'}>{it.icon}</span>
                        {it.label}
                      </button>
                    ))}
                  </Popover>
                )}
              </AnimatePresence>
            </span>
          )}
          <span className="relative">
            <button
              type="button"
              onClick={() => setMenu(menu === 'leave' ? null : 'leave')}
              aria-label="退出"
              aria-expanded={menu === 'leave'}
              className={cx('grid h-11 w-14 place-items-center rounded-full bg-[#ef4444] text-white transition-colors hover:bg-[#f05252]', FOCUS)}
            >
              <PhoneOff size={19} />
            </button>
            <AnimatePresence>
              {menu === 'leave' && (
                <Popover onClose={() => setMenu(null)} className="right-0 bottom-full mb-3 w-64 @3xl:right-auto @3xl:left-1/2 @3xl:-translate-x-1/2" label="退出の確認">
                  <div className="p-3">
                    <div className="text-[13.5px] font-semibold text-white">ミーティングから退出しますか？</div>
                    <div className="mt-1 text-[12px] leading-relaxed text-[#9aa3b2]">通話はほかの参加者で続きます。あとから同じリンクで再参加できます。</div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" autoFocus onClick={() => setMenu(null)} className="h-8 rounded-full px-3 text-[12.5px] text-[#e6e9ef] hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-[#5eead4]">
                        キャンセル
                      </button>
                      <button type="button" onClick={leave} className="h-8 rounded-full bg-[#ef4444] px-4 text-[12.5px] font-semibold text-white hover:bg-[#f05252] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f87171]">
                        退出する
                      </button>
                    </div>
                  </div>
                </Popover>
              )}
            </AnimatePresence>
          </span>
        </div>
        {!narrow && (
          <div className="flex flex-none items-center justify-end gap-2 @3xl:flex-1">
            {ctrlBtn({ label: '参加者', active: panel === 'people', onClick: () => openPanel('people'), children: <Users size={19} />, badge: undefined })}
            {ctrlBtn({ label: 'チャット', active: panel === 'chat', badge: unread, onClick: () => openPanel('chat'), children: <MessageSquareText size={19} /> })}
          </div>
        )}
      </div>
    </div>
  )

  /* 退出後 */
  const leftView = (
    <div className="grid h-full place-items-center overflow-y-auto p-6">
      <motion.div initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-[380px] max-w-full text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#1c2029]">
          <PhoneOff size={24} className="text-[#f87171]" />
        </div>
        <h2 className="text-[20px] font-bold text-white">ミーティングを退出しました</h2>
        <p className="mt-1.5 text-[12.5px] text-[#9aa3b2]">デザイン定例 ・ 参加時間 {fmtDur(elapsed)}</p>
        <div className="mt-5 flex justify-center gap-2.5">
          <button type="button" onClick={join} className={cx('h-10 rounded-full bg-[#5eead4] px-5 text-[13px] font-bold text-[#0b1e1b] hover:bg-[#7ff0dd]', FOCUS)}>
            再参加
          </button>
          <button type="button" onClick={() => setPhase('lobby')} className={cx('h-10 rounded-full border border-white/15 px-5 text-[13px] text-white hover:bg-white/6', FOCUS)}>
            ロビーに戻る
          </button>
        </div>
        <div className="mt-7 rounded-2xl bg-[#1c2029] p-4">
          <div className="text-[12.5px] text-[#c3c9d4]">{rating ? 'ご協力ありがとうございました！' : '通話の品質はいかがでしたか？'}</div>
          <div className="mt-2 flex justify-center gap-1" role="radiogroup" aria-label="通話の品質">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} つ星`} onClick={() => setRating(n)} className={cx('rounded-md p-1 transition-transform hover:scale-110', FOCUS)}>
                <Star size={24} className={n <= rating ? 'fill-[#fbbf24] text-[#fbbf24]' : 'text-[#4a5262]'} />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cx('nv-root @container relative h-full w-full overflow-hidden bg-[#111318] text-[#e6e9ef] outline-none [font-feature-settings:"palt"]', reduced && 'nv-still')}
    >
      <style>{STYLES}</style>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={phase === 'joining' ? 'lobby' : phase}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: reduced ? 1 : 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: reduced ? 1 : 1.01 }}
          transition={{ duration: 0.28 }}
        >
          {phase === 'lobby' || phase === 'joining' ? lobby : phase === 'call' ? callView : leftView}
        </motion.div>
      </AnimatePresence>

      {/* 共有ピッカー */}
      <AnimatePresence>{picker && <SharePicker reduced={reduced} onClose={() => setPicker(false)} onPick={startShare} />}</AnimatePresence>

      {/* トースト */}
      <div className={cx('pointer-events-none absolute inset-x-0 z-[70] flex flex-col items-center gap-2 px-3 transition-[top] duration-300', inCall && sharing ? 'top-[100px]' : 'top-14')} aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout={!reduced}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className={cx('flex max-w-full items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-[12.5px] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.7)] backdrop-blur', t.tone === 'warn' ? 'bg-[#3a2f12]/95 text-[#fde68a]' : 'bg-[#e6e9ef]/95 text-[#111318]')}
            >
              {t.who ? <Avatar id={t.who} size={24} /> : <span className={cx('grid size-6 place-items-center rounded-full', t.tone === 'warn' ? 'bg-[#fbbf24]/20' : 'bg-black/8')}>{t.icon}</span>}
              <span className="truncate">{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ───────────── ポップオーバー・ダイアログ ───────────── */

function Popover({ children, onClose, className, label }: { children: ReactNode; onClose: () => void; className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, true, onClose)
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[autofocus], button')
    el?.focus()
  }, [])
  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label={label}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
      className={cx('absolute z-50 rounded-2xl border border-white/8 bg-[#232833] p-1 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8)]', className)}
    >
      {children}
    </motion.div>
  )
}

function NetPopover({ good, onClose }: { good: boolean; onClose: () => void }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [])
  const j = (base: number, amp: number) => Math.round(base + Math.sin(tick * 1.7 + base) * amp)
  const rows = good
    ? [
        ['遅延', `${j(28, 4)} ms`],
        ['ジッター', `${j(3, 1)} ms`],
        ['パケットロス', `0.${j(2, 1)}%`],
        ['送信', '1280×720 · 30fps'],
        ['受信', '1920×1080 · 30fps'],
      ]
    : [
        ['遅延', `${j(180, 30)} ms`],
        ['ジッター', `${j(24, 6)} ms`],
        ['パケットロス', `${j(4, 1)}.${j(5, 3)}%`],
        ['送信', '640×360 · 15fps'],
        ['受信', '960×540 · 24fps'],
      ]
  return (
    <Popover onClose={onClose} className="top-full right-0 mt-2 w-60" label="ネットワークの詳細">
      <div className="p-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
          <Settings2 size={14} className="text-[#9aa3b2]" />
          接続品質：<span className={good ? 'text-[#5eead4]' : 'text-[#fbbf24]'}>{good ? '良好' : '不安定'}</span>
        </div>
        <dl className="mt-2.5 space-y-1.5 text-[12px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-[#9aa3b2]">{k}</dt>
              <dd className="text-[#e6e9ef] tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Popover>
  )
}

function SharePicker({ onClose, onPick, reduced }: { onClose: () => void; onPick: () => void; reduced: boolean }) {
  const [sel, setSel] = useState<'screen' | 'window' | 'tab'>('window')
  const [audio, setAudio] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus(), [])
  const opts = [
    { id: 'screen', label: '画面全体', sub: 'ディスプレイ 1' },
    { id: 'window', label: 'ウィンドウ', sub: 'ブランドガイドライン v3 — スライド' },
    { id: 'tab', label: 'タブ', sub: 'Tomoshibi デザインシステム' },
  ] as const
  return (
    <motion.div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="共有する画面を選択"
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
          }
        }}
        className="max-h-full w-[560px] max-w-full overflow-y-auto rounded-2xl bg-[#1c2029] p-4 shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <MonitorUp size={17} className="text-[#5eead4]" />
          <h3 className="text-[15px] font-semibold text-white">共有する画面を選択</h3>
          <button type="button" onClick={onClose} aria-label="閉じる" className={cx('ml-auto grid size-8 place-items-center rounded-full text-[#9aa3b2] hover:bg-white/8', FOCUS)}>
            <X size={17} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="共有するもの">
          {opts.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={sel === o.id}
              onClick={() => setSel(o.id)}
              onDoubleClick={onPick}
              className={cx('rounded-xl border-2 p-1.5 text-left transition-colors', FOCUS, sel === o.id ? 'border-[#5eead4] bg-[#5eead4]/8' : 'border-transparent hover:bg-white/5')}
            >
              <div className="aspect-video overflow-hidden rounded-lg">
                <ShareThumb kind={o.id} />
              </div>
              <div className="mt-1.5 px-0.5 text-[12.5px] font-semibold text-white">{o.label}</div>
              <div className="truncate px-0.5 text-[11px] text-[#9aa3b2]">{o.sub}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#c3c9d4]">
            <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} className="size-4 accent-[#5eead4]" />
            システムの音声も共有する
          </label>
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className={cx('h-9 rounded-full px-4 text-[13px] text-[#e6e9ef] hover:bg-white/8', FOCUS)}>
              キャンセル
            </button>
            <button type="button" onClick={onPick} className={cx('h-9 rounded-full bg-[#5eead4] px-5 text-[13px] font-bold text-[#0b1e1b] hover:bg-[#7ff0dd]', FOCUS)}>
              共有
            </button>
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
