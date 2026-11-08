import { AnimatePresence, animate, motion, useAnimate, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import {
  AlertCircle,
  ArrowBigUp,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MailCheck,
  RotateCw,
  ShieldCheck,
  Sparkles,
  User,
  Wand2,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'

/**
 * SaaS のサインイン / 新規登録フロー。サービス「Kumiko」(組子細工のような“組み合わさるワークスペース”)・組織・人物はすべて架空。
 * - ルートを @container にし、768px 以上で左にブランドパネル(組子の三角格子 + 光の走査 + 浮かぶUIカード)を出す 2 カラム、狭いとフォームだけ
 * - ブランドパネルの格子は SVG の <pattern> を 0/60/120° に回した3枚の平行線で作り、朱色の複製を動く円のマスクで照らして“光が走る”。
 *   中央の六角エンブレムは pathLength で線が引かれ、アイコンと見出しは今いる画面(パスキー・メール・SSO・2段階認証…)に合わせて入れ替わる
 * - サインイン ⇄ 新規登録は layoutId のピルが滑り、名前欄・強度メーター・規約チェックが高さアニメで差し込まれる(フォーム自体は作り直さない)
 * - メールは入力中に検証し、組織ドメイン(例: hoshizora.co.jp)を検出するとパスワード欄が畳まれ「SSO で続行」に変わる
 * - パスワードは表示切替・CapsLock 警告(getModifierState)・4段の強度メーター。誤ったパスワードは useAnimate でフォームを揺らしてエラー表示
 * - 代替手段: パスキー(指紋ボタンを長押し → motion value でリングとスキャン線が進む。離すと戻る)、マジックリンク(封筒から手紙が出る送信画面 +
 *   再送カウントダウン)、会社の SSO(デバウンスしてドメイン照会 → 組織カード → 認証サーバーへの擬似リダイレクト)
 * - 2段階認証は 6 つの入力欄を自前実装。数字で自動前進、Backspace で戻る、←→ 移動、貼り付け/ワンタイムコード自動入力は全欄に分配
 * - パスワード再設定はメール送信 → 新パスワード設定まで一巡し、デモ用パスワードが新しいものに置き換わる
 * - 画面遷移は進む/戻るの向きに応じた横スライド。Esc で最初の画面へ(デモ内にフォーカスがあるときのみ)。useReducedMotion 時は短いフェードのみ
 */

/* ───────────── 定数 ───────────── */

const DEFAULT_PASSWORD = 'kumiko2026'
const DEMO_CODE = '246810'
const RESEND_SEC = 30

type Org = { domain: string; name: string; idp: string; color: string; glyph: string }
const ORGS: Org[] = [
  { domain: 'hoshizora.co.jp', name: '星空精機株式会社', idp: 'Hoshizora ID', color: '#1e3a8a', glyph: '星' },
  { domain: 'minamo-design.jp', name: 'ミナモ設計', idp: 'Minamo Access', color: '#0f766e', glyph: 'ミ' },
  { domain: 'aozora.ac.jp', name: '青空学園大学', idp: 'Aozora Campus SSO', color: '#0369a1', glyph: '青' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const isEmail = (v: string) => EMAIL_RE.test(v.trim())
const domainOf = (v: string) => {
  const s = v.trim().toLowerCase()
  return s.includes('@') ? s.split('@')[1] ?? '' : s
}
const findOrg = (v: string) => {
  const d = domainOf(v)
  return d ? ORGS.find((o) => d === o.domain) ?? null : null
}

type Mode = 'signin' | 'signup'
type View = 'auth' | 'passkey' | 'magic' | 'magic-sent' | 'sso' | 'otp' | 'forgot' | 'forgot-sent' | 'reset' | 'welcome'
type Method = 'password' | 'passkey' | 'magic' | 'sso'

const EASE = [0.32, 0.72, 0, 1] as const
const FOCUS =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#3546c8]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white'

/* ───────────── パスワード強度 ───────────── */

const COMMON = ['password', 'qwerty', '123456', 'kumiko', 'abc123', 'letmein', '111111']

function scorePassword(pw: string) {
  if (!pw) return { score: 0, label: '', tip: '8文字以上で、推測されにくいものを' }
  let s = 0
  const lower = /[a-z]/.test(pw)
  const upper = /[A-Z]/.test(pw)
  const digit = /\d/.test(pw)
  const symbol = /[^A-Za-z0-9]/.test(pw)
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (lower && upper) s++
  if (digit) s++
  if (symbol) s++
  const common = COMMON.some((w) => pw.toLowerCase().includes(w))
  if (pw.length < 8 || common) s = Math.min(s, 1)
  const score = s <= 1 ? 1 : s === 2 ? 2 : s === 3 ? 3 : 4
  const label = ['', '弱い', 'まあまあ', '良い', 'とても強い'][score]
  const tip =
    pw.length < 8
      ? `あと${8 - pw.length}文字以上必要です`
      : common
        ? 'よく使われる単語が含まれています'
        : !(lower && upper)
          ? '大文字と小文字を混ぜるとより安全です'
          : !digit
            ? '数字を加えるとより安全です'
            : !symbol
              ? '記号を加えるとより安全です'
              : pw.length < 12
                ? '12文字以上にするとさらに安全です'
                : '十分に強いパスワードです'
  return { score, label, tip }
}

const STRENGTH_COLOR = ['#e3e5ee', '#d93f4c', '#e59a1a', '#5aa83a', '#1a9e6a']

/* ───────────── 小物 ───────────── */

function KumikoMark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  // 六角形 + 中心からの6本の組子(麻の葉の簡略形)。1区画だけ朱色
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return [12 + 9.5 * Math.cos(a), 12 + 9.5 * Math.sin(a)] as const
  })
  const poly = pts.map((p) => p.join(',')).join(' ')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0" aria-hidden>
      <rect width="24" height="24" rx="6.5" fill={onDark ? 'rgba(255,255,255,0.1)' : '#1b2366'} />
      <polygon points={`12,12 ${pts[1].join(',')} ${pts[2].join(',')}`} fill="#ef6a45" />
      <polygon points={poly} fill="none" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <line key={i} x1="12" y1="12" x2={p[0]} y2={p[1]} stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
      ))}
    </svg>
  )
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 animate-spin ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** 高さアニメで出し入れする。開き終わったら overflow を戻してフォーカスリングを切らない */
function Collapse({ show, children, reduced }: { show: boolean; children: ReactNode; reduced: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="c"
          initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
          animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
          exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
          transition={{ duration: reduced ? 0.12 : 0.28, ease: EASE }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PrimaryButton({
  children,
  loading,
  disabled,
  type = 'submit',
  onClick,
  tone = 'primary',
}: {
  children: ReactNode
  loading?: boolean
  disabled?: boolean
  type?: 'submit' | 'button'
  onClick?: () => void
  tone?: 'primary' | 'org'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[14px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_1px_2px_rgba(22,26,46,0.25)] transition-[background-color,transform,opacity] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === 'org' ? 'bg-[#1b2366] hover:bg-[#141a52]' : 'bg-[#3546c8] hover:bg-[#2b3bb0]'
      } ${FOCUS}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}

function BackLink({ onClick, children = '戻る' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[13px] font-medium text-[#5d6378] transition-colors hover:text-[#161a2e] ${FOCUS}`}
    >
      <ArrowLeft size={15} aria-hidden />
      {children}
    </button>
  )
}

function Heading({ icon, title, sub }: { icon?: ReactNode; title: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      {icon && (
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#eef0fb] text-[#3546c8] ring-1 ring-[#3546c8]/10">{icon}</div>
      )}
      <h2 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-[#161a2e]">{title}</h2>
      {sub && <p className="mt-1.5 text-[13px] leading-relaxed text-[#5d6378]">{sub}</p>}
    </div>
  )
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 flex items-start gap-1 text-[12px] leading-snug text-[#c9323f]" role="alert">
      <AlertCircle size={13} className="mt-px shrink-0" aria-hidden />
      {children}
    </p>
  )
}

type FieldProps = {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  icon?: ReactNode
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  error?: string | null
  valid?: boolean
  trailing?: ReactNode
  labelAside?: ReactNode
  onBlur?: () => void
  onKeyDown?: (e: ReactKeyboardEvent<HTMLInputElement>) => void
  onKeyUp?: (e: ReactKeyboardEvent<HTMLInputElement>) => void
  inputRef?: Ref<HTMLInputElement>
  reduced: boolean
  describedBy?: string
}

function TextField(p: FieldProps) {
  const errId = `${p.id}-err`
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={p.id} className="text-[12.5px] font-semibold text-[#2c3148]">
          {p.label}
        </label>
        {p.labelAside}
      </div>
      <div className="relative">
        {p.icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9097ad]" aria-hidden>
            {p.icon}
          </span>
        )}
        <input
          id={p.id}
          ref={p.inputRef}
          type={p.type ?? 'text'}
          value={p.value}
          onChange={(e) => p.onChange(e.target.value)}
          onBlur={p.onBlur}
          onKeyDown={p.onKeyDown}
          onKeyUp={p.onKeyUp}
          placeholder={p.placeholder}
          autoComplete={p.autoComplete}
          autoFocus={p.autoFocus}
          spellCheck={false}
          aria-invalid={!!p.error || undefined}
          aria-describedby={[p.error ? errId : '', p.describedBy ?? ''].filter(Boolean).join(' ') || undefined}
          className={`h-10 w-full rounded-lg border bg-white ${p.icon ? 'pl-9' : 'pl-3'} pr-10 text-[14px] text-[#161a2e] outline-none transition-[border-color,box-shadow] placeholder:text-[#a2a7b8] ${
            p.error
              ? 'border-[#d93f4c] focus:shadow-[0_0_0_3px_rgba(217,63,76,0.14)]'
              : 'border-[#dfe2ea] hover:border-[#c8ccd9] focus:border-[#3546c8] focus:shadow-[0_0_0_3px_rgba(53,70,200,0.14)]'
          }`}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
          {p.trailing}
          <AnimatePresence>
            {p.valid && !p.trailing && (
              <motion.span
                key="ok"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                className="mr-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#1a9e6a] text-white"
                aria-hidden
              >
                <Check size={12} strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Collapse show={!!p.error} reduced={p.reduced}>
        <div id={errId}>{p.error && <ErrorText>{p.error}</ErrorText>}</div>
      </Collapse>
    </div>
  )
}

/** パスワード欄(表示切替 + CapsLock 警告) */
function PasswordField(
  p: Omit<FieldProps, 'type' | 'trailing' | 'icon' | 'onKeyDown' | 'onKeyUp'> & { below?: ReactNode },
) {
  const [show, setShow] = useState(false)
  const [caps, setCaps] = useState(false)
  const capsId = `${p.id}-caps`
  const check = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') setCaps(e.getModifierState('CapsLock'))
  }
  return (
    <div>
      <TextField
        {...p}
        type={show ? 'text' : 'password'}
        icon={<Lock size={16} />}
        onKeyDown={check}
        onKeyUp={check}
        onBlur={() => {
          setCaps(false)
          p.onBlur?.()
        }}
        describedBy={caps ? capsId : undefined}
        trailing={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'パスワードを隠す' : 'パスワードを表示'}
            aria-pressed={show}
            className={`grid h-7 w-7 place-items-center rounded-md text-[#7c8298] transition-colors hover:bg-[#f0f1f6] hover:text-[#161a2e] ${FOCUS}`}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={show ? 'off' : 'on'}
                initial={{ opacity: 0, rotate: -40, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 40, scale: 0.6 }}
                transition={{ duration: 0.18 }}
                className="grid place-items-center"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </motion.span>
            </AnimatePresence>
          </button>
        }
      />
      <Collapse show={caps} reduced={p.reduced}>
        <p id={capsId} className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[#fff6e5] px-2 py-1 text-[12px] font-medium text-[#97600b]">
          <ArrowBigUp size={14} aria-hidden />
          Caps Lock がオンになっています
        </p>
      </Collapse>
      {p.below}
    </div>
  )
}

function StrengthMeter({ password, reduced }: { password: string; reduced: boolean }) {
  const { score, label, tip } = scorePassword(password)
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8eaf1]">
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{ width: score >= i ? '100%' : '0%', backgroundColor: STRENGTH_COLOR[score] }}
              transition={{ duration: reduced ? 0 : 0.35, ease: EASE, delay: reduced ? 0 : (i - 1) * 0.04 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px]">
        <span className="text-[#6b7186]">{tip}</span>
        {label && (
          <span className="shrink-0 font-semibold" style={{ color: STRENGTH_COLOR[score] }}>
            強度: {label}
          </span>
        )}
      </div>
    </div>
  )
}

function Checkbox({ checked, onChange, children, id }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-[12.5px] leading-snug text-[#4a5068]">
      <span className="relative mt-px grid h-4 w-4 shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 h-4 w-4 cursor-pointer appearance-none rounded border border-[#c5cad8] bg-white transition-colors checked:border-[#3546c8] checked:bg-[#3546c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3546c8]/40 focus-visible:ring-offset-1"
        />
        <svg viewBox="0 0 16 16" className="pointer-events-none relative h-3 w-3 text-white" aria-hidden>
          <motion.path
            d="M3.5 8.5l3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  )
}

/** 再送までのカウントダウン */
function useCountdown(sec: number) {
  const [left, setLeft] = useState(sec)
  useEffect(() => {
    if (left <= 0) return
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => window.clearTimeout(t)
  }, [left])
  return [left, () => setLeft(sec)] as const
}

/* ───────────── ブランドパネル ───────────── */

const PANEL_COPY: Record<string, { icon: ReactNode; title: string; body: string }> = {
  signin: {
    icon: <Lock size={30} strokeWidth={1.6} />,
    title: '考えと仕事を、ひとつの布に。',
    body: 'ドキュメント・タスク・会話が、組子細工のようにきれいに組み合わさるチームのワークスペース。',
  },
  signup: {
    icon: <Sparkles size={30} strokeWidth={1.6} />,
    title: 'チームの“組子”を、ここから。',
    body: '14日間すべての機能を無料で。クレジットカードの登録は不要です。',
  },
  passkey: {
    icon: <Fingerprint size={32} strokeWidth={1.5} />,
    title: 'パスワードのいらないサインイン',
    body: 'パスキーはこのデバイスの中だけに鍵を持つため、フィッシングで盗まれることがありません。',
  },
  magic: {
    icon: <Mail size={30} strokeWidth={1.6} />,
    title: 'メールひとつで、すぐに入れる',
    body: '届いたリンクを押すだけ。リンクは15分で失効し、一度しか使えません。',
  },
  sso: {
    icon: <Building2 size={30} strokeWidth={1.6} />,
    title: '組織のアカウントでまとめて管理',
    body: 'SAML / OIDC に対応。入退社にあわせてアクセス権が自動で切り替わります。',
  },
  otp: {
    icon: <ShieldCheck size={32} strokeWidth={1.5} />,
    title: 'もう一段の守りを',
    body: '2段階認証をオンにすると、パスワードが漏れてもアカウントは守られます。',
  },
  reset: {
    icon: <KeyRound size={30} strokeWidth={1.6} />,
    title: 'パスワードを安全に再設定',
    body: '再設定リンクはご本人のメールアドレスにだけ届きます。',
  },
  welcome: {
    icon: <Check size={34} strokeWidth={2.2} />,
    title: '準備ができました',
    body: 'おかえりなさい。今日もいい一日になりますように。',
  },
}

function panelKey(view: View, mode: Mode) {
  if (view === 'auth') return mode
  if (view === 'magic-sent') return 'magic'
  if (view === 'forgot' || view === 'forgot-sent') return 'reset'
  return view
}

function FloatCard({
  children,
  className,
  delay,
  reduced,
}: {
  children: ReactNode
  className: string
  delay: number
  reduced: boolean
}) {
  return (
    <motion.div
      className={`absolute rounded-xl border border-white/15 bg-white/[0.09] p-2.5 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md ${className}`}
      initial={{ opacity: 0, y: reduced ? 0 : 14 }}
      animate={
        reduced
          ? { opacity: 1, y: 0 }
          : { opacity: 1, y: [0, -7, 0], transition: { opacity: { duration: 0.6, delay }, y: { duration: 5 + delay * 2, repeat: Infinity, ease: 'easeInOut', delay } } }
      }
      aria-hidden
    >
      {children}
    </motion.div>
  )
}

function BrandPanel({ view, mode, reduced }: { view: View; mode: Mode; reduced: boolean }) {
  const uid = useId().replace(/:/g, '')
  const key = panelKey(view, mode)
  const copy = PANEL_COPY[key] ?? PANEL_COPY.signin
  const hex = (r: number, cx = 130, cy = 130, rot = -90) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = ((60 * i + rot) * Math.PI) / 180
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
    })
  const outer = hex(104)
  const inner = hex(60, 130, 130, -60)
  const welcome = view === 'welcome'

  return (
    <aside className="relative hidden w-[43%] max-w-[540px] shrink-0 flex-col overflow-hidden bg-[#121a46] text-white @3xl:flex" aria-label="Kumiko の紹介">
      {/* 背景: 三角格子(組子) + 走る光 */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1d2a78" />
            <stop offset="0.55" stopColor="#141c50" />
            <stop offset="1" stopColor="#0d1236" />
          </linearGradient>
          {(['a', 'b'] as const).flatMap((tone) =>
            [0, 60, 120].map((deg) => (
              <pattern key={tone + deg} id={`${uid}${tone}${deg}`} width="40" height="34.64" patternUnits="userSpaceOnUse" patternTransform={`rotate(${deg})`}>
                <line x1="0" y1="0.5" x2="40" y2="0.5" stroke={tone === 'a' ? 'rgba(255,255,255,0.075)' : 'rgba(255,138,99,0.55)'} strokeWidth="1" />
              </pattern>
            )),
          )}
          <radialGradient id={`${uid}fade`} cx="50%" cy="45%" r="70%">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={`${uid}m`}>
            <rect width="100%" height="100%" fill={`url(#${uid}fade)`} />
          </mask>
          <radialGradient id={`${uid}spot`}>
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={`${uid}sm`}>
            <motion.circle
              r="170"
              fill={`url(#${uid}spot)`}
              initial={{ cx: 60, cy: 120 }}
              animate={reduced ? { cx: 260, cy: 300 } : { cx: [60, 420, 160, 60], cy: [120, 260, 560, 120] }}
              transition={reduced ? { duration: 0 } : { duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${uid}bg)`} />
        <g mask={`url(#${uid}m)`}>
          {[0, 60, 120].map((deg) => (
            <rect key={deg} width="100%" height="100%" fill={`url(#${uid}a${deg})`} />
          ))}
        </g>
        <g mask={`url(#${uid}sm)`}>
          {[0, 60, 120].map((deg) => (
            <rect key={deg} width="100%" height="100%" fill={`url(#${uid}b${deg})`} />
          ))}
        </g>
      </svg>

      <div className="relative flex items-center gap-2.5 px-8 pt-7">
        <KumikoMark size={30} onDark />
        <span className="text-[17px] font-bold tracking-[0.02em]">Kumiko</span>
      </div>

      {/* エンブレム */}
      <div className="relative grid flex-1 place-items-center">
        <div className="relative h-[260px] w-[260px]">
          <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <motion.polygon
              points={outer.map((p) => p.join(',')).join(' ')}
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(255,255,255,0.32)"
              strokeWidth="1.2"
              strokeLinejoin="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
            />
            {outer.map((p, i) => (
              <motion.line
                key={i}
                x1="130"
                y1="130"
                x2={p[0]}
                y2={p[1]}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1"
                initial={{ pathLength: reduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, delay: reduced ? 0 : 0.6 + i * 0.08 }}
              />
            ))}
            {/* 外六角と内六角をつなぐ麻の葉の三角 */}
            {outer.map((p, i) => {
              const q = outer[(i + 1) % 6]
              const m = inner[i]
              return (
                <motion.polygon
                  key={`t${i}`}
                  points={`${p.join(',')} ${q.join(',')} ${m.join(',')}`}
                  fill={i === 1 || i === 4 ? '#ef6a45' : 'rgba(255,255,255,0.035)'}
                  fillOpacity={i === 1 || i === 4 ? 0.55 : 1}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="0.8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: reduced ? 0 : 1.1 + i * 0.07 }}
                />
              )
            })}
            <motion.g
              style={{ originX: '130px', originY: '130px' }}
              animate={reduced ? { rotate: 0 } : { rotate: 360 }}
              transition={reduced ? { duration: 0 } : { duration: 60, repeat: Infinity, ease: 'linear' }}
            >
              <circle cx="130" cy="130" r="124" fill="none" stroke="rgba(255,255,255,0.16)" strokeDasharray="2 7" />
            </motion.g>
          </svg>

          <div className="absolute left-1/2 top-1/2 grid h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[#18225e]/80 shadow-[0_0_0_8px_rgba(255,255,255,0.04),0_20px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={key}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 30 }}
                transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 22 }}
                className={`grid h-14 w-14 place-items-center rounded-full ${welcome ? 'bg-[#1a9e6a] text-white' : 'text-white'}`}
              >
                {copy.icon}
              </motion.span>
            </AnimatePresence>
            {welcome && !reduced && (
              <span className="pointer-events-none absolute inset-0" aria-hidden>
                {Array.from({ length: 10 }, (_, i) => {
                  const a = (i / 10) * Math.PI * 2
                  return (
                    <motion.span
                      key={i}
                      className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
                      style={{ background: i % 2 ? '#ef6a45' : '#ffd27a' }}
                      initial={{ x: -3, y: -3, opacity: 1, scale: 1 }}
                      animate={{ x: Math.cos(a) * 90 - 3, y: Math.sin(a) * 90 - 3, opacity: 0, scale: 0.3 }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
                    />
                  )
                })}
              </span>
            )}
          </div>

          <FloatCard className="-left-[64px] -top-[4px] w-[124px]" delay={0.2} reduced={reduced}>
            <div className="text-[10px] font-semibold text-white/90">週次定例メモ</div>
            <div className="mt-1.5 space-y-1">
              <div className="h-1 w-full rounded bg-white/30" />
              <div className="h-1 w-4/5 rounded bg-white/20" />
              <div className="h-1 w-3/5 rounded bg-white/20" />
            </div>
          </FloatCard>
          <FloatCard className="-right-[70px] top-[104px] w-[128px]" delay={0.5} reduced={reduced}>
            <div className="text-[10px] font-semibold text-white/90">リリース準備</div>
            {['QA 完了', '告知文', 'ストア申請'].map((t, i) => (
              <div key={t} className="mt-1 flex items-center gap-1.5 text-[9.5px] text-white/75">
                <span className={`grid h-2.5 w-2.5 place-items-center rounded-[3px] ${i < 2 ? 'bg-[#ef6a45]' : 'border border-white/40'}`}>
                  {i < 2 && <Check size={8} strokeWidth={4} />}
                </span>
                <span className={i < 2 ? 'line-through decoration-white/40' : ''}>{t}</span>
              </div>
            ))}
          </FloatCard>
          <FloatCard className="-left-[48px] -bottom-[8px] flex w-[150px] items-center gap-2" delay={0.8} reduced={reduced}>
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
              <defs>
                <linearGradient id={`${uid}av`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffb38f" />
                  <stop offset="1" stopColor="#ef6a45" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="12" fill={`url(#${uid}av)`} />
              <circle cx="12" cy="10" r="4" fill="#fff" fillOpacity="0.85" />
              <path d="M4.5 20.5c1.6-3.4 4.3-4.8 7.5-4.8s5.9 1.4 7.5 4.8" fill="#fff" fillOpacity="0.85" />
            </svg>
            <div className="min-w-0">
              <div className="text-[9px] text-white/60">森下 葵</div>
              <div className="truncate text-[10px] text-white/90">レビューお願いします！</div>
            </div>
          </FloatCard>
        </div>
      </div>

      <div className="relative px-8 pb-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -6 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-[19px] font-bold leading-snug tracking-[0.01em]">{copy.title}</p>
            <p className="mt-2 max-w-[340px] text-[12.5px] leading-relaxed text-white/65">{copy.body}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-5 flex items-center gap-2 text-[11px] text-white/45">
          <ShieldCheck size={13} aria-hidden />
          通信はすべて暗号化されています
        </div>
      </div>
    </aside>
  )
}

/* ───────────── 画面: サインイン / 新規登録 ───────────── */

type AuthState = {
  mode: Mode
  setMode: (m: Mode) => void
  email: string
  setEmail: (v: string) => void
  name: string
  setName: (v: string) => void
  password: string
  setPassword: (v: string) => void
  validPassword: string
  notice: string | null
  setNotice: (v: string | null) => void
  autoFocus: boolean
}

function CredentialsView({
  s,
  reduced,
  onSignedIn,
  onSignedUp,
  onSso,
  onPasskey,
  onMagic,
  onForgot,
}: {
  s: AuthState
  reduced: boolean
  onSignedIn: () => void
  onSignedUp: () => void
  onSso: (org: Org | null) => void
  onPasskey: () => void
  onMagic: () => void
  onForgot: () => void
}) {
  const uid = useId()
  const [scope, animateEl] = useAnimate<HTMLFormElement>()
  const [touched, setTouched] = useState({ email: false, name: false, password: false })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [terms, setTerms] = useState(false)
  const pwRef = useRef<HTMLInputElement>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const signup = s.mode === 'signup'
  const org = findOrg(s.email)
  const ssoLock = !signup && !!org
  const emailOk = isEmail(s.email)
  const strength = scorePassword(s.password).score

  const emailErr =
    (touched.email || submitted) && !emailOk ? (s.email.trim() ? 'メールアドレスの形式が正しくありません' : 'メールアドレスを入力してください') : null
  const nameErr = signup && (touched.name || submitted) && !s.name.trim() ? 'お名前を入力してください' : null
  const pwErr = ssoLock
    ? null
    : submitted && !s.password
      ? 'パスワードを入力してください'
      : signup && (touched.password || submitted) && s.password && strength < 2
        ? 'もう少し強いパスワードにしてください'
        : null
  const termsErr = signup && submitted && !terms

  const shake = () => {
    if (!scope.current) return
    if (reduced) animateEl(scope.current, { opacity: [1, 0.6, 1] }, { duration: 0.25 })
    else animateEl(scope.current, { x: [0, -11, 10, -7, 5, -2, 0] }, { duration: 0.46, ease: 'easeOut' })
  }

  const switchMode = (m: Mode) => {
    if (m === s.mode) return
    s.setMode(m)
    setSubmitted(false)
    setError(null)
    setTouched({ email: false, name: false, password: false })
    s.setNotice(null)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setError(null)
    if (ssoLock && emailOk) {
      onSso(org)
      return
    }
    const bad = !emailOk || !s.password || (signup && (!s.name.trim() || strength < 2 || !terms))
    if (bad) {
      shake()
      return
    }
    setLoading(true)
    timer.current = window.setTimeout(() => {
      setLoading(false)
      if (signup) {
        onSignedUp()
        return
      }
      if (s.password === s.validPassword) {
        onSignedIn()
      } else {
        const n = attempts + 1
        setAttempts(n)
        setError(
          n >= 3
            ? `パスワードが${n}回続けて違います。下の「パスワードをお忘れですか？」から再設定できます。`
            : 'メールアドレスまたはパスワードが正しくありません。',
        )
        shake()
        pwRef.current?.select()
      }
    }, 850)
  }

  return (
    <div>
      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={s.mode}
            initial={{ opacity: 0, y: reduced ? 0 : 6, filter: reduced ? 'none' : 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: reduced ? 0 : -6, filter: reduced ? 'none' : 'blur(4px)' }}
            transition={{ duration: 0.25 }}
          >
            <Heading
              title={signup ? 'アカウントを作成' : 'おかえりなさい'}
              sub={signup ? '14日間、すべての機能を無料で試せます。' : 'Kumiko にサインインして続けましょう。'}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div role="group" aria-label="サインインか新規登録かを選ぶ" className="relative mt-5 grid grid-cols-2 rounded-[10px] bg-[#eef0f5] p-1">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            aria-pressed={s.mode === m}
            className={`relative h-8 rounded-[7px] text-[13px] font-semibold transition-colors ${FOCUS} ${
              s.mode === m ? 'text-[#161a2e]' : 'text-[#6b7186] hover:text-[#161a2e]'
            }`}
          >
            {s.mode === m && (
              <motion.span
                layoutId={`${uid}-seg`}
                className="absolute inset-0 rounded-[7px] bg-white shadow-[0_1px_2px_rgba(22,26,46,0.12),0_0_0_1px_rgba(22,26,46,0.04)]"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            <span className="relative">{m === 'signin' ? 'サインイン' : '新規登録'}</span>
          </button>
        ))}
      </div>

      <Collapse show={!!s.notice} reduced={reduced}>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#1a9e6a]/25 bg-[#ecf8f2] px-3 py-2.5 text-[12.5px] leading-snug text-[#11724c]" role="status">
          <CheckCircle2 size={15} className="mt-px shrink-0" aria-hidden />
          <span>{s.notice}</span>
        </div>
      </Collapse>

      <form ref={scope} onSubmit={submit} noValidate className="mt-1">
        <Collapse show={signup} reduced={reduced}>
          <div className="pt-3.5">
            <TextField
              id={`${uid}-name`}
              label="お名前"
              value={s.name}
              onChange={s.setName}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              icon={<User size={16} />}
              placeholder="山田 花子"
              autoComplete="name"
              error={nameErr}
              valid={!!s.name.trim()}
              reduced={reduced}
            />
          </div>
        </Collapse>

        <div className="pt-3.5">
          <TextField
            id={`${uid}-email`}
            label={signup ? '仕事用メールアドレス' : 'メールアドレス'}
            type="email"
            value={s.email}
            onChange={(v) => {
              s.setEmail(v)
              setError(null)
            }}
            onBlur={() => setTouched((t) => ({ ...t, email: !!s.email || t.email }))}
            icon={<Mail size={16} />}
            placeholder="you@example.jp"
            autoComplete="email"
            autoFocus={s.autoFocus}
            error={emailErr}
            valid={emailOk}
            reduced={reduced}
          />
        </div>

        <Collapse show={ssoLock} reduced={reduced}>
          {org && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#dfe2ea] bg-[#f7f8fc] px-3 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[14px] font-bold text-white" style={{ background: org.color }} aria-hidden>
                {org.glyph}
              </span>
              <p className="text-[12px] leading-snug text-[#4a5068]">
                <span className="font-semibold text-[#161a2e]">{org.name}</span> はシングルサインオンを利用しています。パスワードは不要です。
              </p>
            </div>
          )}
        </Collapse>

        <Collapse show={!ssoLock} reduced={reduced}>
          <div className="pt-3.5">
            <PasswordField
              id={`${uid}-pw`}
              label="パスワード"
              value={s.password}
              onChange={(v) => {
                s.setPassword(v)
                setError(null)
              }}
              onBlur={() => setTouched((t) => ({ ...t, password: !!s.password || t.password }))}
              placeholder={signup ? '8文字以上' : '••••••••'}
              autoComplete={signup ? 'new-password' : 'current-password'}
              inputRef={pwRef}
              error={pwErr}
              reduced={reduced}
              labelAside={
                !signup && (
                  <button
                    type="button"
                    onClick={onForgot}
                    className={`rounded text-[12px] font-medium transition-colors ${attempts >= 3 ? 'text-[#c24a26] underline underline-offset-2' : 'text-[#3546c8] hover:text-[#2b3bb0]'} ${FOCUS}`}
                  >
                    パスワードをお忘れですか？
                  </button>
                )
              }
              below={
                <Collapse show={signup} reduced={reduced}>
                  <StrengthMeter password={s.password} reduced={reduced} />
                </Collapse>
              }
            />
          </div>
        </Collapse>

        <Collapse show={signup} reduced={reduced}>
          <div className="pt-3.5">
            <Checkbox id={`${uid}-terms`} checked={terms} onChange={setTerms}>
              <span className={termsErr ? 'text-[#c9323f]' : ''}>利用規約とプライバシーポリシーに同意します</span>
            </Checkbox>
          </div>
        </Collapse>

        <Collapse show={!!error} reduced={reduced}>
          <div className="mt-3.5 flex items-start gap-2 rounded-lg border border-[#d93f4c]/25 bg-[#fdf0f1] px-3 py-2.5 text-[12.5px] leading-snug text-[#b02a37]" role="alert">
            <AlertCircle size={15} className="mt-px shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        </Collapse>

        <div className="pt-4">
          <PrimaryButton loading={loading} tone={ssoLock ? 'org' : 'primary'}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={ssoLock ? 'sso' : s.mode}
                initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -8 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1.5"
              >
                {ssoLock ? (
                  <>
                    <Building2 size={15} aria-hidden />
                    {org?.name} の SSO で続行
                  </>
                ) : signup ? (
                  'アカウントを作成'
                ) : (
                  'サインイン'
                )}
                {!ssoLock && <ArrowRight size={15} aria-hidden />}
              </motion.span>
            </AnimatePresence>
          </PrimaryButton>
        </div>
      </form>

      <div className="my-4 flex items-center gap-3 text-[11.5px] text-[#9097ad]">
        <span className="h-px flex-1 bg-[#e3e5ee]" />
        または
        <span className="h-px flex-1 bg-[#e3e5ee]" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'パスキー', icon: <Fingerprint size={16} />, on: onPasskey },
          { label: 'メールリンク', icon: <Wand2 size={16} />, on: onMagic },
          { label: '会社の SSO', icon: <Building2 size={16} />, on: () => onSso(null) },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.on}
            className={`flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#dfe2ea] bg-white px-1 text-[12px] font-semibold text-[#2c3148] transition-[border-color,background-color,transform] hover:border-[#c8ccd9] hover:bg-[#f7f8fb] active:scale-[0.97] ${FOCUS}`}
          >
            <span className="text-[#3546c8]" aria-hidden>
              {b.icon}
            </span>
            <span className="truncate">{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ───────────── 画面: パスキー ───────────── */

function PasskeyView({ reduced, onBack, onDone }: { reduced: boolean; onBack: () => void; onDone: () => void }) {
  const progress = useMotionValue(0)
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'released' | 'done'>('idle')
  const anim = useRef<ReturnType<typeof animate> | null>(null)
  const timer = useRef(0)
  const R = 74
  const C = 2 * Math.PI * R
  const dash = useTransform(progress, (v) => C * (1 - v))
  const clip = useTransform(progress, (v) => `inset(${(1 - v) * 100}% 0 0 0)`)
  const lineY = useTransform(progress, (v) => `${(1 - v) * 100}%`)

  useEffect(
    () => () => {
      anim.current?.stop()
      window.clearTimeout(timer.current)
    },
    [],
  )

  const start = () => {
    if (phase === 'done') return
    setPhase('scanning')
    anim.current?.stop()
    anim.current = animate(progress, 1, {
      duration: 1.5 * (1 - progress.get()),
      ease: 'linear',
      onComplete: () => {
        setPhase('done')
        timer.current = window.setTimeout(onDone, 900)
      },
    })
  }
  const stop = () => {
    if (phase !== 'scanning') return
    anim.current?.stop()
    setPhase('released')
    anim.current = animate(progress, 0, { duration: reduced ? 0.1 : 0.45, ease: EASE })
  }

  const msg =
    phase === 'done'
      ? '本人確認ができました'
      : phase === 'scanning'
        ? 'スキャンしています…そのまま離さないで'
        : phase === 'released'
          ? '途中で離れました。もう一度長押ししてください'
          : '指紋ボタンを長押ししてください'

  return (
    <div>
      <BackLink onClick={onBack} />
      <div className="mt-4">
        <Heading title="パスキーでサインイン" sub="このデバイスの指紋または顔認証で本人確認します。パスワードは送信されません。" />
      </div>
      <div className="mt-6 flex flex-col items-center">
        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            start()
          }}
          onPointerUp={stop}
          onPointerCancel={stop}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault()
              start()
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') stop()
          }}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="指紋センサー(長押しでスキャン)"
          className={`relative grid h-[172px] w-[172px] touch-none select-none place-items-center rounded-full ${FOCUS}`}
        >
          <svg viewBox="0 0 172 172" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <circle cx="86" cy="86" r={R} fill="none" stroke="#e8eaf1" strokeWidth="5" />
            <motion.circle
              cx="86"
              cy="86"
              r={R}
              fill="none"
              stroke={phase === 'done' ? '#1a9e6a' : '#3546c8'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={C}
              style={{ strokeDashoffset: dash }}
            />
          </svg>
          <motion.span
            className={`relative grid h-[128px] w-[128px] place-items-center overflow-hidden rounded-full ${phase === 'done' ? 'bg-[#ecf8f2]' : 'bg-[#f2f3fa]'}`}
            animate={phase === 'scanning' && !reduced ? { scale: 0.96 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {phase === 'done' ? (
                <motion.span
                  key="ok"
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  className="grid h-16 w-16 place-items-center rounded-full bg-[#1a9e6a] text-white"
                >
                  <Check size={34} strokeWidth={2.6} />
                </motion.span>
              ) : (
                <motion.span key="fp" exit={{ opacity: 0, scale: 0.8 }} className="relative grid place-items-center">
                  <Fingerprint size={78} strokeWidth={1.2} className="text-[#c3c8d8]" />
                  <motion.span className="absolute inset-0 grid place-items-center text-[#3546c8]" style={{ clipPath: clip }}>
                    <Fingerprint size={78} strokeWidth={1.2} />
                  </motion.span>
                  {!reduced && phase === 'scanning' && (
                    <motion.span
                      className="absolute -left-3 -right-3 h-[2px] rounded-full bg-[#ef6a45] shadow-[0_0_10px_2px_rgba(239,106,69,0.55)]"
                      style={{ top: lineY }}
                    />
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </button>
        <p className="mt-4 h-5 text-[13px] font-medium text-[#4a5068]" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={msg}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className={`inline-block ${phase === 'done' ? 'text-[#11724c]' : phase === 'released' ? 'text-[#97600b]' : ''}`}
            >
              {msg}
            </motion.span>
          </AnimatePresence>
        </p>
        <p className="mt-1 text-[11.5px] text-[#8a90a6]">キーボードでは Space を押し続けてもスキャンできます</p>
      </div>
    </div>
  )
}

/* ───────────── メール送信済みの共通画面 ───────────── */

function MailIllustration({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative mx-auto h-[104px] w-[150px]" aria-hidden>
      <svg viewBox="0 0 150 104" className="absolute inset-0 h-full w-full overflow-visible">
        {/* 封筒の背面 */}
        <path d="M18 40 L75 6 L132 40 V96 a6 6 0 0 1 -6 6 H24 a6 6 0 0 1 -6 -6 Z" fill="#dfe3f6" />
        {/* 手紙 */}
        <motion.g initial={{ y: reduced ? -18 : 18 }} animate={{ y: -18 }} transition={{ duration: 0.8, delay: 0.25, ease: EASE }}>
          <rect x="32" y="28" width="86" height="62" rx="5" fill="#fff" stroke="#d3d8ec" />
          <rect x="42" y="40" width="40" height="5" rx="2.5" fill="#3546c8" />
          <rect x="42" y="51" width="64" height="4" rx="2" fill="#e3e6f1" />
          <rect x="42" y="60" width="54" height="4" rx="2" fill="#e3e6f1" />
          <rect x="42" y="72" width="30" height="9" rx="4.5" fill="#ef6a45" />
        </motion.g>
        {/* 封筒の前面 */}
        <path d="M18 46 L75 76 L132 46 V96 a6 6 0 0 1 -6 6 H24 a6 6 0 0 1 -6 -6 Z" fill="#c7cdf0" />
        <path d="M18 100 L62 70 M132 100 L88 70" stroke="#b3bbe8" strokeWidth="1.5" />
      </svg>
      {!reduced &&
        [
          { x: 6, y: 14, d: 0.6, c: '#ef6a45' },
          { x: 138, y: 8, d: 0.8, c: '#3546c8' },
          { x: 142, y: 58, d: 1, c: '#ffc34d' },
          { x: 0, y: 66, d: 1.1, c: '#3546c8' },
        ].map((s, i) => (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: s.x, top: s.y, color: s.c }}
            initial={{ scale: 0, opacity: 0, rotate: -45 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.9], rotate: 0 }}
            transition={{ duration: 0.6, delay: s.d }}
          >
            <Sparkles size={13} />
          </motion.span>
        ))}
    </div>
  )
}

function MailSentView({
  reduced,
  email,
  title,
  body,
  demoLabel,
  onDemo,
  onBack,
  backLabel,
}: {
  reduced: boolean
  email: string
  title: string
  body: string
  demoLabel: string
  onDemo: () => void
  onBack: () => void
  backLabel: string
}) {
  const [left, restart] = useCountdown(RESEND_SEC)
  const [resent, setResent] = useState(0)
  return (
    <div className="text-center">
      <MailIllustration reduced={reduced} />
      <h2 className="mt-5 text-[22px] font-bold tracking-[-0.01em] text-[#161a2e]">{title}</h2>
      <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-relaxed text-[#5d6378]">
        <span className="font-semibold break-all text-[#161a2e]">{email}</span> {body}
      </p>
      <div className="mt-6">
        <PrimaryButton type="button" onClick={onDemo}>
          <MailCheck size={16} aria-hidden />
          {demoLabel}
        </PrimaryButton>
      </div>
      <div className="mt-4 flex h-6 items-center justify-center text-[12.5px] text-[#6b7186]" aria-live="polite">
        {left > 0 ? (
          <span>
            {resent > 0 && <span className="mr-1.5 font-medium text-[#11724c]">再送信しました。</span>}
            再送信できるまで <span className="font-mono tabular-nums text-[#161a2e]">0:{String(left).padStart(2, '0')}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              restart()
              setResent((n) => n + 1)
            }}
            className={`inline-flex items-center gap-1 rounded px-1 font-semibold text-[#3546c8] hover:text-[#2b3bb0] ${FOCUS}`}
          >
            <RotateCw size={13} aria-hidden />
            メールを再送信
          </button>
        )}
      </div>
      <div className="mt-3">
        <BackLink onClick={onBack}>{backLabel}</BackLink>
      </div>
      <p className="mt-5 text-[11.5px] leading-relaxed text-[#8a90a6]">届かない場合は迷惑メールフォルダもご確認ください。</p>
    </div>
  )
}

/* ───────────── 画面: マジックリンク(メール入力) / パスワード再設定 ───────────── */

function EmailOnlyView({
  reduced,
  email,
  setEmail,
  title,
  sub,
  icon,
  cta,
  onBack,
  onSubmit,
}: {
  reduced: boolean
  email: string
  setEmail: (v: string) => void
  title: string
  sub: string
  icon: ReactNode
  cta: string
  onBack: () => void
  onSubmit: () => void
}) {
  const uid = useId()
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scope, animateEl] = useAnimate<HTMLFormElement>()
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const ok = isEmail(email)
  return (
    <div>
      <BackLink onClick={onBack} />
      <div className="mt-4">
        <Heading icon={icon} title={title} sub={sub} />
      </div>
      <form
        ref={scope}
        noValidate
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault()
          setTouched(true)
          if (!ok) {
            if (scope.current && !reduced) animateEl(scope.current, { x: [0, -10, 9, -6, 3, 0] }, { duration: 0.4 })
            return
          }
          setLoading(true)
          timer.current = window.setTimeout(onSubmit, 700)
        }}
      >
        <TextField
          id={`${uid}-e`}
          label="メールアドレス"
          type="email"
          value={email}
          onChange={setEmail}
          onBlur={() => setTouched(!!email)}
          icon={<Mail size={16} />}
          placeholder="you@example.jp"
          autoComplete="email"
          autoFocus
          error={touched && !ok ? (email ? 'メールアドレスの形式が正しくありません' : 'メールアドレスを入力してください') : null}
          valid={ok}
          reduced={reduced}
        />
        <div className="pt-4">
          <PrimaryButton loading={loading}>{cta}</PrimaryButton>
        </div>
      </form>
    </div>
  )
}

/* ───────────── 画面: 会社の SSO ───────────── */

function SsoView({
  reduced,
  initial,
  initialOrg,
  onBack,
  onDone,
}: {
  reduced: boolean
  initial: string
  initialOrg: Org | null
  onBack: () => void
  onDone: () => void
}) {
  const uid = useId()
  const [q, setQ] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'checking' | 'found' | 'none'>(initialOrg ? 'found' : 'idle')
  const [org, setOrg] = useState<Org | null>(initialOrg)
  const [step, setStep] = useState(initialOrg ? 0 : -1) // -1: 入力中, 0..3: リダイレクト進行
  const first = useRef(true)

  // 入力をデバウンスしてドメイン照会
  useEffect(() => {
    if (first.current) {
      first.current = false
      if (initialOrg) return
    }
    if (step >= 0) return
    const d = domainOf(q)
    if (!d || !d.includes('.')) {
      setStatus('idle')
      setOrg(null)
      return
    }
    setStatus('checking')
    const t = window.setTimeout(() => {
      const o = findOrg(q)
      setOrg(o)
      setStatus(o ? 'found' : 'none')
    }, 550)
    return () => window.clearTimeout(t)
  }, [q, step, initialOrg])

  // リダイレクトの擬似進行
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })
  useEffect(() => {
    if (step < 0) return
    const t = step >= 3 ? window.setTimeout(() => doneRef.current(), 500) : window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 900 : 750)
    return () => window.clearTimeout(t)
  }, [step])

  const steps = org ? [`${org.idp} に接続`, '組織のアカウントで本人確認', 'Kumiko に戻っています'] : []

  return (
    <div>
      <BackLink onClick={onBack} />
      <div className="mt-4">
        <Heading
          icon={<Building2 size={20} />}
          title="シングルサインオン"
          sub="会社のメールアドレスかドメインを入力すると、所属組織の認証画面に移動します。"
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {step < 0 ? (
          <motion.form
            key="input"
            noValidate
            className="mt-5"
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: 0.2 }}
            onSubmit={(e) => {
              e.preventDefault()
              if (status === 'found') setStep(0)
            }}
          >
            <TextField
              id={`${uid}-d`}
              label="会社のメールまたはドメイン"
              value={q}
              onChange={setQ}
              icon={<Building2 size={16} />}
              placeholder="name@company.co.jp"
              autoComplete="email"
              autoFocus
              reduced={reduced}
              trailing={
                status === 'checking' ? (
                  <span className="mr-2 text-[#9097ad]">
                    <Spinner />
                  </span>
                ) : undefined
              }
              valid={status === 'found'}
            />
            <div className="min-h-[76px] pt-3" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {status === 'found' && org && (
                  <motion.div
                    key={org.domain}
                    initial={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="flex items-center gap-3 rounded-xl border border-[#dfe2ea] bg-white p-3 shadow-[0_6px_20px_-12px_rgba(22,26,46,0.35)]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[17px] font-bold text-white" style={{ background: org.color }} aria-hidden>
                      {org.glyph}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-[#161a2e]">{org.name}</div>
                      <div className="text-[11.5px] text-[#6b7186]">
                        SAML 2.0 · {org.idp} · <span className="font-mono">{org.domain}</span>
                      </div>
                    </div>
                    <CheckCircle2 size={18} className="shrink-0 text-[#1a9e6a]" aria-label="検出済み" />
                  </motion.div>
                )}
                {status === 'none' && (
                  <motion.p
                    key="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-lg bg-[#f5f6fa] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#5d6378]"
                  >
                    <span className="font-mono font-semibold text-[#161a2e]">{domainOf(q)}</span> では SSO が設定されていません。管理者に確認するか、ほかの方法でサインインしてください。
                  </motion.p>
                )}
                {status === 'idle' && (
                  <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] text-[#8a90a6]">
                    例:{' '}
                    {ORGS.map((o, i) => (
                      <span key={o.domain}>
                        {i > 0 && '、'}
                        <button
                          type="button"
                          onClick={() => setQ(o.domain)}
                          className={`rounded font-mono text-[#3546c8] underline-offset-2 hover:underline ${FOCUS}`}
                        >
                          {o.domain}
                        </button>
                      </span>
                    ))}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <PrimaryButton disabled={status !== 'found'} tone="org">
              {org && status === 'found' ? `${org.name} で続行` : 'SSO で続行'}
              <ArrowRight size={15} aria-hidden />
            </PrimaryButton>
          </motion.form>
        ) : (
          <motion.div
            key="redirect"
            initial={{ opacity: 0, y: reduced ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-6 rounded-xl border border-[#dfe2ea] bg-white p-4 shadow-[0_8px_24px_-16px_rgba(22,26,46,0.4)]"
            aria-live="polite"
          >
            {org && (
              <div className="mb-4 flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg text-[14px] font-bold text-white" style={{ background: org.color }} aria-hidden>
                  {org.glyph}
                </span>
                <div className="flex items-center gap-1 text-[12px] text-[#9097ad]" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1 w-1 rounded-full bg-[#9097ad]"
                      animate={reduced ? { opacity: 1 } : { opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
                <KumikoMark size={32} />
                <span className="ml-auto text-[12px] font-semibold text-[#161a2e]">{org.name}</span>
              </div>
            )}
            <ol className="space-y-2.5">
              {steps.map((t, i) => {
                const st = step > i ? 'done' : step === i ? 'doing' : 'todo'
                return (
                  <li key={t} className="flex items-center gap-2.5 text-[13px]">
                    <span className="grid h-5 w-5 place-items-center">
                      {st === 'done' ? (
                        <motion.span
                          initial={{ scale: 0.4 }}
                          animate={{ scale: 1 }}
                          className="grid h-5 w-5 place-items-center rounded-full bg-[#1a9e6a] text-white"
                        >
                          <Check size={12} strokeWidth={3} />
                        </motion.span>
                      ) : st === 'doing' ? (
                        <Spinner className="text-[#3546c8]" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-[#d5d9e5]" />
                      )}
                    </span>
                    <span className={st === 'todo' ? 'text-[#9097ad]' : 'text-[#161a2e]'}>{t}</span>
                  </li>
                )
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────── 画面: 2段階認証 / メール確認コード ───────────── */

function OtpBoxes({
  value,
  setValue,
  status,
  disabled,
  autoFocus,
  refs,
  onFilled,
}: {
  value: string[]
  setValue: (v: string[]) => void
  status: 'idle' | 'error' | 'ok'
  disabled: boolean
  autoFocus: boolean
  refs: RefObject<(HTMLInputElement | null)[]>
  onFilled: (code: string) => void
}) {
  const focus = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(5, i))]
    el?.focus()
    el?.select()
  }
  const commit = (next: string[], focusIdx: number) => {
    setValue(next)
    if (next.every((d) => d)) {
      refs.current[Math.min(5, focusIdx)]?.blur()
      onFilled(next.join(''))
    } else focus(focusIdx)
  }
  const spread = (from: number, digits: string) => {
    const start = digits.length >= 6 ? 0 : from
    const next = [...value]
    digits
      .slice(0, 6 - start)
      .split('')
      .forEach((d, k) => (next[start + k] = d))
    commit(next, Math.min(5, start + digits.length))
  }

  return (
    <div className="flex items-center justify-center gap-1.5 @md:gap-2" role="group" aria-label="6桁の確認コード">
      {value.map((d, i) => (
        <div key={i} className="contents">
          {i === 3 && <span className="mx-0.5 h-0.5 w-2.5 rounded bg-[#c8ccd9]" aria-hidden />}
          <motion.input
            ref={(el: HTMLInputElement | null) => {
              refs.current[i] = el
            }}
            value={d}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && i === 0}
            aria-label={`${i + 1}桁目`}
            maxLength={6}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (/^\d$/.test(e.key)) {
                e.preventDefault()
                const next = [...value]
                next[i] = e.key
                commit(next, i + 1)
              } else if (e.key === 'Backspace') {
                e.preventDefault()
                const next = [...value]
                if (next[i]) {
                  next[i] = ''
                  setValue(next)
                } else if (i > 0) {
                  next[i - 1] = ''
                  setValue(next)
                  focus(i - 1)
                }
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                focus(i - 1)
              } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                focus(i + 1)
              }
            }}
            onChange={(e) => {
              // 貼り付け・自動入力・IME 経由
              const digits = e.target.value.replace(/\D/g, '')
              if (!digits) return
              spread(i, digits)
            }}
            onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
              e.preventDefault()
              const digits = e.clipboardData.getData('text').replace(/\D/g, '')
              if (digits) spread(i, digits)
            }}
            animate={d && status === 'idle' ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.18 }}
            className={`h-12 w-10 rounded-lg border bg-white text-center font-mono text-[22px] font-semibold text-[#161a2e] caret-[#3546c8] outline-none transition-[border-color,box-shadow,background-color] @md:h-[52px] @md:w-11 ${
              status === 'error'
                ? 'border-[#d93f4c] bg-[#fdf3f4] text-[#b02a37]'
                : status === 'ok'
                  ? 'border-[#1a9e6a] bg-[#ecf8f2] text-[#11724c]'
                  : d
                    ? 'border-[#9aa3d9] focus:border-[#3546c8] focus:shadow-[0_0_0_3px_rgba(53,70,200,0.15)]'
                    : 'border-[#dfe2ea] focus:border-[#3546c8] focus:shadow-[0_0_0_3px_rgba(53,70,200,0.15)]'
            }`}
          />
        </div>
      ))}
    </div>
  )
}

function OtpView({
  reduced,
  purpose,
  email,
  onBack,
  onDone,
}: {
  reduced: boolean
  purpose: '2fa' | 'verify'
  email: string
  onBack: () => void
  onDone: () => void
}) {
  const uid = useId()
  const [value, setValue] = useState<string[]>(Array(6).fill(''))
  const [status, setStatus] = useState<'idle' | 'checking' | 'error' | 'ok'>('idle')
  const [remember, setRemember] = useState(true)
  const [left, restart] = useCountdown(RESEND_SEC)
  const [scope, animateEl] = useAnimate<HTMLDivElement>()
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const verify = (code: string) => {
    setStatus('checking')
    timers.current.push(
      window.setTimeout(() => {
        if (code === DEMO_CODE) {
          setStatus('ok')
          timers.current.push(window.setTimeout(onDone, 750))
        } else {
          setStatus('error')
          if (scope.current) {
            if (reduced) animateEl(scope.current, { opacity: [1, 0.5, 1] }, { duration: 0.3 })
            else animateEl(scope.current, { x: [0, -12, 11, -8, 5, -2, 0] }, { duration: 0.46 })
          }
          timers.current.push(
            window.setTimeout(() => {
              setValue(Array(6).fill(''))
              setStatus('idle')
              refs.current[0]?.focus()
            }, 900),
          )
        }
      }, 650),
    )
  }

  const boxStatus = status === 'error' ? 'error' : status === 'ok' ? 'ok' : 'idle'

  return (
    <div>
      <BackLink onClick={onBack}>{purpose === '2fa' ? 'サインインに戻る' : '登録画面に戻る'}</BackLink>
      <div className="mt-4">
        <Heading
          icon={purpose === '2fa' ? <ShieldCheck size={20} /> : <MailCheck size={20} />}
          title={purpose === '2fa' ? '2段階認証' : 'メールアドレスの確認'}
          sub={
            purpose === '2fa' ? (
              '認証アプリに表示されている6桁のコードを入力してください。'
            ) : (
              <>
                <span className="font-semibold break-all text-[#161a2e]">{email}</span> に6桁のコードを送信しました。
              </>
            )
          }
        />
      </div>
      <div ref={scope} className="mt-6">
        <OtpBoxes
          value={value}
          setValue={(v) => {
            setValue(v)
            if (status === 'error') setStatus('idle')
          }}
          status={boxStatus}
          disabled={status === 'checking' || status === 'ok'}
          autoFocus
          refs={refs}
          onFilled={verify}
        />
      </div>
      <div className="mt-3 flex h-5 items-center justify-center text-[12.5px]" aria-live="polite">
        {status === 'checking' && (
          <span className="inline-flex items-center gap-1.5 text-[#5d6378]">
            <Spinner className="text-[#3546c8]" /> 確認しています…
          </span>
        )}
        {status === 'error' && <span className="font-medium text-[#c9323f]">コードが正しくありません。もう一度入力してください</span>}
        {status === 'ok' && (
          <span className="inline-flex items-center gap-1 font-medium text-[#11724c]">
            <CheckCircle2 size={14} aria-hidden /> 確認できました
          </span>
        )}
        {status === 'idle' && <span className="text-[#8a90a6]">貼り付けると6桁がまとめて入ります</span>}
      </div>
      {purpose === '2fa' && (
        <div className="mt-5 flex justify-center">
          <Checkbox id={`${uid}-r`} checked={remember} onChange={setRemember}>
            このデバイスを30日間記憶する
          </Checkbox>
        </div>
      )}
      <div className="mt-5 border-t border-[#eceef4] pt-4 text-center text-[12.5px] text-[#6b7186]">
        {left > 0 ? (
          <span>
            {purpose === '2fa' ? 'SMS でコードを受け取る' : 'コードを再送信'}まで{' '}
            <span className="font-mono tabular-nums text-[#161a2e]">0:{String(left).padStart(2, '0')}</span>
          </span>
        ) : (
          <button type="button" onClick={restart} className={`inline-flex items-center gap-1 rounded px-1 font-semibold text-[#3546c8] hover:text-[#2b3bb0] ${FOCUS}`}>
            <RotateCw size={13} aria-hidden />
            {purpose === '2fa' ? 'SMS でコードを受け取る' : 'コードを再送信'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ───────────── 画面: 新しいパスワード ───────────── */

function ResetView({ reduced, onBack, onDone }: { reduced: boolean; onBack: () => void; onDone: (pw: string) => void }) {
  const uid = useId()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const score = scorePassword(pw).score
  const match = pw2.length > 0 && pw === pw2
  return (
    <div>
      <BackLink onClick={onBack}>キャンセル</BackLink>
      <div className="mt-4">
        <Heading icon={<KeyRound size={20} />} title="新しいパスワードを設定" sub="これまでに使ったことのない、推測されにくいパスワードにしましょう。" />
      </div>
      <form
        noValidate
        className="mt-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitted(true)
          if (score < 2 || !match) return
          setLoading(true)
          timer.current = window.setTimeout(() => onDone(pw), 800)
        }}
      >
        <div className="pt-3">
          <PasswordField
            id={`${uid}-p1`}
            label="新しいパスワード"
            value={pw}
            onChange={setPw}
            autoComplete="new-password"
            autoFocus
            placeholder="8文字以上"
            error={submitted && score < 2 ? 'もう少し強いパスワードにしてください' : null}
            reduced={reduced}
            below={<StrengthMeter password={pw} reduced={reduced} />}
          />
        </div>
        <div className="pt-3.5">
          <PasswordField
            id={`${uid}-p2`}
            label="もう一度入力"
            value={pw2}
            onChange={setPw2}
            autoComplete="new-password"
            placeholder="確認のため再入力"
            error={(submitted || pw2.length >= pw.length) && pw2 && !match ? 'パスワードが一致しません' : submitted && !pw2 ? '確認用のパスワードを入力してください' : null}
            valid={match}
            reduced={reduced}
          />
        </div>
        <div className="pt-4">
          <PrimaryButton loading={loading}>パスワードを更新</PrimaryButton>
        </div>
      </form>
    </div>
  )
}

/* ───────────── 画面: ようこそ ───────────── */

const METHOD_LABEL: Record<Method, string> = {
  password: 'パスワードと2段階認証',
  passkey: 'パスキー',
  magic: 'メールのリンク',
  sso: '組織のシングルサインオン',
}

function WelcomeView({
  reduced,
  name,
  email,
  method,
  isNew,
  onSignOut,
}: {
  reduced: boolean
  name: string
  email: string
  method: Method
  isNew: boolean
  onSignOut: () => void
}) {
  const [opening, setOpening] = useState<string | null>(null)
  const display = name.trim() || (email.includes('@') ? email.split('@')[0] : '森下 葵')
  const workspaces = isNew
    ? [{ id: 'new', name: `${display} のワークスペース`, meta: '作成したばかり · メンバー 1人', color: '#ef6a45', glyph: display.slice(0, 1).toUpperCase() }]
    : [
        { id: 'a', name: 'ミナモ設計 プロダクト部', meta: 'メンバー 12人 · 未読 4件', color: '#3546c8', glyph: 'ミ' },
        { id: 'b', name: '個人のスペース', meta: '自分だけ · 下書き 3件', color: '#0f766e', glyph: display.slice(0, 1).toUpperCase() },
      ]
  return (
    <div>
      <div className="grid h-14 w-14 place-items-center rounded-full bg-[#ecf8f2]">
        <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
          <motion.circle
            cx="20"
            cy="20"
            r="17"
            fill="none"
            stroke="#1a9e6a"
            strokeWidth="3"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <motion.path
            d="M12.5 20.5l5 5 10-11"
            fill="none"
            stroke="#1a9e6a"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, delay: reduced ? 0 : 0.45, ease: 'easeOut' }}
          />
        </svg>
      </div>
      <h2 className="mt-4 text-[22px] font-bold leading-tight tracking-[-0.01em] text-[#161a2e]">
        {isNew ? `ようこそ、${display}さん` : `おかえりなさい、${display}さん`}
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#5d6378]">
        {METHOD_LABEL[method]}で{isNew ? 'アカウントを作成しました' : 'サインインしました'}。開くワークスペースを選んでください。
      </p>

      <ul className="mt-5 space-y-2">
        {workspaces.map((w, i) => (
          <motion.li
            key={w.id}
            initial={{ opacity: 0, y: reduced ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: reduced ? 0 : 0.35 + i * 0.08 }}
          >
            <button
              type="button"
              onClick={() => setOpening(w.id)}
              className={`group flex w-full items-center gap-3 rounded-xl border border-[#e3e5ee] bg-white p-3 text-left transition-[border-color,box-shadow] hover:border-[#c8ccd9] hover:shadow-[0_6px_20px_-14px_rgba(22,26,46,0.45)] ${FOCUS}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[15px] font-bold text-white" style={{ background: w.color }} aria-hidden>
                {w.glyph}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-[#161a2e]">{w.name}</span>
                <span className="block text-[11.5px] text-[#6b7186]">{w.meta}</span>
              </span>
              {opening === w.id ? (
                <Spinner className="text-[#3546c8]" />
              ) : (
                <ChevronRight size={17} className="text-[#a2a7b8] transition-transform group-hover:translate-x-0.5" aria-hidden />
              )}
            </button>
          </motion.li>
        ))}
      </ul>
      <Collapse show={!!opening} reduced={reduced}>
        <p className="mt-3 text-center text-[12px] text-[#8a90a6]">（デモはここまでです。サインアウトすると最初からやり直せます）</p>
      </Collapse>

      <div className="mt-5 flex items-center justify-between border-t border-[#eceef4] pt-4 text-[12px] text-[#8a90a6]">
        <span>このデバイス · 東京 · たった今</span>
        <button
          type="button"
          onClick={onSignOut}
          className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-semibold text-[#4a5068] transition-colors hover:bg-[#f0f1f6] hover:text-[#161a2e] ${FOCUS}`}
        >
          <LogOut size={14} aria-hidden />
          サインアウト
        </button>
      </div>
    </div>
  )
}

/* ───────────── 本体 ───────────── */

export function AuthFlow() {
  const reduced = !!useReducedMotion()
  const [view, setView] = useState<View>('auth')
  const [dir, setDir] = useState(1)
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [validPassword, setValidPassword] = useState(DEFAULT_PASSWORD)
  const [notice, setNotice] = useState<string | null>(null)
  const [method, setMethod] = useState<Method>('password')
  const [purpose, setPurpose] = useState<'2fa' | 'verify'>('2fa')
  const [ssoOrg, setSsoOrg] = useState<Org | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [filled, setFilled] = useState(false)
  const navigated = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // 押したボタンが画面ごと消えるとフォーカスが body に落ちる(Esc も効かなくなる)ので、新しい画面の器へ移す
  const focusOnMount = useCallback((el: HTMLDivElement | null) => {
    if (!el || !navigated.current) return
    const active = document.activeElement
    if (!active || active === document.body || !rootRef.current?.contains(active)) el.focus({ preventScroll: true })
  }, [])

  const go = useCallback((v: View, d = 1) => {
    navigated.current = true
    setDir(d)
    setView(v)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [])
  const back = useCallback(() => go('auth', -1), [go])

  const finish = useCallback(
    (m: Method, created = false) => {
      setMethod(m)
      setIsNew(created)
      go('welcome')
    },
    [go],
  )

  const reset = () => {
    setMode('signin')
    setPassword('')
    setNotice(null)
    setSsoOrg(null)
    setFilled(false)
    go('auth', -1)
  }

  const s: AuthState = {
    mode,
    setMode,
    email,
    setEmail,
    name,
    setName,
    password,
    setPassword,
    validPassword,
    notice,
    setNotice,
    autoFocus: navigated.current,
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 36 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * -28 }),
  }

  const fillDemo = () => {
    if (!isEmail(email)) setEmail('aoi.morishita@example.jp')
    setPassword(validPassword)
    setFilled(true)
    if (mode === 'signup') setMode('signin')
  }

  let content: ReactNode
  switch (view) {
    case 'auth':
      content = (
        <CredentialsView
          s={s}
          reduced={reduced}
          onSignedIn={() => {
            setPurpose('2fa')
            go('otp')
          }}
          onSignedUp={() => {
            setPurpose('verify')
            go('otp')
          }}
          onSso={(org) => {
            setSsoOrg(org)
            go('sso')
          }}
          onPasskey={() => go('passkey')}
          onMagic={() => go(isEmail(email) ? 'magic-sent' : 'magic')}
          onForgot={() => go('forgot')}
        />
      )
      break
    case 'passkey':
      content = <PasskeyView reduced={reduced} onBack={back} onDone={() => finish('passkey')} />
      break
    case 'magic':
      content = (
        <EmailOnlyView
          reduced={reduced}
          email={email}
          setEmail={setEmail}
          icon={<Wand2 size={20} />}
          title="メールでサインイン"
          sub="パスワードの代わりに、ワンクリックでサインインできるリンクをお送りします。"
          cta="サインインリンクを送信"
          onBack={back}
          onSubmit={() => go('magic-sent')}
        />
      )
      break
    case 'magic-sent':
      content = (
        <MailSentView
          reduced={reduced}
          email={email}
          title="メールを確認してください"
          body="にサインイン用のリンクを送りました。リンクは15分間有効です。"
          demoLabel="デモ: メールのリンクを開く"
          onDemo={() => finish('magic')}
          onBack={back}
          backLabel="別の方法でサインイン"
        />
      )
      break
    case 'sso':
      content = (
        <SsoView
          reduced={reduced}
          initial={ssoOrg ? email : ''}
          initialOrg={ssoOrg}
          onBack={back}
          onDone={() => finish('sso')}
        />
      )
      break
    case 'otp':
      content = (
        <OtpView
          reduced={reduced}
          purpose={purpose}
          email={email}
          onBack={back}
          onDone={() => {
            if (purpose === 'verify') setValidPassword(password)
            finish('password', purpose === 'verify')
          }}
        />
      )
      break
    case 'forgot':
      content = (
        <EmailOnlyView
          reduced={reduced}
          email={email}
          setEmail={setEmail}
          icon={<KeyRound size={20} />}
          title="パスワードの再設定"
          sub="登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。"
          cta="再設定リンクを送信"
          onBack={back}
          onSubmit={() => go('forgot-sent')}
        />
      )
      break
    case 'forgot-sent':
      content = (
        <MailSentView
          reduced={reduced}
          email={email}
          title="再設定リンクを送りました"
          body="宛てに、パスワード再設定用のリンクを送りました。リンクは1時間有効です。"
          demoLabel="デモ: 再設定リンクを開く"
          onDemo={() => go('reset')}
          onBack={back}
          backLabel="サインインに戻る"
        />
      )
      break
    case 'reset':
      content = (
        <ResetView
          reduced={reduced}
          onBack={back}
          onDone={(pw) => {
            setValidPassword(pw)
            setPassword('')
            setMode('signin')
            setNotice('パスワードを更新しました。新しいパスワードでサインインしてください。')
            go('auth', -1)
          }}
        />
      )
      break
    case 'welcome':
      content = <WelcomeView reduced={reduced} name={name} email={email} method={method} isNew={isNew} onSignOut={reset} />
      break
  }

  return (
    <div
      ref={rootRef}
      className="@container relative flex h-full w-full overflow-hidden bg-[#fbfaf8] font-sans text-[#161a2e] [color-scheme:light]"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && view !== 'auth' && view !== 'welcome') {
          e.stopPropagation()
          back()
        }
      }}
    >
      <BrandPanel view={view} mode={mode} reduced={reduced} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* 狭い幅ではロゴをフォームの上に */}
        <div className="flex items-center gap-2 px-5 pt-4 @3xl:hidden">
          <KumikoMark size={24} />
          <span className="text-[15px] font-bold">Kumiko</span>
        </div>

        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
          <div className="flex min-h-full flex-col px-5 py-6 @md:px-8">
            <div className="m-auto w-full max-w-[360px]">
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div
                  key={view}
                  ref={focusOnMount}
                  tabIndex={-1}
                  className="outline-none"
                  custom={dir}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: reduced ? 0.14 : 0.26, ease: EASE }}
                >
                  {content}
                </motion.div>
              </AnimatePresence>

              {view !== 'welcome' && (
                <div className="mt-6 rounded-lg border border-dashed border-[#cfd3e2] bg-white/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-[#6b7186]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#4a5068]">デモ用の情報</span>
                    {view === 'auth' && (
                      <button
                        type="button"
                        onClick={fillDemo}
                        className={`rounded px-1 text-[11.5px] font-semibold text-[#3546c8] hover:text-[#2b3bb0] ${FOCUS}`}
                      >
                        {filled ? '入力しました ✓' : '自動入力'}
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5">
                    パスワード <code className="rounded bg-[#eef0f7] px-1 font-mono text-[#161a2e]">{validPassword}</code> ／ 確認コード{' '}
                    <code className="rounded bg-[#eef0f7] px-1 font-mono text-[#161a2e]">{DEMO_CODE}</code> ／ SSO{' '}
                    <code className="rounded bg-[#eef0f7] px-1 font-mono text-[#161a2e]">hoshizora.co.jp</code>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 px-5 pb-3 text-[11px] text-[#9aa0b4]">
          <span>© 2026 Kumiko Labs</span>
          <span aria-hidden>·</span>
          <span>利用規約</span>
          <span aria-hidden>·</span>
          <span>プライバシー</span>
        </div>
      </div>
    </div>
  )
}
