import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react'
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  ArrowLeft,
  Bell,
  BellRing,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Ellipsis,
  EyeOff,
  Gamepad2,
  Gift,
  Globe,
  HandHeart,
  History,
  House,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  MonitorPlay,
  Moon,
  Pause,
  Phone,
  Play,
  Plus,
  Rss,
  Search,
  Send,
  Share2,
  Smile,
  Store,
  Sun,
  Tag,
  ThumbsUp,
  UserPlus,
  Users,
  UsersRound,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react'

/**
 * Facebook 風のソーシャルネットワーク「Hearth」のニュースフィード(サービス名・ロゴ・ユーザー・投稿・写真はすべて架空のオリジナル)。
 * - ルートを @container にし、Tailwind のコンテナクエリでデモ枠の幅(360〜1300px)に合わせて 1〜3 カラムを切り替える。
 *   色はすべて CSS 変数(--bg / --card / --fg / --accent …)で持ち、ライト/ダークは変数を差し替えるだけ
 * - アバター・ストーリーズの表紙・投稿写真はすべて SVG で描いたイラスト。星や窓明かりの配置はシード付き乱数で固定する(外部画像なし)
 * - リアクションは独自デザインの 6 種の SVG ステッカー。「いいね！」に 450ms ホバー(タッチは長押し)するとピッカーがバネで時間差に開き、
 *   ホバー中のアイコンが持ち上がってラベルが出る。選ぶとボタンの色とラベルが変わって小さな粒が弾け、集計は NumberFlow で桁が回る
 * - コメントは入れ子の返信をL字の線でつなぐ。送信したコメントはふわっと入り、少しすると投稿者が「入力中…」になって返信が届く
 * - ストーリーズは横スクロールのトレイ → 全画面ビューア。進捗バーは rAF で DOM の transform を直接更新(再レンダーなし)し、
 *   押している間は一時停止、左右タップ/矢印キーで前後へ。既読になったストーリーはリングが灰色になる
 * - 投稿作成モーダルは公開範囲・背景色プリセット(短文のみ)・気分/場所・写真の追加に対応。投稿するとフィードの先頭へレイアウトアニメーションで差し込む
 * - 連絡先をクリックすると右下にチャット窓がドッキング。最小化で丸いバブルになり、デモ枠の幅に応じて同時に開ける窓の数を変える。入力中表示と自動返信付き
 * - お知らせ(未読ドット・既読化)、メッセージ一覧、トースト、写真のライトボックス。useReducedMotion のときは装飾的な動きを止め、切り替えは短いフェードだけにする
 */

/* ───────────── テーマと共通 ───────────── */

type Theme = 'light' | 'dark'

const THEMES: Record<Theme, CSSProperties> = {
  light: {
    '--bg': '#f2efeb',
    '--card': '#ffffff',
    '--fg': '#1d1a20',
    '--muted': '#6b6570',
    '--line': '#e6e1db',
    '--thread': '#d6cfc7',
    '--hover': '#f1ede8',
    '--soft': '#ebe6e0',
    '--accent': '#e4572e',
    '--accent-soft': '#fde8df',
    '--online': '#2fb457',
    '--shadow': '0 1px 2px rgba(45,28,15,.10), 0 0 0 1px rgba(45,28,15,.03)',
    '--pop': '0 12px 34px -10px rgba(40,20,10,.35), 0 0 0 1px rgba(40,20,10,.06)',
    colorScheme: 'light',
  } as CSSProperties,
  dark: {
    '--bg': '#141217',
    '--card': '#221f26',
    '--fg': '#ece9ef',
    '--muted': '#a29cab',
    '--line': '#35313b',
    '--thread': '#48434f',
    '--hover': '#2e2a33',
    '--soft': '#312d37',
    '--accent': '#ff7552',
    '--accent-soft': '#3d2620',
    '--online': '#3ccf6a',
    '--shadow': '0 1px 2px rgba(0,0,0,.45)',
    '--pop': '0 14px 40px -10px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06)',
    colorScheme: 'dark',
  } as CSSProperties,
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)'
const SCROLL = '[scrollbar-width:thin] [scrollbar-color:var(--thread)_transparent]'
const SPRING: Transition = { type: 'spring', stiffness: 520, damping: 34 }
const POP: Transition = { type: 'spring', stiffness: 620, damping: 20 }
const FADE: Transition = { duration: 0.15 }
const BADGE_RED = '#ef3b4f'

function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** SVG の gradient id 用。useId の記号は url(#…) で問題になるので英数字だけにする */
function useSvgId() {
  return 'h' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
}

/** アンマウント時にまとめて止まる setTimeout */
function useTimers() {
  const ids = useRef(new Set<number>())
  useEffect(() => {
    const set = ids.current
    return () => set.forEach((id) => clearTimeout(id))
  }, [])
  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      ids.current.delete(id)
      fn()
    }, ms)
    ids.current.add(id)
    return id
  }, [])
}

/** 外側クリック / Esc で閉じるポップオーバー */
function useDismiss(open: boolean, ref: RefObject<HTMLElement | null>, close: () => void) {
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open, ref])
}

interface FeedApi {
  toast: (text: string) => void
  openLightbox: (photos: SceneKind[], i: number) => void
  reduce: boolean
}
const FeedCtx = createContext<FeedApi>({ toast: () => {}, openLightbox: () => {}, reduce: false })
const useFeed = () => useContext(FeedCtx)

/* ───────────── ユーザーとアバター ───────────── */

type HairStyle = 0 | 1 | 2 | 3 | 4
interface User {
  name: string
  hue: number
  skin: string
  hair: string
  style: HairStyle
  glasses?: boolean
  online?: boolean
  seen?: string
}

const USERS = {
  me: { name: '早瀬 ひかり', hue: 18, skin: '#f7d9c4', hair: '#3b2720', style: 1 },
  yuto: { name: '森 ゆうと', hue: 205, skin: '#efcdb4', hair: '#1f1a18', style: 0, glasses: true, online: true },
  sana: { name: '高木 さな', hue: 335, skin: '#f8dccb', hair: '#5a3524', style: 3, online: true },
  mei: { name: '柚木 めい', hue: 45, skin: '#f5d4bd', hair: '#2a1d18', style: 2, online: true },
  ken: { name: '小野寺 健', hue: 130, skin: '#e6bf9f', hair: '#2b2622', style: 4, seen: '12分' },
  riku: { name: '春日 陸', hue: 255, skin: '#f0cfb6', hair: '#121014', style: 0, online: true },
  aoi: { name: '水瀬 あおい', hue: 185, skin: '#f9e0cf', hair: '#6b4330', style: 1, seen: '1時間' },
  taku: { name: '石動 拓海', hue: 28, skin: '#dcae8a', hair: '#1a1514', style: 0, glasses: true, online: true },
  nana: { name: '七海 ことね', hue: 290, skin: '#f6d6c6', hair: '#3a2433', style: 3, seen: '3時間' },
  jun: { name: '佐伯 潤', hue: 95, skin: '#efc9ab', hair: '#2d241d', style: 4, online: true },
} satisfies Record<string, User>
type UserId = keyof typeof USERS
const user = (id: UserId) => USERS[id] as User
const firstName = (id: UserId) => user(id).name.split(' ')[1] ?? user(id).name

const Face = memo(function Face({ u }: { u: User }) {
  const id = useSvgId()
  const shirt = `hsl(${(u.hue + 170) % 360} 36% 46%)`
  const back =
    u.style === 1 ? (
      <path d="M11 31C9.8 22 10.4 8.6 20 6.8C29.6 8.6 30.2 22 29 31Z" fill={u.hair} />
    ) : u.style === 3 ? (
      <path d="M11.1 23.4C10 13 13.6 6.8 20 6.8C26.4 6.8 30 13 28.9 23.4C27.6 24 27.1 22 27.3 19.6H12.7C12.9 22 12.4 24 11.1 23.4Z" fill={u.hair} />
    ) : null
  const front =
    u.style === 0 || u.style === 2 ? (
      <>
        {u.style === 2 && <circle cx="20" cy="5.6" r="3.7" fill={u.hair} />}
        <path d="M12 17.6C11.4 10 15.4 6.6 20.4 6.6C25.6 6.6 28.8 10.2 28 17.6C26.9 13.6 24 11.8 20 12C16.6 12.1 13.6 13.8 12 17.6Z" fill={u.hair} />
      </>
    ) : u.style === 1 ? (
      <path d="M12.2 16.6C12.6 10.4 16 7.6 20.2 7.6C24.6 7.6 27.8 10.6 27.8 16.6C25 14.6 23.6 12.4 23 10.8C20.6 13.6 16.4 15.4 12.2 16.6Z" fill={u.hair} />
    ) : u.style === 3 ? (
      <path d="M12.4 15.2C13 10.2 16.2 8 20 8C23.8 8 27 10.2 27.6 15.2C24.8 13.2 22 12.8 20 12.9C17.6 12.8 15 13.4 12.4 15.2Z" fill={u.hair} />
    ) : (
      <>
        <path d="M11.6 15.6C11.6 9.5 15.4 5.8 20 5.8C24.6 5.8 28.4 9.5 28.4 15.6Z" fill={`hsl(${u.hue} 55% 52%)`} />
        <rect x="11.2" y="13.6" width="17.6" height="3.2" rx="1.6" fill={`hsl(${u.hue} 50% 40%)`} />
        <circle cx="20" cy="5.2" r="2.1" fill={`hsl(${u.hue} 60% 75%)`} />
      </>
    )
  return (
    <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${u.hue} 85% 85%)`} />
          <stop offset="1" stopColor={`hsl(${u.hue + 35} 70% 66%)`} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill={`url(#${id})`} />
      {back}
      <path d="M5.5 41C5.5 31 12.6 27.4 20 27.4C27.4 27.4 34.5 31 34.5 41Z" fill={shirt} />
      <rect x="17" y="22" width="6" height="7" rx="2" fill={u.skin} />
      <ellipse cx="20" cy="17.4" rx="7.6" ry="8.6" fill={u.skin} />
      {front}
      <circle cx="15.6" cy="20.6" r="1.4" fill="#ff8a8a" opacity=".35" />
      <circle cx="24.4" cy="20.6" r="1.4" fill="#ff8a8a" opacity=".35" />
      <circle cx="17" cy="18.4" r=".95" fill="#2a2230" />
      <circle cx="23" cy="18.4" r=".95" fill="#2a2230" />
      <path d="M17.8 21.7Q20 23.3 22.2 21.7" stroke="#6b3b2e" strokeWidth=".9" strokeLinecap="round" fill="none" />
      {u.glasses && (
        <g stroke="#2b2430" strokeWidth=".7" fill="none">
          <circle cx="17" cy="18.4" r="2.5" />
          <circle cx="23" cy="18.4" r="2.5" />
          <path d="M19.5 18.2h1" />
        </g>
      )}
    </svg>
  )
})

function Avatar({
  id,
  size = 40,
  online,
  ring,
  className = '',
}: {
  id: UserId
  size?: number
  online?: boolean
  ring?: 'new' | 'seen'
  className?: string
}) {
  const face = (
    <span className="block h-full w-full overflow-hidden rounded-full">
      <Face u={user(id)} />
    </span>
  )
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      {ring ? (
        <span
          className="block h-full w-full rounded-full p-[2.5px]"
          style={{ background: ring === 'new' ? 'conic-gradient(from 200deg, #ffb347, #e4572e, #d6336c, #ffb347)' : 'var(--thread)' }}
        >
          <span className="block h-full w-full rounded-full p-[2px]" style={{ background: 'var(--card)' }}>
            {face}
          </span>
        </span>
      ) : (
        face
      )}
      {online && (
        <span
          className="absolute right-0 bottom-0 rounded-full bg-(--online)"
          style={{ width: Math.max(9, size * 0.28), height: Math.max(9, size * 0.28), boxShadow: '0 0 0 2px var(--card)' }}
        />
      )}
    </span>
  )
}

/* ───────────── SVG イラスト(写真の代わり) ───────────── */

type SceneKind = 'mountain' | 'sea' | 'bread' | 'cafe' | 'city' | 'forest' | 'cat' | 'tent' | 'flower' | 'sunset'
const SCENE_ALT: Record<SceneKind, string> = {
  mountain: '雲海の上に連なる山並みと朝日',
  sea: '灯台のある砂浜と青い海',
  bread: '木のボードの上の焼きたてカンパーニュ',
  cafe: 'ハートのラテアートが浮かぶカフェラテ',
  city: '夜の港町に灯る窓明かり',
  forest: '霧の立つ針葉樹の森と小道',
  cat: '窓辺のクッションで丸くなる茶トラ猫',
  tent: '星空の下で灯るテントと焚き火',
  flower: '丘一面に咲く色とりどりの花',
  sunset: '海に沈む夕日と鳥の影',
}

const Scene = memo(function Scene({ kind, className = '' }: { kind: SceneKind; className?: string }) {
  const id = useSvgId()
  const g = (n: string) => `${id}${n}`
  const u = (n: string) => `url(#${id}${n})`
  let body: ReactNode = null
  switch (kind) {
    case 'mountain':
      body = (
        <>
          <defs>
            <linearGradient id={g('s')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6f7fd8" />
              <stop offset=".55" stopColor="#f2a3a6" />
              <stop offset="1" stopColor="#ffd9a8" />
            </linearGradient>
            <radialGradient id={g('g')}>
              <stop offset="0" stopColor="#fff6d8" />
              <stop offset=".35" stopColor="#ffe3a8" stopOpacity=".85" />
              <stop offset="1" stopColor="#ffd2a0" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="300" fill={u('s')} />
          <circle cx="262" cy="150" r="74" fill={u('g')} />
          <circle cx="262" cy="150" r="20" fill="#fff4d2" />
          <polygon points="0,185 60,130 110,160 175,92 235,150 300,104 360,140 400,120 400,300 0,300" fill="#8a83c6" />
          <polygon points="175,92 162,108 172,106 180,114 188,104" fill="#f4eefe" opacity=".85" />
          <polygon points="300,104 290,115 298,114 305,120 311,112" fill="#f4eefe" opacity=".8" />
          <g fill="#fff" opacity=".85">
            <ellipse cx="60" cy="205" rx="90" ry="18" />
            <ellipse cx="190" cy="212" rx="110" ry="16" />
            <ellipse cx="340" cy="200" rx="100" ry="20" />
          </g>
          <polygon points="0,232 80,196 150,228 230,190 310,226 400,200 400,300 0,300" fill="#5a559f" />
          <polygon points="0,262 110,226 210,258 300,232 400,252 400,300 0,300" fill="#35326b" />
          <g stroke="#fff" strokeWidth="1.6" fill="none" opacity=".7" strokeLinecap="round">
            <path d="M120 70q5-4 10 0q5-4 10 0" />
            <path d="M150 52q4-3 8 0q4-3 8 0" />
          </g>
        </>
      )
      break
    case 'sea':
      body = (
        <>
          <defs>
            <linearGradient id={g('s')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7cc6f0" />
              <stop offset="1" stopColor="#e9f7ff" />
            </linearGradient>
            <linearGradient id={g('w')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2b86c4" />
              <stop offset="1" stopColor="#6fd0e6" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={u('s')} />
          <circle cx="300" cy="64" r="22" fill="#fff8db" />
          <g fill="#fff" opacity=".9">
            <ellipse cx="90" cy="60" rx="40" ry="10" />
            <ellipse cx="118" cy="52" rx="26" ry="10" />
            <ellipse cx="230" cy="98" rx="34" ry="8" />
          </g>
          <rect y="150" width="400" height="90" fill={u('w')} />
          <g stroke="#fff" strokeWidth="2" fill="none" opacity=".55" strokeLinecap="round">
            <path d="M30 175q15-6 30 0t30 0" />
            <path d="M170 192q15-6 30 0t30 0" />
            <path d="M250 166q12-5 24 0t24 0" />
            <path d="M80 212q15-6 30 0t30 0" />
          </g>
          <path d="M0 228Q120 206 240 222T400 214V300H0Z" fill="#f2d9a6" />
          <path d="M0 234Q120 212 240 228T400 220" stroke="#fff" strokeWidth="3" fill="none" opacity=".7" />
          <g transform="translate(336 146)">
            <path d="M-13 80L-8 10H8L13 80Z" fill="#fff" />
            <path d="M-11 56H11L11.8 67H-11.8ZM-9.4 31H9.4L10.1 42H-10.1Z" fill="#e4572e" />
            <rect x="-10" y="1" width="20" height="10" rx="2" fill="#3c4256" />
            <rect x="-5.5" y="3" width="11" height="6" fill="#ffe28a" />
            <path d="M-12 1L0-10L12 1Z" fill="#e4572e" />
          </g>
        </>
      )
      break
    case 'bread': {
      const r = mulberry32(3)
      body = (
        <>
          <defs>
            <linearGradient id={g('b')} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#cf9862" />
              <stop offset="1" stopColor="#99612f" />
            </linearGradient>
            <radialGradient id={g('l')} cx=".4" cy=".35" r=".75">
              <stop offset="0" stopColor="#f0bd72" />
              <stop offset=".7" stopColor="#c27a38" />
              <stop offset="1" stopColor="#8f4f20" />
            </radialGradient>
          </defs>
          <rect width="400" height="300" fill="#efe1cc" />
          <g stroke="#e3cfb2" strokeWidth="2">
            {[30, 70, 110, 150, 190, 230, 270].map((y) => (
              <path key={y} d={`M0 ${y}H400`} />
            ))}
          </g>
          <ellipse cx="204" cy="182" rx="176" ry="100" fill="#000" opacity=".08" />
          <ellipse cx="196" cy="168" rx="170" ry="96" fill={u('b')} />
          <ellipse cx="200" cy="168" rx="100" ry="64" fill="#5a2f12" opacity=".25" />
          <ellipse cx="190" cy="152" rx="96" ry="62" fill={u('l')} />
          <g stroke="#f6dca8" strokeWidth="7" strokeLinecap="round" fill="none">
            <path d="M128 128q60-30 120 4" />
            <path d="M120 158q66-26 138 6" />
            <path d="M134 186q56-20 108 4" />
          </g>
          <g fill="#fff" opacity=".55">
            {Array.from({ length: 46 }, (_, i) => {
              const a = r() * Math.PI * 2
              const d = Math.sqrt(r())
              return <circle key={i} cx={190 + Math.cos(a) * 86 * d} cy={152 + Math.sin(a) * 54 * d} r={0.8 + r() * 1.6} />
            })}
          </g>
          <g transform="translate(46 40) rotate(28)">
            <path d="M0 0V110" stroke="#c99a52" strokeWidth="3" />
            {[0, 14, 28, 42].map((y) => (
              <g key={y} fill="#ddb064">
                <ellipse cx="-7" cy={y + 8} rx="5" ry="9" transform={`rotate(-25 -7 ${y + 8})`} />
                <ellipse cx="7" cy={y + 8} rx="5" ry="9" transform={`rotate(25 7 ${y + 8})`} />
              </g>
            ))}
          </g>
        </>
      )
      break
    }
    case 'cafe':
      body = (
        <>
          <defs>
            <radialGradient id={g('c')}>
              <stop offset="0" stopColor="#d9a26a" />
              <stop offset=".8" stopColor="#9b5f2e" />
              <stop offset="1" stopColor="#7a4522" />
            </radialGradient>
          </defs>
          <rect width="400" height="300" fill="#7c4f33" />
          <g stroke="#69412a" strokeWidth="3">
            {[18, 62, 106, 150, 194, 238, 282].map((y) => (
              <path key={y} d={`M0 ${y}H400`} />
            ))}
          </g>
          <ellipse cx="210" cy="160" rx="118" ry="112" fill="#000" opacity=".2" />
          <circle cx="200" cy="150" r="112" fill="#f4eee6" />
          <circle cx="200" cy="150" r="98" fill="#e7ded3" />
          <rect x="268" y="137" width="52" height="26" rx="13" fill="#fff" />
          <circle cx="200" cy="150" r="82" fill="#fff" />
          <circle cx="200" cy="150" r="70" fill={u('c')} />
          <path d="M200 196C160 170 150 140 166 124C180 110 196 118 200 132C204 118 220 110 234 124C250 140 240 170 200 196Z" fill="#f7e9d4" />
          <path d="M200 180C176 164 170 146 180 136C188 128 197 133 200 141C203 133 212 128 220 136C230 146 224 164 200 180Z" fill="#d9a26a" opacity=".45" />
          <g fill="#5d9c59">
            <ellipse cx="30" cy="40" rx="44" ry="14" transform="rotate(32 30 40)" />
            <ellipse cx="60" cy="18" rx="36" ry="11" transform="rotate(-12 60 18)" />
            <ellipse cx="14" cy="80" rx="34" ry="10" transform="rotate(64 14 80)" />
          </g>
          <rect x="40" y="226" width="110" height="10" rx="5" fill="#cfcfd6" transform="rotate(-18 95 231)" />
        </>
      )
      break
    case 'city': {
      const r = mulberry32(7)
      const bs: { x: number; w: number; h: number }[] = []
      for (let x = -10; x < 410; ) {
        const w = 26 + r() * 34
        bs.push({ x, w, h: 70 + r() * 130 })
        x += w + 2
      }
      body = (
        <>
          <defs>
            <linearGradient id={g('s')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#151540" />
              <stop offset=".6" stopColor="#3d2a6b" />
              <stop offset="1" stopColor="#f08a5d" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={u('s')} />
          <g fill="#fff">
            {Array.from({ length: 30 }, (_, i) => (
              <circle key={i} cx={r() * 400} cy={r() * 120} r={0.5 + r()} opacity={0.4 + r() * 0.6} />
            ))}
          </g>
          <circle cx="330" cy="58" r="16" fill="#fff3c4" />
          {bs.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={250 - b.h} width={b.w} height={b.h} fill={i % 2 ? '#221d47' : '#2c2657'} />
              {Array.from({ length: Math.floor((b.h - 14) / 13) }, (_, row) =>
                Array.from({ length: Math.floor((b.w - 6) / 9) }, (_, col) =>
                  r() > 0.55 ? (
                    <rect key={`${row}-${col}`} x={b.x + 5 + col * 9} y={250 - b.h + 8 + row * 13} width="4" height="6" fill="#ffd27a" opacity={0.6 + r() * 0.4} />
                  ) : null,
                ),
              )}
            </g>
          ))}
          <rect y="250" width="400" height="50" fill="#141433" />
          <g fill="#ffd27a" opacity=".35">
            {Array.from({ length: 26 }, (_, i) => (
              <rect key={i} x={r() * 390} y={256 + r() * 40} width={8 + r() * 22} height="1.6" rx=".8" />
            ))}
          </g>
        </>
      )
      break
    }
    case 'forest': {
      const r = mulberry32(11)
      const tree = (x: number, base: number, h: number, c: string, k: string) => (
        <g key={k} fill={c}>
          <polygon points={`${x},${base - h} ${x - h * 0.3},${base - h * 0.45} ${x + h * 0.3},${base - h * 0.45}`} />
          <polygon points={`${x},${base - h * 0.75} ${x - h * 0.36},${base - h * 0.15} ${x + h * 0.36},${base - h * 0.15}`} />
          <polygon points={`${x},${base - h * 0.5} ${x - h * 0.42},${base} ${x + h * 0.42},${base}`} />
        </g>
      )
      body = (
        <>
          <defs>
            <linearGradient id={g('s')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#dff2e6" />
              <stop offset="1" stopColor="#aedac4" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={u('s')} />
          <circle cx="300" cy="70" r="46" fill="#fffbe8" opacity=".7" />
          {Array.from({ length: 16 }, (_, i) => tree(i * 28 - 10, 196, 70 + r() * 34, '#8cbfa2', `a${i}`))}
          <rect y="168" width="400" height="44" fill="#fff" opacity=".4" />
          <rect y="232" width="400" height="68" fill="#5f9b6e" />
          {Array.from({ length: 10 }, (_, i) => {
            const x = i * 46 - 4
            return x > 150 && x < 250 ? null : tree(x, 246, 110 + r() * 40, '#3f7e62', `b${i}`)
          })}
          <path d="M150 300C180 268 222 262 206 240C196 226 214 214 222 206H230C224 216 210 228 220 242C238 266 214 280 254 300Z" fill="#eadcb7" />
          {tree(10, 312, 230, '#24513f', 'c1')}
          {tree(392, 318, 250, '#24513f', 'c2')}
        </>
      )
      break
    }
    case 'cat':
      body = (
        <>
          <rect width="400" height="300" fill="#f6e7d8" />
          <rect x="250" y="20" width="120" height="140" rx="6" fill="#bfe3f7" />
          <path d="M310 20V160M250 90H370" stroke="#fff" strokeWidth="6" />
          <rect x="250" y="20" width="120" height="140" rx="6" fill="none" stroke="#fff" strokeWidth="6" />
          <polygon points="250,160 370,160 330,300 160,300" fill="#fff" opacity=".35" />
          <rect y="220" width="400" height="80" fill="#e2c7a8" />
          <ellipse cx="200" cy="240" rx="122" ry="36" fill="#d9614a" />
          <ellipse cx="200" cy="230" rx="112" ry="30" fill="#f08a6c" />
          <path d="M268 230C312 230 320 196 292 186" stroke="#e89a4c" strokeWidth="16" strokeLinecap="round" fill="none" />
          <ellipse cx="214" cy="212" rx="64" ry="34" fill="#f2a85c" />
          <g stroke="#d98236" strokeWidth="6" strokeLinecap="round" fill="none">
            <path d="M200 182q6 14 0 28" />
            <path d="M222 181q6 14 0 28" />
            <path d="M244 186q5 12 0 24" />
          </g>
          <polygon points="138,192 140,160 162,184" fill="#f2a85c" />
          <polygon points="168,182 186,158 186,192" fill="#f2a85c" />
          <polygon points="143,186 144,170 154,182" fill="#f7c9a8" />
          <polygon points="174,182 182,170 182,188" fill="#f7c9a8" />
          <circle cx="162" cy="206" r="28" fill="#f2a85c" />
          <g stroke="#6b3b1f" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M149 206q5 4 10 0" />
            <path d="M166 206q5 4 10 0" />
          </g>
          <path d="M159.5 214l3 3 3-3z" fill="#d4685a" />
          <ellipse cx="182" cy="236" rx="14" ry="7" fill="#f6bf7d" />
          <text x="112" y="168" fill="#b59a84" fontSize="20" fontWeight="700" fontFamily="sans-serif">
            z
          </text>
          <text x="96" y="146" fill="#b59a84" fontSize="14" fontWeight="700" fontFamily="sans-serif">
            z
          </text>
        </>
      )
      break
    case 'tent': {
      const r = mulberry32(21)
      body = (
        <>
          <defs>
            <linearGradient id={g('s')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0d1838" />
              <stop offset="1" stopColor="#2c2f6e" />
            </linearGradient>
            <radialGradient id={g('glow')}>
              <stop offset="0" stopColor="#ffb347" stopOpacity=".55" />
              <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="300" fill={u('s')} />
          <g fill="#fff">
            {Array.from({ length: 60 }, (_, i) => (
              <circle key={i} cx={r() * 400} cy={r() * 170} r={0.5 + r() * 1.2} opacity={0.35 + r() * 0.65} />
            ))}
          </g>
          <path d="M60 30q40 30 120 10" stroke="#fff" strokeWidth=".8" opacity=".35" fill="none" />
          <polygon points="0,200 70,150 140,190 220,130 300,185 360,155 400,175 400,300 0,300" fill="#1b2350" />
          <path d="M0 235Q200 215 400 238V300H0Z" fill="#121732" />
          <ellipse cx="230" cy="238" rx="170" ry="60" fill={u('glow')} />
          <polygon points="140,246 210,140 280,246" fill="#ff9f43" />
          <polygon points="210,140 280,246 244,246" fill="#e67e22" />
          <polygon points="194,246 210,194 226,246" fill="#ffe0a3" />
          <path d="M210 140V128M140 246L128 252M280 246L292 252" stroke="#3a2a1c" strokeWidth="2" />
          <g transform="translate(330 244)">
            <rect x="-18" y="-4" width="36" height="7" rx="3.5" fill="#6b3b1f" transform="rotate(14)" />
            <rect x="-18" y="-4" width="36" height="7" rx="3.5" fill="#7d4524" transform="rotate(-14)" />
            <path d="M0-34C9-20 14-12 10-3C7 3-7 3-10-3C-14-12-6-20 0-34Z" fill="#ff8c2e" />
            <path d="M0-20C5-12 7-7 5-2C3 1-3 1-5-2C-7-7-4-12 0-20Z" fill="#ffe08a" />
          </g>
        </>
      )
      break
    }
    case 'flower': {
      const r = mulberry32(5)
      const cols = ['#ff7aa2', '#ffd166', '#ffffff', '#c084fc', '#ff9f6b']
      const fl = Array.from({ length: 70 }, () => ({ x: r() * 400, y: 168 + r() * 132, c: cols[Math.floor(r() * cols.length)] })).sort((a, b) => a.y - b.y)
      body = (
        <>
          <defs>
            <linearGradient id={g('s')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a9d8ff" />
              <stop offset="1" stopColor="#fff3df" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={u('s')} />
          <circle cx="80" cy="60" r="26" fill="#fff7d1" />
          <path d="M0 170Q120 120 240 160T400 150V300H0Z" fill="#9fd28c" />
          <path d="M0 210Q140 170 280 205T400 200V300H0Z" fill="#74bf6d" />
          {fl.map((f, i) => {
            const s = 0.5 + ((f.y - 168) / 132) * 1.1
            return (
              <g key={i} transform={`translate(${f.x} ${f.y}) scale(${s})`}>
                <g fill={f.c}>
                  <circle cx="-4" cy="0" r="4" />
                  <circle cx="4" cy="0" r="4" />
                  <circle cx="0" cy="-4" r="4" />
                  <circle cx="0" cy="4" r="4" />
                </g>
                <circle r="2.4" fill="#f5a623" />
              </g>
            )
          })}
        </>
      )
      break
    }
    case 'sunset':
      body = (
        <>
          <defs>
            <linearGradient id={g('s')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b2a86" />
              <stop offset=".55" stopColor="#ff5e62" />
              <stop offset="1" stopColor="#ffb36b" />
            </linearGradient>
            <linearGradient id={g('w')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4b2470" />
              <stop offset="1" stopColor="#24123f" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={u('s')} />
          <g fill="#ff9f8a" opacity=".5">
            <ellipse cx="90" cy="120" rx="70" ry="8" />
            <ellipse cx="300" cy="96" rx="80" ry="7" />
          </g>
          <circle cx="200" cy="196" r="54" fill="#ffe29a" />
          <rect y="196" width="400" height="104" fill={u('w')} />
          <g fill="#ffc27a" opacity=".75">
            {Array.from({ length: 9 }, (_, i) => {
              const w = 110 - i * 11
              return <rect key={i} x={200 - w / 2 + (i % 2 ? 6 : -6)} y={204 + i * 10} width={w} height="3" rx="1.5" />
            })}
          </g>
          <g stroke="#3b1d4f" strokeWidth="2.2" fill="none" strokeLinecap="round">
            <path d="M110 86q6-6 12 0q6-6 12 0" />
            <path d="M146 70q5-5 10 0q5-5 10 0" />
            <path d="M262 110q4-4 8 0q4-4 8 0" />
          </g>
        </>
      )
      break
  }
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={SCENE_ALT[kind]}>
      {body}
    </svg>
  )
})

/* ───────────── リアクション(独自デザインのステッカー) ───────────── */

type ReactionId = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'
const REACTIONS: { id: ReactionId; label: string; color: string }[] = [
  { id: 'like', label: 'いいね！', color: '#e4572e' },
  { id: 'love', label: '大好き', color: '#e5336c' },
  { id: 'haha', label: 'うける', color: '#d99a06' },
  { id: 'wow', label: 'すごい', color: '#d99a06' },
  { id: 'sad', label: 'かなしい', color: '#d99a06' },
  { id: 'angry', label: 'ひどい', color: '#e0601c' },
]
const RX = Object.fromEntries(REACTIONS.map((r) => [r.id, r])) as Record<ReactionId, (typeof REACTIONS)[number]>
const GRAD: Record<ReactionId, [string, string]> = {
  like: ['#ff9a6a', '#e4572e'],
  love: ['#ff86b0', '#e3306a'],
  haha: ['#ffe57f', '#f5a623'],
  wow: ['#ffe57f', '#f5a623'],
  sad: ['#ffe57f', '#f5a623'],
  angry: ['#ff5b3a', '#ffb648'],
}
const BOX = { transformBox: 'fill-box', transformOrigin: 'center' } as const
const INK = '#5a2a12'

const ReactionIcon = memo(function ReactionIcon({ r, size = 18, live = false }: { r: ReactionId; size?: number; live?: boolean }) {
  const id = useSvgId()
  const reduce = useReducedMotion()
  const on = live && !reduce
  const loop = (duration: number, repeatDelay = 0): Transition =>
    on ? { duration, repeat: Infinity, repeatDelay, ease: 'easeInOut' } : { duration: 0.2 }
  const [c0, c1] = GRAD[r]
  let face: ReactNode
  switch (r) {
    case 'like':
      face = (
        <motion.g style={BOX} animate={on ? { rotate: [0, -16, 8, 0], y: [0, -1.5, 0, 0] } : { rotate: 0, y: 0 }} transition={loop(1.1, 0.4)}>
          <path d="M12.4 19.4h3.4v9.4h-3.4a1 1 0 0 1-1-1v-7.4a1 1 0 0 1 1-1Z" fill="#fff" />
          <path d="M17.3 19.4l3.5-6.5c.7-1.3 2.9-.9 2.9.8l-.5 4h4.5c1.5 0 2.5 1.4 2.1 2.8l-1.7 6.5c-.3 1.2-1.4 2-2.6 2h-8.2Z" fill="#fff" />
        </motion.g>
      )
      break
    case 'love':
      face = (
        <motion.path
          style={BOX}
          animate={on ? { scale: [1, 1.24, 0.96, 1.12, 1] } : { scale: 1 }}
          transition={loop(0.9, 0.25)}
          d="M20 29.4C12 23.6 11 18.8 13.2 16C15.3 13.4 18.6 13.9 20 16.6C21.4 13.9 24.7 13.4 26.8 16C29 18.8 28 23.6 20 29.4Z"
          fill="#fff"
        />
      )
      break
    case 'haha':
      face = (
        <>
          <g stroke={INK} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M13.4 13.8l3.6 2-3.6 2" />
            <path d="M26.6 13.8l-3.6 2 3.6 2" />
          </g>
          <motion.g style={BOX} animate={on ? { scaleY: [1, 0.78, 1] } : { scaleY: 1 }} transition={loop(0.45)}>
            <path d="M12.6 21h14.8c0 5-3.3 8.4-7.4 8.4s-7.4-3.4-7.4-8.4Z" fill={INK} />
            <path d="M16 27.2c1.2-1.6 2.6-2 4-2s2.8.4 4 2c-1.1.9-2.5 1.3-4 1.3s-2.9-.4-4-1.3Z" fill="#ff7a7a" />
          </motion.g>
        </>
      )
      break
    case 'wow':
      face = (
        <>
          <motion.g animate={on ? { y: [0, -1.8, 0] } : { y: 0 }} transition={loop(1.2)} stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M12.6 12.6q2.4-2.2 4.8 0" />
            <path d="M22.6 12.6q2.4-2.2 4.8 0" />
          </motion.g>
          <ellipse cx="15.6" cy="17.4" rx="1.8" ry="2.4" fill={INK} />
          <ellipse cx="24.4" cy="17.4" rx="1.8" ry="2.4" fill={INK} />
          <motion.ellipse style={BOX} animate={on ? { scale: [1, 1.22, 1] } : { scale: 1 }} transition={loop(1.2)} cx="20" cy="26" rx="3.6" ry="4.4" fill={INK} />
        </>
      )
      break
    case 'sad':
      face = (
        <>
          <g stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M12.6 14.6l4.6-1.8" />
            <path d="M27.4 14.6l-4.6-1.8" />
            <path d="M15.4 27.4q4.6-4 9.2 0" />
          </g>
          <circle cx="15.8" cy="18.4" r="1.7" fill={INK} />
          <circle cx="24.2" cy="18.4" r="1.7" fill={INK} />
          <motion.path
            animate={on ? { y: [0, 7], opacity: [0, 1, 1, 0] } : { y: 0, opacity: 1 }}
            transition={loop(1.6)}
            d="M26.4 20.2c1.3 1.8 1.9 2.9 1.9 3.7a1.9 1.9 0 0 1-3.8 0c0-.8.6-1.9 1.9-3.7Z"
            fill="#5bb8ff"
          />
        </>
      )
      break
    case 'angry':
      face = (
        <>
          <g stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M12 13.4l5.6 2.4" />
            <path d="M28 13.4l-5.6 2.4" />
            <path d="M15.6 26.4q4.4-2.4 8.8 0" />
          </g>
          <circle cx="16" cy="19" r="1.6" fill={INK} />
          <circle cx="24" cy="19" r="1.6" fill={INK} />
        </>
      )
      break
  }
  const outer =
    r === 'haha' ? { y: [0, -2.2, 0], rotate: [0, -7, 7, 0] } : r === 'angry' ? { x: [0, -1.3, 1.3, -1.3, 1.3, 0] } : undefined
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="block shrink-0 overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c0} />
          <stop offset="1" stopColor={c1} />
        </linearGradient>
      </defs>
      <motion.g
        style={BOX}
        animate={on && outer ? outer : { x: 0, y: 0, rotate: 0 }}
        transition={r === 'angry' ? loop(0.5, 0.7) : loop(0.9)}
      >
        <circle cx="20" cy="20" r="20" style={{ fill: 'var(--card)' }} />
        <circle cx="20" cy="20" r="18" fill={`url(#${id})`} />
        <ellipse cx="13.6" cy="10.6" rx="6" ry="3.2" fill="#fff" opacity=".3" transform="rotate(-28 13.6 10.6)" />
        {face}
      </motion.g>
    </svg>
  )
})

/* ───────────── データ ───────────── */

type Audience = 'public' | 'friends' | 'me'
const AUDIENCE: Record<Audience, { label: string; desc: string; icon: LucideIcon }> = {
  public: { label: '公開', desc: 'Hearthの利用者全員', icon: Globe },
  friends: { label: '友達', desc: 'Hearthの友達だけ', icon: Users },
  me: { label: '自分のみ', desc: 'あなただけが見られます', icon: Lock },
}

const BGS = [
  'linear-gradient(135deg,#ff9a6b,#e4572e 55%,#c2185b)',
  'linear-gradient(135deg,#7b5cff,#c86bfa)',
  'linear-gradient(135deg,#1fb5a4,#3c7be0)',
  'linear-gradient(135deg,#ffcf5c,#ff8a5c)',
  'linear-gradient(135deg,#2a2d35,#565c6b)',
  'radial-gradient(circle at 30% 20%,#ffd6e8,#ff8fb8 45%,#a84cff)',
]

interface Feeling {
  e: string
  t: string
}
const FEELINGS: Feeling[] = [
  { e: '😊', t: 'うれしい' },
  { e: '🤩', t: 'わくわく' },
  { e: '😴', t: 'ねむい' },
  { e: '🙏', t: '感謝' },
  { e: '🥳', t: 'お祝い' },
  { e: '😌', t: 'のんびり' },
]
const PLACES = ['鎌倉', '京都・嵐山', '自宅', 'いつものカフェ']

interface CommentData {
  id: string
  author: UserId
  text: string
  time: string
  likes: number
  replies?: CommentData[]
  fresh?: boolean
}

interface PostData {
  id: string
  author: UserId
  time: string
  audience: Audience
  group?: { name: string; scene: SceneKind }
  text?: string
  bg?: number
  photos?: SceneKind[]
  link?: { domain: string; title: string; desc: string; scene: SceneKind }
  feeling?: Feeling
  place?: string
  reactions: Partial<Record<ReactionId, number>>
  shares: number
  comments: CommentData[]
  more?: CommentData[]
  openComments?: boolean
  replyPool?: string[]
  fresh?: boolean
}

const POSTS: PostData[] = [
  {
    id: 'p1',
    author: 'yuto',
    time: '42分',
    audience: 'friends',
    place: '八ヶ岳',
    text: 'やっと念願の稜線歩き。朝4時起きの甲斐があった…！\n雲海の上に出た瞬間、全員しばらく無言になったのがちょっと面白かった⛰️',
    photos: ['mountain'],
    reactions: { like: 38, love: 21, wow: 6 },
    shares: 2,
    openComments: true,
    comments: [
      {
        id: 'c1',
        author: 'sana',
        time: '30分',
        likes: 3,
        text: '空の色すごい！これスマホで撮ったの？',
        replies: [
          { id: 'c1r1', author: 'yuto', time: '28分', likes: 2, text: 'そう、ほぼ無加工！日の出の10分前がいちばんきれいだった' },
          { id: 'c1r2', author: 'mei', time: '20分', likes: 1, text: '次は絶対誘ってほしい〜！' },
        ],
      },
      {
        id: 'c2',
        author: 'ken',
        time: '18分',
        likes: 5,
        text: '朝4時は無理だけど、写真で行った気になれた笑',
        replies: [
          { id: 'c2r1', author: 'yuto', time: '15分', likes: 1, text: 'ロープウェイを使えば昼からでも行けるよ' },
          { id: 'c2r2', author: 'ken', time: '12分', likes: 0, text: 'それなら…行ける…かも' },
          { id: 'c2r3', author: 'taku', time: '10分', likes: 2, text: '健さんの「行けるかも」は信用できない' },
        ],
      },
    ],
    more: [
      { id: 'c0a', author: 'riku', time: '40分', likes: 1, text: '最高の天気だね！' },
      { id: 'c0b', author: 'aoi', time: '38分', likes: 0, text: '壁紙にしたい…' },
    ],
    replyPool: ['ありがとう！次はみんなで行こう', 'うれしい〜、また写真上げるね', 'ほんとに最高だった！'],
  },
  {
    id: 'p2',
    author: 'mei',
    group: { name: '週末パン部', scene: 'bread' },
    time: '3時間',
    audience: 'public',
    text: '今週末の部活動まとめ🍞\nカンパーニュ班・カフェ巡り班・なぜか猫と戯れる班に分かれました。はじめての自家製酵母はクープがきれいに開かなくて悔しいけど、断面はなかなか…！次は加水率を上げてみます。',
    photos: ['bread', 'cafe', 'cat', 'flower', 'forest', 'sea'],
    reactions: { like: 64, love: 12, haha: 9 },
    shares: 4,
    comments: [{ id: 'g1', author: 'aoi', time: '2時間', likes: 4, text: '猫班に入りたいです' }],
    replyPool: ['猫班はいつでも部員募集中です🐈', 'ぜひ次回は一緒に！'],
  },
  {
    id: 'p3',
    author: 'sana',
    time: '5時間',
    audience: 'public',
    text: '今日から新しい職場！\n緊張するけどがんばる🔥',
    bg: 0,
    reactions: { like: 120, love: 54, haha: 2 },
    shares: 0,
    comments: [
      { id: 's1', author: 'ken', time: '4時間', likes: 6, text: 'がんばれ〜！応援してる' },
      { id: 's2', author: 'mei', time: '3時間', likes: 2, text: 'お祝いしなきゃだね🎉' },
    ],
    replyPool: ['ありがとう〜！がんばる！', 'うれしい😭 落ち着いたらごはん行こう'],
  },
  {
    id: 'p4',
    author: 'taku',
    time: '昨日 21:14',
    audience: 'public',
    text: '今年こそ冬キャンプデビューしたい。これ読んだら行ける気がしてきた。誰か一緒に行こう〜',
    link: {
      domain: 'tabinote.example',
      title: '冬の星空キャンプ入門 — 装備と寒さ対策の10か条',
      desc: '寝袋の選び方から焚き火の始末まで、初めての冬キャンプで気をつけたいことをまとめました。',
      scene: 'tent',
    },
    reactions: { like: 18, wow: 3 },
    shares: 5,
    comments: [
      {
        id: 't1',
        author: 'jun',
        time: '昨日',
        likes: 3,
        text: '行きたい！車出せるよ',
        replies: [{ id: 't1r1', author: 'taku', time: '昨日', likes: 1, text: '神…！日程調整しよう' }],
      },
    ],
    replyPool: ['おっ、一緒に行こう！', 'テント2張りあるから貸せるよ'],
  },
  {
    id: 'p5',
    author: 'aoi',
    time: '昨日 18:02',
    audience: 'friends',
    text: '引っ越して一週間。段ボールがやっと半分になりました。\n\n新しい部屋は西向きで、夕方になると窓辺がオレンジ色に染まります。うちの茶トラはさっそくそこを自分の席に決めたらしく、毎日きっちり17時に同じクッションの上で丸くなっています。時計より正確。\n\n近所に小さなパン屋さんと、夜遅くまで開いている本屋さんを見つけたので、しばらくは散歩が楽しみです。落ち着いたら遊びに来てください〜',
    photos: ['cat'],
    reactions: { love: 88, like: 40, haha: 5 },
    shares: 1,
    comments: [{ id: 'a1', author: 'nana', time: '昨日', likes: 3, text: '茶トラくん、時計より正確なの笑う' }],
    replyPool: ['ぜひ遊びに来て〜！', '17時ぴったりなの、ほんとなんです笑'],
  },
  {
    id: 'p6',
    author: 'riku',
    time: '2日前',
    audience: 'public',
    text: '出張ついでに港町をぐるっと一周。夜景が想像以上でした🌃',
    photos: ['city', 'sunset', 'sea'],
    reactions: { like: 52, wow: 14, love: 7 },
    shares: 3,
    comments: [],
    replyPool: ['ありがとう！次はゆっくり行きたい'],
  },
]

const STORIES: { user: UserId; time: string; frames: { scene: SceneKind; text?: string }[] }[] = [
  { user: 'sana', time: '2時間', frames: [{ scene: 'flower', text: '通勤路の花が満開' }, { scene: 'cafe', text: '初出社前の一杯☕' }] },
  { user: 'ken', time: '4時間', frames: [{ scene: 'tent' }, { scene: 'forest', text: '朝の森、空気がうまい' }] },
  { user: 'mei', time: '5時間', frames: [{ scene: 'bread', text: '焼き上がり！' }] },
  { user: 'riku', time: '8時間', frames: [{ scene: 'city', text: '港の夜景' }, { scene: 'sea' }] },
  { user: 'aoi', time: '12時間', frames: [{ scene: 'cat', text: 'おはよう' }] },
  { user: 'nana', time: '20時間', frames: [{ scene: 'sunset' }, { scene: 'mountain', text: '週末の山' }] },
]

type NotifKind = 'comment' | 'reaction' | 'group' | 'birthday' | 'tag' | 'friend'
interface Notif {
  id: string
  who: UserId
  kind: NotifKind
  body: string
  time: string
  unread: boolean
}
const NOTIFS: Notif[] = [
  { id: 'n1', who: 'yuto', kind: 'comment', body: 'があなたのコメントに返信しました:「日の出の10分前がいちばん…」', time: '12分', unread: true },
  { id: 'n2', who: 'sana', kind: 'reaction', body: 'と他14人があなたの写真にリアクションしました。', time: '38分', unread: true },
  { id: 'n3', who: 'mei', kind: 'group', body: 'が「週末パン部」に新しい写真を投稿しました。', time: '3時間', unread: true },
  { id: 'n4', who: 'jun', kind: 'birthday', body: 'の誕生日です。お祝いのメッセージを送りましょう。', time: '今日', unread: false },
  { id: 'n5', who: 'taku', kind: 'tag', body: 'があなたを投稿にタグ付けしました。', time: '昨日', unread: false },
  { id: 'n6', who: 'nana', kind: 'friend', body: 'から友達リクエストが届いています。', time: '2日前', unread: false },
]
const NOTIF_BADGE: Record<NotifKind, { icon: LucideIcon; bg: string }> = {
  comment: { icon: MessageCircle, bg: '#2fb457' },
  reaction: { icon: ThumbsUp, bg: '#e4572e' },
  group: { icon: UsersRound, bg: '#3b7cf0' },
  birthday: { icon: Gift, bg: '#e5336c' },
  tag: { icon: Tag, bg: '#13a3a3' },
  friend: { icon: UserPlus, bg: '#7b5cff' },
}

interface Msg {
  id: string
  from: UserId
  text?: string
  like?: boolean
}
const CHAT_SEED: Partial<Record<UserId, Msg[]>> = {
  yuto: [{ id: 'y1', from: 'yuto', text: '写真ありがとう！今度プリントして渡すね' }],
  sana: [
    { id: 's1', from: 'me', text: '初出社どうだった？' },
    { id: 's2', from: 'sana', text: '緊張したけど、みんな優しかった〜！' },
  ],
  mei: [{ id: 'm1', from: 'mei', text: '酵母わけようか？🍞' }],
}
const AUTO_REPLIES = ['いいね！', 'それ気になってた😊', '今度一緒に行こう', 'ちょうど同じこと考えてた笑', 'あとで写真送るね', 'りょうかい〜！']
const CONTACTS: UserId[] = ['yuto', 'sana', 'mei', 'ken', 'riku', 'aoi', 'taku', 'nana', 'jun']

const countAll = (cs: CommentData[]): number => cs.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)

/* ───────────── 小さな部品 ───────────── */

function HearthLogo({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="hearth-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9b5e" />
          <stop offset="1" stopColor="#d9362a" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#hearth-logo-g)" />
      <path d="M9.5 30V18.6L20 10l10.5 8.6V30" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M20 30c-3.3 0-5.2-2.1-5.2-4.6 0-2.9 2.6-4.1 3.1-7 1.8 1.3 2.6 2.6 2.6 3.9.8-.8 1.3-1.8 1.3-2.9 2.1 1.6 3.4 3.6 3.4 6 0 2.5-1.9 4.6-5.2 4.6Z" fill="#fff" />
    </svg>
  )
}

function IconCircle({
  icon: Icon,
  label,
  onClick,
  active,
  badge,
  className = '',
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  active?: boolean
  badge?: number
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`relative grid size-10 shrink-0 place-items-center rounded-full transition ${
        active ? 'bg-(--accent-soft) text-(--accent)' : 'bg-(--soft) text-(--fg) hover:brightness-95'
      } ${FOCUS} ${className}`}
    >
      <Icon size={19} />
      <AnimatePresence>
        {!!badge && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={POP}
            className="absolute -top-1 -right-1 grid h-[19px] min-w-[19px] place-items-center rounded-full px-1 text-[11px] font-bold text-white"
            style={{ background: BADGE_RED, boxShadow: '0 0 0 2px var(--card)' }}
          >
            {badge}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

function TypingDots() {
  const { reduce } = useFeed()
  return (
    <span className="inline-flex items-center gap-[3px] py-1" aria-label="入力中">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-[6px] rounded-full bg-(--muted)"
          animate={reduce ? { opacity: [0.4, 1, 0.4] } : { y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`bg-(--card) shadow-(--shadow) @md:rounded-xl ${className}`}>{children}</section>
}

function MenuItem({ icon: Icon, label, sub, onClick }: { icon: LucideIcon; label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-(--hover) ${FOCUS}`}
    >
      <Icon size={18} className="shrink-0 text-(--muted)" />
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold">{label}</span>
        {sub && <span className="block text-[12px] text-(--muted)">{sub}</span>}
      </span>
    </button>
  )
}

function Popover({ children, className, origin = 'top right', style }: { children: ReactNode; className: string; origin?: string; style?: CSSProperties }) {
  const { reduce } = useFeed()
  return (
    <motion.div
      role="menu"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.12 } }}
      transition={reduce ? FADE : SPRING}
      style={{ transformOrigin: origin, boxShadow: 'var(--pop)', ...style }}
      className={`absolute z-30 rounded-xl bg-(--card) p-1.5 ${className}`}
    >
      {children}
    </motion.div>
  )
}

/* ───────────── リアクションボタン ───────────── */

function ReactionPicker({ onPick, current }: { onPick: (r: ReactionId) => void; current: ReactionId | null }) {
  const { reduce } = useFeed()
  const [hover, setHover] = useState<ReactionId | null>(null)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95, transition: { duration: 0.12 } }}
      transition={reduce ? FADE : SPRING}
      className="absolute bottom-full left-0 z-20 origin-bottom-left pb-2"
    >
      <div
        role="menu"
        aria-label="リアクションを選択"
        className="flex items-end gap-0.5 rounded-full bg-(--card) px-1.5 py-1.5"
        style={{ boxShadow: 'var(--pop)' }}
        onPointerLeave={() => setHover(null)}
      >
        {REACTIONS.map((r, i) => (
          <motion.span
            key={r.id}
            className="relative"
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={reduce ? FADE : { type: 'spring', stiffness: 560, damping: 20, delay: i * 0.04 }}
          >
            <AnimatePresence>
              {hover === r.id && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2, transition: { duration: 0.1 } }}
                  className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/80 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white"
                >
                  {r.label}
                </motion.span>
              )}
            </AnimatePresence>
            <motion.button
              type="button"
              role="menuitemradio"
              aria-checked={current === r.id}
              aria-label={r.label}
              onClick={() => onPick(r.id)}
              onPointerEnter={() => setHover(r.id)}
              onFocus={() => setHover(r.id)}
              onBlur={() => setHover(null)}
              animate={{ scale: hover === r.id ? 1.38 : hover ? 0.9 : 1, y: hover === r.id ? -7 : 0 }}
              transition={reduce ? FADE : { type: 'spring', stiffness: 600, damping: 22 }}
              className={`block origin-bottom rounded-full ${FOCUS}`}
            >
              <ReactionIcon r={r.id} size={38} live />
            </motion.button>
          </motion.span>
        ))}
      </div>
    </motion.div>
  )
}

function Burst({ color }: { color: string }) {
  return (
    <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <motion.span
            key={i}
            className="absolute -mt-[3px] -ml-[3px] size-[6px] rounded-full"
            style={{ background: i % 2 ? color : '#ffc861' }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(a) * 20, y: Math.sin(a) * 20, scale: 0.2, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        )
      })}
    </span>
  )
}

function LikeControl({ value, onChange }: { value: ReactionId | null; onChange: (r: ReactionId | null) => void }) {
  const { reduce } = useFeed()
  const [open, setOpen] = useState(false)
  const [burst, setBurst] = useState(0)
  const openT = useRef(0)
  const closeT = useRef(0)
  const longPressed = useRef(false)
  const wrap = useRef<HTMLDivElement>(null)
  useDismiss(open, wrap, () => setOpen(false))
  useEffect(() => () => (clearTimeout(openT.current), clearTimeout(closeT.current)), [])

  const pick = (r: ReactionId | null) => {
    onChange(r)
    setOpen(false)
    if (r && !reduce) setBurst((b) => b + 1)
  }
  const enter = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return
    clearTimeout(closeT.current)
    if (!open) openT.current = window.setTimeout(() => setOpen(true), 450)
  }
  const leave = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return
    clearTimeout(openT.current)
    closeT.current = window.setTimeout(() => setOpen(false), 300)
  }
  const meta = value ? RX[value] : null

  return (
    <div ref={wrap} className="relative" onPointerEnter={enter} onPointerLeave={leave}>
      <AnimatePresence>{open && <ReactionPicker current={value} onPick={pick} />}</AnimatePresence>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-pressed={!!value}
        aria-label={meta ? `リアクション: ${meta.label}(クリックで取り消し、↑キーで変更)` : 'いいね！(長押しまたは↑キーで他のリアクション)'}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return
          longPressed.current = false
          openT.current = window.setTimeout(() => {
            longPressed.current = true
            setOpen(true)
          }, 450)
        }}
        onPointerUp={() => clearTimeout(openT.current)}
        onPointerCancel={() => clearTimeout(openT.current)}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          clearTimeout(openT.current)
          if (longPressed.current) {
            longPressed.current = false
            return
          }
          pick(value ? null : 'like')
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className={`relative flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-[14px] font-semibold select-none hover:bg-(--hover) ${FOCUS}`}
        style={{ color: meta ? meta.color : 'var(--muted)' }}
      >
        <span className="relative grid size-5 place-items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value ?? 'none'}
              initial={reduce ? { opacity: 0 } : { scale: 0.3, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.1 } }}
              transition={reduce ? FADE : POP}
              className="grid place-items-center"
            >
              {value ? <ReactionIcon r={value} size={20} /> : <ThumbsUp size={18} />}
            </motion.span>
          </AnimatePresence>
          {burst > 0 && meta && <Burst key={burst} color={meta.color} />}
        </span>
        <span>{meta ? meta.label : 'いいね！'}</span>
      </button>
    </div>
  )
}

function ShareControl({ postId, onShare }: { postId: string; onShare: () => void }) {
  const { toast } = useFeed()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(open, ref, () => setOpen(false))
  const act = (fn: () => void) => () => {
    fn()
    setOpen(false)
  }
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-[14px] font-semibold text-(--muted) hover:bg-(--hover) ${FOCUS}`}
      >
        <Share2 size={18} /> シェア
      </button>
      <AnimatePresence>
        {open && (
          <Popover className="right-0 bottom-full mb-1 w-60" origin="bottom right">
            <MenuItem
              icon={Share2}
              label="今すぐシェア"
              sub="公開・あなたのフィードに表示"
              onClick={act(() => {
                onShare()
                toast('あなたのフィードにシェアしました')
              })}
            />
            <MenuItem icon={MessageCircle} label="メッセージで送信" onClick={act(() => toast('メッセージで送信しました'))} />
            <MenuItem
              icon={Link2}
              label="リンクをコピー"
              onClick={act(() => {
                navigator.clipboard?.writeText(`https://hearth.example/posts/${postId}`).catch(() => {})
                toast('リンクをコピーしました')
              })}
            />
          </Popover>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────── コメント ───────────── */

function ThreadRow({ last, elbow = 20, children }: { last: boolean; elbow?: number; children: ReactNode }) {
  return (
    <div className="relative pt-2">
      {!last && <span aria-hidden className="absolute top-0 bottom-0 -left-[25px] w-0.5 bg-(--thread)" />}
      <span aria-hidden className="absolute top-0 -left-[25px] w-[17px] rounded-bl-[10px] border-b-2 border-l-2 border-(--thread)" style={{ height: elbow }} />
      {children}
    </div>
  )
}

function CommentBody({ c, postAuthor, onReply }: { c: CommentData; postAuthor: UserId; onReply: (to: UserId) => void }) {
  const [liked, setLiked] = useState(false)
  const likes = c.likes + (liked ? 1 : 0)
  return (
    <div className="min-w-0">
      <div className="relative inline-block max-w-full rounded-2xl bg-(--hover) px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold">
          {user(c.author).name}
          {c.author === postAuthor && (
            <span className="rounded bg-(--accent-soft) px-1 text-[10px] font-bold text-(--accent)">投稿者</span>
          )}
        </div>
        <p className="text-[14px] leading-snug break-words whitespace-pre-wrap">{c.text}</p>
        <AnimatePresence>
          {likes > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={POP}
              className="absolute -right-2 -bottom-2.5 flex items-center gap-0.5 rounded-full bg-(--card) py-0.5 pr-1.5 pl-0.5 text-[11px] text-(--muted)"
              style={{ boxShadow: 'var(--shadow)' }}
            >
              <ReactionIcon r="like" size={15} />
              <NumberFlow value={likes} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-0.5 flex items-center gap-3 pl-3 text-[12px] font-semibold text-(--muted)">
        <span className="font-normal">{c.time}</span>
        <button
          type="button"
          aria-pressed={liked}
          onClick={() => setLiked((l) => !l)}
          className={`rounded hover:underline ${FOCUS}`}
          style={liked ? { color: RX.like.color } : undefined}
        >
          いいね！
        </button>
        <button type="button" onClick={() => onReply(c.author)} className={`rounded hover:underline ${FOCUS}`}>
          返信する
        </button>
      </div>
    </div>
  )
}

function ReplyInput({ to, onSubmit, onCancel }: { to: UserId; onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(to === 'me' ? '' : `@${user(to).name} `)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [to])
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) onSubmit(text.trim())
      }}
    >
      <Avatar id="me" size={24} />
      <div className="flex min-w-0 flex-1 items-center rounded-2xl bg-(--hover) pr-1">
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onCancel()}
          placeholder="返信を書く…"
          aria-label="返信を書く"
          className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-[13.5px] outline-none placeholder:text-(--muted)"
        />
        <button type="submit" disabled={!text.trim()} aria-label="返信を送信" className={`grid size-7 place-items-center rounded-full text-(--accent) disabled:opacity-35 ${FOCUS}`}>
          <Send size={15} />
        </button>
      </div>
    </form>
  )
}

function CommentItem({
  c,
  postAuthor,
  typingOn,
  onReply,
}: {
  c: CommentData
  postAuthor: UserId
  typingOn: string | null
  onReply: (parentId: string, text: string) => void
}) {
  const { reduce } = useFeed()
  const replies = c.replies ?? []
  const [showReplies, setShowReplies] = useState(replies.length < 3)
  const [replyTo, setReplyTo] = useState<UserId | null>(null)
  const typing = typingOn === c.id
  const hasThread = replies.length > 0 || replyTo !== null || typing
  const shown = showReplies || typing ? replies : []
  const collapsed = !showReplies && !typing && replies.length > 0

  return (
    <motion.li
      initial={c.fresh && !reduce ? { opacity: 0, y: 10, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING}
      className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2"
    >
      <div className="relative">
        <Avatar id={c.author} size={32} />
        {hasThread && <span aria-hidden className="absolute top-[36px] bottom-0 left-[15px] w-0.5 rounded bg-(--thread)" />}
      </div>
      <div className="min-w-0 pb-0.5">
        <CommentBody c={c} postAuthor={postAuthor} onReply={(to) => setReplyTo(to)} />
      </div>
      {hasThread && (
        <div className="col-start-2">
          {collapsed && (
            <ThreadRow last={replyTo === null} elbow={19}>
              <button type="button" onClick={() => setShowReplies(true)} className={`rounded py-0.5 text-[13px] font-semibold text-(--muted) hover:underline ${FOCUS}`}>
                返信{replies.length}件を表示
              </button>
            </ThreadRow>
          )}
          {shown.map((r, i) => (
            <ThreadRow key={r.id} last={i === shown.length - 1 && replyTo === null && !typing}>
              <motion.div
                initial={r.fresh && !reduce ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING}
                className="flex gap-2"
              >
                <Avatar id={r.author} size={24} />
                <CommentBody c={r} postAuthor={postAuthor} onReply={(to) => setReplyTo(to)} />
              </motion.div>
            </ThreadRow>
          ))}
          <AnimatePresence>
            {typing && (
              <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ThreadRow last={replyTo === null}>
                  <div className="flex items-center gap-2">
                    <Avatar id={postAuthor} size={24} />
                    <span className="rounded-2xl bg-(--hover) px-3 py-1">
                      <TypingDots />
                    </span>
                    <span className="text-[12px] text-(--muted)">{firstName(postAuthor)}さんが入力中…</span>
                  </div>
                </ThreadRow>
              </motion.div>
            )}
          </AnimatePresence>
          {replyTo !== null && (
            <ThreadRow last>
              <ReplyInput
                to={replyTo}
                onCancel={() => setReplyTo(null)}
                onSubmit={(text) => {
                  setShowReplies(true)
                  setReplyTo(null)
                  onReply(c.id, text)
                }}
              />
            </ThreadRow>
          )}
        </div>
      )}
    </motion.li>
  )
}

/* ───────────── 投稿 ───────────── */

function Collage({ photos }: { photos: SceneKind[] }) {
  const { openLightbox } = useFeed()
  const n = photos.length
  const extra = n - 5
  const cell = (kind: SceneKind, i: number, cls = '') => (
    <button
      key={i}
      type="button"
      onClick={() => openLightbox(photos, i)}
      aria-label={`写真を拡大: ${SCENE_ALT[kind]}`}
      className={`group/ph relative block h-full w-full overflow-hidden ${cls} focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white`}
    >
      <Scene kind={kind} className="absolute inset-0 h-full w-full transition duration-500 group-hover/ph:scale-[1.03]" />
      <span className="absolute inset-0 bg-black/0 transition group-hover/ph:bg-black/10" />
      {i === 4 && extra > 0 && <span className="absolute inset-0 grid place-items-center bg-black/45 text-3xl font-bold text-white">+{extra}</span>}
    </button>
  )
  if (n === 1) return <div className="aspect-[4/3]">{cell(photos[0], 0)}</div>
  if (n === 2) return <div className="grid aspect-[2/1] grid-cols-2 gap-0.5">{photos.map((p, i) => cell(p, i))}</div>
  if (n === 3)
    return (
      <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-0.5">
        {cell(photos[0], 0, 'row-span-2')}
        {cell(photos[1], 1)}
        {cell(photos[2], 2)}
      </div>
    )
  if (n === 4) return <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-0.5">{photos.map((p, i) => cell(p, i))}</div>
  return (
    <div className="grid aspect-[4/3] grid-cols-6 grid-rows-[3fr_2fr] gap-0.5">
      {photos.slice(0, 5).map((p, i) => cell(p, i, i < 2 ? 'col-span-3' : 'col-span-2'))}
    </div>
  )
}

function PostHeader({ post, onMenu, onHide, menuOpen, menuRef, menu }: {
  post: PostData
  onMenu: () => void
  onHide: () => void
  menuOpen: boolean
  menuRef: RefObject<HTMLDivElement | null>
  menu: ReactNode
}) {
  const A = AUDIENCE[post.audience].icon
  const meta = (
    <span className="flex items-center gap-1 text-[12.5px] text-(--muted)">
      {post.group && <span className="font-semibold">{user(post.author).name} ·</span>}
      {post.time} · <A size={12} aria-label={AUDIENCE[post.audience].label} />
    </span>
  )
  return (
    <div className="flex items-start gap-2.5 px-4 pt-3">
      {post.group ? (
        <span className="relative shrink-0">
          <span className="block size-10 overflow-hidden rounded-lg">
            <Scene kind={post.group.scene} className="h-full w-full" />
          </span>
          <span className="absolute -right-1.5 -bottom-1.5 rounded-full" style={{ boxShadow: '0 0 0 2px var(--card)' }}>
            <Avatar id={post.author} size={24} />
          </span>
        </span>
      ) : (
        <Avatar id={post.author} size={40} />
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[14.5px]">
          <span className="font-semibold">{post.group ? post.group.name : user(post.author).name}</span>
          {post.feeling && (
            <span className="text-(--muted)">
              {' '}
              — {post.feeling.e} {post.feeling.t}気分です
            </span>
          )}
          {post.place && (
            <span className="text-(--muted)">
              {' '}
              — <MapPin size={12} className="inline -translate-y-px" /> {post.place}にいます
            </span>
          )}
        </div>
        {meta}
      </div>
      <div ref={menuRef} className="relative flex shrink-0 items-center">
        <button type="button" aria-label="投稿のメニュー" aria-haspopup="menu" aria-expanded={menuOpen} onClick={onMenu} className={`grid size-9 place-items-center rounded-full text-(--muted) hover:bg-(--hover) ${FOCUS}`}>
          <Ellipsis size={20} />
        </button>
        <button type="button" aria-label="この投稿を非表示" onClick={onHide} className={`grid size-9 place-items-center rounded-full text-(--muted) hover:bg-(--hover) ${FOCUS}`}>
          <X size={20} />
        </button>
        <AnimatePresence>{menuOpen && menu}</AnimatePresence>
      </div>
    </div>
  )
}

function PostCard({ post }: { post: PostData }) {
  const { toast, reduce } = useFeed()
  const later = useTimers()
  const [mine, setMine] = useState<ReactionId | null>(null)
  const [hidden, setHidden] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [open, setOpen] = useState(!!post.openComments)
  const [comments, setComments] = useState<CommentData[]>(post.comments)
  const [older, setOlder] = useState<'hidden' | 'loading' | 'shown'>(post.more?.length ? 'hidden' : 'shown')
  const [typingOn, setTypingOn] = useState<string | null>(null)
  const [shares, setShares] = useState(post.shares)
  const [saved, setSaved] = useState(false)
  const [menu, setMenu] = useState(false)
  const [draft, setDraft] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pool = useRef(0)
  useDismiss(menu, menuRef, () => setMenu(false))

  const counts: Partial<Record<ReactionId, number>> = { ...post.reactions }
  if (mine) counts[mine] = (counts[mine] ?? 0) + 1
  const ranked = REACTIONS.map((r) => ({ id: r.id, n: counts[r.id] ?? 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n)
  const total = ranked.reduce((s, r) => s + r.n, 0)
  const commentCount = countAll(comments) + (older === 'shown' ? 0 : countAll(post.more ?? []))

  const addComment = (text: string, parentId?: string) => {
    const c: CommentData = { id: `m${Date.now()}`, author: 'me', text, time: 'たった今', likes: 0, fresh: true }
    setComments((cs) => (parentId ? cs.map((x) => (x.id === parentId ? { ...x, replies: [...(x.replies ?? []), c] } : x)) : [...cs, c]))
    if (post.author === 'me') return
    const replyPool = post.replyPool ?? ['コメントありがとう！']
    const replyText = replyPool[pool.current++ % replyPool.length]
    const thread = parentId ?? c.id
    later(() => setTypingOn(thread), 900)
    later(() => {
      setTypingOn(null)
      const r: CommentData = { id: `a${Date.now()}`, author: post.author, text: replyText, time: 'たった今', likes: 0, fresh: true }
      setComments((cs) => cs.map((x) => (x.id === thread ? { ...x, replies: [...(x.replies ?? []), r] } : x)))
    }, 2900)
  }

  const longText = (post.text?.length ?? 0) > 130 && !post.bg
  const text = longText && !expanded ? post.text!.slice(0, 110) : post.text

  return (
    <Card className="relative">
      {post.fresh && !reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-2 border-(--accent)"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.8, delay: 0.4 }}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
        {hidden ? (
          <motion.div key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 p-4">
            <EyeOff size={20} className="shrink-0 text-(--muted)" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">投稿を非表示にしました</div>
              <div className="text-[12.5px] text-(--muted)">このような投稿がフィードに表示されにくくなります。</div>
            </div>
            <button type="button" onClick={() => setHidden(false)} className={`rounded-md bg-(--soft) px-3 py-1.5 text-[13px] font-semibold hover:brightness-95 ${FOCUS}`}>
              元に戻す
            </button>
          </motion.div>
        ) : (
          <motion.div key="post" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PostHeader
              post={post}
              menuOpen={menu}
              menuRef={menuRef}
              onMenu={() => setMenu((m) => !m)}
              onHide={() => setHidden(true)}
              menu={
                <Popover className="top-full right-0 mt-1 w-64">
                  <MenuItem
                    icon={Bookmark}
                    label={saved ? '保存を取り消す' : '投稿を保存'}
                    sub="保存済みアイテムに追加します"
                    onClick={() => {
                      setSaved((s) => !s)
                      setMenu(false)
                      toast(saved ? '保存を取り消しました' : '保存済みに追加しました')
                    }}
                  />
                  <MenuItem
                    icon={BellRing}
                    label="この投稿の通知をオンにする"
                    onClick={() => {
                      setMenu(false)
                      toast('この投稿の通知をオンにしました')
                    }}
                  />
                  <MenuItem
                    icon={EyeOff}
                    label="投稿を非表示"
                    sub="このような投稿の表示を減らします"
                    onClick={() => {
                      setMenu(false)
                      setHidden(true)
                    }}
                  />
                </Popover>
              }
            />

            {post.bg !== undefined ? (
              <div className="mt-3 grid min-h-[240px] place-items-center px-8 py-10 text-center text-[24px] leading-snug font-bold whitespace-pre-wrap text-white" style={{ background: BGS[post.bg] }}>
                {post.text}
              </div>
            ) : (
              post.text && (
                <p className="px-4 pt-2 pb-3 text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">
                  {text}
                  {longText && !expanded && (
                    <>
                      …{' '}
                      <button type="button" onClick={() => setExpanded(true)} className={`rounded font-semibold hover:underline ${FOCUS}`}>
                        もっと見る
                      </button>
                    </>
                  )}
                </p>
              )
            )}
            {post.photos && <Collage photos={post.photos} />}
            {post.link && (
              <button
                type="button"
                onClick={() => toast('デモのためリンク先はありません')}
                className={`block w-full border-y border-(--line) bg-(--hover) text-left ${FOCUS}`}
              >
                <span className="relative block aspect-[1.91/1] overflow-hidden">
                  <Scene kind={post.link.scene} className="absolute inset-0 h-full w-full" />
                </span>
                <span className="block px-4 py-2.5">
                  <span className="block text-[12px] tracking-wide text-(--muted) uppercase">{post.link.domain}</span>
                  <span className="line-clamp-2 block text-[15px] leading-snug font-semibold">{post.link.title}</span>
                  <span className="line-clamp-1 block text-[13px] text-(--muted)">{post.link.desc}</span>
                </span>
              </button>
            )}

            {/* 集計 */}
            <div className="flex min-h-[38px] items-center justify-between gap-3 px-4 py-2 text-[13.5px] text-(--muted)">
              {total > 0 ? (
                <div tabIndex={0} className={`group/sum relative flex items-center gap-1.5 rounded ${FOCUS}`} aria-label={`リアクション${total}件`}>
                  <span className="flex -space-x-1.5">
                    <AnimatePresence initial={false} mode="popLayout">
                      {ranked.slice(0, 3).map((r, i) => (
                        <motion.span
                          key={r.id}
                          layout={!reduce}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={POP}
                          style={{ zIndex: 3 - i }}
                          className="relative"
                        >
                          <ReactionIcon r={r.id} size={20} />
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </span>
                  <span className="tabular-nums">
                    {mine ? (
                      <>
                        あなたと他<NumberFlow value={total - 1} />人
                      </>
                    ) : (
                      <NumberFlow value={total} />
                    )}
                  </span>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 space-y-0.5 rounded-lg bg-black/85 px-2.5 py-2 text-[12px] whitespace-nowrap text-white opacity-0 transition group-hover/sum:opacity-100 group-focus-visible/sum:opacity-100"
                  >
                    {ranked.map((r) => (
                      <span key={r.id} className="flex items-center gap-1.5">
                        <ReactionIcon r={r.id} size={14} />
                        {RX[r.id].label}
                        <span className="ml-auto pl-3 tabular-nums">{r.n}</span>
                      </span>
                    ))}
                  </span>
                </div>
              ) : (
                <span />
              )}
              <div className="flex shrink-0 items-center gap-3">
                {commentCount > 0 && (
                  <button type="button" onClick={() => setOpen((o) => !o)} className={`rounded hover:underline ${FOCUS}`}>
                    コメント<NumberFlow value={commentCount} />件
                  </button>
                )}
                {shares > 0 && (
                  <span>
                    シェア<NumberFlow value={shares} />件
                  </span>
                )}
              </div>
            </div>

            {/* 操作 */}
            <div className="mx-3 grid grid-cols-3 gap-1 border-t border-(--line) py-1">
              <LikeControl value={mine} onChange={setMine} />
              <button
                type="button"
                aria-expanded={open}
                onClick={() => {
                  setOpen(true)
                  requestAnimationFrame(() => inputRef.current?.focus())
                }}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-md text-[14px] font-semibold text-(--muted) hover:bg-(--hover) ${FOCUS}`}
              >
                <MessageCircle size={18} /> コメント
              </button>
              <ShareControl postId={post.id} onShare={() => setShares((s) => s + 1)} />
            </div>

            {/* コメント欄 */}
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={reduce ? FADE : { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-(--line) px-4 pt-2 pb-3">
                    {older !== 'shown' && (
                      <button
                        type="button"
                        disabled={older === 'loading'}
                        onClick={() => {
                          setOlder('loading')
                          later(() => {
                            setComments((cs) => [...(post.more ?? []).map((m) => ({ ...m, fresh: true })), ...cs])
                            setOlder('shown')
                          }, 500)
                        }}
                        className={`mb-2 flex items-center gap-2 rounded text-[13.5px] font-semibold text-(--muted) hover:underline ${FOCUS}`}
                      >
                        {older === 'loading' ? (
                          <>
                            <TypingDots /> 読み込み中…
                          </>
                        ) : (
                          `以前のコメントを表示(${countAll(post.more ?? [])}件)`
                        )}
                      </button>
                    )}
                    <ul className="space-y-2.5">
                      {comments.map((c) => (
                        <CommentItem key={c.id} c={c} postAuthor={post.author} typingOn={typingOn} onReply={(id, t) => addComment(t, id)} />
                      ))}
                    </ul>
                    <form
                      className="mt-3 flex items-center gap-2"
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault()
                        if (!draft.trim()) return
                        addComment(draft.trim())
                        setDraft('')
                      }}
                    >
                      <Avatar id="me" size={32} />
                      <div className="flex min-w-0 flex-1 items-center rounded-2xl bg-(--hover) pr-1">
                        <input
                          ref={inputRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder="コメントを書く…"
                          aria-label="コメントを書く"
                          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[14px] outline-none placeholder:text-(--muted)"
                        />
                        <button type="submit" disabled={!draft.trim()} aria-label="コメントを送信" className={`grid size-8 place-items-center rounded-full text-(--accent) disabled:opacity-35 ${FOCUS}`}>
                          <Send size={16} />
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

/* ───────────── ストーリーズ ───────────── */

function StoriesTray({ seen, onOpen, onCreate }: { seen: Set<number>; onOpen: (i: number) => void; onCreate: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ l: false, r: true })
  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdges({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])
  useEffect(() => {
    update()
    const ro = new ResizeObserver(update)
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [update])
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 240, behavior: 'smooth' })
  const card = 'relative h-[190px] w-[108px] shrink-0 snap-start overflow-hidden rounded-xl bg-(--card) shadow-(--shadow)'
  return (
    <div className="relative">
      <div ref={ref} onScroll={update} className="flex snap-x scroll-px-3 gap-2 overflow-x-auto px-3 py-0.5 [scrollbar-width:none] @md:scroll-px-0.5 @md:px-0.5">
        <button type="button" onClick={onCreate} className={`group ${card} ${FOCUS}`} aria-label="ストーリーズを作成">
          <span className="absolute inset-x-0 top-0 h-[132px] overflow-hidden">
            <span className="block h-full w-full transition duration-500 group-hover:scale-105">
              <Face u={user('me')} />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 grid h-[58px] place-items-center pt-3 text-[12px] font-semibold">ストーリーズを作成</span>
          <span className="absolute top-[116px] left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full bg-(--accent) text-white" style={{ boxShadow: '0 0 0 4px var(--card)' }}>
            <Plus size={18} strokeWidth={3} />
          </span>
        </button>
        {STORIES.map((s, i) => (
          <button key={s.user} type="button" onClick={() => onOpen(i)} aria-label={`${user(s.user).name}さんのストーリーズ${seen.has(i) ? '(既読)' : ''}`} className={`group ${card} ${FOCUS}`}>
            <Scene kind={s.frames[0].scene} className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60" />
            <span className="absolute top-2 left-2">
              <Avatar id={s.user} size={38} ring={seen.has(i) ? 'seen' : 'new'} />
            </span>
            <span className="absolute inset-x-2 bottom-2 text-left text-[12px] leading-tight font-semibold text-white">{user(s.user).name}</span>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {edges.l && (
          <motion.button key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" aria-label="前のストーリーズ" onClick={() => scroll(-1)} className={`absolute top-1/2 left-1 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-(--card) ${FOCUS}`} style={{ boxShadow: 'var(--pop)' }}>
            <ChevronLeft size={22} />
          </motion.button>
        )}
        {edges.r && (
          <motion.button key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" aria-label="次のストーリーズ" onClick={() => scroll(1)} className={`absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-(--card) ${FOCUS}`} style={{ boxShadow: 'var(--pop)' }}>
            <ChevronRight size={22} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

const STORY_MS = 4200

function StoryViewer({ start, onClose, onSeen }: { start: number; onClose: () => void; onSeen: (i: number) => void }) {
  const { reduce } = useFeed()
  const [pos, setPos] = useState({ s: start, f: 0, dir: 1 })
  const [paused, setPaused] = useState(false)
  const [floats, setFloats] = useState<{ id: number; r: ReactionId; x: number }[]>([])
  const [reply, setReply] = useState('')
  const [sent, setSent] = useState(false)
  const later = useTimers()
  const bar = useRef<HTMLSpanElement>(null)
  const pausedRef = useRef(false)
  const down = useRef(0)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const story = STORIES[pos.s]
  const frame = story.frames[pos.f]
  pausedRef.current = paused

  const next = useCallback(() => {
    setPos((p) => {
      if (p.f < STORIES[p.s].frames.length - 1) return { s: p.s, f: p.f + 1, dir: 1 }
      if (p.s < STORIES.length - 1) return { s: p.s + 1, f: 0, dir: 1 }
      onClose()
      return p
    })
  }, [onClose])
  const prev = useCallback(() => {
    setPos((p) => {
      if (p.f > 0) return { s: p.s, f: p.f - 1, dir: -1 }
      if (p.s > 0) return { s: p.s - 1, f: 0, dir: -1 }
      return { ...p, f: 0 }
    })
  }, [])
  const nextRef = useRef(next)
  useEffect(() => {
    nextRef.current = next
  })

  useEffect(() => onSeen(pos.s), [pos.s, onSeen])
  useEffect(() => closeBtn.current?.focus(), [])

  // 進捗バー: rAF で transform を直接書き換える(React の再レンダーなし)
  useEffect(() => {
    let elapsed = 0
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      if (!pausedRef.current) elapsed += now - last
      last = now
      const p = Math.min(1, elapsed / STORY_MS)
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
      if (p >= 1) return nextRef.current()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pos.s, pos.f])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [next, prev, onClose])

  const react = (r: ReactionId) => {
    const id = Date.now() + Math.random()
    setFloats((f) => [...f, { id, r, x: Math.random() * 60 - 30 }])
    later(() => setFloats((f) => f.filter((x) => x.id !== id)), 1500)
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${user(story.user).name}さんのストーリーズ`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#0c0b0f]/95"
    >
      <button ref={closeBtn} type="button" aria-label="閉じる" onClick={onClose} className={`absolute top-3 right-3 z-20 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 ${FOCUS}`}>
        <X size={22} />
      </button>
      {pos.s > 0 && (
        <button type="button" aria-label="前の人のストーリーズ" onClick={() => setPos((p) => ({ s: p.s - 1, f: 0, dir: -1 }))} className={`absolute left-3 z-20 hidden size-11 place-items-center rounded-full bg-white/90 text-black hover:bg-white @lg:grid ${FOCUS}`}>
          <ChevronLeft size={24} />
        </button>
      )}
      {pos.s < STORIES.length - 1 && (
        <button type="button" aria-label="次の人のストーリーズ" onClick={() => setPos((p) => ({ s: p.s + 1, f: 0, dir: 1 }))} className={`absolute right-3 z-20 hidden size-11 place-items-center rounded-full bg-white/90 text-black hover:bg-white @lg:grid ${FOCUS}`}>
          <ChevronRight size={24} />
        </button>
      )}
      <AnimatePresence mode="popLayout" initial={false} custom={pos.dir}>
        <motion.div
          key={pos.s}
          custom={pos.dir}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: pos.dir * 80, scale: 0.92, rotateY: pos.dir * -18 }}
          animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: pos.dir * -80, scale: 0.92, rotateY: pos.dir * 18 }}
          transition={reduce ? FADE : { type: 'spring', stiffness: 300, damping: 32 }}
          className="relative aspect-[9/16] h-[calc(100%-24px)] max-w-[calc(100%-24px)] overflow-hidden rounded-xl bg-black"
          style={{ transformPerspective: 900 }}
        >
          <AnimatePresence initial={false}>
            <motion.div key={pos.f} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Scene kind={frame.scene} className="absolute inset-0 h-full w-full" />
            </motion.div>
          </AnimatePresence>
          <span className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

          {/* タップ領域: 左 30% で戻る / それ以外で進む。押している間は一時停止 */}
          <div
            className="absolute inset-0"
            onPointerDown={() => {
              down.current = performance.now()
              setPaused(true)
            }}
            onPointerUp={(e) => {
              setPaused(false)
              if (performance.now() - down.current > 260) return
              const rect = e.currentTarget.getBoundingClientRect()
              if (e.clientX - rect.left < rect.width * 0.3) prev()
              else next()
            }}
            onPointerLeave={() => setPaused(false)}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex gap-1 px-2 pt-2">
            {story.frames.map((_, i) => (
              <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                <span
                  ref={i === pos.f ? bar : undefined}
                  className="block h-full origin-left rounded-full bg-white"
                  style={{ transform: `scaleX(${i < pos.f ? 1 : 0})` }}
                />
              </span>
            ))}
          </div>
          <div className="absolute inset-x-0 top-4 flex items-center gap-2 px-3">
            <Avatar id={story.user} size={34} />
            <span className="text-[13.5px] font-semibold text-white">{user(story.user).name}</span>
            <span className="text-[12px] text-white/75">{story.time}</span>
            <button type="button" aria-label={paused ? '再生' : '一時停止'} onClick={() => setPaused((p) => !p)} className={`ml-auto grid size-8 place-items-center rounded-full text-white hover:bg-white/15 ${FOCUS}`}>
              {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </button>
          </div>
          {frame.text && (
            <motion.div
              key={`${pos.s}-${pos.f}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={reduce ? FADE : { ...POP, delay: 0.15 }}
              className="pointer-events-none absolute inset-x-0 top-[58%] text-center"
            >
              <span className="inline-block -rotate-2 rounded-lg bg-white px-3 py-1.5 text-[18px] font-bold text-[#1d1a20] shadow-lg">{frame.text}</span>
            </motion.div>
          )}

          {floats.map((f) => (
            <motion.span
              key={f.id}
              className="pointer-events-none absolute bottom-16 left-1/2"
              initial={{ y: 0, x: f.x, opacity: 1, scale: 0.6 }}
              animate={{ y: -260, x: f.x * 1.6, opacity: 0, scale: 1.5 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            >
              <ReactionIcon r={f.r} size={40} />
            </motion.span>
          ))}

          <form
            className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!reply.trim()) return
              setReply('')
              setSent(true)
              setPaused(false)
              later(() => setSent(false), 1800)
            }}
          >
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              placeholder={`${firstName(story.user)}さんに返信…`}
              aria-label="ストーリーズに返信"
              className="h-10 min-w-0 flex-1 rounded-full border border-white/50 bg-black/20 px-4 text-[13.5px] text-white outline-none placeholder:text-white/70 focus:border-white"
            />
            {(['like', 'love', 'haha'] as const).map((r) => (
              <button key={r} type="button" aria-label={`${RX[r].label}を送る`} onClick={() => react(r)} className={`rounded-full transition hover:scale-110 active:scale-90 ${FOCUS}`}>
                <ReactionIcon r={r} size={30} />
              </button>
            ))}
          </form>
          <AnimatePresence>
            {sent && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-16 text-center">
                <span className="rounded-full bg-black/70 px-3 py-1.5 text-[12.5px] text-white">返信を送信しました</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

/* ───────────── 投稿作成 ───────────── */

function Composer({ initial, onClose, onPublish }: { initial: 'photo' | 'feeling' | null; onClose: () => void; onPublish: (p: PostData) => void }) {
  const { reduce } = useFeed()
  const [audience, setAudience] = useState<Audience>('friends')
  const [audOpen, setAudOpen] = useState(false)
  const [text, setText] = useState('')
  const [bg, setBg] = useState<number | null>(null)
  const [palette, setPalette] = useState(false)
  const [photos, setPhotos] = useState<SceneKind[]>(initial === 'photo' ? ['flower'] : [])
  const [feeling, setFeeling] = useState<Feeling | undefined>()
  const [place, setPlace] = useState<string | undefined>()
  const [panel, setPanel] = useState<'feeling' | 'place' | null>(initial === 'feeling' ? 'feeling' : null)
  const audRef = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  useDismiss(audOpen, audRef, () => setAudOpen(false))
  useEffect(() => area.current?.focus(), [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !audOpen && onClose()
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [audOpen, onClose])

  const bgOk = photos.length === 0 && text.length <= 100
  const bgActive = bg !== null && bgOk
  const canPost = text.trim().length > 0 || photos.length > 0
  const A = AUDIENCE[audience].icon
  const POOL: SceneKind[] = ['flower', 'sea', 'cafe', 'sunset', 'forest']

  const publish = () => {
    if (!canPost) return
    onPublish({
      id: `new-${Date.now()}`,
      author: 'me',
      time: 'たった今',
      audience,
      text: text.trim() || undefined,
      bg: bgActive ? bg : undefined,
      photos: photos.length ? photos : undefined,
      feeling,
      place,
      reactions: {},
      shares: 0,
      comments: [],
      fresh: true,
    })
  }

  return (
    <motion.div
      className="absolute inset-0 z-50 grid place-items-center bg-black/45 p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hearth-compose-title"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
        transition={reduce ? FADE : SPRING}
        className={`flex max-h-full w-full max-w-[500px] flex-col overflow-hidden rounded-xl bg-(--card) ${SCROLL}`}
        style={{ boxShadow: 'var(--pop)' }}
      >
        <div className="relative grid h-14 shrink-0 place-items-center border-b border-(--line)">
          <h2 id="hearth-compose-title" className="text-[18px] font-bold">
            投稿を作成
          </h2>
          <button type="button" aria-label="閉じる" onClick={onClose} className={`absolute right-3 grid size-9 place-items-center rounded-full bg-(--soft) hover:brightness-95 ${FOCUS}`}>
            <X size={20} />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto p-4 ${SCROLL}`}>
          <div className="flex items-center gap-2.5">
            <Avatar id="me" size={40} />
            <div className="min-w-0">
              <div className="text-[14.5px] leading-tight">
                <span className="font-semibold">{user('me').name}</span>
                {feeling && (
                  <span className="text-(--muted)">
                    {' '}
                    — {feeling.e} {feeling.t}気分です
                  </span>
                )}
                {place && <span className="text-(--muted)"> — {place}にいます</span>}
              </div>
              <div ref={audRef} className="relative mt-1">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={audOpen}
                  onClick={() => setAudOpen((o) => !o)}
                  className={`flex items-center gap-1 rounded-md bg-(--soft) px-2 py-0.5 text-[12.5px] font-semibold hover:brightness-95 ${FOCUS}`}
                >
                  <A size={13} /> {AUDIENCE[audience].label} <ChevronDown size={13} />
                </button>
                <AnimatePresence>
                  {audOpen && (
                    <Popover className="top-full left-0 mt-1 w-64" origin="top left">
                      <div role="listbox" aria-label="公開範囲">
                        {(Object.keys(AUDIENCE) as Audience[]).map((k) => {
                          const I = AUDIENCE[k].icon
                          return (
                            <button
                              key={k}
                              type="button"
                              role="option"
                              aria-selected={audience === k}
                              onClick={() => {
                                setAudience(k)
                                setAudOpen(false)
                              }}
                              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-(--hover) ${FOCUS}`}
                            >
                              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--soft)">
                                <I size={17} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[14px] font-semibold">{AUDIENCE[k].label}</span>
                                <span className="block text-[12px] text-(--muted)">{AUDIENCE[k].desc}</span>
                              </span>
                              {audience === k && <Check size={17} className="text-(--accent)" />}
                            </button>
                          )
                        })}
                      </div>
                    </Popover>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <motion.div
            layout={!reduce}
            transition={SPRING}
            className={`mt-3 overflow-hidden rounded-lg ${bgActive ? 'grid min-h-[200px] place-items-center px-6 py-8' : ''}`}
            style={{ background: bgActive ? BGS[bg] : 'transparent' }}
          >
            <textarea
              ref={area}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) publish()
              }}
              rows={bgActive ? 2 : 3}
              placeholder={`いま何してる？、${firstName('me')}さん`}
              aria-label="投稿の本文"
              className={`w-full resize-none bg-transparent outline-none [field-sizing:content] ${
                bgActive ? 'text-center text-[22px] leading-snug font-bold text-white placeholder:text-white/70' : 'min-h-[84px] text-[17px] placeholder:text-(--muted)'
              }`}
            />
          </motion.div>

          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              aria-label="背景色を選ぶ"
              aria-expanded={palette}
              disabled={!bgOk}
              onClick={() => setPalette((p) => !p)}
              className={`grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold text-white disabled:opacity-35 ${FOCUS}`}
              style={{ background: palette ? 'var(--soft)' : BGS[0], color: palette ? 'var(--fg)' : '#fff' }}
            >
              {palette ? <ChevronLeft size={16} /> : 'Aa'}
            </button>
            <AnimatePresence initial={false}>
              {palette && bgOk && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex flex-wrap items-center gap-1.5"
                  role="radiogroup"
                  aria-label="背景色"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={bg === null}
                    aria-label="背景なし"
                    onClick={() => setBg(null)}
                    className={`size-8 rounded-lg border-2 bg-(--card) ${bg === null ? 'border-(--fg)' : 'border-(--line)'} ${FOCUS}`}
                  />
                  {BGS.map((b, i) => (
                    <motion.button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={bg === i}
                      aria-label={`背景 ${i + 1}`}
                      onClick={() => setBg(i)}
                      initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: bg === i ? 1.1 : 1, opacity: 1 }}
                      transition={reduce ? FADE : { ...POP, delay: i * 0.03 }}
                      className={`size-8 rounded-lg ${bg === i ? 'ring-2 ring-(--fg) ring-offset-2' : ''} ${FOCUS}`}
                      style={{ background: b }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <span className={`ml-auto text-[12px] tabular-nums ${text.length > 100 && bg !== null ? 'text-(--accent)' : 'text-(--muted)'}`}>
              {bg !== null && !bgOk ? '背景は100文字以内・写真なしのとき使えます' : ''}
            </span>
          </div>

          <AnimatePresence initial={false}>
            {photos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative mt-3 overflow-hidden rounded-lg border border-(--line)"
              >
                <div className="pointer-events-none">
                  <Collage photos={photos} />
                </div>
                <button type="button" aria-label="写真を削除" onClick={() => setPhotos([])} className={`absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-(--card) shadow ${FOCUS}`}>
                  <X size={18} />
                </button>
                <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[12px] text-white">写真{photos.length}枚</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-3 rounded-lg border border-(--line) px-3 py-2">
            <div className="flex items-center gap-1">
              <span className="mr-auto text-[14px] font-semibold">投稿に追加</span>
              {(
                [
                  { icon: ImageIcon, label: '写真', color: '#2fb457', on: photos.length > 0, act: () => setPhotos((p) => (p.length >= 5 ? p : [...p, POOL[p.length % POOL.length]])) },
                  { icon: UserPlus, label: 'タグ付け', color: '#3b7cf0', on: false, act: () => setPanel(null) },
                  { icon: Smile, label: '気分', color: '#f2b01e', on: panel === 'feeling' || !!feeling, act: () => setPanel((p) => (p === 'feeling' ? null : 'feeling')) },
                  { icon: MapPin, label: 'チェックイン', color: '#e5336c', on: panel === 'place' || !!place, act: () => setPanel((p) => (p === 'place' ? null : 'place')) },
                ] as const
              ).map((b) => (
                <button
                  key={b.label}
                  type="button"
                  title={b.label}
                  aria-label={b.label}
                  aria-pressed={b.on}
                  onClick={b.act}
                  className={`grid size-9 place-items-center rounded-full hover:bg-(--hover) ${b.on ? 'bg-(--hover)' : ''} ${FOCUS}`}
                  style={{ color: b.color }}
                >
                  <b.icon size={21} />
                </button>
              ))}
            </div>
            <AnimatePresence initial={false} mode="wait">
              {panel && (
                <motion.div
                  key={panel}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 pt-2 pb-1">
                    {panel === 'feeling'
                      ? FEELINGS.map((f) => (
                          <button
                            key={f.t}
                            type="button"
                            aria-pressed={feeling?.t === f.t}
                            onClick={() => setFeeling((cur) => (cur?.t === f.t ? undefined : f))}
                            className={`rounded-full border px-2.5 py-1 text-[13px] ${feeling?.t === f.t ? 'border-(--accent) bg-(--accent-soft) text-(--accent)' : 'border-(--line) hover:bg-(--hover)'} ${FOCUS}`}
                          >
                            {f.e} {f.t}
                          </button>
                        ))
                      : PLACES.map((p) => (
                          <button
                            key={p}
                            type="button"
                            aria-pressed={place === p}
                            onClick={() => setPlace((cur) => (cur === p ? undefined : p))}
                            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] ${place === p ? 'border-(--accent) bg-(--accent-soft) text-(--accent)' : 'border-(--line) hover:bg-(--hover)'} ${FOCUS}`}
                          >
                            <MapPin size={12} /> {p}
                          </button>
                        ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="shrink-0 p-4 pt-0">
          <button
            type="button"
            disabled={!canPost}
            onClick={publish}
            className={`h-10 w-full rounded-lg bg-(--accent) text-[15px] font-semibold text-white transition hover:brightness-105 disabled:bg-(--soft) disabled:text-(--muted) ${FOCUS}`}
          >
            投稿
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ───────────── ライトボックス ───────────── */

function Lightbox({ photos, start, onClose }: { photos: SceneKind[]; start: number; onClose: () => void }) {
  const { reduce } = useFeed()
  const [i, setI] = useState(start)
  const [dir, setDir] = useState(1)
  const go = useCallback(
    (d: number) => {
      setDir(d)
      setI((x) => (x + d + photos.length) % photos.length)
    },
    [photos.length],
  )
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => closeRef.current?.focus(), [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [go, onClose])
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="写真"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 grid place-items-center bg-black/92"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={i}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -60 }}
          transition={reduce ? FADE : SPRING}
          className="aspect-[4/3] w-[min(88%,760px)] max-h-[82%] overflow-hidden rounded-lg"
        >
          <Scene kind={photos[i]} className="h-full w-full" />
        </motion.div>
      </AnimatePresence>
      <button ref={closeRef} type="button" aria-label="閉じる" onClick={onClose} className={`absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 ${FOCUS}`}>
        <X size={22} />
      </button>
      {photos.length > 1 && (
        <>
          <button type="button" aria-label="前の写真" onClick={() => go(-1)} className={`absolute left-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 ${FOCUS}`}>
            <ChevronLeft size={24} />
          </button>
          <button type="button" aria-label="次の写真" onClick={() => go(1)} className={`absolute right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 ${FOCUS}`}>
            <ChevronRight size={24} />
          </button>
          <span className="absolute bottom-3 rounded-full bg-white/10 px-3 py-1 text-[13px] text-white tabular-nums">
            {i + 1} / {photos.length}
          </span>
        </>
      )}
      <span className="absolute top-4 left-4 max-w-[60%] text-[13px] text-white/80">{SCENE_ALT[photos[i]]}</span>
    </motion.div>
  )
}

/* ───────────── チャット窓 ───────────── */

function ChatWindow({
  id,
  msgs,
  typing,
  width,
  onSend,
  onMinimize,
  onClose,
}: {
  id: UserId
  msgs: Msg[]
  typing: boolean
  width: number
  onSend: (m: Omit<Msg, 'id' | 'from'>) => void
  onMinimize: () => void
  onClose: () => void
}) {
  const { reduce } = useFeed()
  const [text, setText] = useState('')
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const u = user(id)
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [msgs.length, typing, reduce])
  useEffect(() => input.current?.focus(), [])
  const lastMine = msgs.map((m) => m.from).lastIndexOf('me')
  const repliedAfter = lastMine >= 0 && lastMine < msgs.length - 1

  return (
    <motion.section
      layout={!reduce}
      aria-label={`${u.name}さんとのチャット`}
      initial={reduce ? { opacity: 0 } : { y: 60, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { y: 60, opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
      transition={reduce ? FADE : SPRING}
      className="pointer-events-auto flex h-[400px] max-h-[calc(100%-8px)] origin-bottom flex-col overflow-hidden rounded-t-xl bg-(--card)"
      style={{ width, boxShadow: '0 -2px 30px -6px rgba(0,0,0,.35), 0 0 0 1px var(--line)' }}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-(--line) px-2 py-1.5">
        <Avatar id={id} size={34} online={u.online} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[14px] font-semibold">{u.name}</div>
          <div className="text-[11.5px] text-(--muted)">{u.online ? 'アクティブ' : `${u.seen}前にオンライン`}</div>
        </div>
        <button type="button" aria-label="音声通話" className={`grid size-8 place-items-center rounded-full text-(--accent) hover:bg-(--hover) ${FOCUS}`}>
          <Phone size={17} />
        </button>
        <button type="button" aria-label="最小化" onClick={onMinimize} className={`grid size-8 place-items-center rounded-full text-(--accent) hover:bg-(--hover) ${FOCUS}`}>
          <Minus size={18} />
        </button>
        <button type="button" aria-label="チャットを閉じる" onClick={onClose} className={`grid size-8 place-items-center rounded-full text-(--accent) hover:bg-(--hover) ${FOCUS}`}>
          <X size={18} />
        </button>
      </div>
      <div ref={list} className={`min-h-0 flex-1 overflow-y-auto px-3 py-3 ${SCROLL}`} aria-live="polite">
        <div className="mb-4 flex flex-col items-center text-center">
          <Avatar id={id} size={56} />
          <div className="mt-1.5 text-[14px] font-semibold">{u.name}</div>
          <div className="text-[12px] text-(--muted)">Hearthで友達です</div>
        </div>
        <div className="mb-2 text-center text-[11px] text-(--muted)">今日 14:02</div>
        {msgs.map((m, i) => {
          const mine = m.from === 'me'
          const first = msgs[i - 1]?.from !== m.from
          const last = msgs[i + 1]?.from !== m.from
          return (
            <motion.div
              key={m.id}
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={POP}
              className={`flex items-end gap-1.5 ${mine ? 'justify-end' : ''} ${first ? 'mt-2' : 'mt-0.5'}`}
              style={{ transformOrigin: mine ? 'bottom right' : 'bottom left' }}
            >
              {!mine && <span className="w-6 shrink-0">{last && <Avatar id={m.from} size={24} />}</span>}
              {m.like ? (
                <ReactionIcon r="like" size={40} />
              ) : (
                <span
                  className={`max-w-[78%] px-3 py-1.5 text-[14px] leading-snug break-words ${mine ? 'bg-(--accent) text-white' : 'bg-(--hover)'}`}
                  style={{
                    borderRadius: 18,
                    [mine ? 'borderTopRightRadius' : 'borderTopLeftRadius']: first ? 18 : 5,
                    [mine ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: last ? 18 : 5,
                  }}
                >
                  {m.text}
                </span>
              )}
            </motion.div>
          )
        })}
        {repliedAfter || !msgs.length || msgs[msgs.length - 1].from !== 'me' ? null : (
          <div className="mt-0.5 text-right text-[11px] text-(--muted)">{typing ? '既読' : '送信済み'}</div>
        )}
        <AnimatePresence>
          {typing && (
            <motion.div key="t" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex items-end gap-1.5">
              <Avatar id={id} size={24} />
              <span className="rounded-[18px] bg-(--hover) px-3 py-1.5">
                <TypingDots />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <form
        className="flex shrink-0 items-center gap-1 border-t border-(--line) p-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          onSend({ text: text.trim() })
          setText('')
        }}
      >
        <button type="button" aria-label="写真を送る" className={`grid size-8 shrink-0 place-items-center rounded-full text-(--accent) hover:bg-(--hover) ${FOCUS}`}>
          <ImageIcon size={18} />
        </button>
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Aa"
          aria-label="メッセージ"
          className="h-9 min-w-0 flex-1 rounded-full bg-(--hover) px-3 text-[14px] outline-none placeholder:text-(--muted)"
        />
        {text.trim() ? (
          <button type="submit" aria-label="送信" className={`grid size-8 shrink-0 place-items-center rounded-full text-(--accent) hover:bg-(--hover) ${FOCUS}`}>
            <Send size={18} />
          </button>
        ) : (
          <button type="button" aria-label="いいね！を送る" onClick={() => onSend({ like: true })} className={`grid size-8 shrink-0 place-items-center rounded-full hover:bg-(--hover) ${FOCUS}`}>
            <ReactionIcon r="like" size={24} />
          </button>
        )}
      </form>
    </motion.section>
  )
}

/* ───────────── ナビゲーションと左右のカラム ───────────── */

type TabId = 'home' | 'video' | 'market' | 'groups'
const TABS: { id: TabId; label: string; icon: LucideIcon; badge?: string }[] = [
  { id: 'home', label: 'ホーム', icon: House },
  { id: 'video', label: '動画', icon: MonitorPlay, badge: '3' },
  { id: 'market', label: 'マーケット', icon: Store },
  { id: 'groups', label: 'グループ', icon: UsersRound, badge: '9+' },
]

function Tabs({ tab, setTab, id, className }: { tab: TabId; setTab: (t: TabId) => void; id: string; className: string }) {
  const { reduce } = useFeed()
  return (
    <nav aria-label="メインメニュー" className={className}>
      {TABS.map((t) => {
        const active = tab === t.id
        return (
          <button
            key={t.id}
            type="button"
            aria-label={t.label}
            title={t.label}
            aria-current={active ? 'page' : undefined}
            onClick={() => setTab(t.id)}
            className={`group relative grid h-full flex-1 place-items-center ${FOCUS} focus-visible:-outline-offset-4`}
            style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
          >
            <span className={`absolute inset-x-1 inset-y-1.5 rounded-lg transition ${active ? '' : 'group-hover:bg-(--hover)'}`} />
            <span className="relative">
              <t.icon size={24} strokeWidth={active ? 2.4 : 2} />
              {t.badge && !active && (
                <span className="absolute -top-1.5 -right-3 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-bold text-white" style={{ background: BADGE_RED }}>
                  {t.badge}
                </span>
              )}
            </span>
            {active && (
              <motion.span layoutId={`hearth-tab-${id}`} transition={reduce ? { duration: 0 } : SPRING} className="absolute inset-x-1.5 bottom-0 h-[3px] rounded-t-full bg-(--accent)" />
            )}
          </button>
        )
      })}
    </nav>
  )
}

const SIDE_ITEMS: { label: string; icon: LucideIcon; bg: string }[] = [
  { label: '友達', icon: Users, bg: 'linear-gradient(135deg,#4cc3ff,#2b7de9)' },
  { label: '思い出', icon: History, bg: 'linear-gradient(135deg,#7fd1c7,#2a9d8f)' },
  { label: '保存済み', icon: Bookmark, bg: 'linear-gradient(135deg,#c08bff,#7b4ae2)' },
  { label: 'グループ', icon: UsersRound, bg: 'linear-gradient(135deg,#5ec2ff,#3366ff)' },
  { label: '動画', icon: MonitorPlay, bg: 'linear-gradient(135deg,#4fd1ff,#1f8ad1)' },
  { label: 'マーケットプレイス', icon: Store, bg: 'linear-gradient(135deg,#4fd6c0,#169b8a)' },
  { label: 'フィード', icon: Rss, bg: 'linear-gradient(135deg,#ffb36b,#f0662e)' },
  { label: 'イベント', icon: CalendarDays, bg: 'linear-gradient(135deg,#ff7a8a,#e5336c)' },
  { label: '募金・支援', icon: HandHeart, bg: 'linear-gradient(135deg,#ff9fc4,#d6336c)' },
  { label: 'ゲーム', icon: Gamepad2, bg: 'linear-gradient(135deg,#8f9bff,#4c5bd4)' },
]
const GROUP_SHORTCUTS: { name: string; scene: SceneKind }[] = [
  { name: '週末パン部', scene: 'bread' },
  { name: '八ヶ岳ハイキング部', scene: 'mountain' },
  { name: '港町フォトウォーク', scene: 'city' },
  { name: 'ねこ好き町内会', scene: 'cat' },
]

function LeftColumn() {
  const { toast } = useFeed()
  const [more, setMore] = useState(false)
  const items = more ? SIDE_ITEMS : SIDE_ITEMS.slice(0, 7)
  const row = `flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[14.5px] font-medium hover:bg-(--hover) ${FOCUS}`
  return (
    <>
      <button type="button" className={row} onClick={() => toast('プロフィールはデモでは開けません')}>
        <Avatar id="me" size={34} />
        {user('me').name}
      </button>
      {items.map((it) => (
        <button key={it.label} type="button" className={row} onClick={() => toast(`「${it.label}」はデモでは開けません`)}>
          <span className="grid size-[34px] shrink-0 place-items-center rounded-full text-white" style={{ background: it.bg }}>
            <it.icon size={18} />
          </span>
          {it.label}
        </button>
      ))}
      <button type="button" className={row} aria-expanded={more} onClick={() => setMore((m) => !m)}>
        <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-(--soft)">
          <ChevronDown size={20} className={`transition ${more ? 'rotate-180' : ''}`} />
        </span>
        {more ? '表示を減らす' : 'もっと見る'}
      </button>
      <hr className="mx-2 my-2 border-(--line)" />
      <div className="px-2 pb-1 text-[15px] font-semibold text-(--muted)">ショートカット</div>
      {GROUP_SHORTCUTS.map((g) => (
        <button key={g.name} type="button" className={row} onClick={() => toast(`「${g.name}」はデモでは開けません`)}>
          <span className="block size-[34px] shrink-0 overflow-hidden rounded-lg">
            <Scene kind={g.scene} className="h-full w-full" />
          </span>
          {g.name}
        </button>
      ))}
      <p className="px-2 pt-3 text-[11.5px] leading-relaxed text-(--muted)">プライバシー · 規約 · 広告 · Cookie · Hearth © 2026(架空のサービス)</p>
    </>
  )
}

function RightColumn({ onChat }: { onChat: (id: UserId) => void }) {
  return (
    <>
      <div className="px-2 pt-1 pb-2 text-[15px] font-semibold text-(--muted)">誕生日</div>
      <div className="flex items-start gap-3 rounded-lg px-2 py-1.5 text-[14px]">
        <Gift size={28} className="shrink-0 text-(--accent)" />
        <p>
          <span className="font-semibold">{user('jun').name}</span>さんと他<span className="font-semibold">2人</span>が今日誕生日です。
        </p>
      </div>
      <hr className="mx-2 my-2 border-(--line)" />
      <div className="flex items-center px-2 pb-1">
        <span className="mr-auto text-[15px] font-semibold text-(--muted)">連絡先</span>
        <button type="button" aria-label="連絡先を検索" className={`grid size-8 place-items-center rounded-full text-(--muted) hover:bg-(--hover) ${FOCUS}`}>
          <Search size={16} />
        </button>
        <button type="button" aria-label="その他のオプション" className={`grid size-8 place-items-center rounded-full text-(--muted) hover:bg-(--hover) ${FOCUS}`}>
          <Ellipsis size={18} />
        </button>
      </div>
      {CONTACTS.map((id) => {
        const u = user(id)
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChat(id)}
            className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[14.5px] font-medium hover:bg-(--hover) ${FOCUS}`}
          >
            <span className="relative">
              <Avatar id={id} size={34} online={u.online} />
              {!u.online && u.seen && (
                <span className="absolute -right-1.5 -bottom-1 rounded-full bg-(--accent-soft) px-1 text-[9.5px] font-bold text-(--accent)" style={{ boxShadow: '0 0 0 2px var(--bg)' }}>
                  {u.seen}
                </span>
              )}
            </span>
            {u.name}
          </button>
        )
      })}
      <hr className="mx-2 my-2 border-(--line)" />
      <div className="px-2 pb-1 text-[15px] font-semibold text-(--muted)">グループの会話</div>
      <button type="button" className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[14.5px] font-medium hover:bg-(--hover) ${FOCUS}`}>
        <span className="grid size-[34px] place-items-center rounded-full bg-(--soft)">
          <Plus size={18} />
        </span>
        新しいグループを作成
      </button>
    </>
  )
}

/* ───────────── 本体 ───────────── */

export function SocialNewsFeed() {
  const reduce = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const feedRef = useRef<HTMLElement>(null)
  const [{ width, height }, setSize] = useState({ width: 1000, height: 600 })
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    setSize({ width: el.clientWidth, height: el.clientHeight })
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [theme, setTheme] = useState<Theme>('light')
  const [tab, setTab] = useState<TabId>('home')
  const [posts, setPosts] = useState<PostData[]>(POSTS)
  const [seen, setSeen] = useState<Set<number>>(() => new Set())
  const [storyAt, setStoryAt] = useState<number | null>(null)
  const [composer, setComposer] = useState<{ initial: 'photo' | 'feeling' | null } | null>(null)
  const [lightbox, setLightbox] = useState<{ photos: SceneKind[]; i: number } | null>(null)
  const [panel, setPanel] = useState<'notif' | 'msg' | null>(null)
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all')
  const [notifs, setNotifs] = useState(NOTIFS)
  const [searchOpen, setSearchOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ id: number; text: string } | null>(null)
  const later = useTimers()
  const panelRef = useRef<HTMLDivElement>(null)
  useDismiss(panel !== null, panelRef, () => setPanel(null))

  const toast = useCallback(
    (text: string) => {
      const id = Date.now()
      setToastMsg({ id, text })
      later(() => setToastMsg((t) => (t?.id === id ? null : t)), 2400)
    },
    [later],
  )
  const openLightbox = useCallback((photos: SceneKind[], i: number) => setLightbox({ photos, i }), [])
  const markSeen = useCallback((i: number) => setSeen((s) => (s.has(i) ? s : new Set(s).add(i))), [])
  const closeStory = useCallback(() => setStoryAt(null), [])
  const closeComposer = useCallback(() => setComposer(null), [])

  /* チャット */
  const [chats, setChats] = useState<{ id: UserId; min: boolean }[]>([])
  const [msgs, setMsgs] = useState<Partial<Record<UserId, Msg[]>>>(CHAT_SEED)
  const [typing, setTyping] = useState<Partial<Record<UserId, boolean>>>({})
  const [unread, setUnread] = useState<Partial<Record<UserId, number>>>({ yuto: 1, mei: 1 })
  const replyIdx = useRef(0)
  const maxOpen = width >= 900 ? 2 : 1
  const chatsRef = useRef(chats)
  useEffect(() => {
    chatsRef.current = chats
  })

  const enforce = useCallback(
    (list: { id: UserId; min: boolean }[]) => {
      let open = 0
      return list.map((c) => {
        if (c.min) return c
        open += 1
        return open > maxOpen ? { ...c, min: true } : c
      })
    },
    [maxOpen],
  )
  useEffect(() => setChats((cs) => enforce(cs)), [enforce])

  const openChat = useCallback(
    (id: UserId) => {
      setChats((cs) => enforce([{ id, min: false }, ...cs.filter((c) => c.id !== id)]))
      setUnread((u) => ({ ...u, [id]: 0 }))
      setPanel(null)
    },
    [enforce],
  )
  const sendChat = (id: UserId, m: Omit<Msg, 'id' | 'from'>) => {
    setMsgs((all) => ({ ...all, [id]: [...(all[id] ?? []), { ...m, id: `me${Date.now()}`, from: 'me' }] }))
    later(() => setTyping((t) => ({ ...t, [id]: true })), 700)
    later(() => {
      setTyping((t) => ({ ...t, [id]: false }))
      const text = AUTO_REPLIES[replyIdx.current++ % AUTO_REPLIES.length]
      setMsgs((all) => ({ ...all, [id]: [...(all[id] ?? []), { id: `r${Date.now()}`, from: id, text }] }))
      if (chatsRef.current.find((c) => c.id === id)?.min) setUnread((u) => ({ ...u, [id]: (u[id] ?? 0) + 1 }))
    }, 2200 + Math.random() * 800)
  }

  const openChats = chats.filter((c) => !c.min)
  const bubbles = chats.filter((c) => c.min)
  const chatW = Math.max(240, Math.min(320, width - (bubbles.length ? 84 : 24)))
  const unreadNotifs = notifs.filter((n) => n.unread).length
  const unreadMsgs = Object.values(unread).filter((n) => (n ?? 0) > 0).length

  const publish = (p: PostData) => {
    setComposer(null)
    setTab('home')
    setPosts((ps) => [p, ...ps])
    feedRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    toast('投稿しました')
  }

  const api = { toast, openLightbox, reduce }
  // モーダル表示中は背面をフォーカス・読み上げの対象から外す
  const blocked = storyAt !== null || composer !== null || lightbox !== null
  const shownNotifs = notifFilter === 'unread' ? notifs.filter((n) => n.unread) : notifs

  return (
    <FeedCtx.Provider value={api}>
      <div
        ref={rootRef}
        className="@container relative flex h-full flex-col overflow-hidden bg-(--bg) text-(--fg) transition-colors duration-300"
        style={THEMES[theme]}
      >
        {/* ヘッダー */}
        <header inert={blocked} className="relative z-[45] flex h-14 shrink-0 items-center gap-2 bg-(--card) px-3 shadow-(--shadow)">
          <div className="flex min-w-0 items-center gap-2 @5xl:w-[300px]">
            <HearthLogo />
            <span className="hidden text-[22px] font-extrabold tracking-tight text-(--accent) @md:inline @3xl:hidden @6xl:inline">hearth</span>
            <label className="relative hidden items-center @3xl:flex">
              <Search size={16} className="pointer-events-none absolute left-3 text-(--muted)" />
              <input
                placeholder="Hearthを検索"
                aria-label="Hearthを検索"
                className="h-10 w-[220px] rounded-full bg-(--soft) pr-3 pl-9 text-[14.5px] outline-none placeholder:text-(--muted) focus:ring-2 focus:ring-(--accent)/40 @6xl:w-[240px]"
              />
            </label>
          </div>
          <Tabs tab={tab} setTab={setTab} id="top" className="hidden h-full max-w-[600px] flex-1 justify-center @3xl:flex" />
          <div ref={panelRef} className="ml-auto flex items-center justify-end gap-2 @5xl:w-[300px]">
            <IconCircle icon={Search} label="検索" onClick={() => setSearchOpen(true)} className="@3xl:hidden" />
            <IconCircle icon={LayoutGrid} label="メニュー" onClick={() => toast('メニューはデモでは開けません')} className="hidden @xl:grid" />
            <IconCircle icon={theme === 'light' ? Moon : Sun} label={theme === 'light' ? 'ダークモード' : 'ライトモード'} onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} />
            <IconCircle icon={MessageCircle} label="メッセージ" active={panel === 'msg'} badge={unreadMsgs} onClick={() => setPanel((p) => (p === 'msg' ? null : 'msg'))} />
            <IconCircle icon={Bell} label="お知らせ" active={panel === 'notif'} badge={unreadNotifs} onClick={() => setPanel((p) => (p === 'notif' ? null : 'notif'))} />
            <button type="button" aria-label="アカウント" className={`hidden rounded-full @md:block ${FOCUS}`} onClick={() => toast('アカウントメニューはデモでは開けません')}>
              <Avatar id="me" size={40} />
            </button>

            <AnimatePresence>
              {panel === 'notif' && (
                <Popover className="top-[52px] right-0 flex w-[360px] max-w-[calc(100cqw-24px)] flex-col p-0" style={{ maxHeight: Math.min(520, height - 70) }}>
                  <div className="flex items-center px-4 pt-3">
                    <h3 className="mr-auto text-[20px] font-bold">お知らせ</h3>
                    <button
                      type="button"
                      onClick={() => setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })))}
                      className={`rounded px-1 text-[13px] font-semibold text-(--accent) hover:underline ${FOCUS}`}
                    >
                      すべて既読にする
                    </button>
                  </div>
                  <div className="flex gap-1.5 px-4 py-2">
                    {(['all', 'unread'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={notifFilter === f}
                        onClick={() => setNotifFilter(f)}
                        className={`rounded-full px-3 py-1 text-[14px] font-semibold ${notifFilter === f ? 'bg-(--accent-soft) text-(--accent)' : 'hover:bg-(--hover)'} ${FOCUS}`}
                      >
                        {f === 'all' ? 'すべて' : '未読'}
                      </button>
                    ))}
                  </div>
                  <ul className={`min-h-0 flex-1 overflow-y-auto px-2 pb-2 ${SCROLL}`}>
                    <AnimatePresence initial={false}>
                      {shownNotifs.map((n) => {
                        const B = NOTIF_BADGE[n.kind]
                        return (
                          <motion.li key={n.id} layout={!reduce} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
                            <button
                              type="button"
                              onClick={() => setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))}
                              className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-(--hover) ${FOCUS}`}
                            >
                              <span className="relative shrink-0">
                                <Avatar id={n.who} size={52} />
                                <span className="absolute -right-1 -bottom-1 grid size-[24px] place-items-center rounded-full text-white" style={{ background: B.bg, boxShadow: '0 0 0 2px var(--card)' }}>
                                  <B.icon size={13} />
                                </span>
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={`line-clamp-3 text-[13.5px] leading-snug ${n.unread ? '' : 'text-(--muted)'}`}>
                                  <b className="font-semibold text-(--fg)">{user(n.who).name}</b>さん{n.body}
                                </span>
                                <span className={`text-[12px] ${n.unread ? 'font-semibold text-(--accent)' : 'text-(--muted)'}`}>{n.time}</span>
                              </span>
                              <span className={`size-3 shrink-0 rounded-full transition ${n.unread ? 'bg-(--accent)' : 'bg-transparent'}`} />
                            </button>
                          </motion.li>
                        )
                      })}
                    </AnimatePresence>
                    {shownNotifs.length === 0 && <li className="py-8 text-center text-[13.5px] text-(--muted)">未読のお知らせはありません</li>}
                  </ul>
                </Popover>
              )}
              {panel === 'msg' && (
                <Popover className="top-[52px] right-0 w-[340px] max-w-[calc(100cqw-24px)] p-2">
                  <h3 className="px-2 pt-1 pb-2 text-[20px] font-bold">メッセージ</h3>
                  {(['mei', 'yuto', 'sana', 'taku', 'ken'] as UserId[]).map((id) => {
                    const last = (msgs[id] ?? []).at(-1)
                    const un = (unread[id] ?? 0) > 0
                    return (
                      <button key={id} type="button" onClick={() => openChat(id)} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-(--hover) ${FOCUS}`}>
                        <Avatar id={id} size={48} online={user(id).online} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-semibold">{user(id).name}</span>
                          <span className={`block truncate text-[13px] ${un ? 'font-semibold text-(--fg)' : 'text-(--muted)'}`}>
                            {last ? `${last.from === 'me' ? 'あなた: ' : ''}${last.like ? '👍' : last.text}` : 'メッセージを送ってみましょう'}
                          </span>
                        </span>
                        {un && <span className="size-3 shrink-0 rounded-full bg-(--accent)" />}
                      </button>
                    )
                  })}
                </Popover>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE} className="absolute inset-0 z-10 flex items-center gap-2 bg-(--card) px-3">
                <button type="button" aria-label="検索を閉じる" onClick={() => setSearchOpen(false)} className={`grid size-10 place-items-center rounded-full hover:bg-(--hover) ${FOCUS}`}>
                  <ArrowLeft size={20} />
                </button>
                <input
                  autoFocus
                  placeholder="Hearthを検索"
                  aria-label="Hearthを検索"
                  onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
                  className="h-10 min-w-0 flex-1 rounded-full bg-(--soft) px-4 text-[14.5px] outline-none placeholder:text-(--muted)"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </header>
        <div inert={blocked} className="contents">
          <Tabs tab={tab} setTab={setTab} id="sub" className="relative z-20 flex h-12 shrink-0 border-t border-(--line) bg-(--card) shadow-(--shadow) @3xl:hidden" />

        </div>
        {/* 3カラム */}
        <div inert={blocked} className="flex min-h-0 flex-1">
          <aside aria-label="ショートカット" className={`hidden w-[250px] shrink-0 overflow-y-auto px-2 py-3 @5xl:block @7xl:w-[300px] ${SCROLL}`}>
            <LeftColumn />
          </aside>
          <motion.main ref={feedRef} layoutScroll className={`min-w-0 flex-1 overflow-y-auto ${SCROLL}`}>
            {tab === 'home' ? (
              <div className="mx-auto max-w-[590px] space-y-3 py-3 @md:px-3 @md:py-4">
                <StoriesTray seen={seen} onOpen={setStoryAt} onCreate={() => toast('ストーリーズの作成はデモでは使えません')} />
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Avatar id="me" size={40} />
                    <button
                      type="button"
                      onClick={() => setComposer({ initial: null })}
                      className={`h-10 min-w-0 flex-1 truncate rounded-full bg-(--soft) px-4 text-left text-[15px] text-(--muted) hover:brightness-95 ${FOCUS}`}
                    >
                      いま何してる？、{firstName('me')}さん
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1 border-t border-(--line) pt-2">
                    {(
                      [
                        { icon: Video, label: 'ライブ', color: '#ef4b5c', act: () => toast('ライブ配信はデモでは使えません') },
                        { icon: ImageIcon, label: '写真', color: '#2fb457', act: () => setComposer({ initial: 'photo' }) },
                        { icon: Smile, label: '気分', color: '#f2b01e', act: () => setComposer({ initial: 'feeling' }) },
                      ] as const
                    ).map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={b.act}
                        className={`flex h-10 items-center justify-center gap-2 rounded-lg text-[14px] font-semibold text-(--muted) hover:bg-(--hover) ${FOCUS}`}
                      >
                        <b.icon size={22} style={{ color: b.color }} />
                        {b.label}
                      </button>
                    ))}
                  </div>
                </Card>
                <AnimatePresence initial={false}>
                  {posts.map((p) => (
                    <motion.div
                      key={p.id}
                      layout={reduce ? false : 'position'}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={reduce ? FADE : SPRING}
                    >
                      <PostCard post={p} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-(--muted)">
                  <Clock size={14} /> 新しい投稿はここまでです
                </div>
              </div>
            ) : (
              <div className="mx-auto grid h-full max-w-[590px] place-items-center p-6">
                <Card className="w-full rounded-xl p-8 text-center">
                  {(() => {
                    const t = TABS.find((x) => x.id === tab)!
                    return (
                      <>
                        <span className="mx-auto grid size-16 place-items-center rounded-full bg-(--accent-soft) text-(--accent)">
                          <t.icon size={30} />
                        </span>
                        <h3 className="mt-3 text-[18px] font-bold">{t.label}</h3>
                        <p className="mt-1 text-[14px] text-(--muted)">このデモでは「ホーム」のフィードだけ操作できます。</p>
                        <button type="button" onClick={() => setTab('home')} className={`mt-4 rounded-lg bg-(--accent) px-4 py-2 text-[14px] font-semibold text-white ${FOCUS}`}>
                          ホームに戻る
                        </button>
                      </>
                    )
                  })()}
                </Card>
              </div>
            )}
          </motion.main>
          <aside aria-label="連絡先" className={`hidden w-[260px] shrink-0 overflow-y-auto px-2 py-3 @4xl:block @7xl:w-[300px] ${SCROLL}`}>
            <RightColumn onChat={openChat} />
          </aside>
        </div>

        {/* チャットのドック */}
        <div inert={blocked} className="pointer-events-none absolute inset-x-0 top-14 bottom-0 z-40">
          <div className="absolute bottom-0 flex flex-row-reverse items-end gap-2" style={{ right: bubbles.length ? 76 : 12 }}>
            <AnimatePresence initial={false}>
              {openChats.map((c) => (
                <ChatWindow
                  key={c.id}
                  id={c.id}
                  msgs={msgs[c.id] ?? []}
                  typing={!!typing[c.id]}
                  width={chatW}
                  onSend={(m) => sendChat(c.id, m)}
                  onMinimize={() => setChats((cs) => cs.map((x) => (x.id === c.id ? { ...x, min: true } : x)))}
                  onClose={() => setChats((cs) => cs.filter((x) => x.id !== c.id))}
                />
              ))}
            </AnimatePresence>
          </div>
          <div className="absolute right-3 bottom-3 flex flex-col-reverse gap-2.5">
            <AnimatePresence initial={false}>
              {bubbles.map((c) => (
                <motion.div
                  key={c.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                  transition={POP}
                  className="group pointer-events-auto relative"
                >
                  <button type="button" aria-label={`${user(c.id).name}さんとのチャットを開く`} onClick={() => openChat(c.id)} className={`block rounded-full shadow-lg ${FOCUS}`}>
                    <Avatar id={c.id} size={50} online={user(c.id).online} />
                  </button>
                  {(unread[c.id] ?? 0) > 0 && (
                    <span className="absolute -top-1 -left-1 grid size-5 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: BADGE_RED, boxShadow: '0 0 0 2px var(--bg)' }}>
                      {unread[c.id]}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`${user(c.id).name}さんとのチャットを閉じる`}
                    onClick={() => setChats((cs) => cs.filter((x) => x.id !== c.id))}
                    className={`absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-(--card) text-(--muted) opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100 ${FOCUS}`}
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* トースト */}
        <div aria-live="polite" className="pointer-events-none absolute bottom-4 left-4 z-[60]">
          <AnimatePresence>
            {toastMsg && (
              <motion.div
                key={toastMsg.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={reduce ? FADE : SPRING}
                className="flex items-center gap-2 rounded-lg bg-[#1d1a20] px-4 py-3 text-[13.5px] text-white shadow-xl"
              >
                <Check size={16} className="text-[#7be3a0]" /> {toastMsg.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* オーバーレイ */}
        <AnimatePresence>
          {storyAt !== null && <StoryViewer key="story" start={storyAt} onClose={closeStory} onSeen={markSeen} />}
          {composer && <Composer key="compose" initial={composer.initial} onClose={closeComposer} onPublish={publish} />}
          {lightbox && <Lightbox key="lightbox" photos={lightbox.photos} start={lightbox.i} onClose={() => setLightbox(null)} />}
        </AnimatePresence>
      </div>
    </FeedCtx.Provider>
  )
}
