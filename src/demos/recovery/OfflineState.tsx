import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Check,
  CircleCheck,
  CloudOff,
  CloudUpload,
  Clock3,
  FileText,
  Gauge,
  Loader2,
  MapPin,
  NotebookPen,
  RefreshCw,
  Send,
  SquareCheckBig,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'

/**
 * 現場点検アプリのオフライン対応画面。アプリ名「やまびこフィールド」・施設・人物はすべて架空。
 * - 接続状態は online → offline → checking(再試行中) → reconnecting(再接続アニメ) → syncing(キュー送信) → online の状態機械。
 *   デモ内のスイッチ(オフラインを再現)と、window の online / offline イベント(navigator.onLine)の両方を入力にする
 * - オフライン中は 5→10→20→30 秒の指数バックオフで自動再試行。バナーに円形の残り時間リングと「今すぐ再試行」を出す
 * - 点検項目のチェックや現場メモは楽観的に反映し、操作をキューに積んで「送信待ち」バッジを付ける。同じ項目を戻すと
 *   キューから相殺。再接続するとキューを1件ずつ送信(送信中 → 送信済み)し、最後に他メンバーの更新を取り込んでハイライトする
 * - キャッシュ表示中は最終同期時刻と「古い可能性」を明示し、リアルタイム水位のスパークラインは止めてグレーにする
 * - 右上のイラストは SVG の山並みと中継塔。オンラインでは破線の電波路が流れ、オフラインでは雲が塔を隠して路が切れ、
 *   再接続中は電波の輪が広がり、同期中は送信待ちの件数だけパケットが塔へ運ばれる(ベジェ曲線上の座標を事前計算し、
 *   Motion の x / y keyframes で曲線に沿って移動させる)
 * - useReducedMotion 時は流れる電波や輪を止め、状態の切り替えは短いフェードにする
 */

type Conn = 'online' | 'offline' | 'checking' | 'reconnecting' | 'syncing'
type QStatus = 'pending' | 'sending' | 'sent'
type QItem = { id: number; itemId?: string; kind: 'check' | 'uncheck' | 'note'; label: string; status: QStatus }
type Task = { id: string; title: string; spec: string; done: boolean; by: string; at: number; flash?: boolean }
type Note = { id: number; text: string; at: number; qid: number }

const BACKOFF = [5, 10, 20, 30]
const MIN = 60_000

const P = {
  bg: '#e9eee8',
  ink: '#1c2b25',
  sub: '#5c6d65',
  line: '#d3dcd5',
  forest: '#1f4d3f',
  amber: '#b86e00',
  amberBg: '#fff3dc',
  teal: '#0f7c74',
}

function clock(ms: number) {
  return new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(ms)
}
function ago(ms: number, now: number) {
  const m = Math.max(0, Math.floor((now - ms) / MIN))
  return m < 1 ? 'たった今' : m < 60 ? `${m}分前` : `${Math.floor(m / 60)}時間前`
}

function initialTasks(now: number): Task[] {
  return [
    { id: 'intake', title: '取水口スクリーンの目視確認', spec: '異物・損傷なし', done: true, by: '自分', at: now - 52 * MIN },
    { id: 'sludge', title: '沈殿池の汚泥界面を測定', spec: '基準 1.5 m 以下', done: true, by: '佐伯 遥', at: now - 31 * MIN },
    { id: 'pump', title: '逆洗ポンプの異音・振動', spec: '振動計 4.5 mm/s 以下', done: false, by: '自分', at: now - 70 * MIN },
    { id: 'chlorine', title: '塩素注入量を記録', spec: '0.8〜1.4 mg/L', done: false, by: '佐伯 遥', at: now - 18 * MIN },
    { id: 'gen', title: '非常用発電機の始動試験', spec: '無負荷 5 分運転', done: false, by: '小野寺 匠', at: now - 64 * MIN },
    { id: 'panel', title: '制御盤フィルターの清掃', spec: '目詰まり時は交換', done: false, by: '自分', at: now - 96 * MIN },
  ]
}

export function OfflineState() {
  const reduced = !!useReducedMotion()
  const [now, setNow] = useState(() => Date.now())
  const [simOffline, setSimOffline] = useState(false)
  const [netOffline, setNetOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  const offline = simOffline || netOffline
  const offlineRef = useRef(offline)
  offlineRef.current = offline

  const [conn, setConn] = useState<Conn>(offline ? 'offline' : 'online')
  const [attempt, setAttempt] = useState(0)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [retryLen, setRetryLen] = useState(BACKOFF[0])
  const [lastSync, setLastSync] = useState(() => Date.now() - 6 * MIN)
  const [tasks, setTasks] = useState(() => initialTasks(Date.now()))
  const [queue, setQueue] = useState<QItem[]>([])
  const [notes, setNotes] = useState<Note[]>(() => [{ id: 1, text: '2号ポンプ周辺に水たまり。配管の結露と思われるが次回も確認。', at: Date.now() - 40 * MIN, qid: -1 }])
  const [draft, setDraft] = useState('')
  const [banner, setBanner] = useState<'synced' | null>(null)
  const [syncedCount, setSyncedCount] = useState(0)
  const [level, setLevel] = useState(() => Array.from({ length: 28 }, (_, i) => 3.38 + Math.sin(i / 3) * 0.05 + Math.cos(i / 1.7) * 0.02))
  const seq = useRef(10)
  const remoteDone = useRef(false)
  const sentThisRun = useRef(0)
  const noteId = useId()
  const switchId = useId()

  // 実際のネットワークイベント
  useEffect(() => {
    const on = () => setNetOffline(false)
    const off = () => setNetOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // 時計
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  // 水位(オンライン時のみ更新)
  useEffect(() => {
    if (conn !== 'online') return
    const id = window.setInterval(() => {
      setLevel((l) => {
        const last = l[l.length - 1]
        const next = Math.min(3.52, Math.max(3.28, last + (Math.random() - 0.5) * 0.035))
        return [...l.slice(1), next]
      })
    }, 1400)
    return () => window.clearInterval(id)
  }, [conn])

  const schedule = (n: number) => {
    const len = BACKOFF[Math.min(n, BACKOFF.length - 1)]
    setAttempt(n)
    setRetryLen(len)
    setRetryAt(Date.now() + len * 1000)
  }

  // 接続の入力が変わったとき
  const connRef = useRef(conn)
  connRef.current = conn
  useEffect(() => {
    const c = connRef.current
    if (offline && (c === 'online' || c === 'reconnecting' || c === 'syncing')) {
      schedule(0)
      setBanner(null)
      setQueue((q) => q.map((x) => (x.status === 'sending' ? { ...x, status: 'pending' } : x)))
      setConn('offline')
    } else if (!offline && (c === 'offline' || c === 'checking')) {
      setConn('reconnecting')
    }
  }, [offline])

  // バックオフの期限が来たら再試行
  useEffect(() => {
    if (conn === 'offline' && retryAt !== null && now >= retryAt) setConn('checking')
  }, [conn, now, retryAt])

  useEffect(() => {
    if (conn !== 'checking') return
    const t = window.setTimeout(() => {
      if (offlineRef.current) {
        setConn('offline')
        schedule(attempt + 1)
      } else setConn('reconnecting')
    }, 1300)
    return () => window.clearTimeout(t)
  }, [conn, attempt])

  useEffect(() => {
    if (conn !== 'reconnecting') return
    sentThisRun.current = 0
    const t = window.setTimeout(() => setConn('syncing'), reduced ? 500 : 1500)
    return () => window.clearTimeout(t)
  }, [conn, reduced])

  // キューの送信(同期中、またはオンライン中の即時送信)
  useEffect(() => {
    if (conn !== 'syncing' && conn !== 'online') return
    const sending = queue.find((q) => q.status === 'sending')
    if (sending) {
      const t = window.setTimeout(() => {
        sentThisRun.current += 1
        setQueue((q) => q.map((x) => (x.id === sending.id ? { ...x, status: 'sent' } : x)))
      }, conn === 'syncing' ? 650 : 420)
      return () => window.clearTimeout(t)
    }
    const pending = queue.find((q) => q.status === 'pending')
    if (pending) {
      const t = window.setTimeout(() => setQueue((q) => q.map((x) => (x.id === pending.id ? { ...x, status: 'sending' } : x))), 140)
      return () => window.clearTimeout(t)
    }
    if (conn === 'syncing') {
      const t = window.setTimeout(() => {
        setConn('online')
        setLastSync(Date.now())
        setSyncedCount(sentThisRun.current)
        setBanner('synced')
        if (!remoteDone.current) {
          remoteDone.current = true
          setTasks((ts) => ts.map((x) => (x.id === 'gen' && !x.done ? { ...x, done: true, by: '小野寺 匠', at: Date.now() - 3 * MIN, flash: true } : x)))
        }
      }, 300)
      return () => window.clearTimeout(t)
    }
    if (queue.some((q) => q.status === 'sent')) {
      const t = window.setTimeout(() => setQueue((q) => q.filter((x) => x.status !== 'sent')), 2600)
      return () => window.clearTimeout(t)
    }
  }, [conn, queue])

  useEffect(() => {
    if (banner !== 'synced') return
    const t = window.setTimeout(() => setBanner(null), 3200)
    return () => window.clearTimeout(t)
  }, [banner])

  useEffect(() => {
    if (!tasks.some((t) => t.flash)) return
    const t = window.setTimeout(() => setTasks((ts) => ts.map((x) => ({ ...x, flash: false }))), 4200)
    return () => window.clearTimeout(t)
  }, [tasks])

  const isOff = conn === 'offline' || conn === 'checking'
  const queued = queue.filter((q) => q.status !== 'sent')
  const enqueue = (item: Omit<QItem, 'id' | 'status'>) => {
    const id = ++seq.current
    setQueue((q) => [...q, { ...item, id, status: conn === 'online' ? 'sending' : 'pending' }])
    return id
  }

  const toggle = (t: Task) => {
    const done = !t.done
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done, by: '自分', at: Date.now(), flash: false } : x)))
    const existing = queue.find((q) => q.itemId === t.id && q.status === 'pending')
    if (existing) {
      setQueue((q) => q.filter((x) => x.id !== existing.id))
      return
    }
    enqueue({ itemId: t.id, kind: done ? 'check' : 'uncheck', label: `${done ? '完了' : '未完了に戻す'}：${t.title}` })
  }

  const addNote = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    const qid = enqueue({ kind: 'note', label: `メモ：${text.length > 18 ? text.slice(0, 18) + '…' : text}` })
    setNotes((n) => [...n, { id: qid, text, at: Date.now(), qid }])
    setDraft('')
  }

  const retryNow = () => {
    if (conn === 'offline') setConn('checking')
  }

  const doneCount = tasks.filter((t) => t.done).length
  const remain = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0
  const ring = retryAt && conn === 'offline' ? Math.max(0, Math.min(1, (retryAt - now) / (retryLen * 1000))) : 0
  const statusOf = (qid?: number, itemId?: string) => queue.find((q) => (qid !== undefined ? q.id === qid : q.itemId === itemId && q.status !== 'sent'))?.status
  const spring = reduced ? { duration: 0.12 } : { type: 'spring' as const, stiffness: 420, damping: 34 }

  const pill = {
    online: { label: 'オンライン', cls: 'bg-[#dff1e8] text-[#1f6a4a] border-[#b7dcc8]', icon: <Wifi size={12} aria-hidden="true" /> },
    offline: { label: 'オフライン', cls: 'bg-[#fff3dc] text-[#8a5300] border-[#f0d39b]', icon: <WifiOff size={12} aria-hidden="true" /> },
    checking: { label: '再試行中', cls: 'bg-[#fff3dc] text-[#8a5300] border-[#f0d39b]', icon: <Loader2 size={12} className={reduced ? '' : 'animate-spin'} aria-hidden="true" /> },
    reconnecting: { label: '再接続中', cls: 'bg-[#dcf1ef] text-[#0b6b64] border-[#a9dcd6]', icon: <RefreshCw size={12} className={reduced ? '' : 'animate-spin'} aria-hidden="true" /> },
    syncing: { label: '同期中', cls: 'bg-[#dcf1ef] text-[#0b6b64] border-[#a9dcd6]', icon: <CloudUpload size={12} aria-hidden="true" /> },
  }[conn]

  return (
    <div className="@container h-full w-full text-[#1c2b25]" style={{ background: P.bg }}>
      <div className="flex h-full flex-col overflow-y-auto pb-[var(--solo-footer-clearance,0px)] @3xl:overflow-hidden">
        <div className="sticky top-0 z-20 shrink-0">
        {/* アプリバー */}
        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[#cfd9d1] bg-[#f7f9f6]/95 px-3 py-2 backdrop-blur @md:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <svg viewBox="0 0 28 28" className="size-7 shrink-0" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill={P.forest} />
              <path d="m5 20 6-9 4 5 3-3 5 7Z" fill="#cfe7d4" />
              <path d="M18.5 7.5a3.5 3.5 0 0 1 3.5 3.5M18.5 4.8A6.2 6.2 0 0 1 24.7 11" stroke="#f2c46b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </svg>
            <div className="min-w-0 leading-tight">
              <p className="text-[12.5px] font-black tracking-tight">やまびこフィールド</p>
              <p className="flex items-center gap-0.5 truncate text-[10px] text-[#5c6d65]">
                <MapPin size={10} aria-hidden="true" />北沢浄水場 · 第2系統
              </p>
            </div>
          </div>
          <motion.span layout={!reduced} transition={spring} role="status" className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${pill.cls}`}>
            {pill.icon}
            {pill.label}
            {queued.length > 0 && <span className="ml-0.5 rounded-full bg-current/15 px-1.5 font-mono text-[9.5px]">{queued.length}</span>}
          </motion.span>
          <label htmlFor={switchId} className="ml-auto flex cursor-pointer items-center gap-2 text-[10.5px] font-bold text-[#43544c]">
            オフラインを再現
            <button
              id={switchId}
              type="button"
              role="switch"
              aria-checked={simOffline}
              onClick={() => setSimOffline((v) => !v)}
              className="relative h-[22px] w-[38px] shrink-0 rounded-full border border-[#b8c6bd] bg-[#dfe7e1] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f4d3f] aria-checked:border-[#b86e00] aria-checked:bg-[#f2b54a]"
            >
              <motion.span
                layout={!reduced}
                transition={spring}
                className={`absolute top-[2px] size-4 rounded-full bg-white shadow ${simOffline ? 'right-[2px]' : 'left-[2px]'}`}
              />
            </button>
          </label>
          {netOffline && <span className="w-full text-right text-[9.5px] text-[#8a5300]">端末がオフラインです（ブラウザの接続状態を検知）</span>}
        </header>

        {/* バナー */}
        <AnimatePresence initial={false}>
          {(conn !== 'online' || banner) && (
            <motion.div
              key="banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 360, damping: 36 }}
              className="shrink-0 overflow-hidden"
            >
              <div
                aria-live="polite"
                className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-3 py-2 text-[11px] transition-colors duration-500 @md:px-4 ${
                  isOff ? 'border-[#efd39d] bg-[#fff3dc] text-[#5e3b00]' : 'border-[#a9dcd6] bg-[#dcf1ef] text-[#0b4f4a]'
                }`}
              >
                <span className={`grid size-7 shrink-0 place-items-center rounded-full ${isOff ? 'bg-[#f2b54a] text-[#3d2600]' : 'bg-[#0f7c74] text-white'}`}>
                  {isOff ? <CloudOff size={14} aria-hidden="true" /> : banner ? <Check size={14} aria-hidden="true" /> : <RefreshCw size={14} className={reduced ? '' : 'animate-spin'} aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1 leading-snug">
                  <p className="font-black">
                    {conn === 'offline' && 'オフラインです'}
                    {conn === 'checking' && '接続を確認しています…'}
                    {conn === 'reconnecting' && '再接続しました'}
                    {conn === 'syncing' && `送信待ちの変更を同期しています（${sentThisRun.current}/${sentThisRun.current + queued.length}）`}
                    {conn === 'online' && banner && (syncedCount > 0 ? `${syncedCount}件の変更を送信し、最新の状態になりました` : '最新の状態になりました')}
                  </p>
                  <p className="opacity-80">
                    {isOff && '変更はこの端末に保存され、接続が戻ったら自動で送信します。'}
                    {conn === 'reconnecting' && 'サーバーと通信できることを確認中です。'}
                    {conn === 'syncing' && '画面はそのまま操作できます。'}
                    {conn === 'online' && banner && `${clock(lastSync)} に同期 · 他のメンバーの更新も取り込みました`}
                  </p>
                </div>
                {isOff && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold tabular-nums" aria-label={conn === 'checking' ? '再試行中' : `${remain}秒後に再試行`}>
                      <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden="true">
                        <circle cx="10" cy="10" r="8" fill="none" stroke="#e8c98d" strokeWidth="2.5" />
                        <circle
                          cx="10"
                          cy="10"
                          r="8"
                          fill="none"
                          stroke="#b86e00"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray={50.27}
                          strokeDashoffset={50.27 * (1 - ring)}
                          className="transition-[stroke-dashoffset] duration-300 ease-linear"
                        />
                      </svg>
                      {conn === 'checking' ? '試行中' : `${remain}秒後に再試行`}
                      <span className="hidden font-sans text-[9.5px] font-normal opacity-70 @md:inline">（{attempt + 1}回目）</span>
                    </span>
                    <button
                      type="button"
                      onClick={retryNow}
                      disabled={conn === 'checking'}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-[#d9a548] bg-white/70 px-2 text-[10.5px] font-bold text-[#6b4300] hover:bg-white focus-visible:outline-2 focus-visible:outline-[#b86e00] disabled:opacity-50"
                    >
                      <RefreshCw size={11} aria-hidden="true" />今すぐ再試行
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        <div className="grid gap-3 p-3 @md:px-4 @3xl:min-h-0 @3xl:flex-1 @3xl:grid-cols-[minmax(0,1fr)_288px]">
          {/* 点検リスト */}
          <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#d3dcd5] bg-white shadow-[0_1px_0_#cdd7cf] @3xl:min-h-0">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#e3e9e4] px-3 pt-2.5 pb-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-wide text-[#5c6d65]">11月 月次点検 · ろ過棟</p>
                <h2 className="text-[15px] font-black tracking-tight">今日の点検項目</h2>
                <p className={`mt-0.5 flex items-center gap-1 text-[10.5px] ${isOff ? 'font-bold text-[#8a5300]' : 'text-[#5c6d65]'}`}>
                  {isOff ? <CloudOff size={11} aria-hidden="true" /> : <Clock3 size={11} aria-hidden="true" />}
                  {isOff ? `キャッシュを表示中 · ${clock(lastSync)} 時点（${ago(lastSync, now)}）` : conn === 'online' ? 'リアルタイムで同期中' : `${clock(lastSync)} 時点の内容を更新中…`}
                </p>
              </div>
              <LevelSpark values={level} stale={conn !== 'online'} />
            </div>
            <div className="px-3 pt-2">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-[#43544c]">
                <span>
                  {doneCount}/{tasks.length} 完了
                </span>
                <span className="font-normal text-[#7a8a82]">チェックはオフラインでも記録されます</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e3e9e4]">
                <motion.div className="h-full rounded-full bg-[#1f4d3f]" animate={{ width: `${(doneCount / tasks.length) * 100}%` }} transition={spring} />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pt-1 pb-2">
              <ul>
                {tasks.map((t) => {
                  const st = statusOf(undefined, t.id)
                  const staleOther = isOff && t.by !== '自分'
                  return (
                    <li key={t.id}>
                      <div className={`relative flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors duration-700 ${t.flash ? 'bg-[#dcf1ef]' : ''}`}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={t.done}
                          aria-label={t.title}
                          onClick={() => toggle(t)}
                          className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f4d3f] ${
                            t.done ? 'border-[#1f4d3f] bg-[#1f4d3f] text-white' : 'border-[#9fb0a6] bg-white hover:border-[#1f4d3f]'
                          }`}
                        >
                          <AnimatePresence initial={false}>
                            {t.done && (
                              <motion.span initial={{ scale: reduced ? 1 : 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={spring}>
                                <Check size={12} strokeWidth={3.2} aria-hidden="true" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12px] leading-snug font-bold ${t.done ? 'text-[#5c6d65] line-through decoration-[#9fb0a6]' : ''}`}>{t.title}</p>
                          <p className="flex flex-wrap items-center gap-x-1.5 text-[10px] text-[#7a8a82]">
                            <span>{t.spec}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {t.by} {ago(t.at, now)}
                            </span>
                            {staleOther && <span className="rounded-sm bg-[#fff3dc] px-1 font-bold text-[#8a5300]">古い可能性</span>}
                            {t.flash && <span className="font-bold text-[#0b6b64]">オフライン中に{t.by.split(' ')[0]}さんが完了</span>}
                          </p>
                        </div>
                        <QBadge status={st} reduced={reduced} />
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-1 border-t border-dashed border-[#d3dcd5] px-1.5 pt-2">
                <p className="flex items-center gap-1 text-[10.5px] font-bold text-[#43544c]">
                  <NotebookPen size={12} aria-hidden="true" />現場メモ
                </p>
                <ul className="mt-1 space-y-1">
                  <AnimatePresence initial={false}>
                    {notes.map((n) => (
                      <motion.li
                        key={n.id}
                        initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={spring}
                        className="flex items-start gap-2 rounded-md bg-[#f3f6f2] px-2 py-1.5"
                      >
                        <p className="min-w-0 flex-1 text-[11px] leading-snug">
                          {n.text}
                          <span className="ml-1.5 text-[9.5px] text-[#7a8a82]">{clock(n.at)}</span>
                        </p>
                        <QBadge status={statusOf(n.qid)} reduced={reduced} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <form onSubmit={addNote} className="mt-1.5 flex gap-1.5">
                  <label htmlFor={noteId} className="sr-only">
                    現場メモを追加
                  </label>
                  <input
                    id={noteId}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={120}
                    placeholder={isOff ? 'オフラインでも書けます（あとで送信）' : '気づいたことを記録…'}
                    className="h-8 min-w-0 flex-1 rounded-md border border-[#c9d4cc] bg-white px-2 text-[11.5px] placeholder:text-[#9aa8a0] focus:border-[#1f4d3f] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    aria-label="メモを保存"
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-[#1f4d3f] px-2.5 text-[11px] font-bold text-white hover:bg-[#2a6553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f4d3f] disabled:opacity-40"
                  >
                    <Send size={12} aria-hidden="true" />
                    {isOff ? '保存' : '送信'}
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* サイド:イラスト・キュー・できること */}
          <aside className="flex min-w-0 flex-col gap-3 @3xl:min-h-0 @3xl:overflow-y-auto @3xl:pr-0.5">
            <div className="shrink-0 overflow-hidden rounded-xl border border-[#d3dcd5] bg-white">
              <SignalScene conn={conn} packets={queued.length} reduced={reduced} />
              <p className="border-t border-[#e3e9e4] px-3 py-1.5 text-[10.5px] text-[#5c6d65]">
                中継局 KT-2 との通信：
                <b className={isOff ? 'text-[#8a5300]' : 'text-[#0b6b64]'}>
                  {{ online: '良好', offline: '圏外', checking: '探索中', reconnecting: '確立中', syncing: '送信中' }[conn]}
                </b>
              </p>
            </div>

            <div className="shrink-0 rounded-xl border border-[#d3dcd5] bg-white px-3 py-2">
              <p className="flex items-center justify-between text-[11px] font-black">
                <span className="flex items-center gap-1">
                  <CloudUpload size={13} aria-hidden="true" />送信キュー
                </span>
                <span className="font-mono text-[10px] font-bold text-[#7a8a82]">{queued.length} 件待ち</span>
              </p>
              {queue.length === 0 ? (
                <p className="mt-1 text-[10.5px] text-[#7a8a82]">送信待ちの変更はありません。</p>
              ) : (
                <ul className="mt-1 space-y-0.5">
                  <AnimatePresence initial={false}>
                    {queue.map((q) => (
                      <motion.li
                        key={q.id}
                        layout={!reduced}
                        initial={{ opacity: 0, x: reduced ? 0 : 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: reduced ? 0 : -8 }}
                        transition={spring}
                        className="flex items-center gap-2 text-[10.5px]"
                      >
                        <span className="min-w-0 flex-1 truncate">{q.label}</span>
                        <QBadge status={q.status} reduced={reduced} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            <div className={`shrink-0 rounded-xl border px-3 py-2 transition-colors duration-500 ${isOff ? 'border-[#efd39d] bg-[#fffaf0]' : 'border-[#d3dcd5] bg-white'}`}>
              <p className="text-[11px] font-black">{isOff ? 'オフラインでもできること' : 'オフラインになっても'}</p>
              <ul className="mt-1 space-y-0.5 text-[10.5px]">
                {[
                  { ok: true, icon: SquareCheckBig, text: '点検項目のチェック（あとで送信）' },
                  { ok: true, icon: NotebookPen, text: '現場メモの作成（あとで送信）' },
                  { ok: true, icon: FileText, text: '保存済みの手順書・配管図を見る' },
                  { ok: false, icon: Gauge, text: '水位などのリアルタイム値' },
                  { ok: false, icon: Users, text: '他のメンバーの更新を受け取る' },
                ].map(({ ok, icon: Icon, text }) => (
                  <li key={text} className={`flex items-center gap-1.5 ${!ok && isOff ? 'text-[#9aa8a0]' : ''}`}>
                    {ok ? (
                      <CircleCheck size={12} className="shrink-0 text-[#1f6a4a]" aria-label="できる" />
                    ) : (
                      <X size={12} className="shrink-0 text-[#b0563b]" aria-label="できない" />
                    )}
                    <Icon size={11} className="shrink-0 opacity-50" aria-hidden="true" />
                    <span className={!ok && isOff ? 'line-through' : ''}>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function QBadge({ status, reduced }: { status?: QStatus; reduced: boolean }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {status && (
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: reduced ? 1 : 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: reduced ? 1 : 0.8 }}
          transition={{ duration: reduced ? 0.1 : 0.18 }}
          className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-px text-[9.5px] font-bold whitespace-nowrap ${
            status === 'pending' ? 'bg-[#fff3dc] text-[#8a5300] ring-1 ring-[#efd39d]' : status === 'sending' ? 'bg-[#dcf1ef] text-[#0b6b64]' : 'bg-[#dff1e8] text-[#1f6a4a]'
          }`}
        >
          {status === 'pending' ? <Clock3 size={10} aria-hidden="true" /> : status === 'sending' ? <Loader2 size={10} className={reduced ? '' : 'animate-spin'} aria-hidden="true" /> : <Check size={10} aria-hidden="true" />}
          {status === 'pending' ? '送信待ち' : status === 'sending' ? '送信中' : '送信済み'}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function LevelSpark({ values, stale }: { values: number[]; stale: boolean }) {
  const min = 3.26
  const max = 3.54
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i / (values.length - 1)) * 96 + 2} ${30 - ((v - min) / (max - min)) * 26}`).join('')
  const last = values[values.length - 1]
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2 py-1 transition-all duration-500 ${stale ? 'border-[#e3e9e4] bg-[#f3f4f2] grayscale' : 'border-[#cfe3dd] bg-[#f2faf7]'}`}>
      <div className="leading-tight">
        <p className="text-[9px] font-bold text-[#5c6d65]">沈殿池 水位</p>
        <p className="font-mono text-[13px] font-bold tabular-nums text-[#0b6b64]">{last.toFixed(2)} m</p>
        <p className={`text-[8.5px] font-bold ${stale ? 'text-[#8a5300]' : 'text-[#0f7c74]'}`}>{stale ? '更新停止 · キャッシュ' : '● LIVE'}</p>
      </div>
      <svg viewBox="0 0 100 32" className="h-8 w-20" aria-hidden="true">
        <path d={`${d}L98 32L2 32Z`} fill="#0f7c74" fillOpacity=".12" />
        <path d={d} fill="none" stroke="#0f7c74" strokeWidth="1.6" strokeLinejoin="round" strokeDasharray={stale ? '3 2' : undefined} />
      </svg>
    </div>
  )
}

/* ---------------- 中継塔のイラスト ---------------- */

const LINK = 'M58 92 C 100 40, 170 30, 214 46'

function bezier(t: number) {
  const p0 = [58, 92]
  const p1 = [100, 40]
  const p2 = [170, 30]
  const p3 = [214, 46]
  const u = 1 - t
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])
}

function SignalScene({ conn, packets, reduced }: { conn: Conn; packets: number; reduced: boolean }) {
  const off = conn === 'offline' || conn === 'checking'
  const pts = useMemo(() => Array.from({ length: 9 }, (_, i) => bezier(i / 8)), [])
  const sky = off ? ['#c9cfd6', '#e3e5e2'] : ['#bfe3e6', '#eef6ea']
  return (
    <svg viewBox="0 0 260 128" preserveAspectRatio="xMidYMax slice" className="block h-36 w-full @3xl:h-auto" role="img" aria-label={off ? '中継塔との通信が途切れている' : '中継塔と通信している'}>
      <defs>
        <linearGradient id="os-sky" x1="0" x2="0" y1="0" y2="1">
          <motion.stop offset="0" animate={{ stopColor: sky[0] }} transition={{ duration: 0.8 }} />
          <motion.stop offset="1" animate={{ stopColor: sky[1] }} transition={{ duration: 0.8 }} />
        </linearGradient>
      </defs>
      <rect width="260" height="128" fill="url(#os-sky)" />
      {/* 太陽 / 月 */}
      <motion.circle cx="34" cy="28" r="10" animate={{ fill: off ? '#eef0f2' : '#f6cf6a', opacity: off ? 0.8 : 1 }} transition={{ duration: 0.8 }} />
      {/* 山並み(等高線入り) */}
      <path d="M150 128 L214 52 L280 128Z" fill="#7da48f" />
      <path d="M176 100 Q214 84 246 104M190 82 Q214 72 234 86" stroke="#5f8a75" strokeWidth="1" fill="none" />
      <path d="M-10 128 L40 84 Q80 70 120 96 L170 128Z" fill="#5f8a75" />
      <path d="M10 112 Q50 92 100 108M30 100 Q60 88 90 98" stroke="#4d7663" strokeWidth="1" fill="none" />
      <path d="M0 128 Q90 110 260 124 V128Z" fill="#3f6656" />
      {/* 木 */}
      <path d="M96 106l4.0 -11.0 4.0 11.0Z" fill="#2f5446" />
      <path d="M106 110l3.2 -8.8 3.2 8.8Z" fill="#2f5446" />
      <path d="M122 114l4.4 -12.1 4.4 12.1Z" fill="#2f5446" />
      <path d="M160 118l3.6 -9.9 3.6 9.9Z" fill="#2f5446" />
      <path d="M236 100l4.0 -11.0 4.0 11.0Z" fill="#2f5446" />
      <path d="M246 106l3.2 -8.8 3.2 8.8Z" fill="#2f5446" />
      <path d="M14 108l3.6 -9.9 3.6 9.9Z" fill="#2f5446" />
      <path d="M24 104l4.4 -12.1 4.4 12.1Z" fill="#2f5446" />
      {/* 中継塔 */}
      <g stroke="#2a3a33" strokeWidth="1.4" fill="none">
        <path d="M208 56 L214 36 L220 56 M210 50h8M211 44h6" />
      </g>
      <motion.circle cx="214" cy="35" r="2.4" animate={{ fill: off ? '#9aa39f' : '#e8574a' }} />
      {/* 作業車と小屋 */}
      <g>
        <rect x="36" y="94" width="34" height="16" rx="3" fill="#f6f1e4" stroke="#2a3a33" strokeWidth="1.3" />
        <path d="M70 99h9l5 6v5H70Z" fill="#f2b54a" stroke="#2a3a33" strokeWidth="1.3" />
        <circle cx="45" cy="111" r="3.4" fill="#2a3a33" />
        <circle cx="76" cy="111" r="3.4" fill="#2a3a33" />
        <path d="M58 94V84" stroke="#2a3a33" strokeWidth="1.4" />
        <rect x="55" y="81" width="6" height="3" rx="1" fill="#2a3a33" />
        <text x="44" y="105" fontSize="6" fontWeight="700" fill="#1f4d3f">KT</text>
      </g>
      {/* 電波路 */}
      <path d={LINK} fill="none" stroke={off ? '#8d958f' : '#0f7c74'} strokeOpacity={off ? 0.5 : 0.35} strokeWidth="1.5" strokeDasharray="3 4" />
      {!off && (
        <motion.path
          d={LINK}
          fill="none"
          stroke="#0f7c74"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 14"
          initial={false}
          animate={reduced ? { strokeDashoffset: 0 } : { strokeDashoffset: [0, -40] }}
          transition={reduced ? { duration: 0 } : { duration: conn === 'syncing' ? 0.6 : 1.4, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {off && (
        <g>
          <motion.g initial={false} animate={{ opacity: 1 }}>
            <circle cx="132" cy="38" r="8" fill="#fff8ea" stroke="#b86e00" strokeWidth="1.3" />
            <path d="M129 35l6 6m0-6-6 6" stroke="#b86e00" strokeWidth="1.6" strokeLinecap="round" />
          </motion.g>
        </g>
      )}
      {/* 雲(オフライン時に塔を隠す) */}
      <motion.g
        initial={false}
        animate={{ x: off ? 0 : 90, opacity: off ? 1 : 0 }}
        transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 60, damping: 16 }}
      >
        <motion.g animate={off && !reduced ? { x: [0, 6, 0] } : { x: 0 }} transition={{ duration: 5, repeat: off && !reduced ? Infinity : 0, ease: 'easeInOut' }}>
          <path d="M184 52a10 10 0 0 1 10-13 13 13 0 0 1 24-3 9 9 0 0 1 14 7 8 8 0 0 1-2 16h-40a8 8 0 0 1-6-7Z" fill="#f4f5f3" stroke="#aab3ae" strokeWidth="1" />
        </motion.g>
      </motion.g>
      {/* アンテナの輪 */}
      {(conn === 'offline' || conn === 'checking' || conn === 'reconnecting') &&
        !reduced &&
        [0, 1, 2].map((i) => (
          <motion.circle
            key={`${conn}-${i}`}
            cx="58"
            cy="82"
            r="6"
            fill="none"
            stroke={conn === 'reconnecting' ? '#0f7c74' : conn === 'checking' ? '#b86e00' : '#8d958f'}
            strokeWidth="1.4"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: conn === 'offline' ? 2.4 : 5, opacity: 0 }}
            transition={{ duration: conn === 'offline' ? 2.6 : 1.3, repeat: Infinity, delay: i * (conn === 'offline' ? 0.86 : 0.43), ease: 'easeOut' }}
          />
        ))}
      {/* 同期中のパケット */}
      {conn === 'syncing' &&
        !reduced &&
        Array.from({ length: Math.min(4, Math.max(1, packets)) }, (_, i) => (
          <motion.rect
            key={i}
            width="7"
            height="5"
            rx="1.5"
            fill="#f2b54a"
            stroke="#8a5300"
            strokeWidth=".8"
            initial={{ x: pts[0][0] - 3.5, y: pts[0][1] - 2.5, opacity: 0 }}
            animate={{ x: pts.map((p) => p[0] - 3.5), y: pts.map((p) => p[1] - 2.5), opacity: [0, 1, 1, 1, 1, 1, 1, 1, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.28, ease: 'linear' }}
          />
        ))}
      <text x="8" y="122" fontSize="7" fontWeight="700" fill="#e9f1ec" fontFamily="ui-monospace,monospace">
        {conn === 'online' ? 'LINK OK · 42 ms' : conn === 'syncing' ? `UPLINK · ${packets} QUEUED` : conn === 'reconnecting' ? 'HANDSHAKE…' : 'NO LINK'}
      </text>
    </svg>
  )
}
