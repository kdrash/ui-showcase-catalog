import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  FileText,
  FolderLock,
  Loader2,
  LogIn,
  RotateCcw,
  Send,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

/**
 * 403(アクセス権がありません)の画面。サービス名「Kumoya Docs」・組織・人物・メールアドレスはすべて架空。
 * - 左は庭の塀に付いたアーチ扉の SVG イラスト。南京錠をクリックすると Motion の useAnimate で揺れ、
 *   扉の前では猫が眠って(尻尾がゆっくり揺れ、Z が浮かぶ)いる。リクエストを送ると紙飛行機が郵便受けに飛び込み、
 *   許可されると扉が左の蝶番を軸に scaleX で開き、奥の暖かい光がこぼれて猫が目を覚ます
 * - 右は「なぜ見られないか」を具体的に説明するカード(リソース・場所・共有範囲・オーナー・ログイン中のアカウント)
 * - リクエストフォームは権限(閲覧/コメント/編集)のラジオと、定型文チップ付きのメッセージ欄。送信すると
 *   「リクエスト送信済み」に切り替わり、送信 → オーナーへ通知 → 確認待ち → 承認 のタイムラインが時間差で進む。
 *   デモ用の「オーナーが承認」で許可状態へ。取り消し・最初からにも対応
 * - 「アカウントを切り替え」はポップオーバー(Esc / 外側クリックで閉じる、↑↓ で移動)。仕事用アカウントを選ぶと
 *   権限を確認してそのままアクセスできる別ルートになる
 * - useReducedMotion 時は猫と扉の動きを止め、切り替えは短いフェードのみ
 */

type View = 'denied' | 'sent' | 'granted'
type Role = 'viewer' | 'commenter' | 'editor'

const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: 'viewer', label: '閲覧のみ', hint: '内容を見ることだけできます' },
  { id: 'commenter', label: 'コメント可', hint: '閲覧に加えてコメントを残せます' },
  { id: 'editor', label: '編集可', hint: 'オーナーに加えて部門管理者の確認が入る場合があります' },
]

const PRESETS = ['来週の部会資料の作成に必要です', '数値の確認だけさせてください', '三輪さんから共有の依頼を受けました']

const ACCOUNTS = [
  { id: 'personal', name: '岡野 湊', mail: 'minato.okano@hoshibi.example', tag: '個人', hue: ['#f2a07b', '#e0627a'] },
  { id: 'work', name: '岡野 湊', mail: 'm.okano@kumoya-group.example', tag: '雲野屋グループ', hue: ['#7fb5e8', '#5a6fd6'] },
] as const

function clock(ms: number) {
  return new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(ms)
}

function Avatar({ name, hue, size = 26 }: { name: string; hue: readonly [string, string] | readonly string[]; size?: number }) {
  const id = `ad-av-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className="shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hue[0]} />
          <stop offset="1" stopColor={hue[1]} />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill={`url(#${id})`} />
      <circle cx="16" cy="13" r="5.2" fill="#fff" fillOpacity=".85" />
      <path d="M6.5 27.5a10 10 0 0 1 19 0" fill="#fff" fillOpacity=".85" />
      <title>{name}</title>
    </svg>
  )
}

export function AccessDenied() {
  const reduced = !!useReducedMotion()
  const [view, setView] = useState<View>('denied')
  const [account, setAccount] = useState<(typeof ACCOUNTS)[number]['id']>('personal')
  const [role, setRole] = useState<Role>('viewer')
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sentAt, setSentAt] = useState(0)
  const [stage, setStage] = useState(0)
  const [menu, setMenu] = useState(false)
  const [checking, setChecking] = useState(false)
  const [grantVia, setGrantVia] = useState<'owner' | 'account'>('owner')
  const [plane, setPlane] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const msgId = useId()
  const roleName = useId()
  const acct = ACCOUNTS.find((a) => a.id === account)!

  // 送信 → 通知 → 確認待ち のタイムラインを時間差で進める
  useEffect(() => {
    if (!sending) return
    const t = window.setTimeout(() => {
      setSending(false)
      setSentAt(Date.now())
      setStage(1)
      setView('sent')
      setPlane((p) => p + 1)
    }, 700)
    return () => window.clearTimeout(t)
  }, [sending])
  useEffect(() => {
    if (view !== 'sent' || stage >= 2) return
    const t = window.setTimeout(() => setStage((s) => s + 1), stage === 1 ? 900 : 1100)
    return () => window.clearTimeout(t)
  }, [view, stage])

  useEffect(() => {
    if (!checking) return
    const t = window.setTimeout(() => {
      setChecking(false)
      setGrantVia('account')
      setView('granted')
    }, 1100)
    return () => window.clearTimeout(t)
  }, [checking])

  // ポップオーバー: 外側クリックで閉じる
  useEffect(() => {
    if (!menu) return
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('pointerdown', onDown)
    menuRef.current?.querySelector<HTMLButtonElement>('[data-item]')?.focus()
    return () => document.removeEventListener('pointerdown', onDown)
  }, [menu])

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[data-item]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setMenu(false)
      triggerRef.current?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
    }
  }

  const pick = (id: (typeof ACCOUNTS)[number]['id']) => {
    setMenu(false)
    triggerRef.current?.focus()
    if (id === account) return
    setAccount(id)
    if (id === 'work') setChecking(true)
    else if (view === 'granted' && grantVia === 'account') setView('denied')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (sending) return
    setSending(true)
  }

  const reset = () => {
    setView('denied')
    setAccount('personal')
    setStage(0)
    setMsg('')
    setRole('viewer')
    setGrantVia('owner')
  }

  const fade = { duration: reduced ? 0.12 : 0.24 }
  const slide = { initial: { opacity: 0, y: reduced ? 0 : 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduced ? 0 : -6 }, transition: fade }
  const granted = view === 'granted'

  return (
    <div className="@container h-full w-full bg-[#efe9f6] text-[#2a2238]">
      <div className="h-full overflow-y-auto pb-[var(--solo-footer-clearance,0px)] @3xl:grid @3xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] @3xl:overflow-hidden">
        {/* イラスト */}
        <div className="relative h-52 overflow-hidden bg-[radial-gradient(ellipse_at_50%_20%,#fbf6ff,#e3d9f1_70%)] @md:h-60 @3xl:h-full">
          <Gate view={view} reduced={reduced} plane={plane} />
          <p aria-hidden="true" className="absolute top-2.5 left-3 font-mono text-[9px] font-bold tracking-[.2em] text-[#7a6a96]">
            ERROR 403 · FORBIDDEN
          </p>
          <p aria-hidden="true" className="absolute bottom-2 left-3 text-[9.5px] text-[#7a6a96]">南京錠をクリックしてみてください</p>
        </div>

        {/* 説明とリクエスト */}
        <div className="flex min-w-0 flex-col px-4 pt-3 pb-3 @md:px-6 @3xl:min-h-0 @3xl:overflow-y-auto @3xl:pt-4">
          <header className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[12px] font-black tracking-tight">
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="6" fill="#5b3fa0" />
                <path d="M8 15.5a3 3 0 0 1 .4-6A4.2 4.2 0 0 1 16 9.8a2.9 2.9 0 0 1 0 5.7Z" fill="#f4eefc" />
              </svg>
              Kumoya Docs
            </p>
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
                className="flex items-center gap-1.5 rounded-full border border-[#d8cceb] bg-white/70 py-0.5 pr-2 pl-0.5 text-[10.5px] font-bold hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b3fa0]"
              >
                <Avatar name={acct.name} hue={acct.hue} size={22} />
                <span className="hidden max-w-40 truncate @md:inline">{acct.mail}</span>
                <span className="@md:hidden">{acct.tag}</span>
                <ChevronDown size={12} aria-hidden="true" />
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    ref={menuRef}
                    role="menu"
                    aria-label="アカウントを切り替え"
                    onKeyDown={onMenuKey}
                    initial={{ opacity: 0, y: reduced ? 0 : -4, scale: reduced ? 1 : 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -4, scale: reduced ? 1 : 0.97 }}
                    transition={{ duration: reduced ? 0.1 : 0.16 }}
                    className="absolute top-[calc(100%+6px)] right-0 z-30 w-72 max-w-[calc(100cqw-2rem)] origin-top-right rounded-xl border border-[#d8cceb] bg-white p-1.5 shadow-[0_18px_40px_-16px_#3b2a6680]"
                  >
                    <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold text-[#7a6a96]">アカウントを切り替え</p>
                    {ACCOUNTS.map((a) => (
                      <button
                        key={a.id}
                        data-item
                        role="menuitemradio"
                        aria-checked={a.id === account}
                        type="button"
                        onClick={() => pick(a.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f3edfb] focus-visible:bg-[#f3edfb] focus-visible:outline-none"
                      >
                        <Avatar name={a.name} hue={a.hue} size={28} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-bold">
                            {a.name} <span className="ml-1 rounded-sm bg-[#efe9f6] px-1 text-[9.5px] font-bold text-[#6b5a8a]">{a.tag}</span>
                          </span>
                          <span className="block truncate text-[10px] text-[#7a6a96]">{a.mail}</span>
                          {a.id === 'work' && a.id !== account && <span className="block text-[9.5px] font-bold text-[#2f8a5b]">このワークスペースのメンバーです</span>}
                        </span>
                        {a.id === account && <Check size={14} className="shrink-0 text-[#5b3fa0]" aria-hidden="true" />}
                      </button>
                    ))}
                    <div className="my-1 h-px bg-[#eee7f6]" />
                    <button
                      data-item
                      role="menuitem"
                      type="button"
                      onClick={() => setMenu(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold text-[#5b3fa0] hover:bg-[#f3edfb] focus-visible:bg-[#f3edfb] focus-visible:outline-none"
                    >
                      <LogIn size={14} aria-hidden="true" />別のアカウントでログイン
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            {checking ? (
              <motion.div key="checking" {...slide} role="status" className="grid flex-1 place-content-center justify-items-center gap-2 py-10 text-center">
                <Loader2 size={22} className={`text-[#5b3fa0] ${reduced ? '' : 'animate-spin'}`} aria-hidden="true" />
                <p className="text-[13px] font-bold">{acct.mail} で権限を確認しています…</p>
              </motion.div>
            ) : granted ? (
              <motion.div key="granted" {...slide} className="mt-4" role="status">
                <p className="font-mono text-[10px] font-bold tracking-[.18em] text-[#2f8a5b]">200 · ACCESS GRANTED</p>
                <h2 className="mt-1 text-[clamp(1.15rem,3.4cqw,1.6rem)] leading-tight font-black tracking-tight text-balance">
                  {grantVia === 'account' ? '仕事用アカウントでアクセスできました' : 'アクセスが許可されました'}
                </h2>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#5a4d70]">
                  {grantVia === 'account'
                    ? `${acct.mail} は「経営企画部」グループのメンバーです。次回からはこのアカウントで開くと確認なしで表示されます。`
                    : `三輪 志保さんが ${ROLES.find((r) => r.id === role)!.label} の権限を付与しました。確認メールも ${acct.mail} に届いています。`}
                </p>
                <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#cfe5d8] bg-white/80 px-3 py-2">
                  <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-[#e6f4ec] text-[#2f8a5b]">
                    <FileText size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold">2027年度 予算計画（確定版）</p>
                    <p className="truncate text-[10px] text-[#6a7d72]">経営企画 / 予算 · オーナー 三輪 志保 · 最終更新 11/6</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#e6f4ec] px-2 py-0.5 text-[10px] font-bold text-[#22704a]">
                    {grantVia === 'account' ? 'メンバー' : ROLES.find((r) => r.id === role)!.label}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#5b3fa0] px-3.5 text-[12px] font-bold text-white shadow-[0_6px_16px_-8px_#5b3fa0] hover:bg-[#4b318c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b3fa0]"
                  >
                    <FileText size={14} aria-hidden="true" />ドキュメントを開く
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8cceb] bg-white/60 px-3 text-[11.5px] font-bold text-[#5a4d70] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b3fa0]"
                  >
                    <RotateCcw size={13} aria-hidden="true" />最初から
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="denied" {...slide} className="mt-3">
                <p className="font-mono text-[10px] font-bold tracking-[.18em] text-[#b04a5a]">403 · アクセス権がありません</p>
                <h2 className="mt-0.5 text-[clamp(1.1rem,3.2cqw,1.5rem)] leading-tight font-black tracking-tight text-balance">このドキュメントを表示する権限がありません</h2>

                <dl className="mt-2.5 divide-y divide-[#ece4f6] rounded-xl border border-[#ddd2ec] bg-white/75 text-[11px] shadow-[0_1px_0_#d8cceb]">
                  <div className="flex gap-2.5 px-3 py-2">
                    <dt className="sr-only">リソース</dt>
                    <span className="w-10 shrink-0">
                      <span className="grid size-[26px] place-items-center rounded-lg bg-[#efe9f6] text-[#5b3fa0]">
                        <FileText size={14} aria-hidden="true" />
                      </span>
                    </span>
                    <dd className="min-w-0">
                      <p className="truncate text-[12px] font-bold">2027年度 予算計画（確定版）</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-[10px] text-[#7a6a96]">
                        <span className="inline-flex items-center gap-0.5">
                          <FolderLock size={10} aria-hidden="true" />経営企画 / 予算
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Users size={10} aria-hidden="true" />共有範囲：経営企画部のメンバーのみ
                        </span>
                      </p>
                    </dd>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-1.5">
                    <dt className="w-10 shrink-0 text-[9.5px] font-bold whitespace-nowrap text-[#7a6a96]">オーナー</dt>
                    <dd className="flex min-w-0 items-center gap-1.5">
                      <Avatar name="三輪 志保" hue={['#b9d98a', '#4f9a7a']} size={20} />
                      <span className="font-bold">三輪 志保</span>
                      <span className="truncate text-[10px] text-[#7a6a96]">経営企画部 · 部長</span>
                    </dd>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-1.5">
                    <dt className="w-10 shrink-0 text-[9.5px] font-bold whitespace-nowrap text-[#7a6a96]">あなた</dt>
                    <dd className="flex min-w-0 flex-1 items-center gap-1.5">
                      <Avatar name={acct.name} hue={acct.hue} size={20} />
                      <span className="min-w-0 truncate">
                        <span className="font-bold">{acct.mail}</span>
                        <span className="ml-1 rounded-sm bg-[#fbe6e9] px-1 text-[9.5px] font-bold text-[#a33c4d]">{acct.tag} · 権限なし</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMenu(true)}
                        className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold text-[#5b3fa0] hover:bg-[#efe9f6] focus-visible:outline-2 focus-visible:outline-[#5b3fa0]"
                      >
                        切り替え
                      </button>
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-[11px] leading-relaxed text-[#5a4d70]">
                  共有範囲が「経営企画部」に限られていて、いまログイン中の<b>個人アカウント</b>はそこに含まれていません。仕事用のアカウントをお持ちなら切り替えるか、オーナーにアクセスをリクエストしてください。
                </p>

                <AnimatePresence mode="wait" initial={false}>
                  {view === 'sent' ? (
                    <motion.section key="sent" {...slide} aria-labelledby={`${msgId}-sent`} className="mt-3 rounded-xl border border-[#cfe5d8] bg-[#f3fbf6] p-3">
                      <h3 id={`${msgId}-sent`} className="flex items-center gap-1.5 text-[12.5px] font-black text-[#22704a]">
                        <span className="grid size-5 place-items-center rounded-full bg-[#2f8a5b] text-white">
                          <Check size={12} strokeWidth={3} aria-hidden="true" />
                        </span>
                        リクエスト送信済み
                      </h3>
                      <ol className="mt-2 space-y-0">
                        {[
                          { t: 'リクエストを送信', d: `${ROLES.find((r) => r.id === role)!.label} · ${clock(sentAt)}` },
                          { t: '三輪 志保さんに通知', d: 'メールとアプリの通知で届きました' },
                          { t: '確認待ち', d: 'ふだんは1営業日以内に返答があります' },
                          { t: '承認されたらお知らせ', d: `${acct.mail} にメールが届きます` },
                        ].map((s, i) => {
                          const st = i < stage ? 'done' : i === stage ? 'active' : 'todo'
                          const waiting = i === 2 && stage >= 2
                          return (
                            <li key={s.t} className="relative grid grid-cols-[18px_1fr] gap-2 pb-2 last:pb-0">
                              {i < 3 && <span aria-hidden="true" className={`absolute top-4 bottom-0 left-[8.5px] w-px ${i < stage - 1 ? 'bg-[#2f8a5b]' : 'bg-[#cfe5d8]'}`} />}
                              <span
                                aria-hidden="true"
                                className={`relative z-10 mt-0.5 grid size-[18px] place-items-center rounded-full border-2 ${
                                  waiting ? 'border-[#d9932f] bg-white' : st === 'done' ? 'border-[#2f8a5b] bg-[#2f8a5b] text-white' : st === 'active' ? 'border-[#2f8a5b] bg-white' : 'border-[#cbd8cf] bg-white'
                                }`}
                              >
                                {st === 'done' && <Check size={10} strokeWidth={3.2} />}
                                {(waiting || st === 'active') && (
                                  <span className={`size-1.5 rounded-full ${waiting ? 'bg-[#d9932f]' : 'bg-[#2f8a5b]'} ${reduced ? '' : 'animate-pulse'}`} />
                                )}
                              </span>
                              <motion.div initial={false} animate={{ opacity: st === 'todo' && !waiting ? 0.5 : 1 }} transition={fade}>
                                <p className="text-[11.5px] font-bold">{waiting ? '確認待ち — 三輪さんが確認中です' : s.t}</p>
                                <p className="text-[10px] text-[#5f7a6a]">{s.d}</p>
                              </motion.div>
                            </li>
                          )
                        })}
                      </ol>
                      {msg.trim() && (
                        <blockquote className="mt-2 border-l-2 border-[#9fcfb4] pl-2 text-[10.5px] leading-snug text-[#4c6658]">「{msg.trim()}」</blockquote>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled
                          title="24時間後に送れます"
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#cfe5d8] bg-white px-2.5 text-[11px] font-bold text-[#22704a] disabled:opacity-50"
                        >
                          <BellRing size={12} aria-hidden="true" />リマインド（24時間後）
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setView('denied')
                            setStage(0)
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-[#a33c4d] hover:bg-[#fbe6e9] focus-visible:outline-2 focus-visible:outline-[#a33c4d]"
                        >
                          <X size={12} aria-hidden="true" />取り消す
                        </button>
                        <button
                          type="button"
                          disabled={stage < 2}
                          onClick={() => {
                            setGrantVia('owner')
                            setView('granted')
                          }}
                          className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-[#9a87c0] px-2.5 text-[10.5px] font-bold text-[#5b3fa0] hover:bg-[#efe9f6] focus-visible:outline-2 focus-visible:outline-[#5b3fa0] disabled:opacity-40"
                        >
                          デモ：オーナーが承認
                        </button>
                      </div>
                    </motion.section>
                  ) : (
                    <motion.form key="form" {...slide} onSubmit={submit} className="mt-3 rounded-xl border border-[#ddd2ec] bg-white/75 p-3">
                      <fieldset>
                        <legend className="text-[11.5px] font-black">アクセスをリクエスト</legend>
                        <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-[#efe9f6] p-0.5" role="radiogroup" aria-label="リクエストする権限">
                          {ROLES.map((r) => (
                            <label
                              key={r.id}
                              className="relative cursor-pointer rounded-md px-1 py-1 text-center text-[11px] font-bold text-[#6b5a8a] has-checked:text-[#2a2238] has-focus-visible:outline-2 has-focus-visible:outline-[#5b3fa0]"
                            >
                              <input type="radio" name={roleName} value={r.id} checked={role === r.id} onChange={() => setRole(r.id)} className="sr-only" />
                              {role === r.id && (
                                <motion.span layoutId={`${roleName}-pill`} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 36 }} className="absolute inset-0 rounded-md bg-white shadow-[0_1px_3px_#5b3fa033]" />
                              )}
                              <span className="relative">{r.label}</span>
                            </label>
                          ))}
                        </div>
                        <p className="mt-1 text-[10px] text-[#7a6a96]">{ROLES.find((r) => r.id === role)!.hint}</p>
                      </fieldset>
                      <label htmlFor={msgId} className="mt-2 block text-[10.5px] font-bold text-[#5a4d70]">
                        三輪さんへのメッセージ（任意）
                      </label>
                      <textarea
                        id={msgId}
                        value={msg}
                        onChange={(e) => setMsg(e.target.value.slice(0, 200))}
                        rows={2}
                        placeholder="何のために必要か書くと、承認されやすくなります"
                        className="mt-1 block w-full resize-none rounded-lg border border-[#d8cceb] bg-white px-2.5 py-1.5 text-[11.5px] leading-snug placeholder:text-[#a597bd] focus:border-[#5b3fa0] focus:outline-none"
                      />
                      <div className="mt-1 flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {PRESETS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setMsg(p)}
                              className="rounded-full border border-[#e1d7ef] bg-white px-2 py-0.5 text-[9.5px] text-[#5a4d70] hover:border-[#9a87c0] focus-visible:outline-2 focus-visible:outline-[#5b3fa0]"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                        <span className="shrink-0 font-mono text-[9.5px] text-[#a597bd]">{msg.length}/200</span>
                      </div>
                      <button
                        type="submit"
                        disabled={sending}
                        className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#5b3fa0] text-[12px] font-bold text-white shadow-[0_6px_16px_-8px_#5b3fa0] hover:bg-[#4b318c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b3fa0] disabled:opacity-75 @md:w-auto @md:px-4"
                      >
                        {sending ? <Loader2 size={14} className={reduced ? '' : 'animate-spin'} aria-hidden="true" /> : <Send size={13} aria-hidden="true" />}
                        {sending ? '送信しています…' : 'アクセスをリクエスト'}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 扉と猫のイラスト ---------------- */

function Gate({ view, reduced, plane }: { view: View; reduced: boolean; plane: number }) {
  const [lockScope, animateLock] = useAnimate<SVGGElement>()
  const [knock, setKnock] = useState(0)
  const open = view === 'granted'

  const jiggle = () => {
    if (open) return
    setKnock((k) => k + 1)
    if (reduced || !lockScope.current) return
    animateLock(lockScope.current, { rotate: [0, -14, 11, -7, 4, 0] }, { duration: 0.55, ease: 'easeOut' })
  }

  useEffect(() => {
    if (!knock) return
    const t = window.setTimeout(() => setKnock(0), 1600)
    return () => window.clearTimeout(t)
  }, [knock])

  return (
    <svg viewBox="4 66 312 234" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <radialGradient id="ad-glow" cx="50%" cy="60%" r="60%">
          <stop offset="0" stopColor="#fff2c6" />
          <stop offset="1" stopColor="#ffb86b" />
        </radialGradient>
        <pattern id="ad-brick" width="28" height="14" patternUnits="userSpaceOnUse">
          <rect width="28" height="14" fill="#d9cdec" />
          <path d="M0 13.5h28M14 0v7M0 7h28M0 7v7M28 7v7" stroke="#c7b8de" strokeWidth="1" />
        </pattern>
        <clipPath id="ad-arch">
          <path d="M118 270V150a42 42 0 0 1 84 0v120Z" />
        </clipPath>
      </defs>

      {/* 塀 */}
      <rect x="24" y="96" width="272" height="178" rx="6" fill="url(#ad-brick)" />
      <rect x="18" y="88" width="284" height="12" rx="4" fill="#bfaedb" />
      {/* アーチの縁 */}
      <path d="M110 274V150a50 50 0 0 1 100 0v124" fill="#b9a6d8" />
      {/* 扉の奥(光) */}
      <g clipPath="url(#ad-arch)">
        <rect x="110" y="100" width="100" height="180" fill="url(#ad-glow)" />
        <motion.g initial={false} animate={{ opacity: open ? 1 : 0 }} transition={{ duration: 0.6, delay: open ? 0.3 : 0 }}>
          <path d="M136 270l14-60h22l14 60Z" fill="#fff8e2" opacity=".7" />
          <rect x="146" y="196" width="28" height="20" rx="2" fill="#fffdf6" stroke="#e7a85c" />
          <path d="M150 202h20M150 207h14M150 212h17" stroke="#e7a85c" strokeWidth="1.2" />
        </motion.g>
        {/* 扉本体:左の蝶番を軸に開く */}
        <motion.g
          initial={false}
          animate={{ scaleX: open ? 0.14 : 1 }}
          transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 70, damping: 14, delay: 0.15 }}
          style={{ originX: 0, originY: 0.5 }}
        >
          <path d="M118 270V150a42 42 0 0 1 84 0v120Z" fill="#c8674a" />
          <path d="M126 268V152a34 34 0 0 1 68 0v116" fill="none" stroke="#a9523a" strokeWidth="2" />
          <path d="M160 116v154M126 196h68M126 236h68" stroke="#a9523a" strokeWidth="2" />
          {/* 郵便受け */}
          <rect x="172" y="212" width="18" height="6" rx="2" fill="#3c2a4f" />
          {/* 表札 */}
          <rect x="133" y="166" width="54" height="16" rx="3" fill="#f6ead3" stroke="#a9523a" />
          <text x="160" y="177.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#7a3a28">
            経営企画部
          </text>
          {/* 南京錠 */}
          <g
            ref={lockScope}
            style={{ transformBox: 'fill-box', transformOrigin: '50% 0%', cursor: open ? 'default' : 'pointer', pointerEvents: 'auto' }}
            onClick={jiggle}
          >
            <path d="M139 214v-8a9 9 0 0 1 18 0v8" fill="none" stroke="#6d5a3a" strokeWidth="3.4" />
            <rect x="134" y="212" width="28" height="22" rx="5" fill="#e8b440" stroke="#9a7120" strokeWidth="1.4" />
            <circle cx="148" cy="221" r="3" fill="#6d4e12" />
            <path d="M148 223v5" stroke="#6d4e12" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </motion.g>
      </g>
      {/* ランタン */}
      <motion.g
        style={{ originX: 0.5, originY: 0 }}
        animate={reduced ? { rotate: 0 } : { rotate: [-3, 3, -3] }}
        transition={{ duration: 4, repeat: reduced ? 0 : Infinity, ease: 'easeInOut' }}
      >
        <path d="M232 108v14" stroke="#5a4a70" strokeWidth="1.6" />
        <rect x="224" y="122" width="16" height="22" rx="4" fill={open ? '#ffd27a' : '#f5e1a8'} stroke="#5a4a70" strokeWidth="1.6" />
        <path d="M222 122h20M222 144h20" stroke="#5a4a70" strokeWidth="2.4" strokeLinecap="round" />
      </motion.g>
      {/* ツタ */}
      <g fill="#6aa27a">
        {[
          [36, 104, -20],
          [48, 116, 30],
          [40, 132, -10],
          [56, 146, 40],
          [46, 162, 0],
          [284, 104, 20],
          [272, 118, -30],
          [282, 136, 10],
          [266, 150, -40],
          [100, 98, 10],
          [214, 98, -15],
          [226, 102, 25],
        ].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx="6" ry="3.6" transform={`rotate(${r} ${x} ${y})`} />
        ))}
      </g>
      <path d="M30 96c10 20 20 40 16 70M290 96c-10 18-22 36-24 58M96 96c6 4 12 4 20 2M200 98c10 4 22 6 30 2" stroke="#4e8a62" strokeWidth="1.4" fill="none" />
      {/* 地面 */}
      <path d="M0 274h320v26H0Z" fill="#cbbfe0" />
      <path d="M118 274h84l14 26H104Z" fill="#bcaed6" />

      {/* 猫 */}
      <g transform="translate(212 254)">
        <motion.path
          d="M40 14c14 2 22-8 18-20"
          fill="none"
          stroke="#4a3d5c"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ originX: 0, originY: 1 }}
          animate={reduced ? { rotate: 0 } : open ? { rotate: [0, -24, 0] } : { rotate: [0, 10, 0] }}
          transition={{ duration: open ? 0.9 : 3.2, repeat: reduced ? 0 : Infinity, ease: 'easeInOut' }}
        />
        <ellipse cx="22" cy="12" rx="22" ry="10" fill="#4a3d5c" />
        <circle cx="2" cy={open ? 0 : 8} r="10" fill="#4a3d5c" />
        <path d={open ? 'M-7 -5l1-10 7 6M3 -9l7-6 1 10' : 'M-7 4l1-10 7 6M3 0l7-6 1 10'} fill="#4a3d5c" />
        {open ? (
          <g fill="#f6e08a">
            <circle cx="-2" cy="0" r="1.8" />
            <circle cx="6" cy="0" r="1.8" />
          </g>
        ) : (
          <path d="M-4 9q2 2 4 0M4 9q2 2 4 0" stroke="#d9cdec" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        )}
        {!open &&
          !reduced &&
          [0, 1].map((i) => (
            <motion.text
              key={i}
              x="12"
              y="-6"
              fontSize={8 + i * 2}
              fontWeight="700"
              fill="#8c7aac"
              initial={{ opacity: 0, x: 12, y: -4 }}
              animate={{ opacity: [0, 1, 0], x: [12, 18, 24], y: [-4, -14, -24] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 1.3, ease: 'easeOut' }}
            >
              z
            </motion.text>
          ))}
      </g>

      {/* 錠を触ったときの吹き出し */}
      <AnimatePresence>
        {knock > 0 && (
          <motion.g key="bubble" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <rect x="58" y="196" width="72" height="20" rx="10" fill="#fff" stroke="#bfaedb" />
            <path d="M126 204l8 4-8 2Z" fill="#fff" />
            <text x="94" y="209.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#5b3fa0">
              {knock > 2 ? 'びくともしない…' : 'カチャカチャ'}
            </text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* 紙飛行機(リクエスト送信時に郵便受けへ) */}
      {plane > 0 && !reduced && (
        <motion.g
          key={plane}
          initial={{ x: 310, y: 120, opacity: 0, rotate: -10 }}
          animate={{ x: [310, 250, 200, 181], y: [120, 150, 196, 214], opacity: [0, 1, 1, 0], rotate: [-10, 10, 24, 30] }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          <path d="M-12 -4L10 0-12 5-8 0Z" fill="#fff" stroke="#5b3fa0" strokeWidth="1.2" strokeLinejoin="round" />
        </motion.g>
      )}
    </svg>
  )
}
