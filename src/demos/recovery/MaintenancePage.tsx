import NumberFlow, { NumberFlowGroup } from '@number-flow/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  BellRing,
  Check,
  CircleAlert,
  CircleCheck,
  Clock3,
  FastForward,
  Globe2,
  Loader2,
  Mail,
  RotateCcw,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'

/**
 * 計画メンテナンス中のお知らせページ。サービス名「Sorami Drive」・ロゴ・URL はすべて架空。
 * - 青焼き(ブループリント)の製図をモチーフにした紙面。左はタワークレーンが「DB-04」ブロックを吊り上げる SVG イラストで、
 *   トロリーの往復・ワイヤーの巻き上げ・荷の振り子を Motion のキーフレーム(同じ times を共有)で同期させる。
 *   完了するとブロックが建物の最上階に収まり、窓の LED が緑に変わる
 * - 時刻は「シミュレーション時計」1本から導出する。開始・終了はマウント時刻から 15 分単位で決め、残り時間を
 *   NumberFlowGroup の時:分:秒でカウントダウン。デモ用の「×120 早送り」で時計の進みだけを速める
 * - 作業工程は経過割合の区間(バックアップ→書き込み停止→データ移行→整合性チェック→段階的再開)から計算し、
 *   現在の工程にだけ進捗バーと件数を出す。影響範囲(コンポーネントの稼働状況)と更新情報も同じ割合から決まる
 * - 時刻表示は Intl.DateTimeFormat の timeZone で JST / UTC / 端末のタイムゾーンを切り替え(タブの3択、矢印キー対応)
 * - 「終わったら通知」はメールの簡易検証 → 送信中 → 登録済み(取り消し可)。終了時に登録していればトーストで通知を送ったことを伝える
 * - useReducedMotion 時はクレーンを止め、数字のアニメーションと入退場を短いフェードにする
 */

type Tz = 'jst' | 'utc' | 'local'
type Tab = 'steps' | 'impact' | 'updates'
type Health = 'operational' | 'degraded' | 'maintenance'

const MIN = 60_000
const SPEED = 120

const STEPS = [
  { title: 'バックアップの取得', detail: '全リージョンのスナップショットを保存', from: 0, to: 0.16, unit: 'GB', total: 840 },
  { title: '書き込みの一時停止', detail: 'アップロードと編集を受け付けない状態に切り替え', from: 0.16, to: 0.22, unit: 'ノード', total: 24 },
  { title: 'データベースの移行', detail: '新しいストレージ基盤へテーブルを順にコピー', from: 0.22, to: 0.72, unit: 'テーブル', total: 3920 },
  { title: '整合性チェック', detail: 'ファイル数とチェックサムを突き合わせ', from: 0.72, to: 0.9, unit: '件', total: 1_260_000 },
  { title: '段階的に再開', detail: '社内 → 一部のお客様 → すべてのお客様の順に開放', from: 0.9, to: 1, unit: '%', total: 100 },
] as const

const COMPONENTS: { name: string; note: (f: number) => string; health: (f: number) => Health }[] = [
  { name: 'Web アプリ', health: (f) => (f >= 1 ? 'operational' : f >= 0.9 ? 'degraded' : 'maintenance'), note: (f) => (f >= 1 ? '' : f >= 0.9 ? '順次ログインできるようになっています' : 'ログインできません') },
  { name: 'API', health: (f) => (f >= 0.9 ? 'operational' : 'maintenance'), note: (f) => (f >= 0.9 ? '' : '503 を返します（Retry-After 付き）') },
  { name: 'デスクトップ同期', health: (f) => (f >= 1 ? 'operational' : 'degraded'), note: (f) => (f >= 1 ? '' : '読み取り専用。変更は端末に保存され、後で同期') },
  { name: 'モバイルアプリ', health: (f) => (f >= 1 ? 'operational' : 'degraded'), note: (f) => (f >= 1 ? '' : 'オフラインのファイルのみ閲覧できます') },
  { name: '共有リンク', health: () => 'operational', note: () => '' },
  { name: 'お支払い・請求', health: () => 'operational', note: () => '' },
]

const UPDATES: { at: number; kind: 'start' | 'info' | 'done'; text: string }[] = [
  { at: 0, kind: 'start', text: 'メンテナンスを開始しました。Web アプリと API は一時的にご利用いただけません。' },
  { at: 0.16, kind: 'info', text: 'バックアップの取得が完了しました。書き込みを停止しています。' },
  { at: 0.22, kind: 'info', text: 'データ移行を開始しました。デスクトップ同期は読み取り専用で動作しています。' },
  { at: 0.72, kind: 'info', text: '移行が完了し、整合性チェックに入りました。予定どおり進んでいます。' },
  { at: 0.9, kind: 'info', text: '段階的にサービスを再開しています。ログインできるまで数分お待ちください。' },
  { at: 1, kind: 'done', text: 'メンテナンスが完了しました。ご協力ありがとうございました。' },
]

const HEALTH: Record<Health, { label: string; dot: string; text: string }> = {
  operational: { label: '正常', dot: 'bg-[#7fdca4]', text: 'text-[#9fe8bb]' },
  degraded: { label: '一部制限', dot: 'bg-[#ffd166]', text: 'text-[#ffdc8a]' },
  maintenance: { label: 'メンテナンス中', dot: 'bg-[#6cb8ff]', text: 'text-[#9fd2ff]' },
}

const LOCAL_TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo'
  } catch {
    return 'Asia/Tokyo'
  }
})()

const TZ_ZONE: Record<Tz, string> = { jst: 'Asia/Tokyo', utc: 'UTC', local: LOCAL_TZ }

function fmt(ms: number, tz: Tz, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: TZ_ZONE[tz], ...opts }).format(ms)
}
function tzName(ms: number, tz: Tz) {
  const part = new Intl.DateTimeFormat('ja-JP', { timeZone: TZ_ZONE[tz], timeZoneName: 'short' }).formatToParts(ms).find((p) => p.type === 'timeZoneName')
  return part?.value ?? ''
}

function makeWindow(now: number) {
  const start = Math.floor(now / (15 * MIN)) * 15 * MIN - 30 * MIN
  return { start, end: start + 90 * MIN }
}

export function MaintenancePage() {
  const reduced = !!useReducedMotion()
  const [win, setWin] = useState(() => makeWindow(Date.now()))
  const [now, setNow] = useState(() => Date.now())
  const [fast, setFast] = useState(false)
  const [tz, setTz] = useState<Tz>('jst')
  const [tab, setTab] = useState<Tab>('steps')
  const [email, setEmail] = useState('')
  const [sub, setSub] = useState<'idle' | 'sending' | 'done'>('idle')
  const [err, setErr] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const notified = useRef(false)
  const emailId = useId()
  const tabsId = useId()

  // シミュレーション時計。早送り中は実時間の SPEED 倍で進める
  const fastRef = useRef(fast)
  fastRef.current = fast
  const doneRef = useRef(false)
  useEffect(() => {
    let last = performance.now()
    const id = window.setInterval(() => {
      const t = performance.now()
      const dt = t - last
      last = t
      if (doneRef.current) return
      setNow((n) => n + dt * (fastRef.current ? SPEED : 1))
    }, 250)
    return () => window.clearInterval(id)
  }, [])

  const frac = Math.min(1, Math.max(0, (now - win.start) / (win.end - win.start)))
  const done = frac >= 1
  doneRef.current = done
  const remain = Math.max(0, Math.ceil((win.end - now) / 1000))
  const hh = Math.floor(remain / 3600)
  const mm = Math.floor((remain % 3600) / 60)
  const ss = remain % 60

  useEffect(() => {
    if (!done || notified.current) return
    notified.current = true
    setFast(false)
    setToast(sub === 'done' ? `終了をお知らせしました — ${email}` : 'メンテナンスが終了しました')
  }, [done, sub, email])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (sub !== 'sending') return
    const t = window.setTimeout(() => setSub('done'), 800)
    return () => window.clearTimeout(t)
  }, [sub])

  const stepIndex = done ? STEPS.length : STEPS.findIndex((s) => frac < s.to)
  const posted = UPDATES.filter((u) => u.at <= frac + 1e-9)

  const restart = () => {
    const n = Date.now()
    setWin(makeWindow(n))
    setNow(n)
    setFast(false)
    notified.current = false
    setToast(null)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErr('メールアドレスの形式を確認してください')
      return
    }
    setErr('')
    setEmail(email.trim())
    setSub('sending')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'steps', label: '作業の進捗' },
    { id: 'impact', label: '影響範囲' },
    { id: 'updates', label: '更新情報' },
  ]
  const fade = reduced ? { duration: 0.12 } : { type: 'spring' as const, stiffness: 380, damping: 32 }
  const winLabel = `${fmt(win.start, tz, { month: 'numeric', day: 'numeric', weekday: 'short' })} ${fmt(win.start, tz, { hour: '2-digit', minute: '2-digit' })} – ${fmt(win.end, tz, { hour: '2-digit', minute: '2-digit' })}`

  return (
    <div className="@container h-full w-full bg-[#0c2236] text-[#e6f1fb]">
      <div
        className="relative h-full overflow-y-auto px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] [background-image:linear-gradient(#8fd3ff12_1px,transparent_1px),linear-gradient(90deg,#8fd3ff12_1px,transparent_1px),linear-gradient(#8fd3ff08_1px,transparent_1px),linear-gradient(90deg,#8fd3ff08_1px,transparent_1px)] [background-size:60px_60px,60px_60px,12px_12px,12px_12px] @md:px-5 @3xl:flex @3xl:flex-col @3xl:overflow-hidden"
      >
        {/* ヘッダー */}
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#8fd3ff33] pb-2">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 28 28" className="size-6" aria-hidden="true">
              <path d="M7 19a5 5 0 0 1 .6-10A7 7 0 0 1 21 10.5 4.3 4.3 0 0 1 20.5 19Z" fill="none" stroke="#9fd8ff" strokeWidth="2" strokeLinejoin="round" />
              <path d="M10 15.5h8" stroke="#ffb547" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-[13px] font-bold tracking-tight">Sorami Drive</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#ffb54766] bg-[#ffb5471a] px-2 py-0.5 text-[10px] font-bold text-[#ffcc80]">
              <Wrench size={11} aria-hidden="true" />定期メンテナンス
            </span>
          </div>
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="表示するタイムゾーン">
            <Globe2 size={13} className="text-[#8fb7d6]" aria-hidden="true" />
            {(['jst', 'utc', 'local'] as Tz[]).map((z) => (
              <button
                key={z}
                type="button"
                role="radio"
                aria-checked={tz === z}
                title={TZ_ZONE[z]}
                onClick={() => setTz(z)}
                className="rounded-md border border-transparent px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#a9c6de] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-[#ffb547] aria-checked:border-[#8fd3ff55] aria-checked:bg-[#8fd3ff1f] aria-checked:text-white"
              >
                {z === 'jst' ? 'JST' : z === 'utc' ? 'UTC' : `端末 (${tzName(now, 'local')})`}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-3 grid gap-3 @3xl:min-h-0 @3xl:flex-1 @3xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] @3xl:gap-4">
          {/* 左:イラストとカウントダウン */}
          <section className="flex min-w-0 flex-col rounded-lg border border-[#8fd3ff38] bg-[#0f2b45]/80 @3xl:min-h-0">
            <div className="relative min-h-0 flex-1 border-b border-dashed border-[#8fd3ff38]">
              <Crane done={done} reduced={reduced} />
              <p aria-hidden="true" className="absolute top-1.5 right-2 font-mono text-[8px] tracking-[.18em] text-[#8fb7d6]">
                DWG. SD-0411 · LIFT {done ? '4' : '3'}/4 · 1:200
              </p>
            </div>
            <div className="grid gap-x-4 gap-y-2 p-3 @md:grid-cols-[1fr_auto] @md:items-end">
              <div className="min-w-0" role="status">
                <p className="font-mono text-[9px] font-bold tracking-[.18em] text-[#ffb547]">{done ? 'COMPLETED' : 'SCHEDULED MAINTENANCE'}</p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h2
                    key={done ? 'd' : 'w'}
                    initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -6 }}
                    transition={{ duration: reduced ? 0.12 : 0.25 }}
                    className="mt-0.5 text-[clamp(1.1rem,3.6cqw,1.55rem)] leading-tight font-black tracking-tight text-balance"
                  >
                    {done ? 'メンテナンスが完了しました' : 'ただいまメンテナンス中です'}
                  </motion.h2>
                </AnimatePresence>
                <p className="mt-1 max-w-[46ch] text-[11.5px] leading-relaxed text-[#b8d0e4]">
                  {done
                    ? 'すべての機能が通常どおりご利用いただけます。デスクトップ同期は保留中の変更を自動で送信します。'
                    : 'ストレージ基盤を新しいデータベースへ移行しています。ファイルは安全に保管されており、作業中も失われることはありません。'}
                </p>
                <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-[#8fb7d6]">
                  <Clock3 size={11} aria-hidden="true" />
                  <span>{winLabel}</span>
                  <span className="rounded-sm bg-[#8fd3ff1f] px-1 text-[#cfe7fb]">{tzName(win.start, tz)}</span>
                </p>
              </div>
              <div className="min-w-0">
                <p className="mb-0.5 text-[10px] font-bold text-[#8fb7d6]">{done ? '終了しました' : '終了予定まで'}</p>
                <div
                  className="flex items-baseline font-mono text-[clamp(1.7rem,5.6cqw,2.35rem)] leading-none font-bold tabular-nums text-white"
                  aria-label={`残り ${hh}時間${mm}分${ss}秒`}
                >
                  <NumberFlowGroup>
                    <NumberFlow value={hh} format={{ minimumIntegerDigits: 2 }} animated={!reduced && !fast} />
                    <span className="px-0.5 text-[#ffb547]">:</span>
                    <NumberFlow value={mm} format={{ minimumIntegerDigits: 2 }} animated={!reduced && !fast} trend={-1} />
                    <span className="px-0.5 text-[#ffb547]">:</span>
                    <NumberFlow value={ss} format={{ minimumIntegerDigits: 2 }} animated={!reduced && !fast} trend={-1} />
                  </NumberFlowGroup>
                </div>
                {done ? (
                  <button
                    type="button"
                    onClick={() => setToast('Sorami Drive に戻ります（デモでは移動しません）')}
                    className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md bg-[#7fdca4] px-3 text-[11.5px] font-black text-[#0c2236] transition-colors hover:bg-[#a3ebbf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fdca4]"
                  >
                    Sorami Drive を開く <ArrowRight size={13} aria-hidden="true" />
                  </button>
                ) : (
                  <div className="mt-1.5 h-1 w-full min-w-36 overflow-hidden rounded-full bg-[#8fd3ff22]">
                    <div className="h-full rounded-full bg-[#ffb547] transition-[width] duration-300" style={{ width: `${frac * 100}%` }} />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 右:タブ + 通知登録 */}
          <section className="flex min-w-0 flex-col gap-3 @3xl:min-h-0">
            <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-[#8fd3ff38] bg-[#0f2b45]/80">
              <div
                role="tablist"
                aria-label="メンテナンスの詳細"
                className="flex shrink-0 gap-1 border-b border-[#8fd3ff2a] px-2 pt-2"
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                  e.preventDefault()
                  const i = tabs.findIndex((t) => t.id === tab)
                  const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id
                  setTab(next)
                  e.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus()
                }}
              >
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    data-tab={t.id}
                    type="button"
                    role="tab"
                    id={`${tabsId}-${t.id}`}
                    aria-selected={tab === t.id}
                    aria-controls={`${tabsId}-panel`}
                    tabIndex={tab === t.id ? 0 : -1}
                    onClick={() => setTab(t.id)}
                    className="relative px-2.5 pt-1 pb-2 text-[11.5px] font-bold text-[#8fb7d6] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-[#ffb547] aria-selected:text-white"
                  >
                    {t.label}
                    {t.id === 'updates' && (
                      <span className="ml-1 rounded-full bg-[#8fd3ff26] px-1.5 font-mono text-[9px]">{posted.length}</span>
                    )}
                    {tab === t.id && (
                      <motion.span layoutId={`${tabsId}-ink`} className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-[#ffb547]" transition={fade} />
                    )}
                  </button>
                ))}
              </div>
              <div
                id={`${tabsId}-panel`}
                role="tabpanel"
                aria-labelledby={`${tabsId}-${tab}`}
                tabIndex={0}
                className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffb547]"
              >
                {tab === 'steps' && (
                  <ol className="relative">
                    {STEPS.map((s, i) => {
                      const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'todo'
                      const p = Math.min(1, Math.max(0, (frac - s.from) / (s.to - s.from)))
                      return (
                        <li key={s.title} className="relative grid grid-cols-[22px_1fr] gap-2 pb-2.5 last:pb-0">
                          {i < STEPS.length - 1 && (
                            <span aria-hidden="true" className={`absolute top-5 bottom-0 left-[10px] w-px ${state === 'done' ? 'bg-[#7fdca4]' : 'bg-[#8fd3ff2e]'}`} />
                          )}
                          <span
                            aria-hidden="true"
                            className={`relative z-10 grid size-[21px] place-items-center rounded-full border text-[10px] font-bold ${
                              state === 'done'
                                ? 'border-[#7fdca4] bg-[#7fdca4] text-[#0c2236]'
                                : state === 'active'
                                  ? 'border-[#ffb547] bg-[#0c2236] text-[#ffb547]'
                                  : 'border-[#8fd3ff44] bg-[#0c2236] text-[#8fb7d6]'
                            }`}
                          >
                            {state === 'done' ? <Check size={12} strokeWidth={3} /> : state === 'active' ? <Loader2 size={12} className={reduced ? '' : 'animate-spin'} /> : i + 1}
                            {state === 'active' && !reduced && <span className="absolute inset-0 animate-ping rounded-full border border-[#ffb547] opacity-40" />}
                          </span>
                          <div className="min-w-0">
                            <p className={`flex items-baseline justify-between gap-2 text-[12px] font-bold ${state === 'todo' ? 'text-[#8fb7d6]' : 'text-white'}`}>
                              <span>{s.title}</span>
                              <span className="shrink-0 font-mono text-[9.5px] font-medium text-[#8fb7d6]">
                                {state === 'done' ? '完了' : state === 'active' ? `${Math.floor(p * 100)}%` : `予定 ${fmt(win.start + s.from * (win.end - win.start), tz, { hour: '2-digit', minute: '2-digit' })}`}
                              </span>
                            </p>
                            <p className="text-[10.5px] leading-snug text-[#9ab9d2]">{s.detail}</p>
                            {state === 'active' && (
                              <div className="mt-1">
                                <div className="h-1.5 overflow-hidden rounded-full bg-[#8fd3ff1f]">
                                  <div
                                    className="h-full rounded-full bg-[repeating-linear-gradient(-45deg,#ffb547_0_6px,#ffcd7a_6px_12px)] transition-[width] duration-300"
                                    style={{ width: `${p * 100}%` }}
                                  />
                                </div>
                                <p className="mt-0.5 font-mono text-[9.5px] text-[#cfe2f2]">
                                  {Math.floor(p * s.total).toLocaleString('ja-JP')} / {s.total.toLocaleString('ja-JP')} {s.unit}
                                </p>
                              </div>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
                {tab === 'impact' && (
                  <ul className="divide-y divide-[#8fd3ff1f]">
                    {COMPONENTS.map((c) => {
                      const h = c.health(frac)
                      const note = c.note(frac)
                      return (
                        <li key={c.name} className="flex items-start justify-between gap-3 py-1.5 first:pt-0">
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold">{c.name}</p>
                            {note && <p className="text-[10.5px] leading-snug text-[#9ab9d2]">{note}</p>}
                          </div>
                          <span className={`inline-flex shrink-0 items-center gap-1.5 text-[10.5px] font-bold ${HEALTH[h].text}`}>
                            <span className={`size-2 rounded-full ${HEALTH[h].dot} ${h !== 'operational' && !reduced ? 'animate-pulse' : ''}`} />
                            {HEALTH[h].label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {tab === 'updates' && (
                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {[...posted].reverse().map((u) => (
                        <motion.li
                          key={u.at}
                          layout={!reduced}
                          initial={{ opacity: 0, y: reduced ? 0 : -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={fade}
                          className="rounded-md border border-[#8fd3ff24] bg-[#0c2236]/60 px-2.5 py-1.5"
                        >
                          <p className="flex items-center gap-1.5 font-mono text-[9.5px] text-[#8fb7d6]">
                            {u.kind === 'done' ? <CircleCheck size={11} className="text-[#7fdca4]" aria-hidden="true" /> : u.kind === 'start' ? <CircleAlert size={11} className="text-[#ffb547]" aria-hidden="true" /> : <span className="size-1.5 rounded-full bg-[#6cb8ff]" />}
                            {fmt(win.start + u.at * (win.end - win.start), tz, { hour: '2-digit', minute: '2-digit' })} {tzName(win.start, tz)}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#dcebf7]">{u.text}</p>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#8fd3ff2a] px-3 py-1.5 text-[10.5px]">
                <button type="button" onClick={() => setTab('impact')} className="font-bold text-[#9fd8ff] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#ffb547]">
                  ステータスページ
                </button>
                <button type="button" onClick={() => setTab('updates')} className="font-bold text-[#9fd8ff] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#ffb547]">
                  更新情報
                </button>
                <span className="ml-auto font-mono text-[9px] text-[#6f93b1]">status.sorami.example</span>
              </div>
            </div>

            {/* 終わったら通知 */}
            <div className="shrink-0 rounded-lg border border-[#ffb54744] bg-[#ffb5470d] p-2.5">
              <AnimatePresence mode="wait" initial={false}>
                {sub === 'done' ? (
                  <motion.div
                    key="ok"
                    initial={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduced ? 0.12 : 0.22 }}
                    className="flex items-start gap-2"
                    role="status"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#7fdca4] text-[#0c2236]">
                      <BellRing size={14} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold">{done ? '通知を送信しました' : '終わったらお知らせします'}</p>
                      <p className="truncate text-[10.5px] text-[#b8d0e4]">
                        {email} 宛て · 時刻は {tzName(win.end, tz)} で記載
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSub('idle')}
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold text-[#ffcc80] hover:bg-[#ffb5471f] focus-visible:outline-2 focus-visible:outline-[#ffb547]"
                    >
                      取り消す
                    </button>
                  </motion.div>
                ) : (
                  <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onSubmit={submit} noValidate>
                    <label htmlFor={emailId} className="flex items-center gap-1.5 text-[11.5px] font-bold">
                      <BellRing size={13} className="text-[#ffb547]" aria-hidden="true" />
                      終わったら通知
                      <span className="font-normal text-[#9ab9d2]">— 完了時にメールを1通だけ送ります</span>
                    </label>
                    <div className="mt-1.5 flex gap-1.5">
                      <div className="relative min-w-0 flex-1">
                        <Mail size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[#8fb7d6]" aria-hidden="true" />
                        <input
                          id={emailId}
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            if (err) setErr('')
                          }}
                          aria-invalid={!!err}
                          aria-describedby={err ? `${emailId}-err` : undefined}
                          disabled={sub === 'sending'}
                          className="h-8 w-full rounded-md border border-[#8fd3ff44] bg-[#0c2236] pr-2 pl-7 text-[12px] text-white placeholder:text-[#5f84a3] focus:border-[#ffb547] focus:outline-none aria-invalid:border-[#ff7b72]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={sub === 'sending'}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-[#ffb547] px-3 text-[11.5px] font-black text-[#2a1a05] transition-colors hover:bg-[#ffc76e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb547] disabled:opacity-70"
                      >
                        {sub === 'sending' ? <Loader2 size={13} className={reduced ? '' : 'animate-spin'} aria-hidden="true" /> : null}
                        {sub === 'sending' ? '登録中' : '通知を受け取る'}
                      </button>
                    </div>
                    <p id={`${emailId}-err`} aria-live="polite" className="min-h-0 text-[10.5px] text-[#ff9b93] empty:hidden">
                      {err}
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* デモ操作 */}
        <div className="mt-2 flex shrink-0 flex-wrap items-center justify-end gap-2 font-mono text-[9.5px] text-[#7fa3c1]">
          <span className="mr-auto tracking-widest">DEMO CONTROLS</span>
          <button
            type="button"
            aria-pressed={fast}
            disabled={done}
            onClick={() => setFast((f) => !f)}
            className="inline-flex items-center gap-1 rounded-md border border-[#8fd3ff33] px-2 py-0.5 font-bold text-[#cfe2f2] hover:bg-[#8fd3ff1a] focus-visible:outline-2 focus-visible:outline-[#ffb547] disabled:opacity-40 aria-pressed:border-[#ffb547] aria-pressed:text-[#ffcc80]"
          >
            <FastForward size={11} aria-hidden="true" />×{SPEED} 早送り
          </button>
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-1 rounded-md border border-[#8fd3ff33] px-2 py-0.5 font-bold text-[#cfe2f2] hover:bg-[#8fd3ff1a] focus-visible:outline-2 focus-visible:outline-[#ffb547]"
          >
            <RotateCcw size={11} aria-hidden="true" />最初から
          </button>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div
              role="status"
              initial={{ opacity: 0, y: reduced ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : 8 }}
              transition={fade}
              className="absolute bottom-[calc(var(--solo-footer-clearance,0.75rem)+2.25rem)] left-1/2 z-30 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border border-[#7fdca466] bg-[#103a2c] px-3 py-2 text-[11.5px] font-bold text-[#d8f7e4] shadow-[0_10px_30px_-10px_#000]"
            >
              <CircleCheck size={15} className="shrink-0 text-[#7fdca4]" aria-hidden="true" />
              <span className="truncate">{toast}</span>
              <button type="button" aria-label="閉じる" onClick={() => setToast(null)} className="rounded p-0.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#7fdca4]">
                <X size={13} aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------------- クレーンのイラスト ---------------- */

const GROUND = 204
const FLOOR = 25
const JIB_Y = 40
const BLD_X = 236
const BLD_W = 104
const TARGET_X = BLD_X + BLD_W / 2

function Crane({ done, reduced }: { done: boolean; reduced: boolean }) {
  const idle = done || reduced
  // 4階目(吊り荷)が収まる位置
  const topY = GROUND - FLOOR * 3
  const hoverHook = topY - FLOOR - 14 - 8
  const times = [0, 0.22, 0.42, 0.62, 0.84, 1]
  const loop = { duration: 9, times, repeat: Infinity, ease: 'easeInOut' as const }
  const trolleyX = [150, TARGET_X, TARGET_X, TARGET_X, 150, 150]
  const hookY = [96, 96, hoverHook, hoverHook, 96, 96]

  const lights = useMemo(
    () =>
      Array.from({ length: 3 }, (_, f) =>
        Array.from({ length: 6 }, (_, i) => ({ x: BLD_X + 12 + i * 16, y: GROUND - FLOOR * f - 15, k: (f * 7 + i * 3) % 5 })),
      ).flat(),
    [],
  )

  return (
    <svg viewBox="0 0 400 220" className="block h-full max-h-64 min-h-40 w-full @3xl:max-h-none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <pattern id="mp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0v6" stroke="#9fd8ff" strokeOpacity=".28" strokeWidth="1.2" />
        </pattern>
      </defs>
      {/* 地面と寸法線 */}
      <path d={`M14 ${GROUND}h372`} stroke="#9fd8ff" strokeWidth="1.4" />
      <path d={`M14 ${GROUND + 1}h372v6H14z`} fill="url(#mp-hatch)" />
      <g stroke="#9fd8ff" strokeOpacity=".55" strokeWidth=".8" fill="none">
        <path d={`M362 ${GROUND}V${JIB_Y}M357 ${GROUND}h10M357 ${JIB_Y}h10`} strokeDasharray="3 3" />
        <path d={`M${BLD_X} ${GROUND + 14}h${BLD_W}M${BLD_X} ${GROUND + 10}v8M${BLD_X + BLD_W} ${GROUND + 10}v8`} />
      </g>
      <text x="370" y={(GROUND + JIB_Y) / 2} fill="#9fd8ff" fontSize="7" fontFamily="ui-monospace,monospace" transform={`rotate(-90 370 ${(GROUND + JIB_Y) / 2})`} textAnchor="middle">
        H 48.0 m
      </text>
      <text x={TARGET_X} y={GROUND + 13} fill="#9fd8ff" fontSize="6.5" fontFamily="ui-monospace,monospace" textAnchor="middle" dy="-2">
        DB CLUSTER / 4F
      </text>

      {/* 建物(サーバー棟) */}
      {[0, 1, 2].map((f) => (
        <rect key={f} x={BLD_X} y={GROUND - FLOOR * (f + 1)} width={BLD_W} height={FLOOR} fill="#123754" stroke="#9fd8ff" strokeWidth="1.2" />
      ))}
      {lights.map((l, i) => (
        <motion.rect
          key={i}
          x={l.x}
          y={l.y}
          width="8"
          height="3"
          rx="1"
          fill={done ? '#7fdca4' : l.k === 0 ? '#ffb547' : '#6cb8ff'}
          initial={false}
          animate={idle ? { opacity: 0.9 } : { opacity: [0.35, 1, 0.35] }}
          transition={idle ? { duration: 0.3 } : { duration: 1.6 + l.k * 0.35, repeat: Infinity, delay: l.k * 0.2 }}
        />
      ))}
      {/* 4階の予定位置 or 収まったブロック */}
      {done ? (
        <motion.g initial={reduced ? false : { y: -26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }}>
          <rect x={BLD_X} y={topY - FLOOR} width={BLD_W} height={FLOOR} fill="#16466a" stroke="#7fdca4" strokeWidth="1.4" />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={BLD_X + 12 + i * 16} y={topY - 15} width="8" height="3" rx="1" fill="#7fdca4" />
          ))}
          <text x={TARGET_X} y={topY - FLOOR - 5} fill="#7fdca4" fontSize="7" fontFamily="ui-monospace,monospace" textAnchor="middle">
            ✓ INSTALLED
          </text>
        </motion.g>
      ) : (
        <rect x={BLD_X} y={topY - FLOOR} width={BLD_W} height={FLOOR} fill="none" stroke="#ffb547" strokeOpacity=".7" strokeDasharray="4 3" />
      )}

      {/* クレーンのマスト(ラチス) */}
      <g stroke="#cfe9ff" strokeWidth="1.3" fill="none">
        <path d={`M86 ${GROUND}V${JIB_Y + 8}M104 ${GROUND}V${JIB_Y + 8}`} />
        <path
          d={Array.from({ length: 13 }, (_, i) => {
            const y = GROUND - i * 12
            return `M86 ${y}L104 ${y - 12}M86 ${y}h18`
          }).join('')}
          strokeWidth=".8"
          strokeOpacity=".8"
        />
        {/* 頂部と吊りワイヤー */}
        <path d={`M86 ${JIB_Y}L95 12L104 ${JIB_Y}M95 12L40 ${JIB_Y}M95 12L352 ${JIB_Y}`} strokeWidth="1" />
        {/* ジブ */}
        <path d={`M34 ${JIB_Y}H356M34 ${JIB_Y + 8}H356M34 ${JIB_Y}v8M356 ${JIB_Y}v8`} />
        <path
          d={Array.from({ length: 40 }, (_, i) => `M${34 + i * 8} ${JIB_Y + 8}L${42 + i * 8} ${JIB_Y}`).join('')}
          strokeWidth=".7"
          strokeOpacity=".7"
        />
      </g>
      {/* 運転室・カウンターウェイト */}
      <rect x="78" y={JIB_Y + 9} width="16" height="13" rx="2" fill="#123754" stroke="#cfe9ff" strokeWidth="1.2" />
      <rect x="81" y={JIB_Y + 12} width="9" height="5" fill="#ffb547" fillOpacity=".75" />
      <rect x="40" y={JIB_Y + 9} width="26" height="18" fill="url(#mp-hatch)" stroke="#cfe9ff" strokeWidth="1.2" />
      {/* 航空障害灯 */}
      <motion.circle cx="95" cy="10" r="2.6" fill="#ff7b72" animate={reduced ? { opacity: 1 } : { opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: reduced ? 0 : Infinity }} />

      {/* トロリー + ワイヤー + 吊り荷 */}
      {done ? (
        <g>
          <rect x={TARGET_X - 7} y={JIB_Y + 8} width="14" height="5" fill="#ffb547" />
          <line x1={TARGET_X} y1={JIB_Y + 13} x2={TARGET_X} y2={JIB_Y + 34} stroke="#cfe9ff" strokeWidth="1" />
          <path d={`M${TARGET_X - 4} ${JIB_Y + 34}h8l-4 7z`} fill="#ffb547" />
        </g>
      ) : (
        <motion.g initial={false} animate={idle ? { x: TARGET_X - 150 } : { x: trolleyX.map((v) => v - 150) }} transition={idle ? { duration: 0 } : loop}>
          <rect x={150 - 7} y={JIB_Y + 8} width="14" height="5" fill="#ffb547" />
          <motion.line
            x1={150}
            x2={150}
            y1={JIB_Y + 13}
            stroke="#cfe9ff"
            strokeWidth="1"
            initial={false}
            animate={idle ? { y2: 96 } : { y2: hookY }}
            transition={idle ? { duration: 0 } : loop}
          />
          <motion.g initial={false} animate={idle ? { y: 96 } : { y: hookY }} transition={idle ? { duration: 0 } : loop}>
            <motion.g
              style={{ originX: 0.5, originY: 0 }}
              animate={idle ? { rotate: 0 } : { rotate: [-2.5, 2.5, -2.5] }}
              transition={{ duration: 2.4, repeat: idle ? 0 : Infinity, ease: 'easeInOut' }}
            >
              <path d="M146 0h8l-4 6z" fill="#ffb547" />
              <path d={`M150 6L${150 - 40} 14M150 6L${150 + 40} 14`} stroke="#cfe9ff" strokeWidth=".8" />
              <rect x={150 - BLD_W / 2} y="14" width={BLD_W} height={FLOOR} fill="#16466a" stroke="#ffb547" strokeWidth="1.4" />
              <rect x={150 - BLD_W / 2} y="14" width={BLD_W} height={FLOOR} fill="url(#mp-hatch)" />
              <text x="150" y={14 + FLOOR / 2 + 3} fill="#ffe2b0" fontSize="8.5" fontWeight="700" fontFamily="ui-monospace,monospace" textAnchor="middle">
                DB-04
              </text>
            </motion.g>
          </motion.g>
        </motion.g>
      )}
    </svg>
  )
}
