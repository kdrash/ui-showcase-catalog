import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const float = { animate: { y: [0, -6, 0] }, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const } }

const Inbox = () => (
  <svg viewBox="0 0 160 120" className="h-full w-full">
    <ellipse cx="80" cy="108" rx="52" ry="6" fill="#e0e7ff" />
    <motion.g {...float}>
      <path d="M30 60 L48 28 H112 L130 60 V94 a6 6 0 0 1-6 6 H36 a6 6 0 0 1-6-6Z" fill="#fff" stroke="#6366f1" strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 60 H58 a22 12 0 0 0 44 0 H130" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinejoin="round" />
      <path d="M62 44 h36 M68 52 h24" stroke="#c7d2fe" strokeWidth="3" strokeLinecap="round" />
    </motion.g>
    <motion.g animate={{ opacity: [0, 1, 0], y: [0, -8, -14] }} transition={{ duration: 2.4, repeat: Infinity }}>
      <text x="124" y="26" fontSize="12" fill="#a5b4fc" fontWeight="700">z</text>
      <text x="132" y="16" fontSize="9" fill="#a5b4fc" fontWeight="700">z</text>
    </motion.g>
  </svg>
)

const NotFound = () => (
  <svg viewBox="0 0 160 120" className="h-full w-full">
    <ellipse cx="80" cy="108" rx="56" ry="6" fill="#fce7f3" />
    <text x="80" y="78" textAnchor="middle" fontSize="54" fontWeight="900" fill="#fbcfe8" fontFamily="Space Grotesk, sans-serif">404</text>
    <motion.g animate={{ rotate: [-8, 8, -8] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} style={{ originX: 0.5, originY: 0 }}>
      <line x1="80" y1="8" x2="80" y2="40" stroke="#ec4899" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="80" cy="54" r="14" fill="#fff" stroke="#ec4899" strokeWidth="3" />
      <circle cx="75" cy="52" r="2" fill="#ec4899" />
      <circle cx="85" cy="52" r="2" fill="#ec4899" />
      <path d="M75 60 q5 -4 10 0" stroke="#ec4899" strokeWidth="2" fill="none" strokeLinecap="round" />
    </motion.g>
  </svg>
)

const ErrorIll = () => (
  <svg viewBox="0 0 160 120" className="h-full w-full">
    <ellipse cx="80" cy="108" rx="50" ry="6" fill="#fee2e2" />
    <motion.g animate={{ x: [0, -2, 2, -2, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.8 }}>
      <rect x="40" y="26" width="80" height="62" rx="8" fill="#fff" stroke="#ef4444" strokeWidth="3" />
      <path d="M40 40 H120" stroke="#ef4444" strokeWidth="3" />
      <circle cx="49" cy="33" r="2" fill="#fca5a5" />
      <circle cx="56" cy="33" r="2" fill="#fca5a5" />
      <path d="M68 56 l8 8 M76 56 l-8 8 M86 56 l8 8 M94 56 l-8 8" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
      <path d="M70 78 q10 -7 20 0" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" />
    </motion.g>
    <motion.path d="M126 30 l6 -6 M130 40 h8 M120 22 v-8" stroke="#f87171" strokeWidth="3" strokeLinecap="round" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity }} />
  </svg>
)

const Offline = () => (
  <svg viewBox="0 0 160 120" className="h-full w-full">
    <ellipse cx="80" cy="108" rx="48" ry="6" fill="#e0f2fe" />
    <motion.g {...float}>
      <path d="M50 84 a18 18 0 0 1 2-36 a26 26 0 0 1 50-4 a20 20 0 0 1 6 40Z" fill="#fff" stroke="#0ea5e9" strokeWidth="3" strokeLinejoin="round" />
      <path d="M66 70 a20 20 0 0 1 28 0 M73 77 a10 10 0 0 1 14 0" stroke="#7dd3fc" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="80" cy="82" r="2.5" fill="#0ea5e9" />
      <path d="M58 50 L104 92" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
    </motion.g>
  </svg>
)

const NoResults = () => (
  <svg viewBox="0 0 160 120" className="h-full w-full">
    <ellipse cx="80" cy="108" rx="50" ry="6" fill="#dcfce7" />
    <rect x="34" y="30" width="62" height="70" rx="6" fill="#fff" stroke="#bbf7d0" strokeWidth="3" />
    <path d="M44 46 h34 M44 58 h42 M44 70 h28" stroke="#dcfce7" strokeWidth="4" strokeLinecap="round" />
    <motion.g animate={{ x: [0, 14, 4, 0], y: [0, 6, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
      <circle cx="96" cy="58" r="17" fill="#f0fdf4" fillOpacity=".7" stroke="#16a34a" strokeWidth="4" />
      <path d="M108 70 L124 86" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" />
      <text x="96" y="64" textAnchor="middle" fontSize="16" fontWeight="800" fill="#16a34a">?</text>
    </motion.g>
  </svg>
)

type State = { key: string; tab: string; title: string; body: string; ill: ReactNode; cta: string; sub?: string; color: string }

const STATES: State[] = [
  { key: 'inbox', tab: '受信箱', title: '受信箱はすっきり空っぽ', body: '新しいメッセージが届くとここに表示されます。ひと休みしましょう。', ill: <Inbox />, cta: 'メッセージを作成', sub: '設定を開く', color: '#6366f1' },
  { key: '404', tab: '404', title: 'ページが見つかりません', body: 'URLが変更されたか、削除された可能性があります。', ill: <NotFound />, cta: 'ホームへ戻る', sub: 'サイト内を検索', color: '#ec4899' },
  { key: 'error', tab: 'エラー', title: '問題が発生しました', body: 'サーバーとの通信に失敗しました。時間をおいて再度お試しください。', ill: <ErrorIll />, cta: '再試行', sub: 'サポートに連絡', color: '#ef4444' },
  { key: 'offline', tab: 'オフライン', title: 'インターネットに接続されていません', body: '接続が回復すると自動的に同期を再開します。', ill: <Offline />, cta: '接続を確認', color: '#0ea5e9' },
  { key: 'search', tab: '検索0件', title: '「抹茶 ラテ 冷凍」の結果はありません', body: 'キーワードを減らすか、別の言葉で検索してみてください。', ill: <NoResults />, cta: '検索条件をクリア', sub: 'おすすめを見る', color: '#16a34a' },
]

export function EmptyStates() {
  const [i, setI] = useState(0)
  const s = STATES[i]
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white font-sans text-zinc-800">
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-100 px-3 pt-3">
        {STATES.map((st, k) => (
          <button
            key={st.key}
            onClick={() => setI(k)}
            className={`relative shrink-0 px-3 pb-2 text-xs transition ${k === i ? 'font-semibold text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            {st.tab}
            {k === i && <motion.div layoutId="es-tab" className="absolute inset-x-1 -bottom-px h-0.5 rounded" style={{ background: st.color }} />}
          </button>
        ))}
      </div>
      <div className="relative flex flex-1 items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex max-w-sm flex-col items-center text-center"
          >
            <div className="h-28 w-36">{s.ill}</div>
            <h3 className="mt-2 text-[15px] font-bold">{s.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{s.body}</p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95" style={{ background: s.color }}>
                {s.cta}
              </button>
              {s.sub && <button className="rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">{s.sub}</button>}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
