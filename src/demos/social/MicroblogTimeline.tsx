import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowLeft,
  ArrowUp,
  Bell,
  Bookmark,
  CalendarClock,
  ChartNoAxesColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  EyeOff,
  Feather,
  Globe,
  Heart,
  House,
  Image as ImageIcon,
  Link2,
  ListTodo,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  PenLine,
  Plus,
  Repeat2,
  Search,
  Share,
  Smile,
  User as UserIcon,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'

/**
 * マイクロブログ(X/Twitter風)のタイムライン。サービス名「Murmur」・ロゴ・ユーザー・投稿・画像はすべて架空のオリジナル。
 * - ルートを @container にして、置かれた幅でレイアウトを切り替える。狭いと下部タブバー + 投稿ボタン(FAB)、
 *   576px〜 で左のアイコンレール、896px〜 で右カラム(検索・トレンド・おすすめユーザー)、1152px〜 でレールにラベルが付く
 * - 色はテーマ(デフォルト/ダークブルー/ブラック)とアクセント色を CSS 変数で持ち、Tailwind の任意値 bg-[var(--bg)] などで参照する。
 *   「表示をカスタマイズ」ダイアログで切り替えると全体が transition-colors で移り変わる
 * - 投稿欄はテキストエリアと、同じ文字を色付けしたミラーを grid の同じセルに重ねる方式。ミラーが高さを決めるので自動で伸び、
 *   #ハッシュタグ・@メンション・URL と上限超過部分(赤い背景)が入力中に色付く。文字数は全角2・URL 23 の重み付きで 280 まで、
 *   残り20で SVG のリングが黄色く大きくなり残数を表示、超えると赤でマイナス表示
 * - いいねはハートが弾み、リングと粒が飛ぶバースト。件数は @number-flow/react で桁が回る(1.2万 などの日本語の短縮表記)。
 *   リポストは小さなメニュー(リポスト/引用)、ブックマークと共有はトースト。アンケートは投票すると結果バーが伸びる
 * - 数秒ごとに「新しいポストを表示」のピル(投稿者のアバター重ね)が現れ、押すと先頭へスクロールして新着が高さアニメで差し込まれる
 * - ポストを押すと詳細がスライドで重なる(下の画面は残したままなのでスクロール位置が保たれる)。返信は縦の線でつながり、返信を開くと
 *   さらに重なって祖先ポストが上に並ぶ。Esc か ← で戻る
 * - アバターや名前に 0.45 秒ホバーするとプロフィールカード。フォローボタンはホバーで「フォロー解除」に変わる
 * - アバターと投稿画像(朝焼け・夜景・山並み・ラテ・猫・ラーメン・紅葉)はすべてインライン SVG で描画し、外部画像は使わない
 * - useReducedMotion 時はスライドやバーストをやめ、短いフェードだけにする
 */

/* ───────────── テーマ ───────────── */

type ThemeId = 'light' | 'dim' | 'black'

const THEMES: Record<ThemeId, { label: string; swatch: string; vars: Record<string, string> }> = {
  light: {
    label: 'デフォルト',
    swatch: '#ffffff',
    vars: {
      '--bg': '#ffffff',
      '--fg': '#0f1419',
      '--sub': '#536471',
      '--line': '#eff3f4',
      '--line2': '#cfd9de',
      '--hover': 'rgba(15,20,25,0.03)',
      '--hover2': 'rgba(15,20,25,0.1)',
      '--panel': '#f7f9f9',
      '--head': 'rgba(255,255,255,0.85)',
      '--card': '#ffffff',
      '--shadow': '0 0 15px rgba(101,119,134,0.2), 0 0 3px 1px rgba(101,119,134,0.15)',
      '--btn': '#0f1419',
      '--btn-fg': '#ffffff',
    },
  },
  dim: {
    label: 'ダークブルー',
    swatch: '#15202b',
    vars: {
      '--bg': '#15202b',
      '--fg': '#f7f9f9',
      '--sub': '#8b98a5',
      '--line': '#38444d',
      '--line2': '#425364',
      '--hover': 'rgba(255,255,255,0.03)',
      '--hover2': 'rgba(247,249,249,0.1)',
      '--panel': '#1e2732',
      '--head': 'rgba(21,32,43,0.8)',
      '--card': '#15202b',
      '--shadow': '0 0 15px rgba(136,153,166,0.2), 0 0 3px 1px rgba(136,153,166,0.15)',
      '--btn': '#eff3f4',
      '--btn-fg': '#0f1419',
    },
  },
  black: {
    label: 'ブラック',
    swatch: '#000000',
    vars: {
      '--bg': '#000000',
      '--fg': '#e7e9ea',
      '--sub': '#71767b',
      '--line': '#2f3336',
      '--line2': '#333639',
      '--hover': 'rgba(255,255,255,0.03)',
      '--hover2': 'rgba(231,233,234,0.1)',
      '--panel': '#16181c',
      '--head': 'rgba(0,0,0,0.68)',
      '--card': '#000000',
      '--shadow': '0 0 15px rgba(255,255,255,0.2), 0 0 3px 1px rgba(255,255,255,0.15)',
      '--btn': '#eff3f4',
      '--btn-fg': '#0f1419',
    },
  },
}

const ACCENTS = [
  { c: '#8b5cf6', label: 'バイオレット' },
  { c: '#3b9cf5', label: 'スカイ' },
  { c: '#14b8a6', label: 'ティール' },
  { c: '#f5a524', label: 'アンバー' },
  { c: '#ff6b57', label: 'コーラル' },
]

const LIKE = '#f91880'
const REPOST = '#00ba7c'
const DANGER = '#f4212e'
const LIMIT = 280

/* ───────────── ユーティリティ ───────────── */

function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0
const useSvgId = () => useId().replace(/[^a-zA-Z0-9_-]/g, '')

const compact = new Intl.NumberFormat('ja-JP', { notation: 'compact', maximumFractionDigits: 1 })
const fmtClock = new Intl.DateTimeFormat('ja-JP', { hour: 'numeric', minute: '2-digit', hour12: true })
const fmtDay = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

function relTime(at: number, now: number) {
  const m = Math.floor((now - at) / 60000)
  if (m < 1) return '今'
  if (m < 60) return `${m}分`
  if (m < 60 * 24) return `${Math.floor(m / 60)}時間`
  const d = new Date(at)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
const absTime = (at: number) => `${fmtClock.format(at)} · ${fmtDay.format(at)}`

/** 全角などは2、URL は長さに関係なく23として数える(上限 280)。超過し始める文字位置も返す */
const URL_RE = /https?:\/\/[^\s]+/g
const isLight = (cp: number) =>
  cp <= 0x10ff || (cp >= 0x2000 && cp <= 0x200d) || (cp >= 0x2010 && cp <= 0x201f) || (cp >= 0x2032 && cp <= 0x2037)
function weigh(text: string) {
  const urls = [...text.matchAll(URL_RE)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length] as const)
  let w = 0
  let cut = -1
  let i = 0
  while (i < text.length) {
    const u = urls.find(([s]) => s === i)
    let add: number
    let len: number
    if (u) {
      add = 23
      len = u[1] - u[0]
    } else {
      const cp = text.codePointAt(i) ?? 0
      len = cp > 0xffff ? 2 : 1
      add = isLight(cp) ? 1 : 2
    }
    if (cut < 0 && w + add > LIMIT) cut = i
    w += add
    i += len
  }
  return { weight: w, cut: cut < 0 ? text.length : cut }
}

/** #タグ・@メンション・URL で分割(奇数番目がトークン) */
const TOKEN = /(#[\p{L}\p{N}_]+|@[A-Za-z0-9_]+|https?:\/\/[^\s]+)/u
const splitTokens = (text: string) => text.split(TOKEN)

/* ───────────── データ ───────────── */

type FaceAvatar = { kind: 'face'; bg: [string, string]; skin: string; hair: string; style: 0 | 1 | 2 | 3; shirt: string; glasses?: boolean }
type MarkAvatar = { kind: 'mark'; bg: [string, string]; glyph: 'cup' | 'weather' | 'logo' }
type CatAvatar = { kind: 'cat'; bg: [string, string] }
type AvatarSpec = FaceAvatar | MarkAvatar | CatAvatar

type User = {
  id: string
  name: string
  handle: string
  badge?: 'accent' | 'gold'
  bio: string
  following: number
  followers: number
  avatar: AvatarSpec
}

type SceneKind = 'sunset' | 'city' | 'mountain' | 'latte' | 'cat' | 'ramen' | 'leaves'
const SCENE_KINDS: SceneKind[] = ['sunset', 'city', 'mountain', 'latte', 'cat', 'ramen', 'leaves']
const SCENE_ALT: Record<SceneKind, string> = {
  sunset: '朝焼けの海',
  city: '夜の街',
  mountain: '山並み',
  latte: 'ラテアート',
  cat: '窓辺の猫',
  ramen: 'ラーメン',
  leaves: '紅葉',
}

type Poll = { options: string[]; votes: number[]; mine?: number; ends: string }

type Post = {
  id: string
  uid: string
  text: string
  at: number
  media?: SceneKind[]
  quote?: string
  poll?: Poll
  replyTo?: string
  replies: number
  reposts: number
  likes: number
  views: number
  liked?: boolean
  reposted?: boolean
  bookmarked?: boolean
}

type Tab = 'forYou' | 'following'
type FeedEntry = { id: string; thread?: string; by?: string }

const ME = 'me'

const USERS: Record<string, User> = {
  me: {
    id: ME,
    name: 'ハル',
    handle: 'haru_codes',
    bio: 'つくって、ならべて、ためしてる。UI が好き。',
    following: 312,
    followers: 486,
    avatar: { kind: 'face', bg: ['#fde68a', '#8b5cf6'], skin: '#f3d2bb', hair: '#1f2937', style: 0, shirt: '#0ea5e9' },
  },
  mio: {
    id: 'mio',
    name: '灯野ミオ',
    handle: 'mio_tono',
    badge: 'accent',
    bio: '海と街の写真。早起きは得意じゃないけど、朝焼けは好き。',
    following: 402,
    followers: 28400,
    avatar: { kind: 'face', bg: ['#ffb38a', '#ff6f91'], skin: '#f6d7c3', hair: '#2b2233', style: 1, shirt: '#4f6d9a' },
  },
  kaito: {
    id: 'kaito',
    name: '椎名カイト',
    handle: 'kaito_dev',
    badge: 'accent',
    bio: 'フロントエンド / CSS と型が好き / 毎朝コーヒー2杯',
    following: 980,
    followers: 15200,
    avatar: { kind: 'face', bg: ['#7dd3fc', '#6366f1'], skin: '#efc7a8', hair: '#1f1b24', style: 0, shirt: '#1f2937', glasses: true },
  },
  nagi: {
    id: 'nagi',
    name: '凪',
    handle: 'nagi_sketch',
    bio: 'イラストを描いています。猫と秋が好き。お仕事のご相談は DM へ',
    following: 210,
    followers: 9300,
    avatar: { kind: 'face', bg: ['#fde68a', '#f472b6'], skin: '#f8dcc8', hair: '#5b3a29', style: 3, shirt: '#7c3aed' },
  },
  cafe: {
    id: 'cafe',
    name: '喫茶ミルラ',
    handle: 'myrrh_cafe',
    badge: 'gold',
    bio: '路地裏の小さな喫茶店。月曜定休。(架空のお店です)',
    following: 88,
    followers: 6400,
    avatar: { kind: 'mark', bg: ['#8d5b3d', '#c08552'], glyph: 'cup' },
  },
  weather: {
    id: 'weather',
    name: 'そらもよう気象',
    handle: 'soramoyou_wx',
    badge: 'gold',
    bio: '空のようすを、毎日わかりやすく。(架空の気象アカウントです)',
    following: 12,
    followers: 182000,
    avatar: { kind: 'mark', bg: ['#38bdf8', '#2563eb'], glyph: 'weather' },
  },
  rin: {
    id: 'rin',
    name: '七瀬りん',
    handle: 'rin_nanase',
    bio: '大学生 / 週末は電車でどこかへ',
    following: 520,
    followers: 1200,
    avatar: { kind: 'face', bg: ['#a7f3d0', '#34d399'], skin: '#f7d6c0', hair: '#3b2a20', style: 2, shirt: '#f97316' },
  },
  gen: {
    id: 'gen',
    name: '源さん',
    handle: 'gen_ramen',
    bio: '一日一杯。スープは残す派(健康のため)',
    following: 150,
    followers: 3400,
    avatar: { kind: 'face', bg: ['#fca5a5', '#ef4444'], skin: '#e9b993', hair: '#9ca3af', style: 0, shirt: '#111827', glasses: true },
  },
  aya: {
    id: 'aya',
    name: '綾瀬アヤ',
    handle: 'aya_pm',
    badge: 'accent',
    bio: 'プロダクトマネージャー。決めることと、決めないことを決める仕事。',
    following: 640,
    followers: 21800,
    avatar: { kind: 'face', bg: ['#c4b5fd', '#818cf8'], skin: '#f2cfb6', hair: '#121016', style: 1, shirt: '#0f766e' },
  },
  kuro: {
    id: 'kuro',
    name: 'くろまめ',
    handle: 'kuromame_cat',
    bio: 'くろい ねこです。ごはんは 1日 4かい ほしい',
    following: 3,
    followers: 54000,
    avatar: { kind: 'cat', bg: ['#fcd34d', '#fb923c'] },
  },
  murmur: {
    id: 'murmur',
    name: 'Murmur公式',
    handle: 'murmur',
    badge: 'gold',
    bio: 'Murmur の公式アカウント。新機能やお知らせを発信します。(架空のサービスです)',
    following: 0,
    followers: 1200000,
    avatar: { kind: 'mark', bg: ['#8b5cf6', '#4c1d95'], glyph: 'logo' },
  },
  lumi: {
    id: 'lumi',
    name: 'ルミ・カナタ',
    handle: 'lumi_kanata',
    badge: 'accent',
    bio: 'UIデザイナー / 余白とタイポグラフィ',
    following: 300,
    followers: 8800,
    avatar: { kind: 'face', bg: ['#99f6e4', '#06b6d4'], skin: '#f5d5bf', hair: '#c2410c', style: 3, shirt: '#1e293b' },
  },
  oto: {
    id: 'oto',
    name: '音無ソウ',
    handle: 'oto_sou',
    bio: '宅録で音楽をつくっています',
    following: 410,
    followers: 5600,
    avatar: { kind: 'face', bg: ['#ddd6fe', '#a855f7'], skin: '#eec6a6', hair: '#0f172a', style: 0, shirt: '#334155' },
  },
}
const BY_HANDLE = Object.fromEntries(Object.values(USERS).map((u) => [u.handle, u]))

const BOOT = Date.now()
type Seed = Omit<Post, 'at'> & { ago: number }
const seed = (
  id: string,
  uid: string,
  ago: number,
  text: string,
  [replies, reposts, likes, views]: [number, number, number, number],
  extra: Partial<Post> = {},
): Seed => ({ id, uid, ago, text, replies, reposts, likes, views, ...extra })

const SEEDS: Seed[] = [
  seed('p1', 'mio', 12, 'まだ誰もいない朝5時の海。\nこの時間しか見られない色がある。 #朝焼け #写真好きな人と繋がりたい', [24, 312, 4821, 98000], { media: ['sunset'] }),
  seed('p2', 'kaito', 38, ':has() とコンテナクエリを組み合わせたら、親コンポーネント側のレイアウト分岐がほぼ消えた。\nレイアウトは「画面幅」じゃなく「置かれた場所」で決める時代 https://murmur.example/notes/container-queries', [41, 220, 1830, 64000]),
  seed('p3', 'aya', 75, 'チームの定例、何分がちょうどいい？', [88, 45, 302, 41000], {
    poll: { options: ['15分', '30分', '45分', '話すことがあるときだけ'], votes: [412, 980, 120, 1630], ends: '18時間' },
  }),
  seed('p4', 'nagi', 120, 'この秋に描いた3枚。どれが好きですか？\nイラストのお仕事も受け付けています🍁', [63, 540, 7200, 120000], { media: ['leaves', 'cat', 'mountain'] }),
  seed('p5', 'cafe', 180, '本日の限定は「栗とほうじ茶のラテ」です。\nラテアートは店主の気分で、ハートか木の葉になります。', [12, 40, 690, 23000], { media: ['latte'] }),
  seed('p6', 'rin', 210, 'このミオさんの写真を見て、来週の旅行先が決まった @mio_tono', [3, 2, 88, 4100], { quote: 'p1' }),
  seed('p7', 'gen', 260, '今日の一杯。背脂少なめ、麺かため。\nこの湯気のために平日を生きている #ラーメン', [15, 33, 920, 18000], { media: ['ramen'] }),
  seed('p8', 'kuro', 300, 'にんげんが ぱそこんの うえに すわるなと いうので まどに すわっている', [210, 3400, 28000, 410000], { media: ['cat'] }),
  seed('aya1', 'aya', 420, 'プロダクトの仕様書でいちばん大事なのは「やらないこと」の欄だと思っている。', [20, 150, 1400, 52000]),
  seed('aya2', 'aya', 418, '書いておくと、議論が「何を作るか」から「なぜ作らないか」に移る。結果として、スコープが自然に守られる。', [8, 60, 980, 30000], { replyTo: 'aya1' }),
  seed('p9', 'weather', 480, '【週末の天気】関東は土曜の朝まで雨。日曜は晴れて空気が澄み、富士山が見えるかもしれません。夜は冷えるので上着を一枚どうぞ。 #週末の天気', [30, 1100, 5200, 260000]),
  seed('p10', 'murmur', 1500, '【新機能】下書きが端末をまたいで同期されるようになりました。書きかけのポストは、左メニューの「下書き」から開けます。', [420, 2100, 12000, 1500000]),
  // フォロー中
  seed('f1', 'lumi', 25, '同じ文章でも、行間を1.5倍から1.75倍にしただけで「読もう」という気持ちが変わる。 #デザイン', [9, 80, 760, 15000]),
  seed('f2', 'mio', 55, '今月のお気に入り4枚。どれも歩いて見つけた景色です。', [30, 400, 5100, 87000], { media: ['city', 'mountain', 'sunset', 'leaves'] }),
  seed('f3', 'rin', 95, '新幹線の窓から富士山が見えた！！窓側の席を取った自分を褒めたい', [6, 12, 340, 7200]),
  seed('f4', 'kaito', 160, '型が通った瞬間の「勝った」感、何年やっても飽きない', [22, 130, 2400, 39000]),
  seed('f5', 'oto', 230, '夜のベランダで録った環境音。聴き返したら遠くで電車の音が入っていて、それがいちばん良かった', [4, 18, 410, 8800]),
  // 返信
  seed('r1', 'rin', 10, 'この色、ほぼ撮って出しですか？', [1, 0, 45, 1800], { replyTo: 'p1' }),
  seed('r1a', 'mio', 9, 'ほぼそのままです！ホワイトバランスだけ少し暖かめにしてます☀️', [0, 0, 60, 1500], { replyTo: 'r1' }),
  seed('r2', 'gen', 8, '早起きは三文の徳って、こういうことか', [0, 0, 22, 900], { replyTo: 'p1' }),
  seed('r3', 'nagi', 6, 'この空のグラデーション、絵の参考にさせてください…！', [0, 1, 80, 2100], { replyTo: 'p1' }),
  seed('r4', 'aya', 30, 'デザインシステム側で効いてくるやつだ。コンポーネントの props がひとつ減る', [1, 4, 120, 5000], { replyTo: 'p2' }),
  seed('r4a', 'kaito', 28, 'まさに。variant="compact" みたいな props が要らなくなりました', [0, 2, 90, 3000], { replyTo: 'r4' }),
  seed('r5', 'lumi', 20, 'デザイナーとしても嬉しい。置き場所ごとのモックを作らなくて済む', [0, 1, 70, 2600], { replyTo: 'p2' }),
]

/** 返信が用意されていないポストには、定型の返信を2件つける */
const GENERIC = ['わかります…！', 'これは保存しました', '最高すぎる', '朝から元気が出ました', '気になってたやつだ', '参考になります、ありがとうございます']
const REPLIERS = ['rin', 'gen', 'nagi', 'lumi', 'oto', 'kaito']

function buildPosts(): Record<string, Post> {
  const out: Record<string, Post> = {}
  for (const { ago, ...s } of SEEDS) out[s.id] = { ...s, at: BOOT - ago * 60000 }
  const hasReplies = new Set(SEEDS.filter((s) => s.replyTo).map((s) => s.replyTo))
  for (const s of SEEDS) {
    if (s.replyTo || hasReplies.has(s.id)) continue
    const rnd = mulberry32(hash(s.id))
    const who = REPLIERS.filter((u) => u !== s.uid)
    for (let k = 0; k < 2; k++) {
      const id = `${s.id}-g${k}`
      out[id] = {
        id,
        uid: who[Math.floor(rnd() * who.length)],
        text: GENERIC[Math.floor(rnd() * GENERIC.length)],
        at: BOOT - Math.max(1, s.ago - 3 - k * 2) * 60000,
        replyTo: s.id,
        replies: 0,
        reposts: Math.floor(rnd() * 3),
        likes: 3 + Math.floor(rnd() * 40),
        views: 400 + Math.floor(rnd() * 2000),
      }
    }
  }
  return out
}

const INITIAL_FEEDS: Record<Tab, FeedEntry[]> = {
  forYou: [
    { id: 'p1' },
    { id: 'p2' },
    { id: 'p3' },
    { id: 'p4' },
    { id: 'p5' },
    { id: 'p6' },
    { id: 'p7' },
    { id: 'p8' },
    { id: 'aya1', thread: 'aya2' },
    { id: 'p9' },
    { id: 'p10' },
  ],
  following: [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }, { id: 'p2', by: 'lumi' }, { id: 'f4' }, { id: 'p4' }, { id: 'f5' }],
}

/** 「新しいポストを表示」で届く新着(タブごとに波で届く) */
type PoolPost = Omit<Post, 'at'>
const pool = (id: string, uid: string, text: string, media?: SceneKind[]): PoolPost => ({ id, uid, text, media, replies: 0, reposts: 0, likes: 0, views: 12 })
const POOL: Record<Tab, PoolPost[][]> = {
  forYou: [
    [
      pool('n1', 'oto', '新曲のデモ、夜中に録ったら猫の鳴き声が入ってた。残すかどうか本気で迷ってる'),
      pool('n2', 'lumi', '余白は「何もない場所」じゃなくて「目を休ませる場所」。今日の学び。 #デザイン'),
      pool('n3', 'weather', '【観測】東京都心で今季いちばんの冷え込み。けさの最低気温は8.4℃でした。 #木枯らし'),
    ],
    [
      pool('n4', 'mio', '雨上がりの交差点。ネオンが倍になる時間 #夜景', ['city']),
      pool('n5', 'kaito', '@aya_pm 定例は15分派です。話すことがない日は5分で終わるのが理想'),
    ],
  ],
  following: [
    [
      pool('n6', 'nagi', '今日のらくがき。描きながら寝落ちしかけた', ['leaves']),
      pool('n7', 'rin', '駅前の新しいパン屋さん、塩パンが本当においしかった'),
      pool('n8', 'aya', '「あとでやる」を「やらない」と書き直すだけで、気持ちがかなり軽くなる'),
    ],
  ],
}

const TRENDS = [
  { cat: '日本のトレンド', tag: '#秋の夜長', count: '2.4万件のポスト' },
  { cat: 'テクノロジー · トレンド', tag: 'コンテナクエリ', count: '3,120件のポスト' },
  { cat: 'グルメ · トレンド', tag: '栗のラテ', count: '8,410件のポスト' },
  { cat: '天気 · トレンド', tag: '#木枯らし', count: '1.1万件のポスト' },
  { cat: 'エンタメ · トレンド', tag: '#週末なにする', count: '5,602件のポスト' },
]
const SUGGESTED = ['cafe', 'gen', 'weather']

/* ───────────── 共有状態 ───────────── */

type Api = {
  posts: Record<string, Post>
  children: Record<string, string[]>
  now: number
  reduce: boolean
  following: Set<string>
  toggleFollow: (uid: string) => void
  like: (id: string) => void
  repost: (id: string) => void
  bookmark: (id: string) => void
  share: (id: string) => void
  vote: (id: string, i: number) => void
  hide: (id: string) => void
  open: (id: string, focus?: boolean) => void
  quote: (id: string) => void
  openMedia: (media: SceneKind[], i: number) => void
  toast: (text: string) => void
}
const ApiCtx = createContext<Api | null>(null)
function useApi() {
  const api = useContext(ApiCtx)
  if (!api) throw new Error('ApiCtx missing')
  return api
}
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

/* ───────────── ロゴ・アバター・バッジ ───────────── */

function MurmurMark({ size = 30, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="8.5" cy="16" r="3.4" fill="currentColor" />
      <path d="M14.5 8.2 A9.5 9.5 0 0 1 14.5 23.8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M20.5 3.6 A15.6 15.6 0 0 1 20.5 28.4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

function FaceArt({ a }: { a: FaceAvatar }) {
  const ink = '#2b2b33'
  return (
    <>
      {a.style === 1 && <path d="M11 18 C10 9 15 7.4 20 7.4 C25 7.4 30 9 29 18 L30.2 30 C26 32 14 32 9.8 30Z" fill={a.hair} />}
      {a.style === 3 && (
        <path d="M11.2 19 C10.4 10 15 7.6 20 7.6 C25 7.6 29.6 10 28.8 19 L28.9 24.2 C27 25.2 25.4 25 24.8 24.4 L15.2 24.4 C14.6 25 13 25.2 11.1 24.2Z" fill={a.hair} />
      )}
      {a.style === 2 && <circle cx="20" cy="6.6" r="4.2" fill={a.hair} />}
      <rect x="17.4" y="22" width="5.2" height="7" rx="2.2" fill={a.skin} />
      <path d="M5.5 42 C5.5 31.5 12.5 27.2 20 27.2 C27.5 27.2 34.5 31.5 34.5 42Z" fill={a.shirt} />
      <path d="M16.6 27.6 L20 31 L23.4 27.6" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <ellipse cx="20" cy="17.6" rx="7.6" ry="8.4" fill={a.skin} />
      {(a.style === 0 || a.style === 2) && (
        <path d="M12.2 17 C11.4 9.5 16 7.6 20.3 7.8 C25.6 8 29 11.2 27.8 17.2 C26.6 13.6 23.6 12.2 20.4 12.4 C17.2 12.6 14 13.8 12.2 17Z" fill={a.hair} />
      )}
      {a.style === 1 && <path d="M12.3 16.8 C12.6 10.5 16 8.6 20 8.6 C24.4 8.6 27.6 10.8 27.7 16.8 C25.4 14.6 23.8 12.8 22.8 11.6 C20.6 13.9 16.8 15.6 12.3 16.8Z" fill={a.hair} />}
      {a.style === 3 && <path d="M12.3 15.8 C12.5 10.5 16 8.8 20 8.8 C24 8.8 27.5 10.5 27.7 15.8 Z" fill={a.hair} />}
      <circle cx="17.1" cy="18.6" r="0.95" fill={ink} />
      <circle cx="22.9" cy="18.6" r="0.95" fill={ink} />
      <circle cx="15.5" cy="20.9" r="1.3" fill="#ff8a8a" opacity="0.35" />
      <circle cx="24.5" cy="20.9" r="1.3" fill="#ff8a8a" opacity="0.35" />
      <path d="M17.9 21.9 Q20 23.3 22.1 21.9" fill="none" stroke={ink} strokeWidth="0.9" strokeLinecap="round" />
      {a.glasses && (
        <g fill="none" stroke={ink} strokeWidth="0.75">
          <circle cx="17.1" cy="18.6" r="2.4" />
          <circle cx="22.9" cy="18.6" r="2.4" />
          <path d="M19.5 18.4 H20.5" />
        </g>
      )}
    </>
  )
}

function Avatar({ user, size = 40 }: { user: User; size?: number }) {
  const id = useSvgId()
  const a = user.avatar
  const square = a.kind === 'mark'
  return (
    <span
      className={`block shrink-0 overflow-hidden ${square ? 'rounded-[24%]' : 'rounded-full'}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="block">
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={a.bg[0]} />
            <stop offset="1" stopColor={a.bg[1]} />
          </linearGradient>
        </defs>
        <rect width="40" height="40" fill={`url(#${id}g)`} />
        {a.kind === 'face' && <FaceArt a={a} />}
        {a.kind === 'cat' && (
          <>
            <path d="M8 40 C8 31 13 28.5 20 28.5 C27 28.5 32 31 32 40Z" fill="#1d1d22" />
            <path d="M9.6 17 L11.6 5.8 L18.4 12Z M30.4 17 L28.4 5.8 L21.6 12Z" fill="#1d1d22" />
            <path d="M11.4 13.6 L12.3 8.6 L15.4 11.6Z M28.6 13.6 L27.7 8.6 L24.6 11.6Z" fill="#f9a8b8" opacity="0.7" />
            <ellipse cx="20" cy="20" rx="11.4" ry="10" fill="#1d1d22" />
            <ellipse cx="15.8" cy="19.2" rx="2.2" ry="2.6" fill="#ffd54a" />
            <ellipse cx="24.2" cy="19.2" rx="2.2" ry="2.6" fill="#ffd54a" />
            <ellipse cx="15.8" cy="19.4" rx="0.7" ry="1.9" fill="#111" />
            <ellipse cx="24.2" cy="19.4" rx="0.7" ry="1.9" fill="#111" />
            <path d="M19 23 L21 23 L20 24.2Z" fill="#f9a8b8" />
            <path d="M12 24 L6.5 23 M12 25.3 L7 26.4 M28 24 L33.5 23 M28 25.3 L33 26.4" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.6" />
          </>
        )}
        {a.kind === 'mark' && a.glyph === 'cup' && (
          <g fill="none" stroke="#fff7ed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 17 H26 V23 A6.5 6.5 0 0 1 19.5 29.5 H17.5 A6.5 6.5 0 0 1 11 23Z" fill="#fff7ed" stroke="none" />
            <path d="M26 19 H28 A3 3 0 0 1 28 25 H25.5" />
            <path d="M9 32 H29" />
            <path d="M15 13.5 C14 11.5 16 10.5 15 8.5 M19.5 13.5 C18.5 11.5 20.5 10.5 19.5 8.5" opacity="0.8" />
          </g>
        )}
        {a.kind === 'mark' && a.glyph === 'weather' && (
          <>
            <circle cx="24.5" cy="14.5" r="6" fill="#fde047" />
            <path d="M11 29 A5 5 0 0 1 12 19.2 A7 7 0 0 1 25.4 21 A4 4 0 0 1 29 29Z" fill="#ffffff" />
          </>
        )}
        {a.kind === 'mark' && a.glyph === 'logo' && (
          <g transform="translate(5 4) scale(0.95)" className="text-white">
            <MurmurMarkPaths />
          </g>
        )}
      </svg>
    </span>
  )
}
function MurmurMarkPaths() {
  return (
    <>
      <circle cx="8.5" cy="16" r="3.4" fill="#fff" />
      <path d="M14.5 8.2 A9.5 9.5 0 0 1 14.5 23.8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M20.5 3.6 A15.6 15.6 0 0 1 20.5 28.4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </>
  )
}

function Badge({ kind, size = 17 }: { kind?: User['badge']; size?: number }) {
  if (!kind) return null
  const gold = kind === 'gold'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={gold ? '認証済みの組織' : '認証済みアカウント'} className="shrink-0">
      {gold ? (
        <rect x="3" y="3" width="18" height="18" rx="5" fill="#e8b021" />
      ) : (
        <rect x="4.6" y="4.6" width="14.8" height="14.8" rx="4.2" transform="rotate(45 12 12)" fill="var(--accent)" />
      )}
      <path d="M8.4 12.3 L10.9 14.8 L15.8 9.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ───────────── 投稿画像(SVGのイラスト) ───────────── */

type Building = { x: number; w: number; h: number; fill: string; windows: { x: number; y: number; o: number }[] }
const CITY: { stars: { x: number; y: number; r: number }[]; buildings: Building[] } = (() => {
  const r = mulberry32(7)
  const stars = Array.from({ length: 46 }, () => ({ x: r() * 400, y: r() * 150, r: 0.4 + r() * 1.1 }))
  const buildings: Building[] = []
  let x = -10
  while (x < 410) {
    const w = 26 + r() * 32
    const h = 70 + r() * 130
    const windows: Building['windows'] = []
    for (let wy = 300 - h + 10; wy < 282; wy += 11) for (let wx = x + 5; wx < x + w - 6; wx += 8) if (r() < 0.42) windows.push({ x: wx, y: wy, o: 0.45 + r() * 0.55 })
    buildings.push({ x, w, h, fill: ['#0d1230', '#121842', '#171e4f'][Math.floor(r() * 3)], windows })
    x += w + 2
  }
  return { stars, buildings }
})()
const TREES = (() => {
  const r = mulberry32(11)
  return Array.from({ length: 30 }, (_, i) => ({ x: i * 14 - 6 + r() * 8, h: 22 + r() * 26, y: 262 + r() * 18 }))
})()
const MAPLE = (() => {
  const pts: string[] = []
  for (let k = 0; k < 10; k++) {
    const ang = ((-90 + k * 36) * Math.PI) / 180
    const rad = k % 2 ? 0.42 : 1
    pts.push(`${(Math.cos(ang) * rad).toFixed(3)} ${(Math.sin(ang) * rad).toFixed(3)}`)
  }
  return `M${pts.join(' L')}Z`
})()
const LEAVES = (() => {
  const r = mulberry32(23)
  const colors = ['#e2552d', '#f08a24', '#d93a3a', '#f4b33d', '#b8452a', '#f6c343']
  return Array.from({ length: 30 }, () => ({ x: r() * 400, y: r() * 300, s: 12 + r() * 22, rot: r() * 360, c: colors[Math.floor(r() * colors.length)], ginkgo: r() < 0.3 }))
})()

function Scene({ kind }: { kind: SceneKind }) {
  const id = useSvgId()
  const u = (n: string) => `url(#${id}${n})`
  const common = { viewBox: '0 0 400 300', preserveAspectRatio: 'xMidYMid slice', className: 'block h-full w-full', role: 'img', 'aria-label': SCENE_ALT[kind] } as const
  switch (kind) {
    case 'sunset':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#241a4f" />
              <stop offset="0.38" stopColor="#6b2f7c" />
              <stop offset="0.68" stopColor="#e0517a" />
              <stop offset="0.86" stopColor="#ff9e5e" />
              <stop offset="1" stopColor="#ffd37a" />
            </linearGradient>
            <linearGradient id={`${id}sea`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b2f6e" />
              <stop offset="0.4" stopColor="#2a1a4a" />
              <stop offset="1" stopColor="#0e0b24" />
            </linearGradient>
            <radialGradient id={`${id}glow`}>
              <stop offset="0" stopColor="#ffe3a3" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ff9e5e" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="190" fill={u('sky')} />
          <circle cx="255" cy="188" r="95" fill={u('glow')} />
          <circle cx="255" cy="187" r="30" fill="#ffe2a0" />
          <rect y="186" width="400" height="114" fill={u('sea')} />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={255 - (42 - i * 4)} y={192 + i * 10} width={(42 - i * 4) * 2} height="3" rx="1.5" fill="#ffcf8a" opacity={0.75 - i * 0.07} />
          ))}
          {[220, 245, 270].map((y, i) => (
            <path key={y} d={`M0 ${y} Q100 ${y - 4} 200 ${y} T400 ${y}`} stroke="#ffffff" strokeWidth="1" fill="none" opacity={0.1 - i * 0.02} />
          ))}
          <path d="M0 192 C40 166 78 164 110 180 C128 172 150 176 168 192Z" fill="#170f30" />
          <path d="M330 191 C345 182 365 181 400 186 L400 192 L330 192Z" fill="#2a1645" />
          <path d="M120 80 q5 -5 10 0 q5 -5 10 0 M150 98 q3.5 -3.5 7 0 q3.5 -3.5 7 0" stroke="#2a1645" strokeWidth="1.6" fill="none" />
        </svg>
      )
    case 'city':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#070b1f" />
              <stop offset="0.6" stopColor="#1d2557" />
              <stop offset="1" stopColor="#4a3478" />
            </linearGradient>
            <mask id={`${id}moon`}>
              <rect width="400" height="300" fill="#fff" />
              <circle cx="330" cy="50" r="18" fill="#000" />
            </mask>
          </defs>
          <rect width="400" height="300" fill={u('sky')} />
          {CITY.stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.3 + (i % 5) * 0.12} />
          ))}
          <circle cx="320" cy="58" r="20" fill="#f8f1d2" mask={u('moon')} />
          {CITY.buildings.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={300 - b.h} width={b.w} height={b.h} fill={b.fill} />
              {b.windows.map((w, j) => (
                <rect key={j} x={w.x} y={w.y} width="4" height="5" fill="#ffd57a" opacity={w.o} />
              ))}
            </g>
          ))}
          <rect y="286" width="400" height="14" fill="#060818" />
          <rect y="289" width="400" height="2" fill="#ff5d8f" opacity="0.5" />
        </svg>
      )
    case 'mountain':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a8d8ff" />
              <stop offset="1" stopColor="#ffe9cf" />
            </linearGradient>
            <linearGradient id={`${id}mist`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={u('sky')} />
          <circle cx="110" cy="88" r="26" fill="#fff6dd" opacity="0.95" />
          <path d="M0 170 L60 120 L110 150 L170 88 L230 140 L290 105 L360 150 L400 130 L400 300 L0 300Z" fill="#a9bfd8" />
          <path d="M170 88 L151 108 L161 106 L170 113 L179 104 L189 107Z M290 105 L278 118 L290 116 L301 119Z" fill="#fff" opacity="0.9" />
          <path d="M0 200 C50 160 90 170 130 185 C170 150 220 150 260 180 C300 160 350 165 400 185 L400 300 L0 300Z" fill="#7393b5" />
          <rect y="168" width="400" height="70" fill={u('mist')} />
          <path d="M0 240 C60 210 120 220 170 235 C230 210 300 215 400 232 L400 300 L0 300Z" fill="#3f6680" />
          {TREES.map((t, i) => (
            <path key={i} d={`M${t.x} ${t.y} L${t.x + 7} ${t.y - t.h} L${t.x + 14} ${t.y}Z`} fill={i % 3 ? '#24463f' : '#2d5248'} />
          ))}
          <rect y="276" width="400" height="24" fill="#1f3b35" />
        </svg>
      )
    case 'latte':
      return (
        <svg {...common}>
          <defs>
            <radialGradient id={`${id}cof`}>
              <stop offset="0" stopColor="#c48a55" />
              <stop offset="0.8" stopColor="#8f5530" />
              <stop offset="1" stopColor="#6e3d1f" />
            </radialGradient>
          </defs>
          <rect width="400" height="300" fill="#9a6644" />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M0 ${18 + i * 34} C120 ${8 + i * 34} 260 ${30 + i * 34} 400 ${16 + i * 34}`} stroke="#83533a" strokeWidth="3" fill="none" opacity="0.5" />
          ))}
          <ellipse cx="208" cy="160" rx="118" ry="118" fill="#000" opacity="0.18" />
          <circle cx="200" cy="150" r="112" fill="#f4efe8" />
          <circle cx="200" cy="150" r="94" fill="none" stroke="#e5ddd1" strokeWidth="2" />
          <rect x="262" y="139" width="56" height="22" rx="11" fill="#fffaf3" />
          <circle cx="200" cy="150" r="78" fill="#fffaf3" />
          <circle cx="200" cy="150" r="65" fill={u('cof')} />
          <path d="M200 184 C168 162 158 140 171 125 C182 113 196 117 200 130 C204 117 218 113 229 125 C242 140 232 162 200 184Z" fill="#f7ead8" />
          <g transform="translate(200 150) scale(0.62) translate(-200 -150)">
            <path d="M200 184 C168 162 158 140 171 125 C182 113 196 117 200 130 C204 117 218 113 229 125 C242 140 232 162 200 184Z" fill="none" stroke="#c99a6a" strokeWidth="5" />
          </g>
          <path d="M200 130 L200 196" stroke="#f7ead8" strokeWidth="2.5" strokeLinecap="round" />
          <g transform="rotate(-30 120 250)">
            <rect x="56" y="246" width="94" height="7" rx="3.5" fill="#c9ccd3" />
            <ellipse cx="158" cy="249.5" rx="14" ry="9" fill="#d7dae0" />
          </g>
          <circle cx="352" cy="52" r="30" fill="#d9a35f" />
          {[
            [342, 44],
            [360, 58],
            [350, 66],
            [365, 40],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.6" fill="#5b3420" />
          ))}
        </svg>
      )
    case 'cat':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7cc4ff" />
              <stop offset="1" stopColor="#e9f7ff" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill="#f5e1c8" />
          <rect x="90" y="28" width="220" height="192" rx="6" fill={u('sky')} />
          <ellipse cx="150" cy="80" rx="34" ry="12" fill="#fff" opacity="0.9" />
          <ellipse cx="250" cy="120" rx="44" ry="13" fill="#fff" opacity="0.75" />
          <path d="M90 28 H310 V220 H90Z M200 28 V220 M90 124 H310" fill="none" stroke="#fffdf8" strokeWidth="8" />
          <path d="M100 220 L300 220 L360 300 L40 300Z" fill="#fff6dc" opacity="0.45" />
          <rect y="234" width="400" height="66" fill="#d9b48c" />
          <rect x="66" y="218" width="268" height="16" rx="4" fill="#e2c29b" />
          <path d="M108 218 L112 196 L136 196 L140 218Z" fill="#c2643c" />
          <ellipse cx="116" cy="186" rx="7" ry="15" fill="#4f9d69" transform="rotate(-25 116 186)" />
          <ellipse cx="132" cy="184" rx="7" ry="16" fill="#3f8a5a" transform="rotate(20 132 184)" />
          <ellipse cx="124" cy="178" rx="6" ry="17" fill="#58ad74" />
          <ellipse cx="214" cy="186" rx="38" ry="36" fill="#26232b" />
          <circle cx="214" cy="136" r="26" fill="#26232b" />
          <path d="M194 124 L197 98 L211 114Z M234 124 L231 98 L217 114Z" fill="#26232b" />
          <path d="M248 212 C282 214 288 238 262 250" stroke="#26232b" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M190 210 Q214 222 238 210" stroke="#3a3640" strokeWidth="2" fill="none" />
        </svg>
      )
    case 'ramen':
      return (
        <svg {...common}>
          <defs>
            <radialGradient id={`${id}soup`}>
              <stop offset="0" stopColor="#f6cf8a" />
              <stop offset="1" stopColor="#c98a3d" />
            </radialGradient>
            <clipPath id={`${id}clip`}>
              <circle cx="200" cy="155" r="104" />
            </clipPath>
          </defs>
          <rect width="400" height="300" fill="#2b1e18" />
          <g transform="rotate(-18 330 60)">
            <rect x="250" y="40" width="160" height="7" rx="3.5" fill="#d8b98a" />
            <rect x="250" y="56" width="160" height="7" rx="3.5" fill="#cfae7c" />
          </g>
          <circle cx="206" cy="163" r="130" fill="#000" opacity="0.35" />
          <circle cx="200" cy="155" r="128" fill="#b9332b" />
          <circle cx="200" cy="155" r="118" fill="none" stroke="#f1d3a1" strokeWidth="3" strokeDasharray="7 9" />
          <circle cx="200" cy="155" r="106" fill={u('soup')} />
          <g clipPath={u('clip')}>
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d={`M90 ${170 + i * 10} q14 -10 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0`} stroke="#f8e3a4" strokeWidth="6" fill="none" strokeLinecap="round" />
            ))}
          </g>
          <circle cx="150" cy="112" r="30" fill="#c27c55" stroke="#8b4a2e" strokeWidth="5" />
          <path d="M136 106 C146 116 156 100 166 112" stroke="#e8b48f" strokeWidth="3" fill="none" />
          <circle cx="190" cy="96" r="27" fill="#b8704a" stroke="#8b4a2e" strokeWidth="5" />
          <rect x="250" y="68" width="46" height="74" rx="3" fill="#1e2b22" transform="rotate(14 273 105)" />
          <ellipse cx="254" cy="178" rx="30" ry="24" fill="#fffaf0" />
          <circle cx="254" cy="178" r="13" fill="#f59e0b" />
          <circle cx="254" cy="178" r="7" fill="#ea7a0b" />
          <circle cx="132" cy="196" r="18" fill="#fff" />
          <path d="M132 196 m-9 0 a9 9 0 1 0 9 -9 a5 5 0 1 0 -4 8" stroke="#f472b6" strokeWidth="3" fill="none" />
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={176 + (i % 3) * 13} cy={170 + Math.floor(i / 3) * 12} r="4.6" fill="none" stroke="#7cc46b" strokeWidth="2.6" />
          ))}
          <rect x="210" y="210" width="34" height="10" rx="3" fill="#c8a15a" transform="rotate(-20 227 215)" />
          <rect x="200" y="226" width="30" height="9" rx="3" fill="#bf9450" transform="rotate(10 215 230)" />
          {[150, 200, 250].map((x) => (
            <path key={x} d={`M${x} 40 c-10 -12 10 -18 0 -32`} stroke="#fff" strokeWidth="3" fill="none" opacity="0.22" strokeLinecap="round" />
          ))}
        </svg>
      )
    case 'leaves':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff1dc" />
              <stop offset="1" stopColor="#ffcf9e" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={u('bg')} />
          {LEAVES.map((l, i) => (
            <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.s})`}>
              {l.ginkgo ? (
                <path d="M0 0 L-0.95 -0.85 A1.28 1.28 0 0 1 0.95 -0.85 Z M0 0 L0 0.7" fill="#f6c343" stroke="#d9a21f" strokeWidth={0.06} />
              ) : (
                <>
                  <path d={MAPLE} fill={l.c} />
                  <path d="M0 0 L0 1.1" stroke={l.c} strokeWidth={0.08} />
                </>
              )}
            </g>
          ))}
        </svg>
      )
  }
}

/* ───────────── 小さな部品 ───────────── */

function RichText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      {splitTokens(text).map((part, i) => {
        if (i % 2 === 0) return part
        if (part.startsWith('@') && BY_HANDLE[part.slice(1)]) {
          return (
            <UserHover key={i} user={BY_HANDLE[part.slice(1)]} inline>
              <span className="text-[var(--accent)] hover:underline">{part}</span>
            </UserHover>
          )
        }
        const shown = part.startsWith('http') ? part.replace(/^https?:\/\//, '').slice(0, 28) + (part.length > 36 ? '…' : '') : part
        return (
          <span key={i} onClick={stop} className="cursor-pointer text-[var(--accent)] hover:underline">
            {shown}
          </span>
        )
      })}
    </div>
  )
}

function FollowButton({ uid, small = false }: { uid: string; small?: boolean }) {
  const api = useApi()
  const on = api.following.has(uid)
  const size = small ? 'h-8 min-w-[72px] px-3.5 text-[14px]' : 'h-9 min-w-[104px] px-4 text-[15px]'
  return (
    <button
      type="button"
      onClick={(e) => {
        stop(e)
        api.toggleFollow(uid)
      }}
      aria-pressed={on}
      aria-label={on ? `@${USERS[uid].handle} のフォローを解除` : `@${USERS[uid].handle} をフォロー`}
      className={`group/f shrink-0 rounded-full font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${size} ${
        on
          ? 'border border-[var(--line2)] text-[var(--fg)] hover:border-[#f4212e]/50 hover:bg-[#f4212e]/10 hover:text-[#f4212e]'
          : 'bg-[var(--btn)] text-[var(--btn-fg)] hover:opacity-85'
      }`}
    >
      {on ? (
        <>
          <span className="group-hover/f:hidden">フォロー中</span>
          <span className="hidden group-hover/f:inline">解除</span>
        </>
      ) : (
        'フォロー'
      )}
    </button>
  )
}

/** 0.45 秒ホバーで出るプロフィールカード */
function UserHover({ user, children, inline = false, className = '' }: { user: User; children: ReactNode; inline?: boolean; className?: string }) {
  const api = useApi()
  const [open, setOpen] = useState(false)
  const showT = useRef(0)
  const hideT = useRef(0)
  useEffect(
    () => () => {
      clearTimeout(showT.current)
      clearTimeout(hideT.current)
    },
    [],
  )
  const enter = (type: string) => {
    if (type !== 'mouse') return
    clearTimeout(hideT.current)
    showT.current = window.setTimeout(() => setOpen(true), 450)
  }
  const leave = () => {
    clearTimeout(showT.current)
    hideT.current = window.setTimeout(() => setOpen(false), 220)
  }
  const followers = user.followers + (user.id !== ME && api.following.has(user.id) && !INITIAL_FOLLOWING.has(user.id) ? 1 : 0) - (user.id !== ME && !api.following.has(user.id) && INITIAL_FOLLOWING.has(user.id) ? 1 : 0)
  return (
    <span
      className={`relative ${inline ? 'inline' : 'inline-flex min-w-0'} ${className}`}
      onPointerEnter={(e) => enter(e.pointerType)}
      onPointerLeave={leave}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: api.reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={stop}
            className="absolute top-full left-0 z-50 mt-2 w-[290px] cursor-default rounded-2xl bg-[var(--card)] p-4 text-left text-[15px] leading-5 font-normal whitespace-normal text-[var(--fg)] [box-shadow:var(--shadow)]"
          >
            <div className="flex items-start justify-between">
              <Avatar user={user} size={64} />
              {user.id !== ME && <FollowButton uid={user.id} />}
            </div>
            <div className="mt-2 flex items-center gap-1 font-bold">
              {user.name}
              <Badge kind={user.badge} />
            </div>
            <div className="text-[var(--sub)]">@{user.handle}</div>
            <p className="mt-3">{user.bio}</p>
            <div className="mt-3 flex gap-4 text-[14px] text-[var(--sub)]">
              <span>
                <b className="text-[var(--fg)]">{user.following.toLocaleString()}</b> フォロー中
              </span>
              <span>
                <b className="text-[var(--fg)]">
                  <NumberFlow value={followers} format={{ notation: 'compact', maximumFractionDigits: 1 }} locales="ja-JP" />
                </b>{' '}
                フォロワー
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

type MenuItem = { icon: ReactNode; label: string; onSelect: () => void; danger?: boolean }
function Menu({ items, onClose, align = 'right' }: { items: MenuItem[]; onClose: () => void; align?: 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null)
  const api = useApi()
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('keydown', key, true)
    ref.current?.querySelector('button')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('keydown', key, true)
    }
  }, [onClose])
  return (
    <motion.div
      ref={ref}
      role="menu"
      initial={{ opacity: 0, scale: api.reduce ? 1 : 0.94, y: api.reduce ? 0 : -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
      onClick={stop}
      className={`absolute top-full z-50 mt-1 min-w-[230px] overflow-hidden rounded-xl bg-[var(--card)] py-1 text-[15px] [box-shadow:var(--shadow)] ${
        align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
      }`}
    >
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          role="menuitem"
          onClick={() => {
            it.onSelect()
            onClose()
          }}
          className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-[var(--fg)] hover:bg-[var(--hover)] focus-visible:bg-[var(--hover2)] focus-visible:outline-none"
          style={it.danger ? { color: DANGER } : undefined}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </motion.div>
  )
}

function ActionBtn({
  label,
  color,
  icon,
  count,
  active,
  onClick,
  expanded,
  children,
  className = 'flex',
}: {
  label: string
  color: string
  icon: ReactNode
  count?: number
  active?: boolean
  onClick?: (e: ReactMouseEvent) => void
  expanded?: boolean
  children?: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={count ? `${label} ${count.toLocaleString()}件` : label}
      aria-pressed={active}
      aria-expanded={expanded}
      onClick={(e) => {
        stop(e)
        onClick?.(e)
      }}
      className={`group/act relative ${className} items-center text-[13px] text-[var(--sub)] transition-colors hover:text-[var(--c)] focus-visible:outline-none`}
      style={{ '--c': color, color: active ? color : undefined } as CSSProperties}
    >
      <span className="relative grid h-[34px] w-[34px] place-items-center rounded-full transition-colors group-hover/act:bg-[color-mix(in_srgb,var(--c)_13%,transparent)] group-focus-visible/act:ring-2 group-focus-visible/act:ring-[var(--c)]">
        {icon}
        {children}
      </span>
      {count !== undefined && <span className="min-w-[3ch] pl-0.5 text-left tabular-nums">{count > 0 && <NumberFlow value={count} format={{ notation: 'compact', maximumFractionDigits: 1 }} locales="ja-JP" />}</span>}
    </button>
  )
}

const BURST_COLORS = [LIKE, '#ffb02e', '#8b5cf6', '#22c55e', '#38bdf8', LIKE, '#ffb02e', '#a855f7']
function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      <motion.span
        className="absolute h-7 w-7 rounded-full border-[3px]"
        style={{ borderColor: LIKE }}
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={{ scale: 1.55, opacity: 0, borderWidth: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
      {BURST_COLORS.map((c, i) => {
        const a = (i / BURST_COLORS.length) * Math.PI * 2 - Math.PI / 2
        return (
          <motion.span
            key={i}
            className="absolute h-[5px] w-[5px] rounded-full"
            style={{ background: c }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(a) * 19, y: Math.sin(a) * 19, scale: 0.2, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0.7, 0.3, 1], delay: 0.08 }}
          />
        )
      })}
    </span>
  )
}

function LikeButton({ post, size }: { post: Post; size: number }) {
  const api = useApi()
  const [burst, setBurst] = useState(0)
  return (
    <ActionBtn
      label={post.liked ? 'いいねを取り消す' : 'いいね'}
      color={LIKE}
      active={post.liked}
      count={post.likes}
      onClick={() => {
        if (!post.liked && !api.reduce) setBurst((b) => b + 1)
        api.like(post.id)
      }}
      icon={
        <motion.span
          key={post.liked ? 'on' : 'off'}
          initial={post.liked && !api.reduce ? { scale: 0.3 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 560, damping: 13 }}
          className="grid place-items-center"
        >
          <Heart size={size} fill={post.liked ? 'currentColor' : 'none'} />
        </motion.span>
      }
    >
      {burst > 0 && <Burst key={burst} />}
    </ActionBtn>
  )
}

function ActionBar({ post, big = false, onReply }: { post: Post; big?: boolean; onReply?: () => void }) {
  const api = useApi()
  const [menu, setMenu] = useState(false)
  const close = useCallback(() => setMenu(false), [])
  const sz = big ? 22 : 18.5
  return (
    <div className={`flex items-center justify-between ${big ? 'py-1' : '-ml-2 mt-1 max-w-[450px]'}`}>
      <ActionBtn label="返信" color="var(--accent)" icon={<MessageCircle size={sz} />} count={post.replies} onClick={() => (onReply ? onReply() : api.open(post.id, true))} />
      <div className="relative">
        <ActionBtn
          label={post.reposted ? 'リポスト済み' : 'リポスト'}
          color={REPOST}
          active={post.reposted}
          expanded={menu}
          icon={<Repeat2 size={sz} />}
          count={post.reposts}
          onClick={() => setMenu((m) => !m)}
        />
        <AnimatePresence>
          {menu && (
            <Menu
              align="left"
              onClose={close}
              items={[
                { icon: <Repeat2 size={18} />, label: post.reposted ? 'リポストを取り消す' : 'リポスト', onSelect: () => api.repost(post.id) },
                { icon: <PenLine size={18} />, label: '引用', onSelect: () => api.quote(post.id) },
              ]}
            />
          )}
        </AnimatePresence>
      </div>
      <LikeButton post={post} size={sz} />
      <ActionBtn label="表示回数" color="var(--accent)" icon={<ChartNoAxesColumn size={sz} />} count={post.views} onClick={() => api.toast(`表示回数 ${post.views.toLocaleString()}回`)} />
      <div className="flex">
        <ActionBtn
          label={post.bookmarked ? 'ブックマークから削除' : 'ブックマーク'}
          color="var(--accent)"
          active={post.bookmarked}
          className={big ? 'flex' : 'hidden @sm:flex'}
          icon={<Bookmark size={sz} fill={post.bookmarked ? 'currentColor' : 'none'} />}
          onClick={() => api.bookmark(post.id)}
        />
        <ActionBtn label="共有" color="var(--accent)" icon={<Share size={sz - 1} />} onClick={() => api.share(post.id)} />
      </div>
    </div>
  )
}

function MediaGrid({ media }: { media: SceneKind[] }) {
  const api = useApi()
  const n = media.length
  const layout =
    n === 1 ? 'aspect-[16/10] grid-cols-1' : n === 2 ? 'aspect-[16/9] grid-cols-2' : 'aspect-[16/9] grid-cols-2 grid-rows-2'
  return (
    <div className={`mt-3 grid gap-0.5 overflow-hidden rounded-2xl border border-[var(--line)] ${layout}`}>
      {media.map((m, i) => (
        <button
          key={`${m}-${i}`}
          type="button"
          aria-label={`画像を拡大: ${SCENE_ALT[m]}`}
          onClick={(e) => {
            stop(e)
            api.openMedia(media, i)
          }}
          className={`relative min-h-0 overflow-hidden transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] ${n === 3 && i === 0 ? 'row-span-2' : ''}`}
        >
          <Scene kind={m} />
        </button>
      ))}
    </div>
  )
}

function PollView({ post }: { post: Post }) {
  const api = useApi()
  const poll = post.poll
  if (!poll) return null
  const total = poll.votes.reduce((a, b) => a + b, 0)
  const voted = poll.mine !== undefined
  const top = Math.max(...poll.votes)
  return (
    <div className="mt-3 space-y-1.5" onClick={stop}>
      {poll.options.map((o, i) =>
        voted ? (
          <div key={o} className="relative flex h-8 items-center justify-between overflow-hidden rounded-md px-3 text-[15px]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-md"
              style={{ background: poll.votes[i] === top ? 'color-mix(in srgb, var(--accent) 38%, transparent)' : 'var(--line)' }}
              initial={{ width: 0 }}
              animate={{ width: `${(poll.votes[i] / total) * 100}%` }}
              transition={api.reduce ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 18, delay: i * 0.05 }}
            />
            <span className={`relative flex items-center gap-1.5 ${poll.votes[i] === top ? 'font-bold' : ''}`}>
              {o}
              {poll.mine === i && <Check size={16} className="text-[var(--fg)]" aria-label="あなたの投票" />}
            </span>
            <span className={`relative tabular-nums ${poll.votes[i] === top ? 'font-bold' : ''}`}>
              <NumberFlow value={poll.votes[i] / total} format={{ style: 'percent', maximumFractionDigits: 1 }} locales="ja-JP" />
            </span>
          </div>
        ) : (
          <button
            key={o}
            type="button"
            onClick={() => api.vote(post.id, i)}
            className="flex h-8 w-full items-center justify-center rounded-full border border-[var(--accent)] text-[15px] font-bold text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {o}
          </button>
        ),
      )}
      <div className="pt-1 text-[14px] text-[var(--sub)]">
        <NumberFlow value={total} locales="ja-JP" />
        票 · 残り{poll.ends}
      </div>
    </div>
  )
}

function QuoteCard({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const api = useApi()
  const q = api.posts[id]
  if (!q) return null
  const u = USERS[q.uid]
  return (
    <div
      role="link"
      tabIndex={onRemove ? -1 : 0}
      onClick={(e) => {
        stop(e)
        if (!onRemove) api.open(q.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !onRemove) {
          stop(e)
          api.open(q.id)
        }
      }}
      className={`relative mt-3 overflow-hidden rounded-2xl border border-[var(--line2)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${onRemove ? '' : 'cursor-pointer hover:bg-[var(--hover)]'}`}
    >
      <div className="px-3 pt-3">
        <div className="flex min-w-0 items-center gap-1 text-[15px]">
          <Avatar user={u} size={20} />
          <span className="truncate pl-1 font-bold">{u.name}</span>
          <Badge kind={u.badge} size={15} />
          <span className="truncate text-[var(--sub)]">@{u.handle}</span>
          <span className="text-[var(--sub)]">·</span>
          <span className="shrink-0 text-[var(--sub)]">{relTime(q.at, api.now)}</span>
        </div>
        <RichText text={q.text} className="mt-1 line-clamp-3 pb-3 text-[15px] leading-5" />
      </div>
      {q.media?.[0] && (
        <div className="aspect-[16/8] border-t border-[var(--line)]">
          <Scene kind={q.media[0]} />
        </div>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label="引用をやめる"
          onClick={(e) => {
            stop(e)
            onRemove()
          }}
          className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur hover:bg-black/80"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

/* ───────────── ポスト ───────────── */

function MoreMenu({ post, allowHide }: { post: Post; allowHide: boolean }) {
  const api = useApi()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const u = USERS[post.uid]
  const items: MenuItem[] = []
  if (allowHide) items.push({ icon: <EyeOff size={18} />, label: 'このポストに興味がない', onSelect: () => api.hide(post.id) })
  if (post.uid !== ME) {
    const on = api.following.has(post.uid)
    items.push({ icon: on ? <UserMinus size={18} /> : <UserPlus size={18} />, label: `@${u.handle}さんを${on ? 'フォロー解除' : 'フォロー'}`, onSelect: () => api.toggleFollow(post.uid) })
  }
  items.push({ icon: <Link2 size={18} />, label: 'リンクをコピー', onSelect: () => api.share(post.id) })
  return (
    <div className="relative">
      <ActionBtn label="もっと見る" color="var(--accent)" icon={<Ellipsis size={18} />} expanded={open} onClick={() => setOpen((o) => !o)} />
      <AnimatePresence>{open && <Menu items={items} onClose={close} />}</AnimatePresence>
    </div>
  )
}

function PostRow({
  post,
  repostBy,
  lineAbove,
  lineBelow,
  allowHide = false,
  showReplyTo = false,
}: {
  post: Post
  repostBy?: string
  lineAbove?: boolean
  lineBelow?: boolean
  allowHide?: boolean
  showReplyTo?: boolean
}) {
  const api = useApi()
  const u = USERS[post.uid]
  const openSelf = () => {
    if (window.getSelection()?.toString()) return
    api.open(post.id)
  }
  return (
    <article
      tabIndex={0}
      aria-label={`${u.name}さんのポスト`}
      onClick={openSelf}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) openSelf()
      }}
      className={`relative cursor-pointer px-4 pt-3 transition-colors hover:bg-[var(--hover)] focus-visible:bg-[var(--hover)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] ${
        lineBelow ? '' : 'border-b border-[var(--line)] pb-1'
      }`}
    >
      {repostBy && (
        <div className="-mt-1 mb-1 flex items-center gap-3 pl-[26px] text-[13px] font-bold text-[var(--sub)]">
          <Repeat2 size={15} />
          {USERS[repostBy].name}さんがリポストしました
        </div>
      )}
      <div className="flex gap-3">
        <div className="relative flex w-10 shrink-0 flex-col items-center">
          {lineAbove && <span className="absolute -top-3 h-2 w-0.5 bg-[var(--line2)]" />}
          <UserHover user={u}>
            <Avatar user={u} />
          </UserHover>
          {lineBelow && <span className="mt-1 -mb-0 w-0.5 flex-1 bg-[var(--line2)]" />}
        </div>
        <div className={`min-w-0 flex-1 ${lineBelow ? 'pb-3' : ''}`}>
          <div className="flex min-w-0 items-center gap-1 text-[15px] leading-5">
            <UserHover user={u} className="shrink">
              <span className="truncate font-bold hover:underline">{u.name}</span>
            </UserHover>
            <Badge kind={u.badge} />
            <span className="min-w-0 truncate text-[var(--sub)]">@{u.handle}</span>
            <span className="text-[var(--sub)]">·</span>
            <time className="shrink-0 text-[var(--sub)] hover:underline" title={absTime(post.at)}>
              {relTime(post.at, api.now)}
            </time>
            <div className="-my-2 -mr-2 ml-auto shrink-0">
              <MoreMenu post={post} allowHide={allowHide} />
            </div>
          </div>
          {showReplyTo && post.replyTo && api.posts[post.replyTo] && (
            <div className="text-[15px] text-[var(--sub)]">
              返信先: <span className="text-[var(--accent)]">@{USERS[api.posts[post.replyTo].uid].handle}</span>
            </div>
          )}
          {post.text && <RichText text={post.text} className="text-[15px] leading-5" />}
          {post.media && <MediaGrid media={post.media} />}
          {post.poll && <PollView post={post} />}
          {post.quote && <QuoteCard id={post.quote} />}
          <ActionBar post={post} />
        </div>
      </div>
    </article>
  )
}

/* ───────────── 投稿欄 ───────────── */

const EMOJIS = ['😊', '😂', '🥹', '😍', '🤔', '👏', '🙏', '🔥', '✨', '🎉', '☕', '🍁']

function CharRing({ remaining }: { remaining: number }) {
  const used = LIMIT - remaining
  const p = Math.min(used / LIMIT, 1)
  const warn = remaining <= 20
  const over = remaining < 0
  const color = over ? DANGER : warn ? '#ffd400' : 'var(--accent)'
  const R = 9
  const C = 2 * Math.PI * R
  return (
    <div className="relative grid h-[30px] w-[30px] place-items-center" aria-live="polite" aria-label={`残り${remaining}文字`}>
      {remaining > -10 && (
        <motion.svg viewBox="0 0 24 24" width="22" height="22" className="-rotate-90" animate={{ scale: warn ? 1.36 : 1 }} transition={{ type: 'spring', stiffness: 420, damping: 24 }}>
          <circle cx="12" cy="12" r={R} fill="none" stroke="var(--line2)" strokeWidth="2" />
          <circle
            cx="12"
            cy="12"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - p)}
            style={{ transition: 'stroke-dashoffset 0.15s, stroke 0.2s' }}
          />
        </motion.svg>
      )}
      {warn && (
        <span className="absolute text-[11px] tabular-nums" style={{ color: over ? DANGER : 'var(--sub)' }}>
          {remaining}
        </span>
      )}
    </div>
  )
}

function Composer({
  placeholder,
  submitLabel,
  onSubmit,
  quoteId,
  onClearQuote,
  focusKey = 0,
  replyTo,
}: {
  placeholder: string
  submitLabel: string
  onSubmit: (text: string, media: SceneKind[]) => void
  quoteId?: string | null
  onClearQuote?: () => void
  focusKey?: number
  replyTo?: string
}) {
  const api = useApi()
  const [text, setText] = useState('')
  const [media, setMedia] = useState<SceneKind[]>([])
  const [active, setActive] = useState(false)
  const [emoji, setEmoji] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)
  const closeEmoji = useCallback(() => setEmoji(false), [])
  useEffect(() => {
    if (focusKey > 0) {
      ta.current?.focus({ preventScroll: true })
      setActive(true)
    }
  }, [focusKey])

  const { weight, cut } = useMemo(() => weigh(text), [text])
  const remaining = LIMIT - weight
  const can = (text.trim().length > 0 || media.length > 0 || !!quoteId) && remaining >= 0
  const submit = () => {
    if (!can) return
    onSubmit(text.trim(), media)
    setText('')
    setMedia([])
    ta.current?.blur()
    setActive(false)
  }
  const insert = (s: string) => {
    const el = ta.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = text.slice(0, start) + s + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el?.focus({ preventScroll: true })
      el?.setSelectionRange(start + s.length, start + s.length)
    })
  }
  const addImage = () => {
    if (media.length >= 4) return
    const used = new Set(media)
    const next = SCENE_KINDS.find((k, i) => !used.has(k) && i >= (hash(text) + media.length) % SCENE_KINDS.length) ?? SCENE_KINDS.find((k) => !used.has(k))
    if (next) setMedia([...media, next])
  }
  const soon = () => api.toast('このデモでは画像と絵文字が使えます')
  const ok = text.slice(0, cut)
  const over = text.slice(cut)
  const reply = !!replyTo

  return (
    <div className={`flex gap-3 px-4 ${reply ? 'border-b border-[var(--line)] pt-1 pb-2' : 'border-b border-[var(--line)] pt-3 pb-2'}`}>
      <Avatar user={USERS[ME]} />
      <div className="min-w-0 flex-1">
        {reply && active && (
          <div className="pt-1 text-[15px] text-[var(--sub)]">
            返信先: <span className="text-[var(--accent)]">@{USERS[api.posts[replyTo]?.uid ?? ME].handle}</span>
          </div>
        )}
        <div className={`grid ${reply ? 'text-[17px] leading-6' : 'text-[19px] leading-6'}`}>
          <div aria-hidden className="pointer-events-none col-start-1 row-start-1 py-2 break-words whitespace-pre-wrap text-[var(--fg)]">
            {splitTokens(ok).map((p, i) =>
              i % 2 ? (
                <span key={i} className="text-[var(--accent)]">
                  {p}
                </span>
              ) : (
                p
              ),
            )}
            {over && <mark className="rounded-sm bg-[#f4212e]/30 text-[var(--fg)]">{over}</mark>}
            {'​'}
          </div>
          <textarea
            ref={ta}
            rows={1}
            value={text}
            aria-label={placeholder}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setActive(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                submit()
              }
            }}
            className="col-start-1 row-start-1 resize-none overflow-hidden bg-transparent py-2 break-words whitespace-pre-wrap text-transparent caret-[var(--fg)] outline-none placeholder:text-[var(--sub)] selection:bg-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
          />
        </div>
        {quoteId && <QuoteCard id={quoteId} onRemove={onClearQuote} />}
        {media.length > 0 && (
          <div className={`mt-2 grid gap-2 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <AnimatePresence initial={false}>
              {media.map((m) => (
                <motion.div
                  key={m}
                  layout={!api.reduce}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className={`relative overflow-hidden rounded-2xl ${media.length === 1 ? 'aspect-[16/10]' : 'aspect-square'}`}
                >
                  <Scene kind={m} />
                  <button
                    type="button"
                    aria-label="画像を削除"
                    onClick={() => setMedia(media.filter((x) => x !== m))}
                    className="absolute top-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur hover:bg-black/80"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        {active && !reply && (
          <div className="-ml-2 border-b border-[var(--line)] pt-1 pb-2">
            <button type="button" onClick={soon} className="flex items-center gap-1 rounded-full px-3 py-0.5 text-[14px] font-bold text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
              <Globe size={15} /> 全員が返信できます
            </button>
          </div>
        )}
        <div className={`flex items-center justify-between ${active || !reply ? 'pt-2' : ''}`}>
          <div className={`-ml-2 flex items-center text-[var(--accent)] ${reply && !active ? 'hidden' : ''}`}>
            <ToolBtn label="画像" onClick={addImage} disabled={media.length >= 4}>
              <ImageIcon size={19} />
            </ToolBtn>
            <ToolBtn label="アンケート" onClick={soon} className="hidden @md:grid">
              <ListTodo size={19} />
            </ToolBtn>
            <div className="relative">
              <ToolBtn label="絵文字" onClick={() => setEmoji((v) => !v)} expanded={emoji}>
                <Smile size={19} />
              </ToolBtn>
              <AnimatePresence>
                {emoji && (
                  <EmojiPicker
                    onClose={closeEmoji}
                    onPick={(e) => {
                      insert(e)
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
            <ToolBtn label="予約設定" onClick={soon} className="hidden @lg:grid">
              <CalendarClock size={19} />
            </ToolBtn>
            <ToolBtn label="位置情報" onClick={soon} className="hidden @lg:grid">
              <MapPin size={19} />
            </ToolBtn>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {text.length > 0 && (
              <>
                <CharRing remaining={remaining} />
                {!reply && (
                  <>
                    <span className="h-[30px] w-px bg-[var(--line2)]" />
                    <button
                      type="button"
                      aria-label="スレッドにポストを追加"
                      onClick={soon}
                      className="grid h-6 w-6 place-items-center rounded-full border border-[var(--line2)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                    >
                      <Plus size={15} />
                    </button>
                  </>
                )}
              </>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!can}
              className="h-9 rounded-full bg-[var(--accent)] px-4 text-[15px] font-bold text-white transition-[opacity,filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 disabled:hover:brightness-100"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ label, onClick, children, disabled, expanded, className = 'grid' }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean; expanded?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
      className={`${className} h-[34px] w-[34px] place-items-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const api = useApi()
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('keydown', key, true)
    }
  }, [onClose])
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: api.reduce ? 0 : -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="absolute top-full left-0 z-50 mt-1 grid w-[216px] grid-cols-6 gap-0.5 rounded-xl bg-[var(--card)] p-2 [box-shadow:var(--shadow)]"
    >
      {EMOJIS.map((e) => (
        <button key={e} type="button" aria-label={`${e} を入力`} onClick={() => onPick(e)} className="grid h-8 w-8 place-items-center rounded-lg text-[20px] hover:bg-[var(--hover2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
          {e}
        </button>
      ))}
    </motion.div>
  )
}

/* ───────────── 詳細 ───────────── */

function FocalPost({ post, lineAbove, onReply }: { post: Post; lineAbove: boolean; onReply: () => void }) {
  const api = useApi()
  const u = USERS[post.uid]
  return (
    <article aria-label={`${u.name}さんのポスト`} className="px-4 pt-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          {lineAbove && <span className="absolute -top-3 left-[19px] h-2 w-0.5 bg-[var(--line2)]" />}
          <UserHover user={u}>
            <Avatar user={u} />
          </UserHover>
        </div>
        <div className="min-w-0 flex-1 leading-5">
          <div className="flex items-center gap-1 text-[15px] font-bold">
            <UserHover user={u} className="shrink">
              <span className="truncate hover:underline">{u.name}</span>
            </UserHover>
            <Badge kind={u.badge} />
          </div>
          <div className="truncate text-[15px] text-[var(--sub)]">@{u.handle}</div>
        </div>
        {u.id !== ME && <FollowButton uid={u.id} small />}
        <div className="-mr-2">
          <MoreMenu post={post} allowHide={false} />
        </div>
      </div>
      {post.replyTo && api.posts[post.replyTo] && (
        <div className="mt-3 text-[15px] text-[var(--sub)]">
          返信先: <span className="text-[var(--accent)]">@{USERS[api.posts[post.replyTo].uid].handle}</span>
        </div>
      )}
      {post.text && <RichText text={post.text} className="mt-3 text-[17px] leading-6" />}
      {post.media && <MediaGrid media={post.media} />}
      {post.poll && <PollView post={post} />}
      {post.quote && <QuoteCard id={post.quote} />}
      <div className="border-b border-[var(--line)] py-4 text-[15px] text-[var(--sub)]">
        <time className="hover:underline">{absTime(post.at)}</time> · <b className="text-[var(--fg)]">{compact.format(post.views)}</b> 件の表示
      </div>
      <div className="border-b border-[var(--line)]">
        <ActionBar post={post} big onReply={onReply} />
      </div>
    </article>
  )
}

function DetailPanel({ id, focus, onBack, onReply }: { id: string; focus: boolean; onBack: () => void; onReply: (parent: string, text: string, media: SceneKind[]) => void }) {
  const api = useApi()
  const post = api.posts[id]
  const [focusKey, setFocusKey] = useState(focus ? 1 : 0)
  const backRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!focus) backRef.current?.focus({ preventScroll: true })
  }, [focus])
  const chain: Post[] = []
  for (let a = post?.replyTo ? api.posts[post.replyTo] : undefined; a; a = a.replyTo ? api.posts[a.replyTo] : undefined) chain.unshift(a)
  const replies = api.children[id] ?? []
  if (!post) return null
  return (
    <>
      <div className="sticky top-0 z-20 flex h-[53px] items-center gap-6 bg-[var(--head)] px-2 backdrop-blur-md">
        <button
          type="button"
          ref={backRef}
          aria-label="戻る"
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--hover2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-[20px] font-bold">ポスト</h2>
      </div>
      {chain.map((p, i) => (
        <PostRow key={p.id} post={p} lineAbove={i > 0} lineBelow />
      ))}
      <FocalPost post={post} lineAbove={chain.length > 0} onReply={() => setFocusKey((k) => k + 1)} />
      <Composer placeholder="返信をポスト" submitLabel="返信" replyTo={id} focusKey={focusKey} onSubmit={(t, m) => onReply(id, t, m)} />
      <AnimatePresence initial={false}>
        {replies.map((rid) => {
          const r = api.posts[rid]
          const child = api.children[rid]?.[0]
          return (
            <motion.div
              key={rid}
              initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
              animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
              transition={{ duration: api.reduce ? 0.15 : 0.35, ease: [0.32, 0.72, 0, 1] }}
            >
              <PostRow post={r} lineBelow={!!child} />
              {child && <PostRow post={api.posts[child]} lineAbove />}
            </motion.div>
          )
        })}
      </AnimatePresence>
      {replies.length === 0 && <p className="px-4 py-10 text-center text-[15px] text-[var(--sub)]">まだ返信はありません。最初の返信をしてみましょう。</p>}
      <div className="h-24" />
    </>
  )
}

/* ───────────── 画面全体 ───────────── */

const INITIAL_FOLLOWING = new Set(['mio', 'kaito', 'aya', 'rin', 'lumi', 'oto', 'nagi'])
type StackItem = { id: string; focus: boolean; key: number; opener: HTMLElement | null }

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])
  return now
}

const NAV = [
  { icon: House, label: 'ホーム', key: 'home' },
  { icon: Search, label: '話題を検索', key: 'search' },
  { icon: Bell, label: '通知', key: 'notify', badge: 3 },
  { icon: Mail, label: 'メッセージ', key: 'mail' },
  { icon: Bookmark, label: 'ブックマーク', key: 'bookmark' },
  { icon: Users, label: 'コミュニティ', key: 'community' },
  { icon: UserIcon, label: 'プロフィール', key: 'profile' },
  { icon: Palette, label: '表示', key: 'display' },
] as const

export function MicroblogTimeline() {
  const reduce = !!useReducedMotion()
  const now = useNow()
  const [theme, setTheme] = useState<ThemeId>('black')
  const [accent, setAccent] = useState(ACCENTS[0].c)
  const [posts, setPosts] = useState(buildPosts)
  const [feeds, setFeeds] = useState(INITIAL_FEEDS)
  const [fresh, setFresh] = useState<Set<string>>(() => new Set())
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [tab, setTab] = useState<Tab>('forYou')
  const [stack, setStack] = useState<StackItem[]>([])
  const [following, setFollowing] = useState(() => new Set(INITIAL_FOLLOWING))
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [lightbox, setLightbox] = useState<{ media: SceneKind[]; i: number } | null>(null)
  const [display, setDisplay] = useState(false)
  const [pending, setPending] = useState<{ tab: Tab; wave: number } | null>(null)
  const [quoteDraft, setQuoteDraft] = useState<string | null>(null)
  const [focusSignal, setFocusSignal] = useState(0)
  const [search, setSearch] = useState('')
  const waves = useRef<Record<Tab, number>>({ forYou: 0, following: 0 })
  const feedRef = useRef<HTMLDivElement>(null)
  const keyRef = useRef(0)
  const tabsId = useId()

  const children = useMemo(() => {
    const c: Record<string, string[]> = {}
    for (const p of Object.values(posts)) if (p.replyTo) (c[p.replyTo] ??= []).push(p.id)
    for (const k in c)
      c[k].sort((a, b) => {
        const pa = posts[a]
        const pb = posts[b]
        if ((pa.uid === ME) !== (pb.uid === ME)) return pa.uid === ME ? -1 : 1
        return pa.uid === ME ? pb.at - pa.at : pb.likes - pa.likes
      })
    return c
  }, [posts])

  const showToast = useCallback((text: string) => setToast({ id: Date.now(), text }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const patch = useCallback((id: string, f: (p: Post) => Partial<Post>) => setPosts((ps) => ({ ...ps, [id]: { ...ps[id], ...f(ps[id]) } })), [])
  const scrollFeedTop = useCallback(() => feedRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }), [reduce])

  const api: Api = {
    posts,
    children,
    now,
    reduce,
    following,
    toggleFollow: (uid) =>
      setFollowing((s) => {
        const n = new Set(s)
        if (n.has(uid)) n.delete(uid)
        else n.add(uid)
        return n
      }),
    like: (id) => patch(id, (p) => ({ liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) })),
    repost: (id) => patch(id, (p) => ({ reposted: !p.reposted, reposts: p.reposts + (p.reposted ? -1 : 1) })),
    bookmark: (id) => {
      const on = !posts[id].bookmarked
      patch(id, () => ({ bookmarked: on }))
      showToast(on ? 'ブックマークに追加しました' : 'ブックマークから削除しました')
    },
    share: (id) => {
      navigator.clipboard?.writeText(`https://murmur.example/${USERS[posts[id].uid].handle}/status/${id}`).catch(() => {})
      showToast('リンクをコピーしました')
    },
    vote: (id, i) => patch(id, (p) => (p.poll ? { poll: { ...p.poll, mine: i, votes: p.poll.votes.map((v, k) => (k === i ? v + 1 : v)) } } : {})),
    hide: (id) => {
      setHidden((s) => new Set(s).add(id))
      showToast('このポストを表示しないようにしました')
    },
    open: (id, focus = false) => {
      const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setStack((s) => (s.at(-1)?.id === id ? s : [...s, { id, focus, key: ++keyRef.current, opener }]))
    },
    quote: (id) => {
      setStack([])
      setQuoteDraft(id)
      scrollFeedTop()
      setFocusSignal((n) => n + 1)
    },
    openMedia: (media, i) => setLightbox({ media, i }),
    toast: showToast,
  }

  // 新着: しばらくすると「新しいポストを表示」が出る
  useEffect(() => {
    if (pending) return
    const w = waves.current[tab]
    if (w >= POOL[tab].length) return
    const t = setTimeout(() => setPending({ tab, wave: w }), w === 0 ? 6000 : 16000)
    return () => clearTimeout(t)
  }, [tab, pending])

  const reveal = () => {
    if (!pending) return
    const { tab: t, wave: w } = pending
    const batch = POOL[t][w]
    waves.current[t] = w + 1
    setPending(null)
    scrollFeedTop()
    setTimeout(
      () => {
        const at = Date.now()
        setPosts((ps) => ({ ...ps, ...Object.fromEntries(batch.map((b, i) => [b.id, { ...b, at: at - i * 45000 }])) }))
        setFeeds((f) => ({ ...f, [t]: [...batch.map((b) => ({ id: b.id })), ...f[t]] }))
        setFresh((s) => new Set([...s, ...batch.map((b) => b.id)]))
      },
      reduce ? 0 : 280,
    )
  }

  const switchTab = (t: Tab) => {
    if (t === tab) return scrollFeedTop()
    setTab(t)
    setPending(null)
    feedRef.current?.scrollTo({ top: 0 })
  }

  const submitPost = (text: string, media: SceneKind[]) => {
    const id = `me-${Date.now()}`
    setPosts((ps) => ({ ...ps, [id]: { id, uid: ME, text, at: Date.now(), media: media.length ? media : undefined, quote: quoteDraft ?? undefined, replies: 0, reposts: 0, likes: 0, views: 0 } }))
    setFeeds((f) => ({ ...f, [tab]: [{ id }, ...f[tab]] }))
    setFresh((s) => new Set(s).add(id))
    setQuoteDraft(null)
    showToast('ポストを送信しました')
  }
  const submitReply = (parent: string, text: string, media: SceneKind[]) => {
    const id = `me-r-${Date.now()}`
    setPosts((ps) => ({
      ...ps,
      [parent]: { ...ps[parent], replies: ps[parent].replies + 1 },
      [id]: { id, uid: ME, text, at: Date.now(), media: media.length ? media : undefined, replyTo: parent, replies: 0, reposts: 0, likes: 0, views: 0 },
    }))
    showToast('返信を送信しました')
  }
  /** 詳細を閉じ、開いたときの要素(ポストやボタン)へフォーカスを戻す */
  const popTo = (index: number) => {
    const opener = stack[index]?.opener
    setStack(stack.slice(0, index))
    requestAnimationFrame(() => opener?.isConnected && opener.focus({ preventScroll: true }))
  }
  const startCompose = () => {
    setStack([])
    scrollFeedTop()
    setFocusSignal((n) => n + 1)
  }
  const goHome = () => {
    setStack([])
    scrollFeedTop()
  }

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (lightbox) {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox((l) => l && { ...l, i: (l.i + 1) % l.media.length })
      if (e.key === 'ArrowLeft') setLightbox((l) => l && { ...l, i: (l.i - 1 + l.media.length) % l.media.length })
      return
    }
    if (e.key !== 'Escape') return
    if (display) setDisplay(false)
    else if (stack.length) popTo(stack.length - 1)
  }

  const entries = feeds[tab].filter((e) => !hidden.has(e.id) && posts[e.id])
  const pendingBatch = pending && pending.tab === tab && !stack.length ? POOL[pending.tab][pending.wave] : null
  const slide = { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.38 } as const
  const vars = { ...THEMES[theme].vars, '--accent': accent } as CSSProperties
  const scrollCls = '[scrollbar-color:var(--line2)_transparent] [scrollbar-width:thin]'

  return (
    <ApiCtx.Provider value={api}>
      <div
        onKeyDown={onKeyDown}
        style={vars}
        className="@container relative flex h-full w-full justify-center overflow-hidden bg-[var(--bg)] font-['Noto_Sans_JP',Inter,sans-serif] text-[var(--fg)] transition-colors duration-300"
      >
        {/* 左レール */}
        <nav aria-label="メインメニュー" className={`hidden h-full w-[72px] shrink-0 flex-col items-center gap-0.5 overflow-y-auto px-2 py-1 @xl:flex @6xl:w-[244px] @6xl:items-stretch ${scrollCls}`}>
          <button type="button" aria-label="Murmur ホーム" onClick={goHome} className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-[var(--fg)] hover:bg-[var(--hover2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
            <MurmurMark size={30} className="text-[var(--accent)]" />
          </button>
          {NAV.map(({ icon: Icon, label, key, ...rest }) => {
            const badge = 'badge' in rest ? rest.badge : 0
            const activeItem = key === 'home'
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-current={activeItem ? 'page' : undefined}
                onClick={() => (key === 'display' ? setDisplay(true) : key === 'home' ? goHome() : showToast(`「${label}」はこのデモでは省略しています`))}
                className="group/nav flex shrink-0 items-center rounded-full focus-visible:outline-none"
              >
                <span className="flex items-center gap-5 rounded-full p-3 transition-colors group-hover/nav:bg-[var(--hover2)] group-focus-visible/nav:ring-2 group-focus-visible/nav:ring-[var(--accent)] @6xl:pr-6">
                  <span className="relative">
                    <Icon size={26} strokeWidth={activeItem ? 2.6 : 1.9} />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold text-white ring-2 ring-[var(--bg)]">{badge}</span>
                    )}
                  </span>
                  <span className={`hidden text-[20px] @6xl:inline ${activeItem ? 'font-bold' : ''}`}>{label}</span>
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={startCompose}
            aria-label="ポストする"
            className="mt-3 grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white shadow-lg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] @6xl:w-[90%] @6xl:text-[17px] @6xl:font-bold"
          >
            <Feather size={22} className="@6xl:hidden" />
            <span className="hidden @6xl:inline">ポストする</span>
          </button>
          <div className="flex-1" />
          <button type="button" onClick={() => setDisplay(true)} aria-label="アカウントと表示の設定" className="my-2 flex shrink-0 items-center gap-3 rounded-full p-2.5 hover:bg-[var(--hover2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
            <Avatar user={USERS[ME]} />
            <span className="hidden min-w-0 flex-1 text-left leading-5 @6xl:block">
              <span className="block truncate text-[15px] font-bold">{USERS[ME].name}</span>
              <span className="block truncate text-[15px] text-[var(--sub)]">@{USERS[ME].handle}</span>
            </span>
            <Ellipsis size={18} className="hidden @6xl:block" />
          </button>
        </nav>

        {/* 中央カラム */}
        <main className="relative h-full min-w-0 flex-1 overflow-hidden border-[var(--line)] @xl:max-w-[600px] @xl:border-x">
          <motion.div
            ref={feedRef}
            inert={stack.length > 0}
            animate={{ x: stack.length && !reduce ? '-22%' : 0, opacity: stack.length ? 0.5 : 1 }}
            transition={slide}
            className={`absolute inset-0 overflow-y-auto pb-16 @xl:pb-0 ${scrollCls}`}
          >
            <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--head)] backdrop-blur-md">
              <div className="flex h-[53px] items-center justify-between px-4 @xl:hidden">
                <button type="button" aria-label="表示の設定" onClick={() => setDisplay(true)} className="rounded-full focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
                  <Avatar user={USERS[ME]} size={32} />
                </button>
                <MurmurMark size={28} className="text-[var(--accent)]" />
                <button type="button" aria-label="表示をカスタマイズ" onClick={() => setDisplay(true)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--hover2)]">
                  <Palette size={19} />
                </button>
              </div>
              <div role="tablist" aria-label="タイムライン" className="flex h-[53px]">
                {(
                  [
                    ['forYou', 'おすすめ'],
                    ['following', 'フォロー中'],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => switchTab(t)}
                    className={`relative flex flex-1 items-center justify-center text-[15px] transition-colors hover:bg-[var(--hover2)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] ${
                      tab === t ? 'font-bold text-[var(--fg)]' : 'font-medium text-[var(--sub)]'
                    }`}
                  >
                    {label}
                    {tab === t && (
                      <motion.span layoutId={`${tabsId}-tab`} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }} className="absolute bottom-0 h-1 w-14 rounded-full bg-[var(--accent)]" />
                    )}
                  </button>
                ))}
              </div>
            </header>
            <Composer placeholder="いまどうしてる？" submitLabel="ポストする" onSubmit={submitPost} quoteId={quoteDraft} onClearQuote={() => setQuoteDraft(null)} focusKey={focusSignal} />
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <AnimatePresence initial={false}>
                {entries.map((e) => (
                  <motion.div
                    key={`${e.id}-${e.by ?? ''}`}
                    initial={fresh.has(e.id) ? { height: 0, opacity: 0, overflow: 'hidden' } : false}
                    animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                    exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                    transition={{ duration: reduce ? 0.15 : 0.4, ease: [0.32, 0.72, 0, 1] }}
                  >
                    {e.thread && posts[e.thread] ? (
                      <>
                        <PostRow post={posts[e.id]} lineBelow allowHide />
                        <PostRow post={posts[e.thread]} lineAbove allowHide />
                      </>
                    ) : (
                      <PostRow post={posts[e.id]} repostBy={e.by} allowHide />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <p className="px-4 py-10 text-center text-[14px] text-[var(--sub)]">ここまでのポストをすべて表示しました</p>
            </motion.div>
          </motion.div>

          <AnimatePresence initial={false}>
            {stack.map((s, i) => (
              <motion.div
                key={s.key}
                inert={i < stack.length - 1}
                initial={reduce ? { opacity: 0 } : { x: '100%' }}
                animate={{ x: i < stack.length - 1 && !reduce ? '-22%' : 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { x: '100%' }}
                transition={slide}
                className={`absolute inset-0 overflow-y-auto bg-[var(--bg)] pb-16 shadow-[-16px_0_32px_rgba(0,0,0,0.28)] @xl:pb-0 ${scrollCls}`}
              >
                <DetailPanel id={s.id} focus={s.focus} onBack={() => popTo(i)} onReply={submitReply} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 新着ピル */}
          <div className="pointer-events-none absolute inset-x-0 top-[116px] z-40 flex justify-center @xl:top-[64px]">
            <AnimatePresence>
              {pendingBatch && (
                <motion.button
                  type="button"
                  onClick={reveal}
                  initial={{ opacity: 0, y: reduce ? 0 : -16, scale: reduce ? 1 : 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: reduce ? 0 : -12 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  className="pointer-events-auto flex h-10 items-center gap-2 rounded-full bg-[var(--accent)] pr-4 pl-2 text-[15px] font-bold text-white shadow-[0_6px_20px_rgba(0,0,0,0.35)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <ArrowUp size={17} strokeWidth={2.6} />
                  <span className="flex -space-x-2">
                    {pendingBatch.map((b) => (
                      <span key={b.id} className="rounded-full ring-2 ring-[var(--accent)]">
                        <Avatar user={USERS[b.uid]} size={24} />
                      </span>
                    ))}
                  </span>
                  新しいポストを表示
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* 右カラム */}
        <aside aria-label="おすすめ" className={`hidden h-full w-[290px] shrink-0 flex-col gap-4 overflow-y-auto pr-3 pb-6 pl-5 @4xl:flex @5xl:w-[340px] @5xl:pr-4 @5xl:pl-6 ${scrollCls}`}>
          <div className="sticky top-0 z-10 bg-[var(--bg)] pt-1.5 pb-1">
            <label className="relative block">
              <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--sub)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="検索"
                aria-label="検索"
                className="h-11 w-full rounded-full border border-transparent bg-[var(--panel)] pr-4 pl-11 text-[15px] text-[var(--fg)] outline-none placeholder:text-[var(--sub)] focus:border-[var(--accent)] focus:bg-[var(--bg)]"
              />
            </label>
          </div>
          <section className="shrink-0 overflow-hidden rounded-2xl border border-[var(--line)]">
            <h2 className="px-4 pt-3 pb-1 text-[20px] font-extrabold">トレンド</h2>
            {TRENDS.map((t) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => setSearch(t.tag)}
                className="flex w-full items-start justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--hover)] focus-visible:bg-[var(--hover)] focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block text-[13px] text-[var(--sub)]">{t.cat}</span>
                  <span className="block truncate text-[15px] font-bold">{t.tag}</span>
                  <span className="block text-[13px] text-[var(--sub)]">{t.count}</span>
                </span>
                <Ellipsis size={17} className="mt-0.5 shrink-0 text-[var(--sub)]" />
              </button>
            ))}
            <button type="button" onClick={() => showToast('トレンドの一覧はこのデモでは省略しています')} className="w-full px-4 py-4 text-left text-[15px] text-[var(--accent)] hover:bg-[var(--hover)]">
              さらに表示
            </button>
          </section>
          <section className="shrink-0 rounded-2xl border border-[var(--line)]">
            <h2 className="px-4 pt-3 pb-1 text-[20px] font-extrabold">おすすめユーザー</h2>
            {SUGGESTED.map((uid) => {
              const u = USERS[uid]
              return (
                <div key={uid} className="flex items-center gap-2.5 px-3 py-3 transition-colors hover:bg-[var(--hover)] @5xl:gap-3 @5xl:px-4">
                  <UserHover user={u}>
                    <Avatar user={u} />
                  </UserHover>
                  <div className="min-w-0 flex-1 leading-5">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[15px] font-bold">{u.name}</span>
                      <Badge kind={u.badge} size={16} />
                    </div>
                    <div className="truncate text-[15px] text-[var(--sub)]">@{u.handle}</div>
                  </div>
                  <FollowButton uid={uid} small />
                </div>
              )
            })}
          </section>
          <p className="px-4 text-[13px] leading-5 text-[var(--sub)]">
            利用規約 · プライバシー · Cookie · アクセシビリティ · 広告情報
            <br />© 2026 Murmur(架空のサービス)
          </p>
        </aside>

        {/* 狭い幅: 下部タブと投稿ボタン */}
        <nav aria-label="メインメニュー" className="absolute inset-x-0 bottom-0 z-40 flex h-[52px] items-center justify-around border-t border-[var(--line)] bg-[var(--head)] backdrop-blur-md @xl:hidden">
          {NAV.slice(0, 4).map(({ icon: Icon, label, key, ...rest }) => {
            const badge = 'badge' in rest ? rest.badge : 0
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                onClick={() => (key === 'home' ? goHome() : showToast(`「${label}」はこのデモでは省略しています`))}
                className="relative grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--hover2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <Icon size={24} strokeWidth={key === 'home' ? 2.6 : 1.9} />
                {badge > 0 && <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">{badge}</span>}
              </button>
            )
          })}
        </nav>
        <button
          type="button"
          aria-label="ポストする"
          onClick={startCompose}
          className="absolute right-4 bottom-[68px] z-40 grid h-14 w-14 place-items-center rounded-full bg-[var(--accent)] text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] @xl:hidden"
        >
          <Feather size={24} />
        </button>

        {/* トースト */}
        <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-[76px] z-[80] flex justify-center @xl:bottom-6">
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: reduce ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : 8 }}
                className="rounded-md bg-[var(--accent)] px-4 py-3 text-[15px] font-medium text-white shadow-[0_6px_20px_rgba(0,0,0,0.3)]"
              >
                {toast.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 画像の拡大 */}
        <AnimatePresence>
          {lightbox && (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="画像"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
              className="absolute inset-0 z-[90] grid place-items-center bg-black/90"
            >
              <button type="button" autoFocus aria-label="閉じる" onClick={() => setLightbox(null)} className="absolute top-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white">
                <X size={20} />
              </button>
              <motion.div
                key={lightbox.i}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={stop}
                className="aspect-[4/3] w-[min(86%,calc((100%-40px)*4/3))] max-w-[820px] overflow-hidden rounded-md"
                style={{ maxHeight: 'calc(100% - 80px)' }}
              >
                <Scene kind={lightbox.media[lightbox.i]} />
              </motion.div>
              {lightbox.media.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="前の画像"
                    onClick={(e) => {
                      stop(e)
                      setLightbox({ ...lightbox, i: (lightbox.i - 1 + lightbox.media.length) % lightbox.media.length })
                    }}
                    className="absolute top-1/2 left-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    aria-label="次の画像"
                    onClick={(e) => {
                      stop(e)
                      setLightbox({ ...lightbox, i: (lightbox.i + 1) % lightbox.media.length })
                    }}
                    className="absolute top-1/2 right-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <ChevronRight size={22} />
                  </button>
                  <span className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-[13px] text-white tabular-nums">
                    {lightbox.i + 1} / {lightbox.media.length}
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 表示をカスタマイズ */}
        <AnimatePresence>
          {display && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDisplay(false)}
              className="absolute inset-0 z-[90] grid place-items-center overflow-y-auto bg-[rgba(91,112,131,0.4)] p-4"
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${tabsId}-display`}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.95, y: reduce ? 0 : 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                onClick={stop}
                className="w-full max-w-[560px] rounded-2xl bg-[var(--bg)] px-5 py-6 text-center shadow-2xl transition-colors duration-300 @xl:px-10"
              >
                <h2 id={`${tabsId}-display`} className="text-[22px] font-extrabold">
                  表示をカスタマイズ
                </h2>
                <p className="mt-2 text-[15px] text-[var(--sub)]">これらの設定は、このデモ内のすべての画面に反映されます。</p>
                <div className="mt-4 flex gap-3 rounded-2xl border border-[var(--line)] px-4 py-3 text-left">
                  <Avatar user={USERS.murmur} />
                  <div className="min-w-0 text-[15px] leading-5">
                    <div className="flex items-center gap-1">
                      <b>Murmur公式</b>
                      <Badge kind="gold" />
                      <span className="truncate text-[var(--sub)]">@murmur · 10分</span>
                    </div>
                    <p className="mt-0.5">
                      ここにあるのはMurmurのタイムラインの見本です。<span className="text-[var(--accent)]">#アクセント</span>の色や背景をお好みで選んでください。
                    </p>
                  </div>
                </div>
                <h3 className="mt-5 mb-2 text-left text-[13px] font-bold text-[var(--sub)]">カラー</h3>
                <div className="flex justify-around rounded-2xl bg-[var(--panel)] py-3">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.c}
                      type="button"
                      aria-label={a.label}
                      aria-pressed={accent === a.c}
                      onClick={() => setAccent(a.c)}
                      className="grid h-10 w-10 place-items-center rounded-full text-white transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fg)]"
                      style={{ background: a.c }}
                    >
                      {accent === a.c && <Check size={22} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
                <h3 className="mt-5 mb-2 text-left text-[13px] font-bold text-[var(--sub)]">背景</h3>
                <div role="radiogroup" aria-label="背景" className="grid grid-cols-1 gap-2 rounded-2xl bg-[var(--panel)] p-2 @md:grid-cols-3">
                  {(Object.keys(THEMES) as ThemeId[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={theme === t}
                      onClick={() => setTheme(t)}
                      className="flex h-14 items-center gap-2.5 rounded-md px-3 text-[15px] font-bold whitespace-nowrap transition-[border-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                      style={{
                        background: THEMES[t].swatch,
                        color: THEMES[t].vars['--fg'],
                        border: `2px solid ${theme === t ? 'var(--accent)' : THEMES[t].vars['--line']}`,
                      }}
                    >
                      <span
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2"
                        style={{ borderColor: theme === t ? 'var(--accent)' : THEMES[t].vars['--sub'], background: theme === t ? 'var(--accent)' : 'transparent' }}
                      >
                        {theme === t && <Check size={12} strokeWidth={4} className="text-white" />}
                      </span>
                      {THEMES[t].label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setDisplay(false)}
                  className="mt-6 h-11 rounded-full bg-[var(--accent)] px-8 text-[15px] font-bold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  完了
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ApiCtx.Provider>
  )
}
