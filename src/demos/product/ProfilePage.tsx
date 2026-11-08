import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type Transition } from 'motion/react'
import {
  Award,
  Bell,
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  Code2,
  Ellipsis,
  Eye,
  Flag,
  Flame,
  GitBranch,
  GitCommitHorizontal,
  Heart,
  LayoutGrid,
  Link2,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Mic,
  Moon,
  Pencil,
  Pin,
  Rocket,
  Search,
  Share2,
  Sparkles,
  Star,
  Sun,
  Tag,
  Trophy,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent as ReactSyntheticEvent,
  type ReactNode,
} from 'react'
import { Toaster, toast } from 'sonner'

/**
 * クリエイター/開発者のプロフィールページ。サービス「Makerloft」・人物・作品・バッジはすべて架空のオリジナル。
 * - カバーはテーマごとに描き分けたインライン SVG のイラスト(夕暮れの山並み/潮/森/オーロラの夜)。尾根や波は seed 付き乱数で生成し、
 *   スクロールに合わせて useScroll + useTransform でゆっくり沈むパララックスにする
 * - アバターも SVG。円/角丸/六角形/花形の clipPath と、グラデーション 8 色、イラスト顔/イニシャルのモチーフを組み合わせる
 * - ルートを @container にし、56rem 以上でプロフィールカード(左)+ タブ(右)の 2 カラム、狭いと 1 カラムに積む
 * - 統計は @number-flow/react で桁が回る。フォローするとフォロワーが +1、獲得スターは数秒ごとに増えていく。
 *   フォローボタンは「フォローする → 読み込み → フォロー中(ホバーでフォロー解除)」と状態が変わり、通知ベルが現れる
 * - タブ(概要/プロジェクト/アクティビティ/バッジ)は layoutId の下線が滑り、内容は移動方向に合わせて左右からスライド。← → キーで移動
 * - 概要: ピン留めプロジェクト(生成 SVG のサムネイル、スターの切り替え)と、1 年分の活動ヒートマップ(ホバーで日付と件数)
 * - プロジェクト: 検索・種類チップ・並び替えを layout アニメーションで並べ替え。アクティビティ: 月ごとのタイムラインと「さらに表示」
 * - バッジ: ティア別のメダル。ホバー/フォーカスで取得日や取得率の詳細カードを、画面端で向きを変えて表示。未取得は進捗バー付き
 * - 「本人」表示ではステータスと肩書きをその場で編集でき(Enter で確定、Esc で取り消し)、「プロフィールを編集」で横のシート
 *   (狭いと下からのシート)が開く。入力は下書きのまま背後のプロフィールに即反映され、保存/キャンセルで確定または元に戻す
 * - Esc・矢印キーはデモ内にフォーカスがあるときだけ。useReducedMotion 時はパララックスとスライドをやめ、短いフェードにする
 */

/* ───────────── データ ───────────── */

type Shape = 'circle' | 'squircle' | 'hexagon' | 'flower'
type Motif = 'face' | 'initial'
type CoverId = 'dusk' | 'ocean' | 'forest' | 'night'

type Profile = {
  name: string
  handle: string
  headline: string
  bio: string
  location: string
  site: string
  status: string
  statusEmoji: string
  color: number
  shape: Shape
  motif: Motif
  cover: CoverId
}

const INITIAL: Profile = {
  name: '汐見 ことり',
  handle: 'kotori',
  headline: 'クリエイティブ・デベロッパー',
  bio: 'ジェネラティブアートと、それを作るための道具を作っています。WebGL・シェーダ・音。#creativecoding の勉強会「夜更かしシェーダ部」主宰。作品は kotori.example にも。',
  location: '北海道 札幌市',
  site: 'kotori.example',
  status: '新しい粒子エンジンを仕上げ中',
  statusEmoji: '🌙',
  color: 0,
  shape: 'squircle',
  motif: 'face',
  cover: 'dusk',
}

const AV_COLORS = [
  { label: '珊瑚', a: '#ffb39c', b: '#f2557a' },
  { label: '空', a: '#a5e6ff', b: '#3b6ff6' },
  { label: '若葉', a: '#c3f7d4', b: '#13a77a' },
  { label: '藤', a: '#e6cfff', b: '#8656f0' },
  { label: '檸檬', a: '#fff1a0', b: '#f08c0a' },
  { label: '墨', a: '#7a8599', b: '#141a29' },
  { label: '桃', a: '#ffd9c7', b: '#f0628e' },
  { label: '潮', a: '#8fe0f4', b: '#0b6f86' },
]

const COVERS: { id: CoverId; label: string }[] = [
  { id: 'dusk', label: '夕凪' },
  { id: 'ocean', label: '潮騒' },
  { id: 'forest', label: '森' },
  { id: 'night', label: '極夜' },
]

const SHAPES: { id: Shape; label: string }[] = [
  { id: 'circle', label: '円' },
  { id: 'squircle', label: '角丸' },
  { id: 'hexagon', label: '六角形' },
  { id: 'flower', label: '花形' },
]

const STATUS_EMOJI = ['🌙', '🎧', '🛠️', '☕', '🌱', '✈️']

type Lang = 'TypeScript' | 'GLSL' | 'Rust' | 'Python'
const LANG_COLOR: Record<Lang, string> = { TypeScript: '#3d7be0', GLSL: '#a35bd8', Rust: '#d9773b', Python: '#3aa676' }
type Kind = 'tool' | 'art' | 'lib'
const KIND_LABEL: Record<Kind, string> = { tool: 'ツール', art: 'アート', lib: 'ライブラリ' }
type Thumb = 'particles' | 'waves' | 'grass' | 'ui' | 'noise' | 'zine' | 'pixel' | 'ink' | 'plot'

type Project = { id: string; name: string; desc: string; lang: Lang; kind: Kind; stars: number; forks: number; updated: string; days: number; thumb: Thumb; pinned?: boolean; hue: number }
const PROJECTS: Project[] = [
  { id: 'hoshikuzu', name: 'hoshikuzu', desc: 'GPU で 100 万粒を動かす粒子シミュレーションエンジン。力場とトレイルをノードでつなぐ。', lang: 'TypeScript', kind: 'tool', stars: 2412, forks: 186, updated: '2 日前', days: 2, thumb: 'particles', pinned: true, hue: 262 },
  { id: 'tsumugi', name: 'tsumugi-ui', desc: '生成アートのためのパラメータ UI キット。スライダーの値を URL に保存して共有できる。', lang: 'TypeScript', kind: 'lib', stars: 1530, forks: 97, updated: '3 日前', days: 3, thumb: 'ui', pinned: true, hue: 200 },
  { id: 'nagisa', name: 'nagisa-shaders', desc: '波打ち際・泡・濡れた砂を描くフラグメントシェーダ集。すべて 1 ファイルで完結。', lang: 'GLSL', kind: 'art', stars: 1180, forks: 64, updated: '1 週間前', days: 7, thumb: 'waves', pinned: true, hue: 190 },
  { id: 'otokusa', name: 'otokusa', desc: 'マイクの音に反応して伸びる草原。展示「夜の温室」で使ったもの。', lang: 'TypeScript', kind: 'art', stars: 864, forks: 41, updated: '2 週間前', days: 14, thumb: 'grass', pinned: true, hue: 140 },
  { id: 'kumo', name: 'kumo-noise', desc: 'Perlin / Simplex / Worley を SIMD で速くしたノイズ関数ライブラリ。', lang: 'Rust', kind: 'lib', stars: 642, forks: 38, updated: '1 か月前', days: 30, thumb: 'noise', hue: 24 },
  { id: 'sumi', name: 'sumi-brush', desc: '和紙ににじむ墨のブラシ。反応拡散で輪郭を揺らす。', lang: 'GLSL', kind: 'art', stars: 518, forks: 22, updated: '1 か月前', days: 35, thumb: 'ink', hue: 0 },
  { id: 'tide', name: 'pixel-tide', desc: 'ドット絵の潮だまりを自動で描くジェネレーター。パレット指定つき。', lang: 'Python', kind: 'tool', stars: 377, forks: 19, updated: '2 か月前', days: 60, thumb: 'pixel', hue: 180 },
  { id: 'hikari', name: 'hikari-plot', desc: 'ペンプロッタ向けに線を最適化して SVG を書き出すツール。', lang: 'Python', kind: 'tool', stars: 291, forks: 12, updated: '3 か月前', days: 90, thumb: 'plot', hue: 320 },
  { id: 'zine', name: 'yofukashi-zine', desc: '夜更かしシェーダ部の作品集サイト。毎月のお題と投稿作品をまとめている。', lang: 'TypeScript', kind: 'art', stars: 168, forks: 30, updated: '4 か月前', days: 120, thumb: 'zine', hue: 230 },
]

type ActType = 'release' | 'push' | 'badge' | 'talk' | 'comment' | 'star' | 'fork'
type Act = { type: ActType; title: string; detail?: string; when: string; repo?: string }
const ACT_META: Record<ActType, { icon: LucideIcon; color: string }> = {
  release: { icon: Rocket, color: '#8b5cf6' },
  push: { icon: GitCommitHorizontal, color: '#3d7be0' },
  badge: { icon: Award, color: '#e0a21b' },
  talk: { icon: Mic, color: '#f2557a' },
  comment: { icon: MessageSquare, color: '#13a77a' },
  star: { icon: Star, color: '#f08c0a' },
  fork: { icon: GitBranch, color: '#64748b' },
}
const ACTIVITY: { month: string; items: Act[] }[] = [
  {
    month: '2026年11月',
    items: [
      { type: 'release', title: 'hoshikuzu v2.4.0 をリリース', detail: 'GPU パーティクルの衝突判定を 3 倍高速化。トレイルの色をグラデーションで指定できるようにしました。', when: '2 日前', repo: 'hoshikuzu' },
      { type: 'push', title: 'tsumugi-ui に 12 件のコミットをプッシュ', detail: 'カラーピッカーのキーボード操作 / プリセットの書き出し / 型の整理', when: '3 日前', repo: 'tsumugi-ui' },
      { type: 'badge', title: 'バッジ「夜明けの灯台」を獲得', detail: '30 日連続で活動しました。', when: '5 日前' },
      { type: 'talk', title: '「シェーダで描く水面」で登壇', detail: '北のクリエイティブコード祭 2026 · スライドと作例を公開しました', when: '1 週間前' },
    ],
  },
  {
    month: '2026年10月',
    items: [
      { type: 'comment', title: 'nagisa-shaders の Issue #48 にコメント', detail: '「フレネル項は Schlick の近似で十分そう。泡の境界だけ別パスにすると…」', when: '10月28日', repo: 'nagisa-shaders' },
      { type: 'star', title: 'mizuhiki/ribbon-trails にスター', when: '10月24日' },
      { type: 'fork', title: 'aoba/fluid-sketch をフォーク', when: '10月19日' },
      { type: 'release', title: 'otokusa v1.2.0 をリリース', detail: '低音で花が咲くモードを追加。展示用のキオスク表示に対応。', when: '10月11日', repo: 'otokusa' },
    ],
  },
]
const ACTIVITY_MORE: { month: string; items: Act[] }[] = [
  {
    month: '2026年9月',
    items: [
      { type: 'badge', title: 'バッジ「千星」を獲得', detail: 'hoshikuzu のスターが 1,000 を超えました。', when: '9月22日' },
      { type: 'push', title: 'kumo-noise に 31 件のコミットをプッシュ', detail: 'Worley ノイズの SIMD 化と、ベンチマークの追加', when: '9月14日', repo: 'kumo-noise' },
      { type: 'talk', title: '夜更かしシェーダ部 #31「反応拡散」を開催', detail: '参加 48 人 · 投稿作品 23 点', when: '9月6日' },
    ],
  },
]

type Tier = 'bronze' | 'silver' | 'gold' | 'legend'
type Badge = { id: string; name: string; desc: string; tier: Tier; icon: LucideIcon; shape: 'hex' | 'circle' | 'shield'; earned?: string; rarity: number; progress?: [number, number, string] }
const TIER: Record<Tier, { label: string; a: string; b: string; ring: string }> = {
  bronze: { label: 'ブロンズ', a: '#f3b38a', b: '#b0612f', ring: '#ffd9bf' },
  silver: { label: 'シルバー', a: '#e5ebf3', b: '#8a96a8', ring: '#ffffff' },
  gold: { label: 'ゴールド', a: '#ffe08a', b: '#d48b07', ring: '#fff3c4' },
  legend: { label: 'レジェンド', a: '#d8b4fe', b: '#6d28d9', ring: '#f5e8ff' },
}
const BADGES: Badge[] = [
  { id: 'first', name: 'はじめの一歩', desc: '最初のプロジェクトを公開した', tier: 'bronze', icon: Sparkles, shape: 'circle', earned: '2021年4月12日', rarity: 71.4 },
  { id: 'star100', name: '百星', desc: 'ひとつのプロジェクトでスター 100 を獲得', tier: 'silver', icon: Star, shape: 'hex', earned: '2022年2月3日', rarity: 18.2 },
  { id: 'star1000', name: '千星', desc: 'ひとつのプロジェクトでスター 1,000 を獲得', tier: 'gold', icon: Trophy, shape: 'hex', earned: '2026年9月22日', rarity: 2.6 },
  { id: 'lighthouse', name: '夜明けの灯台', desc: '30 日連続で活動した', tier: 'gold', icon: Flame, shape: 'shield', earned: '2026年11月3日', rarity: 4.1 },
  { id: 'speaker', name: '語り部', desc: '登壇・記事の公開を 5 回', tier: 'silver', icon: Mic, shape: 'circle', earned: '2025年6月18日', rarity: 7.9 },
  { id: 'bridge', name: '架け橋', desc: '他の人のプロジェクトでプルリクエストが 10 件マージ', tier: 'silver', icon: GitBranch, shape: 'shield', earned: '2024年11月30日', rarity: 11.3 },
  { id: 'owl', name: '夜更かし', desc: '深夜 0〜4 時に 100 回コミット', tier: 'bronze', icon: Moon, shape: 'circle', earned: '2022年8月9日', rarity: 9.6 },
  { id: 'host', name: '部長', desc: '勉強会を 30 回以上主催', tier: 'legend', icon: Users, shape: 'hex', earned: '2026年7月5日', rarity: 0.4 },
  { id: 'heart', name: '応援団', desc: '他の作品に 500 回「いいね」した', tier: 'bronze', icon: Heart, shape: 'shield', earned: '2023年3月1日', rarity: 22.5 },
  { id: 'mentor', name: '師範', desc: '質問に 50 回ベストアンサー', tier: 'gold', icon: MessageSquare, shape: 'circle', rarity: 1.8, progress: [34, 50, '回'] },
  { id: 'star10k', name: '万星', desc: '獲得スターの合計 10,000', tier: 'legend', icon: Zap, shape: 'hex', rarity: 0.2, progress: [8930, 10000, '★'] },
  { id: 'rings', name: '年輪', desc: 'Makerloft に 5 年在籍', tier: 'silver', icon: CalendarDays, shape: 'shield', rarity: 6.0, progress: [4.6, 5, '年'] },
]

/* ───────────── ユーティリティ ───────────── */

function rng(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const fmt = (n: number) => n.toLocaleString('ja-JP')
const ease: Transition = { type: 'spring', stiffness: 480, damping: 38 }
const TID = 'profile-page'
const tOpt = { toasterId: TID }
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
const btn = `inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-bold transition-[background-color,color,border-color,transform,box-shadow] active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 ${focusRing}`
const btnGhost = `${btn} border border-[var(--line2)] bg-[var(--panel)] text-[var(--fg)] hover:bg-[var(--hover)]`
const iconBtnRound = `grid size-9 shrink-0 place-items-center rounded-full border border-[var(--line2)] bg-[var(--panel)] text-[var(--fg)] transition-colors hover:bg-[var(--hover)] ${focusRing}`
const inputCls =
  'h-9 w-full rounded-lg border border-[var(--line2)] bg-[var(--panel)] px-3 text-[13px] text-[var(--fg)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--mute)] focus:border-[var(--accent)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]'

function copyText(s: string) {
  try {
    navigator.clipboard?.writeText(s).catch(() => {})
  } catch {
    /* 非対応環境では何もしない */
  }
}

/* ───────────── アバター ───────────── */

function flowerPath() {
  const pts: string[] = []
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2
    const r = 45 + 5 * Math.cos(t * 8)
    pts.push(`${(50 + r * Math.cos(t - Math.PI / 2)).toFixed(2)} ${(50 + r * Math.sin(t - Math.PI / 2)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}
const SHAPE_PATH: Record<Shape, string> = {
  circle: 'M50 0a50 50 0 1 1 0 100a50 50 0 1 1 0-100z',
  squircle: 'M50 0C86 0 100 14 100 50S86 100 50 100S0 86 0 50S14 0 50 0z',
  hexagon: 'M50 1.5Q53 1.5 56 3.2L90 22.8Q95 25.6 95 31.4V68.6Q95 74.4 90 77.2L56 96.8Q50 100 44 96.8L10 77.2Q5 74.4 5 68.6V31.4Q5 25.6 10 22.8L44 3.2Q47 1.5 50 1.5Z',
  flower: flowerPath(),
}

function Avatar({ p, size, ring = true, className = '' }: { p: Pick<Profile, 'color' | 'shape' | 'motif' | 'name'>; size: number; ring?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '')
  const c = AV_COLORS[p.color]
  const d = SHAPE_PATH[p.shape]
  return (
    <svg width={size} height={size} viewBox="-5 -5 110 110" className={`block shrink-0 overflow-visible ${className}`} role="img" aria-label={`${p.name} のアバター`}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.a} />
          <stop offset="1" stopColor={c.b} />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <path d={d} />
        </clipPath>
      </defs>
      {ring && <path d={d} fill="var(--panel)" stroke="var(--panel)" strokeWidth="9" strokeLinejoin="round" />}
      <g clipPath={`url(#c${id})`}>
        <rect x="-5" y="-5" width="110" height="110" fill={`url(#g${id})`} />
        <circle cx="82" cy="16" r="26" fill="white" opacity=".16" />
        {p.motif === 'face' ? (
          <g>
            <ellipse cx="50" cy="58" rx="31" ry="34" fill="#2a2036" />
            <path d="M14 104C18 80 36 73 50 73S82 80 86 104Z" fill="white" opacity=".88" />
            <path d="M42 73h16v6c0 4-16 4-16 0z" fill="#f6cdb6" />
            <ellipse cx="50" cy="53" rx="21" ry="23" fill="#ffe2cf" />
            <path d="M28 52C27 31 39 24 52 24C67 24 75 35 73 52C67 43 59 39 51 41C45 36 35 41 28 52Z" fill="#2a2036" />
            <path d="M40.5 56q3.2 3.4 6.4 0M53.5 56q3.2 3.4 6.4 0" stroke="#2a2036" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <circle cx="39" cy="62.5" r="3.6" fill="#ff8fa3" opacity=".55" />
            <circle cx="62" cy="62.5" r="3.6" fill="#ff8fa3" opacity=".55" />
            <path d="M47.5 65.5q2.5 2.4 5 0" stroke="#c0546c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M67 30l1.9 4.2 4.6.5-3.4 3.1 1 4.5-4.1-2.4-4 2.4 1-4.5-3.4-3.1 4.6-.5z" fill={c.b} stroke="white" strokeWidth="1" />
          </g>
        ) : (
          <text x="50" y="52" dy=".36em" textAnchor="middle" fontSize="46" fontWeight="800" fill="white" fontFamily="inherit">
            {p.name.trim().charAt(0) || '？'}
          </text>
        )}
      </g>
    </svg>
  )
}

/* ───────────── カバー ───────────── */

function ridge(seed: number, base: number, amp: number, step = 60, w = 1200, h = 320) {
  const r = rng(seed)
  let d = `M0 ${h}L0 ${base}`
  let y = base
  for (let x = step; x <= w + step; x += step) {
    y = Math.max(base - amp, Math.min(base + amp * 0.4, y + (r() - 0.55) * amp * 0.9))
    const cx = x - step / 2
    d += `Q${cx} ${y - amp * 0.35 * r()} ${x} ${y}`
  }
  return `${d}L${w + step} ${h}Z`
}
function wave(base: number, amp: number, len: number, phase: number, w = 1200, h = 320) {
  let d = `M0 ${h}L0 ${base}`
  for (let x = 0; x <= w; x += 20) d += `L${x} ${(base + Math.sin(x / len + phase) * amp + Math.sin(x / (len * 0.37) + phase * 2) * amp * 0.3).toFixed(1)}`
  return `${d}L${w} ${h}Z`
}

function Cover({ id, reduce }: { id: CoverId; reduce: boolean }) {
  const uid = useId().replace(/:/g, '')
  const stars = useMemo(() => {
    const r = rng(77)
    return Array.from({ length: 70 }, () => ({ x: r() * 1200, y: r() * 200, s: 0.6 + r() * 1.6, o: 0.4 + r() * 0.6 }))
  }, [])
  const trees = useMemo(() => {
    const r = rng(9)
    return Array.from({ length: 34 }, (_, i) => ({ x: i * 37 + r() * 20, h: 30 + r() * 46, y: 248 + r() * 26 }))
  }, [])
  return (
    <svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
          {id === 'dusk' && (
            <>
              <stop offset="0" stopColor="#2c1f55" />
              <stop offset=".55" stopColor="#c9688f" />
              <stop offset="1" stopColor="#ffc59a" />
            </>
          )}
          {id === 'ocean' && (
            <>
              <stop offset="0" stopColor="#0b2e57" />
              <stop offset="1" stopColor="#5cbfe0" />
            </>
          )}
          {id === 'forest' && (
            <>
              <stop offset="0" stopColor="#e9f7ef" />
              <stop offset="1" stopColor="#b7e3c9" />
            </>
          )}
          {id === 'night' && (
            <>
              <stop offset="0" stopColor="#050818" />
              <stop offset="1" stopColor="#1b2860" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`au${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#34d399" stopOpacity="0" />
          <stop offset=".4" stopColor="#34d399" stopOpacity=".55" />
          <stop offset=".7" stopColor="#a78bfa" stopOpacity=".5" />
          <stop offset="1" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
        <filter id={`bl${uid}`}>
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <pattern id={`dots${uid}`} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="white" opacity=".13" />
        </pattern>
      </defs>
      <rect width="1200" height="320" fill={`url(#sky${uid})`} />
      {id === 'dusk' && (
        <g>
          <circle cx="840" cy="214" r="86" fill="#ffe7b8" opacity=".85" />
          <circle cx="840" cy="214" r="130" fill="#ffe7b8" opacity=".14" />
          <path d={ridge(3, 210, 60)} fill="#8f4f86" opacity=".75" />
          <path d={ridge(11, 246, 46, 80)} fill="#5c3471" />
          <path d={ridge(21, 282, 30, 100)} fill="#341f4e" />
          {[0, 1, 2].map((i) => (
            <motion.path
              key={i}
              d="M0 0q6-6 12 0q6-6 12 0"
              stroke="#2c1f55"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              initial={{ x: 280 + i * 46, y: 90 + i * 16 }}
              animate={reduce ? undefined : { x: [280 + i * 46, 330 + i * 46, 280 + i * 46], y: [90 + i * 16, 80 + i * 16, 90 + i * 16] }}
              transition={{ duration: 9 + i, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </g>
      )}
      {id === 'ocean' && (
        <g>
          <circle cx="300" cy="96" r="38" fill="#f4f9ff" opacity=".95" />
          <circle cx="314" cy="86" r="34" fill="#0b2e57" opacity=".18" />
          <path d={wave(200, 10, 90, 0)} fill="#2b84b9" opacity=".7" />
          <path d={wave(232, 12, 70, 1.5)} fill="#1b6aa0" opacity=".85" />
          <path d={wave(266, 9, 60, 3)} fill="#0f4f80" />
          <path d={wave(296, 6, 40, 4)} fill="#0a3961" />
        </g>
      )}
      {id === 'forest' && (
        <g>
          <circle cx="980" cy="80" r="44" fill="#fff6cf" />
          <path d={ridge(5, 200, 50, 90)} fill="#94d2b0" />
          <path d={ridge(15, 240, 36, 110)} fill="#5bb08a" />
          {trees.map((t, i) => (
            <path key={i} d={`M${t.x} ${t.y}l${t.h * 0.32} 0l-${t.h * 0.32} -${t.h}l-${t.h * 0.32} ${t.h}z`} fill={i % 3 ? '#2f7f62' : '#246b52'} />
          ))}
          <rect y="286" width="1200" height="40" fill="#1f5c46" />
        </g>
      )}
      {id === 'night' && (
        <g>
          <path d="M-50 150C200 60 420 190 640 110S1000 40 1260 120" stroke={`url(#au${uid})`} strokeWidth="70" fill="none" filter={`url(#bl${uid})`} />
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="white" opacity={s.o} className={!reduce && i % 7 === 0 ? 'animate-pulse' : ''} />
          ))}
          <path d={ridge(31, 250, 40, 70)} fill="#0e1538" />
          <path d={ridge(41, 284, 22, 90)} fill="#070b22" />
        </g>
      )}
      <rect width="1200" height="320" fill={`url(#dots${uid})`} />
    </svg>
  )
}

/* ───────────── プロジェクトのサムネイル ───────────── */

function ProjectThumb({ p }: { p: Project }) {
  const r = useMemo(() => rng(p.id.length * 131 + p.stars), [p.id, p.stars])
  const els = useMemo(() => {
    const out: ReactNode[] = []
    const h = p.hue
    switch (p.thumb) {
      case 'particles':
        for (let i = 0; i < 140; i++) {
          const t = i * 0.23
          const rad = 4 + i * 0.42
          out.push(<circle key={i} cx={120 + Math.cos(t) * rad * 1.6} cy={60 + Math.sin(t) * rad * 0.8} r={0.6 + r() * 1.8} fill={`hsl(${h + i * 0.8} 90% ${60 + r() * 25}%)`} opacity={0.4 + r() * 0.6} />)
        }
        break
      case 'waves':
        for (let k = 0; k < 9; k++) {
          let d = `M0 ${30 + k * 10}`
          for (let x = 0; x <= 240; x += 8) d += `L${x} ${(30 + k * 10 + Math.sin(x / 22 + k * 0.7) * (6 - k * 0.4)).toFixed(1)}`
          out.push(<path key={k} d={d} stroke={`hsl(${h + k * 4} 80% ${78 - k * 4}%)`} strokeWidth="2" fill="none" opacity={0.9 - k * 0.05} />)
        }
        break
      case 'grass':
        for (let i = 0; i < 70; i++) {
          const x = i * 3.5 + r() * 3
          const hh = 30 + r() * 60
          out.push(<path key={i} d={`M${x} 120Q${x + (r() - 0.5) * 20} ${120 - hh * 0.6} ${x + (r() - 0.3) * 18} ${120 - hh}`} stroke={`hsl(${h + r() * 30} 60% ${40 + r() * 30}%)`} strokeWidth="1.6" fill="none" />)
        }
        for (let i = 0; i < 6; i++) out.push(<circle key={`f${i}`} cx={20 + r() * 200} cy={40 + r() * 40} r="3" fill="#ffd36e" />)
        break
      case 'ui':
        for (let i = 0; i < 4; i++) {
          const y = 28 + i * 22
          const v = 0.2 + r() * 0.7
          out.push(
            <g key={i}>
              <rect x="40" y={y - 2} width="160" height="4" rx="2" fill="white" opacity=".18" />
              <rect x="40" y={y - 2} width={160 * v} height="4" rx="2" fill={`hsl(${h + i * 40} 85% 65%)`} />
              <circle cx={40 + 160 * v} cy={y} r="6" fill="white" />
            </g>,
          )
        }
        break
      case 'noise':
        for (let k = 0; k < 12; k++) {
          let d = ''
          for (let a = 0; a <= 64; a++) {
            const t = (a / 64) * Math.PI * 2
            const rr = 8 + k * 7 + Math.sin(t * 3 + k) * 4 + Math.cos(t * 5 - k * 0.5) * 2
            d += `${a ? 'L' : 'M'}${(120 + Math.cos(t) * rr * 1.5).toFixed(1)} ${(60 + Math.sin(t) * rr * 0.8).toFixed(1)}`
          }
          out.push(<path key={k} d={d + 'Z'} stroke={`hsl(${h + k * 3} 80% ${70 - k * 2}%)`} strokeWidth="1.3" fill="none" />)
        }
        break
      case 'ink':
        for (let i = 0; i < 7; i++) out.push(<circle key={i} cx={40 + r() * 160} cy={30 + r() * 60} r={8 + r() * 26} fill="#141018" opacity={0.25 + r() * 0.4} />)
        out.push(<circle key="red" cx="180" cy="34" r="10" fill="#d23c3c" />)
        break
      case 'pixel':
        for (let y = 0; y < 12; y++)
          for (let x = 0; x < 24; x++) {
            const v = Math.sin(x / 3 + y / 4) + Math.cos(y / 2 - x / 5) + r() * 0.6
            if (v > 0.3) out.push(<rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="10" height="10" fill={`hsl(${h + v * 20} 70% ${45 + v * 15}%)`} />)
          }
        break
      case 'plot':
        {
          let d = ''
          for (let i = 0; i <= 600; i++) {
            const t = (i / 600) * Math.PI * 2
            d += `${i ? 'L' : 'M'}${(120 + Math.sin(3 * t + 0.6) * 90).toFixed(1)} ${(60 + Math.sin(4 * t) * 44).toFixed(1)}`
          }
          out.push(<path key="l" d={d} stroke={`hsl(${h} 80% 72%)`} strokeWidth="1.2" fill="none" />)
        }
        break
      case 'zine':
        for (let y = 0; y < 3; y++)
          for (let x = 0; x < 5; x++) out.push(<rect key={`${x}-${y}`} x={14 + x * 44} y={12 + y * 34} width="38" height="28" rx="4" fill={`hsl(${h + (x + y * 5) * 22} 70% ${55 + r() * 20}%)`} opacity={0.85} />)
        break
    }
    return out
  }, [p, r])
  const bg = p.thumb === 'ink' ? '#f4ede0' : p.thumb === 'grass' ? '#10251c' : `hsl(${p.hue} 45% 14%)`
  return (
    <svg viewBox="0 0 240 120" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden>
      <rect width="240" height="120" fill={bg} />
      {els}
    </svg>
  )
}

/* ───────────── テキスト ───────────── */

function RichBio({ text }: { text: string }) {
  const parts = text.split(/(#[^\s#、。「」]+|@[a-z0-9_]+|[a-z0-9-]+\.example(?:\/[^\s、。]*)?)/gi)
  return (
    <>
      {parts.map((s, i) =>
        /^#/.test(s) ? (
          <button key={i} type="button" onClick={() => toast(`${s} の作品を探す`, tOpt)} className={`rounded font-semibold text-[var(--accent)] hover:underline ${focusRing}`}>
            {s}
          </button>
        ) : /^@/.test(s) || /\.example/.test(s) ? (
          <a key={i} href="#" onClick={(e) => e.preventDefault()} className={`rounded font-semibold text-[var(--accent)] hover:underline ${focusRing}`}>
            {s}
          </a>
        ) : (
          <span key={i}>{s}</span>
        ),
      )}
    </>
  )
}

/** その場編集。Enter で確定、Esc で取り消し、フォーカスが外れたら確定 */
function InlineEdit({ value, onSave, editable, label, children, maxLength = 40, className = '' }: { value: string; onSave: (v: string) => void; editable: boolean; label: string; children: ReactNode; maxLength?: number; className?: string }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  const done = useRef(false)
  const focusRef = useCallback((el: HTMLInputElement | null) => {
    if (el) {
      el.focus({ preventScroll: true })
      el.select()
    }
  }, [])
  if (!editable) return <>{children}</>
  if (editing)
    return (
      <span className={`inline-flex max-w-full items-center gap-1 ${className}`}>
        <input
          ref={focusRef}
          value={v}
          maxLength={maxLength}
          aria-label={label}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              done.current = true
              onSave(v.trim() || value)
              setEditing(false)
            } else if (e.key === 'Escape') {
              e.stopPropagation()
              done.current = true
              setEditing(false)
            }
          }}
          onBlur={() => {
            if (!done.current) onSave(v.trim() || value)
            setEditing(false)
          }}
          className="h-7 min-w-0 flex-1 rounded-md border border-[var(--accent)] bg-[var(--panel)] px-2 text-[12.5px] text-[var(--fg)] outline-none ring-3 ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
          style={{ width: `${Math.max(8, v.length + 3)}em` }}
        />
        <span className="hidden shrink-0 text-[10px] text-[var(--mute)] @md:inline">Enter で保存</span>
      </span>
    )
  return (
    <button
      type="button"
      onClick={() => {
        done.current = false
        setV(value)
        setEditing(true)
      }}
      aria-label={`${label}を編集`}
      className={`group/ie inline-flex max-w-full items-center gap-1.5 rounded-md text-left outline-offset-2 transition-colors hover:bg-[var(--hover)] ${focusRing} ${className}`}
    >
      {children}
      <Pencil size={11} className="shrink-0 text-[var(--mute)] opacity-0 transition-opacity group-hover/ie:opacity-100 group-focus-visible/ie:opacity-100" />
    </button>
  )
}

/* ───────────── タブの中身 ───────────── */

function ProjectCard({ p, starred, onStar, reduce }: { p: Project; starred: boolean; onStar: () => void; reduce: boolean }) {
  return (
    <motion.article
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_1px_2px_rgba(0,0,0,.04)] transition-shadow hover:shadow-[0_14px_30px_-16px_rgba(30,20,60,.35)]"
    >
      <div className="relative h-[104px] overflow-hidden">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]">
          <ProjectThumb p={p} />
        </div>
        {p.pinned && (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
            <Pin size={10} />
            ピン留め
          </span>
        )}
        <span className="absolute right-2.5 top-2.5 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold text-[#222]">{KIND_LABEL[p.kind]}</span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h4 className="flex items-center gap-1.5 font-mono text-[13.5px] font-bold">
          <Code2 size={14} className="text-[var(--mute)]" />
          <a href="#" onClick={(e) => e.preventDefault()} className={`truncate rounded hover:text-[var(--accent)] hover:underline ${focusRing}`}>
            {p.name}
          </a>
        </h4>
        <p className="mt-1 line-clamp-2 flex-1 text-[12px] leading-relaxed text-[var(--sub)]">{p.desc}</p>
        <div className="mt-3 flex items-center gap-3 text-[11.5px] text-[var(--sub)]">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: LANG_COLOR[p.lang] }} />
            {p.lang}
          </span>
          <span className="flex items-center gap-1">
            <GitBranch size={12} />
            {fmt(p.forks)}
          </span>
          <span className="hidden @lg:inline">{p.updated}</span>
          <button
            type="button"
            onClick={onStar}
            aria-pressed={starred}
            aria-label={starred ? `${p.name} のスターを外す` : `${p.name} にスターを付ける`}
            className={`ml-auto flex h-7 items-center gap-1 rounded-full border px-2.5 font-semibold tabular-nums transition-colors ${focusRing} ${
              starred ? 'border-[#f5b301] bg-[color-mix(in_srgb,#f5b301_14%,transparent)] text-[#c98a00]' : 'border-[var(--line2)] hover:bg-[var(--hover)]'
            }`}
          >
            <motion.span key={String(starred)} initial={reduce || !starred ? false : { scale: 0.3, rotate: -60 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
              <Star size={12} className={starred ? 'fill-[#f5b301] text-[#f5b301]' : ''} />
            </motion.span>
            <NumberFlow value={p.stars + (starred ? 1 : 0)} locales="ja-JP" />
          </button>
        </div>
      </div>
    </motion.article>
  )
}

const DAY_MS = 86400000
const TODAY = new Date(2026, 10, 8)
const WD = ['日', '月', '火', '水', '木', '金', '土']

function useHeatmap() {
  return useMemo(() => {
    const r = rng(2026)
    const weeks = 53
    const end = TODAY.getTime()
    const startSunday = end - (TODAY.getDay() + (weeks - 1) * 7) * DAY_MS
    const cells: { t: number; n: number; future: boolean }[] = []
    let total = 0
    for (let i = 0; i < weeks * 7; i++) {
      const t = startSunday + i * DAY_MS
      const d = new Date(t)
      const daysAgo = Math.round((end - t) / DAY_MS)
      const future = t > end
      const season = 0.55 + 0.45 * Math.sin(i / 23)
      const weekend = d.getDay() === 0 || d.getDay() === 6 ? 0.55 : 1
      let n = Math.max(0, Math.round((r() * 9 - 2.6) * season * weekend))
      if (daysAgo < 36 && daysAgo >= 0) n = Math.max(1, n + 1)
      if (future) n = 0
      total += n
      cells.push({ t, n, future })
    }
    return { cells, weeks, total }
  }, [])
}

function Heatmap({ reduce }: { reduce: boolean }) {
  const { cells, weeks, total } = useHeatmap()
  const scroller = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ x: number; y: number; t: number; n: number } | null>(null)
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])
  const level = (n: number) => (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 9 ? 3 : 4)
  const months = useMemo(() => {
    const out: { w: number; label: string }[] = []
    let last = -1
    for (let w = 0; w < weeks; w++) {
      const m = new Date(cells[w * 7].t).getMonth()
      if (m !== last) {
        out.push({ w, label: `${m + 1}月` })
        last = m
      }
    }
    return out.filter((m, i) => i > 0 || m.w < weeks - 2)
  }, [cells, weeks])
  const cell = 11
  const gap = 3
  const show = (e: ReactPointerEvent | ReactFocusEvent, c: (typeof cells)[number]) => {
    const host = scroller.current?.parentElement
    const el = e.currentTarget as HTMLElement
    if (!host) return
    const a = el.getBoundingClientRect()
    const b = host.getBoundingClientRect()
    setTip({ x: a.left - b.left + a.width / 2, y: a.top - b.top, t: c.t, n: c.n })
  }
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13.5px] font-bold">
          この 1 年の活動 <span className="ml-1 font-semibold tabular-nums text-[var(--sub)]">{fmt(total)} 件</span>
        </h3>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#d9480f]">
          <Flame size={13} />
          36 日連続
        </span>
      </div>
      <div className="relative">
        <div ref={scroller} className="overflow-x-auto pb-1 [scrollbar-width:thin]" onPointerLeave={() => setTip(null)}>
          <div className="relative w-max pl-6 pt-4">
            {months.map((m) => (
              <span key={m.w} className="absolute top-0 text-[10px] text-[var(--mute)]" style={{ left: 24 + m.w * (cell + gap) }}>
                {m.label}
              </span>
            ))}
            {[1, 3, 5].map((d) => (
              <span key={d} className="absolute left-0 text-[9.5px] text-[var(--mute)]" style={{ top: 16 + d * (cell + gap) - 1 }}>
                {WD[d]}
              </span>
            ))}
            <div className="grid grid-flow-col" style={{ gridTemplateRows: `repeat(7, ${cell}px)`, gap }} role="img" aria-label={`この 1 年で ${total} 件の活動`}>
              {cells.map((c, i) => (
                <motion.span
                  key={i}
                  initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                  animate={{ opacity: c.future ? 0 : 1, scale: 1 }}
                  transition={{ delay: reduce ? 0 : Math.floor(i / 7) * 0.008, duration: 0.25 }}
                  onPointerEnter={(e) => !c.future && show(e, c)}
                  className="rounded-[3px] ring-1 ring-inset ring-black/5"
                  style={{ width: cell, height: cell, background: `var(--heat${level(c.n)})` }}
                />
              ))}
            </div>
          </div>
        </div>
        <AnimatePresence>
          {tip && (
            <motion.div
              key={tip.t}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-[#17141f] px-2 py-1 text-[11px] text-white shadow-lg"
              style={{ left: Math.max(70, tip.x), top: tip.y - 6 }}
            >
              <b>{tip.n ? `${tip.n} 件の活動` : '活動なし'}</b>
              <span className="ml-1.5 text-white/60">
                {new Date(tip.t).getMonth() + 1}月{new Date(tip.t).getDate()}日({WD[new Date(tip.t).getDay()]})
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[var(--mute)]">
        少ない
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="size-[10px] rounded-[3px]" style={{ background: `var(--heat${l})` }} />
        ))}
        多い
      </div>
    </section>
  )
}

function Timeline({ groups, reduce }: { groups: { month: string; items: Act[] }[]; reduce: boolean }) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.month}>
          <h3 className="sticky top-[46px] z-[1] -mx-1 mb-2 bg-[var(--bg)]/90 px-1 py-1 text-[12px] font-bold text-[var(--sub)] backdrop-blur">{g.month}</h3>
          <ol className="relative ml-[15px] border-l-2 border-[var(--line)]">
            {g.items.map((a, i) => {
              const M = ACT_META[a.type]
              return (
                <motion.li
                  key={a.title}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.3 }}
                  className="relative pb-4 pl-6 last:pb-1"
                >
                  <span className="absolute -left-[16px] top-0 grid size-[30px] place-items-center rounded-full border-[3px] border-[var(--bg)] text-white" style={{ background: M.color }}>
                    <M.icon size={13} strokeWidth={2.4} />
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-2 pt-1">
                    <span className="text-[13px] font-semibold">{a.title}</span>
                    <span className="text-[11px] text-[var(--mute)]">{a.when}</span>
                  </div>
                  {a.detail && (
                    <p className={`mt-1 text-[12px] leading-relaxed text-[var(--sub)] ${a.type === 'comment' ? 'rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2' : ''}`}>{a.detail}</p>
                  )}
                  {a.type === 'release' && (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,#8b5cf6_14%,transparent)] px-2 py-0.5 font-semibold text-[#7c4ddb]">
                        <Tag size={10} />
                        最新
                      </span>
                      <span className="rounded-full bg-[var(--panel2)] px-2 py-0.5 font-mono text-[var(--sub)]">{a.repo}</span>
                    </div>
                  )}
                </motion.li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}

function Medal({ b, size = 64 }: { b: Badge; size?: number }) {
  const T = TIER[b.tier]
  const id = useId().replace(/:/g, '')
  const locked = !b.earned
  const path =
    b.shape === 'hex'
      ? 'M32 3L57 17.5V46.5L32 61L7 46.5V17.5Z'
      : b.shape === 'shield'
        ? 'M32 3L56 11V31C56 46 45 56 32 61C19 56 8 46 8 31V11Z'
        : 'M32 3a29 29 0 1 1 0 58a29 29 0 1 1 0-58z'
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} className={`absolute inset-0 ${locked ? 'grayscale' : ''}`} aria-hidden style={{ opacity: locked ? 0.45 : 1 }}>
        <defs>
          <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={T.a} />
            <stop offset="1" stopColor={T.b} />
          </linearGradient>
          <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity=".55" />
            <stop offset=".5" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path} fill={`url(#m${id})`} />
        <path d={path} fill="none" stroke={T.ring} strokeWidth="2" opacity=".8" transform="translate(32 32) scale(.82) translate(-32 -32)" />
        <path d={path} fill={`url(#s${id})`} />
        {b.tier === 'legend' && !locked && (
          <g fill="white">
            <circle cx="12" cy="14" r="1.4" />
            <circle cx="54" cy="50" r="1.1" />
            <circle cx="50" cy="12" r="0.9" />
          </g>
        )}
      </svg>
      {locked ? <Lock size={size * 0.28} className="relative text-[var(--sub)]" /> : <b.icon size={size * 0.34} strokeWidth={2.2} className="relative text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.35)]" />}
    </span>
  )
}

function Badges({ reduce }: { reduce: boolean }) {
  const [hover, setHover] = useState<{ id: string; below: boolean; align: 'left' | 'center' | 'right' } | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const earned = BADGES.filter((b) => b.earned).length
  const open = (e: ReactSyntheticEvent<HTMLElement>, id: string) => {
    const el = e.currentTarget
    const g = grid.current
    if (!g) return
    const sc = g.closest('[data-scroller]') as HTMLElement | null
    const a = el.getBoundingClientRect()
    const gb = g.getBoundingClientRect()
    const top = sc ? a.top - sc.getBoundingClientRect().top : a.top
    const rel = (a.left + a.width / 2 - gb.left) / gb.width
    setHover({ id, below: top < 270, align: rel < 0.3 ? 'left' : rel > 0.7 ? 'right' : 'center' })
  }
  const pct = earned / BADGES.length
  return (
    <div>
      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <svg viewBox="0 0 44 44" className="size-14 shrink-0 -rotate-90" aria-hidden>
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" strokeWidth="5" />
          <motion.circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: reduce ? pct : 0 }}
            animate={{ pathLength: pct }}
            transition={{ duration: reduce ? 0 : 1, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </svg>
        <div className="min-w-0">
          <div className="text-[18px] font-extrabold tabular-nums">
            {earned} <span className="text-[13px] font-semibold text-[var(--sub)]">/ {BADGES.length} 個</span>
          </div>
          <p className="text-[12px] text-[var(--sub)]">次は「年輪」まであと 0.4 年。レジェンドバッジ「部長」は全体の 0.4% だけ。</p>
        </div>
      </div>
      <div ref={grid} className="grid grid-cols-3 gap-2.5 @md:grid-cols-4 @2xl:grid-cols-6" onPointerLeave={() => setHover(null)}>
        {BADGES.map((b, i) => {
          const on = hover?.id === b.id
          const T = TIER[b.tier]
          return (
            <motion.div
              key={b.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: reduce ? 0 : i * 0.035, type: 'spring', stiffness: 380, damping: 24 }}
              className={`relative ${on ? 'z-20' : ''}`}
            >
              <button
                type="button"
                onPointerEnter={(e) => open(e, b.id)}
                onFocus={(e) => open(e, b.id)}
                onBlur={() => setHover(null)}
                aria-describedby={on ? `badge-${b.id}` : undefined}
                className={`group flex w-full flex-col items-center gap-1.5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-2 pb-2.5 pt-3 text-center transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-[var(--line2)] hover:shadow-[0_10px_24px_-14px_rgba(0,0,0,.4)] ${focusRing}`}
              >
                <span className={`transition-transform duration-300 ${reduce ? '' : 'group-hover:-rotate-6 group-hover:scale-110'}`}>
                  <Medal b={b} size={56} />
                </span>
                <span className={`line-clamp-1 text-[12px] font-bold ${b.earned ? '' : 'text-[var(--mute)]'}`}>{b.name}</span>
                {b.progress ? (
                  <span className="flex h-[15px] w-[70%] items-center">
                    <span className="h-1 w-full overflow-hidden rounded-full bg-[var(--line)]">
                      <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${(b.progress[0] / b.progress[1]) * 100}%` }} />
                    </span>
                  </span>
                ) : (
                  <span className="h-[15px] text-[10px] font-semibold leading-[15px]" style={{ color: T.b }}>
                    {T.label}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {on && hover && (
                  <motion.div
                    id={`badge-${b.id}`}
                    role="tooltip"
                    initial={{ opacity: 0, y: hover.below ? -6 : 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className={`pointer-events-none absolute z-30 w-[236px] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 text-left shadow-[0_20px_44px_-14px_rgba(20,10,40,.45)] ${
                      hover.below ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'
                    } ${hover.align === 'left' ? 'left-0' : hover.align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Medal b={b} size={40} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold">{b.name}</div>
                        <div className="text-[10.5px] font-semibold" style={{ color: TIER[b.tier].b }}>
                          {TIER[b.tier].label}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--sub)]">{b.desc}</p>
                    <div className="mt-2 flex items-center justify-between border-t border-[var(--line)] pt-2 text-[11px]">
                      {b.earned ? (
                        <span className="flex items-center gap-1 font-semibold text-[#13a77a]">
                          <Check size={12} strokeWidth={3} />
                          {b.earned} に獲得
                        </span>
                      ) : (
                        <span className="font-semibold tabular-nums text-[var(--sub)]">
                          進捗 {fmt(b.progress![0])} / {fmt(b.progress![1])} {b.progress![2]}
                        </span>
                      )}
                      <span className="text-[var(--mute)]">取得率 {b.rarity}%</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function ProjectsTab({ starred, toggleStar, reduce }: { starred: Set<string>; toggleStar: (p: Project) => void; reduce: boolean }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const [sort, setSort] = useState<'stars' | 'updated'>('stars')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return PROJECTS.filter((p) => (kind === 'all' || p.kind === kind) && (!s || `${p.name} ${p.desc} ${p.lang}`.toLowerCase().includes(s))).sort((a, b) => (sort === 'stars' ? b.stars - a.stars : a.days - b.days))
  }, [q, kind, sort])
  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 @xl:flex-row @xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="プロジェクトを検索…" aria-label="プロジェクトを検索" className={`${inputCls} rounded-full pl-9`} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {(['all', 'tool', 'art', 'lib'] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold transition-colors ${focusRing} ${kind === k ? 'bg-[var(--fg)] text-[var(--bg)]' : 'bg-[var(--panel)] text-[var(--sub)] ring-1 ring-[var(--line2)] hover:text-[var(--fg)]'}`}
              >
                {k === 'all' ? 'すべて' : KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="relative ml-auto shrink-0">
            <select value={sort} onChange={(e) => setSort(e.target.value as 'stars' | 'updated')} aria-label="並び替え" className={`${inputCls} h-8 w-[104px] cursor-pointer appearance-none rounded-full pr-7 text-[12px]`}>
              <option value="stars">スター順</option>
              <option value="updated">更新順</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
          </div>
        </div>
      </div>
      <motion.div layout={!reduce} className="grid gap-3 @lg:grid-cols-2 @3xl:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((p) => (
            <motion.div key={p.id} layout={!reduce} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.22 }}>
              <ProjectCard p={p} starred={starred.has(p.id)} onStar={() => toggleStar(p)} reduce={reduce} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {list.length === 0 && (
        <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--line2)] py-12 text-center text-[12.5px] text-[var(--sub)]">
          <Search size={22} className="mb-2 text-[var(--mute)]" />「{q}」に一致するプロジェクトはありません
        </div>
      )}
    </div>
  )
}

/* ───────────── 編集シート ───────────── */

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[12px] font-semibold text-[var(--sub)]">
        {label}
        {hint}
      </span>
      {children}
    </label>
  )
}

function EditSheet({ d, setD, onCancel, onSave, saving, dirty, reduce }: { d: Profile; setD: (p: Partial<Profile>) => void; onCancel: () => void; onSave: () => void; saving: boolean; dirty: boolean; reduce: boolean }) {
  const first = useCallback((el: HTMLInputElement | null) => el?.focus({ preventScroll: true }), [])
  const handleErr = d.handle.length < 3
  return (
    <motion.aside
      role="dialog"
      aria-modal="false"
      aria-label="プロフィールを編集"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
      initial={reduce ? { opacity: 0 } : { x: '100%', opacity: 0.6 }}
      animate={{ x: 0, opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { x: '100%', opacity: 0.6 }}
      transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 40 }}
      className="absolute inset-x-0 bottom-0 z-40 flex h-[64%] flex-col rounded-t-3xl border-t border-[var(--line)] bg-[var(--panel)] shadow-[0_-20px_50px_-20px_rgba(20,10,40,.5)] @3xl:inset-y-0 @3xl:left-auto @3xl:right-0 @3xl:h-auto @3xl:w-[380px] @3xl:rounded-none @3xl:rounded-l-3xl @3xl:border-l @3xl:border-t-0"
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--line2)] @3xl:hidden" />
      <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-5 py-3">
        <div>
          <h2 className="text-[15px] font-extrabold">プロフィールを編集</h2>
          <p className="flex items-center gap-1 text-[11px] text-[var(--mute)]">
            <Eye size={11} />
            <span>
              変更はすぐ<span className="@3xl:hidden">上</span>
              <span className="hidden @3xl:inline">左</span>のプロフィールに反映されます
            </span>
          </p>
        </div>
        <button type="button" aria-label="閉じる" onClick={onCancel} className={`grid size-8 place-items-center rounded-full text-[var(--sub)] hover:bg-[var(--hover)] ${focusRing}`}>
          <X size={16} />
        </button>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
        <section>
          <div className="mb-2 text-[12px] font-semibold text-[var(--sub)]">アバター</div>
          <div className="flex items-center gap-4">
            <motion.div key={`${d.shape}-${d.color}-${d.motif}`} initial={reduce ? false : { scale: 0.85, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>
              <Avatar p={d} size={76} ring={false} />
            </motion.div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <div role="radiogroup" aria-label="アバターの色" className="flex flex-wrap gap-1.5">
                {AV_COLORS.map((c, i) => (
                  <button
                    key={c.label}
                    type="button"
                    role="radio"
                    aria-checked={d.color === i}
                    aria-label={c.label}
                    title={c.label}
                    onClick={() => setD({ color: i })}
                    className={`relative size-6 rounded-full transition-transform hover:scale-110 ${focusRing}`}
                    style={{ background: `linear-gradient(135deg, ${c.a}, ${c.b})` }}
                  >
                    {d.color === i && <motion.span layoutId="av-color-ring" transition={ease} className="absolute -inset-[3px] rounded-full border-2 border-[var(--fg)]" />}
                  </button>
                ))}
              </div>
              <div role="radiogroup" aria-label="アバターの形" className="flex flex-wrap gap-1.5">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={d.shape === s.id}
                    aria-label={s.label}
                    title={s.label}
                    onClick={() => setD({ shape: s.id })}
                    className={`grid size-8 place-items-center rounded-lg border transition-colors ${focusRing} ${d.shape === s.id ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]' : 'border-[var(--line2)] text-[var(--sub)] hover:bg-[var(--hover)]'}`}
                  >
                    <svg viewBox="0 0 100 100" className="size-4" aria-hidden>
                      <path d={SHAPE_PATH[s.id]} fill="currentColor" />
                    </svg>
                  </button>
                ))}
              </div>
              <div role="group" aria-label="モチーフ" className="flex gap-1.5">
                {(['face', 'initial'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={d.motif === m}
                    onClick={() => setD({ motif: m })}
                    className={`h-8 whitespace-nowrap rounded-lg border px-2 text-[11px] font-semibold transition-colors ${focusRing} ${d.motif === m ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]' : 'border-[var(--line2)] text-[var(--sub)] hover:bg-[var(--hover)]'}`}
                  >
                    {m === 'face' ? '似顔絵' : '頭文字'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="mb-2 text-[12px] font-semibold text-[var(--sub)]">カバー</div>
          <div role="radiogroup" aria-label="カバー" className="grid grid-cols-4 gap-2">
            {COVERS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={d.cover === c.id}
                onClick={() => setD({ cover: c.id })}
                className={`group overflow-hidden rounded-xl border-2 text-left transition-colors ${focusRing} ${d.cover === c.id ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--line2)]'}`}
              >
                <span className="relative block h-11 overflow-hidden rounded-t-[9px]">
                  <Cover id={c.id} reduce />
                </span>
                <span className="block bg-[var(--panel2)] px-1.5 py-1 text-center text-[10.5px] font-semibold">{c.label}</span>
              </button>
            ))}
          </div>
        </section>
        <Field label="表示名" hint={<span className="tabular-nums text-[var(--mute)]">{d.name.length}/24</span>}>
          <input ref={first} className={inputCls} value={d.name} maxLength={24} onChange={(e) => setD({ name: e.target.value })} />
        </Field>
        <Field label="ハンドル" hint={handleErr ? <span className="text-[#e5484d]">3 文字以上</span> : <span className="text-[#13a77a]">利用できます</span>}>
          <div className="flex">
            <span className="grid h-9 place-items-center rounded-l-lg border border-r-0 border-[var(--line2)] bg-[var(--panel2)] px-2.5 text-[12px] text-[var(--mute)]">makerloft.example/@</span>
            <input className={`${inputCls} rounded-l-none font-mono ${handleErr ? 'border-[#e5484d]' : ''}`} value={d.handle} maxLength={20} onChange={(e) => setD({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} />
          </div>
        </Field>
        <Field label="肩書き">
          <input className={inputCls} value={d.headline} maxLength={30} onChange={(e) => setD({ headline: e.target.value })} />
        </Field>
        <Field label="自己紹介" hint={<span className={`tabular-nums ${d.bio.length > 140 ? 'text-[#e08a00]' : 'text-[var(--mute)]'}`}>{d.bio.length}/160</span>}>
          <textarea className={`${inputCls} h-auto min-h-[92px] resize-none py-2 leading-relaxed`} value={d.bio} maxLength={160} onChange={(e) => setD({ bio: e.target.value })} />
          <span className="mt-1 block text-[10.5px] text-[var(--mute)]">#タグ と URL は自動でリンクになります</span>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="場所">
            <input className={inputCls} value={d.location} maxLength={20} onChange={(e) => setD({ location: e.target.value })} />
          </Field>
          <Field label="ウェブサイト">
            <input className={inputCls} value={d.site} maxLength={30} onChange={(e) => setD({ site: e.target.value })} />
          </Field>
        </div>
      </div>
      <footer className="flex items-center gap-2 border-t border-[var(--line)] px-5 py-3">
        <span className="mr-auto text-[11px] text-[var(--mute)]">{dirty ? '未保存の変更があります' : '変更はありません'}</span>
        <button type="button" onClick={onCancel} className={`${btn} text-[var(--sub)] hover:bg-[var(--hover)]`}>
          キャンセル
        </button>
        <button type="button" onClick={onSave} disabled={!dirty || saving || handleErr} className={`${btn} min-w-[88px] bg-[var(--accent)] text-white hover:brightness-110`}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
          {saving ? '保存中…' : '保存'}
        </button>
      </footer>
    </motion.aside>
  )
}

/* ───────────── 本体 ───────────── */

type TabId = 'overview' | 'projects' | 'activity' | 'badges'
const TABS: { id: TabId; label: string; icon: LucideIcon; count?: number }[] = [
  { id: 'overview', label: '概要', icon: LayoutGrid },
  { id: 'projects', label: 'プロジェクト', icon: Code2, count: PROJECTS.length },
  { id: 'activity', label: 'アクティビティ', icon: Zap },
  { id: 'badges', label: 'バッジ', icon: Award, count: BADGES.filter((b) => b.earned).length },
]

const THEME_VARS: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--bg': '#f7f6fa',
    '--panel': '#ffffff',
    '--panel2': '#f2f0f6',
    '--fg': '#1a1625',
    '--sub': '#5f5a6e',
    '--mute': '#948ea3',
    '--line': '#e8e5ef',
    '--line2': '#d7d2e2',
    '--hover': 'rgba(40,20,80,.05)',
    '--accent': '#6d4aff',
    '--heat0': '#ebe8f2',
    '--heat1': '#d4c8ff',
    '--heat2': '#a991ff',
    '--heat3': '#7d5cff',
    '--heat4': '#5232e0',
  },
  dark: {
    '--bg': '#0f0d15',
    '--panel': '#18151f',
    '--panel2': '#211d2a',
    '--fg': '#efedf5',
    '--sub': '#aaa4ba',
    '--mute': '#716b82',
    '--line': '#2a2635',
    '--line2': '#3a3547',
    '--hover': 'rgba(255,255,255,.05)',
    '--accent': '#9a82ff',
    '--heat0': '#221e2c',
    '--heat1': '#3b2f6e',
    '--heat2': '#5741b0',
    '--heat3': '#7b62f0',
    '--heat4': '#b3a2ff',
  },
}

export function ProfilePage() {
  const reduce = !!useReducedMotion()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [viewer, setViewer] = useState<'visitor' | 'owner'>('visitor')
  const [saved, setSaved] = useState<Profile>(INITIAL)
  const [draft, setDraft] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')
  const [dir, setDir] = useState(1)
  const [follow, setFollow] = useState<'none' | 'loading' | 'following'>('none')
  const [bell, setBell] = useState(false)
  const [menu, setMenu] = useState(false)
  const [followers, setFollowers] = useState(12480)
  const [starsTotal, setStarsTotal] = useState(8930)
  const [starred, setStarred] = useState<Set<string>>(() => new Set())
  const [moreState, setMoreState] = useState<'idle' | 'loading' | 'done'>('idle')
  const scrollRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  const p = draft ?? saved
  const editing = draft !== null
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(saved)

  const { scrollY } = useScroll({ container: scrollRef })
  const coverY = useTransform(scrollY, [0, 300], [0, reduce ? 0 : 110])
  const coverO = useTransform(scrollY, [0, 260], [1, reduce ? 1 : 0.55])

  // 獲得スターがときどき増える
  useEffect(() => {
    const t = setInterval(() => setStarsTotal((s) => s + 1 + Math.floor(Math.random() * 3)), 5200)
    return () => clearInterval(t)
  }, [])

  const goTab = (t: TabId) => {
    const a = TABS.findIndex((x) => x.id === tab)
    const b = TABS.findIndex((x) => x.id === t)
    setDir(b >= a ? 1 : -1)
    setTab(t)
    const sc = scrollRef.current
    const tabs = tabsRef.current
    if (sc && tabs) {
      const stickTop = tabs.offsetTop
      if (sc.scrollTop > stickTop) sc.scrollTo({ top: stickTop, behavior: 'auto' })
    }
  }

  const onTabKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = TABS.findIndex((x) => x.id === tab)
    const n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    goTab(n.id)
    requestAnimationFrame(() => tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${n.id}"]`)?.focus({ preventScroll: true }))
  }

  const toggleFollow = () => {
    if (follow === 'loading') return
    if (follow === 'following') {
      setFollow('none')
      setBell(false)
      setFollowers((f) => f - 1)
      toast(`@${p.handle} のフォローを解除しました`, tOpt)
      return
    }
    setFollow('loading')
    setTimeout(() => {
      setFollow('following')
      setFollowers((f) => f + 1)
      toast.success(`${p.name} さんをフォローしました`, { ...tOpt, description: '新しい作品がフィードに届きます。' })
    }, 650)
  }

  const toggleStar = (pr: Project) => {
    setStarred((s) => {
      const n = new Set(s)
      if (n.has(pr.id)) n.delete(pr.id)
      else n.add(pr.id)
      return n
    })
    setStarsTotal((t) => t + (starred.has(pr.id) ? -1 : 1))
  }

  const openEdit = () => {
    setDraft(saved)
    scrollRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }
  const cancelEdit = () => {
    if (dirty) toast('変更を破棄しました', tOpt)
    setDraft(null)
  }
  const saveEdit = () => {
    if (!draft) return
    setSaving(true)
    setTimeout(() => {
      setSaved(draft)
      setDraft(null)
      setSaving(false)
      toast.success('プロフィールを更新しました', { ...tOpt, description: `makerloft.example/@${draft.handle}` })
    }, 900)
  }
  const patchSaved = (patch: Partial<Profile>, msg: string) => {
    setSaved((s) => ({ ...s, ...patch }))
    if (draft) setDraft((d) => (d ? { ...d, ...patch } : d))
    toast.success(msg, tOpt)
  }

  const loadMore = () => {
    setMoreState('loading')
    setTimeout(() => setMoreState('done'), 800)
  }

  const vars = THEME_VARS[theme] as CSSProperties
  const owner = viewer === 'owner'
  const stats = [
    { label: 'フォロワー', v: followers },
    { label: 'フォロー中', v: 318 },
    { label: 'プロジェクト', v: 42 },
    { label: '獲得スター', v: starsTotal },
  ]

  const pinned = PROJECTS.filter((x) => x.pinned)

  const tabContent = (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div
        key={tab}
        custom={dir}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 * dir }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -20 * dir }}
        transition={{ duration: reduce ? 0.1 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        role="tabpanel"
        id={`pp-panel-${tab}`}
        aria-labelledby={`pp-tab-${tab}`}
        className="@container pt-4"
      >
        {tab === 'overview' && (
          <div className="space-y-5">
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-[13.5px] font-bold">
                  <Pin size={14} className="text-[var(--accent)]" />
                  ピン留めしたプロジェクト
                </h3>
                <button type="button" onClick={() => goTab('projects')} className={`rounded text-[12px] font-semibold text-[var(--accent)] hover:underline ${focusRing}`}>
                  すべて見る
                </button>
              </div>
              <div className="grid gap-3 @lg:grid-cols-2">
                {pinned.map((pr, i) => (
                  <motion.div key={pr.id} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.35 }}>
                    <ProjectCard p={pr} starred={starred.has(pr.id)} onStar={() => toggleStar(pr)} reduce={reduce} />
                  </motion.div>
                ))}
              </div>
            </section>
            <Heatmap reduce={reduce} />
          </div>
        )}
        {tab === 'projects' && <ProjectsTab starred={starred} toggleStar={toggleStar} reduce={reduce} />}
        {tab === 'activity' && (
          <div>
            <Timeline groups={moreState === 'done' ? [...ACTIVITY, ...ACTIVITY_MORE] : ACTIVITY} reduce={reduce} />
            {moreState === 'loading' && (
              <div className="ml-[15px] mt-2 space-y-4 border-l-2 border-dashed border-[var(--line)] pl-6" aria-label="読み込み中">
                {[0, 1].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 w-1/2 rounded bg-[var(--line)]" />
                    <div className="h-3 w-3/4 rounded bg-[var(--line)]" />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-center">
              {moreState === 'done' ? (
                <span className="text-[12px] text-[var(--mute)]">2021年4月 に Makerloft に参加しました</span>
              ) : (
                <button type="button" onClick={loadMore} disabled={moreState === 'loading'} className={btnGhost}>
                  {moreState === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                  さらに表示
                </button>
              )}
            </div>
          </div>
        )}
        {tab === 'badges' && <Badges reduce={reduce} />}
      </motion.div>
    </AnimatePresence>
  )

  return (
    <div
      style={vars}
      className="@container relative flex h-full w-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] transition-colors duration-300"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && menu) setMenu(false)
      }}
    >
      {/* アプリバー */}
      <header className="relative z-30 flex h-12 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--panel)]/90 px-3 backdrop-blur @md:px-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
            <rect width="32" height="32" rx="9" fill="var(--fg)" />
            <path d="M8 22V13l8-5 8 5v9" stroke="var(--bg)" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
            <path d="M13 22v-5h6v5" stroke="var(--accent)" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
          </svg>
          <span className="hidden text-[14px] font-extrabold tracking-tight @md:inline">Makerloft</span>
        </div>
        <nav className="hidden items-center gap-4 text-[12.5px] font-semibold text-[var(--sub)] @3xl:flex" aria-label="メイン">
          {['探す', 'ギャラリー', 'イベント'].map((l) => (
            <a key={l} href="#" onClick={(e) => e.preventDefault()} className={`rounded hover:text-[var(--fg)] ${focusRing}`}>
              {l}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div role="radiogroup" aria-label="表示する立場" className="flex rounded-full bg-[var(--panel2)] p-[3px] text-[11.5px] font-semibold ring-1 ring-[var(--line)]">
            {(
              [
                ['visitor', '訪問者', Users],
                ['owner', '本人', UserCheck],
              ] as const
            ).map(([v, l, I]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={viewer === v}
                onClick={() => {
                  setViewer(v)
                  if (v === 'visitor' && draft) setDraft(null)
                }}
                className={`relative flex h-7 items-center gap-1 rounded-full px-2.5 transition-colors ${focusRing} ${viewer === v ? 'text-[var(--fg)]' : 'text-[var(--sub)] hover:text-[var(--fg)]'}`}
              >
                {viewer === v && <motion.span layoutId="pp-viewer" transition={reduce ? { duration: 0 } : ease} className="absolute inset-0 rounded-full bg-[var(--panel)] shadow-sm ring-1 ring-[var(--line)]" />}
                <I size={12} className="relative" />
                <span className="relative">{l}</span>
              </button>
            ))}
          </div>
          <button type="button" aria-label={theme === 'light' ? 'ダークテーマにする' : 'ライトテーマにする'} onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} className={`grid size-8 place-items-center rounded-full text-[var(--sub)] hover:bg-[var(--hover)] ${focusRing}`}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* スクロール領域 */}
      <div ref={scrollRef} data-scroller className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* カバー */}
        <div className="relative h-[140px] overflow-hidden @3xl:h-[190px]">
          <motion.div className="absolute inset-0" style={{ y: coverY, opacity: coverO }}>
            <AnimatePresence initial={false}>
              <motion.div key={p.cover} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                <Cover id={p.cover} reduce={reduce} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
          {editing && (
            <motion.span initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
              <Eye size={12} />
              プレビュー中
            </motion.span>
          )}
        </div>

        <div className={`transition-[padding] duration-300 ${editing ? '@3xl:pr-[380px]' : ''}`}>
        <div className="@container/pp">
        <div className="mx-auto max-w-[1120px] px-4 pb-16 @md/pp:px-6">
          <div className="grid gap-x-8 @4xl/pp:grid-cols-[296px_minmax(0,1fr)]">
            {/* プロフィール */}
            <aside className="relative min-w-0">
              <div className={"flex items-end justify-between gap-3 @4xl/pp:block"}>
                <motion.div
                  key={`${p.shape}-${p.color}-${p.motif}`}
                  initial={reduce ? false : { scale: 0.92 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className={"-mt-12 w-fit drop-shadow-[0_8px_18px_rgba(20,10,40,.22)] @4xl/pp:-mt-20"}
                >
                  <span className={"block @4xl/pp:hidden"}>
                    <Avatar p={p} size={96} />
                  </span>
                  <span className={"hidden @4xl/pp:block"}>
                    <Avatar p={p} size={156} />
                  </span>
                </motion.div>
                {/* 狭いとき: 右側のアクション */}
                <div className={"flex items-center gap-2 pb-1 @4xl/pp:hidden"}>
                  {actions(false)}
                </div>
              </div>

              <div className="mt-3">
                <h1 className="text-[22px] font-extrabold leading-tight tracking-tight @4xl/pp:text-[24px]">{p.name || '名前なし'}</h1>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-[var(--sub)]">
                  <span className="font-mono">@{p.handle}</span>
                  <span className="text-[var(--line2)]">·</span>
                  <InlineEdit editable={owner && !editing} value={p.headline} label="肩書き" maxLength={30} onSave={(v) => v !== saved.headline && patchSaved({ headline: v }, '肩書きを更新しました')}>
                    <span>{p.headline}</span>
                  </InlineEdit>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)] py-1 pl-1.5 pr-2.5 text-[12px]">
                  {owner && !editing ? (
                    <button
                      type="button"
                      aria-label="ステータスの絵文字を変更"
                      onClick={() => {
                        const i = STATUS_EMOJI.indexOf(saved.statusEmoji)
                        setSaved((s) => ({ ...s, statusEmoji: STATUS_EMOJI[(i + 1) % STATUS_EMOJI.length] }))
                      }}
                      className={`grid size-6 place-items-center rounded-full bg-[var(--panel2)] text-[13px] transition-transform hover:scale-110 ${focusRing}`}
                    >
                      {p.statusEmoji}
                    </button>
                  ) : (
                    <span className="grid size-6 place-items-center rounded-full bg-[var(--panel2)] text-[13px]">{p.statusEmoji}</span>
                  )}
                  <InlineEdit editable={owner && !editing} value={p.status} label="ステータス" onSave={(v) => v !== saved.status && patchSaved({ status: v }, 'ステータスを更新しました')}>
                    <span className="truncate text-[var(--sub)]">{p.status}</span>
                  </InlineEdit>
                </span>
              </div>

              <p className="mt-3 text-[13px] leading-relaxed">
                <RichBio text={p.bio} />
              </p>

              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[var(--sub)] @4xl/pp:flex-col">
                <li className="flex items-center gap-1.5">
                  <MapPin size={13} />
                  {p.location}
                </li>
                <li className="flex items-center gap-1.5">
                  <Link2 size={13} />
                  <a href="#" onClick={(e) => e.preventDefault()} className={`rounded font-semibold text-[var(--accent)] hover:underline ${focusRing}`}>
                    {p.site}
                  </a>
                </li>
                <li className="flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  2021年4月から参加
                </li>
              </ul>

              {/* 統計 */}
              <dl className="mt-4 grid grid-cols-4 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1.5 @4xl/pp:grid-cols-2">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl px-2 py-2 text-center transition-colors hover:bg-[var(--hover)] @4xl/pp:text-left">
                    <dd className="text-[16px] font-extrabold tabular-nums leading-tight @md:text-[18px]">
                      <NumberFlow value={s.v} locales="ja-JP" />
                    </dd>
                    <dt className="text-[10.5px] font-semibold text-[var(--mute)] @md:text-[11px]">{s.label}</dt>
                  </div>
                ))}
              </dl>

              {/* 広いとき: アクション */}
              <div className={"mt-4 hidden flex-wrap items-center gap-2 @4xl/pp:flex"}>
                {actions(true)}
              </div>

              <div className={"mt-5 hidden space-y-4 @4xl/pp:block"}>
                <div>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--mute)]">得意なこと</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {['WebGL', 'GLSL', 'TypeScript', '音響', 'プロッタ', 'ワークショップ'].map((t) => (
                      <span key={t} className="rounded-full bg-[var(--panel2)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--sub)] ring-1 ring-[var(--line)]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--mute)]">所属</h3>
                  <ul className="space-y-1.5 text-[12.5px] font-semibold">
                    {[
                      { n: '夜更かしシェーダ部', c: '#5232e0', g: '夜' },
                      { n: 'Studio Hakobune', c: '#0b6f86', g: '舟' },
                    ].map((o) => (
                      <li key={o.n} className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-md text-[11px] font-bold text-white" style={{ background: o.c }}>
                          {o.g}
                        </span>
                        {o.n}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>

            {/* タブ */}
            <section className={"mt-5 min-w-0 @4xl/pp:mt-4"}>
              <div ref={tabsRef} className="sticky top-0 z-20 -mx-4 bg-[var(--bg)]/92 px-4 backdrop-blur @md/pp:-mx-6 @md/pp:px-6 @4xl/pp:mx-0 @4xl/pp:px-0">
                <div role="tablist" aria-label="プロフィールのタブ" onKeyDown={onTabKey} className="flex gap-1 overflow-x-auto border-b border-[var(--line)] [scrollbar-width:none]">
                  {TABS.map((t) => {
                    const on = t.id === tab
                    return (
                      <button
                        key={t.id}
                        id={`pp-tab-${t.id}`}
                        data-tab={t.id}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        aria-controls={`pp-panel-${t.id}`}
                        tabIndex={on ? 0 : -1}
                        onClick={() => goTab(t.id)}
                        className={`relative flex h-11 shrink-0 items-center gap-1.5 px-2.5 text-[13px] @md:px-3 font-bold transition-colors ${focusRing} ${on ? 'text-[var(--fg)]' : 'text-[var(--sub)] hover:text-[var(--fg)]'}`}
                      >
                        <t.icon size={14} className={`hidden @md:block ${on ? 'text-[var(--accent)]' : ''}`} />
                        {t.label}
                        {t.count !== undefined && <span className="rounded-full bg-[var(--panel2)] px-1.5 text-[10.5px] tabular-nums text-[var(--sub)] ring-1 ring-[var(--line)]">{t.count}</span>}
                        {on && <motion.span layoutId="pp-tab-line" transition={reduce ? { duration: 0 } : ease} className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-[var(--accent)]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
              {tabContent}
            </section>
          </div>
        </div>
        </div>
        </div>
      </div>

      {/* 編集シート */}
      <AnimatePresence>
        {editing && draft && (
          <EditSheet d={draft} setD={(patch) => setDraft((x) => (x ? { ...x, ...patch } : x))} onCancel={cancelEdit} onSave={saveEdit} saving={saving} dirty={dirty} reduce={reduce} />
        )}
      </AnimatePresence>

      <Toaster id={TID} position="bottom-left" theme={theme} hotkey={[]} offset={16} mobileOffset={12} style={{ position: 'absolute', '--width': '300px' } as CSSProperties} toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </div>
  )

  /* アクションボタン群(狭い/広いで出し分け) */
  function actions(wide: boolean) {
    if (owner)
      return (
        <>
          <button type="button" onClick={openEdit} disabled={editing} className={`${btnGhost} ${wide ? 'flex-1' : ''}`}>
            <Pencil size={14} />
            プロフィールを編集
          </button>
          <button
            type="button"
            aria-label="プロフィールのリンクをコピー"
            className={iconBtnRound}
            onClick={() => {
              copyText(`https://makerloft.example/@${p.handle}`)
              toast.success('プロフィールのリンクをコピーしました', tOpt)
            }}
          >
            <Share2 size={15} />
          </button>
        </>
      )
    const following = follow === 'following'
    return (
      <>
        <button
          type="button"
          onClick={toggleFollow}
          aria-pressed={following}
          className={`group/f ${btn} min-w-[124px] ${wide ? 'flex-1' : ''} ${
            following
              ? 'border border-[var(--line2)] bg-[var(--panel)] text-[var(--fg)] hover:border-[#e5484d] hover:bg-[color-mix(in_srgb,#e5484d_8%,transparent)] hover:text-[#e5484d]'
              : 'bg-[var(--fg)] text-[var(--bg)] hover:opacity-90'
          }`}
        >
          {follow === 'loading' ? (
            <Loader2 size={15} className="animate-spin" />
          ) : following ? (
            <>
              <span className="flex items-center gap-1.5 group-hover/f:hidden">
                <Check size={15} strokeWidth={3} />
                フォロー中
              </span>
              <span className="hidden items-center gap-1.5 group-hover/f:flex">
                <UserX size={15} />
                フォロー解除
              </span>
            </>
          ) : (
            <>
              <UserPlus size={15} />
              フォローする
            </>
          )}
        </button>
        <AnimatePresence initial={false}>
          {following && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.5, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: 36 }}
              exit={{ opacity: 0, scale: 0.5, width: 0 }}
              aria-pressed={bell}
              aria-label={bell ? '新着通知をオフ' : '新着通知をオン'}
              onClick={() => {
                setBell((b) => !b)
                toast(bell ? '通知をオフにしました' : `${p.name} さんの新作を通知します`, tOpt)
              }}
              className={`${iconBtnRound} ${bell ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
            >
              <motion.span key={String(bell)} animate={bell && !reduce ? { rotate: [0, -18, 14, -8, 0] } : {}} transition={{ duration: 0.5 }}>
                {bell ? <BellRing size={15} /> : <Bell size={15} />}
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
        <button type="button" aria-label="メッセージを送る" className={iconBtnRound} onClick={() => toast('メッセージ機能はデモでは省略しています', tOpt)}>
          <MessageSquare size={15} />
        </button>
        <div
          className="relative"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenu(false)
          }}
        >
          <button type="button" aria-label="その他の操作" aria-haspopup="menu" aria-expanded={menu} className={iconBtnRound} onClick={() => setMenu((m) => !m)}>
            <Ellipsis size={16} />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className={`absolute top-[calc(100%+6px)] z-40 w-[200px] origin-top-right rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1 shadow-[0_18px_40px_-14px_rgba(20,10,40,.4)] ${wide ? 'left-0' : 'right-0'}`}
              >
                {[
                  { l: 'プロフィールのリンクをコピー', i: Link2, f: () => (copyText(`https://makerloft.example/@${p.handle}`), toast.success('リンクをコピーしました', tOpt)) },
                  { l: '作品をすべてミュート', i: Bell, f: () => toast(`@${p.handle} の作品をミュートしました`, tOpt) },
                  { l: '報告する', i: Flag, f: () => toast('報告を受け付けました', { ...tOpt, description: 'デモのため送信はされません。' }), danger: true },
                ].map((m) => (
                  <button
                    key={m.l}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      m.f()
                      setMenu(false)
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold hover:bg-[var(--hover)] focus-visible:bg-[var(--hover)] focus-visible:outline-none ${m.danger ? 'text-[#e5484d]' : ''}`}
                  >
                    <m.i size={14} />
                    {m.l}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    )
  }
}
