import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Blocks,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Palette,
  Plus,
  RotateCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sun,
  Tablet,
  Trash2,
  UserMinus,
  UserRound,
  Users,
  X,
  Zap,
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
  type ReactNode,
  type RefObject,
} from 'react'
import { Toaster, toast } from 'sonner'

/**
 * SaaS の設定画面。サービス「Nagi」(タスク管理)・ワークスペース・メンバー・連携先はすべて架空のオリジナル。
 * - ルートを @container にし、48rem 以上で左のセクションナビ(グループ見出し・未保存の点・検索ヒット数)、
 *   それ未満では横スクロールのタブ(下線が layoutId で滑る)に切り替える。本文は名前付きコンテナ @container/main で 2 段組を判定する
 * - 設定値は「保存済み」と「下書き」の 2 つの状態を持ち、両者をフラット化して差分のパスを数える。差分があると下部に
 *   「未保存の変更」バーがバネで滑り上がり、保存 → スピナー → チェックに変わってから消える。破棄で下書きを戻す。Ctrl/⌘+S でも保存
 * - 設定の検索は全セクションの項目インデックスを引き、候補を矢印キーで選んで Enter でセクションを切り替え、該当行までスクロールして
 *   アクセント色の枠を光らせる。入力中は画面上のラベルの一致箇所に <mark> を付け、ナビには各セクションのヒット数を出す
 * - 通知はイベント × メール/プッシュ/アプリ内のスイッチ表。列見出しで一括切り替え、セキュリティのメールはロック
 * - セキュリティは端末アイコン付きのセッション一覧(ログアウトは取り消し付きトースト)、QR → 6 桁コード → バックアップコードの
 *   2 段階認証ダイアログ、API キーの表示/コピー/再生成(確認つき)
 * - 請求はプランカード(月払い/年払いの価格を NumberFlow で回す)・使用量メーター・請求書表。チームは役割の変更・招待・削除
 * - 外観はテーマ/アクセント/密度を下書きのままミニアプリのプレビューに即反映し、保存するとデモ全体の CSS 変数が切り替わる
 * - 危険な操作はワークスペース名を打ち込むまで削除ボタンが押せない確認ダイアログ。トーストは sonner をデモ内に閉じ込めて表示
 * - キー操作(/ で検索、Esc、Ctrl+S)はデモ内にフォーカスがあるときだけ。useReducedMotion 時はスライドをやめ短いフェードにする
 */

/* ───────────── テーマ ───────────── */

type Mode = 'light' | 'dark'
type ThemePref = Mode | 'system'
type Density = 'compact' | 'standard' | 'comfortable'

const ACCENTS = [
  { id: 'ai', label: '藍', c: '#4f46e5' },
  { id: 'midori', label: '翠', c: '#0d9488' },
  { id: 'shu', label: '朱', c: '#e2571e' },
  { id: 'sumire', label: '菫', c: '#9333ea' },
  { id: 'sora', label: '空', c: '#0284c7' },
  { id: 'sakura', label: '桜', c: '#db2777' },
] as const

const PALETTE: Record<Mode, Record<string, string>> = {
  light: {
    '--bg': '#f5f6f8',
    '--panel': '#ffffff',
    '--panel2': '#f1f3f6',
    '--fg': '#15171b',
    '--sub': '#5b626e',
    '--mute': '#8a909a',
    '--line': '#e4e7ec',
    '--line2': '#d3d8e0',
    '--hover': 'rgba(15,23,42,0.045)',
    '--mark': 'rgba(250,204,21,0.45)',
    '--danger': '#dc2626',
    '--ok': '#16a34a',
    '--warn': '#d97706',
    '--shadow': '0 1px 2px rgba(15,23,42,.05), 0 1px 1px rgba(15,23,42,.03)',
  },
  dark: {
    '--bg': '#0d0f12',
    '--panel': '#15181d',
    '--panel2': '#1c2026',
    '--fg': '#eceef2',
    '--sub': '#a1a8b3',
    '--mute': '#6d7580',
    '--line': '#252a31',
    '--line2': '#323842',
    '--hover': 'rgba(255,255,255,0.05)',
    '--mark': 'rgba(250,204,21,0.32)',
    '--danger': '#f05252',
    '--ok': '#22c55e',
    '--warn': '#f59e0b',
    '--shadow': '0 1px 2px rgba(0,0,0,.4)',
  },
}
const DENS: Record<Density, number> = { compact: 0.7, standard: 1, comfortable: 1.32 }

function themeVars(mode: Mode, accent: string, density: Density): CSSProperties {
  return {
    ...PALETTE[mode],
    '--accent': accent,
    '--accent-soft': `color-mix(in srgb, ${accent} ${mode === 'dark' ? 22 : 13}%, transparent)`,
    '--accent-fg': `color-mix(in srgb, ${accent} ${mode === 'dark' ? 55 : 100}%, ${mode === 'dark' ? 'white' : 'black'} ${mode === 'dark' ? 45 : 0}%)`,
    '--d': String(DENS[density]),
    colorScheme: mode,
  } as CSSProperties
}

function useSystemDark() {
  const [dark, setDark] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

/* ───────────── データ ───────────── */

type SectionId = 'account' | 'notifications' | 'security' | 'appearance' | 'billing' | 'team' | 'integrations'
const SECTIONS: { id: SectionId; label: string; icon: typeof Bell; group: string; desc: string }[] = [
  { id: 'account', label: 'アカウント', icon: UserRound, group: '個人', desc: 'プロフィールと言語・地域、データの管理' },
  { id: 'notifications', label: '通知', icon: Bell, group: '個人', desc: 'どのできごとを、どこで受け取るか' },
  { id: 'security', label: 'セキュリティ', icon: ShieldCheck, group: '個人', desc: 'ログイン中の端末、2 段階認証、API キー' },
  { id: 'appearance', label: '外観', icon: Palette, group: '個人', desc: 'テーマ・アクセントカラー・表示密度' },
  { id: 'billing', label: '請求', icon: CreditCard, group: 'ワークスペース', desc: 'プラン、使用量、請求書' },
  { id: 'team', label: 'チーム', icon: Users, group: 'ワークスペース', desc: 'メンバーの招待と役割' },
  { id: 'integrations', label: '連携', icon: Blocks, group: 'ワークスペース', desc: '外部サービスと Webhook' },
]
const SECTION_LABEL = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label])) as Record<SectionId, string>

type Channel = 'email' | 'push' | 'app'
const CHANNELS: { id: Channel; label: string; icon: typeof Bell }[] = [
  { id: 'email', label: 'メール', icon: Mail },
  { id: 'push', label: 'プッシュ', icon: Smartphone },
  { id: 'app', label: 'アプリ内', icon: Bell },
]
const EVENTS = [
  { id: 'mention', label: 'メンション', desc: 'コメントやドキュメントで @ で呼ばれたとき' },
  { id: 'reply', label: 'コメントへの返信', desc: '自分のコメントに返信がついたとき' },
  { id: 'assign', label: 'タスクの割り当て', desc: '担当者に設定・変更されたとき' },
  { id: 'due', label: '期限のリマインド', desc: '担当タスクの期限 24 時間前' },
  { id: 'review', label: 'レビュー依頼', desc: 'デザインや仕様書の確認を頼まれたとき' },
  { id: 'weekly', label: '週次レポート', desc: '毎週月曜の朝にプロジェクトの進み具合' },
  { id: 'security', label: 'セキュリティ', desc: '新しい端末からのログインなど' },
] as const
type EventId = (typeof EVENTS)[number]['id']
const LOCKED: Partial<Record<EventId, Channel>> = { security: 'email' }

type HookEvent = 'task' | 'comment' | 'release'
type Draft = {
  name: string
  display: string
  email: string
  bio: string
  lang: string
  tz: string
  week: 'sun' | 'mon'
  notify: Record<EventId, Record<Channel, boolean>>
  digest: 'instant' | 'hourly' | 'daily'
  quiet: boolean
  quietFrom: string
  quietTo: string
  theme: ThemePref
  accent: string
  density: Density
  webhook: string
  hookEvents: Record<HookEvent, boolean>
}

const INITIAL: Draft = {
  name: '宮下 透',
  display: 'toru',
  email: 'toru@nagi.example',
  bio: 'プロダクトデザイナー。Nagi では設計システムと新機能のリサーチを担当しています。',
  lang: 'ja',
  tz: 'Asia/Tokyo',
  week: 'mon',
  notify: {
    mention: { email: true, push: true, app: true },
    reply: { email: false, push: true, app: true },
    assign: { email: true, push: true, app: true },
    due: { email: false, push: true, app: true },
    review: { email: true, push: false, app: true },
    weekly: { email: true, push: false, app: false },
    security: { email: true, push: true, app: true },
  },
  digest: 'instant',
  quiet: true,
  quietFrom: '22:00',
  quietTo: '07:30',
  theme: 'light',
  accent: ACCENTS[0].c,
  density: 'standard',
  webhook: 'https://hooks.nagi-design.example/tasks',
  hookEvents: { task: true, comment: false, release: true },
}

function flatten(o: unknown, prefix = '', out: Record<string, unknown> = {}) {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out)
  else out[prefix] = o
  return out
}
function diffPaths(a: Draft, b: Draft) {
  const fa = flatten(a)
  const fb = flatten(b)
  return Object.keys(fa).filter((k) => fa[k] !== fb[k])
}
function sectionOfPath(p: string): SectionId {
  const k = p.split('.')[0]
  if (['notify', 'digest', 'quiet', 'quietFrom', 'quietTo'].includes(k)) return 'notifications'
  if (['theme', 'accent', 'density'].includes(k)) return 'appearance'
  if (['webhook', 'hookEvents'].includes(k)) return 'integrations'
  return 'account'
}

/** 設定検索のインデックス */
const INDEX: { id: string; section: SectionId; label: string; hint: string; kw?: string }[] = [
  { id: 'acc-avatar', section: 'account', label: 'プロフィール画像', hint: 'アイコンの変更・削除', kw: 'アバター avatar' },
  { id: 'acc-name', section: 'account', label: '氏名', hint: 'メンバーに表示される名前', kw: 'name 名前' },
  { id: 'acc-display', section: 'account', label: '表示名', hint: '@ メンションで使う短い名前', kw: 'ユーザー名 handle' },
  { id: 'acc-email', section: 'account', label: 'メールアドレス', hint: 'ログインと通知の宛先', kw: 'email mail' },
  { id: 'acc-bio', section: 'account', label: '自己紹介', hint: 'プロフィールカードに表示', kw: 'bio' },
  { id: 'acc-lang', section: 'account', label: '言語', hint: '画面の表示言語', kw: 'language 日本語 english' },
  { id: 'acc-tz', section: 'account', label: 'タイムゾーン', hint: '期限と通知の時刻', kw: 'timezone 時差 時間' },
  { id: 'acc-week', section: 'account', label: '週の始まり', hint: 'カレンダーの表示', kw: '曜日 カレンダー' },
  { id: 'acc-export', section: 'account', label: 'データのエクスポート', hint: 'タスクとコメントを ZIP で', kw: 'export ダウンロード バックアップ' },
  { id: 'acc-delete', section: 'account', label: 'ワークスペースを削除', hint: '危険な操作', kw: 'delete 削除 退会' },
  ...EVENTS.map((e) => ({ id: `n-${e.id}`, section: 'notifications' as const, label: e.label, hint: e.desc, kw: '通知 メール プッシュ' })),
  { id: 'n-digest', section: 'notifications', label: 'まとめて通知する頻度', hint: '通知をまとめる間隔', kw: 'ダイジェスト digest' },
  { id: 'n-quiet', section: 'notifications', label: 'おやすみモード', hint: '指定の時間帯は通知を止める', kw: 'ミュート 夜間 quiet 通知' },
  { id: 's-password', section: 'security', label: 'パスワード', hint: '最終変更は 3 か月前', kw: 'password ログイン' },
  { id: 's-2fa', section: 'security', label: '2 段階認証', hint: '認証アプリのコードで保護', kw: '2fa 二段階 二要素 認証 otp' },
  { id: 's-sessions', section: 'security', label: 'ログイン中のセッション', hint: '端末ごとにログアウト', kw: 'session 端末 デバイス ログアウト' },
  { id: 's-api', section: 'security', label: 'API キー', hint: '表示・コピー・再生成', kw: 'api key token トークン 開発' },
  { id: 'a-theme', section: 'appearance', label: 'テーマ', hint: 'ライト / ダーク / システム', kw: 'theme ダークモード dark light' },
  { id: 'a-accent', section: 'appearance', label: 'アクセントカラー', hint: 'ボタンや選択中の色', kw: 'color 色 カラー' },
  { id: 'a-density', section: 'appearance', label: '表示密度', hint: 'リストの行の高さ', kw: 'density コンパクト 余白' },
  { id: 'b-plan', section: 'billing', label: '現在のプラン', hint: 'Team プラン・月払い', kw: 'plan 料金 アップグレード 年払い' },
  { id: 'b-usage', section: 'billing', label: '使用量', hint: 'メンバー・ストレージ・API', kw: 'usage 容量 ストレージ' },
  { id: 'b-payment', section: 'billing', label: '支払い方法', hint: 'カード •••• 4821', kw: 'カード クレジット payment' },
  { id: 'b-invoices', section: 'billing', label: '請求書', hint: '過去の請求書をダウンロード', kw: 'invoice 領収書 pdf' },
  { id: 't-invite', section: 'team', label: 'メンバーを招待', hint: 'メールアドレスで招待', kw: 'invite 追加 招待' },
  { id: 't-members', section: 'team', label: 'メンバーと役割', hint: '役割の変更・削除', kw: '権限 role 管理者 ゲスト' },
  { id: 'i-list', section: 'integrations', label: '連携サービス', hint: 'チャット・カレンダーなど', kw: 'integration 接続 アプリ' },
  { id: 'i-webhook', section: 'integrations', label: 'Webhook', hint: 'イベントを任意の URL に送信', kw: 'webhook url 開発' },
]

type Session = { id: string; device: 'laptop' | 'phone' | 'desktop' | 'tablet'; name: string; place: string; ip: string; last: string; current?: boolean }
const SESSIONS: Session[] = [
  { id: 's1', device: 'laptop', name: 'ノート PC · ブラウザ', place: '東京都 渋谷区', ip: '203.0.113.24', last: '現在のセッション', current: true },
  { id: 's2', device: 'phone', name: 'Nagi モバイルアプリ', place: '東京都 目黒区', ip: '198.51.100.7', last: '12 分前' },
  { id: 's3', device: 'desktop', name: 'Nagi デスクトップアプリ', place: '神奈川県 鎌倉市', ip: '192.0.2.181', last: '昨日 21:40' },
  { id: 's4', device: 'tablet', name: 'タブレット · ブラウザ', place: '大阪府 大阪市', ip: '198.51.100.92', last: '11月2日' },
]
const DEVICE_ICON = { laptop: Laptop, phone: Smartphone, desktop: Monitor, tablet: Tablet }

type ApiKey = { id: string; name: string; key: string; created: string; used: string; env: 'live' | 'test' }
const KEY_CHARS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const makeKey = (env: 'live' | 'test') => `nagi_${env}_${Array.from({ length: 28 }, () => KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)]).join('')}`
const KEYS: ApiKey[] = [
  { id: 'k1', name: '本番サーバー', key: 'nagi_live_7hQe2mXa9KpT4vRwz8LdN3sYb6Fc', created: '2026年4月3日', used: '3 分前', env: 'live' },
  { id: 'k2', name: 'ステージング', key: 'nagi_test_Pk4nT8wQs2Hm9YxBe6RvJa3Lc7Dz', created: '2026年8月19日', used: '2 日前', env: 'test' },
]

type Role = 'owner' | 'admin' | 'member' | 'guest'
const ROLE_LABEL: Record<Role, string> = { owner: 'オーナー', admin: '管理者', member: 'メンバー', guest: 'ゲスト' }
type Member = { id: string; name: string; email: string; role: Role; hue: number; last: string; you?: boolean; pending?: boolean }
const MEMBERS: Member[] = [
  { id: 'u1', name: '宮下 透', email: 'toru@nagi.example', role: 'owner', hue: 228, last: 'オンライン', you: true },
  { id: 'u2', name: '相原 みのり', email: 'minori@nagi.example', role: 'admin', hue: 340, last: '5 分前' },
  { id: 'u3', name: '久遠 蒼', email: 'ao.kuon@nagi.example', role: 'member', hue: 188, last: '1 時間前' },
  { id: 'u4', name: '早瀬 ことね', email: 'kotone@nagi.example', role: 'member', hue: 28, last: '昨日' },
  { id: 'u5', name: '森本 陽向', email: 'hinata@nagi.example', role: 'member', hue: 140, last: '3 日前' },
  { id: 'u6', name: 'Lena Hartmann', email: 'lena@studio-kite.example', role: 'guest', hue: 272, last: '1 週間前' },
]
const SEATS = 10

type Service = { id: string; name: string; cat: string; desc: string; color: string; glyph: string; on: boolean }
const SERVICES: Service[] = [
  { id: 'hibiki', name: 'Hibiki', cat: 'チャット', desc: 'タスクの更新をチャンネルに投稿し、スレッドから返信できます。', color: '#7c3aed', glyph: 'H', on: true },
  { id: 'koyomi', name: 'Koyomi', cat: 'カレンダー', desc: '期限とマイルストーンを予定として双方向に同期します。', color: '#ea580c', glyph: 'K', on: true },
  { id: 'kura', name: 'Kura Drive', cat: 'ストレージ', desc: 'ファイルを添付してプレビュー。更新すると自動で差し替え。', color: '#0891b2', glyph: 'D', on: false },
  { id: 'tsumiki', name: 'Tsumiki CI', cat: '開発', desc: 'ビルドとデプロイの結果をタスクのステータスに反映します。', color: '#16a34a', glyph: 'T', on: false },
  { id: 'irodori', name: 'Irodori', cat: 'デザイン', desc: 'デザインファイルを埋め込み、コメントを同期します。', color: '#db2777', glyph: 'I', on: false },
  { id: 'fumibako', name: 'Fumibako', cat: 'メール', desc: '転送したメールからタスクを作成し、添付も取り込みます。', color: '#ca8a04', glyph: 'F', on: false },
]

const INVOICES = [
  { no: 'INV-2026-011', date: '2026年11月1日', amount: 10800, status: 'paid' as const },
  { no: 'INV-2026-010', date: '2026年10月1日', amount: 10800, status: 'paid' as const },
  { no: 'INV-2026-009', date: '2026年9月1日', amount: 9000, status: 'paid' as const },
  { no: 'INV-2026-008', date: '2026年8月1日', amount: 9000, status: 'refunded' as const },
  { no: 'INV-2026-007', date: '2026年7月1日', amount: 7200, status: 'paid' as const },
]

/* ───────────── コンテキスト ───────────── */

type Ctx = {
  query: string
  flash: { id: string; n: number } | null
  changed: Set<string>
  reduce: boolean
}
const SettingsCtx = createContext<Ctx>({ query: '', flash: null, changed: new Set(), reduce: false })
const TID = 'settings-page'
const tOpt = { toasterId: TID }

const ease: Transition = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }

/* ───────────── 小さな部品 ───────────── */

function Hl({ text }: { text: string }) {
  const { query } = useContext(SettingsCtx)
  const q = query.trim().toLowerCase()
  if (!q) return <>{text}</>
  const lower = text.toLowerCase()
  const parts: ReactNode[] = []
  let i = 0
  let at = lower.indexOf(q)
  if (at < 0) return <>{text}</>
  while (at >= 0) {
    if (at > i) parts.push(text.slice(i, at))
    parts.push(
      <mark key={at} className="rounded-[3px] bg-[var(--mark)] px-[1px] text-inherit">
        {text.slice(at, at + q.length)}
      </mark>,
    )
    i = at + q.length
    at = lower.indexOf(q, i)
  }
  if (i < text.length) parts.push(text.slice(i))
  return <>{parts}</>
}

function Flash({ id, card }: { id: string; card?: boolean }) {
  const { flash, reduce } = useContext(SettingsCtx)
  if (!flash || flash.id !== id) return null
  return (
    <motion.span
      key={flash.n}
      aria-hidden
      className={`pointer-events-none absolute z-10 ring-2 ring-[var(--accent)] ${card ? '-inset-[3px] rounded-[19px] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]' : '-inset-x-3 inset-y-1 rounded-xl bg-[var(--accent-soft)]'}`}
      initial={{ opacity: 0, scale: reduce ? 1 : 0.985 }}
      animate={{ opacity: [0, 1, 1, 0], scale: 1 }}
      transition={{ duration: 2, times: [0, 0.08, 0.6, 1] }}
    />
  )
}

/** ラベル + コントロールの 1 行。広いと左右、狭いと縦積み */
function Row({
  id,
  label,
  desc,
  field,
  children,
  wide,
}: {
  id: string
  label: string
  desc?: string
  field?: string
  children: ReactNode
  wide?: boolean
}) {
  const { changed } = useContext(SettingsCtx)
  const dirty = field ? [...changed].some((p) => p === field || p.startsWith(field + '.')) : false
  const lid = useId()
  return (
    <div
      data-setting={id}
      role="group"
      aria-labelledby={lid}
      className={`relative grid gap-x-8 gap-y-2.5 border-b border-[var(--line)] py-[calc(15px*var(--d))] last:border-b-0 ${wide ? '' : '@2xl/main:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'}`}
    >
      <Flash id={id} />
      <div className="relative min-w-0">
        <div id={lid} className="flex items-center gap-2 text-[13px] font-semibold text-[var(--fg)]">
          <Hl text={label} />
          <AnimatePresence>
            {dirty && (
              <motion.span
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                className="rounded-full bg-[var(--accent-soft)] px-1.5 py-px text-[10px] font-semibold text-[var(--accent-fg)]"
              >
                変更あり
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {desc && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--sub)]">
            <Hl text={desc} />
          </p>
        )}
      </div>
      <div className="relative min-w-0">{children}</div>
    </div>
  )
}

function Card({
  title,
  desc,
  children,
  action,
  danger,
  id,
  pad = true,
}: {
  title: string
  desc?: string
  children: ReactNode
  action?: ReactNode
  danger?: boolean
  id?: string
  pad?: boolean
}) {
  return (
    <section
      data-setting={id}
      className={`relative rounded-2xl border bg-[var(--panel)] shadow-[var(--shadow)] ${danger ? 'border-[color-mix(in_srgb,var(--danger)_40%,var(--line))]' : 'border-[var(--line)]'}`}
    >
      {id && <Flash id={id} card />}
      <header className="relative flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h3 className={`text-[14px] font-bold ${danger ? 'text-[var(--danger)]' : 'text-[var(--fg)]'}`}>
            <Hl text={title} />
          </h3>
          {desc && <p className="mt-0.5 text-[12px] text-[var(--sub)]">{desc}</p>}
        </div>
        {action}
      </header>
      <div className={pad ? 'px-5' : ''}>{children}</div>
    </section>
  )
}

const inputCls =
  'h-9 w-full rounded-lg border border-[var(--line2)] bg-[var(--panel)] px-3 text-[13px] text-[var(--fg)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--mute)] hover:border-[color-mix(in_srgb,var(--fg)_25%,var(--line2))] focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-soft)]'
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
const btn = `inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold transition-[background-color,color,border-color,opacity,transform] active:scale-[.97] disabled:pointer-events-none disabled:opacity-45 ${focusRing}`
const btnGhost = `${btn} border border-[var(--line2)] bg-[var(--panel)] text-[var(--fg)] hover:bg-[var(--hover)]`
const btnPrimary = `${btn} bg-[var(--accent)] text-white shadow-sm hover:brightness-110`
const btnDanger = `${btn} bg-[var(--danger)] text-white hover:brightness-110`
const iconBtn = `grid size-8 shrink-0 place-items-center rounded-lg text-[var(--sub)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)] disabled:opacity-40 ${focusRing}`

function Switch({ checked, onChange, label, disabled, size = 'md' }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; size?: 'sm' | 'md' }) {
  const w = size === 'sm' ? 'h-[18px] w-8' : 'h-5 w-9'
  const k = size === 'sm' ? 'size-3.5' : 'size-4'
  const tx = size === 'sm' ? 'translate-x-[14px]' : 'translate-x-4'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${w} shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 ${focusRing} ${
        checked ? 'bg-[var(--accent)]' : 'bg-[color-mix(in_srgb,var(--fg)_18%,transparent)]'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span className={`${k} rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.25)] transition-transform duration-200 ease-[cubic-bezier(.3,1.4,.5,1)] ${checked ? tx : 'translate-x-0'}`} />
    </button>
  )
}

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; l: string; icon?: typeof Sun }[]; label: string }) {
  const { reduce } = useContext(SettingsCtx)
  const gid = useId()
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full rounded-lg bg-[var(--panel2)] p-[3px] ring-1 ring-[var(--line)]">
      {options.map((o) => {
        const on = o.v === value
        const Icon = o.icon
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.v)}
            className={`relative flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition-colors ${focusRing} ${on ? 'text-[var(--fg)]' : 'text-[var(--sub)] hover:text-[var(--fg)]'}`}
          >
            {on && (
              <motion.span
                layoutId={`seg-${gid}`}
                transition={reduce ? { duration: 0 } : ease}
                className="absolute inset-0 rounded-md bg-[var(--panel)] shadow-[0_1px_3px_rgba(0,0,0,.12)] ring-1 ring-[var(--line)]"
              />
            )}
            {Icon && <Icon size={13} className="relative" />}
            <span className="relative whitespace-nowrap">{o.l}</span>
          </button>
        )
      })}
    </div>
  )
}

function Select({ value, onChange, children, label, className = '' }: { value: string; onChange: (v: string) => void; children: ReactNode; label: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} cursor-pointer appearance-none pr-8`}>
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
    </div>
  )
}

function Avatar({ name, hue, size = 32, ring }: { name: string; hue: number; size?: number; ring?: boolean }) {
  const ch = name.trim().charAt(0)
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={`shrink-0 rounded-full ${ring ? 'ring-2 ring-[var(--panel)]' : ''}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 70% 68%)`} />
          <stop offset="1" stopColor={`hsl(${hue + 28} 62% 46%)`} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill={`url(#${id})`} />
      <circle cx="31" cy="9" r="9" fill="white" opacity=".14" />
      <text x="20" y="20" dy=".36em" textAnchor="middle" fontSize="17" fontWeight="700" fill="white" fontFamily="inherit">
        {ch}
      </text>
    </svg>
  )
}

function NagiLogo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M7 13c3-2.6 6-2.6 9 0s6 2.6 9 0" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M7 19.5c3-2.6 6-2.6 9 0s6 2.6 9 0" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".6" />
    </svg>
  )
}

/** 簡易モーダル(デモ内に閉じ込める)。Esc で閉じ、Tab をパネル内で循環させ、閉じたら元のボタンへフォーカスを戻す */
function Modal({ open, onClose, title, children, width = 440 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number }) {
  const { reduce } = useContext(SettingsCtx)
  const panel = useRef<HTMLDivElement>(null)
  const prev = useRef<HTMLElement | null>(null)
  const tid = useId()
  useEffect(() => {
    if (!open) return
    prev.current = document.activeElement as HTMLElement
    const t = setTimeout(() => {
      const el = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current
      el?.focus({ preventScroll: true })
    }, 30)
    return () => {
      clearTimeout(t)
      prev.current?.focus?.({ preventScroll: true })
    }
  }, [open])
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
    if (e.key === 'Tab' && panel.current) {
      const f = [...panel.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]')]
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(10,12,16,.48)] p-4 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tid}
            tabIndex={-1}
            onKeyDown={onKey}
            style={{ maxWidth: width }}
            className="relative w-full rounded-2xl border border-[var(--line)] bg-[var(--panel)] text-[var(--fg)] shadow-[0_24px_60px_-12px_rgba(0,0,0,.45)] outline-none"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={reduce ? { duration: 0.12 } : ease}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-4">
              <h2 id={tid} className="text-[15px] font-bold">
                {title}
              </h2>
              <button type="button" aria-label="閉じる" onClick={onClose} className={iconBtn}>
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function copyText(s: string) {
  try {
    navigator.clipboard?.writeText(s).catch(() => {})
  } catch {
    /* クリップボード非対応環境では何もしない */
  }
}

/* ───────────── セクション: アカウント ───────────── */

type Up = (p: Partial<Draft>) => void

function AccountSection({ d, saved, up, onDelete }: { d: Draft; saved: Draft; up: Up; onDelete: () => void }) {
  const [exporting, setExporting] = useState(false)
  const bioMax = 160
  return (
    <div className="space-y-5">
      <Card title="プロフィール" desc="ワークスペースのメンバーに表示される情報です。">
        <Row id="acc-avatar" label="プロフィール画像" desc="正方形の画像がおすすめです。">
          <div className="flex items-center gap-3">
            <Avatar name={d.name || '？'} hue={228} size={48} />
            <button type="button" className={btnGhost} onClick={() => toast('画像のアップロードはデモでは省略しています', tOpt)}>
              画像を変更
            </button>
            <button type="button" className={`${btn} text-[var(--sub)] hover:bg-[var(--hover)]`} onClick={() => toast('既定のアイコンに戻しました', tOpt)}>
              削除
            </button>
          </div>
        </Row>
        <Row id="acc-name" label="氏名" field="name">
          <input className={inputCls} value={d.name} onChange={(e) => up({ name: e.target.value })} aria-label="氏名" />
        </Row>
        <Row id="acc-display" label="表示名" desc="@ メンションで使う短い名前" field="display">
          <div className="flex items-center rounded-lg">
            <span className="grid h-9 place-items-center rounded-l-lg border border-r-0 border-[var(--line2)] bg-[var(--panel2)] px-2.5 text-[13px] text-[var(--mute)]">@</span>
            <input
              className={`${inputCls} rounded-l-none`}
              value={d.display}
              onChange={(e) => up({ display: e.target.value.replace(/[^a-z0-9_.-]/gi, '').toLowerCase() })}
              aria-label="表示名"
              maxLength={24}
            />
          </div>
        </Row>
        <Row id="acc-email" label="メールアドレス" desc="ログインと通知の宛先" field="email">
          <div className="relative">
            <input className={`${inputCls} pr-20`} type="email" value={d.email} onChange={(e) => up({ email: e.target.value })} aria-label="メールアドレス" />
            <span
              className={`absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                d.email === saved.email ? 'bg-[color-mix(in_srgb,var(--ok)_14%,transparent)] text-[var(--ok)]' : 'bg-[color-mix(in_srgb,var(--warn)_16%,transparent)] text-[var(--warn)]'
              }`}
            >
              {d.email === saved.email ? <Check size={11} strokeWidth={3} /> : <Mail size={11} />}
              {d.email === saved.email ? '確認済み' : '未確認'}
            </span>
          </div>
          <AnimatePresence initial={false}>
            {d.email !== saved.email && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden text-[11.5px] text-[var(--warn)]">
                <span className="block pt-1.5">保存すると新しいアドレスに確認メールを送ります。</span>
              </motion.p>
            )}
          </AnimatePresence>
        </Row>
        <Row id="acc-bio" label="自己紹介" desc="プロフィールカードに表示されます。" field="bio">
          <textarea
            className={`${inputCls} h-auto min-h-[76px] resize-none py-2 leading-relaxed`}
            value={d.bio}
            maxLength={bioMax}
            onChange={(e) => up({ bio: e.target.value })}
            aria-label="自己紹介"
          />
          <div className={`mt-1 text-right text-[11px] tabular-nums ${d.bio.length > bioMax - 15 ? 'text-[var(--warn)]' : 'text-[var(--mute)]'}`}>
            {d.bio.length} / {bioMax}
          </div>
        </Row>
      </Card>

      <Card title="言語と地域">
        <Row id="acc-lang" label="言語" field="lang">
          <Select label="言語" value={d.lang} onChange={(v) => up({ lang: v })}>
            <option value="ja">日本語</option>
            <option value="en">English</option>
            <option value="ko">한국어</option>
            <option value="zh">简体中文</option>
          </Select>
        </Row>
        <Row id="acc-tz" label="タイムゾーン" desc="期限と通知の時刻に使われます。" field="tz">
          <Select label="タイムゾーン" value={d.tz} onChange={(v) => up({ tz: v })}>
            <option value="Asia/Tokyo">(UTC+09:00) 東京・札幌</option>
            <option value="Asia/Seoul">(UTC+09:00) ソウル</option>
            <option value="Asia/Singapore">(UTC+08:00) シンガポール</option>
            <option value="Europe/Berlin">(UTC+01:00) ベルリン</option>
            <option value="Europe/London">(UTC+00:00) ロンドン</option>
            <option value="America/Los_Angeles">(UTC−08:00) ロサンゼルス</option>
          </Select>
        </Row>
        <Row id="acc-week" label="週の始まり" field="week">
          <Segmented
            label="週の始まり"
            value={d.week}
            onChange={(v) => up({ week: v })}
            options={[
              { v: 'sun', l: '日曜日' },
              { v: 'mon', l: '月曜日' },
            ]}
          />
        </Row>
      </Card>

      <Card title="データ">
        <Row id="acc-export" label="データのエクスポート" desc="タスク・コメント・添付の一覧を ZIP で受け取れます。">
          <button
            type="button"
            className={btnGhost}
            disabled={exporting}
            onClick={() => {
              setExporting(true)
              toast.promise(new Promise((r) => setTimeout(r, 1800)), {
                ...tOpt,
                loading: 'エクスポートを準備しています…',
                success: () => {
                  setExporting(false)
                  return 'nagi-design-export.zip の準備ができました'
                },
                error: '失敗しました',
              })
            }}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? '準備中…' : 'エクスポート'}
          </button>
        </Row>
      </Card>

      <Card title="危険な操作" danger>
        <Row id="acc-delete" label="ワークスペースを削除" desc="すべてのプロジェクト・タスク・ファイルが完全に削除され、元に戻せません。">
          <button type="button" className={`${btn} border border-[color-mix(in_srgb,var(--danger)_45%,transparent)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]`} onClick={onDelete}>
            <Trash2 size={14} />
            ワークスペースを削除…
          </button>
        </Row>
      </Card>
    </div>
  )
}

/* ───────────── セクション: 通知 ───────────── */

function NotificationsSection({ d, up }: { d: Draft; up: Up }) {
  const setCell = (ev: EventId, ch: Channel, v: boolean) => up({ notify: { ...d.notify, [ev]: { ...d.notify[ev], [ch]: v } } })
  const colAll = (ch: Channel) => EVENTS.every((e) => d.notify[e.id][ch])
  const toggleCol = (ch: Channel) => {
    const v = !colAll(ch)
    const n = { ...d.notify }
    for (const e of EVENTS) if (LOCKED[e.id] !== ch) n[e.id] = { ...n[e.id], [ch]: v }
    up({ notify: n })
  }
  return (
    <div className="space-y-5">
      <Card
        title="通知の受け取り方法"
        desc="イベントごとに、届ける場所を選べます。"
        action={
          <button type="button" className={btnGhost} onClick={() => toast('テスト通知', { ...tOpt, description: '相原 みのり さんがあなたをメンションしました', icon: <Bell size={16} /> })}>
            <Send size={13} />
            テスト送信
          </button>
        }
        pad={false}
      >
        <div role="table" aria-label="通知の受け取り方法" className="px-5">
          <div role="row" className="grid grid-cols-[minmax(0,1fr)_repeat(3,48px)] items-end gap-1 border-b border-[var(--line)] py-2.5 @md/main:grid-cols-[minmax(0,1fr)_repeat(3,76px)]">
            <span role="columnheader" className="text-[11px] font-semibold text-[var(--mute)]">
              イベント
            </span>
            {CHANNELS.map((c) => (
              <span role="columnheader" key={c.id} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => toggleCol(c.id)}
                  aria-label={`${c.label}をすべて${colAll(c.id) ? 'オフ' : 'オン'}にする`}
                  title="クリックで列をまとめて切り替え"
                  className={`flex flex-col items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-semibold text-[var(--sub)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)] ${focusRing}`}
                >
                  <c.icon size={14} />
                  <span className="hidden @md/main:inline">{c.label}</span>
                </button>
              </span>
            ))}
          </div>
          {EVENTS.map((e) => (
            <div key={e.id} role="row" data-setting={`n-${e.id}`} className="relative grid grid-cols-[minmax(0,1fr)_repeat(3,48px)] items-center gap-1 border-b border-[var(--line)] py-[calc(11px*var(--d))] last:border-b-0 @md/main:grid-cols-[minmax(0,1fr)_repeat(3,76px)]">
              <Flash id={`n-${e.id}`} />
              <div role="rowheader" className="relative min-w-0">
                <div className="text-[13px] font-semibold">
                  <Hl text={e.label} />
                </div>
                <div className="truncate text-[11.5px] text-[var(--sub)]">
                  <Hl text={e.desc} />
                </div>
              </div>
              {CHANNELS.map((c) => {
                const locked = LOCKED[e.id] === c.id
                return (
                  <div role="cell" key={c.id} className="relative flex justify-center">
                    <Switch size="sm" checked={d.notify[e.id][c.id]} disabled={locked} onChange={(v) => setCell(e.id, c.id, v)} label={`${e.label}: ${c.label}`} />
                    {locked && <Lock size={9} className="absolute -right-0 -top-1 text-[var(--mute)] @md/main:right-3" aria-label="必須" />}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </Card>

      <Card title="配信のタイミング">
        <Row id="n-digest" label="まとめて通知する頻度" desc="プッシュとメールをまとめて届けます。" field="digest">
          <Segmented
            label="まとめて通知する頻度"
            value={d.digest}
            onChange={(v) => up({ digest: v })}
            options={[
              { v: 'instant', l: 'すぐに' },
              { v: 'hourly', l: '1 時間ごと' },
              { v: 'daily', l: '1 日 1 回' },
            ]}
          />
        </Row>
        <Row id="n-quiet" label="おやすみモード" desc="指定した時間帯はプッシュ通知を止めます。" field="quiet">
          <div className="flex items-center gap-3">
            <Switch checked={d.quiet} onChange={(v) => up({ quiet: v })} label="おやすみモード" />
            <span className="text-[12.5px] text-[var(--sub)]">{d.quiet ? 'オン' : 'オフ'}</span>
          </div>
          <AnimatePresence initial={false}>
            {d.quiet && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 pt-3 text-[12.5px] text-[var(--sub)]">
                  <Moon size={14} />
                  <input type="time" aria-label="開始時刻" value={d.quietFrom} onChange={(e) => up({ quietFrom: e.target.value })} className={`${inputCls} w-[118px]`} />
                  <span>〜</span>
                  <input type="time" aria-label="終了時刻" value={d.quietTo} onChange={(e) => up({ quietTo: e.target.value })} className={`${inputCls} w-[118px]`} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Row>
      </Card>
    </div>
  )
}

/* ───────────── セクション: セキュリティ ───────────── */

function maskKey(k: string) {
  const i = k.indexOf('_', 5) + 1
  return `${k.slice(0, i)}${'•'.repeat(14)}${k.slice(-4)}`
}

function SecuritySection({
  sessions,
  setSessions,
  keys,
  setKeys,
  twofa,
  setTwofa,
  openTwofa,
}: {
  sessions: Session[]
  setSessions: (f: (s: Session[]) => Session[]) => void
  keys: ApiKey[]
  setKeys: (f: (k: ApiKey[]) => ApiKey[]) => void
  twofa: boolean
  setTwofa: (v: boolean) => void
  openTwofa: () => void
}) {
  const { reduce } = useContext(SettingsCtx)
  const [shown, setShown] = useState<Set<string>>(() => new Set())
  const [copied, setCopied] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [spinning, setSpinning] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 1400)
    return () => clearTimeout(t)
  }, [copied])

  const revoke = (s: Session) => {
    setSessions((ss) => ss.filter((x) => x.id !== s.id))
    toast(`${s.name} からログアウトしました`, {
      ...tOpt,
      description: `${s.place} · ${s.ip}`,
      action: { label: '元に戻す', onClick: () => setSessions((ss) => [...ss, s].sort((a, b) => a.id.localeCompare(b.id))) },
    })
  }
  const regen = (k: ApiKey) => {
    setConfirming(null)
    setSpinning(k.id)
    setTimeout(() => {
      setKeys((ks) => ks.map((x) => (x.id === k.id ? { ...x, key: makeKey(x.env), created: '2026年11月8日', used: '未使用' } : x)))
      setShown((s) => new Set(s).add(k.id))
      setSpinning(null)
      setFresh(k.id)
      setTimeout(() => setFresh(null), 1600)
      toast.success(`「${k.name}」のキーを再生成しました`, { ...tOpt, description: '古いキーはただちに無効になりました。' })
    }, 900)
  }
  const create = () => {
    const id = `k${Date.now()}`
    const k: ApiKey = { id, name: `新しいキー ${keys.length + 1}`, key: makeKey('test'), created: '2026年11月8日', used: '未使用', env: 'test' }
    setKeys((ks) => [...ks, k])
    setShown((s) => new Set(s).add(id))
    setFresh(id)
    setTimeout(() => setFresh(null), 1600)
    toast.success('API キーを作成しました', { ...tOpt, description: 'キーは安全な場所に保管してください。' })
  }

  return (
    <div className="space-y-5">
      <Card title="ログイン">
        <Row id="s-password" label="パスワード" desc="最終変更は 3 か月前です。">
          <button type="button" className={btnGhost} onClick={() => toast.success('パスワード再設定のメールを送信しました', { ...tOpt, description: 'toru@nagi.example' })}>
            <KeyRound size={14} />
            パスワードを変更
          </button>
        </Row>
        <Row id="s-2fa" label="2 段階認証" desc="ログイン時に、認証アプリの 6 桁コードも求めます。">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                twofa ? 'bg-[color-mix(in_srgb,var(--ok)_14%,transparent)] text-[var(--ok)]' : 'bg-[var(--panel2)] text-[var(--sub)] ring-1 ring-[var(--line)]'
              }`}
            >
              <span className={`size-1.5 rounded-full ${twofa ? 'bg-[var(--ok)]' : 'bg-[var(--mute)]'}`} />
              {twofa ? '有効 · 認証アプリ' : '無効'}
            </span>
            {twofa ? (
              <button
                type="button"
                className={`${btn} text-[var(--sub)] hover:bg-[var(--hover)]`}
                onClick={() => {
                  setTwofa(false)
                  toast('2 段階認証を無効にしました', { ...tOpt, action: { label: '元に戻す', onClick: () => setTwofa(true) } })
                }}
              >
                無効にする
              </button>
            ) : (
              <button type="button" className={btnPrimary} onClick={openTwofa}>
                <ShieldCheck size={14} />
                有効にする
              </button>
            )}
          </div>
        </Row>
      </Card>

      <Card
        id="s-sessions"
        title="ログイン中のセッション"
        desc="心当たりのない端末があれば、すぐにログアウトしてください。"
        pad={false}
        action={
          sessions.length > 1 ? (
            <button
              type="button"
              className={`${btn} text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]`}
              onClick={() => {
                const others = sessions.filter((s) => !s.current)
                setSessions((ss) => ss.filter((s) => s.current))
                toast(`${others.length} 台の端末からログアウトしました`, { ...tOpt, action: { label: '元に戻す', onClick: () => setSessions(() => [...SESSIONS].filter((s) => s.current || others.some((o) => o.id === s.id))) } })
              }}
            >
              <LogOut size={13} />
              他のすべてからログアウト
            </button>
          ) : null
        }
      >
        <ul>
          <AnimatePresence initial={false}>
            {sessions.map((s) => {
              const Icon = DEVICE_ICON[s.device]
              return (
                <motion.li
                  key={s.id}
                  layout={!reduce}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, x: 24 }}
                  transition={{ duration: reduce ? 0.12 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                  className="overflow-hidden border-b border-[var(--line)] last:border-b-0"
                >
                  <div className="flex items-center gap-3 px-5 py-[calc(12px*var(--d))]">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${s.current ? 'bg-[var(--accent-soft)] text-[var(--accent-fg)]' : 'bg-[var(--panel2)] text-[var(--sub)]'}`}>
                      <Icon size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-[13px] font-semibold">
                        <span className="truncate">{s.name}</span>
                        {s.current && <span className="rounded-full bg-[color-mix(in_srgb,var(--ok)_14%,transparent)] px-1.5 py-px text-[10px] font-bold text-[var(--ok)]">この端末</span>}
                      </div>
                      <div className="truncate text-[11.5px] text-[var(--sub)]">
                        {s.place} · <span className="font-mono text-[11px]">{s.ip}</span>
                        <span className="hidden @md/main:inline"> · {s.current ? 'アクティブ' : s.last}</span>
                      </div>
                    </div>
                    {!s.current && (
                      <button type="button" className={btnGhost} onClick={() => revoke(s)} aria-label={`${s.name} からログアウト`}>
                        <LogOut size={13} />
                        <span className="hidden @md/main:inline">ログアウト</span>
                      </button>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      </Card>

      <Card
        id="s-api"
        title="API キー"
        desc="キーはパスワードと同じように扱い、公開リポジトリに含めないでください。"
        pad={false}
        action={
          <button type="button" className={btnGhost} onClick={create}>
            <Plus size={14} />
            キーを作成
          </button>
        }
      >
        <ul>
          <AnimatePresence initial={false}>
            {keys.map((k) => {
              const open = shown.has(k.id)
              return (
                <motion.li
                  key={k.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b border-[var(--line)] last:border-b-0"
                >
                  <div className="px-5 py-[calc(13px*var(--d))]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[13px] font-semibold">
                          {k.name}
                          <span
                            className={`rounded px-1.5 py-px font-mono text-[10px] font-bold uppercase ${
                              k.env === 'live' ? 'bg-[color-mix(in_srgb,var(--ok)_14%,transparent)] text-[var(--ok)]' : 'bg-[color-mix(in_srgb,var(--warn)_16%,transparent)] text-[var(--warn)]'
                            }`}
                          >
                            {k.env}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-[var(--sub)]">
                          作成 {k.created} · 最終使用 {k.used}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          className={iconBtn}
                          aria-label={open ? 'キーを隠す' : 'キーを表示'}
                          aria-pressed={open}
                          onClick={() =>
                            setShown((s) => {
                              const n = new Set(s)
                              if (n.has(k.id)) n.delete(k.id)
                              else n.add(k.id)
                              return n
                            })
                          }
                        >
                          {open ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          aria-label="キーをコピー"
                          onClick={() => {
                            copyText(k.key)
                            setCopied(k.id)
                            toast.success('クリップボードにコピーしました', tOpt)
                          }}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {copied === k.id ? (
                              <motion.span key="ok" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} className="text-[var(--ok)]">
                                <Check size={15} strokeWidth={2.6} />
                              </motion.span>
                            ) : (
                              <motion.span key="cp" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
                                <Copy size={15} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                        <button type="button" className={iconBtn} aria-label="キーを再生成" aria-expanded={confirming === k.id} onClick={() => setConfirming((c) => (c === k.id ? null : k.id))} disabled={spinning === k.id}>
                          <RotateCw size={15} className={spinning === k.id ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>
                    <div
                      className={`mt-2 flex items-center rounded-lg border px-3 py-2 font-mono text-[12px] transition-colors duration-700 ${
                        fresh === k.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)] bg-[var(--panel2)]'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate tracking-wide">{open ? k.key : maskKey(k.key)}</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {confirming === k.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--warn)_9%,transparent)] px-3 py-2.5 text-[12px]">
                            <AlertTriangle size={14} className="shrink-0 text-[var(--warn)]" />
                            <span className="min-w-0 flex-1">再生成すると、今のキーはすぐに使えなくなります。</span>
                            <button type="button" className={`${btn} h-7 text-[var(--sub)] hover:bg-[var(--hover)]`} onClick={() => setConfirming(null)}>
                              キャンセル
                            </button>
                            <button type="button" className={`${btnPrimary} h-7`} onClick={() => regen(k)} autoFocus>
                              再生成する
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      </Card>
    </div>
  )
}

/** 疑似 QR コード(見た目だけ) */
function FakeQR() {
  const n = 25
  const cells = useMemo(() => {
    let s = 2463534242
    const rnd = () => {
      s ^= s << 13
      s ^= s >>> 17
      s ^= s << 5
      return ((s >>> 0) % 1000) / 1000
    }
    const out: [number, number][] = []
    const finder = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && rnd() > 0.52) out.push([x, y])
    return out
  }, [])
  const F = ({ x, y }: { x: number; y: number }) => (
    <g>
      <rect x={x} y={y} width="7" height="7" fill="currentColor" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="white" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
    </g>
  )
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="size-[132px] rounded-lg bg-white text-[#111]" shapeRendering="crispEdges" role="img" aria-label="認証アプリ用の QR コード">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
      <F x={0} y={0} />
      <F x={n - 7} y={0} />
      <F x={0} y={n - 7} />
    </svg>
  )
}

const BACKUP = ['4f9k-2m8q', 'h7tw-c3pa', 'x2nd-9vke', 'r8ja-5zbm', 'q3lu-7wfe', 'm6yp-1sgd', 'b9ct-4hkn', 'e5rv-8jxa']

function TwoFactorDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { reduce } = useContext(SettingsCtx)
  const [step, setStep] = useState(0)
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | 'error'>('idle')
  const [shake, setShake] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const otpRef = useCallback((el: HTMLInputElement | null) => {
    inputRef.current = el
    el?.focus({ preventScroll: true })
  }, [])
  useEffect(() => {
    if (open) {
      setStep(0)
      setCode('')
      setState('idle')
    }
  }, [open])
  const verify = () => {
    if (code.length < 6 || state === 'checking') return
    setState('checking')
    setTimeout(() => {
      if (code === '000000') {
        setState('error')
        setShake((s) => s + 1)
        setCode('')
        inputRef.current?.focus({ preventScroll: true })
      } else {
        setState('idle')
        setStep(2)
      }
    }, 900)
  }
  const steps = ['読み取り', 'コード確認', 'バックアップ']
  return (
    <Modal open={open} onClose={onClose} title="2 段階認証を設定" width={460}>
      <div className="px-5 pb-5 pt-3">
        <ol className="mb-4 flex items-center gap-2 text-[11px] font-semibold">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] transition-colors ${
                  i < step ? 'bg-[var(--ok)] text-white' : i === step ? 'bg-[var(--accent)] text-white' : 'bg-[var(--panel2)] text-[var(--mute)] ring-1 ring-[var(--line)]'
                }`}
              >
                {i < step ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>
              <span className={i === step ? 'text-[var(--fg)]' : 'text-[var(--mute)]'}>{s}</span>
              {i < steps.length - 1 && <span className="h-px flex-1 bg-[var(--line2)]" />}
            </li>
          ))}
        </ol>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: reduce ? 0.12 : 0.22 }}
          >
            {step === 0 && (
              <div>
                <p className="text-[12.5px] leading-relaxed text-[var(--sub)]">認証アプリで QR コードを読み取ってください。読み取れない場合はセットアップキーを入力します。</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="rounded-xl border border-[var(--line)] p-2">
                    <FakeQR />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-[var(--mute)]">セットアップキー</div>
                    <div className="mt-1 flex items-center gap-1 rounded-lg bg-[var(--panel2)] px-2.5 py-2 font-mono text-[12.5px] tracking-wider">
                      <span className="min-w-0 flex-1 break-all">NAGI 7KQ2 XW4M PL9T</span>
                      <button
                        type="button"
                        className={iconBtn}
                        aria-label="セットアップキーをコピー"
                        onClick={() => {
                          copyText('NAGI7KQ2XW4MPL9T')
                          toast.success('セットアップキーをコピーしました', tOpt)
                        }}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" className={`${btn} text-[var(--sub)] hover:bg-[var(--hover)]`} onClick={onClose}>
                    キャンセル
                  </button>
                  <button type="button" className={btnPrimary} onClick={() => setStep(1)} data-autofocus>
                    次へ
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <p className="text-[12.5px] leading-relaxed text-[var(--sub)]">アプリに表示されている 6 桁のコードを入力してください。</p>
                <motion.label
                  key={shake}
                  animate={shake && !reduce ? { x: [0, -9, 8, -6, 4, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="relative mx-auto mt-4 flex w-fit cursor-text gap-2"
                >
                  {Array.from({ length: 6 }, (_, i) => {
                    const active = i === Math.min(code.length, 5)
                    return (
                      <span
                        key={i}
                        className={`grid h-12 w-10 place-items-center rounded-lg border text-[20px] font-bold tabular-nums transition-colors ${
                          state === 'error' ? 'border-[var(--danger)]' : active ? 'border-[var(--accent)] ring-3 ring-[var(--accent-soft)]' : 'border-[var(--line2)]'
                        } bg-[var(--panel)] ${i === 2 ? 'mr-2' : ''}`}
                      >
                        {code[i] ?? (active && state !== 'checking' ? <span className="h-5 w-[2px] animate-pulse bg-[var(--accent)]" /> : '')}
                      </span>
                    )
                  })}
                  <input
                    ref={otpRef}
                    value={code}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="6 桁の認証コード"
                    maxLength={6}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      if (state === 'error') setState('idle')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && verify()}
                    className="absolute inset-0 cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
                  />
                </motion.label>
                <p className={`mt-2 text-center text-[11.5px] ${state === 'error' ? 'text-[var(--danger)]' : 'text-[var(--mute)]'}`}>
                  {state === 'error' ? 'コードが正しくありません。もう一度入力してください。' : 'デモ: 000000 以外の任意の 6 桁で認証できます'}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" className={`${btn} text-[var(--sub)] hover:bg-[var(--hover)]`} onClick={() => setStep(0)}>
                    戻る
                  </button>
                  <button type="button" className={btnPrimary} disabled={code.length < 6 || state === 'checking'} onClick={verify}>
                    {state === 'checking' ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    {state === 'checking' ? '確認中…' : '確認する'}
                  </button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <div className="flex items-start gap-3 rounded-xl bg-[color-mix(in_srgb,var(--ok)_10%,transparent)] p-3">
                  <motion.span
                    initial={reduce ? false : { scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--ok)] text-white"
                  >
                    <Check size={17} strokeWidth={3} />
                  </motion.span>
                  <p className="text-[12.5px] leading-relaxed">
                    認証できました。端末をなくしたときのために、<b>バックアップコード</b>を保管してください。各コードは 1 回だけ使えます。
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-dashed border-[var(--line2)] p-3 font-mono text-[12.5px] tracking-wide">
                  {BACKUP.map((c, i) => (
                    <motion.span key={c} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.04 }} className="text-center">
                      {c}
                    </motion.span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => {
                      copyText(BACKUP.join('\n'))
                      toast.success('バックアップコードをコピーしました', tOpt)
                    }}
                  >
                    <Copy size={14} />
                    コピー
                  </button>
                  <button type="button" className={btnPrimary} onClick={onDone} data-autofocus>
                    完了
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  )
}

/* ───────────── セクション: 外観 ───────────── */

function ThemeThumb({ kind }: { kind: ThemePref }) {
  const L = { bg: '#f4f5f7', card: '#fff', line: '#e2e5ea', text: '#c9ced6' }
  const D = { bg: '#121418', card: '#1d2127', line: '#2b3038', text: '#3d444f' }
  const body = (c: typeof L, clip?: string) => (
    <g clipPath={clip}>
      <rect width="120" height="72" fill={c.bg} />
      <rect x="8" y="8" width="26" height="56" rx="4" fill={c.card} stroke={c.line} />
      <rect x="40" y="8" width="72" height="56" rx="4" fill={c.card} stroke={c.line} />
      <rect x="47" y="16" width="34" height="5" rx="2.5" fill="var(--accent)" />
      {[28, 37, 46, 55].map((y) => (
        <rect key={y} x="47" y={y} width={y === 37 ? 40 : 54} height="4" rx="2" fill={c.text} />
      ))}
      {[16, 24, 32].map((y) => (
        <rect key={y} x="13" y={y} width="16" height="4" rx="2" fill={y === 16 ? 'var(--accent)' : c.text} opacity={y === 16 ? 0.7 : 1} />
      ))}
    </g>
  )
  const id = useId()
  return (
    <svg viewBox="0 0 120 72" className="block w-full" aria-hidden>
      <defs>
        <clipPath id={id}>
          <polygon points="60,0 120,0 120,72 60,72" />
        </clipPath>
      </defs>
      {body(kind === 'dark' ? D : L)}
      {kind === 'system' && body(D, `url(#${id})`)}
    </svg>
  )
}

function MiniApp({ mode, accent, density }: { mode: Mode; accent: string; density: Density }) {
  const v = themeVars(mode, accent, density)
  const tasks = [
    { t: '新機能のオンボーディング設計', tag: 'デザイン', done: true },
    { t: '通知まとめの文言を確認', tag: 'レビュー', done: false },
    { t: 'リリースノートの下書き', tag: '執筆', done: false },
    { t: '料金ページの A/B 結果を共有', tag: '分析', done: false },
  ]
  return (
    <div style={v} className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--fg)] shadow-[0_12px_30px_-14px_rgba(0,0,0,.35)] transition-colors duration-300">
      <div className="flex items-center gap-1.5 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2 transition-colors duration-300">
        <span className="size-2 rounded-full bg-[var(--line2)]" />
        <span className="size-2 rounded-full bg-[var(--line2)]" />
        <span className="size-2 rounded-full bg-[var(--line2)]" />
        <span className="ml-2 text-[10.5px] font-semibold text-[var(--sub)]">プレビュー</span>
      </div>
      <div className="flex">
        <div className="hidden w-[30%] shrink-0 space-y-1 border-r border-[var(--line)] bg-[var(--panel)] p-2 transition-colors duration-300 @xl/main:block">
          {['受信箱', '今週', 'プロジェクト', 'アーカイブ'].map((l, i) => (
            <div key={l} className={`rounded-md px-2 py-[calc(5px*var(--d))] text-[11px] font-semibold transition-all duration-300 ${i === 1 ? 'bg-[var(--accent-soft)] text-[var(--accent-fg)]' : 'text-[var(--sub)]'}`}>
              {l}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12.5px] font-bold">今週のタスク</span>
            <span className="rounded-md bg-[var(--accent)] px-2 py-1 text-[10px] font-bold text-white transition-colors duration-300">＋ 追加</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] transition-colors duration-300">
            {tasks.map((t) => (
              <div key={t.t} className="flex items-center gap-2 border-b border-[var(--line)] px-2.5 py-[calc(8px*var(--d))] text-[11.5px] transition-all duration-300 last:border-b-0">
                <span className={`grid size-3.5 shrink-0 place-items-center rounded-[4px] border ${t.done ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--line2)]'}`}>
                  {t.done && <Check size={9} strokeWidth={4} className="text-white" />}
                </span>
                <span className={`min-w-0 flex-1 truncate ${t.done ? 'text-[var(--mute)] line-through' : ''}`}>{t.t}</span>
                <span className="shrink-0 rounded-full bg-[var(--panel2)] px-1.5 py-px text-[9.5px] text-[var(--sub)]">{t.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AppearanceSection({ d, up, sysDark }: { d: Draft; up: Up; sysDark: boolean }) {
  const previewMode: Mode = d.theme === 'system' ? (sysDark ? 'dark' : 'light') : d.theme
  return (
    <div className="space-y-5">
      <div className="grid gap-5 @4xl/main:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <Card title="外観" desc="保存すると Nagi 全体に反映されます。">
          <Row id="a-theme" label="テーマ" field="theme" wide>
            <div role="radiogroup" aria-label="テーマ" className="grid grid-cols-3 gap-2.5">
              {(
                [
                  ['light', 'ライト', Sun],
                  ['dark', 'ダーク', Moon],
                  ['system', 'システム', Monitor],
                ] as const
              ).map(([v, l, Icon]) => {
                const on = d.theme === v
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => up({ theme: v })}
                    className={`group overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow] ${focusRing} ${
                      on ? 'border-[var(--accent)] ring-3 ring-[var(--accent-soft)]' : 'border-[var(--line2)] hover:border-[color-mix(in_srgb,var(--fg)_30%,var(--line2))]'
                    }`}
                  >
                    <ThemeThumb kind={v} />
                    <span className="flex items-center gap-1.5 border-t border-[var(--line)] px-2.5 py-1.5 text-[12px] font-semibold">
                      <Icon size={13} className={on ? 'text-[var(--accent-fg)]' : 'text-[var(--sub)]'} />
                      {l}
                      {on && <Check size={13} strokeWidth={3} className="ml-auto text-[var(--accent-fg)]" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </Row>
          <Row id="a-accent" label="アクセントカラー" field="accent" wide>
            <div role="radiogroup" aria-label="アクセントカラー" className="flex flex-wrap gap-2.5">
              {ACCENTS.map((a) => {
                const on = d.accent === a.c
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={a.label}
                    title={a.label}
                    onClick={() => up({ accent: a.c })}
                    className={`relative grid size-9 place-items-center rounded-full transition-transform hover:scale-105 ${focusRing}`}
                    style={{ background: a.c }}
                  >
                    {on && (
                      <motion.span layoutId="accent-ring" className="absolute -inset-[4px] rounded-full border-2" style={{ borderColor: a.c }} transition={ease} />
                    )}
                    <span className="text-[12px] font-bold text-white/90">{on ? <Check size={15} strokeWidth={3} /> : a.label}</span>
                  </button>
                )
              })}
            </div>
          </Row>
          <Row id="a-density" label="表示密度" desc="リストと設定の行の高さ" field="density" wide>
            <Segmented
              label="表示密度"
              value={d.density}
              onChange={(v) => up({ density: v })}
              options={[
                { v: 'compact', l: 'コンパクト' },
                { v: 'standard', l: '標準' },
                { v: 'comfortable', l: 'ゆったり' },
              ]}
            />
          </Row>
        </Card>
        <div className="@container/preview">
          <div className="sticky top-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[12px] font-semibold text-[var(--sub)]">ライブプレビュー</span>
              <span className="text-[11px] text-[var(--mute)]">{previewMode === 'dark' ? 'ダーク' : 'ライト'} · {ACCENTS.find((a) => a.c === d.accent)?.label}</span>
            </div>
            <MiniApp mode={previewMode} accent={d.accent} density={d.density} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────── セクション: 請求 ───────────── */

function Meter({ label, used, total, unit, fmt = (n: number) => n.toLocaleString('ja-JP') }: { label: string; used: number; total: number; unit: string; fmt?: (n: number) => string }) {
  const { reduce } = useContext(SettingsCtx)
  const pct = Math.min(1, used / total)
  const tone = pct >= 0.9 ? 'var(--danger)' : pct >= 0.8 ? 'var(--warn)' : 'var(--accent)'
  return (
    <div className="py-[calc(12px*var(--d))]">
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-[var(--sub)]">
          <b className="font-semibold text-[var(--fg)]">{fmt(used)}</b> / {fmt(total)} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--panel2)] ring-1 ring-inset ring-[var(--line)]" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={used} aria-label={label}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: tone }}
          initial={{ width: reduce ? `${pct * 100}%` : 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
        />
      </div>
      {pct >= 0.8 && <p className="mt-1 text-[11px]" style={{ color: tone }}>上限の {Math.round(pct * 100)}% に達しています</p>}
    </div>
  )
}

function BillingSection({ seats }: { seats: number }) {
  const [yearly, setYearly] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const unit = yearly ? 1500 : 1800
  return (
    <div className="space-y-5">
      <div className="grid gap-5 @3xl/main:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section data-setting="b-plan" className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]">
          <Flash id="b-plan" card />
          <svg className="pointer-events-none absolute -right-10 -top-12 h-48 w-64 opacity-60" viewBox="0 0 200 150" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M0 ${40 + i * 18}c30-16 60-16 90 0s60 16 90 0s30-16 40-8`} fill="none" stroke="var(--accent)" strokeOpacity={0.12 + i * 0.05} strokeWidth="2" />
            ))}
          </svg>
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent-fg)]">現在のプラン</span>
              <span className="text-[11px] text-[var(--mute)]">次回請求 12月1日</span>
            </div>
            <h3 className="mt-2 text-[22px] font-extrabold tracking-tight">
              <Hl text="Team プラン" />
            </h3>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[28px] font-extrabold tabular-nums tracking-tight">
                ¥<NumberFlow value={unit} format={{ useGrouping: true }} locales="ja-JP" />
              </span>
              <span className="text-[12px] text-[var(--sub)]">/ メンバー / 月</span>
            </div>
            <div className="mt-3 flex items-center gap-2.5 text-[12.5px]">
              <Switch checked={yearly} onChange={setYearly} label="年払い" />
              <span>年払い</span>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--ok)_14%,transparent)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--ok)]">2 か月分お得</span>
            </div>
            <p className="mt-3 text-[12px] text-[var(--sub)]">
              {seats} 席 × ¥{unit.toLocaleString('ja-JP')} = 次回のお支払い <b className="text-[var(--fg)]">¥{(seats * unit * (yearly ? 12 : 1)).toLocaleString('ja-JP')}</b>
              {yearly ? '(1 年分)' : ''}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} onClick={() => toast('プランの比較を開きます', { ...tOpt, description: 'Business プランでは SSO と監査ログが使えます。' })}>
                <Zap size={14} />
                プランを変更
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => toast.success(yearly ? '年払いへの切り替えを予約しました' : '請求サイクルは月払いのままです', { ...tOpt, description: '次回の請求日から反映されます。' })}
              >
                請求サイクルを保存
              </button>
            </div>
          </div>
        </section>

        <Card id="b-usage" title="使用量" desc="12月1日にリセットされます。">
          <Meter label="メンバー" used={seats} total={SEATS} unit="席" />
          <Meter label="ストレージ" used={64.2} total={100} unit="GB" fmt={(n) => n.toFixed(n % 1 ? 1 : 0)} />
          <Meter label="オートメーション実行" used={8420} total={10000} unit="回" />
          <Meter label="API リクエスト" used={182400} total={500000} unit="件" />
        </Card>
      </div>

      <Card title="支払い方法" id="b-payment">
        <div className="flex flex-wrap items-center gap-4 py-4">
          <svg viewBox="0 0 64 40" className="h-10 w-16 shrink-0 rounded-md shadow-sm" aria-hidden>
            <defs>
              <linearGradient id="nagi-card" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#1f2937" />
                <stop offset="1" stopColor="#4b5563" />
              </linearGradient>
            </defs>
            <rect width="64" height="40" rx="5" fill="url(#nagi-card)" />
            <rect x="7" y="13" width="10" height="8" rx="1.5" fill="#e5c07b" />
            <circle cx="47" cy="29" r="5" fill="#f97316" opacity=".9" />
            <circle cx="54" cy="29" r="5" fill="#facc15" opacity=".8" />
          </svg>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[13px] font-semibold tracking-wider">•••• •••• •••• 4821</div>
            <div className="text-[11.5px] text-[var(--sub)]">有効期限 08/28 · 請求先 Nagi Design 株式会社</div>
          </div>
          <button type="button" className={btnGhost} onClick={() => toast('カード情報の変更フォームはデモでは省略しています', tOpt)}>
            変更
          </button>
        </div>
      </Card>

      <Card title="請求書" id="b-invoices" pad={false}>
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--line)] text-[11px] text-[var(--mute)]">
              <th className="px-5 py-2 font-semibold">請求書</th>
              <th className="hidden py-2 font-semibold @xl/main:table-cell">日付</th>
              <th className="py-2 text-right font-semibold">金額</th>
              <th className="hidden py-2 pl-6 font-semibold @md/main:table-cell">状態</th>
              <th className="px-5 py-2">
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((iv) => (
              <tr key={iv.no} className="border-b border-[var(--line)] transition-colors last:border-b-0 hover:bg-[var(--hover)]">
                <td className="px-5 py-[calc(10px*var(--d))]">
                  <div className="flex items-center gap-2 font-mono text-[12px] font-semibold">
                    <FileText size={14} className="shrink-0 text-[var(--mute)]" />
                    {iv.no}
                  </div>
                  <div className="pl-[22px] text-[11px] text-[var(--sub)] @xl/main:hidden">{iv.date}</div>
                </td>
                <td className="hidden text-[var(--sub)] @xl/main:table-cell">{iv.date}</td>
                <td className="text-right font-semibold tabular-nums">¥{iv.amount.toLocaleString('ja-JP')}</td>
                <td className="hidden pl-6 @md/main:table-cell">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                      iv.status === 'paid' ? 'bg-[color-mix(in_srgb,var(--ok)_13%,transparent)] text-[var(--ok)]' : 'bg-[var(--panel2)] text-[var(--sub)]'
                    }`}
                  >
                    {iv.status === 'paid' ? <Check size={10} strokeWidth={3} /> : <RotateCw size={10} />}
                    {iv.status === 'paid' ? '支払い済み' : '返金済み'}
                  </span>
                </td>
                <td className="px-5 text-right">
                  <button
                    type="button"
                    className={iconBtn}
                    aria-label={`${iv.no} の PDF をダウンロード`}
                    disabled={busy === iv.no}
                    onClick={() => {
                      setBusy(iv.no)
                      toast.promise(new Promise((r) => setTimeout(r, 1200)), {
                        ...tOpt,
                        loading: `${iv.no}.pdf を準備しています…`,
                        success: () => {
                          setBusy(null)
                          return `${iv.no}.pdf をダウンロードしました`
                        },
                        error: '失敗しました',
                      })
                    }}
                  >
                    {busy === iv.no ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ───────────── セクション: チーム ───────────── */

function TeamSection({ members, setMembers }: { members: Member[]; setMembers: (f: (m: Member[]) => Member[]) => void }) {
  const { reduce } = useContext(SettingsCtx)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(0)
  const [sending, setSending] = useState(false)
  const seatsLeft = SEATS - members.length

  const invite = () => {
    const v = email.trim()
    let e = ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) e = '正しいメールアドレスを入力してください'
    else if (members.some((m) => m.email === v)) e = 'このアドレスはすでにメンバーです'
    else if (seatsLeft <= 0) e = '空いている席がありません。プランの席数を増やしてください'
    if (e) {
      setErr(e)
      setShake((s) => s + 1)
      return
    }
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setMembers((ms) => [...ms, { id: `p${Date.now()}`, name: v.split('@')[0], email: v, role, hue: (v.length * 47) % 360, last: '招待中', pending: true }])
      setEmail('')
      toast.success('招待を送信しました', { ...tOpt, description: `${v} · ${ROLE_LABEL[role]}` })
    }, 700)
  }

  const remove = (m: Member) => {
    const idx = members.findIndex((x) => x.id === m.id)
    setMembers((ms) => ms.filter((x) => x.id !== m.id))
    toast(m.pending ? '招待を取り消しました' : `${m.name} さんをワークスペースから外しました`, {
      ...tOpt,
      action: {
        label: '元に戻す',
        onClick: () =>
          setMembers((ms) => {
            const n = [...ms]
            n.splice(idx, 0, m)
            return n
          }),
      },
    })
  }

  return (
    <div className="space-y-5">
      <Card id="t-invite" title="メンバーを招待" desc={`残り ${seatsLeft} 席 · 招待は 7 日間有効です`}>
        <div className="py-4">
          <motion.div key={shake} animate={shake && !reduce ? { x: [0, -8, 7, -5, 3, 0] } : {}} transition={{ duration: 0.38 }} className="flex flex-col gap-2 @xl/main:flex-row">
            <div className="relative min-w-0 flex-1">
              <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
              <input
                className={`${inputCls} pl-9 ${err ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_18%,transparent)]' : ''}`}
                placeholder="name@company.example"
                value={email}
                aria-label="招待するメールアドレス"
                aria-invalid={!!err}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErr('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && invite()}
              />
            </div>
            <div className="flex gap-2">
              <Select label="役割" value={role} onChange={(v) => setRole(v as Role)} className="w-[124px]">
                <option value="admin">管理者</option>
                <option value="member">メンバー</option>
                <option value="guest">ゲスト</option>
              </Select>
              <button type="button" className={`${btnPrimary} h-9 flex-1 @xl/main:flex-none`} onClick={invite} disabled={sending}>
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                招待を送信
              </button>
            </div>
          </motion.div>
          <AnimatePresence>
            {err && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 text-[11.5px] text-[var(--danger)]" role="alert">
                {err}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </Card>

      <Card id="t-members" title="メンバーと役割" desc={`${members.length} 人 / ${SEATS} 席`} pad={false}>
        <ul>
          <AnimatePresence initial={false}>
            {members.map((m) => (
              <motion.li
                key={m.id}
                layout={!reduce}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: reduce ? 0.12 : 0.26 }}
                className="overflow-hidden border-b border-[var(--line)] last:border-b-0"
              >
                <div className="flex items-center gap-3 px-5 py-[calc(11px*var(--d))]">
                  <div className="relative">
                    <Avatar name={m.name} hue={m.hue} size={34} />
                    {m.last === 'オンライン' && <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--panel)] bg-[var(--ok)]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                      <span className="truncate">{m.name}</span>
                      {m.you && <span className="shrink-0 rounded bg-[var(--panel2)] px-1 text-[10px] font-semibold text-[var(--sub)]">あなた</span>}
                      {m.pending && <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--warn)_16%,transparent)] px-1.5 py-px text-[10px] font-bold text-[var(--warn)]">招待中</span>}
                    </div>
                    <div className="truncate text-[11.5px] text-[var(--sub)]">
                      {m.email}
                      <span className="hidden @xl/main:inline"> · {m.last}</span>
                    </div>
                  </div>
                  {m.role === 'owner' ? (
                    <span className="flex h-9 w-[112px] items-center px-3 text-[12.5px] font-semibold text-[var(--sub)]">オーナー</span>
                  ) : (
                    <Select
                      label={`${m.name} の役割`}
                      value={m.role}
                      className="w-[112px]"
                      onChange={(v) => {
                        const r = v as Role
                        setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, role: r } : x)))
                        toast.success(`${m.name} さんを${ROLE_LABEL[r]}に変更しました`, tOpt)
                      }}
                    >
                      <option value="admin">管理者</option>
                      <option value="member">メンバー</option>
                      <option value="guest">ゲスト</option>
                    </Select>
                  )}
                  <button type="button" className={iconBtn} aria-label={m.pending ? `${m.email} への招待を取り消す` : `${m.name} を外す`} disabled={m.role === 'owner'} onClick={() => remove(m)}>
                    {m.pending ? <X size={15} /> : <UserMinus size={15} />}
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Card>
    </div>
  )
}

/* ───────────── セクション: 連携 ───────────── */

function ServiceLogo({ s }: { s: Service }) {
  return (
    <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden>
      <rect width="40" height="40" rx="11" fill={s.color} />
      <circle cx="31" cy="9" r="11" fill="white" opacity=".13" />
      <path d="M0 30 Q 20 22 40 30 V40 H0Z" fill="black" opacity=".1" />
      <text x="20" y="20" dy=".36em" textAnchor="middle" fontSize="18" fontWeight="800" fill="white" fontFamily="inherit">
        {s.glyph}
      </text>
    </svg>
  )
}

function IntegrationsSection({ d, up, services, setServices, webhookInvalid }: { d: Draft; up: Up; services: Service[]; setServices: (f: (s: Service[]) => Service[]) => void; webhookInvalid: boolean }) {
  const { reduce } = useContext(SettingsCtx)
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const list = services.filter((s) => (filter === 'all' ? true : filter === 'on' ? s.on : !s.on))
  const connect = (s: Service) => {
    setBusy(s.id)
    setTimeout(() => {
      setServices((ss) => ss.map((x) => (x.id === s.id ? { ...x, on: true } : x)))
      setBusy(null)
      toast.success(`${s.name} と接続しました`, { ...tOpt, description: s.desc })
    }, 1100)
  }
  const disconnect = (s: Service) => {
    setServices((ss) => ss.map((x) => (x.id === s.id ? { ...x, on: false } : x)))
    toast(`${s.name} との接続を解除しました`, { ...tOpt, action: { label: '元に戻す', onClick: () => setServices((ss) => ss.map((x) => (x.id === s.id ? { ...x, on: true } : x))) } })
  }
  const count = { all: services.length, on: services.filter((s) => s.on).length, off: services.filter((s) => !s.on).length }
  return (
    <div className="space-y-5">
      <Card
        id="i-list"
        title="連携サービス"
        desc="接続すると、ワークスペースの全員が使えるようになります。"
        action={
          <Segmented
            label="表示する連携"
            value={filter}
            onChange={setFilter}
            options={[
              { v: 'all', l: `すべて ${count.all}` },
              { v: 'on', l: `接続済み ${count.on}` },
              { v: 'off', l: `未接続 ${count.off}` },
            ]}
          />
        }
      >
        <motion.ul layout={!reduce} className="grid gap-3 py-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((s) => (
              <motion.li
                key={s.id}
                layout={!reduce}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 transition-shadow hover:shadow-[0_6px_20px_-10px_rgba(0,0,0,.25)]"
              >
                <div className="flex items-start gap-3">
                  <ServiceLogo s={s} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold">{s.name}</div>
                    <div className="text-[11px] text-[var(--mute)]">{s.cat}</div>
                  </div>
                  {s.on && (
                    <span className="flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--ok)_13%,transparent)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--ok)]">
                      <span className="size-1.5 rounded-full bg-[var(--ok)]" />
                      接続済み
                    </span>
                  )}
                </div>
                <p className="mt-2 flex-1 text-[12px] leading-relaxed text-[var(--sub)]">{s.desc}</p>
                <div className="mt-3 flex justify-end gap-2">
                  {s.on ? (
                    <>
                      <button type="button" className={`${btn} text-[var(--sub)] hover:bg-[var(--hover)]`} onClick={() => disconnect(s)}>
                        接続を解除
                      </button>
                      <button type="button" className={btnGhost} onClick={() => toast(`${s.name} の設定はデモでは省略しています`, tOpt)}>
                        設定
                      </button>
                    </>
                  ) : (
                    <button type="button" className={btnGhost} onClick={() => connect(s)} disabled={busy === s.id}>
                      {busy === s.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      {busy === s.id ? '接続中…' : '接続'}
                    </button>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </Card>

      <Card title="Webhook" id="i-webhook" desc="イベントが起きるたびに JSON を POST します。">
        <Row id="i-webhook-url" label="送信先 URL" field="webhook">
          <input
            className={`${inputCls} font-mono text-[12px] ${webhookInvalid ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_18%,transparent)]' : ''}`}
            value={d.webhook}
            placeholder="https://"
            aria-label="Webhook の送信先 URL"
            aria-invalid={webhookInvalid}
            onChange={(e) => up({ webhook: e.target.value })}
          />
          {webhookInvalid && <p className="mt-1.5 text-[11.5px] text-[var(--danger)]">https:// で始まる URL を入力してください</p>}
        </Row>
        <Row id="i-webhook-events" label="送信するイベント" field="hookEvents">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['task', 'タスクの作成・更新'],
                ['comment', 'コメント'],
                ['release', 'リリース'],
              ] as const
            ).map(([k, l]) => {
              const on = d.hookEvents[k]
              return (
                <button
                  key={k}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => up({ hookEvents: { ...d.hookEvents, [k]: !on } })}
                  className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
                    on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-fg)]' : 'border-[var(--line2)] text-[var(--sub)] hover:bg-[var(--hover)]'
                  }`}
                >
                  <span className={`grid size-3.5 place-items-center rounded-[4px] border ${on ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--line2)]'}`}>
                    {on && <Check size={9} strokeWidth={4} className="text-white" />}
                  </span>
                  {l}
                </button>
              )
            })}
          </div>
        </Row>
        <Row id="i-webhook-test" label="テスト送信" desc="保存済みの URL にサンプルを送ります。">
          <button
            type="button"
            className={btnGhost}
            disabled={testing}
            onClick={() => {
              setTesting(true)
              toast.promise(new Promise((r) => setTimeout(r, 1300)), {
                ...tOpt,
                loading: 'テストイベントを送信しています…',
                success: () => {
                  setTesting(false)
                  return '200 OK · 応答 182ms'
                },
                error: '失敗しました',
              })
            }}
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            テスト送信
          </button>
        </Row>
      </Card>
    </div>
  )
}

/* ───────────── 検索 ───────────── */

function SettingsSearch({ query, setQuery, onJump, inputRef }: { query: string; setQuery: (q: string) => void; onJump: (id: string, s: SectionId) => void; inputRef: RefObject<HTMLInputElement | null> }) {
  const { reduce } = useContext(SettingsCtx)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const q = query.trim().toLowerCase()
  const results = useMemo(() => (q ? INDEX.filter((i) => `${i.label} ${i.hint} ${i.kw ?? ''} ${SECTION_LABEL[i.section]}`.toLowerCase().includes(q)).slice(0, 8) : []), [q])
  useEffect(() => setActive(0), [q])
  const pick = (i: number) => {
    const r = results[i]
    if (!r) return
    onJump(r.id, r.section)
    setOpen(false)
  }
  return (
    <div className="relative min-w-0 flex-1 @3xl:max-w-[420px]">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
      <input
        ref={inputRef}
        value={query}
        role="combobox"
        aria-expanded={open && !!q}
        aria-controls={listId}
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        aria-label="設定を検索"
        placeholder="設定を検索…"
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(results.length - 1, a + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(0, a - 1))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            pick(active)
          } else if (e.key === 'Escape') {
            e.stopPropagation()
            if (open && q) setOpen(false)
            else {
              setQuery('')
              e.currentTarget.blur()
            }
          }
        }}
        className="h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--panel2)] pl-9 pr-16 text-[13px] text-[var(--fg)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[var(--mute)] focus:border-[var(--accent)] focus:bg-[var(--panel)] focus:ring-3 focus:ring-[var(--accent-soft)]"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {query ? (
          <button type="button" aria-label="検索をクリア" onClick={() => setQuery('')} className="grid size-6 place-items-center rounded-md text-[var(--mute)] hover:bg-[var(--hover)] hover:text-[var(--fg)]">
            <X size={13} />
          </button>
        ) : (
          <kbd className="hidden rounded border border-[var(--line2)] bg-[var(--panel)] px-1.5 font-sans text-[10.5px] font-semibold text-[var(--mute)] @md:block">/</kbd>
        )}
      </div>
      <AnimatePresence>
        {open && q && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label="検索結果"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : -4 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[320px] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-[0_18px_44px_-14px_rgba(0,0,0,.4)]"
          >
            {results.length === 0 && <li className="px-3 py-6 text-center text-[12.5px] text-[var(--sub)]">「{query.trim()}」に一致する設定はありません</li>}
            {results.map((r, i) => {
              const S = SECTIONS.find((s) => s.id === r.section)!
              return (
                <li
                  key={r.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(i)
                  }}
                  onMouseMove={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 ${i === active ? 'bg-[var(--accent-soft)]' : ''}`}
                >
                  <span className={`grid size-7 shrink-0 place-items-center rounded-md ${i === active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--panel2)] text-[var(--sub)]'}`}>
                    <S.icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">
                      <Hl text={r.label} />
                    </span>
                    <span className="block truncate text-[11px] text-[var(--sub)]">
                      {S.label} › {r.hint}
                    </span>
                  </span>
                  {i === active && <ArrowRight size={14} className="shrink-0 text-[var(--accent-fg)]" />}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────── 本体 ───────────── */

export function SettingsPage() {
  const reduce = !!useReducedMotion()
  const sysDark = useSystemDark()
  const [saved, setSaved] = useState<Draft>(INITIAL)
  const [draft, setDraft] = useState<Draft>(INITIAL)
  const [section, setSection] = useState<SectionId>('account')
  const [query, setQuery] = useState('')
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [dialog, setDialog] = useState<'delete' | 'twofa' | null>(null)
  const [sessions, setSessions] = useState(SESSIONS)
  const [keys, setKeys] = useState(KEYS)
  const [twofa, setTwofa] = useState(false)
  const [members, setMembers] = useState(MEMBERS)
  const [services, setServices] = useState(SERVICES)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [barNudge, setBarNudge] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const flashN = useRef(0)

  const paths = useMemo(() => diffPaths(saved, draft), [saved, draft])
  const changed = useMemo(() => new Set(paths), [paths])
  const dirtySections = useMemo(() => new Set(paths.map(sectionOfPath)), [paths])
  const webhookInvalid = !!draft.webhook && !/^https:\/\/[^\s/]+\.[^\s]+/.test(draft.webhook)
  const barVisible = paths.length > 0 || saveState !== 'idle'

  const up: Up = useCallback((p) => setDraft((d) => ({ ...d, ...p })), [])

  const mode: Mode = saved.theme === 'system' ? (sysDark ? 'dark' : 'light') : saved.theme
  const vars = useMemo(() => themeVars(mode, saved.accent, saved.density), [mode, saved.accent, saved.density])

  const q = query.trim().toLowerCase()
  const hits = useMemo(() => {
    const h: Partial<Record<SectionId, number>> = {}
    if (!q) return h
    for (const i of INDEX) if (`${i.label} ${i.hint} ${i.kw ?? ''}`.toLowerCase().includes(q)) h[i.section] = (h[i.section] ?? 0) + 1
    return h
  }, [q])

  const save = useCallback(() => {
    if (!paths.length || saveState !== 'idle') return
    if (webhookInvalid) {
      setBarNudge((n) => n + 1)
      toast.error('入力内容を確認してください', { ...tOpt, description: 'Webhook の URL が正しくありません。' })
      return
    }
    const snap = draft
    const emailChanged = snap.email !== saved.email
    setSaveState('saving')
    setTimeout(() => {
      setSaved(snap)
      setSaveState('saved')
      toast.success('設定を保存しました', { ...tOpt, description: emailChanged ? `${snap.email} に確認メールを送信しました。` : `${paths.length} 件の変更を反映しました。` })
      setTimeout(() => setSaveState('idle'), 1100)
    }, 1000)
  }, [paths, saveState, webhookInvalid, draft, saved.email])

  const discard = () => {
    setDraft(saved)
    toast('変更を破棄しました', tOpt)
  }

  const go = (s: SectionId) => {
    setSection(s)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  const jump = (id: string, s: SectionId) => {
    setSection(s)
    flashN.current += 1
    setFlash({ id, n: flashN.current })
  }

  // 検索ジャンプ: セクションの描画後に該当行までスクロール
  useEffect(() => {
    if (!flash) return
    let raf = 0
    let tries = 0
    const tick = () => {
      const sc = scrollRef.current
      const el = sc?.querySelector<HTMLElement>(`[data-setting="${flash.id}"]`)
      if (!sc || !el) {
        if (tries++ < 30) raf = requestAnimationFrame(tick)
        return
      }
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 72
      sc.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' })
    }
    const t = setTimeout(() => (raf = requestAnimationFrame(tick)), 60)
    const clear = setTimeout(() => setFlash(null), 2400)
    return () => {
      clearTimeout(t)
      clearTimeout(clear)
      cancelAnimationFrame(raf)
    }
  }, [flash, reduce])

  // 狭いときのタブ: 選択中のタブが見えるように横スクロール
  useEffect(() => {
    const box = tabsRef.current
    const el = box?.querySelector<HTMLElement>(`[data-tab="${section}"]`)
    if (!box || !el || box.offsetParent === null) return
    const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2
    box.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' })
  }, [section, reduce])

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      save()
      return
    }
    const t = e.target as HTMLElement
    const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
    if (e.key === '/' && !typing && !dialog) {
      e.preventDefault()
      searchRef.current?.focus({ preventScroll: true })
    }
  }

  const ctx = useMemo<Ctx>(() => ({ query, flash, changed, reduce }), [query, flash, changed, reduce])
  const current = SECTIONS.find((s) => s.id === section)!
  const groups = [...new Set(SECTIONS.map((s) => s.group))]
  const seats = members.length

  return (
    <SettingsCtx.Provider value={ctx}>
      <div
        ref={rootRef}
        onKeyDown={onKeyDown}
        style={vars}
        className="@container relative flex h-full w-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] transition-colors duration-300"
      >
        {/* ヘッダー */}
        <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--panel)] px-3 transition-colors duration-300 @md:px-4">
          <div className="flex shrink-0 items-center gap-2 @3xl:w-[200px]">
            <NagiLogo />
            <div className="hidden leading-tight @md:block">
              <div className="text-[13px] font-bold">Nagi Design</div>
              <div className="text-[10.5px] text-[var(--mute)]">設定</div>
            </div>
          </div>
          <SettingsSearch query={query} setQuery={setQuery} onJump={jump} inputRef={searchRef} />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden text-[11.5px] text-[var(--mute)] @5xl:inline">toru@nagi.example</span>
            <Avatar name={saved.name || '？'} hue={228} size={30} />
          </div>
        </header>

        {/* 狭いとき: 横スクロールのタブ */}
        <div ref={tabsRef} role="tablist" aria-label="設定のセクション" className="relative flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--panel)] px-2 [scrollbar-width:none] @3xl:hidden">
          {SECTIONS.map((s) => {
            const on = s.id === section
            return (
              <button
                key={s.id}
                data-tab={s.id}
                role="tab"
                aria-selected={on}
                onClick={() => go(s.id)}
                className={`relative flex h-10 shrink-0 items-center gap-1.5 px-2.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${on ? 'text-[var(--fg)]' : 'text-[var(--sub)] hover:text-[var(--fg)]'} ${q && !hits[s.id] ? 'opacity-45' : ''}`}
              >
                <s.icon size={14} />
                {s.label}
                {dirtySections.has(s.id) && <span className="size-1.5 rounded-full bg-[var(--warn)]" aria-label="未保存の変更あり" />}
                {q && hits[s.id] ? <span className="rounded-full bg-[var(--mark)] px-1.5 text-[10px] tabular-nums">{hits[s.id]}</span> : null}
                {on && <motion.span layoutId="settings-tab-line" transition={reduce ? { duration: 0 } : ease} className="absolute inset-x-1.5 bottom-0 h-[2px] rounded-full bg-[var(--accent)]" />}
              </button>
            )
          })}
        </div>

        <div className="flex min-h-0 flex-1">
          {/* 広いとき: サイドナビ */}
          <nav aria-label="設定のセクション" className="hidden w-[232px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--panel)] p-3 transition-colors duration-300 @3xl:flex">
            {groups.map((g) => (
              <div key={g} className="mb-3">
                <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--mute)]">{g}</div>
                {SECTIONS.filter((s) => s.group === g).map((s) => {
                  const on = s.id === section
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-current={on ? 'page' : undefined}
                      onClick={() => go(s.id)}
                      className={`relative flex h-[calc(30px+6px*var(--d))] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-semibold transition-[color,opacity] ${focusRing} ${
                        on ? 'text-[var(--accent-fg)]' : 'text-[var(--sub)] hover:bg-[var(--hover)] hover:text-[var(--fg)]'
                      } ${q && !hits[s.id] ? 'opacity-40' : ''}`}
                    >
                      {on && <motion.span layoutId="settings-nav-pill" transition={reduce ? { duration: 0 } : ease} className="absolute inset-0 rounded-lg bg-[var(--accent-soft)]" />}
                      <s.icon size={16} className="relative" />
                      <span className="relative flex-1">{s.label}</span>
                      {q && hits[s.id] ? <span className="relative rounded-full bg-[var(--mark)] px-1.5 text-[10.5px] tabular-nums text-[var(--fg)]">{hits[s.id]}</span> : null}
                      {dirtySections.has(s.id) && <span className="relative size-2 rounded-full bg-[var(--warn)]" title="未保存の変更あり" aria-label="未保存の変更あり" />}
                    </button>
                  )
                })}
              </div>
            ))}
            <div className="mt-auto rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3">
              <div className="flex items-center gap-2 text-[12px] font-bold">
                <Zap size={13} className="text-[var(--accent-fg)]" />
                Team プラン
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--sub)]">
                {seats} / {SEATS} 席を使用中。Business にすると SSO が使えます。
              </p>
              <button type="button" onClick={() => go('billing')} className={`mt-2 text-[11.5px] font-semibold text-[var(--accent-fg)] hover:underline ${focusRing} rounded`}>
                プランを見る →
              </button>
            </div>
          </nav>

          {/* 本文 */}
          <main className="@container/main relative min-w-0 flex-1">
            <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
              <div className="mx-auto w-full max-w-[920px] px-4 pb-28 pt-5 @2xl/main:px-8 @2xl/main:pt-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={section}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{ duration: reduce ? 0.1 : 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    <div className="mb-5">
                      <h1 className="text-[20px] font-extrabold tracking-tight @2xl/main:text-[22px]">{current.label}</h1>
                      <p className="mt-0.5 text-[12.5px] text-[var(--sub)]">{current.desc}</p>
                    </div>
                    {section === 'account' && <AccountSection d={draft} saved={saved} up={up} onDelete={() => setDialog('delete')} />}
                    {section === 'notifications' && <NotificationsSection d={draft} up={up} />}
                    {section === 'security' && (
                      <SecuritySection sessions={sessions} setSessions={setSessions} keys={keys} setKeys={setKeys} twofa={twofa} setTwofa={setTwofa} openTwofa={() => setDialog('twofa')} />
                    )}
                    {section === 'appearance' && <AppearanceSection d={draft} up={up} sysDark={sysDark} />}
                    {section === 'billing' && <BillingSection seats={seats} />}
                    {section === 'team' && <TeamSection members={members} setMembers={setMembers} />}
                    {section === 'integrations' && <IntegrationsSection d={draft} up={up} services={services} setServices={setServices} webhookInvalid={webhookInvalid} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* 未保存の変更バー */}
            <AnimatePresence>
              {barVisible && (
                <motion.div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3 @2xl/main:pb-5"
                  initial={reduce ? { opacity: 0 } : { y: 90, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { y: 90, opacity: 0 }}
                  transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 34 }}
                >
                  <motion.div
                    key={barNudge}
                    animate={barNudge && !reduce ? { x: [0, -10, 9, -6, 3, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    role="region"
                    aria-label="未保存の変更"
                    className={`pointer-events-auto flex w-full max-w-[600px] items-center gap-3 rounded-2xl border py-2.5 pl-4 pr-2.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,.45)] transition-colors duration-300 ${
                      saveState === 'saved' ? 'border-transparent bg-[var(--ok)] text-white' : 'border-[#2a2f37] bg-[#16191e] text-[#eceef2]'
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {saveState === 'saved' ? (
                        <motion.div key="ok" className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-semibold" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <motion.span initial={reduce ? false : { scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} className="grid size-6 place-items-center rounded-full bg-white/25">
                            <Check size={14} strokeWidth={3.2} />
                          </motion.span>
                          保存しました
                        </motion.div>
                      ) : (
                        <motion.div key="dirty" className="flex min-w-0 flex-1 items-center gap-2.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <span className="relative flex size-2 shrink-0">
                            {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-70" />}
                            <span className="relative size-2 rounded-full bg-amber-400" />
                          </span>
                          <div className="min-w-0 leading-tight">
                            <div className="truncate text-[13px] font-semibold">
                              未保存の変更 <span className="tabular-nums text-white/60">· {paths.length} 件</span>
                            </div>
                            <div className="hidden truncate text-[11px] text-white/50 @md/main:block">
                              {webhookInvalid ? 'Webhook の URL を確認してください' : [...dirtySections].map((s) => SECTION_LABEL[s]).join('・')}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {saveState !== 'saved' && (
                      <>
                        <button
                          type="button"
                          onClick={discard}
                          disabled={saveState === 'saving'}
                          className="h-8 shrink-0 rounded-lg px-3 text-[12.5px] font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40"
                        >
                          破棄
                        </button>
                        <button
                          type="button"
                          onClick={save}
                          disabled={saveState === 'saving'}
                          className="flex h-8 min-w-[84px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 text-[12.5px] font-bold text-white shadow-sm transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-80"
                        >
                          {saveState === 'saving' ? <Loader2 size={14} className="animate-spin" /> : null}
                          {saveState === 'saving' ? '保存中…' : '保存'}
                          {saveState === 'idle' && <kbd className="ml-1 hidden rounded bg-white/20 px-1 font-sans text-[10px] font-semibold @xl/main:inline">Ctrl S</kbd>}
                        </button>
                      </>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* ダイアログ */}
        <Modal
          open={dialog === 'delete'}
          onClose={() => {
            if (deleting) return
            setDialog(null)
            setConfirmText('')
          }}
          title="ワークスペースを削除"
        >
          <div className="px-5 pb-5 pt-3">
            <div className="flex gap-3 rounded-xl bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] p-3 text-[12.5px] leading-relaxed">
              <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--danger)]" />
              <div>
                <b>Nagi Design</b> の 14 プロジェクト・1,284 件のタスク・添付ファイルがすべて削除されます。メンバー {seats} 人もアクセスできなくなり、この操作は取り消せません。
              </div>
            </div>
            <label className="mt-4 block text-[12.5px]">
              確認のため <code className="rounded bg-[var(--panel2)] px-1.5 py-0.5 font-mono text-[12px] font-bold">nagi-design</code> と入力してください
              <input
                data-autofocus
                className={`${inputCls} mt-2 font-mono`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                aria-label="ワークスペース名を入力"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={`${btn} text-[var(--sub)] hover:bg-[var(--hover)]`}
                onClick={() => {
                  setDialog(null)
                  setConfirmText('')
                }}
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                type="button"
                className={btnDanger}
                disabled={confirmText !== 'nagi-design' || deleting}
                onClick={() => {
                  setDeleting(true)
                  setTimeout(() => {
                    setDeleting(false)
                    setDialog(null)
                    setConfirmText('')
                    toast.error('ワークスペースの削除を受け付けました', { ...tOpt, description: 'デモのため実際には削除されません。' })
                  }, 1300)
                }}
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? '削除しています…' : '完全に削除する'}
              </button>
            </div>
          </div>
        </Modal>
        <TwoFactorDialog
          open={dialog === 'twofa'}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null)
            setTwofa(true)
            toast.success('2 段階認証を有効にしました', { ...tOpt, description: '次回のログインからコードの入力が必要です。' })
          }}
        />

        <Toaster
          id={TID}
          position="bottom-right"
          theme={mode}
          closeButton
          hotkey={[]}
          offset={{ bottom: barVisible ? 84 : 16, right: 16 }}
          mobileOffset={{ bottom: barVisible ? 78 : 12, left: 12, right: 12 }}
          style={{ position: 'absolute', '--width': '320px' } as CSSProperties}
          toastOptions={{ style: { fontFamily: 'inherit' } }}
        />
      </div>
    </SettingsCtx.Provider>
  )
}
