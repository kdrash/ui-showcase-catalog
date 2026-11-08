import NumberFlow from '@number-flow/react'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react'
import {
  AlertCircle,
  Anchor,
  ArrowLeft,
  ArrowRight,
  Atom,
  Bell,
  BookOpen,
  Briefcase,
  Bug,
  CalendarDays,
  Check,
  ChevronDown,
  Code2,
  Coffee,
  Compass,
  Feather,
  FileText,
  Flame,
  Handshake,
  Hash,
  Home,
  KanbanSquare,
  Leaf,
  Lightbulb,
  Link2,
  ListChecks,
  Map as MapIcon,
  Megaphone,
  MessageSquareHeart,
  Mountain,
  NotebookPen,
  Palette,
  PartyPopper,
  PenTool,
  Plus,
  Repeat,
  Rocket,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Target,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'

/**
 * SaaS のワークスペース初期設定(オンボーディング)。サービス「Kumiko」・組織・人物・メールアドレスはすべて架空。
 * - ようこそ → 役割 → 使い方(チップ) → チームメイト招待 → ワークスペース(名前・色・アイコン) → 完了 の 6 ステップ。
 *   ステップは進む/戻るの向きを custom に渡した AnimatePresence で左右にスライドし、上部のステッパーは線が伸びて丸がチェックに変わる
 * - 右のライブプレビュー(768px 以上)は小さなアプリ画面のモック。名前・役割別テンプレート・選んだ機能のサイドバー・招待したメンバーの
 *   アバター・ワークスペースの色とアイコンが入力のたびに反映され、今のステップに関係する部分がリングで光る。layout アニメで並びが組み替わる
 * - 役割はロービングタブインデックスの radiogroup(←→↑↓ で移動)。チップは役割に応じた「おすすめ」付きで、選ぶとチェックが幅アニメで差し込まれる
 * - 招待欄は Enter / カンマ / スペース / 貼り付け(複数まとめて)でメールをチップ化。形式エラーは赤いチップ、重複は既存チップを揺らして知らせ、
 *   空欄で Backspace を押すと最後のチップを消す
 * - ワークスペースの URL スラッグは名前から生成し、デバウンスして空き状況を擬似チェック。色とアイコンは layoutId のリングが移動する
 * - 完了で canvas-confetti(デモ内の canvas にバインド)。開いたホームには「はじめにやること」チェックリスト(進捗リング + NumberFlow の %)
 * - Enter で次へ(フォームの submit)。useReducedMotion 時はスライド・紙吹雪をやめ、短いフェードにする
 */

/* ───────────── データ ───────────── */

type RoleId = 'engineer' | 'designer' | 'pm' | 'marketing' | 'sales' | 'founder'
const ROLES: { id: RoleId; label: string; desc: string; Icon: LucideIcon }[] = [
  { id: 'engineer', label: 'エンジニア', desc: '開発・インフラ', Icon: Code2 },
  { id: 'designer', label: 'デザイナー', desc: 'UI・ブランド', Icon: Palette },
  { id: 'pm', label: 'プロダクトマネージャー', desc: '企画・優先度づけ', Icon: Compass },
  { id: 'marketing', label: 'マーケティング', desc: '集客・広報', Icon: Megaphone },
  { id: 'sales', label: '営業・CS', desc: '商談・サポート', Icon: Handshake },
  { id: 'founder', label: '経営・その他', desc: '全体を見渡す', Icon: Briefcase },
]
const SIZES = ['1〜10人', '11〜50人', '51〜200人', '201人以上']

type InterestId =
  | 'docs'
  | 'tasks'
  | 'roadmap'
  | 'meeting'
  | 'wiki'
  | 'okr'
  | 'bugs'
  | 'review'
  | 'hiring'
  | 'voice'
  | 'sprint'
  | 'knowledge'
const INTERESTS: { id: InterestId; label: string; Icon: LucideIcon }[] = [
  { id: 'docs', label: 'ドキュメント', Icon: FileText },
  { id: 'tasks', label: 'タスク管理', Icon: ListChecks },
  { id: 'roadmap', label: 'ロードマップ', Icon: MapIcon },
  { id: 'meeting', label: '議事録', Icon: NotebookPen },
  { id: 'wiki', label: '社内Wiki', Icon: BookOpen },
  { id: 'okr', label: '目標・OKR', Icon: Target },
  { id: 'bugs', label: 'バグ管理', Icon: Bug },
  { id: 'review', label: 'デザインレビュー', Icon: PenTool },
  { id: 'sprint', label: 'スプリント', Icon: Repeat },
  { id: 'hiring', label: '採用', Icon: UserPlus },
  { id: 'voice', label: '顧客の声', Icon: MessageSquareHeart },
  { id: 'knowledge', label: 'ナレッジ共有', Icon: Lightbulb },
]
const RECOMMEND: Record<RoleId, InterestId[]> = {
  engineer: ['tasks', 'bugs', 'sprint', 'docs'],
  designer: ['review', 'docs', 'roadmap', 'voice'],
  pm: ['roadmap', 'docs', 'okr', 'meeting'],
  marketing: ['tasks', 'okr', 'voice', 'knowledge'],
  sales: ['voice', 'meeting', 'wiki', 'tasks'],
  founder: ['okr', 'meeting', 'hiring', 'wiki'],
}
const TEMPLATES: Record<RoleId | 'none', { title: string; Icon: LucideIcon }[]> = {
  none: [
    { title: 'はじめてのドキュメント', Icon: FileText },
    { title: 'チームの約束', Icon: Users },
  ],
  engineer: [
    { title: 'スプリント計画', Icon: Repeat },
    { title: '障害ふりかえり', Icon: Bug },
  ],
  designer: [
    { title: 'デザインレビュー', Icon: PenTool },
    { title: 'ムードボード', Icon: Palette },
  ],
  pm: [
    { title: 'PRD テンプレート', Icon: FileText },
    { title: '四半期ロードマップ', Icon: MapIcon },
  ],
  marketing: [
    { title: 'キャンペーン計画', Icon: Megaphone },
    { title: 'コンテンツ予定表', Icon: CalendarDays },
  ],
  sales: [
    { title: '商談メモ', Icon: Handshake },
    { title: '導入オンボーディング', Icon: ListChecks },
  ],
  founder: [
    { title: '週次の経営レビュー', Icon: Briefcase },
    { title: '全社 OKR', Icon: Target },
  ],
}

const COLORS = [
  { c: '#3546c8', name: '藍' },
  { c: '#e5603b', name: '朱' },
  { c: '#0f8a73', name: '青竹' },
  { c: '#7c4ddb', name: '菫' },
  { c: '#c98a0b', name: '山吹' },
  { c: '#d23f7d', name: '躑躅' },
  { c: '#1786c4', name: '空' },
  { c: '#3a4255', name: '墨' },
]
type WsIconId = 'letter' | 'rocket' | 'leaf' | 'sparkles' | 'mountain' | 'coffee' | 'flame' | 'atom' | 'feather' | 'sun' | 'anchor'
const WS_ICONS: { id: WsIconId; label: string; Icon: LucideIcon | null }[] = [
  { id: 'letter', label: '頭文字', Icon: null },
  { id: 'rocket', label: 'ロケット', Icon: Rocket },
  { id: 'leaf', label: '葉', Icon: Leaf },
  { id: 'sparkles', label: 'きらめき', Icon: Sparkles },
  { id: 'mountain', label: '山', Icon: Mountain },
  { id: 'coffee', label: 'コーヒー', Icon: Coffee },
  { id: 'flame', label: '炎', Icon: Flame },
  { id: 'atom', label: '原子', Icon: Atom },
  { id: 'feather', label: '羽根', Icon: Feather },
  { id: 'sun', label: '太陽', Icon: Sun },
  { id: 'anchor', label: '錨', Icon: Anchor },
]

const SUGGESTED = [
  { name: '佐伯 湊', email: 'minato.saeki@minamo-design.jp' },
  { name: '久保田 千尋', email: 'chihiro.kubota@minamo-design.jp' },
  { name: '野々村 律', email: 'ritsu.nonomura@minamo-design.jp' },
]

const STEPS = [
  { id: 'welcome', label: 'ようこそ' },
  { id: 'role', label: '役割' },
  { id: 'interests', label: '使い方' },
  { id: 'invite', label: '招待' },
  { id: 'workspace', label: 'ワークスペース' },
  { id: 'done', label: '完了' },
] as const

const EASE = [0.32, 0.72, 0, 1] as const
const FOCUS =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#3546c8]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const RESERVED = ['kumiko', 'admin', 'team', 'minamo', 'help']

function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const AVATAR_HUES = [12, 32, 160, 200, 230, 262, 330, 95]
const avatarColor = (s: string) => `hsl(${AVATAR_HUES[hashStr(s) % AVATAR_HUES.length]} 62% 52%)`
function slugify(s: string) {
  const a = s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
  return a || (s.trim() ? `team-${hashStr(s.trim()).toString(36).slice(0, 4)}` : 'my-team')
}
const initialOf = (s: string) => (s.trim() ? Array.from(s.trim())[0].toUpperCase() : 'K')

/* ───────────── 小物 ───────────── */

function KumikoMark({ size = 26 }: { size?: number }) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return [12 + 9.5 * Math.cos(a), 12 + 9.5 * Math.sin(a)] as const
  })
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0" aria-hidden>
      <rect width="24" height="24" rx="6.5" fill="#1b2366" />
      <polygon points={`12,12 ${pts[1].join(',')} ${pts[2].join(',')}`} fill="#ef6a45" />
      <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <line key={i} x1="12" y1="12" x2={p[0]} y2={p[1]} stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
      ))}
    </svg>
  )
}

function Avatar({ label, size = 24, ring }: { label: string; size?: number; ring?: string }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: avatarColor(label),
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
      aria-hidden
    >
      {initialOf(label.includes('@') ? label.split('@')[0] : label)}
    </span>
  )
}

function WsTile({ icon, color, name, size = 32, radius = 9 }: { icon: WsIconId; color: string; name: string; size?: number; radius?: number }) {
  const def = WS_ICONS.find((i) => i.id === icon)
  const Icon = def?.Icon
  return (
    <span
      className="grid shrink-0 place-items-center font-bold text-white transition-colors duration-300"
      style={{ width: size, height: size, borderRadius: radius, background: color, fontSize: size * 0.46 }}
      aria-hidden
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={icon + (icon === 'letter' ? initialOf(name) : '')}
          initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          className="grid place-items-center"
        >
          {Icon ? <Icon size={size * 0.52} strokeWidth={2.1} /> : initialOf(name)}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function StepHeading({ eyebrow, title, sub }: { eyebrow?: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      {eyebrow && <div className="mb-1.5 text-[11.5px] font-semibold tracking-[0.08em] text-[#3546c8]">{eyebrow}</div>}
      <h2 className="text-[21px] font-bold leading-tight tracking-[-0.01em] text-[#161a2e] @md:text-[23px]">{title}</h2>
      {sub && <p className="mt-1.5 text-[13px] leading-relaxed text-[#5d6378]">{sub}</p>}
    </div>
  )
}

/* ───────────── ステッパー ───────────── */

function Stepper({ step, maxStep, onJump, reduced }: { step: number; maxStep: number; onJump: (i: number) => void; reduced: boolean }) {
  return (
    <>
      {/* 広い幅: 丸と線 */}
      <ol className="hidden items-center @2xl:flex" aria-label="進捗">
        {STEPS.map((s, i) => {
          const done = i < step
          const current = i === step
          const reachable = i <= maxStep && i !== step && step < 5
          return (
            <li key={s.id} className="flex items-center">
              {i > 0 && (
                <span className="relative mx-1.5 h-[2px] w-5 overflow-hidden rounded-full bg-[#e3e5ee] @4xl:w-8" aria-hidden>
                  <motion.span
                    className="absolute inset-y-0 left-0 bg-[#3546c8]"
                    initial={false}
                    animate={{ width: i <= step ? '100%' : '0%' }}
                    transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
                  />
                </span>
              )}
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onJump(i)}
                aria-current={current ? 'step' : undefined}
                aria-label={`${i + 1}. ${s.label}${done ? '(完了)' : ''}`}
                className={`group flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1.5 ${FOCUS} ${reachable ? 'cursor-pointer hover:bg-[#f0f1f6]' : 'cursor-default'}`}
              >
                <span
                  className={`relative grid h-[22px] w-[22px] place-items-center rounded-full text-[11px] font-bold transition-colors duration-300 ${
                    done ? 'bg-[#3546c8] text-white' : current ? 'bg-white text-[#3546c8] ring-2 ring-[#3546c8]' : 'bg-[#eceef4] text-[#8a90a6]'
                  }`}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {done ? (
                      <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 24 }}>
                        <Check size={12} strokeWidth={3.2} />
                      </motion.span>
                    ) : (
                      <motion.span key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {i + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <AnimatePresence initial={false}>
                  {current && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: reduced ? 0 : 0.28, ease: EASE }}
                      className="overflow-hidden whitespace-nowrap text-[12px] font-semibold text-[#161a2e]"
                    >
                      {s.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </li>
          )
        })}
      </ol>
      {/* 狭い幅: 数字とバー */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 @2xl:hidden">
        <span className="shrink-0 text-[12px] font-semibold text-[#4a5068]">
          {step + 1}/{STEPS.length} <span className="font-normal text-[#8a90a6]">· {STEPS[step].label}</span>
        </span>
        <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#e8eaf1]" role="progressbar" aria-valuemin={1} aria-valuemax={6} aria-valuenow={step + 1} aria-label="進捗">
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full bg-[#3546c8]"
            initial={false}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
          />
        </span>
      </div>
    </>
  )
}

/* ───────────── ステップ: ようこそ ───────────── */

function WelcomeArt({ reduced }: { reduced: boolean }) {
  // 組子の三角ピースが集まって六角形になる
  const tris = Array.from({ length: 6 }, (_, i) => {
    const a0 = ((60 * i - 90) * Math.PI) / 180
    const a1 = ((60 * (i + 1) - 90) * Math.PI) / 180
    const r = 40
    return {
      pts: `50,50 ${50 + r * Math.cos(a0)},${50 + r * Math.sin(a0)} ${50 + r * Math.cos(a1)},${50 + r * Math.sin(a1)}`,
      mid: (a0 + a1) / 2,
      fill: i === 1 ? '#ef6a45' : i === 4 ? '#ffc9b5' : i % 2 ? '#c9cff5' : '#3546c8',
    }
  })
  return (
    <svg viewBox="0 0 100 100" className="h-[84px] w-[84px]" aria-hidden>
      {tris.map((t, i) => (
        <motion.polygon
          key={i}
          points={t.pts}
          fill={t.fill}
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: Math.cos(t.mid) * 26, y: Math.sin(t.mid) * 26, rotate: 40 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 160, damping: 16, delay: 0.15 + i * 0.07 }}
          style={{ originX: '50px', originY: '50px' }}
        />
      ))}
    </svg>
  )
}

function WelcomeStep({ name, setName, reduced }: { name: string; setName: (v: string) => void; reduced: boolean }) {
  const id = useId()
  return (
    <div>
      <WelcomeArt reduced={reduced} />
      <div className="mt-4">
        <StepHeading
          title="ようこそ、Kumiko へ"
          sub="いくつかの質問に答えるだけで、チームにぴったりのワークスペースを用意します。所要時間はおよそ2分です。"
        />
      </div>
      <div className="mt-5 max-w-[380px]">
        <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-semibold text-[#2c3148]">
          表示名
        </label>
        <input
          id={id}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 山田 花子"
          autoComplete="name"
          maxLength={24}
          className="h-10 w-full rounded-lg border border-[#dfe2ea] bg-white px-3 text-[14px] text-[#161a2e] outline-none transition-[border-color,box-shadow] placeholder:text-[#a2a7b8] hover:border-[#c8ccd9] focus:border-[#3546c8] focus:shadow-[0_0_0_3px_rgba(53,70,200,0.14)]"
        />
        <p className="mt-1.5 text-[11.5px] text-[#8a90a6]">チームのメンバーに表示されます。あとから変更できます。</p>
      </div>
      <ul className="mt-5 grid gap-2 text-[12.5px] text-[#4a5068] @lg:grid-cols-3">
        {[
          { Icon: Sparkles, t: '役割に合わせたテンプレート' },
          { Icon: Users, t: 'チームメイトをまとめて招待' },
          { Icon: Palette, t: '色とアイコンで自分たちらしく' },
        ].map(({ Icon, t }, i) => (
          <motion.li
            key={t}
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : 0.5 + i * 0.08 }}
            className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-[#e8eaf1]"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#eef0fb] text-[#3546c8]">
              <Icon size={13} aria-hidden />
            </span>
            {t}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

/* ───────────── ステップ: 役割 ───────────── */

function RoleStep({
  role,
  setRole,
  size,
  setSize,
  reduced,
}: {
  role: RoleId | null
  setRole: (r: RoleId) => void
  size: string | null
  setSize: (s: string) => void
  reduced: boolean
}) {
  const uid = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const idx = role ? ROLES.findIndex((r) => r.id === role) : -1
  const onKey = (e: ReactKeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const n = (i + delta + ROLES.length) % ROLES.length
    setRole(ROLES[n].id)
    refs.current[n]?.focus()
  }
  return (
    <div>
      <StepHeading eyebrow="STEP 2" title="あなたの役割を教えてください" sub="役割に合わせて、最初に表示するテンプレートとおすすめ機能を選びます。" />
      <div role="radiogroup" aria-label="役割" className="mt-5 grid grid-cols-2 gap-2 @2xl:grid-cols-3">
        {ROLES.map((r, i) => {
          const on = role === r.id
          return (
            <motion.button
              key={r.id}
              ref={(el: HTMLButtonElement | null) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (idx < 0 && i === 0) ? 0 : -1}
              onClick={() => setRole(r.id)}
              onKeyDown={(e) => onKey(e, i)}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              className={`relative flex items-start gap-2.5 rounded-xl border bg-white p-3 text-left transition-[border-color,box-shadow,background-color] ${FOCUS} ${
                on ? 'border-[#3546c8] bg-[#f6f7fe] shadow-[0_0_0_3px_rgba(53,70,200,0.12)]' : 'border-[#e3e5ee] hover:border-[#c8ccd9]'
              }`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${on ? 'bg-[#3546c8] text-white' : 'bg-[#f0f1f6] text-[#4a5068]'}`}>
                <r.Icon size={16} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight text-[#161a2e]">{r.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-[#7a8095]">{r.desc}</span>
              </span>
              <AnimatePresence>
                {on && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 26 }}
                    className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-[#3546c8] text-white"
                    aria-hidden
                  >
                    <Check size={10} strokeWidth={3.5} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>
      <div className="mt-5">
        <div id={`${uid}-size`} className="mb-1.5 text-[12.5px] font-semibold text-[#2c3148]">
          チームの人数
        </div>
        <div role="radiogroup" aria-labelledby={`${uid}-size`} className="relative grid grid-cols-4 rounded-[10px] bg-[#eef0f5] p-1">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={size === s}
              onClick={() => setSize(s)}
              className={`relative h-8 rounded-[7px] text-[12px] font-semibold transition-colors ${FOCUS} ${size === s ? 'text-[#161a2e]' : 'text-[#6b7186] hover:text-[#161a2e]'}`}
            >
              {size === s && (
                <motion.span
                  layoutId={`${uid}-pill`}
                  className="absolute inset-0 rounded-[7px] bg-white shadow-[0_1px_2px_rgba(22,26,46,0.12)]"
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }}
                />
              )}
              <span className="relative">{s}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────── ステップ: 使い方 ───────────── */

function InterestsStep({
  role,
  interests,
  toggle,
  setInterests,
  reduced,
}: {
  role: RoleId | null
  interests: InterestId[]
  toggle: (id: InterestId) => void
  setInterests: (v: InterestId[]) => void
  reduced: boolean
}) {
  const rec = role ? RECOMMEND[role] : []
  return (
    <div>
      <StepHeading eyebrow="STEP 3" title="Kumiko で何をしますか？" sub="いくつでも選べます。選んだものがサイドバーに並びます。" />
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[12px] text-[#6b7186]" aria-live="polite">
          <span className="font-semibold tabular-nums text-[#161a2e]">{interests.length}</span> 件を選択中
        </span>
        {rec.length > 0 && (
          <button
            type="button"
            onClick={() => setInterests(Array.from(new Set([...interests, ...rec])))}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-semibold text-[#3546c8] hover:bg-[#eef0fb] ${FOCUS}`}
          >
            <Sparkles size={13} aria-hidden />
            おすすめをまとめて選択
          </button>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="使いたい機能">
        {INTERESTS.map((it, i) => {
          const on = interests.includes(it.id)
          const isRec = rec.includes(it.id)
          return (
            <motion.button
              key={it.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(it.id)}
              initial={{ opacity: 0, y: reduced ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : i * 0.025, duration: 0.25 }}
              whileTap={reduced ? undefined : { scale: 0.95 }}
              className={`relative inline-flex h-9 items-center gap-1.5 rounded-full border pl-2.5 pr-3 text-[12.5px] font-semibold transition-[background-color,border-color,color] ${FOCUS} ${
                on ? 'border-[#3546c8] bg-[#3546c8] text-white' : 'border-[#dfe2ea] bg-white text-[#2c3148] hover:border-[#b9bed0]'
              }`}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {on ? (
                  <motion.span key="c" initial={{ scale: 0, rotate: -60 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 24 }}>
                    <Check size={14} strokeWidth={3} aria-hidden />
                  </motion.span>
                ) : (
                  <motion.span key="i" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className={isRec ? 'text-[#3546c8]' : 'text-[#7a8095]'}>
                    <it.Icon size={14} aria-hidden />
                  </motion.span>
                )}
              </AnimatePresence>
              {it.label}
              {isRec && !on && (
                <span className="ml-0.5 rounded-full bg-[#fff1eb] px-1.5 py-px text-[10px] font-bold text-[#c24a26]">おすすめ</span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────── ステップ: 招待 ───────────── */

function InviteStep({
  invites,
  setInvites,
  perm,
  setPerm,
  error,
  reduced,
}: {
  invites: string[]
  setInvites: (v: string[]) => void
  perm: 'member' | 'admin'
  setPerm: (p: 'member' | 'admin') => void
  error: string | null
  reduced: boolean
}) {
  const uid = useId()
  const [draft, setDraft] = useState('')
  const [dup, setDup] = useState<{ email: string; n: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const copyTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(copyTimer.current), [])
  // 重複の強調は少しで消す
  useEffect(() => {
    if (!dup) return
    const t = window.setTimeout(() => setDup(null), 1600)
    return () => window.clearTimeout(t)
  }, [dup])

  const add = (raw: string) => {
    const parts = raw
      .split(/[\s,;、，]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (!parts.length) return
    const next = [...invites]
    for (const p of parts) {
      const hit = next.find((x) => x.toLowerCase() === p.toLowerCase())
      if (hit) setDup((d) => ({ email: hit, n: (d?.n ?? 0) + 1 }))
      else next.push(p)
    }
    setInvites(next)
    setDraft('')
  }
  const remove = (e: string) => {
    setInvites(invites.filter((x) => x !== e))
    inputRef.current?.focus()
  }

  const invalid = invites.filter((e) => !EMAIL_RE.test(e))

  return (
    <div>
      <StepHeading eyebrow="STEP 4" title="チームメイトを招待" sub="メールアドレスを入力して Enter。カンマ区切りでまとめて貼り付けることもできます。" />
      <label htmlFor={`${uid}-in`} className="sr-only">
        招待するメールアドレス
      </label>
      <div
        onClick={() => inputRef.current?.focus()}
        className={`mt-4 flex min-h-[46px] cursor-text flex-wrap items-center gap-1.5 rounded-xl border bg-white p-1.5 transition-[border-color,box-shadow] focus-within:shadow-[0_0_0_3px_rgba(53,70,200,0.14)] ${
          error ? 'border-[#d93f4c]' : 'border-[#dfe2ea] focus-within:border-[#3546c8]'
        }`}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {invites.map((e) => {
            const ok = EMAIL_RE.test(e)
            const shaking = dup?.email === e
            return (
              <motion.span
                layout={!reduced}
                key={e}
                initial={{ opacity: 0, scale: reduced ? 1 : 0.7 }}
                animate={shaking && !reduced ? { opacity: 1, scale: 1, x: [0, -6, 6, -4, 3, 0] } : { opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: reduced ? 1 : 0.7 }}
                transition={{ duration: 0.3 }}
                className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg pl-1 pr-0.5 text-[12.5px] font-medium ${
                  ok ? 'bg-[#eef0f7] text-[#2c3148]' : 'bg-[#fdecee] text-[#b02a37] ring-1 ring-[#d93f4c]/40'
                } ${shaking ? 'ring-2 ring-[#e59a1a]' : ''}`}
                title={ok ? e : '形式が正しくありません'}
              >
                {ok ? <Avatar label={e} size={22} /> : <AlertCircle size={15} className="ml-1" aria-hidden />}
                <span className="truncate">{e}</span>
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    remove(e)
                  }}
                  aria-label={`${e} を削除${ok ? '' : '(形式が正しくありません)'}`}
                  className={`grid h-6 w-6 place-items-center rounded-md text-current opacity-60 hover:bg-black/5 hover:opacity-100 ${FOCUS}`}
                >
                  <X size={13} aria-hidden />
                </button>
              </motion.span>
            )
          })}
        </AnimatePresence>
        <input
          id={`${uid}-in`}
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            const v = e.target.value
            if (/[,;、，\s]$/.test(v) && v.trim()) add(v)
            else setDraft(v)
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === 'Tab') && draft.trim()) {
              e.preventDefault()
              add(draft)
            } else if (e.key === 'Backspace' && !draft && invites.length) {
              e.preventDefault()
              setInvites(invites.slice(0, -1))
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
            const t = e.clipboardData.getData('text')
            if (/[\s,;、，]/.test(t.trim())) {
              e.preventDefault()
              add(draft + t)
            }
          }}
          placeholder={invites.length ? '' : 'name@example.jp'}
          type="email"
          autoComplete="off"
          spellCheck={false}
          className="h-8 min-w-[140px] flex-1 bg-transparent px-1.5 text-[13.5px] text-[#161a2e] outline-none placeholder:text-[#a2a7b8]"
        />
      </div>
      <div className="mt-1.5 min-h-[18px] text-[12px]" aria-live="polite">
        {error ? (
          <span className="inline-flex items-center gap-1 text-[#c9323f]">
            <AlertCircle size={13} aria-hidden /> {error}
          </span>
        ) : invalid.length ? (
          <span className="text-[#b02a37]">{invalid.length}件のアドレスの形式が正しくありません</span>
        ) : dup ? (
          <span className="text-[#97600b]">{dup.email} はすでに追加されています</span>
        ) : (
          <span className="text-[#8a90a6]">{invites.length ? `${invites.length}人に招待メールを送ります` : 'スキップして、あとから招待することもできます'}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[#4a5068]">権限</span>
        <div role="radiogroup" aria-label="招待する人の権限" className="flex rounded-lg bg-[#eef0f5] p-0.5">
          {(
            [
              ['member', 'メンバー'],
              ['admin', '管理者'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={perm === k}
              onClick={() => setPerm(k)}
              className={`relative h-7 rounded-md px-2.5 text-[12px] font-semibold ${FOCUS} ${perm === k ? 'text-[#161a2e]' : 'text-[#6b7186]'}`}
            >
              {perm === k && (
                <motion.span layoutId={`${uid}-perm`} className="absolute inset-0 rounded-md bg-white shadow-[0_1px_2px_rgba(22,26,46,0.12)]" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }} />
              )}
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              void navigator.clipboard?.writeText('https://kumiko.app/join/7Qm2-xK4d').catch(() => {})
            } catch {
              /* クリップボード不可でも表示だけ切り替える */
            }
            setCopied(true)
            window.clearTimeout(copyTimer.current)
            copyTimer.current = window.setTimeout(() => setCopied(false), 1800)
          }}
          className={`ml-auto inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#dfe2ea] bg-white px-2.5 text-[12px] font-semibold text-[#2c3148] hover:bg-[#f7f8fb] ${FOCUS}`}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={copied ? 'y' : 'n'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-flex items-center gap-1.5">
              {copied ? <Check size={13} className="text-[#1a9e6a]" aria-hidden /> : <Link2 size={13} aria-hidden />}
              {copied ? 'コピーしました' : '招待リンクをコピー'}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-[#e8eaf1] bg-white">
        <div className="border-b border-[#eef0f4] px-3 py-2 text-[11.5px] font-semibold text-[#6b7186]">同じドメインのメンバー</div>
        <ul>
          {SUGGESTED.map((p) => {
            const added = invites.some((x) => x.toLowerCase() === p.email)
            return (
              <li key={p.email} className="flex items-center gap-2.5 px-3 py-2">
                <Avatar label={p.name} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-[#161a2e]">{p.name}</span>
                  <span className="block truncate text-[11px] text-[#8a90a6]">{p.email}</span>
                </span>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => add(p.email)}
                  aria-label={added ? `${p.name} は追加済み` : `${p.name} を追加`}
                  className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-semibold transition-colors ${FOCUS} ${
                    added ? 'text-[#1a9e6a]' : 'text-[#3546c8] hover:bg-[#eef0fb]'
                  }`}
                >
                  {added ? <Check size={13} aria-hidden /> : <Plus size={13} aria-hidden />}
                  {added ? '追加済み' : '追加'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* ───────────── ステップ: ワークスペース ───────────── */

function WorkspaceStep({
  wsName,
  setWsName,
  placeholder,
  color,
  setColor,
  icon,
  setIcon,
  reduced,
}: {
  wsName: string
  setWsName: (v: string) => void
  placeholder: string
  color: string
  setColor: (c: string) => void
  icon: WsIconId
  setIcon: (i: WsIconId) => void
  reduced: boolean
}) {
  const uid = useId()
  const effective = wsName.trim() || placeholder
  const slug = slugify(effective)
  const [avail, setAvail] = useState<'checking' | 'ok' | 'taken'>('ok')
  useEffect(() => {
    setAvail('checking')
    const t = window.setTimeout(() => setAvail(RESERVED.includes(slug) ? 'taken' : 'ok'), 450)
    return () => window.clearTimeout(t)
  }, [slug])

  return (
    <div>
      <StepHeading eyebrow="STEP 5" title="ワークスペースを整えましょう" sub="名前と色、アイコンを決めます。チーム全員に表示されます。" />
      <div className="mt-4">
        <label htmlFor={`${uid}-n`} className="mb-1.5 block text-[12.5px] font-semibold text-[#2c3148]">
          ワークスペース名
        </label>
        <div className="flex items-center gap-2.5">
          <WsTile icon={icon} color={color} name={effective} size={40} radius={11} />
          <input
            id={`${uid}-n`}
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            placeholder={placeholder}
            maxLength={28}
            className="h-10 min-w-0 flex-1 rounded-lg border border-[#dfe2ea] bg-white px-3 text-[14px] text-[#161a2e] outline-none transition-[border-color,box-shadow] placeholder:text-[#a2a7b8] hover:border-[#c8ccd9] focus:border-[#3546c8] focus:shadow-[0_0_0_3px_rgba(53,70,200,0.14)]"
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-[50px] text-[11.5px]" aria-live="polite">
          <span className="font-mono text-[#6b7186]">
            kumiko.app/<span className="text-[#161a2e]">{slug}</span>
          </span>
          {avail === 'checking' ? (
            <span className="text-[#8a90a6]">確認中…</span>
          ) : avail === 'ok' ? (
            <span className="inline-flex items-center gap-0.5 font-semibold text-[#1a9e6a]">
              <Check size={12} strokeWidth={3} aria-hidden /> 利用できます
            </span>
          ) : (
            <span className="font-semibold text-[#c24a26]">使用済みです(「{slug}-2」になります)</span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div id={`${uid}-c`} className="mb-2 text-[12.5px] font-semibold text-[#2c3148]">
          テーマカラー
        </div>
        <div role="radiogroup" aria-labelledby={`${uid}-c`} className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c.c}
              type="button"
              role="radio"
              aria-checked={color === c.c}
              aria-label={c.name}
              title={c.name}
              onClick={() => setColor(c.c)}
              className={`relative grid h-8 w-8 place-items-center rounded-full ${FOCUS}`}
            >
              {color === c.c && (
                <motion.span
                  layoutId={`${uid}-cring`}
                  className="absolute -inset-[3px] rounded-full border-2"
                  style={{ borderColor: c.c }}
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 34 }}
                />
              )}
              <span className="h-full w-full rounded-full" style={{ background: c.c }} />
              {color === c.c && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute text-white">
                  <Check size={14} strokeWidth={3} aria-hidden />
                </motion.span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div id={`${uid}-i`} className="mb-2 text-[12.5px] font-semibold text-[#2c3148]">
          アイコン
        </div>
        <div role="radiogroup" aria-labelledby={`${uid}-i`} className="flex flex-wrap gap-1.5">
          {WS_ICONS.map((it) => {
            const on = icon === it.id
            return (
              <button
                key={it.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={it.label}
                title={it.label}
                onClick={() => setIcon(it.id)}
                className={`relative grid h-9 w-9 place-items-center rounded-lg text-[14px] font-bold transition-colors ${FOCUS} ${on ? 'text-white' : 'bg-white text-[#4a5068] ring-1 ring-[#e3e5ee] hover:ring-[#c8ccd9]'}`}
              >
                {on && (
                  <motion.span
                    layoutId={`${uid}-iring`}
                    className="absolute inset-0 rounded-lg"
                    style={{ background: color }}
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                <span className="relative">{it.Icon ? <it.Icon size={16} aria-hidden /> : initialOf(effective)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ───────────── ステップ: 完了 ───────────── */

function DoneStep({
  name,
  wsName,
  color,
  icon,
  role,
  interests,
  invites,
  reduced,
}: {
  name: string
  wsName: string
  color: string
  icon: WsIconId
  role: RoleId | null
  interests: InterestId[]
  invites: string[]
  reduced: boolean
}) {
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? '未設定'
  return (
    <div className="flex flex-col items-center pt-2 text-center">
      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 0.3, rotate: -25, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
        className="relative"
      >
        <span className="absolute -inset-3 rounded-[26px] opacity-25 blur-xl" style={{ background: color }} aria-hidden />
        <WsTile icon={icon} color={color} name={wsName} size={72} radius={20} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : 0.3 }} className="mt-5">
        <div className="mb-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#1a9e6a]">
          <PartyPopper size={14} aria-hidden /> 準備完了
        </div>
        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-[#161a2e]">「{wsName}」ができました！</h2>
        <p className="mx-auto mt-1.5 max-w-[360px] text-[13px] leading-relaxed text-[#5d6378]">
          {name.trim() || 'あなた'}さん、おつかれさまでした。最初にやることをまとめたチェックリストを用意しています。
        </p>
      </motion.div>
      <motion.dl
        initial={{ opacity: 0, y: reduced ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 0.45 }}
        className="mt-5 grid w-full max-w-[400px] grid-cols-3 divide-x divide-[#eceef4] rounded-xl border border-[#e8eaf1] bg-white py-3"
      >
        {[
          ['役割', roleLabel],
          ['使う機能', `${interests.length}件`],
          ['招待', `${invites.length}人`],
        ].map(([k, v]) => (
          <div key={k} className="px-2">
            <dt className="text-[11px] text-[#8a90a6]">{k}</dt>
            <dd className="mt-0.5 truncate text-[13.5px] font-bold text-[#161a2e]">{v}</dd>
          </div>
        ))}
      </motion.dl>
    </div>
  )
}

/* ───────────── ライブプレビュー ───────────── */

function Highlight({ on, color, children, className = '' }: { on: boolean; color: string; children: ReactNode; className?: string }) {
  return (
    <div className={`relative -m-1.5 p-1.5 ${className}`}>
      {children}
      <AnimatePresence>
        {on && (
          <motion.span
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 rounded-[10px] border-[1.5px] border-dashed"
            style={{ borderColor: color }}
            aria-hidden
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Preview({
  step,
  name,
  role,
  interests,
  invites,
  wsName,
  color,
  icon,
  reduced,
}: {
  step: number
  name: string
  role: RoleId | null
  interests: InterestId[]
  invites: string[]
  wsName: string
  color: string
  icon: WsIconId
  reduced: boolean
}) {
  const sel = INTERESTS.filter((i) => interests.includes(i.id))
  const templates = TEMPLATES[role ?? 'none']
  const members = [name || 'あなた', ...invites.filter((e) => EMAIL_RE.test(e))]
  const id = STEPS[step].id
  const patId = useId().replace(/:/g, '') + 'dots'
  return (
    <aside
      className="relative hidden w-[42%] max-w-[520px] shrink-0 flex-col justify-center overflow-hidden px-6 py-6 transition-colors duration-500 @3xl:flex"
      style={{ background: `linear-gradient(160deg, ${color}1f, ${color}0a 60%, #f4f3f0)` }}
      aria-label="ワークスペースのプレビュー"
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.5]" aria-hidden>
        <defs>
          <pattern id={patId} width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill={color} fillOpacity="0.18" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patId})`} />
      </svg>
      <div className="relative mb-3 flex items-center justify-between text-[11px] font-semibold text-[#5d6378]">
        <span className="inline-flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {!reduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: color }} />}
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
          </span>
          ライブプレビュー
        </span>
        <span className="font-mono text-[10.5px] text-[#8a90a6]">kumiko.app/{slugify(wsName)}</span>
      </div>

      <motion.div
        layout={!reduced}
        className="relative overflow-hidden rounded-xl bg-white shadow-[0_24px_50px_-24px_rgba(22,26,46,0.45),0_0_0_1px_rgba(22,26,46,0.06)]"
      >
        <div className="flex h-7 items-center gap-1.5 border-b border-[#eef0f4] px-3" aria-hidden>
          {['#f3b2a4', '#f4d79b', '#b5dfc4'].map((c) => (
            <span key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <div className="flex h-[330px]">
          {/* サイドバー */}
          <div className="flex w-[40%] min-w-0 flex-col border-r border-[#eef0f4] bg-[#fafaf8] p-2.5">
            <Highlight on={id === 'workspace'} color={color}>
              <div className="flex items-center gap-2">
                <WsTile icon={icon} color={color} name={wsName} size={24} radius={7} />
                <span className="truncate text-[11.5px] font-bold text-[#161a2e]">{wsName}</span>
              </div>
            </Highlight>
            <div className="mt-2.5 flex h-6 items-center gap-1.5 rounded-md bg-[#f0f1f4] px-2 text-[10px] text-[#9aa0b4]">
              <Search size={10} aria-hidden /> 検索
            </div>
            <div className="mt-2 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10.5px] font-semibold" style={{ background: `${color}14`, color }}>
              <Home size={11} aria-hidden /> ホーム
            </div>
            <Highlight on={id === 'interests'} color={color} className="mt-1.5 min-h-[60px]">
              <div className="px-1.5 pb-1 pt-1 text-[9px] font-bold tracking-[0.08em] text-[#9aa0b4]">スペース</div>
              <ul className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {sel.slice(0, 7).map((it) => (
                    <motion.li
                      key={it.id}
                      layout={!reduced}
                      initial={{ opacity: 0, x: reduced ? 0 : -10, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, x: reduced ? 0 : -10, height: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <span className="flex items-center gap-1.5 rounded-md px-1.5 py-[3px] text-[10.5px] text-[#4a5068]">
                        <it.Icon size={11} aria-hidden className="shrink-0" style={{ color }} />
                        <span className="truncate">{it.label}</span>
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {sel.length > 7 && <li className="px-1.5 text-[10px] text-[#9aa0b4]">ほか {sel.length - 7} 件</li>}
                {sel.length === 0 && (
                  <li className="space-y-1.5 px-1.5 pt-1" aria-hidden>
                    <span className="block h-1.5 w-3/4 rounded bg-[#eceef2]" />
                    <span className="block h-1.5 w-1/2 rounded bg-[#eceef2]" />
                  </li>
                )}
              </ul>
            </Highlight>
            <div className="mt-auto">
              <Highlight on={id === 'invite'} color={color}>
                <div className="px-1 text-[9px] font-bold tracking-[0.08em] text-[#9aa0b4]">メンバー {members.length}</div>
                <div className="mt-1 flex -space-x-1.5 px-1">
                  <AnimatePresence initial={false}>
                    {members.slice(0, 6).map((m) => (
                      <motion.span key={m} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 24 }}>
                        <Avatar label={m} size={20} ring="#fafaf8" />
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  {members.length > 6 && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#e3e5ee] text-[8px] font-bold text-[#4a5068] ring-2 ring-[#fafaf8]">+{members.length - 6}</span>
                  )}
                </div>
              </Highlight>
            </div>
          </div>
          {/* メイン */}
          <div className="min-w-0 flex-1 p-3">
            <Highlight on={id === 'welcome'} color={color}>
              <div className="text-[9.5px] text-[#9aa0b4]">月曜日の朝</div>
              <div className="truncate text-[13px] font-bold text-[#161a2e]">おはようございます、{name.trim() || 'あなた'}さん</div>
            </Highlight>
            <Highlight on={id === 'role'} color={color} className="mt-3">
              <div className="text-[9px] font-bold tracking-[0.08em] text-[#9aa0b4]">{role ? `${ROLES.find((r) => r.id === role)?.label}向けテンプレート` : 'テンプレート'}</div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {templates.map((t, i) => (
                    <motion.div
                      key={t.title}
                      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: reduced ? 0 : -8 }}
                      transition={{ duration: 0.25, delay: reduced ? 0 : i * 0.05 }}
                      className="rounded-lg border border-[#eef0f4] p-2"
                    >
                      <span className="grid h-5 w-5 place-items-center rounded-md" style={{ background: `${color}18`, color }}>
                        <t.Icon size={11} aria-hidden />
                      </span>
                      <div className="mt-1.5 truncate text-[10px] font-semibold text-[#2c3148]">{t.title}</div>
                      <div className="mt-1 space-y-1" aria-hidden>
                        <span className="block h-1 w-full rounded bg-[#f0f1f4]" />
                        <span className="block h-1 w-2/3 rounded bg-[#f0f1f4]" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Highlight>
            <div className="mt-3 text-[9px] font-bold tracking-[0.08em] text-[#9aa0b4]">最近</div>
            <ul className="mt-1.5 space-y-1.5" aria-hidden>
              {[0.9, 0.7, 0.8].map((w, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded" style={{ background: i === 0 ? `${color}30` : '#f0f1f4' }} />
                  <span className="h-1.5 rounded bg-[#eef0f3]" style={{ width: `${w * 100}%` }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
      <p className="relative mt-3 text-center text-[11px] text-[#8a90a6]">入力した内容がここに反映されます</p>
    </aside>
  )
}

/* ───────────── ホーム + はじめにやること ───────────── */

const CHECKLIST: { id: string; title: string; desc: string; cta: string; Icon: LucideIcon }[] = [
  { id: 'ws', title: 'ワークスペースを作成', desc: '名前・色・アイコンを設定しました。', cta: '設定を開く', Icon: Sparkles },
  { id: 'invite', title: 'チームメイトを招待', desc: '一緒に使う人を招待すると、コメントやメンションで会話できます。', cta: '招待する', Icon: UserPlus },
  { id: 'doc', title: '最初のドキュメントを書く', desc: 'テンプレートから始めると3分で形になります。/ でブロックを追加できます。', cta: 'ドキュメントを作成', Icon: FileText },
  { id: 'board', title: 'タスクボードを作る', desc: '「未着手・進行中・完了」の3列から。カードはドラッグで移動できます。', cta: 'ボードを作成', Icon: KanbanSquare },
  { id: 'channel', title: 'チャンネルで話しかける', desc: '#雑談 に自己紹介を投稿してみましょう。', cta: '投稿する', Icon: Hash },
  { id: 'notify', title: 'デスクトップ通知をオンにする', desc: 'メンションと期限の通知だけを受け取ります。', cta: '通知をオン', Icon: Bell },
]

function WorkspaceHome({
  name,
  wsName,
  color,
  icon,
  interests,
  invites,
  reduced,
  celebrate,
  onRestart,
}: {
  name: string
  wsName: string
  color: string
  icon: WsIconId
  interests: InterestId[]
  invites: string[]
  reduced: boolean
  celebrate: () => void
  onRestart: () => void
}) {
  const uid = useId()
  const validInvites = invites.filter((e) => EMAIL_RE.test(e))
  const [done, setDone] = useState<Record<string, boolean>>(() => ({ ws: true, invite: validInvites.length > 0 }))
  const [open, setOpen] = useState<string | null>(() => (validInvites.length > 0 ? 'doc' : 'invite'))
  const [scope, animateEl] = useAnimate<HTMLDivElement>()
  const count = CHECKLIST.filter((c) => done[c.id]).length
  const pct = Math.round((count / CHECKLIST.length) * 100)
  const all = count === CHECKLIST.length
  const R = 22
  const C = 2 * Math.PI * R
  const sel = INTERESTS.filter((i) => interests.includes(i.id))

  const mark = (id: string, v: boolean) => {
    const next = { ...done, [id]: v }
    setDone(next)
    if (v && CHECKLIST.every((c) => next[c.id])) {
      celebrate()
      if (scope.current && !reduced) animateEl(scope.current, { scale: [1, 1.015, 1] }, { duration: 0.4 })
    }
    if (v) setOpen(CHECKLIST.find((c) => !next[c.id])?.id ?? null)
  }

  return (
    <div className="flex h-full">
      <nav className="hidden w-[210px] shrink-0 flex-col border-r border-[#eceef2] bg-[#fafaf8] p-3 @2xl:flex" aria-label="ワークスペース">
        <div className="flex items-center gap-2">
          <WsTile icon={icon} color={color} name={wsName} size={28} radius={8} />
          <span className="truncate text-[13px] font-bold">{wsName}</span>
          <ChevronDown size={14} className="ml-auto shrink-0 text-[#9aa0b4]" aria-hidden />
        </div>
        <div className="mt-3 flex h-8 items-center gap-2 rounded-lg bg-[#f0f1f4] px-2.5 text-[12px] text-[#9aa0b4]">
          <Search size={13} aria-hidden /> 検索
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold" style={{ background: `${color}14`, color }}>
          <Home size={14} aria-hidden /> ホーム
        </div>
        <div className="mt-3 px-2 text-[10.5px] font-bold tracking-[0.08em] text-[#9aa0b4]">スペース</div>
        <ul className="mt-1 space-y-0.5 overflow-y-auto">
          {(sel.length ? sel : INTERESTS.slice(0, 3)).map((it) => (
            <li key={it.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-[#4a5068]">
              <it.Icon size={14} style={{ color }} aria-hidden />
              {it.label}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center gap-2 pt-3">
          <Avatar label={name || 'あなた'} size={26} />
          <span className="truncate text-[12px] font-semibold">{name || 'あなた'}</span>
        </div>
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:thin] @md:px-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 @2xl:hidden">
              <WsTile icon={icon} color={color} name={wsName} size={22} radius={6} />
              <span className="text-[12px] font-bold text-[#4a5068]">{wsName}</span>
            </div>
            <h2 className="mt-1 text-[20px] font-bold tracking-[-0.01em] @2xl:mt-0">ようこそ、{name.trim() || 'あなた'}さん</h2>
            <p className="mt-0.5 text-[12.5px] text-[#6b7186]">まずはここから。ひとつずつ進めていきましょう。</p>
          </div>
          <button
            type="button"
            onClick={onRestart}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#6b7186] hover:bg-[#f0f1f6] hover:text-[#161a2e] ${FOCUS}`}
          >
            <RotateCcw size={13} aria-hidden />
            <span className="hidden @md:inline">最初からやり直す</span>
            <span className="sr-only @md:hidden">最初からやり直す</span>
          </button>
        </div>

        <div className="mt-4 grid gap-4 @4xl:grid-cols-[minmax(0,1fr)_220px]">
          <motion.section
            ref={scope}
            initial={{ opacity: 0, y: reduced ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-2xl border border-[#e6e8ef] bg-white shadow-[0_10px_30px_-20px_rgba(22,26,46,0.35)]"
            aria-labelledby={`${uid}-h`}
          >
            <div className="flex items-center gap-3 border-b border-[#eef0f4] px-4 py-3.5">
              <div className="relative h-[52px] w-[52px] shrink-0">
                <svg viewBox="0 0 52 52" className="h-full w-full -rotate-90" aria-hidden>
                  <circle cx="26" cy="26" r={R} fill="none" stroke="#eceef3" strokeWidth="5" />
                  <motion.circle
                    cx="26"
                    cy="26"
                    r={R}
                    fill="none"
                    stroke={all ? '#1a9e6a' : color}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    initial={{ strokeDashoffset: C }}
                    animate={{ strokeDashoffset: C * (1 - count / CHECKLIST.length) }}
                    transition={{ duration: reduced ? 0 : 0.6, ease: EASE }}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-[11px] font-bold tabular-nums">
                  <NumberFlow value={pct} suffix="%" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 id={`${uid}-h`} className="text-[15px] font-bold">
                  はじめにやること
                </h3>
                <p className="text-[12px] text-[#6b7186]" aria-live="polite">
                  {all ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#1a9e6a]">
                      <PartyPopper size={13} aria-hidden /> すべて完了しました！ 準備は万全です
                    </span>
                  ) : (
                    <>
                      {CHECKLIST.length}件中 <span className="font-semibold tabular-nums text-[#161a2e]">{count}</span> 件が完了
                    </>
                  )}
                </p>
              </div>
            </div>
            <ul className="p-1.5">
              {CHECKLIST.map((c) => {
                const d = !!done[c.id]
                const isOpen = open === c.id
                return (
                  <li key={c.id} className={`rounded-xl transition-colors ${isOpen ? 'bg-[#f7f8fb]' : ''}`}>
                    <div className="flex items-center gap-2.5 px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => mark(c.id, !d)}
                        aria-label={d ? `${c.title}を未完了に戻す` : `${c.title}を完了にする`}
                        aria-pressed={d}
                        className={`relative grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition-colors ${FOCUS} ${
                          d ? 'border-transparent' : 'border-[#cfd3df] hover:border-[#9aa0b4]'
                        }`}
                        style={d ? { background: color } : undefined}
                      >
                        <svg viewBox="0 0 16 16" className="h-3 w-3 text-white" aria-hidden>
                          <motion.path
                            d="M3.5 8.5l3 3 6-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={false}
                            animate={{ pathLength: d ? 1 : 0 }}
                            transition={{ duration: reduced ? 0 : 0.25 }}
                          />
                        </svg>
                        {d && !reduced && (
                          <motion.span
                            className="absolute inset-0 rounded-full"
                            style={{ boxShadow: `0 0 0 2px ${color}` }}
                            initial={{ scale: 1, opacity: 0.7 }}
                            animate={{ scale: 1.9, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                          />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : c.id)}
                        aria-expanded={isOpen}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-md text-left ${FOCUS}`}
                      >
                        <span className={`min-w-0 flex-1 truncate text-[13px] font-semibold transition-colors ${d ? 'text-[#9aa0b4] line-through decoration-[#c4c8d4]' : 'text-[#161a2e]'}`}>
                          {c.title}
                        </span>
                        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-[#9aa0b4]">
                          <ChevronDown size={15} aria-hidden />
                        </motion.span>
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: reduced ? 0.12 : 0.26, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3 pl-[42px] pr-3">
                            <p className="min-w-[180px] flex-1 text-[12px] leading-relaxed text-[#5d6378]">{c.desc}</p>
                            {!d && (
                              <button
                                type="button"
                                onClick={() => mark(c.id, true)}
                                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white transition-[filter] hover:brightness-110 ${FOCUS}`}
                                style={{ background: color }}
                              >
                                <c.Icon size={13} aria-hidden />
                                {c.cta}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                )
              })}
            </ul>
          </motion.section>

          <aside className="hidden space-y-3 @4xl:block" aria-label="チーム">
            <div className="rounded-2xl border border-[#e6e8ef] bg-white p-3.5">
              <div className="text-[12px] font-bold">チーム</div>
              <ul className="mt-2 space-y-2">
                {[name || 'あなた', ...validInvites].slice(0, 5).map((m, i) => (
                  <li key={m} className="flex items-center gap-2">
                    <Avatar label={m} size={24} />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-[#2c3148]">{i === 0 ? `${m}(あなた)` : m}</span>
                    {i > 0 && <span className="rounded-full bg-[#fff4e0] px-1.5 text-[9.5px] font-bold text-[#97600b]">招待中</span>}
                  </li>
                ))}
                {validInvites.length === 0 && <li className="text-[11.5px] text-[#8a90a6]">まだ招待していません</li>}
              </ul>
            </div>
            <div className="rounded-2xl p-3.5 text-white" style={{ background: `linear-gradient(140deg, ${color}, #1b2366)` }}>
              <Lightbulb size={16} aria-hidden />
              <div className="mt-2 text-[12px] font-bold">ヒント</div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/80">どこでも ⌘K / Ctrl+K を押すと、ページやコマンドをすばやく探せます。</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

/* ───────────── 本体 ───────────── */

type FireFn = ReturnType<typeof confetti.create>

export function OnboardingFlow() {
  const reduced = !!useReducedMotion()
  const [phase, setPhase] = useState<'setup' | 'home'>('setup')
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [name, setName] = useState('森下 葵')
  const [role, setRole] = useState<RoleId | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [interests, setInterests] = useState<InterestId[]>([])
  const [invites, setInvites] = useState<string[]>([])
  const [perm, setPerm] = useState<'member' | 'admin'>('member')
  const [inviteErr, setInviteErr] = useState<string | null>(null)
  const [wsName, setWsName] = useState('')
  const [color, setColor] = useState(COLORS[0].c)
  const [icon, setIcon] = useState<WsIconId>('letter')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fireRef = useRef<FireFn | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [scope, animateEl] = useAnimate<HTMLDivElement>()

  const wsPlaceholder = `${name.trim() || 'わたし'}のチーム`
  const wsEffective = wsName.trim() || wsPlaceholder

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fire = confetti.create(canvas, { resize: true, useWorker: false })
    fireRef.current = fire
    return () => {
      fire.reset()
      fireRef.current = null
    }
  }, [])

  const celebrate = useCallback(() => {
    const fire = fireRef.current
    if (!fire || reduced) return
    const colors = [color, '#ef6a45', '#ffc34d', '#3546c8', '#ffffff']
    void fire({ particleCount: 70, angle: 60, spread: 65, startVelocity: 48, origin: { x: 0.05, y: 0.75 }, colors, scalar: 0.9 })
    void fire({ particleCount: 70, angle: 120, spread: 65, startVelocity: 48, origin: { x: 0.95, y: 0.75 }, colors, scalar: 0.9 })
    window.setTimeout(() => void fireRef.current?.({ particleCount: 50, spread: 100, startVelocity: 30, origin: { x: 0.5, y: 0.35 }, colors, scalar: 0.8 }), 250)
  }, [color, reduced])

  const goto = (n: number) => {
    setDir(n > step ? 1 : -1)
    setStep(n)
    setMaxStep((m) => Math.max(m, n))
    bodyRef.current?.scrollTo({ top: 0 })
    if (n === 5) window.setTimeout(celebrate, reduced ? 0 : 280)
  }

  const next = (e?: FormEvent) => {
    e?.preventDefault()
    if (STEPS[step].id === 'invite') {
      const bad = invites.filter((x) => !EMAIL_RE.test(x))
      if (bad.length) {
        setInviteErr('形式が正しくないアドレスを修正するか、削除してください')
        if (scope.current && !reduced) animateEl(scope.current, { x: [0, -9, 8, -5, 3, 0] }, { duration: 0.4 })
        return
      }
    }
    setInviteErr(null)
    if (step < 5) goto(step + 1)
  }
  const skip = () => {
    if (STEPS[step].id === 'invite') {
      setInvites([])
      setInviteErr(null)
    }
    goto(step + 1)
  }

  const restart = () => {
    setPhase('setup')
    setStep(0)
    setMaxStep(0)
    setDir(-1)
    setRole(null)
    setSize(null)
    setInterests([])
    setInvites([])
    setWsName('')
    setColor(COLORS[0].c)
    setIcon('letter')
  }

  const toggleInterest = (id: InterestId) => setInterests((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  const variants = useMemo(
    () => ({
      enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 44 }),
      center: { opacity: 1, x: 0 },
      exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * -36 }),
    }),
    [reduced],
  )

  const id = STEPS[step].id
  const skippable = id === 'role' || id === 'interests' || id === 'invite'
  const nextDisabled = (id === 'role' && !role) || (id === 'interests' && interests.length === 0)
  const nextLabel =
    id === 'welcome'
      ? 'はじめる'
      : id === 'workspace'
        ? 'ワークスペースを作成'
        : id === 'invite' && invites.some((x) => EMAIL_RE.test(x))
          ? `${invites.filter((x) => EMAIL_RE.test(x)).length}人を招待して次へ`
          : '次へ'

  let body: ReactNode
  switch (id) {
    case 'welcome':
      body = <WelcomeStep name={name} setName={setName} reduced={reduced} />
      break
    case 'role':
      body = <RoleStep role={role} setRole={setRole} size={size} setSize={setSize} reduced={reduced} />
      break
    case 'interests':
      body = <InterestsStep role={role} interests={interests} toggle={toggleInterest} setInterests={setInterests} reduced={reduced} />
      break
    case 'invite':
      body = (
        <InviteStep
          invites={invites}
          setInvites={(v) => {
            setInvites(v)
            setInviteErr(null)
          }}
          perm={perm}
          setPerm={setPerm}
          error={inviteErr}
          reduced={reduced}
        />
      )
      break
    case 'workspace':
      body = (
        <WorkspaceStep
          wsName={wsName}
          setWsName={setWsName}
          placeholder={wsPlaceholder}
          color={color}
          setColor={setColor}
          icon={icon}
          setIcon={setIcon}
          reduced={reduced}
        />
      )
      break
    case 'done':
      body = <DoneStep name={name} wsName={wsEffective} color={color} icon={icon} role={role} interests={interests} invites={invites} reduced={reduced} />
      break
  }

  return (
    <div className="@container relative flex h-full w-full overflow-hidden bg-[#fbfaf8] font-sans text-[#161a2e] [color-scheme:light]">
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'setup' ? (
          <motion.div
            key="setup"
            className="flex h-full w-full"
            exit={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
            transition={{ duration: 0.25 }}
          >
            <form onSubmit={next} noValidate className="flex min-w-0 flex-1 flex-col">
              <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#eceef2] px-4 @md:px-6">
                <KumikoMark size={24} />
                <span className="hidden text-[14px] font-bold @md:inline">Kumiko</span>
                <span className="mx-1 hidden h-4 w-px bg-[#e3e5ee] @2xl:block" aria-hidden />
                <Stepper step={step} maxStep={maxStep} onJump={goto} reduced={reduced} />
              </header>

              <div ref={bodyRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
                <div ref={scope} className="mx-auto w-full max-w-[560px] px-4 py-5 @md:px-6">
                  <AnimatePresence mode="wait" custom={dir} initial={false}>
                    <motion.div
                      key={id}
                      custom={dir}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: reduced ? 0.14 : 0.28, ease: EASE }}
                    >
                      {body}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <footer className="flex h-[60px] shrink-0 items-center gap-2 border-t border-[#eceef2] bg-white/70 px-4 @md:px-6">
                {step > 0 && step < 5 && (
                  <button
                    type="button"
                    onClick={() => goto(step - 1)}
                    className={`inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-semibold text-[#4a5068] hover:bg-[#f0f1f6] ${FOCUS}`}
                  >
                    <ArrowLeft size={15} aria-hidden />
                    戻る
                  </button>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  {skippable && (
                    <button
                      type="button"
                      onClick={skip}
                      className={`h-9 rounded-lg px-3 text-[13px] font-semibold text-[#6b7186] hover:bg-[#f0f1f6] hover:text-[#161a2e] ${FOCUS}`}
                    >
                      スキップ
                    </button>
                  )}
                  {id === 'done' ? (
                    <motion.button
                      type="button"
                      onClick={() => setPhase('home')}
                      initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduced ? 0 : 0.6 }}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white shadow-sm transition-[filter] hover:brightness-110 ${FOCUS}`}
                      style={{ background: color }}
                    >
                      ワークスペースを開く
                      <ArrowRight size={15} aria-hidden />
                    </motion.button>
                  ) : (
                    <button
                      type="submit"
                      disabled={nextDisabled}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#3546c8] px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(22,26,46,0.25)] transition-[background-color,opacity,transform] hover:bg-[#2b3bb0] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS}`}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={nextLabel}
                          initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: reduced ? 0 : -8 }}
                          transition={{ duration: 0.16 }}
                        >
                          {nextLabel}
                        </motion.span>
                      </AnimatePresence>
                      <ArrowRight size={15} aria-hidden />
                    </button>
                  )}
                </div>
              </footer>
            </form>

            <Preview
              step={step}
              name={name}
              role={role}
              interests={interests}
              invites={invites}
              wsName={wsEffective}
              color={color}
              icon={icon}
              reduced={reduced}
            />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            className="h-full w-full"
            initial={{ opacity: 0, scale: reduced ? 1 : 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <WorkspaceHome
              name={name}
              wsName={wsEffective}
              color={color}
              icon={icon}
              interests={interests}
              invites={invites}
              reduced={reduced}
              celebrate={celebrate}
              onRestart={restart}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-50 h-full w-full" aria-hidden />
    </div>
  )
}
