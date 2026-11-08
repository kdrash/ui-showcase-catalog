import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Check,
  Circle,
  CloudOff,
  Copy,
  Diamond,
  Eye,
  Hand,
  LogIn,
  LogOut,
  Map as MapIcon,
  MessageCircle,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  RefreshCw,
  Scan,
  SendHorizontal,
  Share2,
  Square,
  StickyNote,
  Trash,
  Type,
  Undo2,
  X,
} from 'lucide-react'
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

/**
 * FigJam風のリアルタイム共同編集ホワイトボード。ツール名「Tsumugi」・チーム・メンバー・ボードの内容はすべて架空。
 * - 共同編集者(ミナ・ハルト・ソラ・ユイ)はシミュレーション。各人に「手順キュー」を持たせ、空になるとプランナーが
 *   「付箋を掴んで動かす / 付箋に追記する / 新しい付箋を貼る / カーソルチャット / あなたのカーソルを見に来る / ぶらぶら」を
 *   担当エリアに寄せた重み付きで選んで積む小さなエージェント。コメントに返信する仕事は割り込みで優先される
 * - カーソル移動は 3 次ベジェ(進行方向に垂直なふくらみをランダムに付ける)+ 非対称イージング。たまに行き過ぎて戻り、止まっている間は
 *   リサージュでわずかに揺れる。座標はすべて ref に持ち、1 本の requestAnimationFrame で DOM の transform を直接書く(毎フレームの再レンダーなし)
 * - 他人が掴んだ付箋も同じループで DOM を直接動かし、離した瞬間だけ state に確定する。選択枠・「〇〇が編集中」ラベル・入力中キャレットは各人の色。
 *   日本語の入力らしく 1〜3 文字ずつ不規則に打つ
 * - 無限キャンバスは world 要素に translate + scale を掛けるだけ。ドット格子は背景の radial-gradient の size/position を同期させる。
 *   ピンやラベルなど「画面上で大きさを保つもの」は CSS 変数 --z を使い scale(calc(1 / var(--z))) で打ち消す
 * - パン: 空白ドラッグ / Space+ドラッグ / 中ボタン / 手のひらツール。ズーム: ホイール・ピンチ(ctrl+wheel / 2 本指タッチ)・ボタン・ショートカット
 * - ヘッダーのアバターを押すとフォローモード。その人の見ている範囲(カーソルを追って遅れて動くビューポート)へ自分の視点が滑らかに追従し、
 *   キャンバスがその人の色の枠で囲まれる。自分でパン/ズームするか Esc で解除。ミニマップには全員のビューポートを色付きの枠で描く
 * - 自分は付箋・図形(四角/楕円/ひし形)・テキスト・コメントピンを作れる。ドラッグ移動・ダブルクリック編集・色変更・複製・削除は
 *   すべて undo/redo 可能(操作ごとに逆操作を持つコマンド方式なので、他人の同時編集を巻き戻さない)
 * - 接続状態のピルを押すとオフラインを模擬。他人のカーソルは止まって薄くなり、自分の変更は未同期として数え、再接続で同期のトーストを出す
 * - 参加・退出・返信はトーストで通知。キーボード操作はデモ内にフォーカスがあるときだけ有効。useReducedMotion 時はカーソルを短く直線的に動かし、
 *   フォローも滑らせずに即座に合わせ、出現はフェードだけにする
 */

/* ───────────── 型・データ ───────────── */

type PersonId = 'me' | 'mina' | 'haruto' | 'sora' | 'yui'
type BotId = Exclude<PersonId, 'me'>
type SectionId = 'ideas' | 'issues' | 'actions'
type Swatch = 'yellow' | 'pink' | 'green' | 'blue' | 'purple' | 'orange'
type Kind = 'sticky' | 'rect' | 'ellipse' | 'diamond' | 'text'
type Tool = 'select' | 'hand' | 'sticky' | 'shape' | 'text' | 'comment'
type ShapeKind = 'rect' | 'ellipse' | 'diamond'
type Pt = { x: number; y: number }

interface Person {
  id: PersonId
  name: string
  full: string
  role: string
  color: string
  soft: string
  hair: 0 | 1 | 2 | 3
  skin: string
  shirt: string
  hairColor: string
  swatch: Swatch
  home: SectionId | null
}

const PEOPLE: Record<PersonId, Person> = {
  me: { id: 'me', name: 'ケイ', full: '市原 ケイ', role: 'あなた', color: '#7357ff', soft: '#ebe6ff', hair: 3, skin: '#f2d4bc', shirt: '#3d3767', hairColor: '#2b2420', swatch: 'purple', home: null },
  mina: { id: 'mina', name: 'ミナ', full: '新井 ミナ', role: '商品企画', color: '#ec4f63', soft: '#ffe3e7', hair: 1, skin: '#f6dcc8', shirt: '#b8324a', hairColor: '#4a2a22', swatch: 'pink', home: 'ideas' },
  haruto: { id: 'haruto', name: 'ハルト', full: '森 ハルト', role: '店舗運営', color: '#0c9e8f', soft: '#d7f4ef', hair: 0, skin: '#e9c4a6', shirt: '#0a6c62', hairColor: '#1f1b19', swatch: 'green', home: 'issues' },
  sora: { id: 'sora', name: 'ソラ', full: '高瀬 ソラ', role: 'デザイン', color: '#e8890c', soft: '#ffefd6', hair: 2, skin: '#f4d6bf', shirt: '#9c5a06', hairColor: '#6b3d1e', swatch: 'yellow', home: 'actions' },
  yui: { id: 'yui', name: 'ユイ', full: '平野 ユイ', role: 'マーケ', color: '#2f74e8', soft: '#dde9ff', hair: 1, skin: '#f1d0b5', shirt: '#1f4fa8', hairColor: '#2a211d', swatch: 'blue', home: null },
}
const BOTS: BotId[] = ['mina', 'haruto', 'sora', 'yui']

const SWATCH: Record<Swatch, { bg: string; stroke: string; dot: string; label: string }> = {
  yellow: { bg: '#fff0a3', stroke: '#e3c449', dot: '#f6d64a', label: 'イエロー' },
  pink: { bg: '#ffd7df', stroke: '#ee98aa', dot: '#f6a0b3', label: 'ピンク' },
  green: { bg: '#cff0d4', stroke: '#76c789', dot: '#8ed69e', label: 'グリーン' },
  blue: { bg: '#d4e5ff', stroke: '#7ea8ec', dot: '#8db6f4', label: 'ブルー' },
  purple: { bg: '#e6dcff', stroke: '#a78fee', dot: '#b8a4f5', label: 'パープル' },
  orange: { bg: '#ffdcc3', stroke: '#eea26a', dot: '#f6b07d', label: 'オレンジ' },
}
const SWATCH_IDS = Object.keys(SWATCH) as Swatch[]

interface Section {
  id: SectionId
  title: string
  x: number
  y: number
  w: number
  h: number
  tag: string
  ink: string
}
const SECTIONS: Section[] = [
  { id: 'ideas', title: 'アイデア', x: 0, y: 0, w: 800, h: 640, tag: '#ffe1e6', ink: '#b42840' },
  { id: 'issues', title: '課題・気づき', x: 860, y: 0, w: 600, h: 640, tag: '#dff0ff', ink: '#1f5fb0' },
  { id: 'actions', title: '次のアクション', x: 1520, y: 0, w: 580, h: 640, tag: '#ddf5e4', ink: '#1d7a43' },
]

interface Obj {
  id: string
  kind: Kind
  x: number
  y: number
  w: number
  h: number
  rot: number
  color: Swatch
  text: string
  author: PersonId
  size?: number
  muted?: boolean
  born?: number
}
interface Msg {
  id: string
  author: PersonId
  text: string
  at: number
}
interface Pin {
  id: string
  x: number
  y: number
  author: PersonId
  resolved: boolean
  msgs: Msg[]
}
interface Doc {
  objects: Obj[]
  pins: Pin[]
}

const STICKY = 164
const st = (id: string, x: number, y: number, color: Swatch, author: PersonId, text: string, rot: number): Obj => ({
  id,
  kind: 'sticky',
  x,
  y,
  w: STICKY,
  h: STICKY,
  rot,
  color,
  author,
  text,
})

const T0 = Date.now()
const INITIAL_DOC: Doc = {
  objects: [
    { id: 't1', kind: 'text', x: 0, y: -150, w: 900, h: 52, rot: 0, color: 'yellow', author: 'mina', text: '春の新メニュー企画ブレスト', size: 42 },
    { id: 't2', kind: 'text', x: 2, y: -86, w: 720, h: 26, rot: 0, color: 'yellow', author: 'mina', text: 'コモレビ珈琲 商品企画チーム · 2027年1月14日(木)', size: 17, muted: true },
    st('s1', 40, 74, 'yellow', 'mina', '桜とほうじ茶の\nラテ', -1.2),
    st('s2', 222, 84, 'green', 'haruto', '柚子ソーダを\nノンカフェインで', 1),
    st('s3', 404, 68, 'pink', 'mina', '季節のスコーン2種\n（桜・抹茶）', -0.6),
    st('s4', 590, 92, 'blue', 'sora', '朝だけの\nモーニングセット', 1.4),
    st('s5', 56, 262, 'yellow', 'yui', 'テイクアウト用の\nミニサイズ', 0.8),
    st('s6', 240, 272, 'purple', 'mina', '店内限定の\n春いちごパフェ', -1.5),
    st('s7', 424, 252, 'orange', 'haruto', '地元の苺農家と\nコラボする', 0.5),
    st('s8', 900, 74, 'pink', 'sora', '朝8時台の\nレジ待ちが長い', -1),
    st('s9', 1080, 88, 'yellow', 'haruto', '新メニューの\n写真が目立たない', 1.2),
    st('s10', 1262, 72, 'blue', 'me', '原価率は\n32%以内に抑える', -0.4),
    { id: 'd1', kind: 'diamond', x: 916, y: 300, w: 210, h: 160, rot: 0, color: 'purple', author: 'haruto', text: '春までに\n間に合う？' },
    st('s11', 1190, 290, 'green', 'mina', 'SNSで先行告知\nしてみる？', 0.7),
    { id: 'r1', kind: 'rect', x: 1562, y: 82, w: 220, h: 84, rot: 0, color: 'green', author: 'sora', text: '3/1 試作会' },
    { id: 'r2', kind: 'rect', x: 1562, y: 196, w: 220, h: 84, rot: 0, color: 'blue', author: 'sora', text: '3/15 写真撮影' },
    st('s12', 1830, 82, 'yellow', 'mina', 'POPの文言を\nミナが作成', 1),
    st('s13', 1836, 276, 'orange', 'haruto', '原価表を更新\n（ハルト）', -1.2),
    { id: 'e1', kind: 'ellipse', x: 1580, y: 330, w: 190, h: 112, rot: 0, color: 'pink', author: 'sora', text: '4/1 発売！' },
  ],
  pins: [
    {
      id: 'p1',
      x: 1214,
      y: 104,
      author: 'haruto',
      resolved: false,
      msgs: [
        { id: 'm1', author: 'haruto', text: '写真、自然光で撮り直すのはどう？店内が暗く見えるのが気になってて', at: T0 - 1000 * 60 * 26 },
        { id: 'm2', author: 'sora', text: '3/15 の撮影でまとめてやりましょう！カットも増やします', at: T0 - 1000 * 60 * 9 },
      ],
    },
  ],
}

const BOT_STICKIES: Record<BotId, string[]> = {
  mina: ['桜あんバタートースト', '春限定の\nカップスリーブ', 'いちごミルク\n（ホット）', '抹茶のテリーヌ', '桜の香りの\nコールドブリュー'],
  haruto: ['ピーク時は\n2レジ体制に', '仕込み時間を\n15分短縮したい', '在庫の回転を\n週次で見る', 'モバイル注文の\n受け取り棚'],
  sora: ['2/20 POP入稿', 'メニュー表の\n刷新', '3/20 店長会で共有', 'SNS用の\nショート動画'],
  yui: ['インフルエンサー\n試飲会', 'LINE で\nクーポン配布', '春のスタンプ\nカード', '駅広告は\n費用対効果を確認'],
}
const BOT_APPENDS = ['\n→ 試作する', '\n（要確認）', '\n★★', '\n（予算OK）', '\n← 賛成', '\n→ 来週決定']
const BOT_CHATS: Record<BotId, string[]> = {
  mina: ['このあたり、まとめてもいい？', '桜ラテは去年も好評でした', 'パフェ、写真映えしそう！'],
  haruto: ['朝の混雑データ、あとで貼ります', '原価的にはギリギリかも', 'ここ、優先度高めで'],
  sora: ['日程はこっちに寄せます', 'POP は 2 案作ります', '撮影の香盤も作りますね'],
  yui: ['告知は 3 月頭がいいかも', 'SNS の反応、期待できそう', 'クーポンの案も足しますね'],
}
const BOT_REPLIES = ['いいですね、賛成です！', '確認しました。次の定例で詰めましょう', '数字を調べて追記しておきます', 'それ、試作会で試してみたいです', '了解です。担当つけておきますね']

/* ───────────── 小さなユーティリティ ───────────── */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
let uidN = 0
const uid = (p: string) => `${p}${Date.now().toString(36)}${(uidN++).toString(36)}`
const MIN_Z = 0.2
const MAX_Z = 3
const BOT_SCREEN = { w: 1280, h: 760 }

const objH = (o: Obj) => (o.kind === 'text' ? (o.size ?? 24) * 1.3 * Math.max(1, o.text.split('\n').length) : o.h)
const sectionOf = (o: Pick<Obj, 'x' | 'y' | 'w' | 'h'>) => {
  const cx = o.x + o.w / 2
  const cy = o.y + o.h / 2
  return SECTIONS.find((s) => cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h) ?? null
}
const patchObj = (d: Doc, id: string, p: Partial<Obj>): Doc => ({
  ...d,
  objects: d.objects.map((o) => (o.id === id ? { ...o, ...p } : o)),
})
const relTime = (at: number) => {
  const m = Math.floor((Date.now() - at) / 60000)
  if (m < 1) return 'たった今'
  if (m < 60) return `${m}分前`
  return `${Math.floor(m / 60)}時間前`
}

/** 人が動かすカーソルらしいイージング: 立ち上がりは素早く、終わりはゆっくり吸い付く */
const easeHuman = (t: number) => {
  const smooth = t * t * (3 - 2 * t)
  const out = 1 - Math.pow(1 - t, 3)
  return smooth * 0.35 + out * 0.65
}
const bez = (p0: number, c1: number, c2: number, p1: number, t: number) => {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * p1
}

interface Op {
  undo: (d: Doc) => Doc
  redo: (d: Doc) => Doc
}
const opAdd = (o: Obj): Op => ({
  redo: (d) => ({ ...d, objects: [...d.objects.filter((x) => x.id !== o.id), o] }),
  undo: (d) => ({ ...d, objects: d.objects.filter((x) => x.id !== o.id) }),
})
const opDelete = (o: Obj, idx: number): Op => ({
  redo: (d) => ({ ...d, objects: d.objects.filter((x) => x.id !== o.id) }),
  undo: (d) => {
    if (d.objects.some((x) => x.id === o.id)) return d
    const objects = d.objects.slice()
    objects.splice(Math.min(idx, objects.length), 0, o)
    return { ...d, objects }
  },
})
const opPatch = (id: string, from: Partial<Obj>, to: Partial<Obj>): Op => ({
  redo: (d) => patchObj(d, id, to),
  undo: (d) => patchObj(d, id, from),
})

/* ───────────── シミュレーション用の実行時データ(ref) ───────────── */

type Step =
  | { k: 'move'; to: Pt; slow?: boolean }
  | { k: 'goObj'; id: string; fx: number; fy: number }
  | { k: 'drag'; id: string; to: Pt }
  | { k: 'wait'; ms: number }
  | { k: 'do'; fn: (b: BotRT, now: number) => boolean | void }
  | { k: 'chat'; text: string }
  | { k: 'type'; id: string; text: string }

interface Seg {
  p0: Pt
  c1: Pt
  c2: Pt
  p1: Pt
  t0: number
  dur: number
  drag?: { id: string; ox: number; oy: number }
}
interface BotRT {
  id: BotId
  pos: Pt
  shown: Pt
  phase: number
  drift: number
  seg: Seg | null
  queue: Step[]
  kind: 'idle' | 'busy' | 'priority'
  waitUntil: number
  typing: { id: string; base: string; text: string; i: number; next: number } | null
  chat: { text: string; i: number; next: number; hideAt: number } | null
  vp: { cx: number; cy: number; z: number }
  pending: Step[][]
}

type Lock = { by: BotId; mode: 'select' | 'drag' | 'type' }
type Conn = 'online' | 'offline' | 'syncing'
interface Toast {
  id: string
  text: string
  person?: PersonId
  icon: 'join' | 'leave' | 'info' | 'sync' | 'warn' | 'comment' | 'link'
}

/* ───────────── 見た目の部品 ───────────── */

const HAIR: Record<Person['hair'], string> = {
  0: 'M9.4 13.6c-.3-5 2.8-7.8 6.7-7.8 4 0 6.7 2.7 6.5 7.6-1.3-2.3-3.6-3.6-6.6-3.8-2.7.2-5 1.5-6.6 4z',
  1: 'M8.8 16c-.8-6.2 2.4-10.1 7.2-10.1s8 3.9 7.2 10.1l-.4 5.2c-.9-.5-1.5-1.4-1.7-2.7L21 12.4c-2.2 0-5.1-1.1-6.8-3-.9 1.9-2.6 3.1-3.8 3.5l-.2 5.6c-.2 1.3-.8 2.2-1.7 2.7z',
  2: 'M9.5 13.8c-.2-4.9 2.8-7.6 6.5-7.6 3.9 0 6.7 2.6 6.5 7.5-1.4-2.2-3.7-3.5-6.6-3.6-2.8.1-5 1.4-6.4 3.7zM16 1.8a3.1 3.1 0 1 0 .01 0z',
  3: 'M9.4 14.4c-.5-5.2 2.6-8.4 6.8-8.4 3.8 0 6.9 2.5 6.4 7.4-2.8-.4-6.2-1.9-8.3-4.2-1 2.1-2.9 4-4.9 5.2z',
}

function Avatar({ p, size = 28, className = '' }: { p: Person; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`shrink-0 rounded-full ${className}`} aria-hidden>
      <circle cx="16" cy="16" r="16" fill={p.soft} />
      <path d="M4.5 33c1.4-7 6.3-10.2 11.5-10.2S26.1 26 27.5 33z" fill={p.shirt} />
      <rect x="13.8" y="18" width="4.4" height="5" rx="2" fill={p.skin} />
      <circle cx="16" cy="14.2" r="6.3" fill={p.skin} />
      <path d={HAIR[p.hair]} fill={p.hairColor} />
      <circle cx="13.7" cy="15" r=".75" fill="#2b2420" />
      <circle cx="18.3" cy="15" r=".75" fill="#2b2420" />
      <path d="M14.6 17.6q1.4 1 2.8 0" stroke="#c0705a" strokeWidth=".8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 28 28" className="h-7 w-7 shrink-0" aria-hidden>
      <rect x="2" y="2" width="24" height="24" rx="8" fill="#17151f" />
      <path d="M8 10.5c3-2.4 6-2.4 9 0s4 2.4 3 .2" stroke="#ffd85c" strokeWidth="2.3" fill="none" strokeLinecap="round" />
      <path d="M8 15c3-2.4 6-2.4 9 0s4 2.4 3 .2" stroke="#ff8aa0" strokeWidth="2.3" fill="none" strokeLinecap="round" />
      <path d="M8 19.5c3-2.4 6-2.4 9 0s4 2.4 3 .2" stroke="#8ec5ff" strokeWidth="2.3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Tip({ label, kbd, side = 'top' }: { label: string; kbd?: string; side?: 'top' | 'bottom' | 'zoom' }) {
  return (
    <span
      role="presentation"
      className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity delay-300 duration-150 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100 ${
        side === 'top'
          ? 'bottom-[calc(100%+8px)]'
          : side === 'bottom'
            ? 'top-[calc(100%+8px)]'
            : 'top-[calc(100%+8px)] @4xl:top-auto @4xl:bottom-[calc(100%+8px)]'
      }`}
    >
      {label}
      {kbd && <span className="ml-1.5 rounded bg-white/15 px-1 font-mono text-[10px] text-white/80">{kbd}</span>}
    </span>
  )
}

/* ───────────── ボード上のオブジェクト ───────────── */

interface ObjActions {
  register: (id: string, el: HTMLDivElement | null) => void
  commitText: (id: string, text: string) => void
  setColor: (id: string, c: Swatch) => void
  duplicate: (id: string) => void
  remove: (id: string) => void
}

const ObjectView = memo(function ObjectView({
  o,
  selected,
  lock,
  editing,
  fresh,
  dragging,
  reduce,
  actions,
}: {
  o: Obj
  selected: boolean
  lock: Lock | undefined
  editing: boolean
  fresh: boolean
  dragging: boolean
  reduce: boolean
  actions: ObjActions
}) {
  const sw = SWATCH[o.color]
  const lockP = lock ? PEOPLE[lock.by] : null
  const typingCaret = lock?.mode === 'type'
  const fontSize = o.kind === 'text' ? (o.size ?? 24) : o.kind === 'sticky' ? (o.text.length > 24 ? 14 : 15.5) : 18
  const textCls =
    o.kind === 'text'
      ? `font-bold tracking-tight ${o.muted ? 'font-medium text-zinc-500' : 'text-zinc-900'}`
      : 'font-medium text-zinc-800'

  let body: ReactNode
  const textNode = (
    <span className="whitespace-pre-wrap break-words">
      {o.text || (o.kind === 'sticky' && !editing ? <span className="text-zinc-800/30">メモを入力</span> : null)}
      {typingCaret && lockP && (
        <span className="ml-px inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-pulse rounded-full" style={{ background: lockP.color }} />
      )}
    </span>
  )
  if (o.kind === 'sticky') {
    body = (
      <div
        className="relative flex h-full w-full flex-col rounded-[3px] p-[14px] leading-snug shadow-[0_1px_2px_rgba(30,25,10,0.1),0_8px_16px_-8px_rgba(30,25,10,0.28)] transition-[box-shadow] duration-200 group-data-[lifted=true]/obj:shadow-[0_2px_4px_rgba(30,25,10,0.1),0_22px_34px_-12px_rgba(30,25,10,0.38)]"
        style={{ background: sw.bg, fontSize }}
      >
        <div className={`min-h-0 flex-1 overflow-hidden ${textCls}`}>{!editing && textNode}</div>
        <div className="mt-1 text-[11px] font-medium text-zinc-800/45">{PEOPLE[o.author].name}</div>
      </div>
    )
  } else if (o.kind === 'text') {
    body = (
      <div className={`leading-[1.3] ${textCls}`} style={{ fontSize }}>
        {!editing && (o.text ? textNode : <span className="text-zinc-400">テキスト</span>)}
      </div>
    )
  } else {
    const shapeBg =
      o.kind === 'diamond' ? (
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${o.w} ${o.h}`} aria-hidden>
          <polygon
            points={`${o.w / 2},2 ${o.w - 2},${o.h / 2} ${o.w / 2},${o.h - 2} 2,${o.h / 2}`}
            fill={sw.bg}
            stroke={sw.stroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <div
          className={`absolute inset-0 border-[2.5px] ${o.kind === 'ellipse' ? 'rounded-[50%]' : 'rounded-2xl'}`}
          style={{ background: sw.bg, borderColor: sw.stroke }}
        />
      )
    body = (
      <div className="relative grid h-full w-full place-items-center transition-[filter] duration-200 group-data-[lifted=true]/obj:drop-shadow-[0_14px_14px_rgba(30,25,10,0.18)]">
        {shapeBg}
        <div className={`relative px-5 text-center leading-snug ${textCls}`} style={{ fontSize }}>
          {!editing && textNode}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={(el) => actions.register(o.id, el)}
      data-obj-id={o.id}
      data-lifted="false"
      className="group/obj absolute left-0 top-0"
      style={{ transform: `translate(${o.x}px, ${o.y}px)`, width: o.w, height: o.kind === 'text' ? undefined : o.h }}
    >
      <motion.div
        initial={fresh ? (reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }) : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 520, damping: 24 }}
        style={{ rotate: o.rot }}
        className="relative h-full w-full transition-[scale] duration-200 group-data-[lifted=true]/obj:scale-[1.035]"
      >
        {body}
        {editing && <EditBox o={o} fontSize={fontSize} onCommit={actions.commitText} />}
      </motion.div>

      {lockP && (
        <>
          <div
            className="pointer-events-none absolute rounded-md"
            style={{ inset: 'calc(-6px / var(--z, 1))', border: `calc(2px / var(--z, 1)) solid ${lockP.color}` }}
          />
          <div
            className="pointer-events-none absolute bottom-full left-0 origin-bottom-left"
            style={{ transform: 'translate(calc(-6px / var(--z, 1)), calc(-6px / var(--z, 1))) scale(calc(1 / var(--z, 1)))' }}
          >
            <div className="mb-1 flex items-center gap-1 whitespace-nowrap rounded-md py-[3px] pl-1 pr-2 text-[11px] font-semibold text-white shadow-sm" style={{ background: lockP.color }}>
              <Avatar p={lockP} size={16} className="ring-1 ring-white/60" />
              {lockP.name}が{lock?.mode === 'drag' ? '移動中' : '編集中'}
            </div>
          </div>
        </>
      )}

      {selected && (
        <>
          <div
            className="pointer-events-none absolute rounded-md"
            style={{ inset: 'calc(-5px / var(--z, 1))', border: `calc(2px / var(--z, 1)) solid ${PEOPLE.me.color}` }}
          >
            {(['-left-1 -top-1', '-right-1 -top-1', '-left-1 -bottom-1', '-right-1 -bottom-1'] as const).map((c) => (
              <span
                key={c}
                className={`absolute h-2 w-2 rounded-[2px] border-[1.5px] bg-white ${c}`}
                style={{ borderColor: PEOPLE.me.color, scale: 'calc(1 / var(--z, 1))' }}
              />
            ))}
          </div>
          {!editing && !dragging && <ContextBar o={o} actions={actions} reduce={reduce} />}
        </>
      )}
    </div>
  )
})

function EditBox({ o, fontSize, onCommit }: { o: Obj; fontSize: number; onCommit: (id: string, text: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [val, setVal] = useState(o.text)
  const done = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])
  const finish = () => {
    if (done.current) return
    done.current = true
    onCommit(o.id, val.replace(/\s+$/, ''))
  }
  const lines = Math.max(1, val.split('\n').length)
  const base =
    o.kind === 'sticky'
      ? 'absolute inset-0 p-[14px] pb-8 leading-snug font-medium text-zinc-800'
      : o.kind === 'text'
        ? 'absolute left-0 top-0 w-full font-bold leading-[1.3] tracking-tight text-zinc-900'
        : 'absolute inset-x-0 top-1/2 -translate-y-1/2 px-5 text-center leading-snug font-medium text-zinc-800'
  return (
    <textarea
      ref={ref}
      data-ui
      value={val}
      rows={lines}
      aria-label="テキストを編集"
      spellCheck={false}
      onChange={(e) => setVal(e.target.value)}
      onBlur={finish}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault()
          finish()
        }
      }}
      placeholder={o.kind === 'text' ? 'テキスト' : 'メモを入力'}
      className={`${base} resize-none overflow-hidden bg-transparent outline-none placeholder:text-zinc-800/30`}
      style={{ fontSize, caretColor: PEOPLE.me.color }}
    />
  )
}

function ContextBar({ o, actions, reduce }: { o: Obj; actions: ObjActions; reduce: boolean }) {
  return (
    <div
      data-ui
      className="absolute bottom-full left-1/2 z-30 origin-bottom"
      style={{ transform: 'translate(-50%, calc(-14px / var(--z, 1))) scale(calc(1 / var(--z, 1)))' }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16 }}
        className="flex items-center gap-0.5 rounded-xl bg-zinc-900 p-1 text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)]"
      >
        {o.kind !== 'text' &&
          SWATCH_IDS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`色: ${SWATCH[c].label}`}
              aria-pressed={o.color === c}
              onClick={() => actions.setColor(o.id, c)}
              className="grid h-7 w-7 place-items-center rounded-lg outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span
                className={`h-4 w-4 rounded-full ring-2 transition ${o.color === c ? 'ring-white' : 'ring-transparent'}`}
                style={{ background: SWATCH[c].dot }}
              />
            </button>
          ))}
        {o.kind !== 'text' && <span className="mx-0.5 h-5 w-px bg-white/15" />}
        <button
          type="button"
          aria-label="複製"
          onClick={() => actions.duplicate(o.id)}
          className="grid h-7 w-7 place-items-center rounded-lg outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Copy className="h-[15px] w-[15px]" />
        </button>
        <button
          type="button"
          aria-label="削除"
          onClick={() => actions.remove(o.id)}
          className="grid h-7 w-7 place-items-center rounded-lg outline-none hover:bg-rose-500/30 focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Trash className="h-[15px] w-[15px]" />
        </button>
      </motion.div>
    </div>
  )
}

/* ───────────── コメントピン ───────────── */

function PinView({
  pin,
  open,
  unread,
  typingBy,
  reduce,
  onToggle,
  onReply,
  onResolve,
}: {
  pin: Pin
  open: boolean
  unread: boolean
  typingBy: BotId | null
  reduce: boolean
  onToggle: (id: string | null) => void
  onReply: (id: string, text: string) => void
  onResolve: (id: string) => void
}) {
  const p = PEOPLE[pin.author]
  return (
    <div
      data-ui
      className="absolute"
      style={{ left: pin.x, top: pin.y, transform: 'scale(calc(1 / var(--z, 1)))', transformOrigin: '0 0', zIndex: open ? 40 : 20 }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={`${p.name}のコメント（${pin.msgs.length}件）${pin.resolved ? '・解決済み' : ''}`}
        aria-expanded={open}
        onClick={() => onToggle(open ? null : pin.id)}
        className={`absolute bottom-0 left-0 grid h-9 w-9 place-items-center rounded-full rounded-bl-[4px] bg-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)] outline-none ring-[2.5px] transition hover:scale-105 focus-visible:ring-4 ${
          pin.resolved ? 'opacity-55' : ''
        }`}
        style={{ ['--tw-ring-color' as string]: open ? PEOPLE.me.color : '#ffffff' } as CSSProperties}
      >
        {pin.resolved ? (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="h-4 w-4" />
          </span>
        ) : (
          <Avatar p={p} size={28} />
        )}
        {pin.msgs.length > 1 && !pin.resolved && (
          <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-zinc-900 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {pin.msgs.length}
          </span>
        )}
        {unread && <span className="absolute -left-0.5 -top-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white" />}
      </button>
      <AnimatePresence>
        {open && (
          <Thread key="t" pin={pin} typingBy={typingBy} reduce={reduce} onClose={() => onToggle(null)} onReply={onReply} onResolve={onResolve} />
        )}
      </AnimatePresence>
    </div>
  )
}

function Composer({ placeholder, onSend, onEscape, autoFocus }: { placeholder: string; onSend: (t: string) => void; onEscape: () => void; autoFocus?: boolean }) {
  const [v, setV] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true })
  }, [autoFocus])
  const send = () => {
    const t = v.trim()
    if (!t) return
    onSend(t)
    setV('')
  }
  return (
    <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 pl-3 focus-within:border-[#7357ff] focus-within:bg-white">
      <textarea
        ref={ref}
        value={v}
        rows={1}
        aria-label={placeholder}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') {
            e.preventDefault()
            onEscape()
          } else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            send()
          }
        }}
        className="max-h-24 min-h-[28px] flex-1 resize-none bg-transparent py-1 text-[13px] leading-snug text-zinc-800 outline-none placeholder:text-zinc-400"
      />
      <button
        type="button"
        aria-label="送信"
        disabled={!v.trim()}
        onClick={send}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#7357ff] text-white outline-none transition hover:bg-[#5f43f0] focus-visible:ring-2 focus-visible:ring-[#7357ff]/40 disabled:bg-zinc-200 disabled:text-zinc-400"
      >
        <SendHorizontal className="h-4 w-4" />
      </button>
    </div>
  )
}

/** 開いた瞬間に自分の位置を測り、キャンバスからはみ出す分だけずらす(狭いカードでも吹き出しが切れないように) */
function KeepInside({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [off, setOff] = useState({ x: 0, y: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    const host = el?.closest('[role="application"]')
    if (!el || !host) return
    // 中身が増えた(返信が届いた)ときも測り直す。いまのずらし量を差し引いた元の位置から計算する
    const measure = () => {
      const cur = el.style.translate.split(' ').map((v) => parseFloat(v) || 0)
      const r = el.getBoundingClientRect()
      const h = host.getBoundingClientRect()
      const left = r.left - (cur[0] ?? 0)
      const right = r.right - (cur[0] ?? 0)
      const top = r.top - (cur[1] ?? 0)
      const bottom = r.bottom - (cur[1] ?? 0)
      const topPad = h.width < 896 ? 56 : 8
      let x = 0
      let y = 0
      if (right > h.right - 8) x = h.right - 8 - right
      if (left + x < h.left + 8) x = h.left + 8 - left
      if (bottom > h.bottom - 68) y = h.bottom - 68 - bottom
      if (top + y < h.top + topPad) y = h.top + topPad - top
      setOff((o) => (o.x === x && o.y === y ? o : { x, y }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{ translate: `${off.x}px ${off.y}px` }}>
      {children}
    </div>
  )
}

function Thread({
  pin,
  typingBy,
  reduce,
  onClose,
  onReply,
  onResolve,
}: {
  pin: Pin
  typingBy: BotId | null
  reduce: boolean
  onClose: () => void
  onReply: (id: string, text: string) => void
  onResolve: (id: string) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [pin.msgs.length, typingBy])
  return (
    <KeepInside className="absolute bottom-[-28px] left-12 z-10 w-[288px]">
    <motion.div
      role="dialog"
      aria-label="コメントスレッド"
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: -6, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -6, scale: 0.97 }}
      transition={{ duration: 0.16 }}
      className="origin-bottom-left rounded-2xl border border-zinc-200/80 bg-white text-left shadow-[0_18px_44px_-14px_rgba(20,16,40,0.4)]"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-3.5 py-2.5">
        <div className="text-[13px] font-semibold text-zinc-800">
          コメント<span className="ml-1.5 text-[11px] font-medium text-zinc-400">{pin.msgs.length}件</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onResolve(pin.id)}
            aria-label={pin.resolved ? '未解決に戻す' : '解決済みにする'}
            className={`group/tip relative grid h-7 w-7 place-items-center rounded-lg outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-[#7357ff]/50 ${pin.resolved ? 'text-emerald-600' : 'text-zinc-500'}`}
          >
            <Check className="h-4 w-4" />
            <Tip label={pin.resolved ? '未解決に戻す' : '解決'} side="top" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-[#7357ff]/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={listRef} className="max-h-[210px] space-y-3 overflow-y-auto overscroll-contain px-3.5 py-3">
        {pin.msgs.map((m) => (
          <motion.div key={m.id} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
            <Avatar p={PEOPLE[m.author]} size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[12.5px] font-semibold text-zinc-800">{m.author === 'me' ? `${PEOPLE.me.name}（あなた）` : PEOPLE[m.author].name}</span>
                <span className="text-[10.5px] text-zinc-400">{relTime(m.at)}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-zinc-700">{m.text}</p>
            </div>
          </motion.div>
        ))}
        {typingBy && (
          <div className="flex items-center gap-2 text-[11.5px] text-zinc-400">
            <Avatar p={PEOPLE[typingBy]} size={20} />
            {PEOPLE[typingBy].name}が入力中
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1 w-1 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </span>
          </div>
        )}
      </div>
      <div className="px-3 pb-3">
        <Composer placeholder="返信…" autoFocus onSend={(t) => onReply(pin.id, t)} onEscape={onClose} />
      </div>
    </motion.div>
    </KeepInside>
  )
}

/* ───────────── 本体 ───────────── */

export function MultiplayerCanvas() {
  const reduce = !!useReducedMotion()
  const reduceRef = useRef(reduce)
  useEffect(() => {
    reduceRef.current = reduce
  }, [reduce])

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const vpRef = useRef({ x: 0, y: 0, z: 1 })
  const tweenRef = useRef<{ from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number }; t0: number; dur: number } | null>(null)
  const zoomPctRef = useRef(100)
  const [zoomPct, setZoomPct] = useState(100)
  const [canvasW, setCanvasW] = useState(0)

  const [doc, setDoc] = useState<Doc>(INITIAL_DOC)
  const docRef = useRef(doc)
  useLayoutEffect(() => {
    docRef.current = doc
  }, [doc])
  const mountedAt = useRef(Date.now())

  const [tool, setTool] = useState<Tool>('select')
  const toolRef = useRef(tool)
  useEffect(() => {
    toolRef.current = tool
  }, [tool])
  const [stickyColor, setStickyColor] = useState<Swatch>('yellow')
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect')
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const selRef = useRef<string | null>(null)
  const editRef = useRef<string | null>(null)
  useEffect(() => {
    selRef.current = selected
    editRef.current = editing
  }, [selected, editing])

  const [locks, setLocks] = useState<Record<string, Lock>>({})
  const locksRef = useRef<Record<string, Lock>>({})
  const [present, setPresent] = useState<BotId[]>(['mina', 'haruto', 'sora'])
  const presentRef = useRef(present)
  useEffect(() => {
    presentRef.current = present
  }, [present])
  const [following, setFollowing] = useState<BotId | null>(null)
  const followRef = useRef<BotId | null>(null)
  const [conn, setConn] = useState<Conn>('online')
  const connRef = useRef<Conn>('online')
  const [latency, setLatency] = useState(28)
  const [pendingOps, setPendingOps] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [openPin, setOpenPin] = useState<string | null>(null)
  const openPinRef = useRef<string | null>(null)
  useEffect(() => {
    openPinRef.current = openPin
  }, [openPin])
  const [draft, setDraft] = useState<Pt | null>(null)
  const [pinTyping, setPinTyping] = useState<{ pin: string; by: BotId } | null>(null)
  const [unread, setUnread] = useState<string[]>([])
  const [spaceHeld, setSpaceHeld] = useState(false)
  const spaceRef = useRef(false)
  const [panning, setPanning] = useState(false)
  const [miniPref, setMiniPref] = useState<boolean | null>(null)
  const miniOpen = miniPref ?? canvasW >= 640

  const objEls = useRef(new Map<string, HTMLDivElement>())
  const cursorEls = useRef<Partial<Record<BotId, HTMLDivElement | null>>>({})
  const bubbleEls = useRef<Partial<Record<BotId, HTMLSpanElement | null>>>({})
  const ringEls = useRef<Partial<Record<BotId, HTMLSpanElement | null>>>({})
  const miniVpEls = useRef<Partial<Record<PersonId, SVGRectElement | null>>>({})
  const meRef = useRef<{ x: number; y: number; t: number }>({ x: 400, y: 300, t: 0 })

  /* ---------- 履歴(undo/redo) ---------- */
  const past = useRef<Op[]>([])
  const future = useRef<Op[]>([])
  const [hist, setHist] = useState({ u: 0, r: 0 })
  const syncHist = () => setHist({ u: past.current.length, r: future.current.length })
  const markLocal = useCallback(() => {
    if (connRef.current !== 'online') setPendingOps((n) => n + 1)
  }, [])
  const commit = useCallback(
    (op: Op) => {
      setDoc(op.redo)
      past.current.push(op)
      if (past.current.length > 120) past.current.shift()
      future.current = []
      syncHist()
      markLocal()
    },
    [markLocal],
  )
  const undo = useCallback(() => {
    const op = past.current.pop()
    if (!op) return
    setDoc(op.undo)
    future.current.push(op)
    syncHist()
    markLocal()
  }, [markLocal])
  const redo = useCallback(() => {
    const op = future.current.pop()
    if (!op) return
    setDoc(op.redo)
    past.current.push(op)
    syncHist()
    markLocal()
  }, [markLocal])

  /* ---------- トースト ---------- */
  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = uid('t')
    setToasts((ts) => [...ts.slice(-2), { ...t, id }])
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3400)
  }, [])

  /* ---------- ロック(他人の選択) ---------- */
  const setLock = useCallback((id: string, l: Lock | null) => {
    const next = { ...locksRef.current }
    if (l) next[id] = l
    else delete next[id]
    locksRef.current = next
    setLocks(next)
  }, [])
  const releaseAll = useCallback((by: BotId) => {
    const next = { ...locksRef.current }
    let changed = false
    for (const k of Object.keys(next)) {
      if (next[k].by === by) {
        delete next[k]
        changed = true
      }
    }
    if (changed) {
      locksRef.current = next
      setLocks(next)
    }
  }, [])

  /* ---------- ビューポート ---------- */
  const applyVp = useCallback(() => {
    const { x, y, z } = vpRef.current
    const w = worldRef.current
    if (w) w.style.transform = `translate(${x}px, ${y}px) scale(${z})`
    const c = canvasRef.current
    if (c) {
      c.style.setProperty('--z', String(z))
      const g = (z < 0.45 ? 48 : 24) * z
      c.style.backgroundSize = `${g}px ${g}px`
      c.style.backgroundPosition = `${x}px ${y}px`
    }
    const pct = Math.round(z * 100)
    if (pct !== zoomPctRef.current) {
      zoomPctRef.current = pct
      setZoomPct(pct)
    }
  }, [])

  const stopFollow = useCallback(() => {
    if (!followRef.current) return
    followRef.current = null
    setFollowing(null)
  }, [])

  const animateVp = useCallback(
    (to: { x: number; y: number; z: number }) => {
      if (reduceRef.current) {
        vpRef.current = to
        tweenRef.current = null
        applyVp()
        return
      }
      tweenRef.current = { from: { ...vpRef.current }, to, t0: performance.now(), dur: 380 }
    },
    [applyVp],
  )

  const zoomAt = useCallback(
    (factor: number, sx?: number, sy?: number, animated = false) => {
      const { w, h } = sizeRef.current
      const ax = sx ?? w / 2
      const ay = sy ?? h / 2
      const v = tweenRef.current?.to ?? vpRef.current
      const z = clamp(v.z * factor, MIN_Z, MAX_Z)
      const wx = (ax - v.x) / v.z
      const wy = (ay - v.y) / v.z
      const next = { x: ax - wx * z, y: ay - wy * z, z }
      if (animated) animateVp(next)
      else {
        tweenRef.current = null
        vpRef.current = next
        applyVp()
      }
    },
    [animateVp, applyVp],
  )

  const fitAll = useCallback(
    (animated = true) => {
      const { w, h } = sizeRef.current
      if (!w || !h) return
      let x0 = Infinity
      let y0 = Infinity
      let x1 = -Infinity
      let y1 = -Infinity
      for (const s of SECTIONS) {
        x0 = Math.min(x0, s.x)
        y0 = Math.min(y0, s.y)
        x1 = Math.max(x1, s.x + s.w)
        y1 = Math.max(y1, s.y + s.h)
      }
      for (const o of docRef.current.objects) {
        x0 = Math.min(x0, o.x)
        y0 = Math.min(y0, o.y)
        x1 = Math.max(x1, o.x + o.w)
        y1 = Math.max(y1, o.y + objH(o))
      }
      const pad = 60
      const z = clamp(Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2 - 40) / (y1 - y0)), MIN_Z, 1.2)
      const next = { x: w / 2 - ((x0 + x1) / 2) * z, y: (h - 40) / 2 - ((y0 + y1) / 2) * z, z }
      if (animated) animateVp(next)
      else {
        vpRef.current = next
        applyVp()
      }
    },
    [animateVp, applyVp],
  )

  // サイズ監視。初回はボードが見やすい倍率に合わせ、以降は中心を保ってリサイズ
  const initRef = useRef(false)
  useLayoutEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const measure = () => {
      const r = c.getBoundingClientRect()
      const prev = sizeRef.current
      sizeRef.current = { w: r.width, h: r.height }
      setCanvasW(r.width)
      if (!initRef.current && r.width > 0) {
        initRef.current = true
        const narrow = r.width < 700
        const z = narrow ? clamp(r.width / 880, 0.36, 1) : clamp(Math.min(r.width / 1640, r.height / 720), 0.36, 1)
        const cx = narrow ? 410 : 690
        const cy = narrow ? 250 : 186
        vpRef.current = { x: r.width / 2 - cx * z, y: r.height / 2 - cy * z, z }
        applyVp()
      } else if (prev.w && (prev.w !== r.width || prev.h !== r.height)) {
        vpRef.current.x += (r.width - prev.w) / 2
        vpRef.current.y += (r.height - prev.h) / 2
        applyVp()
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(c)
    return () => ro.disconnect()
  }, [applyVp])

  /* ---------- シミュレーション ---------- */
  const botsRef = useRef<Record<BotId, BotRT> | null>(null)
  if (!botsRef.current) {
    const mk = (id: BotId, x: number, y: number, z: number): BotRT => ({
      id,
      pos: { x, y },
      shown: { x, y },
      phase: Math.random() * 10,
      drift: 1,
      seg: null,
      queue: [],
      kind: 'idle',
      waitUntil: 0,
      typing: null,
      chat: null,
      vp: { cx: x, cy: y - 40, z },
      pending: [],
    })
    botsRef.current = {
      mina: mk('mina', 320, 470, 1.05),
      haruto: mk('haruto', 1110, 300, 0.92),
      sora: mk('sora', 1720, 380, 1.15),
      yui: mk('yui', 620, 520, 1),
    }
  }

  const requestReply = useCallback((pinId: string, at?: Pt) => {
    const bots = botsRef.current!
    const cands = presentRef.current.filter((b) => bots[b].pending.length === 0)
    if (!cands.length) return
    const id = pick(cands)
    const pin = at ?? docRef.current.pins.find((p) => p.id === pinId)
    if (!pin) return
    const text = pick(BOT_REPLIES)
    bots[id].pending.push([
      { k: 'move', to: { x: pin.x + 44, y: pin.y + 30 } },
      { k: 'wait', ms: 500 },
      { k: 'do', fn: () => setPinTyping({ pin: pinId, by: id }) },
      { k: 'wait', ms: 1700 + text.length * 40 },
      {
        k: 'do',
        fn: () => {
          setPinTyping((pt) => (pt?.pin === pinId ? null : pt))
          setDoc((d) => ({
            ...d,
            pins: d.pins.map((p) => (p.id === pinId ? { ...p, msgs: [...p.msgs, { id: uid('m'), author: id, text, at: Date.now() }] } : p)),
          }))
          if (openPinRef.current !== pinId) {
            setUnread((u) => (u.includes(pinId) ? u : [...u, pinId]))
            pushToast({ text: `${PEOPLE[id].name}がコメントに返信しました`, person: id, icon: 'comment' })
          }
        },
      },
      { k: 'wait', ms: 900 },
    ])
  }, [pushToast])

  useEffect(() => {
    const bots = botsRef.current!
    let raf = 0
    let last = performance.now()
    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    if (rootRef.current) io.observe(rootRef.current)

    const objById = (id: string) => docRef.current.objects.find((o) => o.id === id)
    const isBusy = (id: string, by?: BotId) => {
      const l = locksRef.current[id]
      if (l && l.by !== by) return true
      return selRef.current === id || editRef.current === id
    }
    const ripple = (b: BotRT) => {
      if (reduceRef.current) return
      ringEls.current[b.id]?.animate(
        [
          { transform: 'scale(0.3)', opacity: 0.9 },
          { transform: 'scale(1.8)', opacity: 0 },
        ],
        { duration: 480, easing: 'cubic-bezier(.2,.7,.3,1)' },
      )
    }
    const lift = (id: string, on: boolean) => {
      const el = objEls.current.get(id)
      if (!el) return
      el.dataset.lifted = on ? 'true' : 'false'
      el.style.zIndex = on ? '15' : ''
    }

    const startSeg = (b: BotRT, to: Pt, now: number, drag?: Seg['drag'], slow = false) => {
      const p0 = { ...b.pos }
      const dx = to.x - p0.x
      const dy = to.y - p0.y
      const len = Math.hypot(dx, dy)
      if (len < 0.5) {
        b.pos = { ...to }
        return
      }
      const nx = -dy / len
      const ny = dx / len
      const bend = (Math.random() < 0.5 ? -1 : 1) * rnd(0.1, 0.3) * len
      const a = rnd(0.18, 0.34)
      const c = rnd(0.62, 0.8)
      const bend2 = bend * rnd(0.25, 0.8)
      const reduced = reduceRef.current
      b.seg = {
        p0,
        c1: reduced ? p0 : { x: p0.x + dx * a + nx * bend, y: p0.y + dy * a + ny * bend },
        c2: reduced ? to : { x: p0.x + dx * c + nx * bend2, y: p0.y + dy * c + ny * bend2 },
        p1: { ...to },
        t0: now,
        dur: reduced ? 200 : clamp(360 + len * 0.7, 420, 1500) * (drag ? 1.3 : 1) * (slow ? 1.4 : 1),
        drag,
      }
    }

    /** 自然に目的地へ向かう手順。たまに行き過ぎてから戻る */
    const go = (to: Pt): Step[] => {
      if (Math.random() < 0.3 && !reduceRef.current) {
        const b = { x: to.x + rnd(-14, 14), y: to.y + rnd(-10, 10) }
        return [{ k: 'move', to: b }, { k: 'move', to }]
      }
      return [{ k: 'move', to }]
    }

    const homeObjects = (b: BotRT) => {
      const home = PEOPLE[b.id].home
      const all = docRef.current.objects.filter((o) => o.kind !== 'text' && !isBusy(o.id, b.id))
      const mine = home ? all.filter((o) => sectionOf(o)?.id === home) : all
      return mine.length && Math.random() < 0.75 ? mine : all
    }
    const freeSpot = (sec: Section, w: number, h: number, ignore?: string): Pt | null => {
      const objs = docRef.current.objects
      for (let i = 0; i < 26; i++) {
        const x = rnd(sec.x + 26, sec.x + sec.w - w - 26)
        const y = rnd(sec.y + 64, sec.y + sec.h - h - 26)
        const hit = objs.some(
          (o) => o.id !== ignore && o.kind !== 'text' && x < o.x + o.w + 16 && x + w + 16 > o.x && y < o.y + o.h + 16 && y + h + 16 > o.y,
        )
        if (!hit) return { x, y }
      }
      return null
    }

    const plan = (b: BotRT) => {
      const pend = b.pending.shift()
      if (pend) {
        b.queue = pend
        b.kind = 'priority'
        return
      }
      b.kind = 'busy'
      const r = Math.random()
      const doc = docRef.current
      const cands = homeObjects(b)
      const home = SECTIONS.find((s) => s.id === PEOPLE[b.id].home) ?? pick(SECTIONS)
      const me = meRef.current
      if (r < 0.26 && cands.length) {
        // 付箋を掴んで同じエリア内の空いた場所へ動かす
        const o = pick(cands)
        const sec = sectionOf(o) ?? home
        const spot = freeSpot(sec, o.w, o.h, o.id)
        if (spot) {
          const fx = rnd(0.3, 0.7)
          const fy = rnd(0.2, 0.5)
          b.queue = [
            { k: 'goObj', id: o.id, fx, fy },
            { k: 'do', fn: (bb) => (isBusy(o.id, bb.id) ? false : (setLock(o.id, { by: bb.id, mode: 'select' }), ripple(bb), true)) },
            { k: 'wait', ms: rnd(250, 500) },
            { k: 'drag', id: o.id, to: spot },
            { k: 'wait', ms: rnd(400, 900) },
            { k: 'do', fn: () => setLock(o.id, null) },
            { k: 'wait', ms: rnd(300, 900) },
          ]
          return
        }
      }
      if (r < 0.36 && doc.objects.filter((o) => BOT_APPENDS.some((a) => o.text.includes(a))).length < 4) {
        // 付箋に追記する
        const stickies = cands.filter((o) => o.kind === 'sticky' && o.text.length < 20 && !BOT_APPENDS.some((a) => o.text.includes(a)))
        if (stickies.length) {
          const o = pick(stickies)
          b.queue = [
            ...go({ x: o.x + o.w * rnd(0.4, 0.7), y: o.y + o.h * rnd(0.4, 0.7) }),
            { k: 'do', fn: (bb) => (isBusy(o.id, bb.id) ? false : (setLock(o.id, { by: bb.id, mode: 'select' }), ripple(bb), true)) },
            { k: 'wait', ms: rnd(400, 700) },
            { k: 'type', id: o.id, text: pick(BOT_APPENDS) },
            { k: 'wait', ms: rnd(500, 900) },
            { k: 'do', fn: () => setLock(o.id, null) },
            { k: 'wait', ms: rnd(300, 800) },
          ]
          return
        }
      }
      if (r < 0.52 && doc.objects.filter((o) => o.author === b.id && o.born).length < 3) {
        // 新しい付箋を貼る
        const spot = freeSpot(home, STICKY, STICKY)
        if (spot) {
          const id = uid('b')
          const text = pick(BOT_STICKIES[b.id].filter((t) => !doc.objects.some((o) => o.text.startsWith(t))).concat(['（あとで書く）']))
          b.queue = [
            ...go({ x: spot.x + STICKY / 2, y: spot.y + STICKY / 2 }),
            {
              k: 'do',
              fn: (bb) => {
                setDoc((d) => ({
                  ...d,
                  objects: [
                    ...d.objects,
                    { id, kind: 'sticky', x: spot.x, y: spot.y, w: STICKY, h: STICKY, rot: rnd(-1.6, 1.6), color: PEOPLE[bb.id].swatch, text: '', author: bb.id, born: Date.now() },
                  ],
                }))
                setLock(id, { by: bb.id, mode: 'select' })
                ripple(bb)
              },
            },
            { k: 'wait', ms: 450 },
            { k: 'type', id, text },
            { k: 'wait', ms: rnd(600, 1000) },
            { k: 'do', fn: () => setLock(id, null) },
            { k: 'wait', ms: 400 },
          ]
          return
        }
      }
      if (r < 0.66) {
        const near = cands.length ? pick(cands) : null
        const to = near ? { x: near.x + near.w + rnd(10, 40), y: near.y + rnd(10, near.h) } : { x: home.x + rnd(80, home.w - 80), y: home.y + rnd(80, home.h - 80) }
        b.queue = [...go(to), { k: 'chat', text: pick(BOT_CHATS[b.id]) }, { k: 'wait', ms: rnd(2200, 3200) }]
        return
      }
      if (r < 0.76 && performance.now() - me.t < 6000) {
        // あなたのカーソルの様子を見に来る
        b.queue = [{ k: 'move', to: { x: me.x + rnd(50, 110), y: me.y + rnd(30, 80) }, slow: true }, { k: 'wait', ms: rnd(1200, 2200) }]
        return
      }
      const near = cands.length ? pick(cands) : null
      const to = near ? { x: near.x + rnd(-30, near.w + 30), y: near.y + rnd(-20, near.h + 20) } : { x: home.x + rnd(60, home.w - 60), y: home.y + rnd(60, home.h - 60) }
      b.queue = [...go(to), { k: 'wait', ms: rnd(500, 1800) }]
      b.kind = 'idle'
    }

    const abort = (b: BotRT) => {
      b.queue = []
      b.typing = null
      if (b.seg?.drag) lift(b.seg.drag.id, false)
      b.seg = null
      releaseAll(b.id)
    }

    const exec = (b: BotRT, s: Step, now: number) => {
      switch (s.k) {
        case 'move':
          startSeg(b, s.to, now, undefined, s.slow)
          break
        case 'goObj': {
          const o = objById(s.id)
          if (!o) return abort(b)
          startSeg(b, { x: o.x + o.w * s.fx, y: o.y + objH(o) * s.fy }, now)
          break
        }
        case 'drag': {
          const o = objById(s.id)
          if (!o || isBusy(s.id, b.id) || !objEls.current.get(s.id)) return abort(b)
          const ox = o.x - b.pos.x
          const oy = o.y - b.pos.y
          setLock(s.id, { by: b.id, mode: 'drag' })
          lift(s.id, true)
          startSeg(b, { x: s.to.x - ox, y: s.to.y - oy }, now, { id: s.id, ox, oy })
          break
        }
        case 'wait':
          b.waitUntil = now + s.ms
          break
        case 'do':
          if (s.fn(b, now) === false) abort(b)
          break
        case 'chat': {
          b.chat = { text: s.text, i: 0, next: now + 120, hideAt: Infinity }
          const el = bubbleEls.current[b.id]
          if (el) {
            el.textContent = ''
            el.dataset.on = 'true'
          }
          break
        }
        case 'type': {
          const o = objById(s.id)
          if (!o) return abort(b)
          setLock(s.id, { by: b.id, mode: 'type' })
          b.typing = { id: s.id, base: o.text, text: s.text, i: 0, next: now + 200 }
          break
        }
      }
    }

    const stepBot = (b: BotRT, now: number, dt: number) => {
      // 割り込み(コメントへの返信)は、入力中・ドラッグ中でなければ選択を外して即座に乗り換える
      if (b.pending.length && b.kind !== 'priority' && !b.typing && !b.seg?.drag) {
        releaseAll(b.id)
        b.seg = null
        b.queue = []
        b.waitUntil = 0
      }
      if (b.seg) {
        const s = b.seg
        const t = Math.min(1, (now - s.t0) / s.dur)
        const e = reduceRef.current ? t : easeHuman(t)
        b.pos = { x: bez(s.p0.x, s.c1.x, s.c2.x, s.p1.x, e), y: bez(s.p0.y, s.c1.y, s.c2.y, s.p1.y, e) }
        if (s.drag) {
          const el = objEls.current.get(s.drag.id)
          if (el) el.style.transform = `translate(${b.pos.x + s.drag.ox}px, ${b.pos.y + s.drag.oy}px)`
          else return abort(b)
        }
        b.drift = Math.max(0, b.drift - dt / 160)
        if (t >= 1) {
          b.seg = null
          if (s.drag) {
            const { id, ox, oy } = s.drag
            const x = Math.round(b.pos.x + ox)
            const y = Math.round(b.pos.y + oy)
            setDoc((d) => patchObj(d, id, { x, y }))
            lift(id, false)
            setLock(id, { by: b.id, mode: 'select' })
          }
        }
        return
      }
      b.drift = Math.min(1, b.drift + dt / 700)
      if (b.typing) {
        const ty = b.typing
        if (now >= ty.next) {
          if (!objById(ty.id)) return abort(b)
          ty.i = Math.min(ty.text.length, ty.i + 1 + Math.floor(Math.random() * 3))
          const text = ty.base + ty.text.slice(0, ty.i)
          const id = ty.id
          setDoc((d) => patchObj(d, id, { text }))
          ty.next = now + rnd(110, 280) + (Math.random() < 0.12 ? 520 : 0)
          if (ty.i >= ty.text.length) {
            b.typing = null
            setLock(id, { by: b.id, mode: 'select' })
          }
        }
        return
      }
      if (now < b.waitUntil) return
      let guard = 0
      while (!b.seg && !b.typing && now >= b.waitUntil && guard++ < 10) {
        const s = b.queue.shift()
        if (!s) plan(b)
        else exec(b, s, now)
      }
    }

    const tickChat = (b: BotRT, now: number) => {
      const c = b.chat
      if (!c) return
      const el = bubbleEls.current[b.id]
      if (c.i < c.text.length) {
        if (now >= c.next) {
          c.i = Math.min(c.text.length, c.i + 1 + (Math.random() < 0.4 ? 1 : 0))
          if (el) el.textContent = c.text.slice(0, c.i)
          c.next = now + rnd(45, 110)
          if (c.i >= c.text.length) c.hideAt = now + 2400 + c.text.length * 50
        }
      } else if (now >= c.hideAt) {
        if (el) el.dataset.on = 'false'
        b.chat = null
      }
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(64, now - last)
      last = now
      if (!visible) return
      const reduced = reduceRef.current
      const online = connRef.current === 'online'
      const { w: cw, h: ch } = sizeRef.current

      for (const id of BOTS) {
        const b = bots[id]
        const on = presentRef.current.includes(id)
        if (on && online) {
          stepBot(b, now, dt)
          tickChat(b, now)
        } else {
          // 一時停止中は時間だけずらしておく(再開時に飛ばないように)
          if (b.seg) b.seg.t0 += dt
          if (b.typing) b.typing.next += dt
          if (b.waitUntil) b.waitUntil += dt
        }
        // 各人のビューポート: カーソルが端に寄ると遅れて追いかける
        const hw = BOT_SCREEN.w / b.vp.z / 2
        const hh = BOT_SCREEN.h / b.vp.z / 2
        let tx = b.vp.cx
        let ty = b.vp.cy
        if (b.pos.x > b.vp.cx + hw * 0.55) tx = b.pos.x - hw * 0.55
        if (b.pos.x < b.vp.cx - hw * 0.55) tx = b.pos.x + hw * 0.55
        if (b.pos.y > b.vp.cy + hh * 0.5) ty = b.pos.y - hh * 0.5
        if (b.pos.y < b.vp.cy - hh * 0.5) ty = b.pos.y + hh * 0.5
        const k = 1 - Math.exp(-dt / 650)
        b.vp.cx += (tx - b.vp.cx) * k
        b.vp.cy += (ty - b.vp.cy) * k
      }

      // 視点: フォロー > ボタン等のアニメ
      const fid = followRef.current
      if (fid && cw) {
        const b = bots[fid]
        // 相手の画面と同じ範囲を自分の大きさに収める。狭いカードでは小さくなりすぎないよう下限を設ける
        const zt = clamp(b.vp.z * Math.min(cw / BOT_SCREEN.w, ch / BOT_SCREEN.h), Math.min(0.5, b.vp.z), MAX_Z)
        const v = vpRef.current
        const k = reduced ? 1 : 1 - Math.exp(-dt / 170)
        const ccx = (cw / 2 - v.x) / v.z
        const ccy = (ch / 2 - v.y) / v.z
        const nz = v.z + (zt - v.z) * k
        const ncx = ccx + (b.vp.cx - ccx) * k
        const ncy = ccy + (b.vp.cy - ccy) * k
        vpRef.current = { x: cw / 2 - ncx * nz, y: ch / 2 - ncy * nz, z: nz }
        tweenRef.current = null
        applyVp()
      } else if (tweenRef.current) {
        const tw = tweenRef.current
        const t = Math.min(1, (now - tw.t0) / tw.dur)
        const e = 1 - Math.pow(1 - t, 3)
        // ズームは対数で補間すると速度が均一に見える
        const z = Math.exp(Math.log(tw.from.z) + (Math.log(tw.to.z) - Math.log(tw.from.z)) * e)
        const fcx = (cw / 2 - tw.from.x) / tw.from.z
        const fcy = (ch / 2 - tw.from.y) / tw.from.z
        const tcx = (cw / 2 - tw.to.x) / tw.to.z
        const tcy = (ch / 2 - tw.to.y) / tw.to.z
        const cx = fcx + (tcx - fcx) * e
        const cy = fcy + (tcy - fcy) * e
        vpRef.current = { x: cw / 2 - cx * z, y: ch / 2 - cy * z, z }
        if (t >= 1) {
          vpRef.current = tw.to
          tweenRef.current = null
        }
        applyVp()
      }

      // カーソルの描画(画面座標)。止まっている間はわずかに揺れる
      const v = vpRef.current
      for (const id of BOTS) {
        const b = bots[id]
        const el = cursorEls.current[id]
        if (!el) continue
        const amp = reduced ? 0 : b.drift
        const dx = (Math.sin(now * 0.0011 + b.phase) * 2.6 + Math.sin(now * 0.0029 + b.phase * 2.1) * 0.9) * amp
        const dy = (Math.cos(now * 0.0008 + b.phase * 1.7) * 2.2 + Math.sin(now * 0.0023 + b.phase) * 0.8) * amp
        b.shown = { x: b.pos.x + dx, y: b.pos.y + dy }
        el.style.transform = `translate3d(${(b.shown.x * v.z + v.x).toFixed(1)}px, ${(b.shown.y * v.z + v.y).toFixed(1)}px, 0)`
      }

      // ミニマップのビューポート枠
      const mine = miniVpEls.current.me
      if (mine && cw) {
        mine.setAttribute('x', String(-v.x / v.z))
        mine.setAttribute('y', String(-v.y / v.z))
        mine.setAttribute('width', String(cw / v.z))
        mine.setAttribute('height', String(ch / v.z))
      }
      for (const id of BOTS) {
        const r = miniVpEls.current[id]
        if (!r) continue
        const b = bots[id]
        const w = BOT_SCREEN.w / b.vp.z
        const h = BOT_SCREEN.h / b.vp.z
        r.setAttribute('x', String(b.vp.cx - w / 2))
        r.setAttribute('y', String(b.vp.cy - h / 2))
        r.setAttribute('width', String(w))
        r.setAttribute('height', String(h))
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [applyVp, releaseAll, setLock])

  /* ---------- 参加・退出・回線 ---------- */
  const leave = useCallback(
    (id: BotId) => {
      const b = botsRef.current![id]
      if (b.seg?.drag) {
        const { id: oid, ox, oy } = b.seg.drag
        const x = Math.round(b.pos.x + ox)
        const y = Math.round(b.pos.y + oy)
        setDoc((d) => patchObj(d, oid, { x, y }))
        const el = objEls.current.get(oid)
        if (el) el.dataset.lifted = 'false'
      }
      b.seg = null
      b.queue = []
      b.typing = null
      b.pending = []
      b.chat = null
      const bubble = bubbleEls.current[id]
      if (bubble) bubble.dataset.on = 'false'
      releaseAll(id)
      setPinTyping((pt) => (pt?.by === id ? null : pt))
      setPresent((p) => p.filter((x) => x !== id))
      if (followRef.current === id) {
        followRef.current = null
        setFollowing(null)
        pushToast({ text: `${PEOPLE[id].name}が退出したため、フォローを終了しました`, person: id, icon: 'leave' })
      } else pushToast({ text: `${PEOPLE[id].name}が退出しました`, person: id, icon: 'leave' })
    },
    [pushToast, releaseAll],
  )
  const join = useCallback(
    (id: BotId) => {
      const b = botsRef.current![id]
      const home = SECTIONS.find((s) => s.id === PEOPLE[id].home) ?? SECTIONS[0]
      b.pos = { x: home.x + rnd(120, home.w - 120), y: home.y + rnd(160, home.h - 80) }
      b.vp.cx = b.pos.x
      b.vp.cy = b.pos.y - 40
      b.waitUntil = performance.now() + 700
      setPresent((p) => (p.includes(id) ? p : [...p, id]))
      pushToast({ text: `${PEOPLE[id].name}が参加しました`, person: id, icon: 'join' })
    },
    [pushToast],
  )

  useEffect(() => {
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    at(4200, () => join('yui'))
    // 以降は 40〜55 秒ごとに誰か一人が抜けて、しばらくして戻ってくる
    const cycle = () => {
      const p = presentRef.current
      if (connRef.current === 'online' && p.length >= 3) {
        const cand = p.filter((x) => x !== followRef.current)
        const who = pick(cand.length ? cand : p)
        leave(who)
        at(rnd(9000, 15000), () => join(who))
      }
      at(rnd(40000, 55000), cycle)
    }
    at(rnd(38000, 46000), cycle)
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [join, leave])

  useEffect(() => {
    if (conn !== 'online') return
    const t = window.setInterval(() => setLatency(Math.round(rnd(18, 46))), 2400)
    return () => window.clearInterval(t)
  }, [conn])

  const toggleConn = () => {
    if (connRef.current === 'online') {
      connRef.current = 'offline'
      setConn('offline')
      stopFollow()
      pushToast({ text: 'オフラインです。変更はこの端末に保存されます', icon: 'warn' })
    } else if (connRef.current === 'offline') {
      connRef.current = 'syncing'
      setConn('syncing')
      window.setTimeout(() => {
        connRef.current = 'online'
        setConn('online')
        setPendingOps((n) => {
          pushToast({ text: n ? `${n}件の変更を同期しました` : '再接続しました', icon: 'sync' })
          return 0
        })
      }, 1300)
    }
  }

  /* ---------- オブジェクト操作 ---------- */
  const lockToast = useRef(0)
  const warnLocked = (id: string) => {
    const l = locksRef.current[id]
    if (!l || l.mode === 'select') return false
    if (performance.now() - lockToast.current > 1800) {
      lockToast.current = performance.now()
      pushToast({ text: `${PEOPLE[l.by].name}が${l.mode === 'drag' ? '移動中' : '編集中'}です。少し待ってください`, person: l.by, icon: 'warn' })
    }
    return true
  }

  const lastAdd = useRef<string | null>(null)
  const actions = useMemo<ObjActions>(
    () => ({
      register: (id, el) => {
        if (el) objEls.current.set(id, el)
        else objEls.current.delete(id)
      },
      commitText: (id, text) => {
        setEditing(null)
        const o = docRef.current.objects.find((x) => x.id === id)
        if (!o) return
        if (o.kind === 'text' && !text.trim()) {
          // 空のテキストは作らなかったことにする
          if (lastAdd.current === id) {
            past.current.pop()
            syncHist()
          } else commit(opDelete(o, docRef.current.objects.indexOf(o)))
          setDoc((d) => ({ ...d, objects: d.objects.filter((x) => x.id !== id) }))
          setSelected(null)
          return
        }
        if (text !== o.text) commit(opPatch(id, { text: o.text }, { text }))
        lastAdd.current = null
        canvasRef.current?.focus({ preventScroll: true })
      },
      setColor: (id, c) => {
        const o = docRef.current.objects.find((x) => x.id === id)
        if (o && o.color !== c) commit(opPatch(id, { color: o.color }, { color: c }))
        if (o?.kind === 'sticky') setStickyColor(c)
      },
      duplicate: (id) => {
        const o = docRef.current.objects.find((x) => x.id === id)
        if (!o) return
        const n: Obj = { ...o, id: uid('o'), x: o.x + 28, y: o.y + 28, author: 'me', born: Date.now() }
        commit(opAdd(n))
        setSelected(n.id)
      },
      remove: (id) => {
        const objs = docRef.current.objects
        const idx = objs.findIndex((x) => x.id === id)
        if (idx < 0 || warnLocked(id)) return
        const o = objs[idx]
        const el = objEls.current.get(id)
        setSelected(null)
        setEditing(null)
        canvasRef.current?.focus({ preventScroll: true })
        const done = () => commit(opDelete(o, idx))
        if (el && !reduceRef.current) {
          el.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.85 }], { duration: 140, easing: 'ease-in' }).finished.then(done, done)
        } else done()
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commit],
  )

  const createAt = (w: Pt) => {
    const id = uid('o')
    let o: Obj
    if (tool === 'sticky') o = { id, kind: 'sticky', x: w.x - STICKY / 2, y: w.y - STICKY / 2, w: STICKY, h: STICKY, rot: rnd(-1.4, 1.4), color: stickyColor, text: '', author: 'me', born: Date.now() }
    else if (tool === 'shape')
      o = {
        id,
        kind: shapeKind,
        x: w.x - 100,
        y: w.y - (shapeKind === 'rect' ? 42 : 64),
        w: 200,
        h: shapeKind === 'rect' ? 84 : 128,
        rot: 0,
        color: 'blue',
        text: '',
        author: 'me',
        born: Date.now(),
      }
    else o = { id, kind: 'text', x: w.x, y: w.y - 16, w: 340, h: 32, rot: 0, color: 'yellow', text: '', author: 'me', size: 24, born: Date.now() }
    commit(opAdd(o))
    lastAdd.current = id
    setSelected(id)
    setEditing(id)
    setTool('select')
  }

  /* ---------- コメント ---------- */
  const addPin = (text: string) => {
    if (!draft) return
    const id = uid('p')
    setDoc((d) => ({ ...d, pins: [...d.pins, { id, x: draft.x, y: draft.y, author: 'me', resolved: false, msgs: [{ id: uid('m'), author: 'me', text, at: Date.now() }] }] }))
    markLocal()
    setDraft(null)
    setOpenPin(id)
    if (connRef.current === 'online') requestReply(id, draft)
  }
  const replyPin = useCallback(
    (id: string, text: string) => {
      setDoc((d) => ({ ...d, pins: d.pins.map((p) => (p.id === id ? { ...p, msgs: [...p.msgs, { id: uid('m'), author: 'me', text, at: Date.now() }] } : p)) }))
      markLocal()
      if (connRef.current === 'online') requestReply(id)
    },
    [markLocal, requestReply],
  )
  const resolvePin = useCallback((id: string) => {
    setDoc((d) => ({ ...d, pins: d.pins.map((p) => (p.id === id ? { ...p, resolved: !p.resolved } : p)) }))
  }, [])
  const togglePin = useCallback((id: string | null) => {
    setOpenPin(id)
    setDraft(null)
    if (id) {
      setUnread((u) => u.filter((x) => x !== id))
      setSelected(null)
    } else canvasRef.current?.focus({ preventScroll: true })
  }, [])

  /* ---------- フォロー ---------- */
  const toggleFollow = (id: BotId) => {
    if (followRef.current === id) {
      stopFollow()
      return
    }
    if (connRef.current !== 'online') {
      pushToast({ text: 'オフライン中はフォローできません', icon: 'warn' })
      return
    }
    followRef.current = id
    setFollowing(id)
    canvasRef.current?.focus({ preventScroll: true })
  }

  /* ---------- ポインタ ---------- */
  const ptrs = useRef(new Map<number, Pt>())
  type Gesture =
    | { k: 'pan'; sx: number; sy: number; vx: number; vy: number }
    | { k: 'drag'; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }
    | { k: 'pinch'; d0: number; z0: number; wx: number; wy: number }
  const gesture = useRef<Gesture | null>(null)

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const toWorld = (p: Pt): Pt => {
    const v = vpRef.current
    return { x: (p.x - v.x) / v.z, y: (p.y - v.y) / v.z }
  }
  const startPinch = () => {
    const [a, b] = [...ptrs.current.values()]
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const w = toWorld(mid)
    endDrag(false)
    gesture.current = { k: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: vpRef.current.z, wx: w.x, wy: w.y }
    stopFollow()
  }
  const endDrag = (commitMove: boolean) => {
    const g = gesture.current
    if (g?.k !== 'drag') return
    const el = objEls.current.get(g.id)
    if (el) {
      el.dataset.lifted = 'false'
      el.style.zIndex = ''
    }
    setDraggingId(null)
    if (!g.moved) return
    const o = docRef.current.objects.find((x) => x.id === g.id)
    if (!o) return
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el?.style.transform ?? '')
    if (commitMove && m) {
      const x = Math.round(parseFloat(m[1]))
      const y = Math.round(parseFloat(m[2]))
      commit(opPatch(g.id, { x: o.x, y: o.y }, { x, y }))
    } else if (el) el.style.transform = `translate(${o.x}px, ${o.y}px)`
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-ui]')) return
    if (e.button === 2) return
    const c = canvasRef.current!
    c.focus({ preventScroll: true })
    const p = local(e)
    ptrs.current.set(e.pointerId, p)
    try {
      c.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    if (ptrs.current.size === 2) {
      startPinch()
      return
    }
    if (ptrs.current.size > 2) return
    const startPan = () => {
      e.preventDefault()
      stopFollow()
      tweenRef.current = null
      gesture.current = { k: 'pan', sx: p.x, sy: p.y, vx: vpRef.current.x, vy: vpRef.current.y }
      setPanning(true)
    }
    if (e.button === 1 || spaceRef.current || tool === 'hand') return startPan()
    const w = toWorld(p)
    if (tool === 'sticky' || tool === 'shape' || tool === 'text') {
      if (editing) return
      e.preventDefault()
      createAt(w)
      return
    }
    if (tool === 'comment') {
      e.preventDefault()
      setDraft(w)
      setOpenPin(null)
      setSelected(null)
      setTool('select')
      return
    }
    const objEl = target.closest<HTMLElement>('[data-obj-id]')
    if (objEl) {
      const id = objEl.dataset.objId!
      if (editing === id) return
      setOpenPin(null)
      setDraft(null)
      if (warnLocked(id)) {
        setSelected(id)
        return
      }
      const o = docRef.current.objects.find((x) => x.id === id)
      if (!o) return
      setSelected(id)
      gesture.current = { k: 'drag', id, sx: w.x, sy: w.y, ox: o.x, oy: o.y, moved: false }
      return
    }
    setSelected(null)
    setOpenPin(null)
    setDraft(null)
    startPan()
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = local(e)
    const w = toWorld(p)
    meRef.current = { x: w.x, y: w.y, t: performance.now() }
    if (!ptrs.current.has(e.pointerId)) return
    ptrs.current.set(e.pointerId, p)
    const g = gesture.current
    if (!g) return
    if (g.k === 'pan') {
      vpRef.current = { ...vpRef.current, x: g.vx + (p.x - g.sx), y: g.vy + (p.y - g.sy) }
      applyVp()
    } else if (g.k === 'drag') {
      const dx = w.x - g.sx
      const dy = w.y - g.sy
      if (!g.moved && Math.hypot(dx, dy) * vpRef.current.z < 3) return
      if (!g.moved) {
        if (warnLocked(g.id)) {
          gesture.current = null
          return
        }
        g.moved = true
        setDraggingId(g.id)
        const el = objEls.current.get(g.id)
        if (el) {
          el.dataset.lifted = 'true'
          el.style.zIndex = '16'
        }
      }
      const el = objEls.current.get(g.id)
      if (el) el.style.transform = `translate(${g.ox + dx}px, ${g.oy + dy}px)`
    } else if (g.k === 'pinch') {
      const [a, b] = [...ptrs.current.values()]
      if (!a || !b) return
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const z = clamp((g.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0, MIN_Z, MAX_Z)
      vpRef.current = { x: mid.x - g.wx * z, y: mid.y - g.wy * z, z }
      applyVp()
    }
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ptrs.current.delete(e.pointerId)) return
    const g = gesture.current
    if (g?.k === 'pinch') {
      if (ptrs.current.size < 2) gesture.current = null
      return
    }
    if (g?.k === 'drag') endDrag(e.type === 'pointerup')
    gesture.current = null
    setPanning(false)
  }

  const onDoubleClick = (e: ReactMouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-ui]')) return
    const objEl = target.closest<HTMLElement>('[data-obj-id]')
    if (!objEl) return
    const id = objEl.dataset.objId!
    if (warnLocked(id)) return
    setSelected(id)
    setEditing(id)
  }

  // ホイール(ページをスクロールさせないため非 passive で登録)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('[data-scroll]')) return
      e.preventDefault()
      stopFollow()
      const p = local(e)
      const isMouseWheel = e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && !e.shiftKey
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), p.x, p.y)
      else if (isMouseWheel) zoomAt(Math.exp(-e.deltaY * 0.0016), p.x, p.y)
      else {
        tweenRef.current = null
        const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX
        const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY
        vpRef.current = { ...vpRef.current, x: vpRef.current.x - dx, y: vpRef.current.y - dy }
        applyVp()
      }
    }
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }, [applyVp, stopFollow, zoomAt])

  /* ---------- キーボード(デモ内にフォーカスがあるときだけ) ---------- */
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement
    if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable) return
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    const onButton = t.tagName === 'BUTTON'
    if (e.key === ' ' && !onButton) {
      e.preventDefault()
      if (!spaceRef.current) {
        spaceRef.current = true
        setSpaceHeld(true)
      }
      return
    }
    if (mod && k === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
      return
    }
    if (mod && k === 'y') {
      e.preventDefault()
      redo()
      return
    }
    if (mod && k === 'd' && selected) {
      e.preventDefault()
      actions.duplicate(selected)
      return
    }
    if (e.key === 'Escape') {
      if (draft) setDraft(null)
      else if (openPin) setOpenPin(null)
      else if (followRef.current) stopFollow()
      else if (selected) setSelected(null)
      else if (tool !== 'select') setTool('select')
      else return
      e.preventDefault()
      canvasRef.current?.focus({ preventScroll: true })
      return
    }
    if (mod || e.altKey) return
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      e.preventDefault()
      actions.remove(selected)
      return
    }
    if (e.key === 'Enter' && selected && !onButton) {
      e.preventDefault()
      if (!warnLocked(selected)) setEditing(selected)
      return
    }
    if (e.key.startsWith('Arrow') && selected) {
      e.preventDefault()
      const o = doc.objects.find((x) => x.id === selected)
      if (!o || warnLocked(selected)) return
      const s = e.shiftKey ? 20 : 4
      const dx = e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0
      const dy = e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0
      commit(opPatch(selected, { x: o.x, y: o.y }, { x: o.x + dx, y: o.y + dy }))
      return
    }
    if (e.shiftKey && e.code === 'Digit1') {
      e.preventDefault()
      stopFollow()
      fitAll()
      return
    }
    const toolKeys: Record<string, Tool> = { v: 'select', h: 'hand', n: 'sticky', s: 'sticky', r: 'shape', t: 'text', c: 'comment' }
    if (toolKeys[k] && !e.shiftKey) {
      e.preventDefault()
      setTool(toolKeys[k])
      return
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      stopFollow()
      zoomAt(1.25, undefined, undefined, true)
    } else if (e.key === '-') {
      e.preventDefault()
      stopFollow()
      zoomAt(0.8, undefined, undefined, true)
    } else if (e.key === '0') {
      e.preventDefault()
      stopFollow()
      zoomAt(1 / (tweenRef.current?.to.z ?? vpRef.current.z), undefined, undefined, true)
    }
  }
  const onKeyUp = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' && spaceRef.current) {
      spaceRef.current = false
      setSpaceHeld(false)
    }
  }

  // 選択中のオブジェクトが消えたら(undo など)選択を外す
  const selectedObj = selected ? doc.objects.find((o) => o.id === selected) : undefined
  useEffect(() => {
    if (selected && !selectedObj) setSelected(null)
    if (editing && !doc.objects.some((o) => o.id === editing)) setEditing(null)
  }, [selected, selectedObj, editing, doc.objects])

  /* ---------- ミニマップ ---------- */
  const mb = useMemo(() => {
    let x0 = -60
    let y0 = -200
    let x1 = 2160
    let y1 = 700
    for (const o of doc.objects) {
      x0 = Math.min(x0, o.x - 60)
      y0 = Math.min(y0, o.y - 60)
      x1 = Math.max(x1, o.x + o.w + 60)
      y1 = Math.max(y1, o.y + o.h + 60)
    }
    const pad = 220
    return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 }
  }, [doc.objects])
  const miniSvg = useRef<SVGSVGElement>(null)
  const miniDrag = useRef(false)
  const miniNav = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = miniSvg.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const { w, h } = sizeRef.current
    const z = vpRef.current.z
    stopFollow()
    tweenRef.current = null
    vpRef.current = { x: w / 2 - pt.x * z, y: h / 2 - pt.y * z, z }
    applyVp()
  }

  const sectionCounts = useMemo(() => {
    const m: Record<SectionId, number> = { ideas: 0, issues: 0, actions: 0 }
    for (const o of doc.objects) {
      if (o.kind !== 'sticky') continue
      const s = sectionOf(o)
      if (s) m[s.id]++
    }
    return m
  }, [doc.objects])

  const followP = following ? PEOPLE[following] : null
  const cursorCls = spaceHeld || tool === 'hand' ? (panning ? 'cursor-grabbing' : 'cursor-grab') : panning ? 'cursor-grabbing' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair'

  const tools: { id: Tool; label: string; kbd: string; icon: ReactNode }[] = [
    { id: 'select', label: '選択', kbd: 'V', icon: <MousePointer2 className="h-[18px] w-[18px]" /> },
    { id: 'hand', label: '手のひら', kbd: 'H', icon: <Hand className="h-[18px] w-[18px]" /> },
    { id: 'sticky', label: '付箋', kbd: 'N', icon: <StickyNote className="h-[18px] w-[18px]" /> },
    {
      id: 'shape',
      label: '図形',
      kbd: 'R',
      icon: shapeKind === 'rect' ? <Square className="h-[18px] w-[18px]" /> : shapeKind === 'ellipse' ? <Circle className="h-[18px] w-[18px]" /> : <Diamond className="h-[18px] w-[18px]" />,
    },
    { id: 'text', label: 'テキスト', kbd: 'T', icon: <Type className="h-[18px] w-[18px]" /> },
    { id: 'comment', label: 'コメント', kbd: 'C', icon: <MessageCircle className="h-[18px] w-[18px]" /> },
  ]

  const iconBtn =
    'grid h-9 w-9 place-items-center rounded-xl text-zinc-600 outline-none transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-[#7357ff]/50 disabled:pointer-events-none disabled:opacity-35'

  return (
    <div
      ref={rootRef}
      className="@container relative flex h-full w-full select-none flex-col overflow-hidden bg-[#f4f4f1] font-sans text-zinc-900 antialiased"
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null) && spaceRef.current) {
          spaceRef.current = false
          setSpaceHeld(false)
        }
      }}
    >
      {/* ── ヘッダー ── */}
      <header className="relative z-30 flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white px-2.5 @xl:gap-3 @xl:px-3.5">
        <Logo />
        <span className="hidden text-[15px] font-extrabold tracking-tight @3xl:inline">Tsumugi</span>
        <span className="hidden h-5 w-px bg-zinc-200 @3xl:block" />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="hidden truncate text-[13px] text-zinc-400 @4xl:inline">コモレビ珈琲 /</span>
          <span className="truncate text-[13.5px] font-semibold text-zinc-800">春の新メニュー企画</span>
          <span className="hidden shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-zinc-500 @xl:inline">ボード</span>
        </div>

        <button
          type="button"
          onClick={toggleConn}
          aria-label={conn === 'online' ? `接続済み（${latency}ms）。押すとオフラインを模擬` : conn === 'offline' ? 'オフライン。押すと再接続' : '同期中'}
          className="group/tip relative flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-600 outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-[#7357ff]/50"
        >
          {conn === 'online' && (
            <span className="relative grid h-2.5 w-2.5 place-items-center">
              {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60 [animation-duration:2.4s]" />}
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
          {conn === 'offline' && <CloudOff className="h-3.5 w-3.5 text-zinc-500" />}
          {conn === 'syncing' && <RefreshCw className={`h-3.5 w-3.5 text-amber-500 ${reduce ? '' : 'animate-spin'}`} />}
          <span className="hidden @2xl:inline">
            {conn === 'online' ? (
              <>
                接続済み<span className="ml-1 tabular-nums text-zinc-400">{latency}ms</span>
              </>
            ) : conn === 'offline' ? (
              <>
                オフライン{pendingOps > 0 && <span className="ml-1 text-amber-600">未同期 {pendingOps}</span>}
              </>
            ) : (
              '同期中…'
            )}
          </span>
          {conn === 'offline' && pendingOps > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white @2xl:hidden">{pendingOps}</span>
          )}
          <Tip label={conn === 'online' ? '押すとオフラインを模擬' : conn === 'offline' ? '押すと再接続' : '同期中'} side="bottom" />
        </button>

        <div className="flex shrink-0 items-center" role="group" aria-label="参加中のメンバー（押すとフォロー）">
          <AnimatePresence initial={false}>
            {present.map((id, i) => {
              const p = PEOPLE[id]
              const f = following === id
              return (
                <motion.button
                  key={id}
                  type="button"
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 'auto' }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, width: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  onClick={() => toggleFollow(id)}
                  aria-pressed={f}
                  aria-label={`${p.full}（${p.role}）${f ? 'のフォローを終了' : 'をフォロー'}`}
                  className={`group/tip relative -ml-1.5 rounded-full outline-none first:ml-0 focus-visible:z-10 ${i > 2 ? 'hidden @md:block' : ''}`}
                  style={{ zIndex: 10 - i }}
                >
                  <span
                    className={`block rounded-full p-[2px] transition ${conn !== 'online' ? 'grayscale' : ''}`}
                    style={{ background: f ? p.color : '#ffffff', boxShadow: `0 0 0 2px ${p.color}` }}
                  >
                    <Avatar p={p} size={26} />
                  </span>
                  {f && (
                    <span className="absolute -bottom-1 left-1/2 grid h-3.5 w-3.5 -translate-x-1/2 place-items-center rounded-full text-white ring-2 ring-white" style={{ background: p.color }}>
                      <Eye className="h-2.5 w-2.5" />
                    </span>
                  )}
                  <span className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-left text-[11px] text-white opacity-0 shadow-lg transition-opacity delay-200 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100">
                    <span className="block font-semibold">
                      {p.full}
                      <span className="ml-1 font-normal text-white/55">{p.role}</span>
                    </span>
                    <span className="text-white/65">{f ? 'クリックでフォロー終了' : 'クリックで画面をフォロー'}</span>
                  </span>
                </motion.button>
              )
            })}
          </AnimatePresence>
          {present.length > 3 && (
            <span className="-ml-1.5 grid h-[30px] min-w-[30px] place-items-center rounded-full bg-zinc-100 px-1 text-[11px] font-semibold text-zinc-600 ring-2 ring-white @md:hidden">
              +{present.length - 3}
            </span>
          )}
          <span className="ml-2 hidden rounded-full p-[2px] @lg:block" style={{ boxShadow: `0 0 0 2px ${PEOPLE.me.color}` }} title="あなた">
            <Avatar p={PEOPLE.me} size={26} />
          </span>
        </div>

        <button
          type="button"
          onClick={() => pushToast({ text: '閲覧用リンクをコピーしました', icon: 'link' })}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#7357ff] px-2.5 text-[12.5px] font-semibold text-white outline-none transition hover:bg-[#6146f2] focus-visible:ring-2 focus-visible:ring-[#7357ff]/40 focus-visible:ring-offset-1 @xl:px-3"
          aria-label="共有"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden @xl:inline">共有</span>
        </button>
      </header>

      {/* ── キャンバス ── */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={canvasRef}
          tabIndex={0}
          role="application"
          aria-roledescription="ホワイトボード"
          aria-label="共同編集キャンバス。空白をドラッグかSpace+ドラッグで移動、ホイールでズーム。V/H/N/R/T/Cでツール切替"
          className={`absolute inset-0 touch-none overflow-hidden outline-none ${cursorCls}`}
          style={{
            backgroundColor: '#f4f4f1',
            backgroundImage: 'radial-gradient(circle, #c9c8c0 1.1px, transparent 1.4px)',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div ref={worldRef} className="absolute left-0 top-0 origin-top-left">
            {SECTIONS.map((s) => (
              <div
                key={s.id}
                className="pointer-events-none absolute rounded-[22px] border border-black/[0.06] bg-white/75 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
                style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
              >
                <div className="absolute left-5 top-4 flex items-center gap-2">
                  <span className="rounded-lg px-3 py-1 text-[19px] font-bold" style={{ background: s.tag, color: s.ink }}>
                    {s.title}
                  </span>
                  <span className="text-[15px] font-semibold tabular-nums text-zinc-400">{sectionCounts[s.id]}</span>
                </div>
              </div>
            ))}
            {doc.objects.map((o) => (
              <ObjectView
                key={o.id}
                o={o}
                selected={selected === o.id}
                lock={locks[o.id]}
                editing={editing === o.id}
                fresh={!!o.born && o.born > mountedAt.current}
                dragging={draggingId === o.id}
                reduce={reduce}
                actions={actions}
              />
            ))}
            {doc.pins.map((p) => (
              <PinView
                key={p.id}
                pin={p}
                open={openPin === p.id}
                unread={unread.includes(p.id)}
                typingBy={pinTyping?.pin === p.id ? pinTyping.by : null}
                reduce={reduce}
                onToggle={togglePin}
                onReply={replyPin}
                onResolve={resolvePin}
              />
            ))}
            {draft && (
              <div
                data-ui
                className="absolute"
                style={{ left: draft.x, top: draft.y, transform: 'scale(calc(1 / var(--z, 1)))', transformOrigin: '0 0', zIndex: 45 }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="absolute bottom-0 left-0 grid h-9 w-9 place-items-center rounded-full rounded-bl-[4px] bg-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)] ring-[2.5px] ring-[#7357ff]">
                  <Avatar p={PEOPLE.me} size={28} />
                </span>
                <KeepInside className="absolute bottom-[-28px] left-12 z-10 w-[272px]">
                <motion.div
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: -6, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-[0_18px_44px_-14px_rgba(20,16,40,0.4)]"
                  role="dialog"
                  aria-label="新しいコメント"
                >
                  <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-zinc-700">
                    <Avatar p={PEOPLE.me} size={20} />
                    新しいコメント
                    <span className="ml-auto text-[10.5px] font-normal text-zinc-400">Enterで投稿</span>
                  </div>
                  <Composer placeholder="コメントを追加…" autoFocus onSend={addPin} onEscape={() => {
                      setDraft(null)
                      canvasRef.current?.focus({ preventScroll: true })
                    }}
                  />
                </motion.div>
                </KeepInside>
              </div>
            )}
          </div>

          {/* 他人のカーソル(画面座標。毎フレーム ref で transform を書く) */}
          <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
            {BOTS.map((id) => {
              const p = PEOPLE[id]
              return (
                <div
                  key={id}
                  ref={(el) => {
                    cursorEls.current[id] = el
                  }}
                  data-present={present.includes(id)}
                  data-stale={conn !== 'online'}
                  className="absolute left-0 top-0 opacity-0 transition-opacity duration-300 data-[present=true]:opacity-100 data-[stale=true]:data-[present=true]:opacity-40"
                  style={{ willChange: 'transform' }}
                >
                  <span
                    ref={(el) => {
                      ringEls.current[id] = el
                    }}
                    className="absolute -left-[9px] -top-[9px] h-[22px] w-[22px] rounded-full border-2 opacity-0"
                    style={{ borderColor: p.color }}
                  />
                  <svg width="22" height="24" viewBox="0 0 22 24" className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
                    <path d="M2.5 2.2 2.6 19.6 7.3 15.2 10.4 22.1 13.6 20.7 10.6 13.9 17.2 13.6Z" fill={p.color} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                  <div className="absolute left-[15px] top-[19px] flex flex-col items-start">
                    <span className="whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-semibold leading-none text-white shadow-sm" style={{ background: p.color }}>
                      {p.name}
                    </span>
                    <span
                      ref={(el) => {
                        bubbleEls.current[id] = el
                      }}
                      data-on="false"
                      className="mt-1 block w-max max-w-[210px] origin-top-left rounded-[14px] rounded-tl-[4px] px-3 py-1.5 text-[12.5px] font-medium leading-snug text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.4)] transition duration-200 data-[on=false]:scale-90 data-[on=false]:opacity-0"
                      style={{ background: p.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* フォロー枠 */}
        <AnimatePresence>
          {followP && (
            <motion.div
              key="follow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-none absolute inset-0 z-30"
              style={{ boxShadow: `inset 0 0 0 3px ${followP.color}` }}
            >
              <div className="pointer-events-auto absolute bottom-[64px] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl py-1 shadow-lg @4xl:bottom-auto @4xl:top-0 @4xl:rounded-t-none pl-1.5 pr-1 text-[12px] font-semibold text-white shadow-md" style={{ background: followP.color }}>
                <Avatar p={followP} size={20} className="ring-1 ring-white/60" />
                <span className="whitespace-nowrap">{followP.name}の画面をフォロー中</span>
                <button
                  type="button"
                  onClick={() => {
                    stopFollow()
                    canvasRef.current?.focus({ preventScroll: true })
                  }}
                  className="flex items-center gap-1 rounded-lg bg-black/15 px-1.5 py-0.5 text-[11px] outline-none hover:bg-black/25 focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="フォローを終了（Esc）"
                >
                  <span className="hidden @md:inline">Esc</span>
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ズーム */}
        <div className="absolute left-2.5 top-2.5 z-30 flex items-center gap-0.5 @4xl:bottom-3 @4xl:left-3 @4xl:top-auto rounded-xl border border-zinc-200/80 bg-white/95 p-0.5 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.18)] backdrop-blur">
          <button type="button" className={`group/tip relative ${iconBtn} h-8 w-8`} aria-label="縮小" onClick={() => (stopFollow(), zoomAt(0.8, undefined, undefined, true))}>
            <Minus className="h-4 w-4" />
            <Tip label="縮小" kbd="-" side="zoom" />
          </button>
          <button
            type="button"
            className="group/tip relative h-8 min-w-[52px] rounded-lg px-1 text-[12px] font-semibold tabular-nums text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-[#7357ff]/50"
            aria-label={`ズーム ${zoomPct}%。押すと100%に`}
            onClick={() => (stopFollow(), zoomAt(1 / (tweenRef.current?.to.z ?? vpRef.current.z), undefined, undefined, true))}
          >
            {zoomPct}%
            <Tip label="100%に戻す" kbd="0" side="zoom" />
          </button>
          <button type="button" className={`group/tip relative ${iconBtn} h-8 w-8`} aria-label="拡大" onClick={() => (stopFollow(), zoomAt(1.25, undefined, undefined, true))}>
            <Plus className="h-4 w-4" />
            <Tip label="拡大" kbd="+" side="zoom" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-zinc-200" />
          <button type="button" className={`group/tip relative ${iconBtn} h-8 w-8`} aria-label="全体を表示" onClick={() => (stopFollow(), fitAll())}>
            <Scan className="h-4 w-4" />
            <Tip label="全体を表示" kbd="⇧1" side="zoom" />
          </button>
          <button
            type="button"
            className={`group/tip relative ${iconBtn} h-8 w-8 ${miniOpen ? 'bg-zinc-100 text-zinc-900' : ''}`}
            aria-label="ミニマップ"
            aria-pressed={miniOpen}
            onClick={() => setMiniPref(!miniOpen)}
          >
            <MapIcon className="h-4 w-4" />
            <Tip label="ミニマップ" side="zoom" />
          </button>
        </div>

        {/* トースト */}
        <div className="pointer-events-none absolute right-2.5 top-[58px] z-40 flex w-[min(300px,calc(100%-20px))] flex-col items-end gap-2 @4xl:top-2.5" aria-live="polite">
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const p = t.person ? PEOPLE[t.person] : null
              return (
                <motion.div
                  key={t.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.18 } }}
                  transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                  className="flex max-w-full items-center gap-2.5 rounded-xl bg-zinc-900/95 py-2 pl-2 pr-3 text-[12.5px] text-white shadow-[0_10px_28px_-10px_rgba(0,0,0,0.5)]"
                >
                  {p ? (
                    <span className="relative">
                      <Avatar p={p} size={24} />
                      <span className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full text-white ring-2 ring-zinc-900" style={{ background: p.color }}>
                        {t.icon === 'join' ? <LogIn className="h-2 w-2" /> : t.icon === 'leave' ? <LogOut className="h-2 w-2" /> : t.icon === 'comment' ? <MessageCircle className="h-2 w-2" /> : <Eye className="h-2 w-2" />}
                      </span>
                    </span>
                  ) : (
                    <span className={`grid h-6 w-6 place-items-center rounded-full ${t.icon === 'warn' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {t.icon === 'warn' ? <CloudOff className="h-3.5 w-3.5" /> : t.icon === 'link' ? <Share2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                    </span>
                  )}
                  <span className="min-w-0 leading-snug">{t.text}</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* ミニマップ */}
        <AnimatePresence>
          {miniOpen && (
            <motion.div
              key="mini"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-[72px] right-2.5 z-30 overflow-hidden rounded-xl border border-zinc-200/80 bg-white/95 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.25)] backdrop-blur @3xl:bottom-3"
            >
              <svg
                ref={miniSvg}
                viewBox={`${mb.x} ${mb.y} ${mb.w} ${mb.h}`}
                className="block h-[104px] w-[168px] cursor-pointer touch-none @3xl:h-[118px] @3xl:w-[196px]"
                role="img"
                aria-label="ミニマップ（クリックで移動）"
                onPointerDown={(e) => {
                  miniDrag.current = true
                  e.currentTarget.setPointerCapture(e.pointerId)
                  miniNav(e)
                }}
                onPointerMove={(e) => miniDrag.current && miniNav(e)}
                onPointerUp={() => (miniDrag.current = false)}
                onPointerCancel={() => (miniDrag.current = false)}
              >
                <defs>
                  <clipPath id="mpc-mini-clip">
                    <rect x={mb.x} y={mb.y} width={mb.w} height={mb.h} />
                  </clipPath>
                </defs>
                <g clipPath="url(#mpc-mini-clip)">
                  {SECTIONS.map((s) => (
                    <rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} rx={22} fill="#f1f0ec" />
                  ))}
                  {doc.objects.map((o) =>
                    o.kind === 'text' ? (
                      <rect key={o.id} x={o.x} y={o.y} width={Math.min(o.w, o.text.length * (o.size ?? 24))} height={(o.size ?? 24) * 0.9} rx={4} fill={o.muted ? '#d4d4d0' : '#a1a1a8'} />
                    ) : (
                      <rect key={o.id} x={o.x} y={o.y} width={o.w} height={o.h} rx={o.kind === 'ellipse' ? o.h / 2 : 6} fill={SWATCH[o.color].dot} />
                    ),
                  )}
                  {BOTS.filter((id) => present.includes(id)).map((id) => (
                    <rect
                      key={id}
                      ref={(el) => {
                        miniVpEls.current[id] = el
                      }}
                      fill={PEOPLE[id].color}
                      fillOpacity={following === id ? 0.12 : 0.05}
                      stroke={PEOPLE[id].color}
                      strokeWidth={following === id ? 2.4 : 1.3}
                      vectorEffect="non-scaling-stroke"
                      rx={10}
                      opacity={conn === 'online' ? 1 : 0.35}
                    />
                  ))}
                  <rect
                    ref={(el) => {
                      miniVpEls.current.me = el
                    }}
                    fill="none"
                    stroke={PEOPLE.me.color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    rx={10}
                  />
                </g>
              </svg>
              <div className="flex items-center gap-2 border-t border-zinc-100 px-2 py-1 text-[10px] text-zinc-500">
                {(['me', ...present] as PersonId[]).map((id) => (
                  <span key={id} className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: PEOPLE[id].color }} />
                    <span className={id === 'me' ? 'font-semibold text-zinc-700' : ''}>{id === 'me' ? 'あなた' : PEOPLE[id].name}</span>
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* ツールバー */}
        <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
          <AnimatePresence>
            {(tool === 'sticky' || tool === 'shape') && (
              <motion.div
                key={tool}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className="absolute bottom-[calc(100%+8px)] left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-zinc-200/80 bg-white p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.22)]"
                role="group"
                aria-label={tool === 'sticky' ? '付箋の色' : '図形の種類'}
              >
                {tool === 'sticky'
                  ? SWATCH_IDS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={SWATCH[c].label}
                        aria-pressed={stickyColor === c}
                        onClick={() => setStickyColor(c)}
                        className="grid h-8 w-8 place-items-center rounded-lg outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-[#7357ff]/50"
                      >
                        <span className={`h-5 w-5 rounded-[5px] shadow-sm ring-2 ring-offset-1 transition ${stickyColor === c ? 'ring-[#7357ff]' : 'ring-transparent'}`} style={{ background: SWATCH[c].bg }} />
                      </button>
                    ))
                  : (
                      [
                        ['rect', '四角形', <Square key="r" className="h-[18px] w-[18px]" />],
                        ['ellipse', '楕円', <Circle key="e" className="h-[18px] w-[18px]" />],
                        ['diamond', 'ひし形', <Diamond key="d" className="h-[18px] w-[18px]" />],
                      ] as const
                    ).map(([k, label, icon]) => (
                      <button
                        key={k}
                        type="button"
                        aria-label={label}
                        aria-pressed={shapeKind === k}
                        onClick={() => setShapeKind(k)}
                        className={`${iconBtn} h-8 w-8 ${shapeKind === k ? 'bg-[#efebff] text-[#5b3ff0]' : ''}`}
                      >
                        {icon}
                      </button>
                    ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div role="toolbar" aria-label="ツール" className="flex items-center gap-0.5 rounded-2xl border border-zinc-200/80 bg-white p-1 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.28)]">
            {tools.map((t) => {
              const active = tool === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-label={`${t.label}（${t.kbd}）`}
                  aria-pressed={active}
                  onClick={() => setTool(t.id)}
                  className={`group/tip relative ${iconBtn} ${active ? 'bg-[#7357ff] text-white hover:bg-[#6146f2] hover:text-white' : ''}`}
                >
                  {active && !reduce && <motion.span layoutId="mpc-tool" className="absolute inset-0 rounded-xl bg-[#7357ff]" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />}
                  <span className="relative">{t.icon}</span>
                  {t.id === 'sticky' && (
                    <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full ring-1 ring-white" style={{ background: SWATCH[stickyColor].dot }} />
                  )}
                  <Tip label={t.label} kbd={t.kbd} />
                </button>
              )
            })}
            <span className="mx-1 h-6 w-px bg-zinc-200" />
            <button type="button" className={`group/tip relative ${iconBtn}`} aria-label="元に戻す" disabled={hist.u === 0} onClick={undo}>
              <Undo2 className="h-[18px] w-[18px]" />
              <Tip label="元に戻す" kbd="⌘Z" />
            </button>
            <button type="button" className={`group/tip relative ${iconBtn}`} aria-label="やり直す" disabled={hist.r === 0} onClick={redo}>
              <Redo2 className="h-[18px] w-[18px]" />
              <Tip label="やり直す" kbd="⇧⌘Z" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
