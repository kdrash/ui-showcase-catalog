import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Droplets,
  Globe,
  Leaf,
  LoaderCircle,
  MapPin,
  Palette,
  Repeat,
  Scissors,
  Sun,
  Sunset,
  UserRound,
  Users,
  Wind,
  X,
} from 'lucide-react'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'

/**
 * Calendly 風の来店予約。サロン「アトリエ ミカ 汐見坂店」・スタッフ・メニュー・住所はすべて架空のオリジナル。
 * - 手順は メニュー＆スタッフ → 日時 → お客様情報 → 完了。AnimatePresence(custom で進む/戻る方向)で横にスライドして切り替わる。
 *   広い幅では左にサロン情報と「選んだ内容」が順に埋まっていくサマリー、狭い幅ではコンパクトなヘッダーに畳んで縦に積む
 * - 空き枠は「日付・スタッフ・時刻」の文字列ハッシュから決定的に生成(定休日は火曜、スタッフごとの休み、土日は混みやすい、当日は2時間後から)。
 *   指名なしは全スタッフの和集合。月カレンダー(date-fns)は空き数に応じて緑/黄の点、満席・定休・期間外は無効化
 * - カレンダーはロービングフォーカス(←→で1日、↑↓で1週、Home/End で週の端、PageUp/PageDown で月)。月をまたぐと月表示も追従
 * - 枠はサロンの日本時間で持ち、選んだタイムゾーン(Intl.DateTimeFormat の timeZone)で表示。日付がずれると「前日/翌日」タグ。
 *   表示時刻で午前/午後にグループ分けし、選んだ枠は Motion の layout で縮んで隣に「次へ」ボタンが生える
 * - 情報入力はぼかし時と送信時に検証し、最初のエラー欄へフォーカス。確定画面はチェックの線を pathLength で描き、
 *   カレンダー追加(.ics を Blob で生成してダウンロード / 予定をコピー)・日時の変更(フォームはそのまま再利用)・キャンセル(確認つき)
 * - useReducedMotion 時はスライドや線描きをやめて短いフェードだけにする
 */

/* ---------------------------------- データ ---------------------------------- */

type ServiceId = 'cut' | 'color' | 'spa' | 'treat' | 'straight'
type Service = { id: ServiceId; name: string; min: number; price: number; note: string; icon: typeof Scissors; badge?: string }
const SERVICES: Service[] = [
  { id: 'cut', name: 'カット', min: 60, price: 6600, note: 'シャンプー・ブロー込み', icon: Scissors },
  { id: 'color', name: 'カット＋カラー', min: 120, price: 13200, note: '植物由来のカラー剤', icon: Palette, badge: '人気' },
  { id: 'spa', name: 'ヘッドスパ', min: 45, price: 5500, note: '炭酸泉・肩まわりのほぐし', icon: Leaf },
  { id: 'treat', name: '髪質改善トリートメント', min: 90, price: 9900, note: '内部補修＋ツヤ出し', icon: Droplets },
  { id: 'straight', name: '縮毛矯正', min: 180, price: 19800, note: 'ダメージを抑える低温施術', icon: Wind },
]

type Look = { bg: string; skin: string; hair: string; cloth: string; style: 'bob' | 'short' | 'long' | 'bun' }
type Staff = { id: string; name: string; kana: string; role: string; fee: number; off: number; look: Look }
const STAFF: Staff[] = [
  { id: 'miura', name: '三浦 灯', kana: 'みうら あかり', role: 'ディレクター', fee: 1100, off: 1, look: { bg: '#f3dccb', skin: '#f6d2b8', hair: '#3b2a24', cloth: '#2d6a5f', style: 'bob' } },
  { id: 'hayase', name: '早瀬 湊', kana: 'はやせ みなと', role: 'スタイリスト', fee: 550, off: 3, look: { bg: '#d9e6ef', skin: '#eac3a3', hair: '#1f1c1b', cloth: '#41536b', style: 'short' } },
  { id: 'onodera', name: '小野寺 かほ', kana: 'おのでら かほ', role: 'スパニスト', fee: 550, off: 4, look: { bg: '#e6e0f2', skin: '#f3d6c2', hair: '#7a4b35', cloth: '#8b6fae', style: 'long' } },
  { id: 'higuchi', name: '樋口 蒼', kana: 'ひぐち あお', role: 'スタイリスト', fee: 0, off: 5, look: { bg: '#e2eedc', skin: '#e8bf9c', hair: '#2b2b33', cloth: '#5f7d4e', style: 'bun' } },
]
const ANY = 'any'

const TIMEZONES = [
  { id: 'Asia/Tokyo', label: '日本時間（東京）' },
  { id: 'Asia/Singapore', label: 'シンガポール' },
  { id: 'Europe/London', label: 'ロンドン' },
  { id: 'America/Los_Angeles', label: 'ロサンゼルス' },
  { id: 'UTC', label: '協定世界時（UTC）' },
]

const OPEN = 10 * 60
const CLOSE = 19 * 60
const MAX_DAYS = 45
const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}

/** サロンの日本時間の壁時計 → 実際の時刻 */
const jstInstant = (d: Date, minutes: number) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, minutes) - 9 * 3600_000)

function closedReason(d: Date, today: Date): string | null {
  if (isBefore(d, today)) return '過去の日付'
  if (differenceInCalendarDays(d, today) > MAX_DAYS) return '受付期間外'
  if (getDay(d) === 2) return '定休日'
  return null
}

function staffSlots(d: Date, staffId: string, dur: number, now: number): number[] {
  const st = STAFF.find((s) => s.id === staffId)
  if (!st || getDay(d) === st.off) return []
  const key = format(d, 'yyyy-MM-dd')
  const weekend = getDay(d) === 0 || getDay(d) === 6
  const out: number[] = []
  for (let m = OPEN; m + dur <= CLOSE; m += 30) {
    if (jstInstant(d, m).getTime() < now + 2 * 3600_000) continue
    const busy = hash(`${key}|${staffId}|${Math.floor(m / 60)}`) < (weekend ? 0.62 : 0.4) || hash(`${key}|${staffId}|${m}`) < 0.25
    if (!busy) out.push(m)
  }
  return out
}

function slotsFor(d: Date, staffId: string, dur: number, now: number, today: Date): number[] {
  if (closedReason(d, today)) return []
  if (staffId !== ANY) return staffSlots(d, staffId, dur, now)
  const set = new Set<number>()
  for (const s of STAFF) for (const m of staffSlots(d, s.id, dur, now)) set.add(m)
  return [...set].sort((a, b) => a - b)
}

function tzParts(instant: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const p = Object.fromEntries(f.formatToParts(instant).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), time: `${p.hour}:${p.minute}` }
}

function tzOffset(tz: string, at: Date) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(at)
  return p.find((x) => x.type === 'timeZoneName')?.value ?? 'GMT'
}

/* ---------------------------------- 小物 ---------------------------------- */

function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#2d6a5f" />
      <path d="M12 27c3-9 6-14 8-14s5 5 8 14" stroke="#f4efe6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M15.5 22h9" stroke="#f4efe6" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="29" cy="12" r="2.2" fill="#e8b48a" />
    </svg>
  )
}

function Face({ look, className = '' }: { look: Look; className?: string }) {
  const cid = useId()
  const back = {
    bob: 'M17 31C17 14 47 14 47 31L48 44C42 47 22 47 16 44Z',
    long: 'M16.5 31C16.5 12 47.5 12 47.5 31L50 58C40 61 24 61 14 58Z',
    short: '',
    bun: '',
  }[look.style]
  const front = {
    bob: 'M19.5 28C21 15 43 14 44.5 28C39 22 29 20.5 19.5 28Z',
    long: 'M19 31C19.5 15 44 14 45 31C41 23 31 18 24 25Z',
    short: 'M19.5 29C18 15 46 12 44.5 28C41 21 35 19.5 31 22.5C27 20 22 23 19.5 29Z',
    bun: 'M19.5 29C20 16 44 16 44.5 29C39 22.5 26 22.5 19.5 29Z',
  }[look.style]
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <clipPath id={cid}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${cid})`}>
        <rect width="64" height="64" fill={look.bg} />
        {back && <path d={back} fill={look.hair} />}
        {look.style === 'bun' && <circle cx="32" cy="13.5" r="6.5" fill={look.hair} />}
        <path d="M10 66C12 52 22 47 32 47S52 52 54 66Z" fill={look.cloth} />
        <path d="M28 40h8v8.5c-2.5 2-5.5 2-8 0Z" fill={look.skin} />
        <path d="M28 46.5c2.5 1.6 5.5 1.6 8 0" stroke="#000" strokeOpacity=".08" strokeWidth="2" fill="none" />
        <ellipse cx="32" cy="31" rx="12.5" ry="13.5" fill={look.skin} />
        <path d={front} fill={look.hair} />
        <path d="M26 32.5q2-1.8 4 0M34 32.5q2-1.8 4 0" stroke="#3a2a22" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <circle cx="25.5" cy="36.5" r="2" fill="#f19a8a" opacity=".35" />
        <circle cx="38.5" cy="36.5" r="2" fill="#f19a8a" opacity=".35" />
        <path d="M30 38.6q2 1.4 4 0" stroke="#a5574a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}

function AnyFace({ className = '' }: { className?: string }) {
  return (
    <span className={`grid place-items-center rounded-full bg-[#ebe5da] text-[#6b6358] ${className}`} aria-hidden="true">
      <Users className="h-1/2 w-1/2" />
    </span>
  )
}

const STEPS = ['メニュー', '日時', 'お客様情報', '完了'] as const
type Step = 0 | 1 | 2 | 3

type Form = { name: string; email: string; phone: string; note: string; remind: boolean; first: boolean }
type Errors = Partial<Record<'name' | 'email' | 'phone', string>>
function validate(f: Form): Errors {
  const e: Errors = {}
  if (!f.name.trim()) e.name = 'お名前を入力してください'
  if (!f.email.trim()) e.email = 'メールアドレスを入力してください'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'メールアドレスの形式が正しくありません'
  if (f.phone.trim() && !/^[0-9０-９\-－ ]{10,14}$/.test(f.phone.trim())) e.phone = '電話番号は10〜11桁の数字で入力してください'
  return e
}

/* ---------------------------------- 本体 ---------------------------------- */

export function TimeSlotBooking() {
  const reduce = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(true)
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width >= 760))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [now] = useState(() => Date.now())
  const today = useMemo(() => startOfDay(new Date(now)), [now])

  const [step, setStep] = useState<Step>(0)
  const [dir, setDir] = useState(1)
  const [serviceId, setServiceId] = useState<ServiceId | null>(null)
  const [staffId, setStaffId] = useState<string>(ANY)
  const [month, setMonth] = useState(() => startOfMonth(today))
  const [date, setDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState<number | null>(null)
  const [tz, setTz] = useState('Asia/Tokyo')
  const [form, setForm] = useState<Form>({ name: '', email: '', phone: '', note: '', remind: true, first: false })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState<{ date: Date; slot: number; staff: string; no: string } | null>(null)
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  const service = SERVICES.find((s) => s.id === serviceId) ?? null
  const dur = service?.min ?? 60
  // 指名なしで予約した場合は、その枠に空いているスタッフを割り当てる
  const assignedStaff = useMemo(() => {
    if (staffId !== ANY) return STAFF.find((s) => s.id === staffId) ?? null
    if (!date || slot == null) return null
    return STAFF.find((s) => staffSlots(date, s.id, dur, now).includes(slot)) ?? null
  }, [staffId, date, slot, dur, now])
  const staffFee = staffId === ANY ? 0 : (STAFF.find((s) => s.id === staffId)?.fee ?? 0)
  const total = (service?.price ?? 0) + staffFee

  const go = (s: Step) => {
    setDir(s > step ? 1 : -1)
    setStep(s)
  }

  const pickService = (id: ServiceId) => {
    setServiceId(id)
    setSlot(null)
  }
  const pickStaff = (id: string) => {
    setStaffId(id)
    setSlot(null)
  }

  const confirm = () => {
    setSubmitting(true)
    window.setTimeout(
      () => {
        setSubmitting(false)
        if (!date || slot == null) return
        const no = booking?.no ?? `MC-${Math.floor(hash(form.email + date.toISOString() + slot) * 1e6).toString(36).toUpperCase().padStart(4, '0')}`
        setBooking({ date, slot, staff: assignedStaff?.id ?? STAFF[0].id, no })
        setToast(rescheduling ? { id: Date.now(), text: '予約の日時を変更しました' } : null)
        setRescheduling(false)
        setCancelled(false)
        go(3)
      },
      reduce ? 300 : 1000,
    )
  }

  const startReschedule = () => {
    setRescheduling(true)
    setSlot(null)
    go(1)
  }

  const startOver = () => {
    setBooking(null)
    setCancelled(false)
    setRescheduling(false)
    setDate(null)
    setSlot(null)
    setServiceId(null)
    setStaffId(ANY)
    go(0)
  }

  const slide = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 36 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -36 }),
  }

  const back = step === 1 ? 0 : step === 2 ? 1 : null

  const summaryRows: { icon: ReactNode; label: string; value: ReactNode; key: string }[] = []
  if (service) summaryRows.push({ key: 's', icon: <service.icon className="h-4 w-4" />, label: 'メニュー', value: service.name })
  if (service) summaryRows.push({ key: 'd', icon: <Clock3 className="h-4 w-4" />, label: '所要時間', value: `${service.min}分` })
  if (service)
    summaryRows.push({
      key: 'st',
      icon: <UserRound className="h-4 w-4" />,
      label: 'スタッフ',
      value: staffId === ANY ? (assignedStaff && step >= 2 ? `${assignedStaff.name}（指名なし）` : '指名なし') : STAFF.find((s) => s.id === staffId)?.name,
    })
  if (date && slot != null && step >= 1)
    summaryRows.push({ key: 't', icon: <CalendarClock className="h-4 w-4" />, label: '日時', value: fmtWhen(date, slot, dur, tz) })

  return (
    <div
      ref={rootRef}
      className="@container relative flex h-full w-full overflow-hidden bg-[#f6f2ec] text-[#22201c] [font-feature-settings:'palt']"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && toast) setToast(null)
      }}
    >
      {/* 広い幅: サロン情報とサマリー */}
      {wide && (
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-[#e6dfd3] bg-[#fbf8f3] px-6 py-6">
          <div className="flex items-center gap-2.5">
            <Logo className="h-10 w-10" />
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-wide">atelier mica</p>
              <p className="text-[11px] text-[#8a8174]">アトリエ ミカ 汐見坂店</p>
            </div>
          </div>
          <h2 className="mt-6 flex items-center gap-2 text-[22px] font-bold leading-snug tracking-tight">
            ご来店予約
            {cancelled && step === 3 && <span className="rounded-full bg-[#efe9df] px-2 py-0.5 text-[10px] font-semibold text-[#8a8174]">キャンセル済み</span>}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#8a8174]">ご希望のメニューと日時をお選びください。予約は1分ほどで完了します。</p>
          <ul className={`mt-5 space-y-3 transition-opacity ${cancelled && step === 3 ? 'opacity-45 [&_p.font-semibold]:line-through' : ''}`}>
            <AnimatePresence initial={false}>
              {summaryRows.map((r) => (
                <motion.li
                  key={r.key}
                  layout={!reduce}
                  initial={{ opacity: 0, x: reduce ? 0 : -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5"
                >
                  <span className="mt-0.5 text-[#2d6a5f]">{r.icon}</span>
                  <div className="min-w-0 text-[13px] leading-snug">
                    <p className="text-[10px] text-[#9a9083]">{r.label}</p>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p key={String(r.value)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="font-semibold">
                        {r.value}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {service && (
            <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-[#e0d8ca] pt-3">
              <span className="text-xs text-[#8a8174]">お支払い予定（税込）</span>
              <span className="text-lg font-bold tabular-nums">{yen(total)}</span>
            </div>
          )}
          <div className="mt-auto space-y-1.5 pt-4 text-[11px] text-[#8a8174]">
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> 汐見坂 3-12-8 ハルニレ館 2F
            </p>
            <p className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" /> 10:00–19:00 ・ 火曜定休
            </p>
          </div>
        </aside>
      )}

      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* 上部: 手順 */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[#e6dfd3] px-4 py-3 @3xl:px-8">
          {!wide && <Logo className="h-8 w-8 shrink-0" />}
          {back != null && (
            <button
              type="button"
              onClick={() => go(back as Step)}
              aria-label="前の手順へ戻る"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#e0d8ca] bg-white text-[#2d6a5f] transition hover:bg-[#eef5f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a5f]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {!wide && <p className="truncate text-[11px] text-[#8a8174]">atelier mica 汐見坂店</p>}
            <ol className="flex items-center gap-1.5" aria-label="予約の手順">
              {STEPS.map((l, i) => (
                <li key={l} className="flex items-center gap-1.5" aria-current={i === step ? 'step' : undefined}>
                  {i > 0 && <span className={`h-px w-3 @md:w-6 ${i <= step ? 'bg-[#2d6a5f]' : 'bg-[#ddd5c7]'}`} />}
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors ${i < step ? 'bg-[#2d6a5f] text-white' : i === step ? 'bg-[#22201c] text-white' : 'bg-[#e9e3d8] text-[#a1978a]'}`}
                  >
                    {i < step ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`text-xs ${i === step ? 'font-semibold text-[#22201c]' : 'hidden text-[#a1978a] @2xl:inline'}`}>{l}</span>
                </li>
              ))}
            </ol>
          </div>
          {!wide && service && step < 3 && <span className="shrink-0 text-sm font-bold tabular-nums">{yen(total)}</span>}
        </div>

        <div className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 36 }}
              className="absolute inset-0 flex flex-col"
            >
              {step === 0 && (
                <MenuStep
                  serviceId={serviceId}
                  staffId={staffId}
                  onService={pickService}
                  onStaff={pickStaff}
                  onNext={() => go(1)}
                  reduce={reduce}
                />
              )}
              {step === 1 && (
                <DateStep
                  wide={wide}
                  reduce={reduce}
                  today={today}
                  now={now}
                  month={month}
                  setMonth={setMonth}
                  date={date}
                  setDate={(d) => {
                    setDate(d)
                    setSlot(null)
                  }}
                  slot={slot}
                  setSlot={setSlot}
                  staffId={staffId}
                  dur={dur}
                  tz={tz}
                  setTz={setTz}
                  rescheduling={rescheduling && booking ? booking : null}
                  onCancelReschedule={() => {
                    setRescheduling(false)
                    if (booking) {
                      setDate(booking.date)
                      setSlot(booking.slot)
                    }
                    go(3)
                  }}
                  onNext={() => (rescheduling ? confirm() : go(2))}
                  submitting={submitting}
                />
              )}
              {step === 2 && (
                <DetailsStep
                  form={form}
                  setForm={setForm}
                  touched={touched}
                  setTouched={setTouched}
                  submitting={submitting}
                  onSubmit={confirm}
                  when={date && slot != null ? fmtWhen(date, slot, dur, tz) : ''}
                  serviceName={service?.name ?? ''}
                />
              )}
              {step === 3 && booking && service && (
                <DoneStep
                  reduce={reduce}
                  booking={booking}
                  service={service}
                  staffNominated={staffId !== ANY}
                  total={total}
                  tz={tz}
                  email={form.email}
                  name={form.name}
                  cancelled={cancelled}
                  onCancel={() => setCancelled(true)}
                  onReschedule={startReschedule}
                  onStartOver={startOver}
                  toast={(text) => setToast({ id: Date.now(), text })}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : 8 }}
              className="pointer-events-none absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#22201c] px-4 py-2 text-xs text-white shadow-lg"
            >
              <Check className="h-3.5 w-3.5 text-[#9fd6c4]" /> {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function fmtTime(d: Date, m: number, tz: string) {
  return tzParts(jstInstant(d, m), tz).time
}
/** 表示タイムゾーンでの日付(サロンの日付と1日ずれることがある) */
function localDay(d: Date, m: number, tz: string) {
  const [y, mo, da] = tzParts(jstInstant(d, m), tz).date.split('-').map(Number)
  return new Date(y, mo - 1, da)
}
function fmtWhen(d: Date, m: number, dur: number, tz: string) {
  return `${format(localDay(d, m, tz), 'M月d日(E)', { locale: ja })} ${fmtRange(d, m, dur, tz)}`
}
function fmtRange(d: Date, m: number, dur: number, tz: string) {
  return `${fmtTime(d, m, tz)}–${fmtTime(d, m + dur, tz)}`
}

/* ---------------------------------- 1. メニュー ---------------------------------- */

function MenuStep({
  serviceId,
  staffId,
  onService,
  onStaff,
  onNext,
  reduce,
}: {
  serviceId: ServiceId | null
  staffId: string
  onService: (id: ServiceId) => void
  onStaff: (id: string) => void
  onNext: () => void
  reduce: boolean
}) {
  const radioKeys = <T,>(list: T[], cur: T, set: (v: T) => void, attr: string) => (e: ReactKeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const i = Math.max(0, list.indexOf(cur))
    const next = list[(i + d + list.length) % list.length]
    set(next)
    const el = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[${attr}="${String(next)}"]`)
    el?.focus()
  }
  const staffIds = [ANY, ...STAFF.map((s) => s.id)]
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 @3xl:px-8">
        <h3 id="tsb-menu" className="mb-2 text-sm font-bold">
          メニューを選ぶ
        </h3>
        <div role="radiogroup" aria-labelledby="tsb-menu" className="grid gap-2 @xl:grid-cols-2" onKeyDown={radioKeys(SERVICES.map((s) => s.id), serviceId ?? SERVICES[0].id, onService, 'data-svc')}>
          {SERVICES.map((s, i) => {
            const on = s.id === serviceId
            return (
              <motion.button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                data-svc={s.id}
                tabIndex={on || (!serviceId && i === 0) ? 0 : -1}
                onClick={() => onService(s.id)}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : i * 0.04 }}
                className={`group relative flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a5f] ${on ? 'border-[#2d6a5f] bg-white shadow-[0_6px_20px_-12px_rgba(45,106,95,.6)]' : 'border-[#e6dfd3] bg-white/60 hover:border-[#cfc5b4] hover:bg-white'}`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${on ? 'bg-[#2d6a5f] text-white' : 'bg-[#efe9df] text-[#6b6358]'}`}>
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                    {s.name}
                    {s.badge && <span className="rounded-full bg-[#f6e3d3] px-1.5 text-[9px] font-bold leading-4 text-[#b0603a]">{s.badge}</span>}
                  </span>
                  <span className="block truncate text-[11px] text-[#8a8174]">
                    {s.min}分 ・ {s.note}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] font-bold tabular-nums">{yen(s.price)}</span>
                <span className={`absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-[#2d6a5f] text-white transition ${on ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                  <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                </span>
              </motion.button>
            )
          })}
        </div>

        <h3 id="tsb-staff" className="mb-1.5 mt-4 text-sm font-bold">
          スタッフ <span className="ml-1 text-[11px] font-normal text-[#8a8174]">指名料は別途</span>
        </h3>
        <div role="radiogroup" aria-labelledby="tsb-staff" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" onKeyDown={radioKeys(staffIds, staffId, onStaff, 'data-staff')}>
          {staffIds.map((id) => {
            const st = STAFF.find((s) => s.id === id)
            const on = id === staffId
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                data-staff={id}
                tabIndex={on ? 0 : -1}
                onClick={() => onStaff(id)}
                aria-label={st ? `${st.name} ${st.role} 指名料${st.fee ? yen(st.fee) : 'なし'}` : '指名なし'}
                className={`flex w-[92px] shrink-0 flex-col items-center rounded-2xl border px-2 pb-2 pt-2.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a5f] ${on ? 'border-[#2d6a5f] bg-white' : 'border-transparent hover:bg-white/70'}`}
              >
                <span className={`relative rounded-full p-0.5 transition ${on ? 'ring-2 ring-[#2d6a5f] ring-offset-2 ring-offset-white' : ''}`}>
                  {st ? <Face look={st.look} className="h-12 w-12 rounded-full" /> : <AnyFace className="h-12 w-12" />}
                  <AnimatePresence>
                    {on && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 22 }}
                        className="absolute -bottom-0.5 -right-0.5 grid h-4.5 w-4.5 place-items-center rounded-full border-2 border-white bg-[#2d6a5f] text-white"
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className="mt-1.5 text-[12px] font-semibold leading-tight">{st ? st.name.split(' ')[0] : '指名なし'}</span>
                <span className="text-[10px] leading-tight text-[#8a8174]">{st ? `${st.role}` : 'おまかせ'}</span>
                <span className="text-[10px] leading-tight text-[#b0603a]">{st ? (st.fee ? `+${yen(st.fee)}` : '指名料なし') : '最短で案内'}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#e6dfd3] bg-[#f6f2ec]/90 px-4 py-3 @3xl:px-8">
        {!serviceId && <span className="mr-auto text-[11px] text-[#9a9083]">メニューを1つ選んでください</span>}
        <button
          type="button"
          disabled={!serviceId}
          onClick={onNext}
          className="flex h-10 items-center gap-1.5 rounded-full bg-[#2d6a5f] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(45,106,95,.9)] transition hover:bg-[#245a50] disabled:cursor-not-allowed disabled:bg-[#d8d0c3] disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a5f]"
        >
          日時を選ぶ <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}

/* ---------------------------------- 2. 日時 ---------------------------------- */

function DateStep(p: {
  wide: boolean
  reduce: boolean
  today: Date
  now: number
  month: Date
  setMonth: (d: Date) => void
  date: Date | null
  setDate: (d: Date) => void
  slot: number | null
  setSlot: (m: number | null) => void
  staffId: string
  dur: number
  tz: string
  setTz: (tz: string) => void
  rescheduling: { date: Date; slot: number } | null
  onCancelReschedule: () => void
  onNext: () => void
  submitting: boolean
}) {
  const { today, now, month, date, staffId, dur, tz } = p
  const [focusDay, setFocusDay] = useState<Date>(() => date ?? today)
  const gridRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const slotsRef = useRef<HTMLDivElement>(null)
  const kbMove = useRef(false)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
    const out: Date[] = []
    for (let d = start; !isBefore(end, d); d = addDays(d, 1)) out.push(d)
    return out
  }, [month])

  const avail = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of days) m.set(d.toDateString(), slotsFor(d, staffId, dur, now, today).length)
    return m
  }, [days, staffId, dur, now, today])

  const slots = useMemo(() => (date ? slotsFor(date, staffId, dur, now, today) : []), [date, staffId, dur, now, today])
  // 表示タイムゾーンでの「日付＋午前/午後」でまとめる(枠は時刻順なので、グループも時系列に並ぶ)
  const groups = useMemo(() => {
    const out: { key: string; label: string; icon: ReactNode; list: number[] }[] = []
    if (!date) return out
    const salonDay = format(date, 'yyyy-MM-dd')
    for (const m of slots) {
      const t = tzParts(jstInstant(date, m), tz)
      const am = t.hour < 12
      const key = `${t.date}-${am ? 'am' : 'pm'}`
      let g = out.find((x) => x.key === key)
      if (!g) {
        const shifted = t.date !== salonDay
        const dayLabel = shifted ? `${format(localDay(date, m, tz), 'M/d(E)', { locale: ja })} ` : ''
        g = { key, label: `${dayLabel}${am ? '午前' : '午後'}`, icon: am ? <Sun className="h-3.5 w-3.5" /> : <Sunset className="h-3.5 w-3.5" />, list: [] }
        out.push(g)
      }
      g.list.push(m)
    }
    return out
  }, [slots, date, tz])

  const minMonth = startOfMonth(today)
  const maxMonth = startOfMonth(addDays(today, MAX_DAYS))

  useEffect(() => {
    if (!kbMove.current) return
    kbMove.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay.toDateString()}"]`)?.focus()
  }, [focusDay, month])

  const moveFocus = (d: Date) => {
    if (isBefore(d, startOfMonth(today))) return
    if (isBefore(endOfMonth(maxMonth), d)) return
    kbMove.current = true
    setFocusDay(d)
    if (!isSameMonth(d, month)) p.setMonth(startOfMonth(d))
  }

  const onGridKey = (e: ReactKeyboardEvent) => {
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      Home: () => startOfWeek(focusDay),
      End: () => endOfWeek(focusDay),
      PageUp: () => addMonths(focusDay, -1),
      PageDown: () => addMonths(focusDay, 1),
    }
    const f = map[e.key]
    if (!f) return
    e.preventDefault()
    moveFocus(f())
  }

  const choose = (d: Date) => {
    p.setDate(d)
    setFocusDay(d)
    // 狭い幅では下の時間枠までスクロール(ページではなくこの中だけ)
    if (!p.wide)
      window.setTimeout(() => {
        const sc = scrollRef.current
        const sl = slotsRef.current
        if (sc && sl) sc.scrollTo({ top: sl.offsetTop - 8, behavior: p.reduce ? 'auto' : 'smooth' })
      }, 60)
  }

  const focusInMonth = isSameMonth(focusDay, month) ? focusDay : (days.find((d) => isSameMonth(d, month) && !isBefore(d, today)) ?? startOfMonth(month))
  const offset = tzOffset(tz, new Date(now))

  const calendar = (
    <div className="w-full max-w-[400px]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold" aria-live="polite">
          {format(month, 'yyyy年 M月', { locale: ja })}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="前の月"
            disabled={!isBefore(minMonth, month)}
            onClick={() => p.setMonth(addMonths(month, -1))}
            className="grid h-8 w-8 place-items-center rounded-full text-[#2d6a5f] transition hover:bg-[#e4efe9] disabled:text-[#cfc6b8] disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-[#2d6a5f]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="次の月"
            disabled={!isBefore(month, maxMonth)}
            onClick={() => p.setMonth(addMonths(month, 1))}
            className="grid h-8 w-8 place-items-center rounded-full text-[#2d6a5f] transition hover:bg-[#e4efe9] disabled:text-[#cfc6b8] disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-[#2d6a5f]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#a1978a]" aria-hidden="true">
        {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
          <span key={w} className={`py-1 ${i === 0 ? 'text-[#c0715a]' : i === 6 ? 'text-[#5a7fa8]' : ''}`}>
            {w}
          </span>
        ))}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={month.toISOString()}
          ref={gridRef}
          role="grid"
          aria-label="日付を選ぶ"
          onKeyDown={onGridKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-7 gap-y-0.5"
        >
          {days.map((d) => {
            const inMonth = isSameMonth(d, month)
            const reason = closedReason(d, today)
            const n = avail.get(d.toDateString()) ?? 0
            const disabled = !inMonth || !!reason || n === 0
            const sel = !!date && isSameDay(d, date)
            const isToday = isSameDay(d, today)
            const label = `${format(d, 'M月d日 EEEE', { locale: ja })}、${reason ?? (n === 0 ? '満席' : n <= 4 ? `残り${n}枠` : `空き${n}枠`)}`
            if (!inMonth) return <span key={d.toISOString()} role="gridcell" aria-hidden="true" />
            return (
              <span key={d.toISOString()} role="gridcell" className="grid place-items-center">
                <button
                  type="button"
                  data-day={d.toDateString()}
                  tabIndex={isSameDay(d, focusInMonth) ? 0 : -1}
                  aria-label={isToday ? `今日 ${label}` : label}
                  aria-pressed={sel}
                  aria-disabled={disabled || undefined}
                  onClick={() => !disabled && choose(d)}
                  onFocus={() => setFocusDay(d)}
                  className={`relative flex h-11 w-11 max-w-full flex-col items-center justify-center rounded-full text-[13px] tabular-nums outline-none transition focus-visible:ring-2 focus-visible:ring-[#2d6a5f] focus-visible:ring-offset-1 ${isToday && !sel ? 'shadow-[inset_0_0_0_1.5px_#d9957d]' : ''} ${
                    sel
                      ? 'bg-[#2d6a5f] font-bold text-white shadow-[0_6px_16px_-8px_rgba(45,106,95,.9)]'
                      : disabled
                        ? `cursor-default text-[#c9c0b2] ${reason === '定休日' ? '' : n === 0 && !reason ? 'line-through decoration-[#d8cfc1]' : ''}`
                        : 'bg-[#e4efe9] font-semibold text-[#245a50] hover:bg-[#d3e6dc]'
                  }`}
                >
                  {format(d, 'd')}
                  {!disabled && (
                    <span className="absolute bottom-1.5 flex gap-0.5" aria-hidden="true">
                      <span className={`h-1 w-1 rounded-full ${sel ? 'bg-white' : n <= 4 ? 'bg-[#e0a24a]' : 'bg-[#2d6a5f]'}`} />
                      {n > 8 && <span className={`h-1 w-1 rounded-full ${sel ? 'bg-white/70' : 'bg-[#2d6a5f]/60'}`} />}
                    </span>
                  )}
                </button>
              </span>
            )
          })}
        </motion.div>
      </AnimatePresence>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#9a9083]">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2d6a5f]" /> 空きあり
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e0a24a]" /> 残りわずか
        </span>
        <span>火曜定休 ・ {MAX_DAYS}日先まで受付</span>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-[#6b6358]">
        <Globe className="h-3.5 w-3.5 shrink-0 text-[#2d6a5f]" />
        <span className="sr-only">タイムゾーン</span>
        <span className="relative min-w-0 flex-1">
          <select
            value={tz}
            onChange={(e) => p.setTz(e.target.value)}
            className="w-full cursor-pointer appearance-none rounded-lg border border-[#e0d8ca] bg-white py-1.5 pl-2.5 pr-7 text-xs text-[#22201c] focus-visible:outline-2 focus-visible:outline-[#2d6a5f]"
          >
            {TIMEZONES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}（{tzOffset(t.id, new Date(now))}）
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a8174]" />
        </span>
      </label>
    </div>
  )

  const slotList = (
    <div ref={slotsRef} className="w-full">
      {date ? (
        <>
          <h3 className="text-sm font-bold">{format(date, 'M月d日(E)', { locale: ja })}</h3>
          <p className="mb-2 text-[11px] text-[#8a8174]">
            {slots.length}枠の空き ・ 表示: {offset}
            {tz !== 'Asia/Tokyo' && '（サロンは日本時間）'}
          </p>
          {groups.map(
            (g) =>
              g.list.length > 0 && (
                <div key={g.key} className="mb-3">
                  <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#8a8174]">
                    {g.icon} {g.label}
                  </p>
                  <ul className="space-y-1.5">
                    {g.list.map((m) => {
                      const on = p.slot === m
                      const parts = tzParts(jstInstant(date, m), tz)
                      const dayShift = differenceInCalendarDays(new Date(parts.date), new Date(format(date, 'yyyy-MM-dd')))
                      return (
                        <li key={m} className="flex gap-1.5">
                          <motion.button
                            layout={!p.reduce}
                            type="button"
                            aria-pressed={on}
                            onClick={() => p.setSlot(on ? null : m)}
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                            className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a5f] ${on ? 'w-1/2 border-[#6b6358] bg-[#6b6358] text-white' : 'w-full border-[#b9d3c8] bg-white text-[#245a50] hover:border-[#2d6a5f] hover:bg-[#f2f8f5]'}`}
                          >
                            <motion.span layout={!p.reduce ? 'position' : false}>{parts.time}</motion.span>
                            {dayShift !== 0 && <span className={`rounded px-1 text-[9px] font-bold ${on ? 'bg-white/20' : 'bg-[#f6e3d3] text-[#b0603a]'}`}>{dayShift < 0 ? '前日' : '翌日'}</span>}
                          </motion.button>
                          <AnimatePresence>
                            {on && (
                              <motion.button
                                type="button"
                                autoFocus
                                onClick={p.onNext}
                                disabled={p.submitting}
                                initial={p.reduce ? { opacity: 0 } : { opacity: 0, width: 0, x: -6 }}
                                animate={p.reduce ? { opacity: 1 } : { opacity: 1, width: '50%', x: 0 }}
                                exit={p.reduce ? { opacity: 0 } : { opacity: 0, width: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                className="flex h-10 shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-xl bg-[#2d6a5f] text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgba(45,106,95,.9)] transition-colors hover:bg-[#245a50] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a5f]"
                                style={p.reduce ? { width: '50%' } : undefined}
                              >
                                {p.submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : p.rescheduling ? '変更する' : '次へ'}
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ),
          )}
        </>
      ) : (
        <div className="grid h-full min-h-[140px] place-items-center rounded-2xl border border-dashed border-[#ddd5c7] px-4 text-center text-xs leading-relaxed text-[#9a9083]">
          <div>
            <CalendarClock className="mx-auto mb-2 h-6 w-6 text-[#c9c0b2]" />
            カレンダーから日付を選ぶと
            <br />
            空いている時間が表示されます
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div ref={scrollRef} className={`relative flex min-h-0 flex-1 flex-col px-4 pt-3 @3xl:px-8 @3xl:pt-4 ${p.wide ? 'overflow-hidden' : 'overflow-y-auto pb-6'}`}>
      {p.rescheduling && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#ecd3bd] bg-[#fbeee2] px-3 py-2 text-xs text-[#8a4a2c]">
          <Repeat className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1">
            日時を変更中 ・ 現在: {format(p.rescheduling.date, 'M/d(E)', { locale: ja })} {fmtTime(p.rescheduling.date, p.rescheduling.slot, tz)}
          </span>
          <button type="button" onClick={p.onCancelReschedule} className="shrink-0 rounded font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#b0603a]">
            変更をやめる
          </button>
        </div>
      )}
      {p.wide ? (
        <div className="flex min-h-0 flex-1 gap-8">
          <div className="min-h-0 overflow-y-auto pb-4">{calendar}</div>
          <div className="min-h-0 w-[250px] shrink-0 overflow-y-auto border-l border-[#e6dfd3] pb-6 pl-6 pr-1 [scrollbar-width:thin]">{slotList}</div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          {calendar}
          {slotList}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------- 3. お客様情報 ---------------------------------- */

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#4a443c]">
        {label}
        {required ? <span className="rounded bg-[#f6e3d3] px-1 text-[9px] font-bold text-[#b0603a]">必須</span> : <span className="text-[10px] font-normal text-[#a1978a]">任意</span>}
        {hint && <span className="ml-auto font-normal text-[#a1978a]">{hint}</span>}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p id={`${id}-err`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pt-1 text-[11px] text-[#c0473a]" role="alert">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function DetailsStep({
  form,
  setForm,
  touched,
  setTouched,
  submitting,
  onSubmit,
  when,
  serviceName,
}: {
  form: Form
  setForm: (f: Form) => void
  touched: Record<string, boolean>
  setTouched: (t: Record<string, boolean>) => void
  submitting: boolean
  onSubmit: () => void
  when: string
  serviceName: string
}) {
  const uid = useId()
  const errors = validate(form)
  const show = (k: keyof Errors) => (touched[k] ? errors[k] : undefined)
  const input = (bad?: string) =>
    `w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-[#22201c] placeholder:text-[#bdb4a6] transition focus:outline-none focus:ring-2 ${bad ? 'border-[#e3a59c] focus:ring-[#e3a59c]/50' : 'border-[#e0d8ca] focus:border-[#2d6a5f] focus:ring-[#2d6a5f]/20'}`

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, email: true, phone: true })
    const first = (['name', 'email', 'phone'] as const).find((k) => errors[k])
    if (first) {
      document.getElementById(`${uid}-${first}`)?.focus()
      return
    }
    onSubmit()
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 @3xl:px-8 @3xl:pt-4">
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#e4efe9] px-3 py-2 text-xs text-[#245a50]">
          <CalendarClock className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">
            <b>{serviceName}</b> ・ {when}
          </span>
        </div>
        <div className="grid max-w-[560px] gap-3 @xl:grid-cols-2">
          <Field id={`${uid}-name`} label="お名前" required error={show('name')}>
            <input
              id={`${uid}-name`}
              autoComplete="name"
              placeholder="汐見 花子"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onBlur={() => setTouched({ ...touched, name: true })}
              aria-invalid={!!show('name')}
              aria-describedby={show('name') ? `${uid}-name-err` : undefined}
              className={input(show('name'))}
            />
          </Field>
          <Field id={`${uid}-phone`} label="電話番号" error={show('phone')}>
            <input
              id={`${uid}-phone`}
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="090-0000-0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              onBlur={() => setTouched({ ...touched, phone: true })}
              aria-invalid={!!show('phone')}
              aria-describedby={show('phone') ? `${uid}-phone-err` : undefined}
              className={input(show('phone'))}
            />
          </Field>
          <div className="@xl:col-span-2">
            <Field id={`${uid}-email`} label="メールアドレス" required error={show('email')} hint="確認メールが届きます">
              <input
                id={`${uid}-email`}
                type="email"
                autoComplete="email"
                placeholder="hanako@example.jp"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onBlur={() => setTouched({ ...touched, email: true })}
                aria-invalid={!!show('email')}
                aria-describedby={show('email') ? `${uid}-email-err` : undefined}
                className={input(show('email'))}
              />
            </Field>
          </div>
          <div className="@xl:col-span-2">
            <Field id={`${uid}-note`} label="ご要望・お悩み" hint={`${form.note.length}/200`}>
              <textarea
                id={`${uid}-note`}
                rows={2}
                maxLength={200}
                placeholder="例：前髪は眉下で。頭皮が乾燥しやすいです。"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className={`${input()} resize-none`}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 @xl:col-span-2">
            {(
              [
                ['first', 'はじめてのご来店'],
                ['remind', '前日にリマインドメールを受け取る'],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 text-xs text-[#4a443c]">
                <input type="checkbox" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} className="peer sr-only" />
                <span className="grid h-4.5 w-4.5 place-items-center rounded-md border border-[#cfc5b4] bg-white text-transparent transition peer-checked:border-[#2d6a5f] peer-checked:bg-[#2d6a5f] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#2d6a5f]/40">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
                {l}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-[#e6dfd3] px-4 py-3 @3xl:px-8">
        <p className="mr-auto hidden text-[10px] leading-snug text-[#9a9083] @md:block">
          前日18時以降の変更・キャンセルは
          <br />
          メニュー料金の50%を頂戴します
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="ml-auto flex h-10 items-center gap-1.5 rounded-full bg-[#2d6a5f] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(45,106,95,.9)] transition hover:bg-[#245a50] disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a5f]"
        >
          {submitting ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" /> 予約しています…
            </>
          ) : (
            <>
              予約を確定する <Check className="h-4 w-4" strokeWidth={3} />
            </>
          )}
        </button>
      </div>
    </form>
  )
}

/* ---------------------------------- 4. 完了 ---------------------------------- */

function DoneStep({
  reduce,
  booking,
  service,
  staffNominated,
  total,
  tz,
  email,
  name,
  cancelled,
  onCancel,
  onReschedule,
  onStartOver,
  toast,
}: {
  reduce: boolean
  booking: { date: Date; slot: number; staff: string; no: string }
  service: Service
  staffNominated: boolean
  total: number
  tz: string
  email: string
  name: string
  cancelled: boolean
  onCancel: () => void
  onReschedule: () => void
  onStartOver: () => void
  toast: (t: string) => void
}) {
  const [menu, setMenu] = useState(false)
  const [asking, setAsking] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const staff = STAFF.find((s) => s.id === booking.staff) ?? STAFF[0]
  const start = jstInstant(booking.date, booking.slot)
  const end = jstInstant(booking.date, booking.slot + service.min)
  const tzLabel = TIMEZONES.find((t) => t.id === tz)?.label ?? tz
  const day = localDay(booking.date, booking.slot, tz)

  useEffect(() => {
    if (!menu) return
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [menu])

  const icsText = () => {
    const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//atelier mica//booking demo//JA',
      'BEGIN:VEVENT',
      `UID:${booking.no}@atelier-mica.example`,
      `DTSTAMP:${f(new Date())}`,
      `DTSTART:${f(start)}`,
      `DTEND:${f(end)}`,
      `SUMMARY:${service.name}（atelier mica）`,
      `LOCATION:汐見坂 3-12-8 ハルニレ館 2F`,
      `DESCRIPTION:担当 ${staff.name} / 予約番号 ${booking.no}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([icsText()], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `atelier-mica-${booking.no}.ics`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMenu(false)
    toast('カレンダーファイルをダウンロードしました')
  }
  const copy = async () => {
    const text = `${service.name}（atelier mica）\n${format(localDay(booking.date, booking.slot, tz), 'yyyy年', { locale: ja })}${fmtWhen(booking.date, booking.slot, service.min, tz)}\n汐見坂 3-12-8 ハルニレ館 2F\n予約番号 ${booking.no}`
    setMenu(false)
    try {
      await navigator.clipboard.writeText(text)
      toast('予定の内容をコピーしました')
    } catch {
      toast('コピーできませんでした')
    }
  }

  if (cancelled)
    return (
      <div className="grid flex-1 place-items-center px-6 text-center">
        <motion.div initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#efe9df] text-[#8a8174]">
            <CalendarX2 className="h-7 w-7" />
          </span>
          <h3 className="mt-3 text-lg font-bold">予約をキャンセルしました</h3>
          <p className="mt-1 text-xs text-[#8a8174]">
            {fmtWhen(booking.date, booking.slot, service.min, tz)} の{service.name}（{booking.no}）
          </p>
          <button
            type="button"
            onClick={onStartOver}
            className="mx-auto mt-5 flex h-10 items-center gap-1.5 rounded-full bg-[#2d6a5f] px-5 text-sm font-semibold text-white transition hover:bg-[#245a50] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a5f]"
          >
            新しく予約する <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 @3xl:px-8">
      <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
        <svg viewBox="0 0 52 52" className="h-14 w-14" aria-hidden="true">
          <motion.circle
            cx="26"
            cy="26"
            r="24"
            fill="#e4efe9"
            stroke="#2d6a5f"
            strokeWidth="2.5"
            initial={reduce ? false : { pathLength: 0, rotate: -90 }}
            animate={{ pathLength: 1, rotate: -90 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ originX: '50%', originY: '50%' }}
          />
          <motion.path
            d="M15 27l7 7 15-16"
            fill="none"
            stroke="#2d6a5f"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.45, ease: 'easeOut' }}
          />
        </svg>
        <h3 className="mt-2 text-lg font-bold">ご予約が確定しました</h3>
        <p className="mt-0.5 text-xs text-[#8a8174]">
          {name || 'お客様'} 様、確認メールを <span className="font-semibold text-[#4a443c]">{email}</span> に送信しました
        </p>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : 0.3 }}
          className="mt-4 w-full rounded-2xl border border-[#e6dfd3] bg-white p-4 text-left shadow-[0_10px_30px_-20px_rgba(60,50,40,.5)]"
        >
          <div className="flex items-start gap-3">
            <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-[#2d6a5f] py-1.5 text-white">
              <span className="text-[10px] leading-none opacity-80">{format(day, 'M月', { locale: ja })}</span>
              <span className="text-xl font-bold leading-tight">{format(day, 'd')}</span>
              <span className="text-[10px] leading-none opacity-80">{format(day, 'EEE', { locale: ja })}曜</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{service.name}</p>
              <p className="text-[13px] font-semibold tabular-nums text-[#2d6a5f]">
                {fmtRange(booking.date, booking.slot, service.min, tz)} <span className="text-[11px] font-normal text-[#8a8174]">{tzLabel}</span>
              </p>
              {tz !== 'Asia/Tokyo' && (
                <p className="text-[10px] text-[#a1978a]">
                  サロンの時刻: {fmtWhen(booking.date, booking.slot, service.min, 'Asia/Tokyo')}
                </p>
              )}
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#8a8174]">
                <MapPin className="h-3 w-3 shrink-0" /> 汐見坂 3-12-8 ハルニレ館 2F
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2.5 border-t border-dashed border-[#e6dfd3] pt-3">
            <Face look={staff.look} className="h-9 w-9 rounded-full" />
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-semibold">{staff.name}</p>
              <p className="text-[10px] text-[#8a8174]">
                {staff.role}
                {!staffNominated && ' ・ 指名なしで担当'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">{yen(total)}</p>
              <p className="font-mono text-[10px] tracking-wider text-[#a1978a]">{booking.no}</p>
            </div>
          </div>
        </motion.div>

        <div className="mt-3 flex w-full flex-wrap gap-2">
          <div ref={menuRef} className="relative min-w-[150px] flex-1">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && menu) {
                  e.stopPropagation()
                  setMenu(false)
                }
              }}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[#22201c] text-sm font-semibold text-white transition hover:bg-[#3a3631] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a5f]"
            >
              <CalendarPlus className="h-4 w-4" /> カレンダーに追加
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: reduce ? 0 : 6, scale: reduce ? 1 : 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: reduce ? 0 : 4 }}
                  transition={{ duration: 0.14 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      setMenu(false)
                      ;(menuRef.current?.querySelector('[aria-haspopup]') as HTMLElement | null)?.focus()
                    }
                  }}
                  className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-xl border border-[#e6dfd3] bg-white p-1 text-left shadow-xl"
                >
                  <button type="button" role="menuitem" autoFocus onClick={download} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-[#f2eee7] focus-visible:bg-[#f2eee7] focus-visible:outline-none">
                    <Download className="h-3.5 w-3.5 text-[#2d6a5f]" /> カレンダーファイル（.ics）
                  </button>
                  <button type="button" role="menuitem" onClick={copy} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-[#f2eee7] focus-visible:bg-[#f2eee7] focus-visible:outline-none">
                    <Copy className="h-3.5 w-3.5 text-[#2d6a5f]" /> 予定の内容をコピー
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={onReschedule}
            className="flex h-10 min-w-[120px] flex-1 items-center justify-center gap-1.5 rounded-full border border-[#d8d0c3] bg-white text-sm font-semibold text-[#4a443c] transition hover:border-[#2d6a5f] hover:text-[#2d6a5f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a5f]"
          >
            <Repeat className="h-4 w-4" /> 日時を変更
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {asking ? (
            <motion.div
              key="ask"
              role="alertdialog"
              aria-label="予約のキャンセル確認"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 w-full overflow-hidden"
              onKeyDown={(e) => e.key === 'Escape' && setAsking(false)}
            >
              <div className="rounded-xl border border-[#efc9c2] bg-[#fcefec] p-3 text-left text-xs text-[#7d3329]">
                <p className="font-semibold">この予約をキャンセルしますか？</p>
                <p className="mt-0.5 text-[11px] text-[#9a5a50]">前日18時以降のキャンセルはメニュー料金の50%を頂戴します。</p>
                <div className="mt-2.5 flex gap-2">
                  <button type="button" autoFocus onClick={onCancel} className="rounded-full bg-[#c0473a] px-4 py-1.5 font-semibold text-white transition hover:bg-[#a83c30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0473a]">
                    キャンセルする
                  </button>
                  <button type="button" onClick={() => setAsking(false)} className="rounded-full px-3 py-1.5 font-semibold text-[#7d3329] hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-[#c0473a]">
                    戻る
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="cancel"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAsking(true)}
              className="mt-3 flex items-center gap-1 rounded text-xs text-[#a1978a] transition hover:text-[#c0473a] focus-visible:outline-2 focus-visible:outline-[#c0473a]"
            >
              <X className="h-3.5 w-3.5" /> 予約をキャンセル
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
