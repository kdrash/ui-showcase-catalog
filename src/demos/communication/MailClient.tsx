import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from 'motion/react'
import {
  AlarmClock,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  Eye,
  FileText,
  Flag,
  Forward,
  Inbox,
  Keyboard,
  Mail,
  MailOpen,
  MapPin,
  Maximize2,
  Menu,
  Minimize2,
  Minus,
  Paperclip,
  Reply,
  ReplyAll,
  RotateCw,
  Search,
  Send,
  Sparkles,
  SquarePen,
  Star,
  Tag,
  Trash2,
  X,
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
import { AttachmentArt, EmptyArt, LetterArt, TayoriMark } from './MailClient.art'
import {
  CONTACTS,
  INCOMING,
  INITIAL_THREADS,
  LABEL_IDS,
  LABELS,
  NOW,
  PEOPLE,
  SMART_REPLIES,
  type Attachment,
  type LabelId,
  type Msg,
  type PersonId,
  type Thread,
} from './MailClient.data'

/**
 * 3ペインのメールクライアント。サービス名「Tayori」・ロゴ・人物・会社・本文はすべて架空のオリジナル。
 * - ルートの幅を ResizeObserver で測り、1080px〜 はフォルダ/ラベルのナビ + 一覧 + 閲覧ペイン、720px〜 はナビをアイコンのレールに、
 *   それより狭いと一覧 ⇄ 閲覧ペインを横スライドで行き来する1ペイン(ナビはドロワー、作成は右下のボタン)に切り替える
 * - 一覧の行は「行全体を覆う透明ボタン」の上にチェックボックス・スター・クイック操作を重ねる構造(ボタンの入れ子を避ける)。
 *   ホバー/フォーカスで時刻がアーカイブ・削除・既読・スヌーズのツールバーに入れ替わる。アバターはホバーでチェックボックスに変わり、
 *   Shift+クリックで範囲選択。選択中は一覧の上部が一括操作バーに差し替わる(ラベルは全部/一部/なしの三状態チェック)
 * - 操作はすべてスレッド単位のスナップショットを取ってから適用し、トーストの「元に戻す」で書き戻す。送信は即座に反映して
 *   5秒間だけ「送信を取り消す」を出し、取り消すと送信内容をそのまま作成ウィンドウ/返信欄に戻す
 * - 閲覧ペインは古いメッセージを1行に畳み、間が2通以上なら「n件の以前のメッセージ」の円にまとめる。最後の1通と未読は展開。
 *   下部の返信欄はスマートリプライの候補付きで、Ctrl+Enter で送信。招待メールには出欠ボタン付きのカレンダーカード
 * - 作成ウィンドウは右下にドッキングし、最小化(タイトルバーだけ)/最大化(背景を暗くしたモーダル)/閉じるを切り替え。宛先はチップ入力
 *   (候補を↑↓ + Enter、カンマ/スペースで確定、Backspace で直前のチップを削除、不正なアドレスは赤)。入力が止まると「保存中…」→
 *   「下書き保存済み」になり、下書きフォルダの件数もその場で増える
 * - スヌーズはプリセット(今日の後ほど/明日/今週末/来週)と、2週間分のミニカレンダー + 時刻での指定。スヌーズ中フォルダに期限付きで並ぶ
 * - 検索は差出人・件名・本文を対象に、未読/スター/添付/重要/今週のフィルタチップと組み合わせ、一致部分をハイライトする
 * - キーボード: j/k で移動、Enter/o で開く、e アーカイブ、# 削除、s スター、x 選択、r 返信、a 全員に返信、f 転送、c 作成、/ 検索、
 *   u 一覧へ戻る、? 一覧表示、Esc で重なっている UI を閉じる。ルートの onKeyDown だけで処理するので、デモ内にフォーカスがあるときだけ効く
 * - 添付の写真やPDFのサムネイルはすべてインライン SVG。useReducedMotion 時はスライドや高さアニメをやめ、短いフェードだけにする
 */

/* ───────────── 定数・ユーティリティ ───────────── */

type View = 'inbox' | 'starred' | 'snoozed' | 'sent' | 'drafts' | 'archive' | 'trash' | `label:${LabelId}`
type Chip = 'unread' | 'starred' | 'attach' | 'important' | 'week'
type Mode = 'narrow' | 'medium' | 'wide'
type ToastAction = { label: string; run: () => void }
type ToastState = { id: number; text: string; actions?: ToastAction[]; ms: number }
type Recipient = { key: string; name: string; email: string; person?: PersonId; valid: boolean }
type ComposeState = {
  key: number
  draftId?: string
  to: Recipient[]
  cc: Recipient[]
  showCc: boolean
  subject: string
  body: string
  attachments: Attachment[]
  mode: 'docked' | 'min' | 'max'
  focus: 'to' | 'body'
}
type ReplyState = { threadId: string; mode: 'reply' | 'all'; body: string; key: number }

const FOLDERS: { id: View; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: '受信トレイ', icon: Inbox },
  { id: 'starred', label: 'スター付き', icon: Star },
  { id: 'snoozed', label: 'スヌーズ中', icon: AlarmClock },
  { id: 'sent', label: '送信済み', icon: Send },
  { id: 'drafts', label: '下書き', icon: FileText },
  { id: 'archive', label: 'アーカイブ', icon: Archive },
  { id: 'trash', label: 'ゴミ箱', icon: Trash2 },
]
const CHIPS: { id: Chip; label: string }[] = [
  { id: 'unread', label: '未読' },
  { id: 'starred', label: 'スター付き' },
  { id: 'attach', label: '添付ファイルあり' },
  { id: 'important', label: '重要' },
  { id: 'week', label: '今週' },
]

const BOOT = Date.now()
/** デモ内の「いま」(固定の起点 + 経過時間) */
const clock = () => NOW + (Date.now() - BOOT)
const WEEK = ['日', '月', '火', '水', '木', '金', '土']
const pad = (n: number) => String(n).padStart(2, '0')
const hm = (t: number) => {
  const d = new Date(t)
  return `${d.getHours()}:${pad(d.getMinutes())}`
}
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()
function listTime(t: number) {
  const d = new Date(t)
  if (sameDay(t, NOW) || t > NOW) return hm(t)
  if (sameDay(t, NOW - 86400000)) return '昨日'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
function fullTime(t: number) {
  const d = new Date(t)
  const base = `${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]}) ${hm(t)}`
  const diff = Math.round((clock() - t) / 60000)
  if (diff < 1) return `${base}（たった今）`
  if (diff < 60) return `${base}（${diff}分前）`
  if (diff < 60 * 24) return `${base}（${Math.floor(diff / 60)}時間前）`
  return base
}
function snoozeLabel(t: number) {
  const d = new Date(t)
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]}) ${hm(t)}`
}
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
const lastAt = (t: Thread) => t.msgs.at(-1)?.at ?? NOW + 1
const hasAttach = (t: Thread) => t.msgs.some((m) => m.attachments?.length)
const snippetOf = (t: Thread) => (t.draft ? t.draft.body : (t.msgs.at(-1)?.body.slice(t.msgs.at(-1)!.body.length > 1 ? 1 : 0).join(' ') ?? '')).replace(/\s+/g, ' ')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const personRecipient = (id: PersonId): Recipient => ({ key: `${id}-${Math.random()}`, name: PEOPLE[id].name, email: PEOPLE[id].email, person: id, valid: true })
const textRecipient = (raw: string): Recipient => {
  const s = raw.trim().replace(/[,、;]$/, '')
  const hit = (Object.keys(PEOPLE) as PersonId[]).find((id) => PEOPLE[id].email === s)
  return hit ? personRecipient(hit) : { key: `${s}-${Math.random()}`, name: s, email: s, valid: EMAIL_RE.test(s) }
}

function inView(t: Thread, v: View) {
  switch (v) {
    case 'inbox':
      return t.folder === 'inbox' && !t.snoozedUntil
    case 'starred':
      return t.starred && t.folder !== 'trash' && t.folder !== 'drafts'
    case 'snoozed':
      return !!t.snoozedUntil && t.folder !== 'trash'
    case 'sent':
      return t.folder !== 'trash' && t.folder !== 'drafts' && t.msgs.some((m) => m.from === 'me')
    case 'drafts':
      return t.folder === 'drafts'
    case 'archive':
      return t.folder === 'archive'
    case 'trash':
      return t.folder === 'trash'
    default:
      return t.labels.includes(v.slice(6) as LabelId) && t.folder !== 'trash' && t.folder !== 'drafts'
  }
}
const viewName = (v: View) => (v.startsWith('label:') ? LABELS[v.slice(6) as LabelId].name : FOLDERS.find((f) => f.id === v)!.label)

function Highlight({ text, q }: { text: string; q: string }) {
  const needle = q.trim()
  if (!needle) return <>{text}</>
  const lower = text.toLowerCase()
  const n = needle.toLowerCase()
  const out: ReactNode[] = []
  let i = 0
  for (;;) {
    const j = lower.indexOf(n, i)
    if (j < 0) break
    if (j > i) out.push(text.slice(i, j))
    out.push(
      <mark key={j} className="rounded-[3px] bg-[#ffe58f] px-px text-inherit">
        {text.slice(j, j + needle.length)}
      </mark>,
    )
    i = j + needle.length
  }
  out.push(text.slice(i))
  return <>{out}</>
}

/**
 * 押したボタンが消える(アーカイブ等)とフォーカスが body に落ちてショートカットが効かなくなるので、
 * デモを操作中だった場合に限り、描画のたびにルートへフォーカスを戻す。デモの外を押したら対象外にする
 */
function useKeepFocus(ref: RefObject<HTMLElement | null>) {
  const engaged = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const down = (e: PointerEvent) => {
      engaged.current = el.contains(e.target as Node)
    }
    const fin = () => {
      engaged.current = true
    }
    document.addEventListener('pointerdown', down, true)
    el.addEventListener('focusin', fin)
    // 要素の削除(退場アニメーション後の削除も含む)を見張って、フォーカスが body に落ちていたら戻す
    const mo = new MutationObserver(() => {
      if (engaged.current && (document.activeElement === document.body || document.activeElement === null)) el.focus({ preventScroll: true })
    })
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      document.removeEventListener('pointerdown', down, true)
      el.removeEventListener('focusin', fin)
      mo.disconnect()
    }
  }, [ref])
}

/** 外側クリックで閉じる(ポップオーバー用) */
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

const ICON_BTN =
  'inline-grid size-8 shrink-0 place-items-center rounded-full text-(--sub) transition-colors hover:bg-(--hover2) hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--acc) disabled:pointer-events-none disabled:opacity-35'
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--acc)'

const THEME: CSSProperties = {
  ['--bg' as string]: '#eef1f6',
  ['--pane' as string]: '#ffffff',
  ['--ink' as string]: '#1b2130',
  ['--sub' as string]: '#5b6477',
  ['--faint' as string]: '#8d95a7',
  ['--line' as string]: '#e5e8ef',
  ['--hover' as string]: '#f5f7fb',
  ['--hover2' as string]: '#e9edf5',
  ['--acc' as string]: '#3557d4',
  ['--acc-ink' as string]: '#2140b3',
  ['--acc-soft' as string]: '#e6ecfd',
  ['--sel' as string]: '#eef2fe',
  ['--warn' as string]: '#b45309',
}

/* ───────────── 小物 ───────────── */

function Avatar({ id, size = 36, className }: { id: PersonId; size?: number; className?: string }) {
  const p = PEOPLE[id]
  const glyph = p.org ? p.name[0] : (p.name.split(' ')[0] ?? p.name)[0]
  return (
    <span
      aria-hidden
      className={cx('relative inline-grid shrink-0 place-items-center overflow-hidden font-semibold text-white select-none', p.org ? 'rounded-[30%]' : 'rounded-full', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(140deg, hsl(${p.hue} 78% 66%), hsl(${p.hue + 28} 62% 44%))`,
        boxShadow: 'inset 0 -2px 6px rgb(0 0 0 / 0.12), inset 0 1px 1px rgb(255 255 255 / 0.35)',
      }}
    >
      <span className="absolute -top-1/3 -left-1/4 size-full rounded-full bg-white/18" />
      <span className="relative">{glyph}</span>
    </span>
  )
}

function Checkbox({
  checked,
  mixed,
  onToggle,
  label,
  className,
}: {
  checked: boolean
  mixed?: boolean
  onToggle: (shift: boolean) => void
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onToggle(e.shiftKey)
      }}
      className={cx('grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors', FOCUS, checked || mixed ? 'border-(--acc) bg-(--acc) text-white' : 'border-[#b4bccb] bg-white hover:border-(--acc)', className)}
    >
      {mixed ? <Minus size={12} strokeWidth={3} /> : checked ? <Check size={12} strokeWidth={3} /> : null}
    </button>
  )
}

function LabelChip({ id, onRemove }: { id: LabelId; onRemove?: () => void }) {
  const l = LABELS[id]
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] leading-none font-medium" style={{ background: l.soft, color: l.color }}>
      {l.name}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`ラベル「${l.name}」を外す`} className={cx('-mr-0.5 grid size-3.5 place-items-center rounded hover:bg-black/10', FOCUS)}>
          <X size={10} strokeWidth={2.6} />
        </button>
      )}
    </span>
  )
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 rounded-md bg-[#1b2130] px-2 py-1 text-[11px] whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity delay-300 group-hover/tip:opacity-100">
      {children}
    </span>
  )
}

function IconAction({ label, onClick, children, kbd, disabled }: { label: string; onClick: () => void; children: ReactNode; kbd?: string; disabled?: boolean }) {
  return (
    <span className="group/tip relative">
      <button type="button" aria-label={label} onClick={onClick} className={ICON_BTN} disabled={disabled}>
        {children}
      </button>
      <Tip>
        {label}
        {kbd && <kbd className="ml-1.5 rounded bg-white/15 px-1 font-sans">{kbd}</kbd>}
      </Tip>
    </span>
  )
}

/* ───────────── ラベルメニュー ───────────── */

function LabelMenu({ threads, ids, onToggle, onClose }: { threads: Thread[]; ids: string[]; onToggle: (l: LabelId, on: boolean) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, true, onClose)
  useEffect(() => ref.current?.querySelector<HTMLButtonElement>('button')?.focus(), [])
  const sel = threads.filter((t) => ids.includes(t.id))
  return (
    <motion.div
      ref={ref}
      role="menu"
      aria-label="ラベルを付ける"
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.14 }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
          const i = items.indexOf(document.activeElement as HTMLButtonElement)
          items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
        }
      }}
      className="absolute top-full right-0 z-40 mt-1 w-52 rounded-xl border border-(--line) bg-white p-1.5 shadow-[0_12px_32px_-8px_rgb(20_30_60/0.28)]"
    >
      <div className="px-2 pt-1 pb-1.5 text-[11px] font-semibold text-(--faint)">ラベルを付ける</div>
      {LABEL_IDS.map((l) => {
        const n = sel.filter((t) => t.labels.includes(l)).length
        const all = n > 0 && n === sel.length
        return (
          <button
            key={l}
            type="button"
            role="menuitemcheckbox"
            aria-checked={all ? true : n > 0 ? 'mixed' : false}
            onClick={() => onToggle(l, !all)}
            className={cx('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-(--ink) hover:bg-(--hover)', FOCUS)}
          >
            <span className={cx('grid size-4 place-items-center rounded border-[1.5px]', all || n ? 'border-transparent text-white' : 'border-[#b4bccb]')} style={all || n ? { background: LABELS[l].color } : undefined}>
              {all ? <Check size={11} strokeWidth={3} /> : n ? <Minus size={11} strokeWidth={3} /> : null}
            </span>
            <span className="size-2 rounded-full" style={{ background: LABELS[l].color }} />
            {LABELS[l].name}
          </button>
        )
      })}
    </motion.div>
  )
}

/* ───────────── スヌーズ ───────────── */

function at(base: number, dayOffset: number, h: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, 0, 0, 0)
  return d.getTime()
}

function SnoozeDialog({ count, onPick, onClose, reduced }: { count: number; onPick: (t: number, label: string) => void; onClose: () => void; reduced: boolean }) {
  const [custom, setCustom] = useState(false)
  const [day, setDay] = useState(2)
  const [hour, setHour] = useState(9)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.querySelector<HTMLButtonElement>('button[data-first]:not(:disabled), button:not(:disabled)')?.focus(), [custom])
  const dow = new Date(NOW).getDay()
  const toSat = (6 - dow + 7) % 7 || 7
  const toMon = (1 - dow + 7) % 7 || 7
  const presets = [
    { label: '今日の後ほど', t: at(NOW, 0, 18) },
    { label: '明日', t: at(NOW, 1, 8) },
    { label: '今週末', t: at(NOW, toSat, 8) },
    { label: '来週', t: at(NOW, toMon, 8) },
  ]
  const start = at(NOW, -((dow + 6) % 7), 0)
  const days = Array.from({ length: 14 }, (_, i) => at(start, i, 0))
  return (
    <motion.div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-[#0f1729]/30 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="スヌーズ"
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
          }
        }}
        className="w-[300px] max-w-full rounded-2xl bg-white p-2 shadow-[0_24px_60px_-12px_rgb(15_23_41/0.4)]"
      >
        <div className="flex items-center gap-2 px-3 pt-2 pb-2">
          <AlarmClock size={16} className="text-(--acc)" />
          <div className="text-[14px] font-semibold text-(--ink)">スヌーズ</div>
          <span className="text-[12px] text-(--faint)">{count}件のスレッド</span>
        </div>
        {!custom ? (
          <div className="flex flex-col">
            {presets.map((p, i) => (
              <button
                key={p.label}
                type="button"
                data-first={i === 0 ? '' : undefined}
                onClick={() => onPick(p.t, p.label)}
                className={cx('flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] text-(--ink) hover:bg-(--hover)', FOCUS)}
              >
                {p.label}
                <span className="text-[12px] text-(--faint)">
                  {WEEK[new Date(p.t).getDay()]} {hm(p.t)}
                </span>
              </button>
            ))}
            <div className="mx-3 my-1 h-px bg-(--line)" />
            <button type="button" onClick={() => setCustom(true)} className={cx('flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] text-(--ink) hover:bg-(--hover)', FOCUS)}>
              <CalendarDays size={15} className="text-(--sub)" />
              日付と時刻を選択
            </button>
          </div>
        ) : (
          <div className="px-2 pb-1">
            <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] text-(--faint)">
              {['月', '火', '水', '木', '金', '土', '日'].map((w) => (
                <div key={w}>{w}</div>
              ))}
              {days.map((d, i) => {
                const off = Math.round((d - at(NOW, 0, 0)) / 86400000)
                const past = off < 0
                const on = off === day
                return (
                  <button
                    key={d}
                    type="button"
                    data-first={i === 0 ? '' : undefined}
                    disabled={past}
                    aria-pressed={on}
                    aria-label={snoozeLabel(d).split(' ')[0]}
                    onClick={() => setDay(off)}
                    className={cx(
                      'grid aspect-square place-items-center rounded-full text-[12.5px] transition-colors',
                      FOCUS,
                      past ? 'text-[#c5cad6]' : on ? 'bg-(--acc) font-semibold text-white' : off === 0 ? 'font-semibold text-(--acc) hover:bg-(--hover)' : 'text-(--ink) hover:bg-(--hover)',
                    )}
                  >
                    {new Date(d).getDate()}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[8, 12, 15, 18, 21].map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={hour === h}
                  onClick={() => setHour(h)}
                  className={cx('h-7 rounded-full border px-2.5 text-[12px] transition-colors', FOCUS, hour === h ? 'border-(--acc) bg-(--acc-soft) font-semibold text-(--acc-ink)' : 'border-(--line) text-(--sub) hover:bg-(--hover)')}
                >
                  {h}:00
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => setCustom(false)} className={cx('rounded-full px-3 py-1.5 text-[12.5px] text-(--sub) hover:bg-(--hover)', FOCUS)}>
                戻る
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = at(NOW, day, hour)
                  onPick(t, snoozeLabel(t))
                }}
                className={cx('rounded-full bg-(--acc) px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-(--acc-ink)', FOCUS)}
              >
                {snoozeLabel(at(NOW, day, hour))} まで
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ───────────── ショートカット一覧 ───────────── */

const SHORTCUTS: [string, string][] = [
  ['j / k', '次 / 前のスレッド'],
  ['Enter / o', 'スレッドを開く'],
  ['u', '一覧に戻る'],
  ['e', 'アーカイブ'],
  ['#', '削除'],
  ['s', 'スターを付ける / 外す'],
  ['x', '選択する'],
  ['r / a / f', '返信 / 全員に返信 / 転送'],
  ['c', '新規作成'],
  ['/', '検索'],
  ['Ctrl + Enter', '送信'],
  ['Esc', '閉じる'],
]

function HelpDialog({ onClose, reduced }: { onClose: () => void; reduced: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <motion.div
      className="absolute inset-0 z-[70] flex items-center justify-center bg-[#0f1729]/35 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="キーボードショートカット"
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
          }
        }}
        className="w-[420px] max-w-full rounded-2xl bg-white p-5 shadow-[0_24px_60px_-12px_rgb(15_23_41/0.4)]"
      >
        <div className="mb-3 flex items-center gap-2">
          <Keyboard size={18} className="text-(--acc)" />
          <h3 className="text-[15px] font-semibold text-(--ink)">キーボードショートカット</h3>
          <button ref={ref} type="button" onClick={onClose} aria-label="閉じる" className={cx(ICON_BTN, 'ml-auto')}>
            <X size={16} />
          </button>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12.5px] @lg:grid-cols-2">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between gap-3 border-b border-dashed border-(--line) py-1">
              <dt className="text-(--sub)">{d}</dt>
              <dd>
                <kbd className="rounded-md border border-b-2 border-(--line) bg-(--hover) px-1.5 py-0.5 font-sans text-[11px] text-(--ink)">{k}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </motion.div>
  )
}

/* ───────────── 添付プレビュー ───────────── */

function AttachmentCard({ a, onOpen }: { a: Attachment; onOpen: () => void }) {
  const isImage = a.kind === 'lake' || a.kind === 'tent' || a.kind === 'coffee' || a.kind === 'lighting' || a.kind === 'logo'
  const ext = a.name.split('.').at(-1)?.toUpperCase()
  return (
    <div className="group/att relative w-[168px] overflow-hidden rounded-xl border border-(--line) bg-white transition-shadow hover:shadow-[0_6px_18px_-8px_rgb(20_30_60/0.35)]">
      <button type="button" onClick={onOpen} aria-label={`${a.name} をプレビュー`} className={cx('block w-full text-left', FOCUS)}>
        <AttachmentArt kind={a.kind} className="block h-[86px] w-full" />
        <div className="flex items-center gap-2 border-t border-(--line) px-2.5 py-2">
          <span className={cx('grid h-5 min-w-7 place-items-center rounded px-1 text-[9px] font-bold text-white', isImage ? 'bg-[#e0794a]' : a.kind === 'doc' ? 'bg-[#2f8f57]' : 'bg-[#e5484d]')}>{ext}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11.5px] font-medium text-(--ink)">{a.name}</span>
            <span className="block text-[10.5px] text-(--faint)">{a.size}</span>
          </span>
        </div>
      </button>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[86px] items-center justify-center gap-2 bg-[#0f1729]/45 opacity-0 transition-opacity group-focus-within/att:opacity-100 group-hover/att:opacity-100">
        <span className="grid size-8 place-items-center rounded-full bg-white/95 text-(--ink)">
          <Eye size={15} />
        </span>
        <span className="grid size-8 place-items-center rounded-full bg-white/95 text-(--ink)">
          <Download size={15} />
        </span>
      </div>
    </div>
  )
}

function Lightbox({ a, onClose, reduced }: { a: Attachment; onClose: () => void; reduced: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <motion.div
      className="absolute inset-0 z-[80] flex flex-col bg-[#0b1020]/88 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${a.name} のプレビュー`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <Paperclip size={15} className="opacity-70" />
        <div className="min-w-0 flex-1 truncate text-[13px] font-medium">{a.name}</div>
        <span className="text-[12px] text-white/60">{a.size}</span>
        <button type="button" aria-label="ダウンロード" className="grid size-8 place-items-center rounded-full text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
          <Download size={16} />
        </button>
        <button ref={ref} type="button" aria-label="閉じる" onClick={onClose} className="grid size-8 place-items-center rounded-full text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
          <X size={18} />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center p-6 pt-0" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          className="aspect-[16/10] max-h-full w-[min(720px,100%)] overflow-hidden rounded-lg shadow-2xl"
        >
          <AttachmentArt kind={a.kind} className="block size-full" />
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ───────────── 一覧の行 ───────────── */

type RowProps = {
  t: Thread
  view: View
  q: string
  active: boolean
  selected: boolean
  selecting: boolean
  fresh: boolean
  reduced: boolean
  registerRef: (id: string, el: HTMLButtonElement | null) => void
  onOpen: (id: string) => void
  onFocusRow: (id: string) => void
  onSelect: (id: string, shift: boolean) => void
  onStar: (id: string) => void
  onArchive: (ids: string[]) => void
  onTrash: (ids: string[]) => void
  onRead: (ids: string[], read: boolean) => void
  onSnooze: (ids: string[]) => void
}

function senderLine(t: Thread, view: View) {
  if (t.draft) return { prefix: '下書き', names: t.draft.to.map((p) => PEOPLE[p].short).join(', ') || '(宛先なし)' }
  if (view === 'sent') {
    const to = [...new Set(t.msgs.filter((m) => m.from === 'me').flatMap((m) => m.to))].filter((p) => p !== 'me')
    return { prefix: '宛先:', names: to.map((p) => PEOPLE[p].short).join(', ') }
  }
  if (t.msgs.length === 1) return { names: PEOPLE[t.msgs[0].from].name }
  const seen: PersonId[] = []
  for (const m of t.msgs) if (!seen.includes(m.from)) seen.push(m.from)
  return { names: seen.slice(-3).map((p) => PEOPLE[p].short).join(', ') }
}

function MailRow(p: RowProps) {
  const { t } = p
  const s = senderLine(t, p.view)
  const atts = t.msgs.flatMap((m) => m.attachments ?? [])
  const time = t.draft ? '' : listTime(lastAt(t))
  return (
    <div
      className={cx(
        'group/row relative flex gap-3 border-b border-(--line) py-2.5 pr-3 pl-3 transition-colors',
        p.selected ? 'bg-(--sel)' : p.active ? 'bg-[#f2f5fd]' : t.unread ? 'bg-white' : 'bg-[#fbfcfe]',
        'hover:bg-(--hover) hover:shadow-[inset_0_0_0_1px_var(--line)]',
      )}
    >
      {p.fresh && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[#fff3c4]"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2.4, delay: 0.6 }}
        />
      )}
      {p.active && <motion.span layoutId={p.reduced ? undefined : 'mail-active-bar'} aria-hidden className="absolute inset-y-0 left-0 w-[3px] rounded-r bg-(--acc)" />}
      {/* 行全体を開くボタン(他の操作はこの上に重ねる) */}
      <button
        ref={(el) => p.registerRef(t.id, el)}
        type="button"
        onClick={() => p.onOpen(t.id)}
        onFocus={() => p.onFocusRow(t.id)}
        aria-current={p.active ? 'true' : undefined}
        aria-label={`${t.unread ? '未読、' : ''}${s.prefix ?? ''}${s.names}、${t.draft ? t.draft.subject : t.subject}、${time}`}
        className="absolute inset-0 z-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--acc)"
      />
      <div className="pointer-events-none relative z-10 mt-0.5 grid size-9 shrink-0 place-items-center">
        <span className={cx('transition-opacity', p.selecting || p.selected ? 'opacity-0' : 'group-hover/row:opacity-0')}>
          {t.draft ? (
            <span className="grid size-9 place-items-center rounded-full bg-[#fde8e8] text-[#d14343]">
              <SquarePen size={16} />
            </span>
          ) : (
            <Avatar id={t.msgs.at(-1)!.from === 'me' && t.msgs.length > 1 ? [...t.msgs].reverse().find((m) => m.from !== 'me')?.from ?? 'me' : t.msgs.at(-1)!.from} />
          )}
        </span>
        <span className={cx('pointer-events-auto absolute inset-0 grid place-items-center transition-opacity', p.selecting || p.selected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100 focus-within:opacity-100')}>
          <Checkbox checked={p.selected} onToggle={(shift) => p.onSelect(t.id, shift)} label={`${t.subject} を選択`} />
        </span>
      </div>
      <div className="pointer-events-none relative z-10 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {t.unread && <span aria-hidden className="size-2 shrink-0 rounded-full bg-(--acc)" />}
          <span className={cx('min-w-0 truncate text-[13px]', t.unread ? 'font-bold text-(--ink)' : 'font-medium text-[#3a4255]')}>
            {s.prefix && <span className={cx('mr-1', t.draft ? 'font-semibold text-[#d14343]' : 'text-(--faint)')}>{s.prefix}</span>}
            <Highlight text={s.names} q={p.q} />
          </span>
          {t.msgs.length > 1 && <span className="shrink-0 text-[11.5px] text-(--faint)">{t.msgs.length}</span>}
          {t.important && <Flag aria-label="重要" size={12} className="shrink-0 fill-[#f5b13d] text-[#e09b22]" />}
          <span className="ml-auto shrink-0 pl-2 text-[11.5px] tabular-nums group-focus-within/row:opacity-0 group-hover/row:opacity-0">
            <span className={t.unread ? 'font-semibold text-(--acc)' : 'text-(--faint)'}>{time}</span>
          </span>
        </div>
        <div className={cx('mt-0.5 truncate text-[13px]', t.unread ? 'font-semibold text-(--ink)' : 'text-[#3a4255]')}>
          <Highlight text={(t.draft ? t.draft.subject : t.subject) || '(件名なし)'} q={p.q} />
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate text-[12.5px] text-(--sub)">
            <Highlight text={snippetOf(t)} q={p.q} />
          </div>
        </div>
        {(t.labels.length > 0 || atts.length > 0 || t.snoozedUntil) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {t.snoozedUntil && (
              <span className="inline-flex h-5 items-center gap-1 rounded-md bg-[#fdf1df] px-1.5 text-[11px] font-medium text-(--warn)">
                <AlarmClock size={11} />
                {snoozeLabel(t.snoozedUntil)} まで
              </span>
            )}
            {t.labels.map((l) => (
              <LabelChip key={l} id={l} />
            ))}
            {atts.slice(-1).map((a) => (
              <span key={a.name} className="inline-flex h-5 max-w-[150px] items-center gap-1 rounded-md border border-(--line) bg-white px-1.5 text-[11px] text-(--sub)">
                <Paperclip size={10} className="shrink-0" />
                <span className="truncate">{a.name}</span>
              </span>
            ))}
            {atts.length > 1 && <span className="text-[11px] text-(--faint)">+{atts.length - 1}</span>}
          </div>
        )}
      </div>
      {/* スター */}
      {!t.draft && (
        <button
          type="button"
          aria-label={t.starred ? 'スターを外す' : 'スターを付ける'}
          aria-pressed={t.starred}
          onClick={() => p.onStar(t.id)}
          className={cx('relative z-10 mt-6 grid size-7 shrink-0 place-items-center self-start rounded-full transition-colors hover:bg-black/5', FOCUS)}
        >
          <motion.span key={String(t.starred)} initial={p.reduced || !t.starred ? false : { scale: 0.4, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 14 }} className="grid">
            <Star size={16} className={t.starred ? 'fill-[#f5b13d] text-[#e5a326]' : 'text-[#b4bccb] group-hover/row:text-(--faint)'} />
          </motion.span>
        </button>
      )}
      {/* ホバー時のクイック操作 */}
      {!t.draft && (
        <div className="pointer-events-none absolute top-1.5 right-2 z-20 flex items-center gap-0.5 rounded-full border border-(--line) bg-white/95 p-0.5 opacity-0 shadow-[0_4px_14px_-6px_rgb(20_30_60/0.3)] backdrop-blur transition-opacity group-focus-within/row:pointer-events-auto group-focus-within/row:opacity-100 group-hover/row:pointer-events-auto group-hover/row:opacity-100">
          {t.folder === 'archive' || t.folder === 'trash' ? null : (
            <IconAction label="アーカイブ" kbd="e" onClick={() => p.onArchive([t.id])}>
              <Archive size={15} />
            </IconAction>
          )}
          <IconAction label="削除" kbd="#" onClick={() => p.onTrash([t.id])}>
            <Trash2 size={15} />
          </IconAction>
          <IconAction label={t.unread ? '既読にする' : '未読にする'} onClick={() => p.onRead([t.id], t.unread)}>
            {t.unread ? <MailOpen size={15} /> : <Mail size={15} />}
          </IconAction>
          <IconAction label="スヌーズ" onClick={() => p.onSnooze([t.id])}>
            <AlarmClock size={15} />
          </IconAction>
        </div>
      )}
    </div>
  )
}

/* ───────────── 閲覧ペイン ───────────── */

function MessageView({
  m,
  expanded,
  onToggle,
  onReply,
  onPreview,
  isLast,
}: {
  m: Msg
  expanded: boolean
  onToggle: () => void
  onReply: () => void
  onPreview: (a: Attachment) => void
  isLast: boolean
}) {
  const p = PEOPLE[m.from]
  const toText = [...m.to, ...(m.cc ?? [])].map((id) => (id === 'me' ? '自分' : PEOPLE[id].name)).join('、')
  if (!expanded)
    return (
      <button type="button" onClick={onToggle} aria-expanded={false} className={cx('flex w-full items-center gap-3 border-t border-(--line) px-4 py-2.5 text-left transition-colors hover:bg-(--hover) @md:px-6', FOCUS)}>
        <Avatar id={m.from} size={30} />
        <span className="w-24 shrink-0 truncate text-[13px] font-semibold text-(--ink) @md:w-32">{m.from === 'me' ? '自分' : p.name}</span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-(--sub)">{m.body.join(' ')}</span>
        <span className="shrink-0 text-[11.5px] text-(--faint)">{listTime(m.at)}</span>
      </button>
    )
  return (
    <article className={cx('border-t border-(--line) px-4 pt-3.5 pb-4 @md:px-6', isLast && 'pb-2')}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={onToggle} aria-expanded aria-label="メッセージを折りたたむ" className={cx('rounded-full', FOCUS, isLast && 'pointer-events-none')} tabIndex={isLast ? -1 : 0}>
          <Avatar id={m.from} size={38} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[13.5px] font-semibold text-(--ink)">{m.from === 'me' ? `${p.name}（自分）` : p.name}</span>
            <span className="truncate text-[11.5px] text-(--faint)">&lt;{p.email}&gt;</span>
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-(--sub)">宛先: {toText}</div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="mr-1 hidden text-[11.5px] text-(--faint) @lg:inline">{fullTime(m.at)}</span>
          <span className="mr-1 text-[11.5px] text-(--faint) @lg:hidden">{listTime(m.at)}</span>
          <IconAction label="返信" onClick={onReply}>
            <Reply size={15} />
          </IconAction>
        </div>
      </div>
      <div className="mt-3 space-y-3 pl-0 text-[13.5px] leading-[1.85] whitespace-pre-line text-[#2b3242] @md:pl-[50px]">
        {m.body.map((b, i) => (
          <p key={i}>{b}</p>
        ))}
      </div>
      {m.attachments && (
        <div className="mt-4 @md:pl-[50px]">
          <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-medium text-(--sub)">
            <Paperclip size={12} />
            添付ファイル {m.attachments.length}件
          </div>
          <div className="flex flex-wrap gap-2.5">
            {m.attachments.map((a) => (
              <AttachmentCard key={a.name} a={a} onOpen={() => onPreview(a)} />
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

function InviteCard({ t, onRsvp }: { t: Thread; onRsvp: (r: 'yes' | 'maybe' | 'no') => void }) {
  const inv = t.invite!
  const opts = [
    { id: 'yes', label: '参加' },
    { id: 'maybe', label: '未定' },
    { id: 'no', label: '不参加' },
  ] as const
  return (
    <div className="mx-4 mt-1 mb-4 flex gap-3.5 rounded-2xl border border-(--line) bg-[linear-gradient(135deg,#f7f9ff,#fff)] p-3.5 @md:mx-6 @md:ml-[74px]">
      <div className="w-14 shrink-0 overflow-hidden rounded-xl border border-(--line) bg-white text-center shadow-sm">
        <div className="bg-[#e5484d] py-0.5 text-[10px] font-bold text-white">11月</div>
        <div className="text-[22px] leading-8 font-bold text-(--ink)">12</div>
        <div className="pb-1 text-[10px] text-(--sub)">木曜日</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-(--ink)">デザイン定例</div>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-(--sub)">
          <CalendarDays size={13} />
          {inv.date} {inv.time}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-(--sub)">
          <MapPin size={13} />
          <span className="truncate">{inv.place}</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="出欠">
          {opts.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={inv.rsvp === o.id}
              onClick={() => onRsvp(o.id)}
              className={cx(
                'inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[12px] font-medium transition-colors',
                FOCUS,
                inv.rsvp === o.id ? 'border-(--acc) bg-(--acc) text-white' : 'border-(--line) bg-white text-(--ink) hover:border-(--acc) hover:text-(--acc)',
              )}
            >
              {inv.rsvp === o.id && <Check size={12} strokeWidth={3} />}
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReplyBox({
  t,
  reply,
  onChange,
  onSend,
  onDiscard,
  reduced,
}: {
  t: Thread
  reply: ReplyState
  onChange: (body: string) => void
  onSend: () => void
  onDiscard: () => void
  reduced: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [reply.key, reduced])
  const last = t.msgs.at(-1)!
  const target = last.from === 'me' ? last.to.filter((x) => x !== 'me') : [last.from]
  const all = [...new Set(t.msgs.flatMap((m) => [m.from, ...m.to, ...(m.cc ?? [])]))].filter((x) => x !== 'me')
  const to = reply.mode === 'all' ? all : target
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-4 mb-4 overflow-hidden rounded-2xl border border-(--line) bg-white shadow-[0_8px_28px_-14px_rgb(20_30_60/0.35)] focus-within:border-[#bfcbf3] @md:mx-6 @md:ml-[74px]"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          onSend()
        }
      }}
    >
      <div className="flex items-center gap-2 border-b border-(--line) px-3.5 py-2 text-[12px] text-(--sub)">
        {reply.mode === 'all' ? <ReplyAll size={14} /> : <Reply size={14} />}
        <span className="shrink-0">宛先:</span>
        <span className="flex min-w-0 flex-wrap gap-1">
          {to.map((id) => (
            <span key={id} className="inline-flex h-6 items-center gap-1 rounded-full bg-(--hover2) py-0.5 pr-2 pl-0.5 text-[11.5px] text-(--ink)">
              <Avatar id={id} size={20} />
              {PEOPLE[id].name}
            </span>
          ))}
        </span>
      </div>
      <label className="sr-only" htmlFor={`reply-${t.id}`}>
        返信を入力
      </label>
      <textarea
        id={`reply-${t.id}`}
        ref={ref}
        value={reply.body}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="返信を入力…"
        className="block w-full resize-none bg-transparent px-3.5 py-3 text-[13.5px] leading-[1.75] text-(--ink) outline-none placeholder:text-(--faint)"
      />
      <div className="flex items-center gap-2 px-2.5 pb-2.5">
        <button
          type="button"
          onClick={onSend}
          disabled={!reply.body.trim()}
          className={cx('inline-flex h-8 items-center gap-1.5 rounded-full bg-(--acc) pr-3.5 pl-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-(--acc-ink) disabled:cursor-not-allowed disabled:opacity-40', FOCUS)}
        >
          <Send size={14} />
          送信
        </button>
        <span className="hidden text-[11px] text-(--faint) @md:inline">Ctrl + Enter</span>
        <span className="ml-auto" />
        <IconAction label="返信を破棄" onClick={onDiscard}>
          <Trash2 size={15} />
        </IconAction>
      </div>
    </motion.div>
  )
}

/* ───────────── 宛先のチップ入力 ───────────── */

function RecipientField({
  label,
  value,
  onChange,
  autoFocus,
  shake,
  trailing,
}: {
  label: string
  value: Recipient[]
  onChange: (r: Recipient[]) => void
  autoFocus?: boolean
  shake?: number
  trailing?: ReactNode
}) {
  const [text, setText] = useState('')
  const [hi, setHi] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useRef(`rcpt-${Math.random().toString(36).slice(2)}`).current
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])
  const q = text.trim().toLowerCase()
  const sugg = q
    ? CONTACTS.filter((id) => !value.some((r) => r.person === id)).filter((id) => {
        const p = PEOPLE[id]
        return p.name.toLowerCase().includes(q) || p.email.includes(q) || p.short.includes(q) || p.name.replace(' ', '').includes(q) || !!p.kana?.replace(' ', '').includes(q.replace(' ', ''))
      })
    : []
  const open = focused && sugg.length > 0
  const commit = (raw: string) => {
    if (!raw.trim()) return
    onChange([...value, textRecipient(raw)])
    setText('')
  }
  const pick = (id: PersonId) => {
    onChange([...value, personRecipient(id)])
    setText('')
    setHi(0)
    inputRef.current?.focus()
  }
  return (
    <motion.div
      key={shake}
      animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-10 items-start gap-2 border-b border-(--line) px-3.5 py-1"
      onClick={() => inputRef.current?.focus()}
    >
      <span className="flex h-8 shrink-0 items-center text-[12.5px] text-(--faint)">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-0.5">
        {value.map((r) => (
          <span
            key={r.key}
            title={r.email}
            className={cx(
              'inline-flex h-6 max-w-full items-center gap-1 rounded-full py-0.5 pr-1 text-[12px]',
              r.person ? 'bg-(--hover2) pl-0.5 text-(--ink)' : r.valid ? 'bg-(--hover2) pl-2 text-(--ink)' : 'border border-[#f1a9a9] bg-[#fdecec] pl-2 text-[#c03030]',
            )}
          >
            {r.person && <Avatar id={r.person} size={20} />}
            <span className="truncate">{r.name}</span>
            <button
              type="button"
              aria-label={`${r.name} を宛先から外す`}
              onClick={(e) => {
                e.stopPropagation()
                onChange(value.filter((x) => x.key !== r.key))
              }}
              className={cx('grid size-4 place-items-center rounded-full text-(--sub) hover:bg-black/10', FOCUS)}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={`${label}（名前かメールアドレス）`}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            if (text.trim()) commit(text)
          }}
          onChange={(e) => {
            const v = e.target.value
            if (/[,、;\s]$/.test(v) && v.trim()) commit(v)
            else {
              setText(v)
              setHi(0)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && open) {
              e.preventDefault()
              setHi((h) => (h + 1) % sugg.length)
            } else if (e.key === 'ArrowUp' && open) {
              e.preventDefault()
              setHi((h) => (h - 1 + sugg.length) % sugg.length)
            } else if ((e.key === 'Enter' || e.key === 'Tab') && open) {
              e.preventDefault()
              pick(sugg[hi])
            } else if (e.key === 'Enter' && text.trim()) {
              e.preventDefault()
              commit(text)
            } else if (e.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          placeholder={value.length ? '' : '名前またはメールアドレス'}
          className="h-7 min-w-[90px] flex-1 bg-transparent text-[13px] text-(--ink) outline-none placeholder:text-(--faint)"
        />
      </div>
      {trailing && <span className="flex h-8 shrink-0 items-center">{trailing}</span>}
      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-3 left-12 z-30 mt-1 overflow-hidden rounded-xl border border-(--line) bg-white py-1 shadow-[0_12px_32px_-8px_rgb(20_30_60/0.3)]"
          >
            {sugg.slice(0, 5).map((id, i) => (
              <li key={id} role="option" aria-selected={i === hi}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(id)}
                  className={cx('flex w-full items-center gap-2.5 px-3 py-1.5 text-left', i === hi && 'bg-(--hover2)')}
                >
                  <Avatar id={id} size={26} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium text-(--ink)">{PEOPLE[id].name}</span>
                    <span className="block truncate text-[11px] text-(--faint)">{PEOPLE[id].email}</span>
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ───────────── 作成ウィンドウ ───────────── */

function ComposeWindow({
  c,
  narrow,
  reduced,
  onChange,
  onMode,
  onClose,
  onDiscard,
  onSend,
  onAutosave,
}: {
  c: ComposeState
  narrow: boolean
  reduced: boolean
  onChange: (patch: Partial<ComposeState>) => void
  onMode: (m: ComposeState['mode']) => void
  onClose: () => void
  onDiscard: () => void
  onSend: () => void
  onAutosave: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>(c.draftId ? 'saved' : 'idle')
  const [shake, setShake] = useState(0)
  const [error, setError] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const first = useRef(true)
  const autosave = useRef(onAutosave)
  autosave.current = onAutosave
  const sig = JSON.stringify([c.to.map((r) => r.email), c.cc.map((r) => r.email), c.subject, c.body, c.attachments.length])
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setStatus('idle')
    const t1 = window.setTimeout(() => setStatus('saving'), 700)
    const t2 = window.setTimeout(() => {
      setStatus('saved')
      autosave.current()
    }, 1300)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [sig])
  useEffect(() => {
    if (c.focus === 'body' && c.mode !== 'min') bodyRef.current?.focus()
  }, [c.key, c.focus, c.mode])

  const send = () => {
    if (!c.to.length) {
      setError('宛先を1件以上入力してください')
      setShake((s) => s + 1)
      return
    }
    if (c.to.some((r) => !r.valid) || c.cc.some((r) => !r.valid)) {
      setError('メールアドレスの形式が正しくない宛先があります')
      setShake((s) => s + 1)
      return
    }
    onSend()
  }
  const title = c.subject.trim() || '新規メッセージ'
  const max = c.mode === 'max'
  const min = c.mode === 'min'
  const spring: Transition = reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 38 }

  const statusEl = (
    <AnimatePresence mode="wait" initial={false}>
      {status !== 'idle' && (
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="inline-flex items-center gap-1 text-[11.5px] text-(--faint)"
          aria-live="polite"
        >
          {status === 'saving' ? (
            <>
              <RotateCw size={11} className="motion-safe:animate-spin" />
              保存中…
            </>
          ) : (
            <>
              <Check size={12} className="text-[#2f9e6a]" />
              下書き保存済み
            </>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <AnimatePresence>
        {max && !narrow && (
          <motion.button
            type="button"
            aria-label="作成ウィンドウを元のサイズに戻す"
            className="absolute inset-0 z-[45] cursor-default bg-[#0f1729]/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onMode('docked')}
          />
        )}
      </AnimatePresence>
      <motion.section
        role="dialog"
        aria-label={`作成: ${title}`}
        layout={!reduced}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
        transition={spring}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            send()
          }
          if (e.key === 'Escape') {
            e.stopPropagation()
            if (max) onMode('docked')
            else onMode('min')
          }
        }}
        className={cx(
          'absolute z-50 flex flex-col overflow-hidden bg-white shadow-[0_18px_50px_-12px_rgb(15_23_41/0.45),0_0_0_1px_rgb(15_23_41/0.06)]',
          min
            ? 'right-3 bottom-[var(--solo-footer-clearance,0px)] h-10 w-[272px] rounded-t-xl'
            : narrow
              ? 'inset-0 rounded-none pb-[var(--solo-footer-clearance,0px)]'
              : max
                ? 'inset-x-[6%] top-[5%] bottom-[5%] rounded-2xl'
                : 'right-4 bottom-[var(--solo-footer-clearance,0px)] h-[min(470px,calc(100%-24px))] w-[min(460px,calc(100%-32px))] rounded-t-2xl',
        )}
      >
        <motion.div layout="position" className={cx('flex h-10 shrink-0 items-center gap-1 bg-[#1f2740] pr-1.5 pl-3.5 text-white', min ? 'cursor-pointer' : '')}>
          <button type="button" onClick={() => onMode(min ? 'docked' : 'min')} className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold focus-visible:outline-none" aria-label={min ? `${title} を開く` : `${title} を最小化`}>
            {title}
          </button>
          {!narrow && (
            <>
              <button type="button" aria-label={min ? '開く' : '最小化'} onClick={() => onMode(min ? 'docked' : 'min')} className="grid size-7 place-items-center rounded-md text-white/80 hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
                <Minus size={15} />
              </button>
              <button type="button" aria-label={max ? '元のサイズに戻す' : '最大化'} onClick={() => onMode(max ? 'docked' : 'max')} className="grid size-7 place-items-center rounded-md text-white/80 hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
                {max ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </>
          )}
          {narrow && min && (
            <button type="button" aria-label="開く" onClick={() => onMode('docked')} className="grid size-7 place-items-center rounded-md text-white/80 hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-white">
              <Maximize2 size={14} />
            </button>
          )}
          {narrow && !min && (
            <button type="button" aria-label="最小化" onClick={() => onMode('min')} className="grid size-7 place-items-center rounded-md text-white/80 hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-white">
              <Minus size={15} />
            </button>
          )}
          <button type="button" aria-label="閉じる（下書きを保存）" onClick={onClose} className="grid size-7 place-items-center rounded-md text-white/80 hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
            <X size={16} />
          </button>
        </motion.div>
        {!min && (
          <div className="flex min-h-0 flex-1 flex-col">
            <RecipientField
              label="宛先"
              value={c.to}
              shake={shake}
              autoFocus={c.focus === 'to'}
              onChange={(to) => {
                setError('')
                onChange({ to })
              }}
              trailing={
                !c.showCc && (
                  <button type="button" onClick={() => onChange({ showCc: true })} className={cx('shrink-0 rounded px-1 text-[12px] text-(--sub) hover:text-(--ink) hover:underline', FOCUS)}>
                    Cc
                  </button>
                )
              }
            />
            {c.showCc && <RecipientField label="Cc" value={c.cc} onChange={(cc) => onChange({ cc })} autoFocus />}
            <div className="border-b border-(--line) px-3.5">
              <input
                value={c.subject}
                onChange={(e) => onChange({ subject: e.target.value })}
                placeholder="件名"
                aria-label="件名"
                className="h-10 w-full bg-transparent text-[13px] text-(--ink) outline-none placeholder:text-(--faint)"
              />
            </div>
            <textarea
              ref={bodyRef}
              value={c.body}
              onChange={(e) => onChange({ body: e.target.value })}
              aria-label="本文"
              placeholder="本文を入力…"
              className="min-h-0 flex-1 resize-none bg-transparent px-3.5 py-3 text-[13.5px] leading-[1.8] text-(--ink) outline-none placeholder:text-(--faint)"
            />
            {c.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3.5 pb-2">
                {c.attachments.map((a) => (
                  <span key={a.name} className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-(--line) bg-(--hover) pr-1 pl-2 text-[11.5px] text-(--ink)">
                    <Paperclip size={12} className="text-(--sub)" />
                    {a.name}
                    <span className="text-(--faint)">{a.size}</span>
                    <button
                      type="button"
                      aria-label={`${a.name} を外す`}
                      onClick={() => onChange({ attachments: c.attachments.filter((x) => x.name !== a.name) })}
                      className={cx('grid size-5 place-items-center rounded hover:bg-black/10', FOCUS)}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-3.5 text-[12px] text-[#c03030]" role="alert">
                  <div className="pb-1.5">{error}</div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-1.5 border-t border-(--line) px-2.5 py-2">
              <button type="button" onClick={send} className={cx('inline-flex h-9 items-center gap-1.5 rounded-full bg-(--acc) pr-4 pl-3.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_-4px_rgb(53_87_212/0.6)] transition-colors hover:bg-(--acc-ink)', FOCUS)}>
                <Send size={14} />
                送信
              </button>
              <IconAction
                label="ファイルを添付"
                onClick={() => {
                  const pool: Attachment[] = [
                    { name: '見積書_2026-11.pdf', size: '184 KB', kind: 'pdf' },
                    { name: 'moodboard.png', size: '2.2 MB', kind: 'lake' },
                    { name: 'schedule.xlsx', size: '64 KB', kind: 'doc' },
                  ]
                  const next = pool.find((a) => !c.attachments.some((x) => x.name === a.name))
                  if (next) onChange({ attachments: [...c.attachments, next] })
                }}
              >
                <Paperclip size={15} />
              </IconAction>
              <span className="ml-auto pr-1">{statusEl}</span>
              <IconAction label="下書きを破棄" onClick={onDiscard}>
                <Trash2 size={15} />
              </IconAction>
            </div>
          </div>
        )}
      </motion.section>
    </>
  )
}

/* ───────────── トースト ───────────── */

function Toast({ toast, onDone, reduced, narrow }: { toast: ToastState; onDone: () => void; reduced: boolean; narrow: boolean }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, toast.ms)
    return () => window.clearTimeout(t)
  }, [toast, onDone])
  return (
    <motion.div
      key={toast.id}
      role="status"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      className={cx(
        'absolute z-[55] flex max-w-[calc(100%-24px)] items-center gap-1 overflow-hidden rounded-xl bg-[#1b2130] py-2 pr-1.5 pl-4 text-[13px] text-white shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)]',
        narrow ? 'right-3 bottom-[calc(var(--solo-footer-clearance,0px)+76px)] left-3 mx-auto w-fit' : 'bottom-[calc(var(--solo-footer-clearance,0px)+16px)] left-4',
      )}
    >
      <span className="mr-2 min-w-0 truncate">{toast.text}</span>
      {toast.actions?.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => {
            a.run()
            onDone()
          }}
          className="shrink-0 rounded-lg px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap text-[#9db2ff] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#9db2ff]"
        >
          {a.label}
        </button>
      ))}
      <button type="button" onClick={onDone} aria-label="通知を閉じる" className="grid size-7 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
        <X size={14} />
      </button>
      {toast.actions && (
        <motion.span
          aria-hidden
          className="absolute bottom-0 left-0 h-[2px] bg-[#9db2ff]"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.ms / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  )
}

/* ───────────── 本体 ───────────── */

export function MailClient() {
  const reduced = Boolean(useReducedMotion())
  const rootRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS)
  const [view, setView] = useState<View>('inbox')
  const [query, setQuery] = useState('')
  const [chips, setChips] = useState<Set<Chip>>(() => new Set())
  const [searchFocus, setSearchFocus] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [anchor, setAnchor] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [cursorId, setCursorId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [groupOpen, setGroupOpen] = useState(false)
  const [reply, setReply] = useState<ReplyState | null>(null)
  const [compose, setCompose] = useState<ComposeState | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [snoozeIds, setSnoozeIds] = useState<string[] | null>(null)
  const [labelMenu, setLabelMenu] = useState<'bulk' | 'read' | null>(null)
  const [help, setHelp] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [preview, setPreview] = useState<Attachment | null>(null)
  const [fresh, setFresh] = useState<Set<string>>(() => new Set())
  const [refreshing, setRefreshing] = useState(false)
  const rowRefs = useRef(new Map<string, HTMLButtonElement>())
  const searchRef = useRef<HTMLInputElement>(null)
  const readingRef = useRef<HTMLDivElement>(null)
  useKeepFocus(rootRef)

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mode: Mode = width < 720 ? 'narrow' : width < 1080 ? 'medium' : 'wide'
  const narrow = mode === 'narrow'

  // 数秒後に新着が届く
  useEffect(() => {
    const t = window.setTimeout(() => {
      setThreads((ts) => (ts.some((x) => x.id === INCOMING.id) ? ts : [{ ...INCOMING, msgs: INCOMING.msgs.map((m) => ({ ...m, at: clock() })) }, ...ts]))
      setFresh((s) => new Set(s).add(INCOMING.id))
    }, 7000)
    return () => window.clearTimeout(t)
  }, [])

  const say = useCallback((text: string, actions?: ToastAction[], ms = actions ? 6000 : 3200) => setToast({ id: Date.now() + Math.random(), text, actions, ms }), [])
  const closeToast = useCallback(() => setToast(null), [])

  /* 一覧 */
  const searching = query.trim() !== '' || chips.size > 0
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const weekStart = at(NOW, -((new Date(NOW).getDay() + 6) % 7), 0)
    return threads
      .filter((t) => (searching ? t.folder !== 'trash' && t.folder !== 'drafts' : inView(t, view)))
      .filter((t) => {
        if (chips.has('unread') && !t.unread) return false
        if (chips.has('starred') && !t.starred) return false
        if (chips.has('attach') && !hasAttach(t)) return false
        if (chips.has('important') && !t.important) return false
        if (chips.has('week') && lastAt(t) < weekStart) return false
        if (!q) return true
        const hay = [t.subject, ...t.msgs.flatMap((m) => [PEOPLE[m.from].name, PEOPLE[m.from].email, ...m.body])].join(' ').toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => lastAt(b) - lastAt(a))
  }, [threads, view, query, chips, searching])
  const listIds = list.map((t) => t.id)
  const open = openId ? threads.find((t) => t.id === openId) ?? null : null

  const counts = useMemo(() => {
    const c: Partial<Record<View, number>> = {}
    c.inbox = threads.filter((t) => inView(t, 'inbox') && t.unread).length
    c.snoozed = threads.filter((t) => inView(t, 'snoozed')).length
    c.drafts = threads.filter((t) => inView(t, 'drafts')).length
    for (const l of LABEL_IDS) c[`label:${l}`] = threads.filter((t) => inView(t, `label:${l}`) && t.unread).length
    return c
  }, [threads])

  /* 状態変更(スナップショット付き) */
  const patch = useCallback((ids: string[], fn: (t: Thread) => Thread) => {
    setThreads((ts) => ts.map((t) => (ids.includes(t.id) ? fn(t) : t)))
  }, [])
  const restore = (prev: Thread[]) => {
    const map = new Map(prev.map((t) => [t.id, t]))
    setThreads((ts) => {
      const present = new Set(ts.map((t) => t.id))
      return [...ts.map((t) => map.get(t.id) ?? t), ...prev.filter((t) => !present.has(t.id))]
    })
  }
  const snapshot = (ids: string[]) => threads.filter((t) => ids.includes(t.id))

  /** 開いているスレッドが一覧から消えるとき、次(なければ前)へ進む */
  const advanceFrom = (ids: string[]) => {
    if (!openId || !ids.includes(openId)) return
    if (narrow) {
      setOpenId(null)
      return
    }
    const i = listIds.indexOf(openId)
    const rest = listIds.filter((id) => !ids.includes(id))
    const next = listIds.slice(i + 1).find((id) => !ids.includes(id)) ?? listIds.slice(0, i).reverse().find((id) => !ids.includes(id))
    setOpenId(next && rest.length ? next : null)
    if (next) {
      setCursorId(next)
      patch([next], (t) => ({ ...t, unread: false }))
    }
    resetThreadUi()
  }
  const resetThreadUi = () => {
    setExpanded(new Set())
    setGroupOpen(false)
    setReply(null)
  }
  const doneBulk = (ids: string[]) => setSelected((s) => new Set([...s].filter((x) => !ids.includes(x))))

  const archive = (ids: string[]) => {
    if (!ids.length) return
    const prev = snapshot(ids)
    advanceFrom(ids)
    patch(ids, (t) => ({ ...t, folder: 'archive', snoozedUntil: undefined }))
    doneBulk(ids)
    say(ids.length > 1 ? `${ids.length}件のスレッドをアーカイブしました` : 'スレッドをアーカイブしました', [{ label: '元に戻す', run: () => restore(prev) }])
  }
  const trash = (ids: string[]) => {
    if (!ids.length) return
    const prev = snapshot(ids)
    advanceFrom(ids)
    if (view === 'trash' && !searching) {
      setThreads((ts) => ts.filter((t) => !ids.includes(t.id)))
      say(`${ids.length}件を完全に削除しました`, [{ label: '元に戻す', run: () => restore(prev) }])
    } else {
      patch(ids, (t) => ({ ...t, folder: 'trash', snoozedUntil: undefined }))
      say(ids.length > 1 ? `${ids.length}件のスレッドをゴミ箱に移動しました` : 'スレッドをゴミ箱に移動しました', [{ label: '元に戻す', run: () => restore(prev) }])
    }
    doneBulk(ids)
  }
  const toInbox = (ids: string[]) => {
    const prev = snapshot(ids)
    advanceFrom(ids)
    patch(ids, (t) => ({ ...t, folder: 'inbox', snoozedUntil: undefined }))
    doneBulk(ids)
    say('受信トレイに移動しました', [{ label: '元に戻す', run: () => restore(prev) }])
  }
  const markRead = (ids: string[], read: boolean) => {
    patch(ids, (t) => ({ ...t, unread: !read }))
    if (!read && openId && ids.includes(openId)) setOpenId(null)
  }
  const toggleStar = (ids: string[], on?: boolean) => {
    const target = on ?? !threads.find((t) => t.id === ids[0])?.starred
    patch(ids, (t) => ({ ...t, starred: target }))
  }
  const snooze = (ids: string[], until: number, label: string) => {
    const prev = snapshot(ids)
    advanceFrom(ids)
    patch(ids, (t) => ({ ...t, snoozedUntil: until, folder: t.folder === 'archive' ? 'inbox' : t.folder }))
    doneBulk(ids)
    setSnoozeIds(null)
    say(`${label}（${snoozeLabel(until)}）までスヌーズしました`, [{ label: '元に戻す', run: () => restore(prev) }])
  }
  const toggleLabel = (ids: string[], l: LabelId, on: boolean) =>
    patch(ids, (t) => ({ ...t, labels: on ? (t.labels.includes(l) ? t.labels : [...t.labels, l]) : t.labels.filter((x) => x !== l) }))

  /* 開く・移動 */
  const openThread = (id: string) => {
    const t = threads.find((x) => x.id === id)
    if (!t) return
    setCursorId(id)
    if (t.draft) {
      openCompose({
        draftId: t.id,
        to: t.draft.to.map(personRecipient),
        subject: t.draft.subject,
        body: t.draft.body,
        focus: 'body',
      })
      return
    }
    if (id !== openId) resetThreadUi()
    setOpenId(id)
    setFresh((s) => {
      if (!s.has(id)) return s
      const n = new Set(s)
      n.delete(id)
      return n
    })
    if (t.unread) patch([id], (x) => ({ ...x, unread: false }))
    readingRef.current?.scrollTo({ top: 0 })
  }
  const moveCursor = (dir: 1 | -1) => {
    if (!listIds.length) return
    const cur = cursorId ?? openId
    const i = cur ? listIds.indexOf(cur) : -1
    const next = listIds[Math.max(0, Math.min(listIds.length - 1, i < 0 ? 0 : i + dir))]
    setCursorId(next)
    const el = rowRefs.current.get(next)
    el?.focus({ preventScroll: true })
    el?.scrollIntoView({ block: 'nearest' })
    if (openId && !narrow && next !== openId) openThread(next)
  }
  const selectRow = (id: string, shift: boolean) => {
    setSelected((s) => {
      const n = new Set(s)
      if (shift && anchor && listIds.includes(anchor)) {
        const [a, b] = [listIds.indexOf(anchor), listIds.indexOf(id)].sort((x, y) => x - y)
        const on = !s.has(id)
        for (const x of listIds.slice(a, b + 1)) on ? n.add(x) : n.delete(x)
      } else if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
    setAnchor(id)
  }
  const switchView = (v: View) => {
    setView(v)
    setQuery('')
    setChips(new Set())
    setSelected(new Set())
    setDrawer(false)
    setOpenId(null)
  }

  /* 作成 */
  const openCompose = (init: Partial<ComposeState> = {}) => {
    setCompose((cur) => {
      if (cur && !init.draftId && !init.to && !init.subject) return { ...cur, mode: cur.mode === 'min' ? 'docked' : cur.mode }
      return { key: Date.now(), to: [], cc: [], showCc: false, subject: '', body: '', attachments: [], mode: 'docked', focus: 'to', ...init }
    })
  }
  const composeRef = useRef(compose)
  composeRef.current = compose
  const saveDraft = () => {
    const c = composeRef.current
    if (!c) return
    const empty = !c.to.length && !c.subject.trim() && !c.body.trim()
    const id = c.draftId ?? `d${Date.now()}`
    setThreads((ts) => {
      if (empty) return ts.filter((t) => t.id !== id)
      const draft: Thread = {
        id,
        subject: c.subject,
        folder: 'drafts',
        labels: [],
        unread: false,
        starred: false,
        msgs: [],
        draft: { to: c.to.flatMap((r) => (r.person ? [r.person] : [])), subject: c.subject || '(件名なし)', body: c.body || ' ' },
      }
      return ts.some((t) => t.id === id) ? ts.map((t) => (t.id === id ? draft : t)) : [draft, ...ts]
    })
    if (empty && c.draftId) setCompose((cur) => (cur && cur.key === c.key ? { ...cur, draftId: undefined } : cur))
    else if (!empty && !c.draftId) setCompose((cur) => (cur && cur.key === c.key ? { ...cur, draftId: id } : cur))
  }
  const closeCompose = () => {
    if (!compose) return
    const empty = !compose.to.length && !compose.subject.trim() && !compose.body.trim()
    if (!empty) {
      saveDraft()
      say('下書きを保存しました')
    } else if (compose.draftId) setThreads((ts) => ts.filter((t) => t.id !== compose.draftId))
    setCompose(null)
  }
  const discardCompose = () => {
    if (!compose) return
    const c = compose
    const prev = c.draftId ? snapshot([c.draftId]) : []
    if (c.draftId) setThreads((ts) => ts.filter((t) => t.id !== c.draftId))
    setCompose(null)
    say('下書きを破棄しました', [
      {
        label: '元に戻す',
        run: () => {
          restore(prev)
          setCompose({ ...c, key: Date.now(), mode: 'docked' })
        },
      },
    ])
  }
  const sendCompose = () => {
    if (!compose) return
    const c = compose
    const id = `s${Date.now()}`
    const msg: Msg = {
      id: `${id}m`,
      from: 'me',
      to: c.to.flatMap((r) => (r.person ? [r.person] : [])),
      cc: c.cc.flatMap((r) => (r.person ? [r.person] : [])),
      at: clock(),
      body: c.body.trim() ? c.body.trim().split(/\n{2,}/) : [''],
      attachments: c.attachments.length ? c.attachments : undefined,
    }
    const prevDraft = c.draftId ? snapshot([c.draftId]) : []
    setThreads((ts) => [{ id, subject: c.subject.trim() || '(件名なし)', folder: 'sent', labels: [], unread: false, starred: false, msgs: [msg] }, ...ts.filter((t) => t.id !== c.draftId)])
    setCompose(null)
    say('メッセージを送信しました', [
      {
        label: '送信を取り消す',
        run: () => {
          setThreads((ts) => ts.filter((t) => t.id !== id))
          restore(prevDraft)
          setCompose({ ...c, key: Date.now(), mode: 'docked', focus: 'body' })
        },
      },
      {
        label: '表示',
        run: () => {
          setView('sent')
          setQuery('')
          setChips(new Set())
          setOpenId(id)
          resetThreadUi()
        },
      },
    ], 5000)
  }

  /* 返信 */
  const startReply = (mode: ReplyState['mode']) => {
    if (!open) return
    setReply((r) => (r && r.threadId === open.id ? { ...r, mode, key: Date.now() } : { threadId: open.id, mode, body: '', key: Date.now() }))
  }
  const forward = () => {
    if (!open) return
    const last = open.msgs.at(-1)!
    openCompose({
      subject: `Fwd: ${open.subject}`,
      body: `\n\n---------- 転送メッセージ ----------\n差出人: ${PEOPLE[last.from].name} <${PEOPLE[last.from].email}>\n件名: ${open.subject}\n\n${last.body.join('\n\n')}`,
      attachments: last.attachments ?? [],
      focus: 'to',
    })
  }
  const sendReply = () => {
    if (!reply || !open || !reply.body.trim()) return
    const r = reply
    const t = open
    const last = t.msgs.at(-1)!
    const to = r.mode === 'all' ? [...new Set(t.msgs.flatMap((m) => [m.from, ...m.to]))].filter((x) => x !== 'me') : last.from === 'me' ? last.to : [last.from]
    const msg: Msg = { id: `r${Date.now()}`, from: 'me', to, at: clock(), body: r.body.trim().split(/\n{2,}/) }
    patch([t.id], (x) => ({ ...x, msgs: [...x.msgs, msg] }))
    setReply(null)
    setExpanded((s) => new Set(s).add(msg.id))
    window.setTimeout(() => readingRef.current?.scrollTo({ top: readingRef.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' }), 60)
    say('返信を送信しました', [
      {
        label: '送信を取り消す',
        run: () => {
          patch([t.id], (x) => ({ ...x, msgs: x.msgs.filter((m) => m.id !== msg.id) }))
          setOpenId(t.id)
          setReply({ ...r, key: Date.now() })
        },
      },
    ], 5000)
  }

  /* キーボード */
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const typing = !!target.closest('input, textarea, select, [contenteditable="true"]')
    if (e.key === 'Escape') {
      if (preview) setPreview(null)
      else if (help) setHelp(false)
      else if (snoozeIds) setSnoozeIds(null)
      else if (labelMenu) setLabelMenu(null)
      else if (drawer) setDrawer(false)
      else if (typing && target === searchRef.current) {
        setQuery('')
        setChips(new Set())
        searchRef.current?.blur()
      } else if (typing) (target as HTMLInputElement).blur()
      else if (selected.size) setSelected(new Set())
      else if (openId && narrow) setOpenId(null)
      else return
      e.preventDefault()
      return
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return
    const targetIds = selected.size ? [...selected] : openId ? [openId] : cursorId ? [cursorId] : []
    switch (e.key) {
      case 'j':
        moveCursor(1)
        break
      case 'k':
        moveCursor(-1)
        break
      case 'o':
        if (cursorId) openThread(cursorId)
        break
      case 'Enter':
        if (target.tagName === 'BUTTON') return
        if (cursorId) openThread(cursorId)
        break
      case 'u':
        setOpenId(null)
        if (cursorId) rowRefs.current.get(cursorId)?.focus()
        break
      case 'e':
        archive(targetIds)
        break
      case '#':
      case 'Delete':
        trash(targetIds)
        break
      case 's':
        if (targetIds.length) toggleStar(targetIds)
        break
      case 'x':
        if (cursorId) selectRow(cursorId, false)
        break
      case 'r':
        startReply('reply')
        break
      case 'a':
        startReply('all')
        break
      case 'f':
        forward()
        break
      case 'c':
        openCompose()
        break
      case '/':
        searchRef.current?.focus()
        break
      case '?':
        setHelp(true)
        break
      default:
        return
    }
    e.preventDefault()
  }

  /* ナビ */
  const nav = (rail: boolean) => (
    <nav aria-label="フォルダ" className={cx('flex min-h-0 flex-col', rail ? 'items-center gap-1 py-2' : 'gap-0.5 px-2 py-2')}>
      <LayoutGroup id={rail ? 'rail' : 'nav'}>
        {FOLDERS.map((f) => {
          const active = view === f.id && !searching
          const n = counts[f.id]
          const Icon = f.icon
          if (rail)
            return (
              <span key={f.id} className="group/tip relative">
                <button
                  type="button"
                  aria-label={`${f.label}${n ? `（${n}件）` : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => switchView(f.id)}
                  className={cx('relative grid size-10 place-items-center rounded-xl transition-colors', FOCUS, active ? 'bg-(--acc-soft) text-(--acc-ink)' : 'text-(--sub) hover:bg-(--hover2)')}
                >
                  <Icon size={18} strokeWidth={active ? 2.3 : 1.9} />
                  {!!n && <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-(--acc) px-1 text-[9.5px] font-bold text-white ring-2 ring-(--bg)">{n}</span>}
                </button>
                <span className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 rounded-md bg-[#1b2130] px-2 py-1 text-[11px] whitespace-nowrap text-white opacity-0 transition-opacity delay-300 group-hover/tip:opacity-100">{f.label}</span>
              </span>
            )
          return (
            <button
              key={f.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => switchView(f.id)}
              className={cx('relative flex h-9 items-center gap-3 rounded-full px-3.5 text-[13px] transition-colors', FOCUS, active ? 'font-semibold text-(--acc-ink)' : 'text-[#394155] hover:bg-(--hover2)')}
            >
              {active && <motion.span layoutId={reduced ? undefined : 'mail-nav-pill'} className="absolute inset-0 rounded-full bg-(--acc-soft)" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <Icon size={17} strokeWidth={active ? 2.3 : 1.9} className="relative" />
              <span className="relative flex-1 text-left">{f.label}</span>
              {!!n && <span className={cx('relative text-[12px] tabular-nums', f.id === 'inbox' ? 'font-bold' : 'text-(--faint)')}>{n}</span>}
            </button>
          )
        })}
        {!rail && (
          <>
            <div className="mt-4 mb-1 flex items-center justify-between px-3.5 text-[11.5px] font-semibold tracking-wide text-(--faint)">
              ラベル
              <Tag size={13} />
            </div>
            {LABEL_IDS.map((l) => {
              const v: View = `label:${l}`
              const active = view === v && !searching
              const n = counts[v]
              return (
                <button
                  key={l}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => switchView(v)}
                  className={cx('relative flex h-8 items-center gap-3 rounded-full px-3.5 text-[13px] transition-colors', FOCUS, active ? 'font-semibold text-(--acc-ink)' : 'text-[#394155] hover:bg-(--hover2)')}
                >
                  {active && <motion.span layoutId={reduced ? undefined : 'mail-nav-pill'} className="absolute inset-0 rounded-full bg-(--acc-soft)" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <span className="relative ml-[3px] size-[11px] rounded-[4px]" style={{ background: LABELS[l].color }} />
                  <span className="relative flex-1 text-left">{LABELS[l].name}</span>
                  {!!n && <span className="relative text-[12px] font-semibold text-(--sub) tabular-nums">{n}</span>}
                </button>
              )
            })}
          </>
        )}
      </LayoutGroup>
      {!rail && (
        <div className="mt-auto px-3.5 pt-4 pb-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-(--hover2)">
            <div className="h-full w-[48%] rounded-full bg-[linear-gradient(90deg,#4a6cf0,#7b8ff5)]" />
          </div>
          <div className="mt-1.5 text-[11px] text-(--faint)">15 GB 中 7.2 GB を使用中</div>
        </div>
      )}
    </nav>
  )

  /* 一覧ペイン */
  const allSel = list.length > 0 && list.every((t) => selected.has(t.id))
  const someSel = list.some((t) => selected.has(t.id))
  const selIds = list.filter((t) => selected.has(t.id)).map((t) => t.id)
  const selThreads = list.filter((t) => selected.has(t.id))
  const listTitle = searching ? '検索結果' : viewName(view)

  const listPane = (
    <section aria-label={listTitle} className={cx('relative flex min-h-0 min-w-0 flex-1 flex-col bg-(--pane)', !narrow && 'rounded-2xl shadow-[0_1px_2px_rgb(20_30_60/0.06),0_0_0_1px_var(--line)]')}>
      {/* 検索フィルタ */}
      <AnimatePresence initial={false}>
        {(searchFocus || searching) && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="shrink-0 overflow-hidden border-b border-(--line)"
          >
            <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none]" role="group" aria-label="検索フィルタ">
              {CHIPS.map((c) => {
                const on = chips.has(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      setChips((s) => {
                        const n = new Set(s)
                        on ? n.delete(c.id) : n.add(c.id)
                        return n
                      })
                    }
                    className={cx('inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[12px] whitespace-nowrap transition-colors', FOCUS, on ? 'border-(--acc) bg-(--acc-soft) font-semibold text-(--acc-ink)' : 'border-(--line) text-(--sub) hover:bg-(--hover)')}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                    {c.label}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ヘッダー / 一括操作バー */}
      <div className="relative flex h-12 shrink-0 items-center gap-2 border-b border-(--line) pr-2 pl-[22px]">
        <Checkbox
          checked={allSel}
          mixed={someSel && !allSel}
          label={allSel ? 'すべての選択を解除' : 'すべて選択'}
          onToggle={() => setSelected(allSel || someSel ? new Set() : new Set(listIds))}
        />
        <AnimatePresence mode="wait" initial={false}>
          {someSel ? (
            <motion.div key="bulk" className="flex min-w-0 flex-1 items-center gap-0.5" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.14 }}>
              <span className="mr-1 ml-1.5 shrink-0 rounded-full bg-(--acc-soft) px-2 py-0.5 text-[12px] font-semibold text-(--acc-ink) tabular-nums" aria-live="polite">
                {selIds.length}件<span className="sr-only">を選択中</span>
              </span>
              {view !== 'archive' && view !== 'trash' && (
                <IconAction label="アーカイブ" kbd="e" onClick={() => archive(selIds)}>
                  <Archive size={16} />
                </IconAction>
              )}
              {(view === 'archive' || view === 'trash') && (
                <IconAction label="受信トレイに移動" onClick={() => toInbox(selIds)}>
                  <ArchiveRestore size={16} />
                </IconAction>
              )}
              <IconAction label={view === 'trash' ? '完全に削除' : '削除'} kbd="#" onClick={() => trash(selIds)}>
                <Trash2 size={16} />
              </IconAction>
              {selThreads.some((t) => t.unread) ? (
                <IconAction label="既読にする" onClick={() => markRead(selIds, true)}>
                  <MailOpen size={16} />
                </IconAction>
              ) : (
                <IconAction label="未読にする" onClick={() => markRead(selIds, false)}>
                  <Mail size={16} />
                </IconAction>
              )}
              <IconAction label="スヌーズ" onClick={() => setSnoozeIds(selIds)}>
                <AlarmClock size={16} />
              </IconAction>
              <span className="relative">
                <IconAction label="ラベル" onClick={() => setLabelMenu(labelMenu === 'bulk' ? null : 'bulk')}>
                  <Tag size={16} />
                </IconAction>
                <AnimatePresence>
                  {labelMenu === 'bulk' && <LabelMenu threads={threads} ids={selIds} onToggle={(l, on) => toggleLabel(selIds, l, on)} onClose={() => setLabelMenu(null)} />}
                </AnimatePresence>
              </span>
              <IconAction label={selThreads.every((t) => t.starred) ? 'スターを外す' : 'スターを付ける'} onClick={() => toggleStar(selIds, !selThreads.every((t) => t.starred))}>
                <Star size={16} />
              </IconAction>
              <span className="ml-auto" />
              <IconAction label="選択を解除" onClick={() => setSelected(new Set())}>
                <X size={16} />
              </IconAction>
            </motion.div>
          ) : (
            <motion.div key="head" className="flex min-w-0 flex-1 items-center gap-2 pl-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}>
              <h2 className="truncate text-[14.5px] font-bold text-(--ink)">{listTitle}</h2>
              <span className="shrink-0 text-[12px] text-(--faint) tabular-nums">{list.length}件</span>
              <span className="ml-auto" />
              <IconAction
                label="更新"
                onClick={() => {
                  setRefreshing(true)
                  window.setTimeout(() => setRefreshing(false), 700)
                }}
              >
                <RotateCw size={15} className={refreshing ? 'motion-safe:animate-spin' : ''} />
              </IconAction>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* 行 */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none] [scrollbar-width:thin]">
        {list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 pb-8 text-center">
            <EmptyArt className="w-40" />
            <div className="mt-2 text-[14px] font-semibold text-(--ink)">{searching ? '一致するメールはありません' : view === 'inbox' ? '受信トレイはすっきりです' : `${listTitle}はありません`}</div>
            <div className="mt-1 text-[12px] text-(--faint)">{searching ? 'キーワードやフィルタを変えてお試しください' : 'すてきな一日を。'}</div>
          </div>
        ) : (
          <ul key={searching ? 'search' : view} className="relative">
            <AnimatePresence initial={false}>
              {list.map((t) => (
                <motion.li
                  key={t.id}
                  layout={reduced ? false : 'position'}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, x: -24 }}
                  transition={{ duration: reduced ? 0.12 : 0.24, ease: [0.2, 0.8, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <MailRow
                    t={t}
                    view={searching ? 'inbox' : view}
                    q={query}
                    active={t.id === openId}
                    selected={selected.has(t.id)}
                    selecting={someSel}
                    fresh={fresh.has(t.id)}
                    reduced={reduced}
                    registerRef={(id, el) => (el ? rowRefs.current.set(id, el) : rowRefs.current.delete(id))}
                    onOpen={openThread}
                    onFocusRow={setCursorId}
                    onSelect={selectRow}
                    onStar={(id) => toggleStar([id])}
                    onArchive={archive}
                    onTrash={trash}
                    onRead={markRead}
                    onSnooze={setSnoozeIds}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        {mode === 'wide' && list.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 py-4 text-[11px] text-(--faint)">
            <Keyboard size={12} />
            <kbd className="font-sans">j</kbd>/<kbd className="font-sans">k</kbd> で移動・<kbd className="font-sans">?</kbd> でショートカット一覧
          </div>
        )}
      </div>
    </section>
  )

  /* 閲覧ペイン */
  const idx = open ? listIds.indexOf(open.id) : -1
  const readingPane = (
    <section aria-label="閲覧ペイン" className={cx('@container relative flex min-h-0 min-w-0 flex-1 flex-col bg-(--pane)', !narrow && 'rounded-2xl shadow-[0_1px_2px_rgb(20_30_60/0.06),0_0_0_1px_var(--line)]')}>
      {open ? (
        <>
          <div className="flex h-12 shrink-0 items-center gap-0.5 border-b border-(--line) px-2">
            {narrow && (
              <IconAction label="一覧に戻る" kbd="u" onClick={() => setOpenId(null)}>
                <ArrowLeft size={17} />
              </IconAction>
            )}
            {open.folder === 'archive' || open.folder === 'trash' ? (
              <IconAction label="受信トレイに移動" onClick={() => toInbox([open.id])}>
                <ArchiveRestore size={16} />
              </IconAction>
            ) : (
              <IconAction label="アーカイブ" kbd="e" onClick={() => archive([open.id])}>
                <Archive size={16} />
              </IconAction>
            )}
            <IconAction label="削除" kbd="#" onClick={() => trash([open.id])}>
              <Trash2 size={16} />
            </IconAction>
            <IconAction label="スヌーズ" onClick={() => setSnoozeIds([open.id])}>
              <AlarmClock size={16} />
            </IconAction>
            <IconAction label="未読にする" onClick={() => markRead([open.id], false)}>
              <Mail size={16} />
            </IconAction>
            <span className="relative">
              <IconAction label="ラベル" onClick={() => setLabelMenu(labelMenu === 'read' ? null : 'read')}>
                <Tag size={16} />
              </IconAction>
              <AnimatePresence>
                {labelMenu === 'read' && <LabelMenu threads={threads} ids={[open.id]} onToggle={(l, on) => toggleLabel([open.id], l, on)} onClose={() => setLabelMenu(null)} />}
              </AnimatePresence>
            </span>
            <span className="ml-auto" />
            {idx >= 0 && <span className="mr-1 hidden text-[12px] text-(--faint) tabular-nums @sm:inline">{idx + 1} / {listIds.length}</span>}
            <IconAction label="前のスレッド" kbd="k" disabled={idx <= 0} onClick={() => openThread(listIds[idx - 1])}>
              <ChevronLeft size={17} />
            </IconAction>
            <IconAction label="次のスレッド" kbd="j" disabled={idx < 0 || idx >= listIds.length - 1} onClick={() => openThread(listIds[idx + 1])}>
              <ChevronRight size={17} />
            </IconAction>
          </div>
          <div ref={readingRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={open.id} initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                <div className="px-4 pt-4 pb-3 @md:px-6">
                  <div className="flex items-start gap-2">
                    <h2 className="min-w-0 flex-1 text-[18px] leading-snug font-bold text-(--ink) @md:text-[20px]">{open.subject}</h2>
                    <button
                      type="button"
                      aria-label={open.starred ? 'スターを外す' : 'スターを付ける'}
                      aria-pressed={open.starred}
                      onClick={() => toggleStar([open.id])}
                      className={cx('mt-0.5 grid size-8 place-items-center rounded-full hover:bg-(--hover2)', FOCUS)}
                    >
                      <Star size={18} className={open.starred ? 'fill-[#f5b13d] text-[#e5a326]' : 'text-[#b4bccb]'} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {open.important && (
                      <span className="inline-flex h-5 items-center gap-1 rounded-md bg-[#fdf1df] px-1.5 text-[11px] font-medium text-(--warn)">
                        <Flag size={10} className="fill-current" />
                        重要
                      </span>
                    )}
                    {open.folder !== 'inbox' && (
                      <span className="inline-flex h-5 items-center rounded-md bg-(--hover2) px-1.5 text-[11px] font-medium text-(--sub)">
                        {open.folder === 'archive' ? 'アーカイブ' : open.folder === 'trash' ? 'ゴミ箱' : open.folder === 'sent' ? '送信済み' : '下書き'}
                      </span>
                    )}
                    {open.snoozedUntil && (
                      <span className="inline-flex h-5 items-center gap-1 rounded-md bg-[#fdf1df] px-1.5 text-[11px] font-medium text-(--warn)">
                        <AlarmClock size={11} />
                        {snoozeLabel(open.snoozedUntil)} までスヌーズ中
                      </span>
                    )}
                    {open.labels.map((l) => (
                      <LabelChip key={l} id={l} onRemove={() => toggleLabel([open.id], l, false)} />
                    ))}
                  </div>
                </div>
                {(() => {
                  const msgs = open.msgs
                  const lastI = msgs.length - 1
                  const isOpen = (m: Msg, i: number) => i === lastI || expanded.has(m.id)
                  const hidden = msgs.slice(1, lastI).filter((m, i) => !isOpen(m, i + 1))
                  const collapseMiddle = !groupOpen && hidden.length >= 2
                  const out: ReactNode[] = []
                  msgs.forEach((m, i) => {
                    const mid = i > 0 && i < lastI
                    if (collapseMiddle && mid && !isOpen(m, i)) {
                      if (m.id === hidden[0].id)
                        out.push(
                          <div key="group" className="relative border-t border-(--line) py-2.5">
                            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-(--line)" />
                            <button
                              type="button"
                              onClick={() => setGroupOpen(true)}
                              className={cx('relative ml-4 inline-flex items-center gap-2 rounded-full border border-(--line) bg-white py-1 pr-3 pl-1 text-[12px] text-(--sub) transition-colors hover:border-(--acc) hover:text-(--acc) @md:ml-6', FOCUS)}
                            >
                              <span className="grid size-6 place-items-center rounded-full bg-(--hover2) text-[11px] font-bold text-(--ink)">{hidden.length}</span>
                              件の以前のメッセージ
                              <ChevronDown size={13} />
                            </button>
                          </div>,
                        )
                      return
                    }
                    out.push(
                      <motion.div key={m.id} layout={reduced ? false : 'position'} initial={false}>
                        <MessageView
                          m={m}
                          isLast={i === lastI}
                          expanded={isOpen(m, i)}
                          onToggle={() =>
                            setExpanded((s) => {
                              const n = new Set(s)
                              n.has(m.id) ? n.delete(m.id) : n.add(m.id)
                              return n
                            })
                          }
                          onReply={() => startReply('reply')}
                          onPreview={setPreview}
                        />
                      </motion.div>,
                    )
                  })
                  return out
                })()}
                {open.invite && <InviteCard t={open} onRsvp={(r) => {
                  patch([open.id], (t) => ({ ...t, invite: { ...t.invite!, rsvp: r } }))
                  say(r === 'yes' ? '「参加」で返信しました' : r === 'maybe' ? '「未定」で返信しました' : '「不参加」で返信しました')
                }} />}
                {reply && reply.threadId === open.id ? (
                  <ReplyBox
                    t={open}
                    reply={reply}
                    reduced={reduced}
                    onChange={(body) => setReply((r) => (r ? { ...r, body } : r))}
                    onSend={sendReply}
                    onDiscard={() => setReply(null)}
                  />
                ) : (
                  <div className="px-4 pt-2 pb-6 @md:px-6 @md:pl-[74px]">
                    {open.msgs.at(-1)!.from !== 'me' && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        <Sparkles size={14} className="mt-1.5 mr-0.5 text-(--acc)" aria-hidden />
                        {(SMART_REPLIES[open.id] ?? SMART_REPLIES.default).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReply({ threadId: open.id, mode: 'reply', body: `${s}\n\n`, key: Date.now() })}
                            className={cx('rounded-full border border-[#cdd7f6] bg-[#f6f8ff] px-3 py-1 text-[12px] text-(--acc-ink) transition-colors hover:bg-(--acc-soft)', FOCUS)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { m: 'reply' as const, label: '返信', icon: Reply },
                        { m: 'all' as const, label: '全員に返信', icon: ReplyAll },
                      ].map((b) => (
                        <button key={b.m} type="button" onClick={() => startReply(b.m)} className={cx('inline-flex h-9 items-center gap-1.5 rounded-full border border-(--line) px-4 text-[12.5px] font-medium text-(--ink) transition-colors hover:bg-(--hover)', FOCUS)}>
                          <b.icon size={15} />
                          {b.label}
                        </button>
                      ))}
                      <button type="button" onClick={forward} className={cx('inline-flex h-9 items-center gap-1.5 rounded-full border border-(--line) px-4 text-[12.5px] font-medium text-(--ink) transition-colors hover:bg-(--hover)', FOCUS)}>
                        <Forward size={15} />
                        転送
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <LetterArt className="w-48" />
          <div className="mt-3 text-[15px] font-semibold text-(--ink)">スレッドを選んで読みましょう</div>
          <div className="mt-1 text-[12.5px] text-(--sub)">{counts.inbox ? `受信トレイに未読が ${counts.inbox} 件あります` : '未読のメールはありません'}</div>
          <button type="button" onClick={() => setHelp(true)} className={cx('mt-4 inline-flex items-center gap-1.5 rounded-full border border-(--line) bg-white px-3 py-1.5 text-[12px] text-(--sub) hover:bg-(--hover)', FOCUS)}>
            <Keyboard size={13} />
            キーボードショートカット
          </button>
        </div>
      )}
    </section>
  )

  /* レイアウト */
  const slide = reduced ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : null
  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={THEME}
      className="@container relative flex h-full w-full flex-col overflow-hidden bg-(--bg) text-(--ink) outline-none [font-feature-settings:'palt']"
    >
      {/* ヘッダー */}
      <header className="flex h-[54px] shrink-0 items-center gap-2 px-3">
        {mode !== 'wide' && (
          <IconAction label="メニュー" onClick={() => setDrawer(true)}>
            <Menu size={18} />
          </IconAction>
        )}
        <div className={cx('flex shrink-0 items-center gap-2', mode === 'wide' ? 'w-[200px] pl-2' : narrow ? 'hidden min-[480px]:flex' : '')}>
          <TayoriMark size={28} />
          <span className="text-[17px] font-bold tracking-tight text-(--ink)">Tayori</span>
        </div>
        <div className="relative min-w-0 flex-1 @container">
          <label className="group/search relative flex h-10 max-w-[640px] items-center gap-2 rounded-full bg-white/85 px-3.5 shadow-[0_0_0_1px_var(--line)] transition-shadow focus-within:bg-white focus-within:shadow-[0_0_0_2px_var(--acc),0_6px_20px_-10px_rgb(53_87_212/0.5)]">
            <Search size={16} className="shrink-0 text-(--faint)" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && list[0]) {
                  e.preventDefault()
                  rowRefs.current.get(list[0].id)?.focus()
                }
              }}
              placeholder="メールを検索"
              aria-label="メールを検索"
              className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-(--ink) outline-none placeholder:text-(--faint)"
            />
            {searching ? (
              <button
                type="button"
                aria-label="検索をクリア"
                onClick={() => {
                  setQuery('')
                  setChips(new Set())
                }}
                className={cx('grid size-6 place-items-center rounded-full text-(--sub) hover:bg-(--hover2)', FOCUS)}
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="hidden rounded-md border border-(--line) px-1.5 font-sans text-[11px] text-(--faint) @xs:inline">/</kbd>
            )}
          </label>
        </div>
        <IconAction label="キーボードショートカット" kbd="?" onClick={() => setHelp(true)}>
          <CircleHelp size={18} />
        </IconAction>
        <span title={`${PEOPLE.me.name} <${PEOPLE.me.email}>`} className="ml-0.5">
          <Avatar id="me" size={32} />
        </span>
      </header>

      {/* 本体 */}
      <div className="flex min-h-0 flex-1 gap-2 px-2 pb-2">
        {mode === 'wide' && (
          <div className="flex w-[212px] shrink-0 flex-col">
            <div className="px-2 pt-1 pb-2">
              <button
                type="button"
                onClick={() => openCompose()}
                className={cx('inline-flex h-12 items-center gap-2.5 rounded-2xl bg-white pr-5 pl-4 text-[13.5px] font-semibold text-(--ink) shadow-[0_1px_2px_rgb(20_30_60/0.08),0_4px_14px_-6px_rgb(20_30_60/0.2)] transition-shadow hover:shadow-[0_2px_4px_rgb(20_30_60/0.1),0_10px_24px_-8px_rgb(20_30_60/0.3)]', FOCUS)}
              >
                <SquarePen size={18} className="text-(--acc)" />
                作成
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none]">{nav(false)}</div>
          </div>
        )}
        {mode === 'medium' && (
          <div className="flex w-12 shrink-0 flex-col items-center">
            <span className="group/tip relative">
              <button type="button" aria-label="作成" onClick={() => openCompose()} className={cx('grid size-11 place-items-center rounded-2xl bg-white text-(--acc) shadow-[0_1px_2px_rgb(20_30_60/0.08),0_4px_14px_-6px_rgb(20_30_60/0.2)]', FOCUS)}>
                <SquarePen size={18} />
              </button>
            </span>
            {nav(true)}
          </div>
        )}
        {narrow ? (
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-(--pane) shadow-[0_0_0_1px_var(--line)]">
            <AnimatePresence initial={false} mode="popLayout">
              {open ? (
                <motion.div key="read" className="absolute inset-0 flex" {...(slide ?? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } })} transition={{ duration: reduced ? 0.15 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
                  {readingPane}
                </motion.div>
              ) : (
                <motion.div key="list" className="absolute inset-0 flex flex-col" {...(slide ?? { initial: { x: '-30%', opacity: 0.6 }, animate: { x: 0, opacity: 1 }, exit: { x: '-30%', opacity: 0.6 } })} transition={{ duration: reduced ? 0.15 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
                  {listPane}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <>
            <div className={cx('flex min-h-0 shrink-0 flex-col', mode === 'wide' ? 'w-[min(390px,34%)]' : 'w-[min(360px,44%)]')}>{listPane}</div>
            {readingPane}
          </>
        )}
      </div>

      {/* 狭い幅の作成ボタン */}
      {narrow && !compose && !open && (
        <motion.button
          type="button"
          onClick={() => openCompose()}
          initial={reduced ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cx('absolute right-5 bottom-[calc(var(--solo-footer-clearance,0px)+20px)] z-30 inline-flex h-13 items-center gap-2 rounded-2xl bg-(--acc) px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-8px_rgb(53_87_212/0.8)]', FOCUS)}
        >
          <SquarePen size={18} />
          作成
        </motion.button>
      )}

      {/* ドロワー(狭い/中くらいの幅) */}
      <AnimatePresence>
        {drawer && mode !== 'wide' && (
          <>
            <motion.button type="button" aria-label="メニューを閉じる" className="absolute inset-0 z-[58] cursor-default bg-[#0f1729]/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.div
              role="dialog"
              aria-label="メニュー"
              className="absolute inset-y-0 left-0 z-[59] flex w-[264px] max-w-[85%] flex-col bg-(--bg) shadow-2xl"
              initial={reduced ? { opacity: 0 } : { x: '-100%' }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { x: '-100%' }}
              transition={{ duration: reduced ? 0.15 : 0.26, ease: [0.2, 0.8, 0.2, 1] }}
              ref={(el) => el?.querySelector<HTMLButtonElement>('nav button')?.focus()}
            >
              <div className="flex h-[54px] items-center gap-2 px-4">
                <TayoriMark size={28} />
                <span className="text-[17px] font-bold tracking-tight">Tayori</span>
                <button type="button" aria-label="閉じる" onClick={() => setDrawer(false)} className={cx(ICON_BTN, 'ml-auto')}>
                  <X size={17} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">{nav(false)}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 作成ウィンドウ */}
      <AnimatePresence>
        {compose && (
          <ComposeWindow
            key={compose.key}
            c={compose}
            narrow={narrow}
            reduced={reduced}
            onChange={(p) => setCompose((c) => (c ? { ...c, ...p } : c))}
            onMode={(m) => setCompose((c) => (c ? { ...c, mode: m, focus: m === 'min' ? c.focus : 'body' } : c))}
            onClose={closeCompose}
            onDiscard={discardCompose}
            onSend={sendCompose}
            onAutosave={saveDraft}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{snoozeIds && <SnoozeDialog count={snoozeIds.length} reduced={reduced} onClose={() => setSnoozeIds(null)} onPick={(t, label) => snooze(snoozeIds, t, label)} />}</AnimatePresence>
      <AnimatePresence>{help && <HelpDialog reduced={reduced} onClose={() => setHelp(false)} />}</AnimatePresence>
      <AnimatePresence>{preview && <Lightbox a={preview} reduced={reduced} onClose={() => setPreview(null)} />}</AnimatePresence>
      <AnimatePresence>{toast && <Toast key={toast.id} toast={toast} narrow={narrow} reduced={reduced} onDone={closeToast} />}</AnimatePresence>
    </div>
  )
}
