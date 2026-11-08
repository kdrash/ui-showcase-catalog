import NumberFlow from '@number-flow/react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import {
  ArrowBigDown,
  ArrowBigUp,
  ArrowLeft,
  Bell,
  Bookmark,
  CalendarDays,
  Cat,
  Check,
  ChevronDown,
  Clock,
  Compass,
  Ellipsis,
  ExternalLink,
  Flame,
  Gift,
  House,
  Image as ImageIcon,
  Keyboard,
  LayoutList,
  Link2,
  MessageCircle,
  Moon,
  Pin,
  Plus,
  Radio,
  Rows3,
  Search,
  Share2,
  Shield,
  Sprout,
  Sun,
  Tent,
  TrendingUp,
  Trophy,
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
  type KeyboardEvent,
} from 'react'

/**
 * Reddit風のコミュニティ掲示板「Burrow」(サービス名・コミュニティ・ユーザー・投稿・画像はすべて架空)。
 * - ルートを @container にし、幅に応じて 左ナビ(64rem〜)/右サイドバー(48rem〜)/検索欄の表示を切り替える。スクロールはデモ枠の中だけで完結
 * - 配色は CSS 変数(--b-*)だけで持ち、ダーク/ライトの切り替えは変数の差し替え。color-scheme も合わせてネイティブの select を馴染ませる
 * - 投票は投稿・コメント共通の Record<id, -1|0|1>。スコアは @number-flow/react で増減の向きに合わせて桁が転がり、矢印は塗り+弾むキーフレーム
 * - 並び替え(人気=スコア÷経過時間^1.5 / 新着 / トップ+期間 / 急上昇=伸び率)は Motion の layout アニメーションでカードが入れ替わる。
 *   並び順は自分の投票前のスコアで決めるので、投票しただけでは並びが動かない
 * - 投稿を開くと一覧の上に詳細が横からスライドして重なる。一覧のスクロール要素はマウントしたまま inert にするので、戻ったときに位置がそのまま
 * - コメントは入れ子のツリー。左の縦線(またはアバター)を押すとその枝を折りたたみ「+ n件の返信」に。返信・さらに返信を表示・並び替えはツリーを不変更新
 * - アワードはオリジナルの SVG(どんぐり/たき火/一番星)。贈るとチップが弾み、小さな粒が飛び散る
 * - デモ内にフォーカスがあるとき j/k で投稿を移動、a/z で投票、Enter で開く、Esc で戻る。useReducedMotion 時は移動・弾みを省きフェードだけにする
 */

/* ───────────── テーマ ───────────── */

type Theme = 'dark' | 'light'
const THEMES: Record<Theme, CSSProperties> = {
  dark: {
    '--b-bg': '#0a0f11',
    '--b-panel': '#11181b',
    '--b-panel2': '#162024',
    '--b-line': '#223035',
    '--b-hover': '#1a262a',
    '--b-text': '#e3ecec',
    '--b-muted': '#8ca1a4',
    '--b-faint': '#5b6f73',
    '--b-acc': '#2ed3a4',
    '--b-acc-text': '#03130e',
    '--b-acc-soft': 'rgba(46, 211, 164, 0.14)',
    '--b-down': '#a092ff',
    '--b-down-soft': 'rgba(160, 146, 255, 0.15)',
    '--b-shadow': '0 18px 40px -18px rgba(0, 0, 0, 0.7)',
    colorScheme: 'dark',
  } as CSSProperties,
  light: {
    '--b-bg': '#edf2f1',
    '--b-panel': '#ffffff',
    '--b-panel2': '#f5f8f7',
    '--b-line': '#dbe4e2',
    '--b-hover': '#eef3f2',
    '--b-text': '#0f1a1c',
    '--b-muted': '#51666a',
    '--b-faint': '#8b9c9f',
    '--b-acc': '#0a9874',
    '--b-acc-text': '#ffffff',
    '--b-acc-soft': 'rgba(10, 152, 116, 0.11)',
    '--b-down': '#6552e4',
    '--b-down-soft': 'rgba(101, 82, 228, 0.11)',
    '--b-shadow': '0 18px 40px -20px rgba(15, 40, 36, 0.35)',
    colorScheme: 'light',
  } as CSSProperties,
}

/* ───────────── データ ───────────── */

type Vote = -1 | 0 | 1
type AwardId = 'acorn' | 'fire' | 'star'
type FlairId = 'photo' | 'question' | 'poll' | 'tool' | 'food' | 'notice' | 'fail' | 'gear'
type Sort = 'hot' | 'new' | 'top' | 'rising'
type Period = 'day' | 'week' | 'month' | 'all'
type ArtId = 'lake' | 'gyoza'

type PostBase = {
  id: string
  author: string
  ageMin: number
  score: number
  comments: number
  flair: FlairId
  title: string
  velocity: number
  awards: Partial<Record<AwardId, number>>
  pinned?: boolean
  mod?: boolean
}
type PostKind =
  | { kind: 'text'; body: string }
  | { kind: 'image'; art: ArtId; body?: string }
  | { kind: 'link'; url: string; domain: string; body?: string }
  | { kind: 'poll'; body?: string; options: { label: string; votes: number }[]; daysLeft: number }
type Post = PostBase & PostKind

type Comment = {
  id: string
  author: string
  badge?: 'OP' | 'MOD'
  text: string
  score: number
  ageMin: number
  children: Comment[]
  more?: number
}

const ME = 'tanuki_no_ana'
const COMMUNITY = '週末キャンプ部'

const FLAIRS: Record<FlairId, { label: string; tone: string }> = {
  photo: { label: '写真', tone: '#38a8e8' },
  question: { label: '質問', tone: '#e3a21a' },
  poll: { label: 'アンケート', tone: '#9a7cf4' },
  tool: { label: '自作ツール', tone: '#20b47f' },
  food: { label: 'ごはん', tone: '#ec6a7f' },
  notice: { label: 'お知らせ', tone: '#18b39a' },
  fail: { label: '失敗談', tone: '#7d8fa0' },
  gear: { label: 'ギア紹介', tone: '#ec8a3c' },
}

const AWARDS: Record<AwardId, { label: string; note: string }> = {
  acorn: { label: 'どんぐり', note: 'ちょっといいね' },
  fire: { label: 'たき火', note: '心があたたまった' },
  star: { label: '一番星', note: '今日いちばん' },
}

const INITIAL_POSTS: Post[] = [
  {
    id: 'p0',
    author: 'takibi_bugyo',
    mod: true,
    pinned: true,
    ageMin: 60 * 26,
    score: 412,
    comments: 58,
    flair: 'notice',
    title: '【お知らせ】直火禁止エリアの投稿ルールを改定しました',
    velocity: 2,
    awards: { acorn: 3 },
    kind: 'text',
    body:
      '直火禁止のキャンプ場で焚き火をしている写真の投稿が増えています。今後は「焚き火台・焚き火シートの使用が分かる写真」のみ掲載OKとし、判断が難しい投稿にはモデレーターからフレアを付けます。\n\n撤収時の灰の処理方法も、コメントで共有してもらえるとうれしいです。',
  },
  {
    id: 'p1',
    author: 'yamabiko_tent',
    ageMin: 300,
    score: 2841,
    comments: 214,
    flair: 'photo',
    title: '初ソロキャンプ、湖畔で朝を迎えました。寒かったけど一生忘れない景色',
    velocity: 38,
    awards: { star: 2, acorn: 14 },
    kind: 'image',
    art: 'lake',
    body: '標高1,000mの湖畔サイトで、夜は-2℃。寝袋の中で何度も起きたけど、5時40分にテントを開けた瞬間にぜんぶ報われました。',
  },
  {
    id: 'p2',
    author: 'kogarashi99',
    ageMin: 540,
    score: 932,
    comments: 341,
    flair: 'question',
    title: '焚き火台、結局どれに落ち着きました？',
    velocity: 12,
    awards: {},
    kind: 'text',
    body:
      '軽さ重視で薄型を買ったら風に弱くて、薪が燃え尽きる前に灰が飛んでいく…。みんなの「最終的にこれに落ち着いた」を聞きたいです。ソロ〜デュオ想定、車移動です。\n\n予算は1.5万円くらいまで。網を載せて料理もしたいです。',
  },
  {
    id: 'p3',
    author: 'morino_kuma',
    ageMin: 140,
    score: 588,
    comments: 97,
    flair: 'poll',
    title: '冬キャンプ、寝袋の下に何敷いてる？',
    velocity: 22,
    awards: {},
    kind: 'poll',
    body: '底冷え対策の現実解が知りたい。複数使いの人は「一番効いてる」ものに投票してください。',
    daysLeft: 2,
    options: [
      { label: '銀マット＋エアマット', votes: 412 },
      { label: 'インフレーターマット', votes: 655 },
      { label: 'コット', votes: 298 },
      { label: '段ボール（気合い）', votes: 87 },
    ],
  },
  {
    id: 'p4',
    author: 'rindo_walker',
    ageMin: 60 * 20,
    score: 1520,
    comments: 176,
    flair: 'tool',
    title: '林道の通行止め情報を地図にまとめるサイトを作りました（無料・登録なし）',
    velocity: 9,
    awards: { fire: 3 },
    kind: 'link',
    domain: 'rindo-map.example.jp',
    url: 'rindo-map.example.jp/closures',
    body: '自治体ごとにバラバラだった通行止め情報を、毎朝自動で集めて地図に出しています。',
  },
  {
    id: 'p5',
    author: 'hokahoka_sand',
    ageMin: 45,
    score: 1203,
    comments: 88,
    flair: 'food',
    title: 'ホットサンドメーカーで羽根つき餃子を焼いたら優勝した',
    velocity: 41,
    awards: { fire: 1 },
    kind: 'image',
    art: 'gyoza',
    body: '水溶き片栗粉を回し入れて、閉じて弱火で4分。ひっくり返すだけで羽根がきれいに付きます。',
  },
  {
    id: 'p6',
    author: 'ame_otoko_k',
    ageMin: 60 * 50,
    score: 764,
    comments: 129,
    flair: 'fail',
    title: '雨の撤収が地獄だった話と、次から絶対やること5つ',
    velocity: 3,
    awards: { acorn: 6 },
    kind: 'text',
    body:
      '朝から本降り。濡れたフライを丸めて車に積んだら、帰宅後に車内がテントの匂いでいっぱいに。\n\n1. 大きめのゴミ袋を3枚持っていく\n2. インナーから先に撤収する\n3. タープは最後まで張っておく\n4. 帰宅後すぐに干せる場所を確保\n5. そもそも予報を信じる',
  },
  {
    id: 'p7',
    author: 'sorairo_cup',
    ageMin: 60 * 24 * 9,
    score: 321,
    comments: 40,
    flair: 'gear',
    title: '10年使ったチタンマグを並べてみた（焼き色の変化が好き）',
    velocity: 1,
    awards: {},
    kind: 'text',
    body: '最初は銀色だったのが、焚き火で炙るたびに青→紫→金色に。同じものは二度と作れないので、どれも手放せません。',
  },
]

const PERIOD_MIN: Record<Period, number> = { day: 1440, week: 1440 * 7, month: 1440 * 31, all: Infinity }
const PERIOD_LABEL: Record<Period, string> = { day: '今日', week: '今週', month: '今月', all: '全期間' }
const SORTS: { id: Sort; label: string; icon: typeof Flame }[] = [
  { id: 'hot', label: '人気', icon: Flame },
  { id: 'new', label: '新着', icon: Clock },
  { id: 'top', label: 'トップ', icon: Trophy },
  { id: 'rising', label: '急上昇', icon: TrendingUp },
]
type CommentSort = 'best' | 'new' | 'top' | 'contro'
const COMMENT_SORTS: Record<CommentSort, string> = { best: 'ベスト', new: '新しい順', top: 'トップ', contro: '賛否が分かれる' }

const POOL_AUTHORS = ['tabi_no_hoshi', 'shimesaba', 'nemuri_neko', 'kawaguchi_m', 'morino_kuma', 'yuzu_kosho', 'pegu_nuki', 'hoshizora_k', 'kaze_yomi', 'mokumoku_o']
const POOL_TEXTS = [
  'これはいい情報。保存しました',
  'わかる、自分も同じことで悩んでました',
  '次のキャンプで試してみます！',
  'それ、去年やって大失敗したやつだ…笑',
  '写真だけでお腹すいてきた',
  'もう少し詳しく教えてほしいです',
  '地味だけど一番大事なポイントだと思う',
  'このコミュニティの空気感が好き',
  'ペグは多めに持っていくに限る',
  '結局は慣れなんですよね。最初の3回がいちばん楽しい',
  '風の強い日はほんとに無理しないでほしい',
  '同じ場所に行ったことある！冬はもっと静かでいいよ',
]

function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261)

let uid = 0
const nextId = (p: string) => `${p}-${++uid}`

function poolComment(rand: () => number, maxAge: number): Comment {
  return {
    id: nextId('g'),
    author: POOL_AUTHORS[Math.floor(rand() * POOL_AUTHORS.length)],
    text: POOL_TEXTS[Math.floor(rand() * POOL_TEXTS.length)],
    score: Math.floor(rand() * 60) + 1,
    ageMin: Math.max(1, Math.floor(rand() * maxAge)),
    children: [],
  }
}

const c = (id: string, author: string, text: string, score: number, ageMin: number, children: Comment[] = [], extra: Partial<Comment> = {}): Comment => ({
  id,
  author,
  text,
  score,
  ageMin,
  children,
  ...extra,
})

function buildThread(p: Post): Comment[] {
  if (p.id === 'p1') {
    return [
      c('c1', 'tabi_no_hoshi', 'この色の空、実物はもっとすごかったんだろうな…。何時ごろの写真ですか？', 486, 280, [
        c('c1a', 'yamabiko_tent', '5時40分くらいです！テントから顔を出した瞬間、ひとりなのに声が出ました笑', 302, 270, [
          c('c1a1', 'tabi_no_hoshi', 'その一瞬のために寒さに耐えるんですよね。わかる。', 141, 262, [], { more: 3 }),
        ], { badge: 'OP' }),
        c('c1b', 'shimesaba', '霧が出てる湖畔の朝、いちばん好きなやつだ', 88, 240),
      ]),
      c('c2', 'takibi_bugyo', 'すてきな写真をありがとうございます。今月の「ベストショット」候補に入れておきますね。', 255, 250, [
        c('c2a', 'yamabiko_tent', 'えっ、うれしいです…！がんばって早起きしてよかった', 120, 238, [], { badge: 'OP' }),
      ], { badge: 'MOD' }),
      c('c3', 'morino_kuma', '初ソロでこのロケーションはセンスある。オレンジのテントが景色に映えてていい', 197, 210, [
        c('c3a', 'kawaguchi_m', 'オレンジのテントは写真映えするし、遭難したときも見つけてもらいやすいからおすすめ', 64, 190, [
          c('c3a1', 'nemuri_neko', '遭難前提で選ぶの好き', 31, 150),
        ]),
      ]),
      c('c4', 'hokahoka_sand', '朝ごはんは何を作ったんですか？そこが一番気になる', 73, 120, [], { more: 2 }),
    ]
  }
  if (p.id === 'p2') {
    return [
      c('d1', 'takibi_bugyo', '風に強いのは「側面が囲われている」タイプ。薄型でも、風防を一枚足すだけでだいぶ変わりますよ。', 214, 500, [
        c('d1a', 'kogarashi99', 'なるほど、風防という手が…！買い替える前に試してみます', 66, 470, [], { badge: 'OP' }),
      ], { badge: 'MOD' }),
      c('d2', 'pegu_nuki', '車移動なら重さは気にせず、ステンレスの箱型が最強。網も載るし、雑に扱っても壊れない。', 180, 480, [
        c('d2a', 'kaze_yomi', '箱型は灰の処理がラクなのもいい', 42, 440),
        c('d2b', 'yuzu_kosho', 'ただし冷めるまで片付けられないので撤収の段取りは要注意', 37, 420, [], { more: 4 }),
      ]),
      c('d3', 'mokumoku_o', '3台買い替えて、最終的に最初の安いやつに戻ってきた人もいます（私です）', 151, 300),
    ]
  }
  // それ以外の投稿は、投稿IDから決まる乱数でそれらしいツリーを作る
  const rand = mulberry32(hash(p.id))
  const top = Math.min(4, Math.max(0, Math.floor(p.comments / 25) + 2))
  return Array.from({ length: top }, (_, i) => {
    const node = poolComment(rand, Math.max(5, p.ageMin))
    node.score += 40 - i * 8
    const kids = Math.floor(rand() * 3)
    node.children = Array.from({ length: kids }, () => poolComment(rand, node.ageMin))
    if (kids && rand() > 0.5) node.children[0].children = [{ ...poolComment(rand, node.ageMin), author: p.author, badge: 'OP' }]
    if (rand() > 0.6) node.more = 1 + Math.floor(rand() * 4)
    return node
  })
}

const ago = (m: number) => (m < 1 ? 'たった今' : m < 60 ? `${m}分前` : m < 1440 ? `${Math.floor(m / 60)}時間前` : `${Math.floor(m / 1440)}日前`)
const countAll = (n: Comment): number => n.children.reduce((s, k) => s + 1 + countAll(k), 0) + (n.more ?? 0)
const mapTree = (list: Comment[], id: string, f: (n: Comment) => Comment): Comment[] =>
  list.map((n) => (n.id === id ? f(n) : n.children.length ? { ...n, children: mapTree(n.children, id, f) } : n))

function sortComments(list: Comment[], sort: CommentSort): Comment[] {
  const key = (n: Comment) =>
    sort === 'new' ? -n.ageMin : sort === 'top' ? n.score : sort === 'contro' ? -n.score + countAll(n) * 12 : n.score * (1 + countAll(n) * 0.08)
  // 自分の書き込みは(どの並びでも)先頭に出す
  return [...list].sort((a, b) => Number(b.author === ME) - Number(a.author === ME) || key(b) - key(a))
}

const fmt = new Intl.NumberFormat('ja-JP')
const cx = (...v: (string | false | null | undefined)[]) => v.filter(Boolean).join(' ')

/* ───────────── コンテキスト ───────────── */

type Ctx = {
  reduced: boolean
  votes: Record<string, Vote>
  vote: (id: string, v: Vote) => void
  saved: Set<string>
  toggleSave: (id: string) => void
  share: (id: string) => void
  award: (id: string, a: AwardId) => void
  burst: { id: string; award: AwardId; n: number } | null
  pollChoice: Record<string, number>
  votePoll: (id: string, i: number) => void
  fresh: Set<string>
  commentSort: CommentSort
  reply: (postId: string, parentId: string | null, text: string) => void
  loadMore: (postId: string, commentId: string) => void
}
const ForumCtx = createContext<Ctx | null>(null)
const useForum = () => useContext(ForumCtx)!

/* ───────────── イラスト(すべてオリジナル SVG) ───────────── */

function BurrowMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--b-acc)" />
      <path d="M4 25 C 6.5 13, 25.5 13, 28 25 Z" fill="var(--b-acc-text)" />
      <path d="M12 25 v-2.4 a4 4 0 0 1 8 0 V25 Z" fill="var(--b-acc)" />
      <circle cx="23" cy="8.5" r="2.2" fill="var(--b-acc-text)" />
    </svg>
  )
}

const FUR = ['#c98b5a', '#8d6e63', '#e0b07a', '#a3a7ab', '#6d4c41', '#efcf9f', '#d7744a', '#5d6f7a']
/** 投稿者ごとの「巣穴の動物」アバター。名前のハッシュで背景・毛色・耳の形が決まる */
function Avatar({ seed, size = 24 }: { seed: string; size?: number }) {
  const h = hash(seed) >>> 0
  const hue = h % 360
  const fur = FUR[(h >>> 9) % FUR.length]
  const ear = (h >>> 5) % 3
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0 rounded-full">
      <circle cx="20" cy="20" r="20" fill={`hsl(${hue} 55% 72%)`} />
      {ear === 0 && (
        <g fill={fur}>
          <circle cx="11" cy="13" r="5" />
          <circle cx="29" cy="13" r="5" />
        </g>
      )}
      {ear === 1 && (
        <g fill={fur}>
          <path d="M8 18 L11 5 L18 13 Z" />
          <path d="M32 18 L29 5 L22 13 Z" />
        </g>
      )}
      {ear === 2 && (
        <g fill={fur}>
          <ellipse cx="14" cy="9" rx="3.4" ry="9" transform="rotate(-12 14 9)" />
          <ellipse cx="26" cy="9" rx="3.4" ry="9" transform="rotate(12 26 9)" />
        </g>
      )}
      <ellipse cx="20" cy="25" rx="12.5" ry="11" fill={fur} />
      <ellipse cx="20" cy="29" rx="6" ry="4.4" fill="#fff" opacity="0.55" />
      <circle cx="15.2" cy="23.5" r="1.7" fill="#1a1a1a" />
      <circle cx="24.8" cy="23.5" r="1.7" fill="#1a1a1a" />
      <ellipse cx="20" cy="27.3" rx="1.8" ry="1.3" fill="#2b1b16" />
    </svg>
  )
}

function CommunityIcon({ size = 64 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0 rounded-full">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#123a4a" />
          <stop offset="1" stopColor="#1f6e63" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${id}s)`} />
      <circle cx="44" cy="17" r="5" fill="#fbe6b0" />
      <circle cx="18" cy="15" r="1" fill="#fff" />
      <circle cx="26" cy="11" r="0.8" fill="#fff" />
      <path d="M0 46 L16 34 L26 40 L40 28 L64 44 V64 H0Z" fill="#0f2f2c" />
      <path d="M17 50 L32 28 L47 50 Z" fill="#ff8a4c" />
      <path d="M32 50 L32 34 L38 50 Z" fill="#a24420" />
      <path d="M0 50 H64 V64 H0Z" fill="#0b2321" />
    </svg>
  )
}

function BannerArt() {
  const id = useId()
  const stars = useMemo(() => {
    const r = mulberry32(7)
    return Array.from({ length: 46 }, () => ({ x: r() * 1200, y: r() * 120, s: r() * 1.3 + 0.3, o: r() * 0.7 + 0.3 }))
  }, [])
  return (
    <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1b33" />
          <stop offset="0.6" stopColor="#1b4b5c" />
          <stop offset="1" stopColor="#3f8f7b" />
        </linearGradient>
        <radialGradient id={`${id}glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb469" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffb469" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="200" fill={`url(#${id}sky)`} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={s.o} />
      ))}
      <circle cx="930" cy="48" r="20" fill="#fdf0c8" />
      <circle cx="940" cy="42" r="18" fill="#163552" opacity="0.9" />
      <path d="M0 150 L120 90 L210 130 L330 70 L460 140 L560 100 L700 150 L820 85 L960 140 L1080 95 L1200 130 V200 H0Z" fill="#245a5c" opacity="0.65" />
      <path d="M0 170 L90 135 L190 160 L300 120 L420 165 L540 140 L660 172 L790 130 L920 168 L1050 140 L1200 165 V200 H0Z" fill="#163f43" />
      {Array.from({ length: 24 }, (_, i) => {
        const x = i * 52 + ((i * 37) % 23)
        const h = 26 + ((i * 53) % 22)
        return <path key={i} d={`M${x} 200 L${x + 11} ${200 - h} L${x + 22} 200 Z`} fill="#0b2628" />
      })}
      <circle cx="610" cy="182" r="46" fill={`url(#${id}glow)`} />
      <path d="M602 190 Q606 176 610 170 Q614 178 618 190 Z" fill="#ffc35c" />
    </svg>
  )
}

function LakeArt() {
  const id = useId()
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="朝焼けの湖畔に立つオレンジ色のテント">
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#27345f" />
          <stop offset="0.5" stopColor="#c9768a" />
          <stop offset="0.82" stopColor="#f6bf8c" />
        </linearGradient>
        <linearGradient id={`${id}water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2b089" />
          <stop offset="0.45" stopColor="#8a6f8e" />
          <stop offset="1" stopColor="#2e3b63" />
        </linearGradient>
        <linearGradient id={`${id}mist`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="640" height="222" fill={`url(#${id}sky)`} />
      <circle cx="420" cy="196" r="34" fill="#ffe6b0" />
      <path d="M0 205 L70 160 L140 190 L230 128 L320 186 L410 150 L510 196 L590 158 L640 176 V222 H0Z" fill="#6c5a80" opacity="0.85" />
      <path d="M0 222 L50 200 L120 214 L190 192 L270 220Z" fill="#433958" />
      <rect y="222" width="640" height="138" fill={`url(#${id}water)`} />
      <g transform="translate(0 444) scale(1 -1)" opacity="0.22">
        <path d="M0 205 L70 160 L140 190 L230 128 L320 186 L410 150 L510 196 L590 158 L640 176 V222 H0Z" fill="#6c5a80" />
      </g>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={420 - (40 - i * 6)} y={230 + i * 11} width={(40 - i * 6) * 2} height="3" rx="1.5" fill="#ffe6b0" opacity={0.75 - i * 0.1} />
      ))}
      <rect y="196" width="640" height="56" fill={`url(#${id}mist)`} />
      <path d="M0 360 V286 C 70 276, 150 292, 230 322 L 268 360 Z" fill="#1d2d2b" />
      <path d="M92 304 L131 250 L170 304 Z" fill="#f1844a" />
      <path d="M131 304 L131 264 L146 304 Z" fill="#7d3b20" />
      <path d="M131 250 L131 244" stroke="#3a2a22" strokeWidth="2" />
      {[540, 568, 600, 622].map((x, i) => (
        <g key={x} fill="#18262a">
          <path d={`M${x} 248 L${x + 14} ${190 - i * 8} L${x + 28} 248 Z`} />
          <path d={`M${x + 4} 225 L${x + 14} ${178 - i * 8} L${x + 24} 225 Z`} />
        </g>
      ))}
      <circle cx="196" cy="318" r="6" fill="#ffb15c" opacity="0.9" />
      <circle cx="196" cy="318" r="16" fill="#ffb15c" opacity="0.18" />
    </svg>
  )
}

function GyozaArt() {
  const id = useId()
  const gyoza = [
    [210, 165, -8],
    [300, 150, 4],
    [390, 160, 12],
    [235, 225, -4],
    [330, 222, 6],
    [415, 228, 14],
  ]
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="ホットサンドメーカーの中で焼けた羽根つき餃子">
      <defs>
        <pattern id={`${id}wood`} width="640" height="24" patternUnits="userSpaceOnUse">
          <rect width="640" height="24" fill="#7a5235" />
          <path d="M0 6 Q160 2 320 8 T640 6" stroke="#6a452b" strokeWidth="2" fill="none" />
          <path d="M0 18 Q200 22 380 16 T640 19" stroke="#8a6040" strokeWidth="1.5" fill="none" />
        </pattern>
        <radialGradient id={`${id}wing`} cx="0.5" cy="0.5" r="0.55">
          <stop offset="0.55" stopColor="#d99a48" />
          <stop offset="1" stopColor="#8f5520" />
        </radialGradient>
      </defs>
      <rect width="640" height="360" fill={`url(#${id}wood)`} />
      <rect x="560" y="40" width="60" height="300" rx="12" fill="#1b1b1d" transform="rotate(8 590 190)" />
      <rect x="130" y="70" width="380" height="240" rx="40" fill="#222326" />
      <rect x="146" y="86" width="348" height="208" rx="30" fill="#2e2f33" />
      <rect x="162" y="104" width="316" height="172" rx="22" fill={`url(#${id}wing)`} />
      <path d="M170 140 Q230 120 300 132 T470 128 M172 248 Q250 268 330 252 T468 258" stroke="#f3cf8e" strokeWidth="3" fill="none" opacity="0.5" />
      {gyoza.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path d="M-36 10 C -30 -26, 30 -26, 36 10 Z" fill="#f4e2bc" />
          <path d="M-36 10 C -10 18, 10 18, 36 10" stroke="#c98a3b" strokeWidth="5" fill="none" />
          {[-20, -8, 4, 16].map((px) => (
            <path key={px} d={`M${px} -12 q4 6 0 14`} stroke="#d8c194" strokeWidth="2" fill="none" />
          ))}
        </g>
      ))}
      <ellipse cx="560" cy="300" rx="42" ry="20" fill="#f2f0ea" transform="rotate(-6 560 300)" />
      <ellipse cx="560" cy="298" rx="30" ry="12" fill="#5a2b16" transform="rotate(-6 560 298)" />
      {[260, 330, 400].map((x, i) => (
        <path key={x} d={`M${x} 92 c -14 -18 14 -30 0 -48 c -12 -14 10 -24 4 -38`} stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity={0.28 - i * 0.04} />
      ))}
    </svg>
  )
}

function MapArt() {
  return (
    <svg viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <rect width="160" height="110" fill="#e8efd9" />
      {[18, 32, 46, 60].map((r) => (
        <ellipse key={r} cx="110" cy="40" rx={r} ry={r * 0.7} fill="none" stroke="#c6d6ad" strokeWidth="1.2" />
      ))}
      <path d="M0 80 Q30 60 60 72 T120 58 T160 66" stroke="#8fb8d8" strokeWidth="5" fill="none" />
      <path d="M10 100 C 40 70, 60 90, 80 60 S 120 30, 150 20" stroke="#f1f1f1" strokeWidth="5" fill="none" />
      <path d="M10 100 C 40 70, 60 90, 80 60 S 120 30, 150 20" stroke="#e05555" strokeWidth="2.4" strokeDasharray="5 4" fill="none" />
      {[
        [62, 80],
        [112, 38],
      ].map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <circle r="7" fill="#e05555" />
          <path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      <path d="M148 8 c -6 0 -9 5 -9 9 c 0 6 9 14 9 14 s 9 -8 9 -14 c 0 -4 -3 -9 -9 -9z" fill="#13806a" />
    </svg>
  )
}

function Art({ id }: { id: ArtId }) {
  return id === 'lake' ? <LakeArt /> : <GyozaArt />
}

function AwardIcon({ id, size = 16 }: { id: AwardId; size?: number }) {
  if (id === 'acorn')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 11 Q12 25 18 11 Z" fill="#c98a4a" />
        <path d="M8.5 13 Q10 18 12 19" stroke="#e8b47c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M4.5 11.5 C 4 6, 20 6, 19.5 11.5 Z" fill="#7a4a26" />
        <path d="M12 6.5 V3.5" stroke="#5a341a" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  if (id === 'fire')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 C 15 7, 19 9, 18 15 A6 6 0 0 1 6 15 C 6 11, 9 10, 9 6 C 11 8, 11 9, 12 2 Z" fill="#ff7a2f" />
        <path d="M12 10 C 14 13, 15.5 14, 15 16.5 A3 3 0 0 1 9 16.5 C 9 14.5, 11 14, 12 10 Z" fill="#ffd25c" />
        <path d="M5 21 L19 18 M5 18 L19 21" stroke="#7a4a26" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#ffd54a" opacity="0.25" />
      <path d="M12 3.5 L14.4 9 L20.3 9.4 L15.8 13.2 L17.2 19 L12 15.9 L6.8 19 L8.2 13.2 L3.7 9.4 L9.6 9 Z" fill="#ffc928" stroke="#e59a00" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  )
}

/* ───────────── 小さな部品 ───────────── */

const iconBtn =
  'inline-grid size-8 shrink-0 place-items-center rounded-full text-(--b-muted) transition-colors hover:bg-(--b-hover) hover:text-(--b-text) focus-visible:outline-2 focus-visible:outline-(--b-acc)'
const pillBtn =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-(--b-muted) transition-colors hover:bg-(--b-hover) hover:text-(--b-text) focus-visible:outline-2 focus-visible:outline-(--b-acc)'

function FlairChip({ id }: { id: FlairId }) {
  const f = FLAIRS[id]
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] leading-none font-semibold"
      style={{ background: `color-mix(in oklab, ${f.tone} 17%, transparent)`, color: `color-mix(in oklab, ${f.tone} 72%, var(--b-text))` }}
    >
      {f.label}
    </span>
  )
}

function Badge({ kind }: { kind: 'OP' | 'MOD' }) {
  return kind === 'MOD' ? (
    <span className="inline-flex items-center gap-0.5 rounded bg-(--b-acc-soft) px-1 text-[10px] font-bold text-(--b-acc)">
      <Shield size={10} strokeWidth={2.6} /> MOD
    </span>
  ) : (
    <span className="rounded bg-(--b-down-soft) px-1 text-[10px] font-bold text-(--b-down)">投稿者</span>
  )
}

function VoteButton({ dir, active, onClick, size, label }: { dir: 'up' | 'down'; active: boolean; onClick: () => void; size: number; label: string }) {
  const { reduced } = useForum()
  const Icon = dir === 'up' ? ArrowBigUp : ArrowBigDown
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      whileTap={reduced ? undefined : { scale: 0.8 }}
      className={cx(
        'grid place-items-center rounded-md p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-(--b-acc)',
        dir === 'up' ? 'hover:bg-(--b-acc-soft) hover:text-(--b-acc)' : 'hover:bg-(--b-down-soft) hover:text-(--b-down)',
        active ? (dir === 'up' ? 'text-(--b-acc)' : 'text-(--b-down)') : 'text-(--b-faint)',
      )}
    >
      <motion.span
        key={active ? 'on' : 'off'}
        initial={false}
        animate={active && !reduced ? { scale: [1, 1.35, 0.95, 1], y: dir === 'up' ? [0, -3, 0] : [0, 3, 0] } : { scale: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="grid"
      >
        <Icon size={size} fill={active ? 'currentColor' : 'none'} strokeWidth={1.8} />
      </motion.span>
    </motion.button>
  )
}

function VoteControl({ id, base, layout = 'col', size = 20 }: { id: string; base: number; layout?: 'col' | 'row'; size?: number }) {
  const { votes, vote } = useForum()
  const v = votes[id] ?? 0
  return (
    <div
      className={cx('flex items-center', layout === 'col' ? 'flex-col gap-0.5' : 'gap-0.5')}
      onClick={(e) => e.stopPropagation()}
    >
      <VoteButton dir="up" size={size} active={v === 1} label="賛成票" onClick={() => vote(id, v === 1 ? 0 : 1)} />
      <span
        className={cx(
          'min-w-[2.2em] text-center text-[12px] font-bold tabular-nums transition-colors',
          v === 1 ? 'text-(--b-acc)' : v === -1 ? 'text-(--b-down)' : 'text-(--b-text)',
        )}
        aria-label={`スコア ${base + v}`}
      >
        <NumberFlow value={base + v} locales="ja-JP" format={{ notation: 'compact', maximumFractionDigits: 1 }} />
      </span>
      <VoteButton dir="down" size={size} active={v === -1} label="反対票" onClick={() => vote(id, v === -1 ? 0 : -1)} />
    </div>
  )
}

function AwardChips({ post }: { post: Post }) {
  const { burst, reduced } = useForum()
  const entries = (Object.keys(AWARDS) as AwardId[]).filter((a) => post.awards[a])
  if (!entries.length) return null
  return (
    <span className="inline-flex items-center gap-1">
      {entries.map((a) => {
        const popping = burst?.id === post.id && burst.award === a
        return (
          <motion.span
            key={`${a}-${popping ? burst.n : 0}`}
            initial={popping && !reduced ? { scale: 0.2 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 14 }}
            className="relative inline-flex items-center gap-0.5 rounded-full bg-(--b-panel2) py-0.5 pr-1.5 pl-1 text-[11px] font-semibold text-(--b-muted)"
            title={AWARDS[a].label}
          >
            <AwardIcon id={a} size={14} />
            {post.awards[a]}
            {popping &&
              !reduced &&
              Array.from({ length: 8 }, (_, i) => {
                const ang = (i / 8) * Math.PI * 2
                return (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-2 size-1 rounded-full"
                    style={{ background: i % 2 ? '#ffc928' : 'var(--b-acc)' }}
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{ x: Math.cos(ang) * 18, y: Math.sin(ang) * 18, opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                )
              })}
          </motion.span>
        )
      })}
    </span>
  )
}

function AwardButton({ post, compact }: { post: Post; compact?: boolean }) {
  const { award, reduced } = useForum()
  const [open, setOpen] = useState(false)
  return (
    <span className="relative" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="アワードを贈る" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={compact ? iconBtn : pillBtn}>
        <Gift size={15} />
        {!compact && <span className="hidden @xl:inline">アワード</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: reduced ? 0 : 6, scale: reduced ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduced ? 0 : 6, scale: reduced ? 1 : 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-full left-0 z-30 mb-1.5 w-52 origin-bottom-left rounded-xl border border-(--b-line) bg-(--b-panel) p-1.5 shadow-(--b-shadow)"
            onMouseLeave={() => setOpen(false)}
          >
            {(Object.keys(AWARDS) as AwardId[]).map((a) => (
              <button
                key={a}
                role="menuitem"
                type="button"
                onClick={() => {
                  award(post.id, a)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-(--b-hover) focus-visible:outline-2 focus-visible:outline-(--b-acc)"
              >
                <AwardIcon id={a} size={22} />
                <span>
                  <span className="block text-[12.5px] font-semibold text-(--b-text)">{AWARDS[a].label}</span>
                  <span className="block text-[11px] text-(--b-muted)">{AWARDS[a].note}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

function PostActions({ post, extraComments = 0, onComments }: { post: Post; extraComments?: number; onComments?: () => void }) {
  const { saved, toggleSave, share } = useForum()
  const isSaved = saved.has(post.id)
  return (
    <div className="-ml-2 mt-2 flex flex-wrap items-center gap-0.5">
      <button
        type="button"
        className={pillBtn}
        onClick={(e) => {
          e.stopPropagation()
          onComments?.()
        }}
      >
        <MessageCircle size={15} />
        <span>
          {fmt.format(post.comments + extraComments)}
          <span className="hidden @xl:inline">件のコメント</span>
        </span>
      </button>
      <AwardButton post={post} />
      <button
        type="button"
        aria-label="共有"
        className={pillBtn}
        onClick={(e) => {
          e.stopPropagation()
          share(post.id)
        }}
      >
        <Share2 size={15} />
        <span className="hidden @xl:inline">共有</span>
      </button>
      <button
        type="button"
        aria-label={isSaved ? '保存を解除' : '保存'}
        aria-pressed={isSaved}
        className={cx(pillBtn, isSaved && 'text-(--b-acc)')}
        onClick={(e) => {
          e.stopPropagation()
          toggleSave(post.id)
        }}
      >
        <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
        <span className="hidden @xl:inline">{isSaved ? '保存済み' : '保存'}</span>
      </button>
      <button type="button" aria-label="その他" className={iconBtn} onClick={(e) => e.stopPropagation()}>
        <Ellipsis size={16} />
      </button>
    </div>
  )
}

function PostMeta({ post }: { post: Post }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-(--b-muted)">
      <Avatar seed={post.author} size={18} />
      <span className="font-semibold text-(--b-text)">u/{post.author}</span>
      {post.mod && <Badge kind="MOD" />}
      <span aria-hidden="true">·</span>
      <span>{ago(post.ageMin)}</span>
      {post.pinned && (
        <span className="inline-flex items-center gap-0.5 font-semibold text-(--b-acc)">
          <Pin size={12} className="rotate-45" /> 固定
        </span>
      )}
      <AwardChips post={post} />
    </div>
  )
}

function Poll({ post }: { post: Extract<Post, { kind: 'poll' }> }) {
  const { pollChoice, votePoll, reduced } = useForum()
  const choice = pollChoice[post.id]
  const voted = choice !== undefined
  const totals = post.options.map((o, i) => o.votes + (choice === i ? 1 : 0))
  const sum = totals.reduce((a, b) => a + b, 0)
  const max = Math.max(...totals)
  return (
    <div className="mt-2.5 rounded-xl border border-(--b-line) p-2.5" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-1.5">
        {post.options.map((o, i) => {
          const pct = Math.round((totals[i] / sum) * 100)
          return voted ? (
            <div key={o.label} className="relative overflow-hidden rounded-lg bg-(--b-panel2) px-3 py-2 text-[13px]">
              <motion.div
                className={cx('absolute inset-y-0 left-0 rounded-lg', totals[i] === max ? 'bg-(--b-acc-soft)' : 'bg-(--b-line)')}
                initial={{ width: reduced ? `${pct}%` : 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: i * 0.05 }}
              />
              <div className="relative flex items-center gap-2">
                <span className={cx('font-bold tabular-nums', totals[i] === max ? 'text-(--b-acc)' : 'text-(--b-muted)')}>{pct}%</span>
                <span className={cx(choice === i && 'font-semibold')}>{o.label}</span>
                {choice === i && <Check size={14} className="text-(--b-acc)" />}
              </div>
            </div>
          ) : (
            <button
              key={o.label}
              type="button"
              onClick={() => votePoll(post.id, i)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-(--b-line) px-3 py-2 text-left text-[13px] transition-colors hover:border-(--b-acc) hover:bg-(--b-acc-soft) focus-visible:outline-2 focus-visible:outline-(--b-acc)"
            >
              <span className="size-3.5 shrink-0 rounded-full border-2 border-(--b-faint)" />
              {o.label}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11.5px] text-(--b-muted)">
        合計 {fmt.format(sum)}票 · 残り{post.daysLeft}日{voted && ' · 投票しました'}
      </p>
    </div>
  )
}

function PostBody({ post, full }: { post: Post; full?: boolean }) {
  const body = 'body' in post ? post.body : undefined
  return (
    <>
      {body && post.kind !== 'image' && (
        <p className={cx('mt-1.5 text-[13.5px] leading-relaxed whitespace-pre-line text-(--b-muted)', !full && 'line-clamp-3', full && 'text-(--b-text)')}>{body}</p>
      )}
      {post.kind === 'image' && (
        <>
          {full && body && <p className="mt-1.5 text-[13.5px] leading-relaxed text-(--b-text)">{body}</p>}
          <div className={cx('mt-2.5 overflow-hidden rounded-xl border border-(--b-line) bg-black', full ? 'aspect-[16/9]' : 'aspect-[16/9] max-h-[300px]')}>
            <Art id={post.art} />
          </div>
        </>
      )}
      {post.kind === 'link' && (
        <a
          href={`#${post.url}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          className="mt-2.5 flex items-stretch overflow-hidden rounded-xl border border-(--b-line) transition-colors hover:border-(--b-faint) focus-visible:outline-2 focus-visible:outline-(--b-acc)"
        >
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2">
            <span className="flex items-center gap-1 text-[11px] text-(--b-muted)">
              <Link2 size={12} /> {post.domain}
            </span>
            <span className="truncate text-[13px] font-semibold text-(--b-text)">林道ナビ — 通行止め・規制マップ</span>
            <span className="flex items-center gap-1 text-[11px] text-(--b-acc)">
              サイトを開く <ExternalLink size={11} />
            </span>
          </div>
          <div className="w-28 shrink-0 border-l border-(--b-line) @lg:w-36">
            <MapArt />
          </div>
        </a>
      )}
      {post.kind === 'poll' && <Poll post={post} />}
    </>
  )
}

function Thumb({ post }: { post: Post }) {
  return (
    <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-(--b-line) bg-(--b-panel2) text-(--b-faint)">
      {post.kind === 'image' ? (
        <Art id={post.art} />
      ) : post.kind === 'link' ? (
        <MapArt />
      ) : post.kind === 'poll' ? (
        <ChartIcon />
      ) : (
        <MessageCircle size={18} />
      )}
    </div>
  )
}
const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <rect x="3" y="12" width="4" height="9" rx="1" />
    <rect x="10" y="5" width="4" height="16" rx="1" />
    <rect x="17" y="9" width="4" height="12" rx="1" />
  </svg>
)

/* ───────────── 投稿カード ───────────── */

function PostCard({
  post,
  view,
  focused,
  fresh,
  onOpen,
  cardRef,
}: {
  post: Post
  view: 'card' | 'compact'
  focused: boolean
  fresh: boolean
  onOpen: () => void
  cardRef: (el: HTMLElement | null) => void
}) {
  const { reduced, saved, toggleSave, share } = useForum()
  const common = {
    ref: cardRef,
    layout: reduced ? false : ('position' as const),
    initial: fresh && !reduced ? { opacity: 0, y: -14, scale: 0.98 } : false,
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: reduced ? 1 : 0.97, transition: { duration: 0.15 } },
    transition: { type: 'spring' as const, stiffness: 420, damping: 36 },
    onClick: onOpen,
    'data-focused': focused,
  }
  if (view === 'compact') {
    return (
      <motion.article
        {...common}
        className="group relative flex cursor-pointer items-center gap-2.5 border-b border-(--b-line) bg-(--b-panel) px-2 py-2 transition-colors last:border-b-0 hover:bg-(--b-hover) data-[focused=true]:bg-(--b-acc-soft)"
      >
        <VoteControl id={post.id} base={post.score} layout="row" size={17} />
        <Thumb post={post} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {post.pinned && <Pin size={12} className="shrink-0 rotate-45 text-(--b-acc)" aria-label="固定" />}
            <FlairChip id={post.flair} />
            <h3 className="truncate text-[13.5px] font-semibold text-(--b-text)">{post.title}</h3>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-(--b-muted)">
            <span className="truncate">u/{post.author}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{ago(post.ageMin)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex shrink-0 items-center gap-0.5">
              <MessageCircle size={12} /> {fmt.format(post.comments)}
            </span>
          </div>
        </div>
        <div className="hidden items-center @2xl:flex" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="共有" className={iconBtn} onClick={() => share(post.id)}>
            <Share2 size={15} />
          </button>
          <button
            type="button"
            aria-label={saved.has(post.id) ? '保存を解除' : '保存'}
            aria-pressed={saved.has(post.id)}
            className={cx(iconBtn, saved.has(post.id) && 'text-(--b-acc)')}
            onClick={() => toggleSave(post.id)}
          >
            <Bookmark size={15} fill={saved.has(post.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
      </motion.article>
    )
  }
  return (
    <motion.article
      {...common}
      className="group relative flex cursor-pointer rounded-xl border border-(--b-line) bg-(--b-panel) transition-[border-color,box-shadow] hover:border-(--b-faint) data-[focused=true]:border-(--b-acc) data-[focused=true]:shadow-[0_0_0_3px_var(--b-acc-soft)]"
    >
      <div className="flex w-10 shrink-0 justify-center rounded-l-xl bg-(--b-panel2) pt-2.5 @lg:w-12">
        <VoteControl id={post.id} base={post.score} />
      </div>
      <div className="min-w-0 flex-1 px-3 pt-2.5 pb-1.5">
        <PostMeta post={post} />
        <div className="mt-1.5 flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-[15.5px] leading-snug font-semibold text-(--b-text)">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpen()
              }}
              className="text-left focus-visible:outline-2 focus-visible:outline-(--b-acc)"
            >
              {post.title}
            </button>
          </h3>
          <span className="mt-0.5">
            <FlairChip id={post.flair} />
          </span>
        </div>
        <PostBody post={post} />
        <PostActions post={post} onComments={onOpen} />
      </div>
    </motion.article>
  )
}

/* ───────────── 投稿作成 ───────────── */

function Composer({ open, setOpen, onSubmit }: { open: boolean; setOpen: (v: boolean) => void; onSubmit: (title: string, body: string, flair: FlairId) => void }) {
  const { reduced } = useForum()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [flair, setFlair] = useState<FlairId>('question')
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) titleRef.current?.focus()
  }, [open])
  const submit = () => {
    if (!title.trim()) return
    onSubmit(title.trim(), body.trim(), flair)
    setTitle('')
    setBody('')
    setOpen(false)
  }
  return (
    <div className="rounded-xl border border-(--b-line) bg-(--b-panel) p-2.5">
      <div className="flex items-center gap-2">
        <Avatar seed={ME} size={32} />
        {open ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="タイトル"
            aria-label="タイトル"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') setOpen(false)
            }}
            className="h-9 min-w-0 flex-1 rounded-lg border border-(--b-line) bg-(--b-panel2) px-3 text-[13.5px] font-semibold text-(--b-text) outline-none placeholder:text-(--b-faint) focus:border-(--b-acc)"
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-(--b-line) bg-(--b-panel2) px-3 text-left text-[13px] text-(--b-faint) transition-colors hover:border-(--b-faint) focus-visible:outline-2 focus-visible:outline-(--b-acc)"
          >
            投稿を作成
          </button>
        )}
        <button type="button" aria-label="画像を投稿" className={iconBtn} onClick={() => setOpen(true)}>
          <ImageIcon size={17} />
        </button>
        <button type="button" aria-label="リンクを投稿" className={cx(iconBtn, 'hidden @sm:inline-grid')} onClick={() => setOpen(true)}>
          <Link2 size={17} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2 pl-10">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="本文（任意）"
                aria-label="本文"
                className="block w-full resize-none rounded-lg border border-(--b-line) bg-(--b-panel2) px-3 py-2 text-[13px] leading-relaxed text-(--b-text) outline-none placeholder:text-(--b-faint) focus:border-(--b-acc)"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11.5px] text-(--b-muted)">フレア</span>
                {(['question', 'photo', 'gear', 'food', 'fail'] as FlairId[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={flair === f}
                    onClick={() => setFlair(f)}
                    className={cx('rounded-full transition focus-visible:outline-2 focus-visible:outline-(--b-acc)', flair === f ? 'ring-2 ring-(--b-acc) ring-offset-1 ring-offset-(--b-panel)' : 'opacity-60 hover:opacity-100')}
                  >
                    <FlairChip id={f} />
                  </button>
                ))}
                <span className="ml-auto flex gap-1.5">
                  <button type="button" onClick={() => setOpen(false)} className={pillBtn}>
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!title.trim()}
                    className="rounded-full bg-(--b-acc) px-3.5 py-1.5 text-[12px] font-bold text-(--b-acc-text) transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--b-acc) disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    投稿する
                  </button>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────── コメント ───────────── */

function ReplyBox({ onSubmit, onCancel, placeholder, autoFocus, submitLabel = '返信' }: { onSubmit: (t: string) => void; onCancel?: () => void; placeholder: string; autoFocus?: boolean; submitLabel?: string }) {
  const { reduced } = useForum()
  const [text, setText] = useState('')
  const [active, setActive] = useState(Boolean(autoFocus))
  const send = () => {
    if (!text.trim()) return
    onSubmit(text.trim())
    setText('')
    if (!onCancel) setActive(false)
  }
  return (
    <motion.form
      initial={onCancel ? { height: 0, opacity: 0 } : false}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
      className="overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <div className="my-1.5 rounded-xl border border-(--b-line) bg-(--b-panel2) transition-[border-color,box-shadow] focus-within:border-(--b-acc) focus-within:shadow-[0_0_0_3px_var(--b-acc-soft)]">
        <textarea
          autoFocus={autoFocus}
          value={text}
          onFocus={() => setActive(true)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
            if (e.key === 'Escape') onCancel?.()
          }}
          rows={active ? 3 : 1}
          placeholder={placeholder}
          aria-label={placeholder}
          className="block w-full resize-none bg-transparent px-3 py-2 text-[13px] leading-relaxed text-(--b-text) outline-none placeholder:text-(--b-faint)"
        />
        {active && (
          <div className="flex items-center justify-end gap-1.5 px-2 pb-2">
            <span className="mr-auto pl-1 text-[10.5px] text-(--b-faint)">Ctrl + Enter で送信</span>
            <button
              type="button"
              onClick={() => {
                setText('')
                setActive(false)
                onCancel?.()
              }}
              className={pillBtn}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="rounded-full bg-(--b-acc) px-3.5 py-1.5 text-[12px] font-bold text-(--b-acc-text) transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--b-acc) disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        )}
      </div>
    </motion.form>
  )
}

function CommentNode({ node, postId }: { node: Comment; postId: string }) {
  const { reduced, fresh, commentSort, reply, loadMore, share } = useForum()
  const [collapsed, setCollapsed] = useState(false)
  const [replying, setReplying] = useState(false)
  const kids = useMemo(() => sortComments(node.children, commentSort), [node.children, commentSort])
  const hidden = countAll(node)
  const isFresh = fresh.has(node.id)
  const dur = reduced ? 0 : 0.22
  return (
    <motion.div
      initial={isFresh ? { height: 0, opacity: 0 } : false}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: dur }}
      className="relative"
    >
      <div className={cx('flex gap-2 rounded-lg pt-1.5', isFresh && 'animate-[burrow-flash_1.8s_ease-out]')}>
        <div className="flex w-7 shrink-0 flex-col items-center">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? `u/${node.author} のコメントを展開` : `u/${node.author} のコメントを折りたたむ`}
            aria-expanded={!collapsed}
            className="rounded-full focus-visible:outline-2 focus-visible:outline-(--b-acc)"
          >
            <Avatar seed={node.author} size={26} />
          </button>
          {!collapsed && (kids.length > 0 || replying || Boolean(node.more)) && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={`u/${node.author} のスレッドを折りたたむ`}
              className="group/line mt-1 flex w-5 flex-1 justify-center focus-visible:outline-2 focus-visible:outline-(--b-acc)"
            >
              <span className="w-px rounded-full bg-(--b-line) transition-all group-hover/line:w-[3px] group-hover/line:bg-(--b-acc)" />
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <header className="flex min-h-[26px] flex-wrap items-center gap-x-1.5 text-[12px]">
            <span className="font-semibold text-(--b-text)">u/{node.author}</span>
            {node.badge && <Badge kind={node.badge} />}
            {node.author === ME && <span className="rounded bg-(--b-acc-soft) px-1 text-[10px] font-bold text-(--b-acc)">あなた</span>}
            <span className="text-(--b-muted)">· {ago(node.ageMin)}</span>
            {collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="rounded-full bg-(--b-panel2) px-2 py-0.5 text-[11px] font-semibold text-(--b-acc) hover:bg-(--b-acc-soft) focus-visible:outline-2 focus-visible:outline-(--b-acc)"
              >
                {hidden ? `+ ${hidden}件の返信` : '展開'}
              </button>
            )}
          </header>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: dur, ease: [0.2, 0.8, 0.2, 1] }}
                className="overflow-hidden"
              >
                <p className="text-[13.5px] leading-relaxed text-(--b-text)">{node.text}</p>
                <div className="-ml-1.5 flex flex-wrap items-center gap-0.5 py-0.5">
                  <VoteControl id={node.id} base={node.score} layout="row" size={17} />
                  <button type="button" onClick={() => setReplying((r) => !r)} aria-expanded={replying} className={pillBtn}>
                    <MessageCircle size={14} /> 返信
                  </button>
                  <button type="button" onClick={() => share(postId)} className={cx(pillBtn, 'hidden @md:inline-flex')}>
                    <Share2 size={14} /> 共有
                  </button>
                </div>
                <AnimatePresence>
                  {replying && (
                    <ReplyBox
                      key="reply"
                      autoFocus
                      placeholder={`u/${node.author} に返信`}
                      onCancel={() => setReplying(false)}
                      onSubmit={(t) => {
                        reply(postId, node.id, t)
                        setReplying(false)
                      }}
                    />
                  )}
                </AnimatePresence>
                {kids.map((k) => (
                  <CommentNode key={k.id} node={k} postId={postId} />
                ))}
                {Boolean(node.more) && (
                  <button
                    type="button"
                    onClick={() => loadMore(postId, node.id)}
                    className="mt-1 mb-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-semibold text-(--b-acc) hover:bg-(--b-acc-soft) focus-visible:outline-2 focus-visible:outline-(--b-acc)"
                  >
                    <Plus size={13} /> さらに返信を表示 ({node.more})
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

/* ───────────── サイドバー ───────────── */

const RULES = [
  ['直火禁止の場所での焚き火写真はNG', '焚き火台・焚き火シートの使用が分かる写真のみ投稿できます。'],
  ['キャンプ場の悪口・特定はしない', '体験の共有は歓迎ですが、運営者やほかの利用者を貶める投稿は削除します。'],
  ['ギアの宣伝は月1回まで', '自作ギアや販売品の紹介は、同じ人からの投稿を月1回までとします。'],
  ['危険な行為を推奨しない', 'テント内での火器使用など、事故につながる方法は紹介しないでください。'],
  ['初心者の質問を笑わない', 'みんな最初は初心者です。やさしく答えましょう。'],
]

function Sidebar({ joined, onJoin, online }: { joined: boolean; onJoin: () => void; online: number }) {
  const { reduced } = useForum()
  const [openRule, setOpenRule] = useState<number | null>(0)
  return (
    <aside className="hidden w-[290px] shrink-0 space-y-3 @3xl:block">
      <section className="overflow-hidden rounded-xl border border-(--b-line) bg-(--b-panel)">
        <div className="h-10 bg-[linear-gradient(110deg,#123a4a,#1f6e63_60%,#3f8f7b)]" />
        <div className="px-3.5 pb-3.5">
          <div className="-mt-5 flex items-end gap-2">
            <span className="rounded-full border-4 border-(--b-panel)">
              <CommunityIcon size={44} />
            </span>
            <h2 className="pb-1 text-[14px] font-bold text-(--b-text)">b/{COMMUNITY}</h2>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-(--b-muted)">
            ソロもファミリーも、週末だけのキャンパーが集まる場所。ギア・ごはん・失敗談まで、気軽に共有しましょう。
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-(--b-muted)">
            <CalendarDays size={13} /> 2019年4月12日に作成
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-(--b-line) pt-3">
            <div>
              <div className="text-[15px] font-bold text-(--b-text)">
                <NumberFlow value={184_200 + (joined ? 1 : 0)} locales="ja-JP" />
              </div>
              <div className="text-[11px] text-(--b-muted)">メンバー</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[15px] font-bold text-(--b-text)">
                <span className="relative flex size-2">
                  {!reduced && <span className="absolute inline-flex size-full animate-ping rounded-full bg-(--b-acc) opacity-60" />}
                  <span className="relative inline-flex size-2 rounded-full bg-(--b-acc)" />
                </span>
                <NumberFlow value={online} locales="ja-JP" />
              </div>
              <div className="text-[11px] text-(--b-muted)">オンライン</div>
            </div>
          </div>
          <JoinButton joined={joined} onJoin={onJoin} wide />
        </div>
      </section>

      <section className="rounded-xl border border-(--b-line) bg-(--b-panel) p-1.5">
        <h3 className="px-2 pt-1.5 pb-1 text-[11px] font-bold tracking-wider text-(--b-muted)">コミュニティのルール</h3>
        <ol>
          {RULES.map(([title, body], i) => (
            <li key={title} className="border-b border-(--b-line) last:border-b-0">
              <button
                type="button"
                aria-expanded={openRule === i}
                onClick={() => setOpenRule(openRule === i ? null : i)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12.5px] text-(--b-text) hover:bg-(--b-hover) focus-visible:outline-2 focus-visible:outline-(--b-acc)"
              >
                <span className="w-4 text-(--b-muted) tabular-nums">{i + 1}</span>
                <span className="flex-1">{title}</span>
                <ChevronDown size={14} className={cx('shrink-0 text-(--b-muted) transition-transform', openRule === i && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {openRule === i && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.2 }}
                    className="overflow-hidden px-8 text-[12px] leading-relaxed text-(--b-muted)"
                  >
                    <span className="block pb-2.5">{body}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-(--b-line) bg-(--b-panel) p-3">
        <h3 className="pb-2 text-[11px] font-bold tracking-wider text-(--b-muted)">モデレーター</h3>
        <ul className="space-y-2">
          {['takibi_bugyo', 'hoshizora_k', 'pegu_nuki'].map((m) => (
            <li key={m} className="flex items-center gap-2 text-[12.5px] text-(--b-text)">
              <Avatar seed={m} size={24} />
              u/{m}
            </li>
          ))}
        </ul>
        <button type="button" className="mt-3 w-full rounded-full border border-(--b-line) py-1.5 text-[12px] font-semibold text-(--b-text) hover:bg-(--b-hover) focus-visible:outline-2 focus-visible:outline-(--b-acc)">
          モデレーターにメッセージ
        </button>
      </section>

      <section className="rounded-xl border border-(--b-line) bg-(--b-panel) p-3 text-[11.5px] text-(--b-muted)">
        <h3 className="flex items-center gap-1.5 pb-2 text-[11px] font-bold tracking-wider">
          <Keyboard size={13} /> キーボード操作
        </h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {[
            ['J / K', '投稿を移動'],
            ['A / Z', '賛成 / 反対'],
            ['Enter', '投稿を開く'],
            ['Esc', '一覧に戻る'],
          ].map(([k, d]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded border border-(--b-line) bg-(--b-panel2) px-1 font-mono text-[10.5px] text-(--b-text)">{k}</kbd>
              </dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className="px-1 pb-4 text-[10.5px] text-(--b-faint)">Burrow は架空のサービスです。ユーザー・投稿・画像はすべてデモ用の創作です。</p>
    </aside>
  )
}

function JoinButton({ joined, onJoin, wide }: { joined: boolean; onJoin: () => void; wide?: boolean }) {
  const { reduced } = useForum()
  return (
    <motion.button
      type="button"
      layout={!reduced}
      onClick={onJoin}
      aria-pressed={joined}
      whileTap={reduced ? undefined : { scale: 0.94 }}
      className={cx(
        'relative inline-flex h-8 items-center justify-center gap-1 overflow-hidden rounded-full px-4 text-[12.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--b-acc)',
        wide && 'mt-3 w-full',
        joined ? 'border border-(--b-line) bg-transparent text-(--b-text) hover:bg-(--b-hover)' : 'bg-(--b-acc) text-(--b-acc-text) hover:brightness-110',
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={joined ? 'on' : 'off'}
          initial={{ y: reduced ? 0 : 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduced ? 0 : -14, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="inline-flex items-center gap-1"
        >
          {joined ? (
            <>
              <Check size={14} strokeWidth={3} /> 参加中
            </>
          ) : (
            <>
              <Plus size={14} strokeWidth={3} /> 参加する
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

/* ───────────── 本体 ───────────── */

const NAV = [
  { name: COMMUNITY, icon: Tent, color: '#1f6e63' },
  { name: '自作キーボード', icon: Keyboard, color: '#5a54c9' },
  { name: 'ベランダ菜園', icon: Sprout, color: '#3f9a3a' },
  { name: '深夜ラジオ', icon: Radio, color: '#c4572f' },
  { name: 'ねこの寝相', icon: Cat, color: '#b0802a' },
]

const NOTIFS = [
  { who: 'tabi_no_hoshi', text: 'があなたのコメントに返信しました', ago: '12分前' },
  { who: 'takibi_bugyo', text: 'があなたの投稿を「ベストショット」に選びました', ago: '2時間前' },
  { who: 'kaze_yomi', text: 'があなたの投稿にどんぐりを贈りました', ago: '昨日' },
]

export function CommunityForum() {
  const reduced = Boolean(useReducedMotion())
  const [theme, setTheme] = useState<Theme>('dark')
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS)
  const [votes, setVotes] = useState<Record<string, Vote>>({ p1: 1, c1a: 1 })
  const [saved, setSaved] = useState<Set<string>>(() => new Set())
  const [pollChoice, setPollChoice] = useState<Record<string, number>>({})
  const [sort, setSort] = useState<Sort>('hot')
  const [period, setPeriod] = useState<Period>('week')
  const [view, setView] = useState<'card' | 'compact'>('card')
  const [query, setQuery] = useState('')
  const [joined, setJoined] = useState(false)
  const [online, setOnline] = useState(1203)
  const [openId, setOpenId] = useState<string | null>(null)
  const [threads, setThreads] = useState<Record<string, Comment[]>>({})
  const [commentSort, setCommentSort] = useState<CommentSort>('best')
  const [fresh, setFresh] = useState<Set<string>>(() => new Set())
  const [burst, setBurst] = useState<Ctx['burst']>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unread, setUnread] = useState(NOTIFS.length)
  const listRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    const t = window.setInterval(() => setOnline((n) => Math.max(900, n + Math.round((Math.random() - 0.45) * 14))), 2600)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  const say = useCallback((text: string) => setToast({ id: Date.now(), text }), [])
  const markFresh = useCallback((id: string) => {
    setFresh((s) => new Set(s).add(id))
  }, [])

  const ctx = useMemo<Ctx>(
    () => ({
      reduced,
      votes,
      vote: (id, v) => setVotes((m) => ({ ...m, [id]: v })),
      saved,
      toggleSave: (id) =>
        setSaved((s) => {
          const n = new Set(s)
          if (n.has(id)) {
            n.delete(id)
            say('保存を解除しました')
          } else {
            n.add(id)
            say('保存しました')
          }
          return n
        }),
      share: (id) => {
        void navigator.clipboard?.writeText(`https://burrow.example/b/weekend_camp/${id}`).catch(() => {})
        say('リンクをコピーしました')
      },
      award: (id, a) => {
        setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, awards: { ...p.awards, [a]: (p.awards[a] ?? 0) + 1 } } : p)))
        setBurst((b) => ({ id, award: a, n: (b?.n ?? 0) + 1 }))
        say(`${AWARDS[a].label}を贈りました`)
      },
      burst,
      pollChoice,
      votePoll: (id, i) => setPollChoice((m) => ({ ...m, [id]: i })),
      fresh,
      commentSort,
      reply: (postId, parentId, text) => {
        const node: Comment = { id: nextId('me'), author: ME, text, score: 1, ageMin: 0, children: [] }
        setVotes((m) => ({ ...m, [node.id]: 1 }))
        markFresh(node.id)
        setThreads((t) => {
          const list = t[postId] ?? []
          return { ...t, [postId]: parentId ? mapTree(list, parentId, (n) => ({ ...n, children: [node, ...n.children] })) : [node, ...list] }
        })
      },
      loadMore: (postId, commentId) => {
        const rand = mulberry32(hash(commentId) + 3)
        setThreads((t) => ({
          ...t,
          [postId]: mapTree(t[postId] ?? [], commentId, (n) => {
            const extra = Array.from({ length: n.more ?? 0 }, () => poolComment(rand, n.ageMin))
            extra.forEach((e) => markFresh(e.id))
            return { ...n, more: 0, children: [...n.children, ...extra] }
          }),
        }))
      },
    }),
    [reduced, votes, saved, burst, pollChoice, fresh, commentSort, say, markFresh],
  )

  const visible = useMemo(() => {
    const q = query.trim()
    let list = posts.filter((p) => !q || `${p.title} ${'body' in p ? p.body ?? '' : ''} ${p.author}`.includes(q))
    if (sort === 'top') list = list.filter((p) => p.ageMin <= PERIOD_MIN[period])
    const key = (p: Post) =>
      sort === 'new' ? -p.ageMin : sort === 'top' ? p.score : sort === 'rising' ? p.velocity : p.score / Math.pow(p.ageMin / 60 + 2, 1.5)
    list = [...list].sort((a, b) => key(b) - key(a))
    if (sort === 'hot') list.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    return list
  }, [posts, sort, period, query])

  const openPost = posts.find((p) => p.id === openId) ?? null
  const open = useCallback(
    (id: string) => {
      const p = posts.find((x) => x.id === id)
      if (!p) return
      setThreads((t) => (t[id] ? t : { ...t, [id]: buildThread(p) }))
      setFocusId(id)
      setOpenId(id)
    },
    [posts],
  )
  useEffect(() => {
    if (openId) detailRef.current?.scrollTo({ top: 0 })
  }, [openId])

  const submitPost = (title: string, body: string, flair: FlairId) => {
    const id = nextId('post')
    const post: Post = { id, author: ME, ageMin: 0, score: 0, comments: 0, flair, title, velocity: 0, awards: {}, kind: 'text', body }
    setPosts((ps) => [post, ...ps])
    setVotes((m) => ({ ...m, [id]: 1 }))
    markFresh(id)
    setSort('new')
    setQuery('')
    listRef.current?.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
    say('投稿しました')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement
    if (t.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
    if (openId) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpenId(null)
      }
      return
    }
    const idx = visible.findIndex((p) => p.id === focusId)
    if (e.key === 'j' || e.key === 'k') {
      e.preventDefault()
      const next = visible[Math.min(visible.length - 1, Math.max(0, idx === -1 ? 0 : idx + (e.key === 'j' ? 1 : -1)))]
      if (!next) return
      setFocusId(next.id)
      cardRefs.current.get(next.id)?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
    } else if ((e.key === 'a' || e.key === 'z') && focusId) {
      e.preventDefault()
      const cur = votes[focusId] ?? 0
      const want: Vote = e.key === 'a' ? 1 : -1
      ctx.vote(focusId, cur === want ? 0 : want)
    } else if ((e.key === 'Enter' || e.key === 'o') && focusId && !t.closest('button, a')) {
      e.preventDefault()
      open(focusId)
    }
  }

  const thread = openPost ? threads[openPost.id] ?? [] : []
  const sortedThread = useMemo(() => sortComments(thread, commentSort), [thread, commentSort])
  const added = useMemo(() => {
    const mine = (l: Comment[]): number => l.reduce((s, n) => s + (n.author === ME ? 1 : 0) + mine(n.children), 0)
    return mine(thread)
  }, [thread])

  const ease = [0.2, 0.8, 0.2, 1] as const

  return (
    <ForumCtx.Provider value={ctx}>
      <style>{`@keyframes burrow-flash { 0%, 30% { background: var(--b-acc-soft); } 100% { background: transparent; } }`}</style>
      <div
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={THEMES[theme]}
        className="@container relative flex h-full w-full flex-col overflow-hidden bg-(--b-bg) font-['Noto_Sans_JP',Inter,sans-serif] text-(--b-text) transition-colors duration-300 outline-none"
      >
        {/* ── トップバー ── */}
        <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-(--b-line) bg-(--b-panel) px-2.5 @lg:gap-3 @lg:px-4">
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-(--b-acc)"
            aria-label="Burrow ホーム"
          >
            <BurrowMark />
            <span className="hidden text-[17px] font-black tracking-tight @md:inline">burrow</span>
          </button>
          <label className="relative mx-auto hidden h-9 max-w-md min-w-0 flex-1 items-center @lg:flex">
            <Search size={15} className="pointer-events-none absolute left-3 text-(--b-faint)" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpenId(null)
              }}
              placeholder={`b/${COMMUNITY} を検索`}
              aria-label="コミュニティ内を検索"
              className="h-full w-full rounded-full border border-(--b-line) bg-(--b-panel2) pr-8 pl-9 text-[13px] text-(--b-text) outline-none placeholder:text-(--b-faint) focus:border-(--b-acc) focus:shadow-[0_0_0_3px_var(--b-acc-soft)]"
            />
            {query && (
              <button type="button" aria-label="検索語を消す" onClick={() => setQuery('')} className="absolute right-2 grid size-5 place-items-center rounded-full text-(--b-muted) hover:bg-(--b-hover)">
                <X size={13} />
              </button>
            )}
          </label>
          <div className="ml-auto flex items-center gap-0.5 @lg:ml-0">
            <button type="button" aria-label="検索" className={cx(iconBtn, '@lg:hidden')} onClick={() => setQuery(query ? '' : 'テント')}>
              <Search size={17} />
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenId(null)
                setComposerOpen(true)
                listRef.current?.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
              }}
              className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-semibold text-(--b-text) hover:bg-(--b-hover) focus-visible:outline-2 focus-visible:outline-(--b-acc)"
            >
              <Plus size={17} /> <span className="hidden @md:inline">作成</span>
            </button>
            <button
              type="button"
              aria-label={theme === 'dark' ? 'ライトテーマにする' : 'ダークテーマにする'}
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className={iconBtn}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: reduced ? 0 : -90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: reduced ? 0 : 90, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.25 }}
                  className="grid"
                >
                  {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
                </motion.span>
              </AnimatePresence>
            </button>
            <span className="relative">
              <button
                type="button"
                aria-label={`通知 ${unread}件`}
                aria-expanded={notifOpen}
                className={iconBtn}
                onClick={() => {
                  setNotifOpen((o) => !o)
                  setUnread(0)
                }}
              >
                <Bell size={17} />
                <AnimatePresence>
                  {unread > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-(--b-down) px-1 text-[9.5px] font-bold text-white"
                    >
                      {unread}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: reduced ? 0 : -6, scale: reduced ? 1 : 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -6, scale: reduced ? 1 : 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="absolute top-full right-0 z-40 mt-2 w-[min(18rem,calc(100cqw-1.5rem))] origin-top-right rounded-xl border border-(--b-line) bg-(--b-panel) p-1.5 shadow-(--b-shadow)"
                  >
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[12.5px] font-bold">通知</span>
                      <button type="button" aria-label="通知を閉じる" className={cx(iconBtn, 'size-6')} onClick={() => setNotifOpen(false)}>
                        <X size={14} />
                      </button>
                    </div>
                    {NOTIFS.map((n) => (
                      <div key={n.who} className="flex gap-2 rounded-lg px-2 py-2 text-[12px] hover:bg-(--b-hover)">
                        <Avatar seed={n.who} size={28} />
                        <p className="leading-snug text-(--b-muted)">
                          <span className="font-semibold text-(--b-text)">u/{n.who}</span> {n.text}
                          <span className="block text-[10.5px] text-(--b-faint)">{n.ago}</span>
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </span>
            <span className="ml-1 rounded-full ring-2 ring-(--b-line)">
              <Avatar seed={ME} size={28} />
            </span>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          {/* ── 左ナビ ── */}
          <nav aria-label="コミュニティ" className="hidden w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-(--b-line) bg-(--b-panel) p-2 @5xl:flex">
            {[
              { label: 'ホーム', icon: House },
              { label: '人気', icon: TrendingUp },
              { label: '探す', icon: Compass },
            ].map(({ label, icon: I }) => (
              <button key={label} type="button" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-(--b-text) hover:bg-(--b-hover) focus-visible:outline-2 focus-visible:outline-(--b-acc)">
                <I size={17} className="text-(--b-muted)" /> {label}
              </button>
            ))}
            <div className="mx-2 my-2 border-t border-(--b-line)" />
            <p className="px-2.5 pb-1 text-[10.5px] font-bold tracking-wider text-(--b-faint)">参加中のコミュニティ</p>
            {NAV.map(({ name, icon: I, color }, i) => (
              <button
                key={name}
                type="button"
                aria-current={i === 0 ? 'page' : undefined}
                onClick={() => setOpenId(null)}
                className={cx(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] focus-visible:outline-2 focus-visible:outline-(--b-acc)',
                  i === 0 ? 'bg-(--b-acc-soft) font-semibold text-(--b-text)' : 'text-(--b-muted) hover:bg-(--b-hover) hover:text-(--b-text)',
                )}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full text-white" style={{ background: color }}>
                  <I size={13} />
                </span>
                <span className="truncate">b/{name}</span>
              </button>
            ))}
            <button type="button" className="mt-1 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-(--b-muted) hover:bg-(--b-hover) focus-visible:outline-2 focus-visible:outline-(--b-acc)">
              <span className="grid size-6 place-items-center rounded-full border border-dashed border-(--b-faint)">
                <Plus size={13} />
              </span>
              コミュニティを作成
            </button>
          </nav>

          {/* ── 一覧(詳細を開いてもマウントしたまま=スクロール位置を保持) ── */}
          <div ref={listRef} inert={Boolean(openId)} className="min-w-0 flex-1 overflow-y-auto [scrollbar-color:var(--b-line)_transparent]">
            <div className="relative h-20 overflow-hidden @lg:h-28">
              <BannerArt />
            </div>
            <div className="mx-auto max-w-[1000px] px-3 @lg:px-5">
              {/* アイコンだけをバナーに食い込ませ、名前はバナーの下に置く */}
              <div className="relative z-[1] flex items-start gap-3 pt-2">
                <span className="-mt-9 shrink-0 rounded-full border-4 border-(--b-bg) bg-(--b-bg) @lg:-mt-11">
                  <CommunityIcon size={56} />
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-[18px] leading-tight font-black @lg:text-[22px]">b/{COMMUNITY}</h1>
                  <p className="truncate text-[11.5px] text-(--b-muted)">
                    メンバー {fmt.format(184_200 + (joined ? 1 : 0))} · <span className="text-(--b-acc)">●</span> {fmt.format(online)} 人がオンライン
                  </p>
                </div>
                <div className="flex items-center gap-1 self-center">
                  <JoinButton
                    joined={joined}
                    onJoin={() => {
                      setJoined((j) => !j)
                      say(joined ? 'コミュニティから退出しました' : `b/${COMMUNITY} に参加しました`)
                    }}
                  />
                  <button type="button" aria-label="コミュニティの通知" className={cx(iconBtn, 'hidden @sm:inline-grid')}>
                    <Bell size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-5">
                <main className="min-w-0 flex-1 space-y-3 pb-8">
                  <Composer open={composerOpen} setOpen={setComposerOpen} onSubmit={submitPost} />

                  {/* 並び替え */}
                  <div className="flex items-center gap-1">
                    <LayoutGroup id="burrow-sort">
                      <div role="tablist" aria-label="並び替え" className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
                        {SORTS.map(({ id, label, icon: I }) => (
                          <button
                            key={id}
                            role="tab"
                            type="button"
                            aria-selected={sort === id}
                            onClick={() => setSort(id)}
                            className={cx(
                              'relative inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[12.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-(--b-acc)',
                              sort === id ? 'text-(--b-text)' : 'text-(--b-muted) hover:text-(--b-text)',
                            )}
                          >
                            {sort === id && (
                              <motion.span
                                layoutId="sort-pill"
                                className="absolute inset-0 rounded-full bg-(--b-hover) ring-1 ring-(--b-line)"
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                              />
                            )}
                            <I size={14} className={cx('relative', sort === id && 'text-(--b-acc)')} />
                            <span className="relative">{label}</span>
                          </button>
                        ))}
                      </div>
                    </LayoutGroup>
                    <AnimatePresence initial={false}>
                      {sort === 'top' && (
                        <motion.label
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: reduced ? 0 : 0.2 }}
                          className="relative shrink-0 overflow-hidden"
                        >
                          <span className="sr-only">期間</span>
                          <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as Period)}
                            className="h-8 cursor-pointer appearance-none rounded-full border border-(--b-line) bg-(--b-panel) pr-7 pl-3 text-[12px] font-semibold text-(--b-text) outline-none focus-visible:border-(--b-acc)"
                          >
                            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                              <option key={p} value={p}>
                                {PERIOD_LABEL[p]}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={13} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-(--b-muted)" />
                        </motion.label>
                      )}
                    </AnimatePresence>
                    <div className="ml-auto flex shrink-0 items-center rounded-full border border-(--b-line) bg-(--b-panel) p-0.5" role="group" aria-label="表示方法">
                      {(
                        [
                          ['card', Rows3, 'カード表示'],
                          ['compact', LayoutList, 'コンパクト表示'],
                        ] as const
                      ).map(([id, I, label]) => (
                        <button
                          key={id}
                          type="button"
                          aria-label={label}
                          aria-pressed={view === id}
                          onClick={() => setView(id)}
                          className={cx(
                            'grid size-7 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-(--b-acc)',
                            view === id ? 'bg-(--b-acc-soft) text-(--b-acc)' : 'text-(--b-muted) hover:text-(--b-text)',
                          )}
                        >
                          <I size={15} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {query && (
                    <p className="text-[12px] text-(--b-muted)">
                      「{query}」の検索結果 {visible.length}件
                    </p>
                  )}

                  <LayoutGroup id="burrow-posts">
                    <div className={cx(view === 'card' ? 'space-y-3' : 'overflow-hidden rounded-xl border border-(--b-line)')}>
                      <AnimatePresence initial={false} mode="popLayout">
                        {visible.map((p) => (
                          <PostCard
                            key={`${view}-${p.id}`}
                            post={p}
                            view={view}
                            focused={focusId === p.id}
                            fresh={fresh.has(p.id)}
                            onOpen={() => open(p.id)}
                            cardRef={(el) => {
                              if (el) cardRefs.current.set(p.id, el)
                              else cardRefs.current.delete(p.id)
                            }}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </LayoutGroup>
                  {visible.length === 0 && (
                    <div className="rounded-xl border border-dashed border-(--b-line) py-10 text-center text-[13px] text-(--b-muted)">
                      <Tent size={28} className="mx-auto mb-2 text-(--b-faint)" />
                      条件に合う投稿がありません
                    </div>
                  )}
                </main>
                <Sidebar
                  joined={joined}
                  online={online}
                  onJoin={() => {
                    setJoined((j) => !j)
                    say(joined ? 'コミュニティから退出しました' : `b/${COMMUNITY} に参加しました`)
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── 投稿の詳細(一覧の上に重ねる) ── */}
          <AnimatePresence>
            {openPost && (
              <motion.div
                key="detail"
                ref={detailRef}
                initial={{ opacity: 0, x: reduced ? 0 : 48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduced ? 0 : 48 }}
                transition={{ duration: reduced ? 0.12 : 0.32, ease }}
                className="absolute inset-y-0 right-0 left-0 z-10 overflow-y-auto bg-(--b-bg) @5xl:left-52 [scrollbar-color:var(--b-line)_transparent]"
              >
                <div className="sticky top-0 z-10 border-b border-(--b-line) bg-(--b-bg)/90 backdrop-blur">
                  <div className="mx-auto flex h-11 max-w-[1000px] items-center gap-2 px-3 @lg:px-5">
                    <button type="button" onClick={() => setOpenId(null)} aria-label="一覧に戻る" className={iconBtn}>
                      <ArrowLeft size={18} />
                    </button>
                    <CommunityIcon size={24} />
                    <span className="truncate text-[13px] font-bold">b/{COMMUNITY}</span>
                    <span className="hidden truncate text-[12px] text-(--b-muted) @xl:inline">· {openPost.title}</span>
                  </div>
                </div>
                <div className="mx-auto flex max-w-[1000px] gap-5 px-3 pt-3 @lg:px-5">
                  <main className="min-w-0 flex-1 pb-10">
                    <article className="flex gap-1">
                      <div className="hidden w-10 shrink-0 justify-center pt-1 @md:flex">
                        <VoteControl id={openPost.id} base={openPost.score} size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <PostMeta post={openPost} />
                        <h2 className="mt-2 text-[19px] leading-snug font-bold @lg:text-[21px]">{openPost.title}</h2>
                        <div className="mt-1.5">
                          <FlairChip id={openPost.flair} />
                        </div>
                        <PostBody post={openPost} full />
                        <div className="flex items-center gap-1">
                          <span className="mt-2 rounded-full bg-(--b-panel2) px-1 @md:hidden">
                            <VoteControl id={openPost.id} base={openPost.score} layout="row" size={18} />
                          </span>
                          <PostActions post={openPost} extraComments={added} />
                        </div>
                      </div>
                    </article>

                    <div className="mt-3 @md:pl-11">
                      <ReplyBox placeholder="コメントを追加" submitLabel="コメント" onSubmit={(t) => ctx.reply(openPost.id, null, t)} />
                      <div className="mt-2 flex items-center gap-2 text-[12px] text-(--b-muted)">
                        <label className="relative inline-flex items-center">
                          <span className="mr-1.5">並び替え:</span>
                          <select
                            value={commentSort}
                            onChange={(e) => setCommentSort(e.target.value as CommentSort)}
                            className="h-7 cursor-pointer appearance-none rounded-full bg-transparent pr-6 pl-2 font-semibold text-(--b-text) outline-none hover:bg-(--b-hover) focus-visible:outline-2 focus-visible:outline-(--b-acc)"
                          >
                            {(Object.keys(COMMENT_SORTS) as CommentSort[]).map((s) => (
                              <option key={s} value={s}>
                                {COMMENT_SORTS[s]}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={13} className="pointer-events-none absolute right-1.5" />
                        </label>
                        <span className="ml-auto">{fmt.format(openPost.comments + added)}件のコメント</span>
                      </div>
                      <div className="mt-1">
                        {sortedThread.map((n) => (
                          <CommentNode key={n.id} node={n} postId={openPost.id} />
                        ))}
                        {sortedThread.length === 0 && (
                          <div className="py-10 text-center text-[13px] text-(--b-muted)">
                            <MessageCircle size={26} className="mx-auto mb-2 text-(--b-faint)" />
                            まだコメントはありません。最初のコメントをしてみましょう
                          </div>
                        )}
                      </div>
                    </div>
                  </main>
                  <Sidebar
                    joined={joined}
                    online={online}
                    onJoin={() => {
                      setJoined((j) => !j)
                      say(joined ? 'コミュニティから退出しました' : `b/${COMMUNITY} に参加しました`)
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── トースト ── */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-50 flex justify-center" aria-live="polite">
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: reduced ? 0 : 8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                className="flex items-center gap-2 rounded-full bg-(--b-text) px-4 py-2 text-[12.5px] font-semibold text-(--b-bg) shadow-(--b-shadow)"
              >
                <Check size={14} strokeWidth={3} className="text-(--b-acc)" />
                {toast.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ForumCtx.Provider>
  )
}

