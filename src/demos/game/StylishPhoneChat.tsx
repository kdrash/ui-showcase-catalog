import { AnimatePresence, motion, useAnimate, useReducedMotion, type Transition } from 'motion/react'
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'

/**
 * スタイリッシュJRPG風の「ゲーム内スマホ」グループチャット。
 * - 会話は台本(ノードごとの手順の配列)をタイマーで進める小さなエンジン。選択肢でノードを分岐し、合流したり別の結末に着いたりする
 * - 吹き出しは px と % を calc で混ぜた clip-path のギザギザ多角形。尻尾の大きさは px 固定なので吹き出しの長さが変わっても崩れない。
 *   外側(縁の色)と 3px 内側(塗り)に同じ多角形を重ねて太い縁取りにし、drop-shadow で赤いずらし影を付ける
 * - 着信は Motion のバネ(オーバーシュート)で弾ませてから短く揺らす。長文は 1 文字ずつ CSS の animation-delay だけでタイプ表示(再レンダーなし)
 * - 選択肢は傾いたカードが時間差で差し込まれ、決定すると画面を横切るカットイン帯・斜めの斬撃・スマホの揺れ・背景の衝撃波が同時に走る
 * - 背景は素の WebGL + GLSL のハーフトーン。ドメインワープした fbm で網点の大きさを流し、新着のたびにスマホから衝撃波の輪が広がる。
 *   漂う破片は SVG + CSS keyframes、スマホの傾きはポインタ位置を CSS 変数に書くだけ(毎フレームの React 再レンダーはしない)
 * - 戻るボタンでトーク一覧へ。ページ遷移は斜めのクリップと赤い帯が一瞬走るスナップ動作。別スレッドの新着は上部バナーで割り込み、未読バッジが跳ねる
 * - Enter / Space で次へ、↑↓ + Enter で選択肢、Esc で一覧(デモ内にフォーカスがあるときのみ)。useReducedMotion 時は短いフェードだけにする
 */

const RED = '#e3141e'
const BLACK = '#0c0b0d'
const WHITE = '#f6f1e7'
const SKIN = '#f3e4d6'
const DARK = '#1b181e'

/** スマホの設計サイズ(px)。コンテナに合わせて scale で拡大縮小する */
const PW = 290
const PH = 510

function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261)

/* ───────────── 台本 ───────────── */

type Who = 'akane' | 'sota' | 'mio'
type OtherThread = 'family' | 'job'
type ThreadId = 'main' | OtherThread
type StickerId = 'crepe' | 'fire' | 'sweat' | 'heart' | 'thumb' | 'wave' | 'ball'
type Opt = { label: string; text: string; go: string }
type Step =
  | { t: 'sys'; text: string }
  | { t: 'msg'; who: Who; text: string }
  | { t: 'stk'; who: Who; s: StickerId }
  | { t: 'note'; thread: OtherThread; from: string; text: string }
  | { t: 'choice'; opts: Opt[] }
  | { t: 'go'; to: string }
  | { t: 'end'; title: string; sub: string }

const PEOPLE: Record<Who, { name: string; en: string }> = {
  akane: { name: 'アカネ', en: 'AKANE' },
  sota: { name: 'ソウタ', en: 'SOTA' },
  mio: { name: 'ミオ', en: 'MIO' },
}
const WHO_LIST: Who[] = ['akane', 'sota', 'mio']

const SCRIPT: Record<string, Step[]> = {
  start: [
    { t: 'sys', text: '11月6日(金)' },
    { t: 'msg', who: 'akane', text: 'ねえねえ!今日の放課後ヒマな人!' },
    { t: 'msg', who: 'sota', text: 'ヒマ。超ヒマ。' },
    { t: 'msg', who: 'mio', text: '図書委員の当番が16時半まで。そのあとなら空いてるよ' },
    { t: 'msg', who: 'akane', text: '駅前に新しいクレープ屋さんができたんだって!みんなで行こうよ!' },
    { t: 'stk', who: 'akane', s: 'crepe' },
    { t: 'note', thread: 'family', from: '母', text: '帰りに牛乳を買ってきてくれる?' },
    {
      t: 'choice',
      opts: [
        { label: '行く!甘いもの補給だ', text: '行く!ちょうど甘いものが欲しかった', go: 'crepe' },
        { label: '河川敷で特訓しない?', text: 'それより河川敷で特訓しない?', go: 'river' },
        { label: 'ごめん、用事がある', text: 'ごめん、今日はちょっと用事が…', go: 'busy' },
      ],
    },
  ],
  crepe: [
    { t: 'msg', who: 'akane', text: 'さすが!話がわかる!' },
    { t: 'stk', who: 'akane', s: 'fire' },
    { t: 'msg', who: 'sota', text: 'じゃあ俺はツナとチーズのやつにする' },
    { t: 'msg', who: 'mio', text: 'クレープにおかず系…?' },
    { t: 'go', to: 'meet' },
  ],
  river: [
    { t: 'msg', who: 'akane', text: '特訓!?なんの!?' },
    { t: 'msg', who: 'sota', text: 'いいね。バスケのボール持ってく' },
    { t: 'stk', who: 'sota', s: 'ball' },
    { t: 'msg', who: 'mio', text: '夕方から風が強くなるって予報だったよ' },
    {
      t: 'choice',
      opts: [
        { label: 'クレープのあとで河川敷!', text: 'じゃあクレープ食べてから河川敷!', go: 'both' },
        { label: '風なら逆に燃える', text: '向かい風こそ特訓日和でしょ', go: 'riverEnd' },
      ],
    },
  ],
  both: [
    { t: 'msg', who: 'akane', text: '欲張り!でも採用!' },
    { t: 'msg', who: 'mio', text: '食べてすぐ走るのはやめておこうね' },
    { t: 'go', to: 'meet' },
  ],
  riverEnd: [
    { t: 'msg', who: 'sota', text: 'その言葉を待ってた' },
    { t: 'msg', who: 'akane', text: 'よーし!全員ジャージで河川敷に集合!' },
    { t: 'msg', who: 'mio', text: '…私は土手で見学してるね。タオルは持っていくから' },
    { t: 'stk', who: 'sota', s: 'thumb' },
    { t: 'end', title: '河川敷集合', sub: 'ROUTE B ─ 向かい風の特訓' },
  ],
  busy: [
    { t: 'msg', who: 'sota', text: 'えー、なんの用事?' },
    { t: 'msg', who: 'mio', text: '無理しなくていいよ' },
    { t: 'msg', who: 'akane', text: '用事が終わったら合流ね!ずっと待ってるから!' },
    { t: 'stk', who: 'akane', s: 'heart' },
    {
      t: 'choice',
      opts: [
        { label: '…やっぱり行く', text: '…すぐ終わらせて行く!', go: 'late' },
        { label: 'また今度にする', text: 'ごめん、また今度誘って', go: 'solo' },
      ],
    },
  ],
  late: [
    { t: 'msg', who: 'akane', text: 'やったー!' },
    { t: 'msg', who: 'sota', text: '遅れた分はクレープ1個おごりな' },
    { t: 'go', to: 'meet' },
  ],
  solo: [
    { t: 'msg', who: 'akane', text: 'りょ!次は絶対だからね!' },
    { t: 'msg', who: 'mio', text: 'お店の写真、あとで送るね' },
    { t: 'stk', who: 'sota', s: 'wave' },
    { t: 'end', title: 'また明日', sub: 'ROUTE C ─ 次の約束' },
  ],
  meet: [
    { t: 'msg', who: 'mio', text: 'じゃあ16時45分に、駅前の時計台の下で' },
    { t: 'note', thread: 'job', from: '店長', text: '明日のシフト、30分早く入れる人いますか?' },
    { t: 'msg', who: 'akane', text: '遅れた人は全員にクレープおごりね!' },
    { t: 'msg', who: 'sota', text: 'それ一番危ないのアカネじゃん' },
    { t: 'stk', who: 'sota', s: 'sweat' },
    { t: 'end', title: '約束成立', sub: 'ROUTE A ─ 時計台の下で' },
  ],
}

const OTHER: Record<OtherThread, { name: string; en: string; base: { from: string; text: string; time: string }[] }> = {
  family: {
    name: '家族',
    en: 'FAMILY',
    base: [
      { from: '父', text: '今日の夕飯はカレーだそうです', time: '12:04' },
      { from: '母', text: '寄り道するなら連絡してね', time: '12:31' },
    ],
  },
  job: {
    name: 'バイト連絡網',
    en: 'PART-TIME',
    base: [
      { from: '店長', text: '来週のシフト表を貼りました。確認お願いします', time: '昨日' },
      { from: '先輩', text: '了解です!', time: '昨日' },
    ],
  },
}
const INITIAL_UNREAD: Record<ThreadId, number> = { main: 0, family: 0, job: 2 }
const START_MIN = 15 * 60 + 42
const fmtTime = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

type Entry =
  | { id: number; k: 'sys'; text: string }
  | { id: number; k: 'msg'; who: Who | 'me'; text: string; first: boolean }
  | { id: number; k: 'stk'; who: Who; s: StickerId; first: boolean }
  | { id: number; k: 'end'; title: string; sub: string }
type NewEntry = Entry extends infer E ? (E extends Entry ? Omit<E, 'id'> : never) : never

type ChoiceState = { key: number; opts: Opt[]; picked: number | null; at: number }
type BannerData = { id: number; thread: OtherThread; from: string; text: string }
type CutInData = { id: number; kind: 'reply' | 'end'; text: string; sub: string }
type Note = { thread: OtherThread; from: string; text: string; time: string }
type View = 'list' | ThreadId
type Mode = 'auto' | 'manual'

/* ───────────── CSS ───────────── */

const CSS = `
@keyframes spc-ch { from { opacity: 0 } to { opacity: 1 } }
.spc-ch { animation: spc-ch 70ms linear both }
@keyframes spc-dot { 0%, 55%, 100% { transform: translateY(0) scale(1) } 25% { transform: translateY(-5px) scale(1.25) } }
@keyframes spc-drift { 0%, 100% { transform: translate(0, 0) rotate(0deg) } 50% { transform: translate(var(--dx), var(--dy)) rotate(var(--dr)) } }
@keyframes spc-float { 0%, 100% { transform: translateY(0) rotate(0deg) } 50% { transform: translateY(-6px) rotate(.5deg) } }
@keyframes spc-marq { to { transform: translateX(-50%) } }
@keyframes spc-marq-r { from { transform: translateX(-50%) } to { transform: translateX(0) } }
@keyframes spc-spin { to { transform: rotate(360deg) } }
@keyframes spc-blink { 50% { opacity: .25 } }
@keyframes spc-jit { 0%, 90%, 100% { transform: none } 92% { transform: translate(-.05em, .04em) rotate(-5deg) scale(1.08) } 95% { transform: translate(.03em, -.02em) rotate(3deg) } }
@keyframes spc-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(4px) } }
@keyframes spc-ray { 0% { transform: rotate(var(--a)) translateX(30%) scaleX(.2); opacity: 1 } 100% { transform: rotate(var(--a)) translateX(78%) scaleX(1); opacity: 0 } }
.spc-tilt { transform: rotateY(calc(-15deg + var(--px, 0) * 9deg)) rotateX(calc(5deg - var(--py, 0) * 7deg)) rotateZ(-3deg); transition: transform .5s cubic-bezier(.2,.8,.2,1) }
.spc-still .spc-tilt { transform: rotateY(-10deg) rotateX(3deg) rotateZ(-3deg) }
.spc-log { scrollbar-width: none }
.spc-log::-webkit-scrollbar { display: none }
`

/* ───────────── 切り抜き文字 ───────────── */

const RANSOM_FONTS: CSSProperties[] = [
  { fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 },
  { fontFamily: "'Playfair Display', 'Yu Mincho', 'Hiragino Mincho ProN', serif", fontWeight: 900, fontStyle: 'italic' },
  { fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif", fontWeight: 700 },
  { fontFamily: "'Orbitron', 'Noto Sans JP', sans-serif", fontWeight: 900 },
  { fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500 },
]
const SCHEMES: CSSProperties[] = [
  { background: WHITE, color: BLACK },
  { background: BLACK, color: WHITE },
  { background: RED, color: WHITE },
  { background: WHITE, color: RED },
  { background: BLACK, color: RED },
]

/** 文字ごとに背景色・角度・書体を変える切り抜き文字。ときどき 1 文字ずつピクッと跳ねる */
function Ransom({ text, size, shadow = BLACK, delay = 0, reduced, jitter = true, wrap = true }: { text: string; size: string; shadow?: string; delay?: number; reduced: boolean; jitter?: boolean; wrap?: boolean }) {
  const letters = useMemo(() => {
    const r = mulberry32(hash(text))
    let prev = -1
    return [...text].map((ch) => {
      let s = Math.floor(r() * SCHEMES.length)
      if (s === prev) s = (s + 1 + Math.floor(r() * (SCHEMES.length - 1))) % SCHEMES.length
      prev = s
      const j = () => +(r() * 9).toFixed(1)
      return {
        ch,
        style: { ...SCHEMES[s], ...RANSOM_FONTS[Math.floor(r() * RANSOM_FONTS.length)] },
        rot: (r() - 0.5) * 22,
        scale: 0.84 + r() * 0.34,
        dy: ((r() - 0.5) * 0.2).toFixed(2),
        clip: `polygon(${j()}% ${j()}%, 100% ${j()}%, ${100 - j()}% 100%, ${j()}% ${100 - j()}%)`,
        jd: 4 + r() * 5,
        jo: r() * 6,
      }
    })
  }, [text])

  return (
    <span aria-hidden className={`inline-flex items-center ${wrap ? 'flex-wrap' : 'flex-nowrap whitespace-nowrap'}`} style={{ fontSize: size, filter: `drop-shadow(0.07em 0.07em 0 ${shadow})` }}>
      {letters.map((l, i) =>
        l.ch === ' ' ? (
          <span key={i} className="inline-block w-[0.3em]" />
        ) : (
          <span key={i} className="inline-block" style={jitter && !reduced ? { animation: `spc-jit ${l.jd.toFixed(2)}s ${l.jo.toFixed(2)}s infinite` } : undefined}>
            <motion.span
              className="inline-block leading-none"
              style={{ ...l.style, fontSize: `${l.scale}em`, padding: '0.1em 0.15em 0.13em', marginRight: '-0.02em', clipPath: l.clip }}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: '-0.9em', rotate: l.rot - 50, scale: 1.8 }}
              animate={{ opacity: 1, y: `${l.dy}em`, rotate: l.rot, scale: 1 }}
              transition={reduced ? { duration: 0.2, delay } : { type: 'spring', stiffness: 560, damping: 20, delay: delay + i * 0.045 }}
            >
              {l.ch}
            </motion.span>
          </span>
        ),
      )}
    </span>
  )
}

/* ───────────── 顔アイコン(オリジナル SVG) ───────────── */

function FaceArt({ who }: { who: Who }) {
  if (who === 'akane')
    return (
      <>
        <rect x="-4" y="-4" width="56" height="56" fill={WHITE} />
        <g fill={RED} opacity=".55">
          {Array.from({ length: 36 }, (_, i) => (
            <circle key={i} cx={(i % 6) * 9 + 2 + (Math.floor(i / 6) % 2) * 4.5} cy={Math.floor(i / 6) * 8 + 2} r={1 + (i % 6) * 0.35} />
          ))}
        </g>
        <path d="M36 12C47 9 50 22 45 34L43 26 40 31 38 20Z" fill={BLACK} />
        <path d="M5 52C7 41 14 37 24 37s17 4 19 15Z" fill={BLACK} />
        <path d="M20 30h8v9h-8Z" fill={SKIN} />
        <ellipse cx="24" cy="22" rx="10.5" ry="12" fill={SKIN} />
        <path d="M12 23C11 11 17 6 25 6c8 0 14 6 12 17l-3-6-3 5-2-8-4 7-3-8-3 8-3-5Z" fill={BLACK} />
        <path d="M30 9l6-3 1 5Z" fill={RED} stroke={BLACK} strokeWidth=".8" />
        <ellipse cx="19.6" cy="23.5" rx="1.9" ry="2.7" fill={BLACK} />
        <ellipse cx="28.6" cy="23.5" rx="1.9" ry="2.7" fill={BLACK} />
        <circle cx="20.2" cy="22.5" r=".7" fill={WHITE} />
        <circle cx="29.2" cy="22.5" r=".7" fill={WHITE} />
        <path d="M20 29q4 5 8 0Z" fill={RED} stroke={BLACK} strokeWidth=".9" />
        <path d="M16.5 19.5l5-1M31.5 19.5l-5-1" stroke={BLACK} strokeWidth="1.2" />
      </>
    )
  if (who === 'sota')
    return (
      <>
        <rect x="-4" y="-4" width="56" height="56" fill={RED} />
        <path d="M-4 30 30-4h6L-4 36ZM8 52 52 8v6L14 52Z" fill="#7d0a10" />
        <path d="M5 52C7 41 14 37 24 37s17 4 19 15Z" fill={BLACK} />
        <path d="M20 30h8v9h-8Z" fill={SKIN} />
        <ellipse cx="24" cy="22.5" rx="10" ry="11.5" fill={SKIN} />
        <path d="M11 25 9 14l5 1-1-8 6 3 3-7 4 6 5-5 1 6 6-2-2 7 4 2-4 5-1-6-5 2-3-5-4 5-4-5-3 6Z" fill={BLACK} />
        <path d="M17 24h5M26 24h5" stroke={BLACK} strokeWidth="1.8" />
        <path d="M17 22.5q2.5-1.5 5 0M26 22.5q2.5-1.5 5 0" stroke={BLACK} strokeWidth=".9" fill="none" />
        <path d="M22 30h4.5" stroke={BLACK} strokeWidth="1.2" />
        <path d="M12 39c3-6 21-6 24 0" stroke={WHITE} strokeWidth="2.6" fill="none" />
        <rect x="9" y="36" width="5" height="7" fill={WHITE} stroke={BLACK} strokeWidth=".8" />
        <rect x="34" y="36" width="5" height="7" fill={WHITE} stroke={BLACK} strokeWidth=".8" />
      </>
    )
  return (
    <>
      <rect x="-4" y="-4" width="56" height="56" fill="#2a2632" />
      <path d="M-4 40 52 18v4L-4 44Z" fill={RED} opacity=".8" />
      <path d="M10 33C8 15 15 7 24 7s16 8 14 26h-4V19c-6-1-13-3-18-7v21Z" fill={BLACK} stroke={WHITE} strokeWidth=".9" />
      <path d="M5 52C7 41 14 37 24 37s17 4 19 15Z" fill={BLACK} />
      <path d="M20 30h8v9h-8Z" fill={SKIN} />
      <ellipse cx="24" cy="22.5" rx="9.5" ry="11.5" fill={SKIN} />
      <path d="M14.5 21C17 14 25 12 33.5 16l1 5c-6-4-14-5-20 0Z" fill={BLACK} />
      <rect x="15.5" y="21" width="7" height="5" fill="none" stroke={BLACK} strokeWidth="1.3" />
      <rect x="25.5" y="21" width="7" height="5" fill="none" stroke={BLACK} strokeWidth="1.3" />
      <path d="M22.5 23h3" stroke={BLACK} strokeWidth="1.1" />
      <circle cx="19" cy="23.6" r="1.1" fill={BLACK} />
      <circle cx="29" cy="23.6" r="1.1" fill={BLACK} />
      <path d="M22.5 30.5q1.5 .8 3 0" stroke={BLACK} strokeWidth="1" fill="none" />
      <path d="M16.6 22.2l3 3" stroke={WHITE} strokeWidth=".8" />
    </>
  )
}

/** 白い縁取り + 赤いずらし影の丸い切り抜き顔 */
function Face({ who, className = 'size-full' }: { who: Who; className?: string }) {
  const id = `spc-face-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg viewBox="-2 -2 54 54" className={className} aria-hidden>
      <defs>
        <clipPath id={id}>
          <circle cx="24" cy="24" r="20" />
        </clipPath>
      </defs>
      <circle cx="27.5" cy="27.5" r="23" fill={RED} />
      <circle cx="24" cy="24" r="23" fill={WHITE} />
      <circle cx="24" cy="24" r="21" fill={BLACK} />
      <g clipPath={`url(#${id})`}>
        <FaceArt who={who} />
      </g>
    </svg>
  )
}

/** 家族・バイト先などは 1 文字の切り抜きアイコン */
function LetterFace({ ch, className = 'size-full' }: { ch: string; className?: string }) {
  return (
    <svg viewBox="-2 -2 54 54" className={className} aria-hidden>
      <circle cx="27.5" cy="27.5" r="23" fill={RED} />
      <circle cx="24" cy="24" r="23" fill={WHITE} />
      <circle cx="24" cy="24" r="20" fill={BLACK} />
      <path d="M8 34 40 12l2 4-32 22Z" fill={RED} opacity=".7" />
      <text x="24" y="31.5" textAnchor="middle" fontSize="21" fontWeight="900" fill={WHITE} fontFamily="'Noto Sans JP', sans-serif">
        {ch}
      </text>
    </svg>
  )
}

function ThreadIcon({ thread, className = 'size-full' }: { thread: ThreadId; className?: string }) {
  if (thread === 'main')
    return (
      <span className={`relative block ${className}`} aria-hidden>
        <Face who="sota" className="absolute top-0 right-0 size-[62%]" />
        <Face who="mio" className="absolute bottom-0 right-[6%] size-[62%]" />
        <Face who="akane" className="absolute top-[14%] left-0 size-[66%]" />
      </span>
    )
  return (
    <svg viewBox="-2 -2 54 54" className={className} aria-hidden>
      <path d="M2 10 12 0h38v40L40 50H2Z" fill={RED} transform="translate(3 3)" />
      <path d="M2 10 12 0h38v40L40 50H2Z" fill={WHITE} />
      <path d="M5 11.5 13.5 3H47v35.5L38.5 47H5Z" fill={BLACK} />
      {thread === 'family' ? (
        <path d="M12 26 26 13l14 13h-4v12h-7v-8h-6v8h-7V26Z" fill={WHITE} />
      ) : (
        <>
          <path d="M13 18h20v12a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8Z" fill={WHITE} />
          <path d="M33 21h3a4 4 0 0 1 0 8h-3" stroke={WHITE} strokeWidth="3" fill="none" />
          <path d="M18 9q3 3 0 6M24 8q3 3 0 6" stroke={RED} strokeWidth="2.4" fill="none" />
        </>
      )}
    </svg>
  )
}

/* ───────────── スタンプ(オリジナル SVG) ───────────── */

const STK_STROKE = { stroke: BLACK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
function StickerArt({ s }: { s: StickerId }) {
  switch (s) {
    case 'crepe':
      return (
        <>
          <path d="M18 30h28L32 61Z" fill={WHITE} {...STK_STROKE} />
          <path d="M19 32l4 5 4-5 4 5 4-5 4 5 4-5 2-2H18Z" fill={RED} stroke={BLACK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M13 31c-5-8 3-15 8-13 0-9 12-11 13-4 4-6 15-3 13 5 8 1 8 12 0 12Z" fill={WHITE} {...STK_STROKE} />
          <circle cx="37" cy="20" r="5" fill={RED} stroke={BLACK} strokeWidth="2.4" />
          <path d="M22 12 26 2l3 1-3 10Z" fill={BLACK} />
          <path d="M20 24q4-3 8 0" stroke={BLACK} strokeWidth="2" fill="none" />
        </>
      )
    case 'fire':
      return (
        <>
          <path d="M32 3c4 11 18 17 18 35a18 18 0 0 1-36 0c0-10 6-14 8-22 4 6 6 8 8 10 0-8 0-14 2-23Z" fill={RED} {...STK_STROKE} />
          <path d="M32 31c4 6 10 8 8 16a8 8 0 0 1-16 0c0-6 6-8 8-16Z" fill={WHITE} stroke={BLACK} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M21 33l7 3M43 33l-7 3" stroke={BLACK} strokeWidth="3" strokeLinecap="round" />
          <path d="M28 46q4 3 8 0" stroke={BLACK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      )
    case 'sweat':
      return (
        <>
          <circle cx="29" cy="35" r="21" fill={WHITE} {...STK_STROKE} />
          <path d="M18 34l4-4 4 4M32 34l4-4 4 4" stroke={BLACK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 45q2-3 4 0t4 0 4 0 4 0" stroke={BLACK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M51 5c3 8 8 12 4 18a6 6 0 0 1-9-1c-2-5 3-10 5-17Z" fill={WHITE} {...STK_STROKE} />
          <path d="M49 16q-1 3 1 5" stroke={RED} strokeWidth="2" fill="none" />
          <path d="M14 40h5M39 40h5" stroke={RED} strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case 'heart':
      return (
        <>
          <path d="M32 57 8 33C0 23 6 8 18 8c6 0 10 4 14 10 4-6 8-10 14-10 12 0 18 15 10 25Z" fill={RED} {...STK_STROKE} />
          <path d="M14 18q2-5 8-5" stroke={WHITE} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M42 22l4 4M46 18l2 2" stroke={WHITE} strokeWidth="2.6" strokeLinecap="round" />
        </>
      )
    case 'thumb':
      return (
        <>
          <path d="M7 28h12v27H7Z" fill={RED} {...STK_STROKE} />
          <path d="M19 29l8-3 2-14c1-7 10-6 9 1l-1 11h13c6 0 6 7 1 8 5 1 5 8-1 8 4 2 3 8-2 8 3 2 1 7-3 7H19Z" fill={WHITE} {...STK_STROKE} />
          <path d="M38 32h11M38 40h11M38 47h8" stroke={BLACK} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M8 13l5 6M4 22h7M15 8l1 7" stroke={RED} strokeWidth="2.6" strokeLinecap="round" />
        </>
      )
    case 'wave':
      return (
        <>
          <path d="M18 40c-2-10 0-14 4-16V12c0-5 6-5 6 0v10l1-14c0-5 6-5 6 0v14l2-12c0-5 6-5 6 0l-1 16 4-6c3-4 8-1 6 4l-8 18c-4 10-14 14-20 10-4-2-5-6-6-12Z" fill={WHITE} {...STK_STROKE} />
          <path d="M6 16l7 4M4 28h8M54 8l-4 7M58 18l-6 3" stroke={RED} strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case 'ball':
      return (
        <>
          <path d="M3 22h8M2 32h7M4 42h8" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
          <circle cx="36" cy="32" r="22" fill={RED} {...STK_STROKE} />
          <path d="M14 32h44M36 10v44M21 16c9 8 9 24 0 32M51 16c-9 8-9 24 0 32" stroke={BLACK} strokeWidth="2.4" fill="none" />
          <path d="M27 17q4-3 9-3" stroke={WHITE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      )
  }
}
const STICKER_LABEL: Record<StickerId, string> = {
  crepe: 'クレープのスタンプ',
  fire: '燃える炎のスタンプ',
  sweat: '冷や汗のスタンプ',
  heart: 'ハートのスタンプ',
  thumb: 'いいねのスタンプ',
  wave: '手を振るスタンプ',
  ball: 'ボールのスタンプ',
}

/** ギザギザの星形(バースト) */
function starPoints(n: number, r1: number, r2: number, seed: number) {
  const r = mulberry32(seed)
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2 + (r() - 0.5) * 0.12
    const rr = i % 2 ? r2 * (0.85 + r() * 0.3) : r1 * (0.9 + r() * 0.2)
    return `${(50 + Math.cos(a) * rr).toFixed(1)},${(50 + Math.sin(a) * rr).toFixed(1)}`
  }).join(' ')
}
const BURST = starPoints(11, 50, 30, 3)
const BURST2 = starPoints(9, 46, 24, 11)
const IMPACT_RAYS = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * 360 + ((i * 53) % 17), w: 1 + (i % 3) }))

/* ───────────── 吹き出し ───────────── */

const FRIEND_SHAPES = [
  'polygon(13px 2px, 46% 0, calc(100% - 8px) 3px, 100% 42%, calc(100% - 3px) 100%, 52% calc(100% - 3px), 16px 100%, 12px 24px, 1px 28px, 8px 19px, 0 9px, 12px 12px)',
  'polygon(14px 0, 60% 3px, 100% 0, calc(100% - 4px) 55%, 100% calc(100% - 2px), 38% 100%, 13px calc(100% - 3px), 12px 25px, 2px 27px, 7px 20px, 1px 10px, 12px 13px)',
]
const ME_SHAPES = [
  'polygon(calc(100% - 13px) 2px, 54% 0, 8px 3px, 0 42%, 3px 100%, 48% calc(100% - 3px), calc(100% - 16px) 100%, calc(100% - 12px) 24px, calc(100% - 1px) 28px, calc(100% - 8px) 19px, 100% 9px, calc(100% - 12px) 12px)',
  'polygon(calc(100% - 14px) 0, 40% 3px, 0 0, 4px 55%, 0 calc(100% - 2px), 62% 100%, calc(100% - 13px) calc(100% - 3px), calc(100% - 12px) 25px, calc(100% - 2px) 27px, calc(100% - 7px) 20px, calc(100% - 1px) 10px, calc(100% - 12px) 13px)',
]

function BubbleShell({ me, shapeIdx, children }: { me: boolean; shapeIdx: number; children: ReactNode }) {
  const shape = (me ? ME_SHAPES : FRIEND_SHAPES)[shapeIdx % 2]
  return (
    <div style={{ filter: `drop-shadow(${me ? -4 : 4}px 4px 0 ${RED})` }}>
      <div className="relative" style={{ clipPath: shape, background: me ? WHITE : BLACK }}>
        <div className="absolute inset-[3px]" style={{ clipPath: shape, background: me ? BLACK : WHITE }} />
        <div className="relative" style={{ padding: me ? '7px 21px 8px 12px' : '7px 12px 8px 21px', color: me ? WHITE : BLACK }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/** 長文は 1 文字ずつ表示(各文字に animation-delay を付けるだけで、React の再レンダーはしない) */
const TYPE_MS = 32
const isLong = (text: string) => text.length > 14
function TypeText({ text, animate }: { text: string; animate: boolean }) {
  if (!animate || !isLong(text)) return <>{text}</>
  return (
    <>
      {[...text].map((c, i) => (
        <span key={i} className="spc-ch" style={{ animationDelay: `${120 + i * TYPE_MS}ms` }}>
          {c}
        </span>
      ))}
    </>
  )
}

function NameTag({ who }: { who: Who }) {
  return (
    <span className="mb-1 ml-3 inline-flex -rotate-3 items-center gap-1 leading-none">
      <span className="-skew-x-12 bg-[#f6f1e7] px-1.5 py-[2px] text-[11px] font-black text-[#0c0b0d] shadow-[2px_2px_0_#e3141e]">{PEOPLE[who].name}</span>
      <span className="font-['Orbitron'] text-[7px] font-bold tracking-[.2em] text-[#f6f1e7]/60">{PEOPLE[who].en}</span>
    </span>
  )
}

/** 「!」入りの着信の後ろで一瞬だけ広がる漫画の集中線 */
function ImpactLines({ me }: { me: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className={`pointer-events-none absolute top-1/2 size-[150px] -translate-y-1/2 ${me ? 'right-[10%]' : 'left-[20%]'}`}
      initial={{ scale: 0.4, opacity: 1, rotate: -10 }}
      animate={{ scale: 1.25, opacity: 0, rotate: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
      aria-hidden
    >
      {IMPACT_RAYS.map((r, i) => (
        <path key={i} d={`M50 50 L${50 + 48} ${50 - r.w} L${50 + 48} ${50 + r.w} Z`} fill={i % 3 ? WHITE : RED} transform={`rotate(${r.a} 50 50)`} opacity={0.9} />
      ))}
      <circle cx="50" cy="50" r="24" fill={DARK} />
    </motion.svg>
  )
}

const popIn = (me: boolean, rot: number, reduced: boolean, anim: boolean) =>
  !anim
    ? { initial: false as const, animate: { rotate: rot } }
    : reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1, rotate: rot }, transition: { duration: 0.15 } }
      : {
          initial: { opacity: 0, scale: 0.25, rotate: rot + (me ? 24 : -24), x: me ? 60 : -40, skewX: me ? -20 : 12 },
          animate: { opacity: 1, scale: 1, rotate: rot, x: 0, skewX: 0 },
          transition: { type: 'spring' as const, stiffness: 720, damping: 15, mass: 0.7, opacity: { duration: 0.06 } },
        }

const shake = (anim: boolean, reduced: boolean, strong: boolean) =>
  anim && !reduced
    ? {
        animate: { x: strong ? [0, -7, 6, -4, 3, 0] : [0, -3, 3, -1, 0], y: strong ? [0, 3, -3, 1, 0, 0] : [0, 1, -1, 0, 0] },
        transition: { duration: strong ? 0.32 : 0.24, delay: 0.14, ease: 'linear' as const },
      }
    : {}

const EntryRow = memo(function EntryRow({ e, anim, reduced }: { e: Entry; anim: boolean; reduced: boolean }) {
  if (e.k === 'sys')
    return (
      <motion.li className="flex justify-center py-1" initial={anim ? { opacity: 0, scaleX: 0 } : false} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 0.25 }}>
        <span className="-skew-x-12 bg-[#f6f1e7]/10 px-3 py-[2px] font-mono text-[10px] font-bold tracking-wider text-[#f6f1e7]/70">{e.text}</span>
      </motion.li>
    )
  if (e.k === 'end') return <EndCard title={e.title} sub={e.sub} anim={anim} reduced={reduced} />

  const me = e.who === 'me'
  const rot = (((e.id * 37) % 7) - 3) * (me ? 0.5 : 0.7)
  const strong = e.k === 'msg' && /[!?]/.test(e.text)
  const pop = popIn(me, rot, reduced, anim)
  const srName = me ? 'あなた' : PEOPLE[e.who as Who].name
  const srText = e.k === 'msg' ? e.text : STICKER_LABEL[e.s]

  return (
    <li className={`relative flex items-start gap-1.5 ${me ? 'justify-end pr-1.5 pl-8' : 'pr-6 pl-1'} ${e.first ? 'pt-1.5' : ''}`}>
      <span className="sr-only">
        {srName}: {srText}
      </span>
      {!me && (
        <div className="w-[34px] shrink-0" aria-hidden>
          {e.first && (
            <motion.div
              initial={anim ? (reduced ? { opacity: 0 } : { scale: 0, rotate: -120 }) : false}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 500, damping: 14 }}
            >
              <Face who={e.who as Who} className="size-[34px]" />
            </motion.div>
          )}
        </div>
      )}
      <div className={`flex min-w-0 flex-col ${me ? 'items-end' : 'items-start'}`} aria-hidden>
        {!me && e.first && (
          <motion.div
            initial={anim ? (reduced ? { opacity: 0 } : { opacity: 0, x: -24, skewX: -30 }) : false}
            animate={{ opacity: 1, x: 0, skewX: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 26, delay: anim && !reduced ? 0.05 : 0 }}
          >
            <NameTag who={e.who as Who} />
          </motion.div>
        )}
        <div className="relative flex items-end gap-1">
          {me && <span className="mb-0.5 shrink-0 font-mono text-[8px] leading-tight font-bold text-[#f6f1e7]/55">既読<br />3</span>}
          {anim && !reduced && strong && <ImpactLines me={me} />}
          <motion.div className="relative" style={{ originX: me ? 1 : 0, originY: 0.5 }} {...pop}>
            <motion.div {...shake(anim, reduced, strong)}>
              {e.k === 'msg' ? (
                <BubbleShell me={me} shapeIdx={e.id}>
                  <p className="max-w-[178px] text-[14.5px] leading-[1.38] font-bold tracking-[.01em] break-words">
                    <TypeText text={e.text} animate={anim && !reduced} />
                  </p>
                </BubbleShell>
              ) : (
                <Sticker s={e.s} anim={anim} reduced={reduced} />
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </li>
  )
})

function Sticker({ s, anim, reduced }: { s: StickerId; anim: boolean; reduced: boolean }) {
  const fx = `spc-stk-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const big = anim && !reduced
  return (
    <div className="relative mt-2 mb-1 ml-2 size-[92px]">
      {/* 赤いギザギザのバーストがはじけ、白い光線が外へ散る */}
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute inset-[-14%] size-[128%]"
        initial={big ? { scale: 0, rotate: -60 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 13 }}
        aria-hidden
      >
        <g style={reduced ? undefined : { animation: 'spc-spin 14s linear infinite', transformOrigin: '50px 50px' }}>
          <polygon points={BURST} fill={RED} stroke={BLACK} strokeWidth="2.5" />
          <polygon points={BURST2} fill={BLACK} opacity=".55" />
        </g>
      </motion.svg>
      {big && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 h-[4px] w-[64px] origin-left"
              style={{ background: i % 2 ? WHITE : RED, ['--a' as string]: `${i * 36 + 8}deg`, animation: `spc-ray .48s ${0.04 + (i % 3) * 0.03}s cubic-bezier(.2,.8,.3,1) both`, clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 60%)' }}
            />
          ))}
        </div>
      )}
      <motion.svg
        viewBox="0 0 64 64"
        className="absolute inset-[6%] size-[88%] overflow-visible"
        initial={big ? { scale: 0, rotate: -35, y: -24 } : false}
        animate={{ scale: 1, rotate: -6, y: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 11, delay: big ? 0.06 : 0 }}
        aria-hidden
      >
        <defs>
          <filter id={fx} x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="fat" />
            <feFlood floodColor={WHITE} />
            <feComposite in2="fat" operator="in" result="rim" />
            <feMerge>
              <feMergeNode in="rim" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#${fx})`}>
          <StickerArt s={s} />
        </g>
      </motion.svg>
    </div>
  )
}

function EndCard({ title, sub, anim, reduced }: { title: string; sub: string; anim: boolean; reduced: boolean }) {
  const big = anim && !reduced
  return (
    <li className="relative flex flex-col items-center pt-12 pb-10">
      <span className="sr-only">
        結末: {title}。{sub}
      </span>
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute top-1/2 left-1/2 size-[170px] -translate-x-1/2 -translate-y-1/2"
        initial={big ? { scale: 0, rotate: 90 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14, delay: big ? 0.25 : 0 }}
        aria-hidden
      >
        <g style={reduced ? undefined : { animation: 'spc-spin 20s linear infinite', transformOrigin: '50px 50px' }}>
          <polygon points={BURST} fill={WHITE} />
          <polygon points={BURST2} fill={RED} />
        </g>
      </motion.svg>
      <motion.div
        className="relative -rotate-6"
        initial={big ? { scale: 3.2, opacity: 0, rotate: -30 } : false}
        animate={{ scale: 1, opacity: 1, rotate: -6 }}
        transition={{ type: 'spring', stiffness: 520, damping: 17 }}
        aria-hidden
      >
        <Ransom text={title} size="34px" reduced={reduced} delay={big ? 0.1 : 0} />
      </motion.div>
      <motion.span
        className="relative mt-2 rotate-2 bg-[#0c0b0d] px-2 py-[2px] font-['Space_Grotesk'] text-[10px] font-bold tracking-wider text-[#f6f1e7] ring-2 ring-[#f6f1e7]"
        initial={big ? { opacity: 0, x: 40 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: big ? 0.45 : 0, type: 'spring', stiffness: 500, damping: 26 }}
        aria-hidden
      >
        {sub}
      </motion.span>
    </li>
  )
}

function TypingRow({ who, showFace, reduced }: { who: Who; showFace: boolean; reduced: boolean }) {
  return (
    <motion.li
      className={`flex items-start gap-1.5 pl-1 ${showFace ? 'pt-1.5' : ''}`}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, x: -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.08 } }}
      transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 700, damping: 18 }}
      style={{ originX: 0 }}
      aria-hidden
    >
      <div className="w-[34px] shrink-0">{showFace && <Face who={who} className="size-[34px]" />}</div>
      <div className="flex flex-col items-start">
        {showFace && <NameTag who={who} />}
        <div className="-rotate-2">
          <BubbleShell me={false} shapeIdx={1}>
            <span className="flex h-[20px] items-center gap-[5px] px-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block size-[7px] rotate-45"
                  style={{ background: i === 1 ? RED : BLACK, animation: reduced ? undefined : `spc-dot .7s ${i * 0.12}s ease-in-out infinite` }}
                />
              ))}
            </span>
          </BubbleShell>
        </div>
      </div>
    </motion.li>
  )
}

/* ───────────── 選択肢 ───────────── */

const CARD_ROT = [-3, 2, -1.5]
const CARD_SHAPES = [
  'polygon(0 10%, 3% 0, 100% 6%, 98% 100%, 2% 90%)',
  'polygon(1% 0, 97% 8%, 100% 92%, 0 100%, 2% 50%)',
  'polygon(0 4%, 100% 0, 99% 88%, 96% 100%, 1% 94%)',
]

function ChoicePanel({
  choice,
  cursor,
  setCursor,
  onPick,
  cardRefs,
  reduced,
}: {
  choice: ChoiceState
  cursor: number
  setCursor: (i: number) => void
  onPick: (i: number) => void
  cardRefs: RefObject<(HTMLButtonElement | null)[]>
  reduced: boolean
}) {
  const picked = choice.picked
  return (
    <motion.div
      className="relative z-10 px-2.5 pt-6 pb-2.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      role="group"
      aria-label="返信を選ぶ"
    >
      <div aria-hidden className="absolute inset-0 bg-[#0c0b0d]/85" style={{ clipPath: 'polygon(0 14px, 100% 0, 100% 100%, 0 100%)' }} />
      <motion.div
        aria-hidden
        className="absolute top-[3px] left-2 flex -rotate-3 items-center gap-1.5"
        initial={reduced ? { opacity: 0 } : { x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 600, damping: 28 }}
      >
        <span className="-skew-x-12 bg-[#e3141e] px-2 py-[1px] text-[11px] font-black text-[#f6f1e7] shadow-[2px_2px_0_#f6f1e7]">返信を選ぶ</span>
        <span className="font-mono text-[8px] font-bold text-[#f6f1e7]/60">↑↓ / Enter</span>
      </motion.div>
      <div className="relative flex flex-col gap-[7px]">
        {choice.opts.map((o, i) => {
          const on = cursor === i
          const state = picked === null ? 'idle' : picked === i ? 'picked' : 'gone'
          return (
            <motion.div
              key={i}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 280, skewX: -24, rotate: 8 }}
              animate={{ opacity: 1, x: 0, skewX: 0, rotate: 0 }}
              transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 560, damping: 22, delay: 0.08 + i * 0.07 }}
            >
              <motion.button
                ref={(el) => {
                  cardRefs.current[i] = el
                }}
                type="button"
                disabled={picked !== null}
                onMouseEnter={() => picked === null && setCursor(i)}
                onFocus={() => setCursor(i)}
                onClick={() => onPick(i)}
                aria-label={`${String.fromCharCode(65 + i)}: ${o.label}`}
                className="group relative flex w-full items-center gap-2 py-[7px] pr-3 pl-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#f6f1e7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#e3141e]"
                style={{ rotate: `${CARD_ROT[i % 3]}deg`, transformOrigin: '50% 50%' }}
                animate={
                  state === 'idle'
                    ? { x: on ? -8 : 0, scale: on ? 1.04 : 1, opacity: 1, y: 0 }
                    : state === 'picked'
                      ? reduced
                        ? { opacity: 0 }
                        : { x: [-8, -14, 30], y: [0, -6, -70], scale: [1.04, 1.16, 0.7], opacity: [1, 1, 0] }
                      : reduced
                        ? { opacity: 0 }
                        : { x: 260, opacity: 0, skewX: -20 }
                }
                transition={
                  state === 'idle'
                    ? reduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 700, damping: 22 }
                    : state === 'picked'
                      ? { duration: reduced ? 0.15 : 0.32, times: [0, 0.35, 1], ease: 'circIn' }
                      : { duration: reduced ? 0.15 : 0.18, ease: 'circIn', delay: i * 0.02 }
                }
              >
                <span aria-hidden className="absolute inset-0 translate-x-[4px] translate-y-[4px]" style={{ clipPath: CARD_SHAPES[i % 3], background: on ? WHITE : RED }} />
                <span
                  aria-hidden
                  className="absolute inset-0 transition-colors duration-75"
                  style={{ clipPath: CARD_SHAPES[i % 3], background: on ? RED : WHITE }}
                />
                <span
                  aria-hidden
                  className={`relative grid size-[22px] shrink-0 -skew-x-12 place-items-center font-['Orbitron'] text-[11px] font-black ${on ? 'bg-[#f6f1e7] text-[#e3141e]' : 'bg-[#0c0b0d] text-[#f6f1e7]'}`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className={`relative flex-1 text-[13.5px] leading-tight font-black ${on ? 'text-[#f6f1e7]' : 'text-[#0c0b0d]'}`}>{o.label}</span>
                {on && picked === null && (
                  <motion.svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    className="relative size-[14px] shrink-0"
                    animate={reduced ? undefined : { x: [0, -5, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <polygon points="20,0 0,10 20,20 15,10" fill={WHITE} stroke={BLACK} strokeWidth="2" />
                  </motion.svg>
                )}
              </motion.button>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ───────────── スマホの各ページ ───────────── */

function StatusBar({ minute }: { minute: number }) {
  return (
    <div className="relative z-30 flex h-[18px] shrink-0 items-center justify-between bg-[#0c0b0d] px-3 font-['Space_Grotesk'] text-[10px] font-bold text-[#f6f1e7]" aria-hidden>
      <span className="tabular-nums">{fmtTime(minute)}</span>
      <span className="flex items-center gap-1.5">
        <span className="flex items-end gap-[2px]">
          {[4, 6, 8, 10].map((h, i) => (
            <span key={i} className="block w-[3px] -skew-x-12" style={{ height: h, background: i < 3 ? WHITE : `${WHITE}55` }} />
          ))}
        </span>
        <span className="font-['Orbitron'] text-[8px]">5G</span>
        <span className="relative h-[8px] w-[18px] -skew-x-12 border-[1.5px] border-[#f6f1e7]">
          <span className="absolute inset-y-[1px] left-[1px] w-[60%] bg-[#e3141e]" />
        </span>
      </span>
    </div>
  )
}

function PageHeader({ title, sub, onBack, badge, backLabel }: { title: string; sub: string; onBack?: () => void; badge?: number; backLabel?: string }) {
  return (
    <div className="relative z-20 flex h-[40px] shrink-0 items-center gap-2 px-2">
      <div aria-hidden className="absolute inset-0 bg-[#f6f1e7]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 78%, 62% 100%, 0 86%)' }} />
      <div aria-hidden className="absolute inset-x-0 bottom-[-5px] h-[6px] bg-[#e3141e]" style={{ clipPath: 'polygon(0 0, 62% 60%, 100% 0, 100% 30%, 62% 100%, 0 40%)' }} />
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="relative grid h-[26px] w-[30px] shrink-0 -skew-x-12 place-items-center bg-[#0c0b0d] text-[#f6f1e7] outline-none hover:bg-[#e3141e] focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-offset-1"
        >
          <svg viewBox="0 0 20 20" className="size-[14px] skew-x-12" aria-hidden>
            <polygon points="14,1 3,10 14,19 11,10" fill="currentColor" />
          </svg>
          <AnimatePresence>
            {!!badge && (
              <motion.span
                key={badge}
                className="absolute -top-2 -right-2.5 grid min-w-[16px] skew-x-12 place-items-center bg-[#e3141e] px-[3px] font-['Space_Grotesk'] text-[10px] leading-[15px] font-bold text-[#f6f1e7] ring-2 ring-[#f6f1e7]"
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 8 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 700, damping: 12 }}
              >
                {badge}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      )}
      <div className="relative min-w-0 flex-1 leading-none text-[#0c0b0d]">
        <div className="truncate text-[15px] font-black tracking-tight">{title}</div>
        <div className="mt-[2px] font-['Space_Grotesk'] text-[8.5px] font-bold tracking-[.2em] text-[#e3141e]">{sub}</div>
      </div>
      <svg viewBox="0 0 20 20" className="relative mr-1 size-[16px] shrink-0 text-[#0c0b0d]" aria-hidden>
        <path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" fill="currentColor" transform="skewX(-10) translate(2 0)" />
      </svg>
    </div>
  )
}

function ChatPage({
  log,
  typing,
  lastWho,
  choice,
  cursor,
  setCursor,
  onPick,
  cardRefs,
  awaiting,
  mode,
  ended,
  onAdvance,
  onBack,
  onReset,
  badge,
  slash,
  reduced,
}: {
  log: Entry[]
  typing: Who | null
  lastWho: string | null
  choice: ChoiceState | null
  cursor: number
  setCursor: (i: number) => void
  onPick: (i: number) => void
  cardRefs: RefObject<(HTMLButtonElement | null)[]>
  awaiting: boolean
  mode: Mode
  ended: boolean
  onAdvance: () => void
  onBack: () => void
  onReset: () => void
  badge: number
  slash: number
  reduced: boolean
}) {
  const [mountCount] = useState(log.length)
  const scroller = useRef<HTMLOListElement>(null)
  const first = useRef(true)

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: first.current || reduced ? 'auto' : 'smooth' })
    first.current = false
  }, [log.length, typing, choice?.key, reduced])

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="放課後作戦会議" sub="GROUP · 4 MEMBERS" onBack={onBack} badge={badge} backLabel={`トーク一覧へもどる${badge ? `(未読 ${badge} 件)` : ''}`} />
      <div className="relative min-h-0 flex-1">
        <ol
          ref={scroller}
          role="log"
          aria-live="polite"
          aria-label="グループトーク: 放課後作戦会議"
          onClick={onAdvance}
          className="spc-log absolute inset-0 flex cursor-pointer flex-col gap-2 overflow-x-hidden overflow-y-auto pt-3 pb-5"
        >
          {log.map((e, i) => (
            <EntryRow key={e.id} e={e} anim={i >= mountCount} reduced={reduced} />
          ))}
          <AnimatePresence>{typing && <TypingRow key={`t-${typing}`} who={typing} showFace={lastWho !== typing} reduced={reduced} />}</AnimatePresence>
        </ol>
        {/* 選択した瞬間に走る斜めの斬撃 */}
        <AnimatePresence>{slash > 0 && !reduced && <Slash key={slash} />}</AnimatePresence>
        {/* 手動モードの「次へ」 */}
        <AnimatePresence>
          {awaiting && mode === 'manual' && !choice && !ended && (
            <motion.div
              className="pointer-events-none absolute right-2 bottom-1.5 flex items-center gap-1"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              aria-hidden
            >
              <span className="-skew-x-12 bg-[#f6f1e7] px-1.5 text-[9px] font-black text-[#0c0b0d] shadow-[2px_2px_0_#e3141e]">クリック / Enter で次へ</span>
              <svg viewBox="0 0 20 20" className="size-[12px]" style={{ animation: reduced ? undefined : 'spc-bob .6s ease-in-out infinite' }}>
                <polygon points="0,2 20,2 10,18" fill={RED} stroke={WHITE} strokeWidth="2" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        {choice ? (
          <ChoicePanel key={`c-${choice.key}`} choice={choice} cursor={cursor} setCursor={setCursor} onPick={onPick} cardRefs={cardRefs} reduced={reduced} />
        ) : ended ? (
          <motion.div
            key="end"
            className="relative flex h-[44px] shrink-0 items-center justify-between gap-2 bg-[#e3141e] px-3"
            initial={reduced ? { opacity: 0 } : { y: 44 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 600, damping: 26, delay: 0.5 }}
            style={{ clipPath: 'polygon(0 6px, 100% 0, 100% 100%, 0 100%)' }}
          >
            <span className="font-['Orbitron'] text-[12px] font-black tracking-[.3em] text-[#0c0b0d]">FIN.</span>
            <button
              type="button"
              onClick={onReset}
              className="-skew-x-12 bg-[#0c0b0d] px-3 py-1 text-[12px] font-black text-[#f6f1e7] shadow-[3px_3px_0_#f6f1e7] outline-none hover:bg-[#f6f1e7] hover:text-[#0c0b0d] focus-visible:ring-2 focus-visible:ring-[#f6f1e7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#e3141e]"
            >
              最初から
            </button>
          </motion.div>
        ) : (
          <motion.div key="input" className="relative flex h-[40px] shrink-0 items-center gap-2 px-2.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden>
            <div className="h-[24px] flex-1 -skew-x-12 border-2 border-[#f6f1e7]/30 bg-[#0c0b0d] px-2 text-[10px] leading-[20px] font-bold text-[#f6f1e7]/40">
              <span className="inline-block skew-x-12">メッセージを入力…</span>
            </div>
            <span className="grid h-[24px] w-[30px] -skew-x-12 place-items-center bg-[#e3141e]">
              <svg viewBox="0 0 20 20" className="size-[13px] skew-x-12">
                <polygon points="1,2 19,10 1,18 5,10" fill={WHITE} />
              </svg>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Slash() {
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden exit={{ opacity: 0, transition: { duration: 0.1 } }}>
      <motion.div className="absolute inset-0 bg-[#f6f1e7]" initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: 0.22 }} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <motion.polygon
          points="104,18 -4,82 -4,84 104,26"
          fill={RED}
          initial={{ clipPath: 'inset(0 0 0 100%)' }}
          animate={{ clipPath: ['inset(0 0 0 100%)', 'inset(0 0 0 0%)', 'inset(0 100% 0 0%)'] }}
          transition={{ duration: 0.36, times: [0, 0.45, 1], ease: 'circOut' }}
        />
        <motion.polygon
          points="104,20 -4,83 -4,83.4 104,22.5"
          fill={WHITE}
          initial={{ clipPath: 'inset(0 0 0 100%)' }}
          animate={{ clipPath: ['inset(0 0 0 100%)', 'inset(0 0 0 0%)', 'inset(0 100% 0 0%)'] }}
          transition={{ duration: 0.3, times: [0, 0.45, 1], ease: 'circOut', delay: 0.03 }}
        />
        <motion.polygon
          points="104,48 -4,64 -4,65 104,50"
          fill={WHITE}
          initial={{ clipPath: 'inset(0 0 0 100%)' }}
          animate={{ clipPath: ['inset(0 0 0 100%)', 'inset(0 0 0 0%)', 'inset(0 100% 0 0%)'] }}
          transition={{ duration: 0.3, times: [0, 0.45, 1], ease: 'circOut', delay: 0.08 }}
        />
      </svg>
    </motion.div>
  )
}

function ListPage({
  unread,
  preview,
  minute,
  onOpen,
  notes,
  reduced,
}: {
  unread: Record<ThreadId, number>
  preview: string
  minute: number
  onOpen: (t: ThreadId) => void
  notes: Note[]
  reduced: boolean
}) {
  const rows: { id: ThreadId; name: string; en: string; text: string; time: string }[] = [
    { id: 'main', name: '放課後作戦会議', en: 'GROUP', text: preview, time: fmtTime(minute) },
    ...(['family', 'job'] as OtherThread[]).map((t) => {
      const last = [...OTHER[t].base.map((b) => ({ ...b })), ...notes.filter((n) => n.thread === t)].at(-1)!
      return { id: t, name: OTHER[t].name, en: OTHER[t].en, text: `${last.from}: ${last.text}`, time: last.time }
    }),
  ]
  return (
    <div className="flex h-full flex-col">
      <div className="relative flex h-[58px] shrink-0 items-end justify-between px-3 pb-1.5">
        <div aria-hidden className="absolute inset-0 bg-[#e3141e]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 62%, 0 100%)' }} />
        <h3 className="relative -rotate-6">
          <span className="sr-only">トーク一覧</span>
          <Ransom text="トーク" size="24px" reduced={reduced} jitter={false} />
        </h3>
        <span className="relative mb-1 font-['Orbitron'] text-[8px] font-black tracking-[.3em] text-[#f6f1e7]">TALK LIST</span>
      </div>
      <ul className="flex flex-col gap-2.5 px-2 pt-3">
        {rows.map((r, i) => {
          const n = unread[r.id]
          return (
            <motion.li
              key={r.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 120, skewX: -20 }}
              animate={{ opacity: 1, x: 0, skewX: 0 }}
              transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 520, damping: 26, delay: 0.08 + i * 0.06 }}
              style={{ rotate: `${i % 2 ? 1.5 : -1.5}deg` }}
            >
              <button
                type="button"
                onClick={() => onOpen(r.id)}
                aria-label={`${r.name} を開く${n ? `(未読 ${n} 件)` : ''}`}
                className="group relative flex w-full items-center gap-2 py-2 pr-3 pl-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0b0d]"
              >
                <span aria-hidden className="absolute inset-0 bg-[#e3141e] transition-transform duration-100 group-hover:translate-x-[5px] group-hover:translate-y-[4px]" style={{ clipPath: 'polygon(0 6%, 100% 0, 98% 100%, 2% 94%)', translate: '3px 3px' }} />
                <span aria-hidden className="absolute inset-0 bg-[#f6f1e7] transition-colors duration-75 group-hover:bg-[#0c0b0d] group-hover:ring-2" style={{ clipPath: 'polygon(0 6%, 100% 0, 98% 100%, 2% 94%)' }} />
                <span className="relative size-[38px] shrink-0">
                  <ThreadIcon thread={r.id} />
                </span>
                <span className="relative min-w-0 flex-1 text-[#0c0b0d] group-hover:text-[#f6f1e7]">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-[13px] font-black">{r.name}</span>
                    <span className="font-['Orbitron'] text-[6.5px] font-bold tracking-[.15em] text-[#e3141e]">{r.en}</span>
                  </span>
                  <span className="mt-[1px] block truncate text-[10px] font-medium opacity-75">{r.text}</span>
                </span>
                <span className="relative flex shrink-0 flex-col items-end gap-1">
                  <span className="font-['Space_Grotesk'] text-[9px] font-bold text-[#0c0b0d]/60 group-hover:text-[#f6f1e7]/60">{r.time}</span>
                  <AnimatePresence>
                    {n > 0 && (
                      <motion.span
                        key={n}
                        className="relative grid size-[20px] place-items-center"
                        initial={reduced ? { opacity: 0 } : { scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 700, damping: 12 }}
                      >
                        <svg viewBox="0 0 100 100" className="absolute inset-[-4px] size-[28px]" aria-hidden>
                          <polygon points={BURST} fill={RED} stroke={BLACK} strokeWidth="6" />
                        </svg>
                        <span className="relative font-['Space_Grotesk'] text-[10px] font-bold text-[#f6f1e7]">{n}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </button>
            </motion.li>
          )
        })}
      </ul>
      <div className="mt-auto px-3 pb-3 text-center text-[9px] font-bold text-[#f6f1e7]/45">トークを選んで開く / Esc でもどる</div>
    </div>
  )
}

function ThreadPage({ thread, notes, onBack, reduced }: { thread: OtherThread; notes: Note[]; onBack: () => void; reduced: boolean }) {
  const msgs = [...OTHER[thread].base, ...notes.filter((n) => n.thread === thread)]
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={OTHER[thread].name} sub={OTHER[thread].en} onBack={onBack} backLabel="トーク一覧へもどる" />
      <ol className="spc-log flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pt-3 pb-3" aria-label={`${OTHER[thread].name} のトーク`}>
        {msgs.map((m, i) => (
          <motion.li
            key={i}
            className="flex items-start gap-1.5 pr-6 pl-1"
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -30, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1, rotate: i % 2 ? 1 : -1 }}
            transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 600, damping: 20, delay: 0.1 + i * 0.06 }}
          >
            <span className="size-[30px] shrink-0">
              <LetterFace ch={m.from[0]} />
            </span>
            <div className="flex min-w-0 flex-col items-start">
              <span className="mb-1 ml-3 -skew-x-12 bg-[#f6f1e7] px-1.5 text-[10px] font-black text-[#0c0b0d] shadow-[2px_2px_0_#e3141e]">{m.from}</span>
              <BubbleShell me={false} shapeIdx={i}>
                <p className="max-w-[178px] text-[13.5px] leading-snug font-bold">{m.text}</p>
              </BubbleShell>
              <span className="mt-1 ml-4 font-['Space_Grotesk'] text-[8px] font-bold text-[#f6f1e7]/45">{m.time}</span>
            </div>
          </motion.li>
        ))}
      </ol>
      <div className="flex h-[40px] shrink-0 items-center justify-center text-[10px] font-bold text-[#f6f1e7]/45">このトークは閲覧のみ</div>
    </div>
  )
}

function NotifyBanner({ b, onOpen, reduced }: { b: BannerData; onOpen: () => void; reduced: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={`新着通知 ${OTHER[b.thread].name}、${b.from}「${b.text}」。開く`}
      className="absolute inset-x-1.5 top-[22px] z-40 flex items-center gap-2 py-2 pr-3 pl-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#f6f1e7]"
      initial={reduced ? { opacity: 0 } : { y: -90, rotate: -6, scaleY: 0.6 }}
      animate={{ y: 0, rotate: -1.5, scaleY: 1, opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { y: -100, rotate: 3, transition: { duration: 0.16, ease: 'circIn' } }}
      transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 640, damping: 17 }}
    >
      <span aria-hidden className="absolute inset-0 translate-x-[4px] translate-y-[4px] bg-[#e3141e]" style={{ clipPath: 'polygon(0 0, 100% 8%, 98% 100%, 60% 92%, 56% 100%, 1% 92%)' }} />
      <span aria-hidden className="absolute inset-0 bg-[#f6f1e7]" style={{ clipPath: 'polygon(0 0, 100% 8%, 98% 100%, 60% 92%, 56% 100%, 1% 92%)' }} />
      <span aria-hidden className="absolute inset-[3px] bg-[#0c0b0d]" style={{ clipPath: 'polygon(0 0, 100% 8%, 98% 100%, 60% 92%, 56% 100%, 1% 92%)' }} />
      <motion.span
        className="relative size-[30px] shrink-0"
        animate={reduced ? undefined : { rotate: [0, -16, 14, -8, 0] }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <ThreadIcon thread={b.thread} />
      </motion.span>
      <span className="relative min-w-0 flex-1 leading-tight text-[#f6f1e7]">
        <span className="flex items-center gap-1.5">
          <span className="-skew-x-12 bg-[#e3141e] px-1 font-['Orbitron'] text-[7px] font-black tracking-[.2em]">NEW</span>
          <span className="truncate text-[10px] font-black">
            {OTHER[b.thread].name} · {b.from}
          </span>
        </span>
        <span className="mt-[2px] block truncate text-[11.5px] font-bold">{b.text}</span>
      </span>
    </motion.button>
  )
}

/* ───────────── 背景: WebGL ハーフトーン ───────────── */

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec4 uPulse;
uniform float uCell;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
float field(vec2 px, out float ring){
  vec2 q = px / uRes.y;
  vec2 uv = px / uRes;
  float t = uTime;
  vec2 w = vec2(fbm(q * 1.8 + vec2(t * 0.05, 0.0)), fbm(q * 1.8 + vec2(5.2, -t * 0.04)));
  float n = fbm(q * 2.4 + w * 1.6 + vec2(-t * 0.06, t * 0.03));
  float corner = smoothstep(0.25, 1.0, abs(uv.x - uv.y) * 1.25);
  float bands = smoothstep(0.55, 1.0, sin((uv.x * 1.2 + uv.y * 0.55) * 8.0 - t * 0.6));
  float v = n * 1.05 - 0.42 + corner * 0.55 + bands * 0.16;
  ring = 0.0;
  if (uPulse.w > 0.0) {
    float age = uPulse.z;
    float r = age * uRes.y * 1.25;
    float d = distance(px, uPulse.xy);
    float k = (d - r) / (uRes.y * 0.07);
    ring = exp(-k * k) * (1.0 - smoothstep(0.0, 1.3, age)) * uPulse.w;
    v += ring * 0.9;
  }
  return v;
}
void main(){
  float an = 0.5236;
  float c = cos(an); float s = sin(an);
  vec2 g = mat2(c, s, -s, c) * gl_FragCoord.xy / uCell;
  vec2 id = floor(g) + 0.5;
  vec2 ctr = mat2(c, -s, s, c) * id * uCell;
  float ring;
  float v = field(ctr, ring);
  float rad = clamp(v, 0.0, 1.0) * 0.7;
  float d = length(g - id);
  float aa = 1.2 / uCell;
  float dotm = 1.0 - smoothstep(rad - aa, rad + aa, d);
  vec3 bg = vec3(0.047, 0.043, 0.051);
  vec2 uv = gl_FragCoord.xy / uRes;
  bg = mix(bg, vec3(0.16, 0.02, 0.035), smoothstep(0.4, 1.2, abs(uv.x - uv.y) * 1.3) * 0.6);
  vec3 red = mix(vec3(0.55, 0.03, 0.06), vec3(0.89, 0.078, 0.118), smoothstep(0.15, 0.6, v));
  red = mix(red, vec3(0.965, 0.945, 0.906), clamp(ring, 0.0, 1.0) * 0.55);
  gl_FragColor = vec4(mix(bg, red, dotm), 1.0);
}
`

type PulseFn = (x: number, y: number, strength?: number) => void

function HalftoneField({ pulseRef, reduced }: { pulseRef: RefObject<PulseFn | null>; reduced: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    // StrictMode の再実行でも失われたコンテキストを使い回さないよう、実行ごとに canvas を作って捨てる
    const canvas = document.createElement('canvas')
    canvas.className = 'absolute inset-0 size-full'
    host.appendChild(canvas)
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false })
    if (!gl) {
      canvas.remove()
      setFallback(true)
      return
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.remove()
      setFallback(true)
      return
    }
    setFallback(false)
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uRes = gl.getUniformLocation(prog, 'uRes')
    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uPulse = gl.getUniformLocation(prog, 'uPulse')
    const uCell = gl.getUniformLocation(prog, 'uCell')

    let dpr = 1
    let cssH = 1
    const pulse = { x: 0, y: 0, t: -10, s: 0 }
    const t0 = performance.now()
    let raf = 0
    let visible = true

    const draw = () => {
      const now = (performance.now() - t0) / 1000
      const age = now - pulse.t
      gl.uniform1f(uTime, reduced ? 12 : now)
      gl.uniform4f(uPulse, pulse.x * dpr, (cssH - pulse.y) * dpr, age, age < 1.4 ? pulse.s : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const loop = () => {
      draw()
      raf = visible && !reduced ? requestAnimationFrame(loop) : 0
    }
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = canvas.clientWidth
      cssH = canvas.clientHeight || 1
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(cssH * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uCell, Math.max(7, cssH / 58) * dpr)
      draw()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting
      if (visible && !raf && !reduced) raf = requestAnimationFrame(loop)
    })
    io.observe(canvas)
    if (!reduced) raf = requestAnimationFrame(loop)

    pulseRef.current = (x, y, strength = 1) => {
      if (reduced) return
      pulse.x = x
      pulse.y = y
      pulse.t = (performance.now() - t0) / 1000
      pulse.s = strength
    }
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      pulseRef.current = null
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }, [reduced, pulseRef])

  return (
    <>
      <div ref={hostRef} aria-hidden className="absolute inset-0" />
      {fallback && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(${RED} 32%, transparent 36%) 0 0 / 12px 12px, ${BLACK}`,
            maskImage: 'linear-gradient(135deg, #000, transparent 40% 60%, #000)',
            WebkitMaskImage: 'linear-gradient(135deg, #000, transparent 40% 60%, #000)',
          }}
        />
      )}
    </>
  )
}

/* ───────────── 背景: 漂う破片 ───────────── */

const SHARDS = (() => {
  const r = mulberry32(42)
  return Array.from({ length: 14 }, (_, i) => {
    const cx = r() * 160
    const cy = r() * 90
    const size = 2 + r() * (i < 3 ? 7 : 4)
    const n = 4 + Math.floor(r() * 3)
    const base = r() * Math.PI * 2
    const pts = Array.from({ length: n }, (_, k) => {
      const a = base + (k / n) * Math.PI * 2 + (r() - 0.5) * 0.9
      const rr = size * (0.45 + r() * 0.75)
      return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr * 0.8).toFixed(1)}`
    }).join(' ')
    const kind = i % 4
    return {
      pts,
      fill: i < 3 ? BLACK : kind === 0 ? WHITE : kind === 1 ? RED : kind === 2 ? BLACK : 'none',
      stroke: i < 3 || kind >= 2 ? WHITE : 'none',
      op: kind === 3 ? 0.55 : 0.95,
      style: {
        '--dx': `${((r() - 0.5) * 16).toFixed(1)}px`,
        '--dy': `${((r() - 0.5) * 10).toFixed(1)}px`,
        '--dr': `${((r() - 0.5) * 50).toFixed(0)}deg`,
        animation: `spc-drift ${(14 + r() * 16).toFixed(1)}s ${(-r() * 20).toFixed(1)}s ease-in-out infinite`,
        transformBox: 'fill-box',
        transformOrigin: 'center',
      } as CSSProperties,
    }
  })
})()

function Shards({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      {SHARDS.map((s, i) => (
        <polygon key={i} points={s.pts} fill={s.fill} stroke={s.stroke} strokeWidth=".5" opacity={s.op} style={reduced ? { transformBox: 'fill-box' } : s.style} />
      ))}
    </svg>
  )
}

/* ───────────── カットイン ───────────── */

function CutIn({ data, reduced }: { data: CutInData; reduced: boolean }) {
  if (reduced) return null
  const sweep: Transition = { duration: 0.9, times: [0, 0.2, 0.74, 1], ease: ['circOut', 'linear', 'circIn'] }
  const end = data.kind === 'end'
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden exit={{ opacity: 0, transition: { duration: 0.1 } }}>
      <motion.div className="absolute inset-0 bg-[#f6f1e7]" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.55, 0] }} transition={{ duration: 0.24 }} />
      <div className="absolute inset-x-[-20%] top-[63%] h-[6%] rotate-[-10deg]">
        <motion.div className="h-full bg-[#f6f1e7]" initial={{ x: '110%' }} animate={{ x: ['110%', '0%', '-2%', '-110%'] }} transition={{ ...sweep, delay: 0.05 }} />
      </div>
      <div className="absolute inset-x-[-20%] top-[30%] h-[3%] rotate-[-10deg]">
        <motion.div className="h-full bg-[#e3141e]" initial={{ x: '-110%' }} animate={{ x: ['-110%', '0%', '2%', '110%'] }} transition={{ ...sweep, delay: 0.08 }} />
      </div>
      <div className="absolute inset-x-[-20%] top-1/2 h-[30%] -translate-y-1/2 rotate-[-10deg] @min-[40rem]:h-[26%]">
        <motion.div
          className="relative h-full overflow-hidden border-y-[6px] border-[#e3141e] bg-[#0c0b0d] shadow-[0_0_0_3px_#0c0b0d]"
          initial={{ x: '-110%' }}
          animate={{ x: ['-110%', '0%', '2%', '110%'] }}
          transition={sweep}
        >
          <div
            className="absolute inset-0 opacity-50"
            style={{ background: `radial-gradient(${RED} 30%, transparent 34%) 0 0 / 9px 9px`, maskImage: 'linear-gradient(90deg, #000, transparent 45%)', WebkitMaskImage: 'linear-gradient(90deg, #000, transparent 45%)' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'repeating-linear-gradient(0deg, transparent 0 11px, rgba(246,241,231,.14) 11px 12px, transparent 12px 27px)' }}
          />
          <span className="absolute top-1/2 left-[14%] -translate-y-1/2 font-['Space_Grotesk'] text-[clamp(30px,9cqh,110px)] font-bold tracking-tighter text-transparent italic [-webkit-text-stroke:2px_#f6f1e7]">
            {end ? 'FINISH' : 'REPLY'}
          </span>
          <div className="absolute inset-y-0 right-[16%] flex flex-col items-end justify-center gap-1">
            {end ? (
              <Ransom text={data.text} size="clamp(26px, 8cqh, 96px)" reduced={false} jitter={false} />
            ) : (
              <motion.span
                className="-skew-x-12 bg-[#f6f1e7] px-3 py-1 text-[clamp(16px,5cqh,56px)] leading-tight font-black text-[#0c0b0d] shadow-[5px_5px_0_#e3141e]"
                initial={{ scale: 1.6, rotate: -8 }}
                animate={{ scale: 1, rotate: -3 }}
                transition={{ type: 'spring', stiffness: 600, damping: 16, delay: 0.1 }}
              >
                「{data.text}」
              </motion.span>
            )}
            <span className="-skew-x-12 bg-[#e3141e] px-2 font-['Space_Grotesk'] text-[clamp(9px,2.2cqh,22px)] font-bold tracking-[.2em] text-[#f6f1e7]">{data.sub}</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ───────────── 横のメンバー表示 ───────────── */

function Members({ typing, size }: { typing: Who | null; size: number }) {
  return (
    <div className="flex flex-col gap-[0.6em]" style={{ fontSize: size }} aria-hidden>
      <span className="w-fit -skew-x-12 bg-[#f6f1e7] px-[0.5em] font-['Orbitron'] text-[0.3em] font-black tracking-[.3em] whitespace-nowrap text-[#0c0b0d] shadow-[0.15em_0.15em_0_#e3141e]">MEMBERS 4/4</span>
      {WHO_LIST.map((w, i) => {
        const on = typing === w
        return (
          <motion.div
            key={w}
            className="relative flex items-center gap-[0.35em]"
            style={{ marginLeft: `${i * 0.5}em` }}
            animate={{ x: on ? '-0.4em' : '0em', scale: on ? 1.08 : 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 20 }}
          >
            <span className="absolute inset-y-[0.1em] right-[-0.3em] left-[0.5em] bg-[#0c0b0d]/90 ring-1 ring-[#f6f1e7]/30" style={{ clipPath: 'polygon(0 12%, 100% 0, 97% 100%, 3% 86%)' }} />
            <motion.span
              className="absolute inset-y-[0.1em] right-[-0.3em] left-[0.5em] bg-[#e3141e]"
              style={{ clipPath: 'polygon(0 12%, 100% 0, 97% 100%, 3% 86%)', originX: 0 }}
              animate={{ scaleX: on ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 700, damping: 30 }}
            />
            <span className="relative block size-[1em] shrink-0">
              <Face who={w} />
            </span>
            <span className="relative flex min-w-[3.4em] flex-col pr-[0.4em] leading-none">
              <span className="text-[0.36em] font-black text-[#f6f1e7]">{PEOPLE[w].name}</span>
              <span className={`mt-[0.2em] text-[0.22em] font-bold whitespace-nowrap ${on ? 'text-[#f6f1e7]' : 'text-[#f6f1e7]/60'}`}>{on ? '入力中…' : 'オンライン'}</span>
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ───────────── 本体 ───────────── */

function layoutFor(w: number, h: number) {
  const wide = w >= 640
  const side = w >= 860
  const ctrlH = wide ? 0 : 58
  const bw = PW + 50
  const bh = PH + 40
  const availH = h - ctrlH - (wide ? 16 : 12)
  const availW = wide ? w * (side ? 0.44 : 0.5) : w - 12
  const s = Math.max(0.35, Math.min(availH / bh, availW / bw, 2.1))
  const cx = wide ? w * (side ? 0.6 : 0.68) : w / 2
  const cy = wide ? h / 2 : (h - ctrlH) / 2 + 4
  const phoneL = cx - (PW * s) / 2
  const phoneR = cx + (PW * s) / 2
  return { wide, side, s, cx, cy, phoneL, phoneR }
}

export function StylishPhoneChat() {
  const reduced = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 1000, h: 440 })
  const [epoch, setEpoch] = useState(0)
  const [mode, setModeState] = useState<Mode>('auto')
  const [log, setLog] = useState<Entry[]>([])
  const [typing, setTyping] = useState<Who | null>(null)
  const [choice, setChoice] = useState<ChoiceState | null>(null)
  const [cursor, setCursor] = useState(0)
  const [awaiting, setAwaiting] = useState(false)
  const [ended, setEnded] = useState(false)
  const [banner, setBanner] = useState<BannerData | null>(null)
  const [unread, setUnread] = useState(INITIAL_UNREAD)
  const [notes, setNotes] = useState<Note[]>([])
  const [minute, setMinute] = useState(START_MIN)
  const [view, setView] = useState<View>('main')
  const [navDir, setNavDir] = useState(1)
  const [navKey, setNavKey] = useState(0)
  const [slash, setSlash] = useState(0)
  const [cutin, setCutin] = useState<CutInData | null>(null)

  const [shakeScope, animateShake] = useAnimate<HTMLDivElement>()
  const pulseRef = useRef<PulseFn | null>(null)
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])

  /* エンジンの状態(タイマーから読むので ref で持つ) */
  const timers = useRef(new Set<number>())
  const pos = useRef({ node: 'start', i: 0 })
  const waiting = useRef(false)
  const waitTimer = useRef<number | null>(null)
  const paused = useRef(false)
  const nextId = useRef(1)
  const lastWho = useRef<string | null>(null)
  const [lastWhoState, setLastWhoState] = useState<string | null>(null)
  const modeRef = useRef<Mode>('auto')
  const viewRef = useRef<View>('main')
  const choiceRef = useRef<ChoiceState | null>(null)
  const layoutRef = useRef(layoutFor(1000, 440))
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  const layout = useMemo(() => layoutFor(dims.w, dims.h), [dims])
  layoutRef.current = layout

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => setDims({ w: el.clientWidth || 1000, h: el.clientHeight || 440 })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
    return id
  }, [])

  const fx = useCallback(
    (strength: 'small' | 'big') => {
      const L = layoutRef.current
      pulseRef.current?.(L.cx, L.cy, strength === 'big' ? 1.3 : 0.8)
      if (reducedRef.current || !shakeScope.current) return
      if (strength === 'big') animateShake(shakeScope.current, { x: [0, -14, 11, -7, 4, 0], y: [0, 6, -5, 3, 0, 0], rotate: [0, -2, 1.5, -0.6, 0, 0] }, { duration: 0.42, ease: 'linear' })
      else animateShake(shakeScope.current, { x: [0, -4, 3, 0], y: [0, 2, -1, 0] }, { duration: 0.2, ease: 'linear' })
    },
    [animateShake, shakeScope],
  )

  const push = useCallback((e: NewEntry) => {
    const id = nextId.current++
    setLog((l) => [...l, { ...e, id } as Entry])
  }, [])

  /* 台本を 1 手順ずつ進める。関数は ref に入れて、タイマーからいつでも最新版を呼ぶ */
  const stepRef = useRef<() => void>(() => {})
  const advanceNow = useCallback(() => {
    if (!waiting.current) return
    waiting.current = false
    if (waitTimer.current !== null) {
      clearTimeout(waitTimer.current)
      timers.current.delete(waitTimer.current)
      waitTimer.current = null
    }
    setAwaiting(false)
    stepRef.current()
  }, [])

  const wait = useCallback(
    (ms: number) => {
      waiting.current = true
      if (modeRef.current === 'auto') waitTimer.current = later(advanceNow, ms)
      else setAwaiting(true)
    },
    [later, advanceNow],
  )

  stepRef.current = () => {
    if (viewRef.current !== 'main') {
      paused.current = true
      return
    }
    const s = SCRIPT[pos.current.node]?.[pos.current.i]
    if (!s) return
    pos.current.i++
    switch (s.t) {
      case 'sys':
        push({ k: 'sys', text: s.text })
        lastWho.current = null
        setLastWhoState(null)
        wait(700)
        break
      case 'go':
        pos.current = { node: s.to, i: 0 }
        stepRef.current()
        break
      case 'note': {
        const id = nextId.current++
        setBanner({ id, thread: s.thread, from: s.from, text: s.text })
        setUnread((u) => ({ ...u, [s.thread]: u[s.thread] + 1 }))
        setNotes((n) => [...n, { thread: s.thread, from: s.from, text: s.text, time: fmtTime(START_MIN + 3 + n.length * 4) }])
        later(() => setBanner((b) => (b?.id === id ? null : b)), 3600)
        later(() => stepRef.current(), 650)
        break
      }
      case 'msg':
      case 'stk': {
        setTyping(s.who)
        const typeDur = s.t === 'msg' ? Math.min(1500, 650 + s.text.length * 28) : 700
        later(() => {
          setTyping(null)
          const first = lastWho.current !== s.who
          lastWho.current = s.who
          setLastWhoState(s.who)
          if (s.t === 'msg') push({ k: 'msg', who: s.who, text: s.text, first })
          else push({ k: 'stk', who: s.who, s: s.s, first })
          setMinute((m) => m + 1)
          fx('small')
          const reveal = s.t === 'msg' && isLong(s.text) && !reducedRef.current ? s.text.length * TYPE_MS : 0
          wait(reveal + (s.t === 'msg' ? 900 + s.text.length * 30 : 1200))
        }, typeDur)
        break
      }
      case 'choice': {
        const c = { key: nextId.current++, opts: s.opts, picked: null, at: performance.now() }
        choiceRef.current = c
        setChoice(c)
        setCursor(0)
        break
      }
      case 'end':
        push({ k: 'end', title: s.title, sub: s.sub })
        lastWho.current = null
        setLastWhoState(null)
        setEnded(true)
        later(() => {
          setCutin({ id: nextId.current++, kind: 'end', text: s.title, sub: s.sub })
          fx('big')
        }, 250)
        later(() => setCutin(null), 1300)
        break
    }
  }

  const pick = useCallback(
    (i: number) => {
      const c = choiceRef.current
      if (!c || c.picked !== null || viewRef.current !== 'main') return
      const opt = c.opts[i]
      const next = { ...c, picked: i }
      choiceRef.current = next
      setChoice(next)
      setCursor(i)
      setCutin({ id: nextId.current++, kind: 'reply', text: opt.label, sub: 'YOUR REPLY' })
      fx('big')
      later(() => setCutin(null), 950)
      if (rootRef.current?.contains(document.activeElement)) rootRef.current.focus({ preventScroll: true })
      later(
        () => {
          choiceRef.current = null
          setChoice(null)
          const first = lastWho.current !== 'me'
          lastWho.current = 'me'
          setLastWhoState('me')
          push({ k: 'msg', who: 'me', text: opt.text, first })
          setSlash((n) => n + 1)
          setMinute((m) => m + 1)
          pos.current = { node: opt.go, i: 0 }
          wait(1300 + opt.text.length * 25)
        },
        reducedRef.current ? 60 : 330,
      )
    },
    [fx, later, push, wait],
  )

  /* 開始とリセット */
  useEffect(() => {
    const set = timers.current
    set.forEach(clearTimeout)
    set.clear()
    pos.current = { node: 'start', i: 0 }
    waiting.current = false
    waitTimer.current = null
    paused.current = false
    lastWho.current = null
    choiceRef.current = null
    viewRef.current = 'main'
    setLog([])
    setTyping(null)
    setChoice(null)
    setAwaiting(false)
    setEnded(false)
    setBanner(null)
    setUnread(INITIAL_UNREAD)
    setNotes([])
    setMinute(START_MIN)
    setView('main')
    setLastWhoState(null)
    setCutin(null)
    later(() => stepRef.current(), 700)
    return () => {
      set.forEach(clearTimeout)
      set.clear()
    }
  }, [epoch, later])

  const setMode = (m: Mode) => {
    if (m === modeRef.current) return
    modeRef.current = m
    setModeState(m)
    if (!waiting.current) return
    if (waitTimer.current !== null) {
      clearTimeout(waitTimer.current)
      timers.current.delete(waitTimer.current)
      waitTimer.current = null
    }
    if (m === 'auto') {
      setAwaiting(false)
      waitTimer.current = later(advanceNow, 700)
    } else setAwaiting(true)
  }

  const navigate = (to: View) => {
    if (to === viewRef.current) return
    const depth = (v: View) => (v === 'list' ? 0 : 1)
    setNavDir(depth(to) >= depth(viewRef.current) ? 1 : -1)
    setNavKey((k) => k + 1)
    if (rootRef.current?.contains(document.activeElement)) rootRef.current.focus({ preventScroll: true })
    viewRef.current = to
    setView(to)
    if (to !== 'main' && to !== 'list') setUnread((u) => ({ ...u, [to]: 0 }))
    if (to === 'main' && paused.current) {
      paused.current = false
      later(() => stepRef.current(), 450)
    }
  }

  const reset = () => {
    modeRef.current = mode
    if (rootRef.current?.contains(document.activeElement)) rootRef.current.focus({ preventScroll: true })
    setEpoch((e) => e + 1)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const onButton = target !== e.currentTarget && !!target.closest('button')
    const c = choiceRef.current
    if (view === 'main' && c && c.picked === null && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      const n = (cursor + (e.key === 'ArrowDown' ? 1 : -1) + c.opts.length) % c.opts.length
      setCursor(n)
      cardRefs.current[n]?.focus({ preventScroll: true })
      e.preventDefault()
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (onButton) return
      if (view !== 'main') return
      // 連打で選択肢を誤爆しないよう、出現直後の Enter は無視する
      if (c && c.picked === null) {
        if (performance.now() - c.at > 500) pick(cursor)
      } else advanceNow()
      e.preventDefault()
    } else if (e.key === 'Escape') {
      if (view === 'list') navigate('main')
      else navigate('list')
      e.preventDefault()
    }
  }

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return
    const b = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--px', (((e.clientX - b.left) / b.width) * 2 - 1).toFixed(3))
    e.currentTarget.style.setProperty('--py', (((e.clientY - b.top) / b.height) * 2 - 1).toFixed(3))
  }

  const badge = unread.family + unread.job
  const lastMsg = [...log].reverse().find((e) => e.k === 'msg' || e.k === 'stk')
  const preview = !lastMsg
    ? '…'
    : lastMsg.k === 'msg'
      ? `${lastMsg.who === 'me' ? 'あなた' : PEOPLE[lastMsg.who].name}: ${lastMsg.text}`
      : `${PEOPLE[lastMsg.who].name}がスタンプを送信`

  const { w, h } = dims
  const L = layout
  const gutter = Math.max(16, w * 0.035)
  const colW = Math.max(0, L.phoneL - gutter * 2)
  const titleSize = Math.max(26, Math.min(colW / 6.0, (h * 0.93 - 112) / 5.3, 128))
  const dateSize = titleSize * 0.78
  const memberSize = Math.min(Math.max(40, h * 0.085), 92)

  const pageVariants = {
    enter: (d: number) => (reduced ? { opacity: 0 } : { x: `${d * 100}%`, skewX: d * -8, opacity: 1 }),
    center: { x: '0%', skewX: 0, opacity: 1 },
    exit: (d: number) => (reduced ? { opacity: 0 } : { x: `${d * -35}%`, opacity: 0.2, skewX: 0 }),
  }
  const pageT: Transition = reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={onPointer}
      aria-label="ゲーム内スマホのグループトーク。Enter・Space で次へ、上下キーと Enter で返信を選択、Esc でトーク一覧"
      className={`relative h-full w-full overflow-hidden bg-[#0c0b0d] [container-type:size] font-['Noto_Sans_JP',sans-serif] text-[#f6f1e7] outline-none select-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-inset ${reduced ? 'spc-still' : ''}`}
    >
      <style>{CSS}</style>

      <HalftoneField pulseRef={pulseRef} reduced={reduced} />

      {/* 画面を横切る斜めの帯(流れる文字) */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[-30%] top-[66%] h-[17%] -rotate-[11deg] overflow-hidden bg-[#e3141e] shadow-[0_0_0_4px_#0c0b0d,0_0_0_7px_#f6f1e7]">
        <div className="flex h-1/2 items-center whitespace-nowrap" style={{ animation: reduced ? undefined : 'spc-marq 26s linear infinite' }}>
          {Array.from({ length: 2 }, (_, k) => (
            <span key={k} className="pr-8 font-['Space_Grotesk'] text-[max(14px,5cqh)] leading-none font-bold tracking-tighter text-transparent italic [-webkit-text-stroke:1.5px_#0c0b0d]">
              {'AFTER SCHOOL / GROUP TALK / 放課後作戦会議 / '.repeat(4)}
            </span>
          ))}
        </div>
        <div className="flex h-1/2 items-center bg-[#0c0b0d] whitespace-nowrap" style={{ animation: reduced ? undefined : 'spc-marq-r 34s linear infinite' }}>
          {Array.from({ length: 2 }, (_, k) => (
            <span key={k} className="pr-8 font-['Orbitron'] text-[max(9px,2.6cqh)] font-black tracking-[.4em] text-[#e3141e]">
              {'NEW MESSAGE ◆ 未読あり ◆ ONLINE ◆ '.repeat(6)}
            </span>
          ))}
        </div>
      </div>

      <Shards reduced={reduced} />

      {/* 左: スレッド名と日付(横幅があるときだけ) */}
      {L.wide && colW > 160 && (
        <div className="pointer-events-none absolute flex flex-col items-start" style={{ left: gutter, top: h * 0.07, width: colW, gap: titleSize * 0.12 }}>
          <span className="-rotate-6 -skew-x-12 bg-[#f6f1e7] px-2 py-[1px] font-['Orbitron'] font-black tracking-[.3em] text-[#0c0b0d] shadow-[3px_3px_0_#e3141e]" style={{ fontSize: Math.max(9, titleSize * 0.17) }}>
            GROUP TALK
          </span>
          <h2 className="sr-only">放課後作戦会議</h2>
          <div className="-rotate-[8deg] leading-none" style={{ marginLeft: titleSize * 0.1 }}>
            <Ransom text="放課後" size={`${titleSize}px`} reduced={reduced} delay={0.1} wrap={false} />
          </div>
          <div className="-mt-[0.1em] -rotate-[5deg] leading-none" style={{ marginLeft: titleSize * 0.45 }}>
            <Ransom text="作戦会議" size={`${titleSize}px`} reduced={reduced} delay={0.3} shadow={RED} wrap={false} />
          </div>
          <div className="mt-[0.3em] flex -rotate-[4deg] items-end gap-[0.18em] bg-[#0c0b0d] py-[0.08em] pr-[0.14em] pl-[0.1em] shadow-[0.07em_0.07em_0_#f6f1e7]" style={{ fontSize: dateSize }}>
            <span className="font-['Space_Grotesk'] leading-[0.8] font-bold tracking-tighter text-[#f6f1e7] italic [text-shadow:0.05em_0.05em_0_#e3141e]">11/06</span>
            <span className="flex flex-col items-start gap-[0.06em] pb-[0.02em]">
              <span className="bg-[#e3141e] px-[0.15em] text-[0.32em] leading-tight font-black text-[#f6f1e7] ring-2 ring-[#0c0b0d]">金</span>
              <span className="-skew-x-12 bg-[#f6f1e7] px-[0.2em] text-[0.26em] leading-tight font-black text-[#0c0b0d]">放課後</span>
            </span>
          </div>
          <div className="flex rotate-[3deg] items-center gap-2" style={{ fontSize: dateSize * 0.42, marginLeft: titleSize * 0.6 }}>
            <span className="bg-[#0c0b0d] px-[0.35em] font-['Orbitron'] font-black text-[#f6f1e7] tabular-nums ring-2 ring-[#f6f1e7] shadow-[0.12em_0.12em_0_#e3141e]">
              <motion.span key={minute} className="inline-block" initial={reduced ? false : { y: '-0.6em', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 700, damping: 22 }}>
                {fmtTime(minute)}
              </motion.span>
            </span>
            <span className="-skew-x-12 bg-[#e3141e] px-[0.3em] text-[0.5em] font-black text-[#f6f1e7]">{ended ? 'トーク終了' : 'トーク中'}</span>
          </div>
        </div>
      )}

      {/* 右: メンバー(さらに広いときだけ) */}
      {L.side && w - L.phoneR > memberSize * 3.2 && (
        <div className="pointer-events-none absolute" style={{ left: L.phoneR + Math.max(24, (w - L.phoneR) * 0.12), top: h * 0.1 }}>
          <Members typing={view === 'main' ? typing : null} size={memberSize} />
        </div>
      )}

      {/* スマホ */}
      <div className="absolute" style={{ left: L.cx - PW / 2, top: L.cy - PH / 2, width: PW, height: PH, scale: L.s }}>
        <div className="size-full" style={{ animation: reduced ? undefined : 'spc-float 5.5s ease-in-out infinite' }}>
          <div ref={shakeScope} className="size-full" style={{ perspective: 1100 }}>
            <div className="spc-tilt relative size-full [transform-style:preserve-3d]">
              {/* 奥の赤い板(パララックス) */}
              <div aria-hidden className="absolute inset-0 bg-[#e3141e]" style={{ clipPath: PHONE_SHAPE, transform: 'translate3d(16px, 12px, -40px)' }} />
              <div aria-hidden className="absolute inset-0" style={{ clipPath: PHONE_SHAPE, transform: 'translate3d(30px, 26px, -80px)', background: `radial-gradient(${WHITE} 30%, transparent 36%) 0 0 / 8px 8px`, opacity: 0.35 }} />
              {/* 本体 */}
              <div className="absolute inset-0 bg-[#f6f1e7]" style={{ clipPath: PHONE_SHAPE }}>
                <div className="absolute inset-[4px] bg-[#0c0b0d]" style={{ clipPath: PHONE_SHAPE }} />
                <div aria-hidden className="absolute top-[11px] left-1/2 h-[4px] w-[46px] -translate-x-1/2 -skew-x-[30deg] bg-[#2a2632]" />
                <div aria-hidden className="absolute top-[9px] left-[calc(50%+34px)] size-[8px] rotate-45 bg-[#2a2632]" />
                <div aria-hidden className="absolute bottom-[8px] left-1/2 h-[4px] w-[70px] -translate-x-1/2 -skew-x-[30deg] bg-[#f6f1e7]/60" />
                {/* 画面 */}
                <div className="absolute top-[24px] right-[10px] bottom-[20px] left-[10px] overflow-hidden" style={{ clipPath: SCREEN_SHAPE, background: DARK }}>
                  <div aria-hidden className="absolute inset-0" style={{ background: 'repeating-linear-gradient(-60deg, transparent 0 14px, rgba(227,20,30,.07) 14px 16px)' }} />
                  <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(${RED}40 30%, transparent 34%) 0 0 / 7px 7px`, maskImage: 'linear-gradient(160deg, transparent 50%, #000)', WebkitMaskImage: 'linear-gradient(160deg, transparent 50%, #000)' }} />
                  <div className="relative flex h-full flex-col">
                    <StatusBar minute={minute} />
                    <div className="relative min-h-0 flex-1 overflow-hidden">
                      <AnimatePresence initial={false} custom={navDir}>
                        <motion.div
                          key={view}
                          className="absolute inset-0"
                          style={{ background: view === 'list' ? BLACK : DARK }}
                          custom={navDir}
                          variants={pageVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={pageT}
                        >
                          {view === 'main' ? (
                            <ChatPage
                              log={log}
                              typing={typing}
                              lastWho={lastWhoState}
                              choice={choice}
                              cursor={cursor}
                              setCursor={setCursor}
                              onPick={pick}
                              cardRefs={cardRefs}
                              awaiting={awaiting}
                              mode={mode}
                              ended={ended}
                              onAdvance={advanceNow}
                              onBack={() => navigate('list')}
                              onReset={reset}
                              badge={badge}
                              slash={slash}
                              reduced={reduced}
                            />
                          ) : view === 'list' ? (
                            <ListPage unread={unread} preview={preview} minute={minute} onOpen={navigate} notes={notes} reduced={reduced} />
                          ) : (
                            <ThreadPage thread={view} notes={notes} onBack={() => navigate('list')} reduced={reduced} />
                          )}
                        </motion.div>
                      </AnimatePresence>
                      {/* ページ遷移で一瞬走る赤い帯 */}
                      <AnimatePresence>
                        {navKey > 0 && !reduced && (
                          <motion.div
                            key={navKey}
                            aria-hidden
                            className="pointer-events-none absolute inset-y-[-20%] z-30 w-[38%] bg-[#e3141e]"
                            style={{ skewX: -18, boxShadow: `14px 0 0 ${BLACK}, 20px 0 0 ${WHITE}` }}
                            initial={{ left: navDir > 0 ? '150%' : '-110%' }}
                            animate={{ left: navDir > 0 ? '-110%' : '150%' }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.7, 0, 0.3, 1] }}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <AnimatePresence>
                    {banner && (
                      <NotifyBanner
                        key={banner.id}
                        b={banner}
                        reduced={reduced}
                        onOpen={() => {
                          setBanner(null)
                          navigate(banner.thread)
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作 */}
      <div
        className={`absolute z-40 flex flex-wrap items-center gap-2 pb-[calc(var(--solo-footer-clearance,0px)_+_0.75rem)] ${L.wide ? '' : 'right-0 justify-center'}`}
        style={{ left: L.wide ? gutter : 0, bottom: 0 }}
      >
        <div role="group" aria-label="進行モード" className="flex -skew-x-12 bg-[#0c0b0d] shadow-[3px_3px_0_#e3141e] ring-2 ring-[#f6f1e7]">
          {(
            [
              ['auto', '自動'],
              ['manual', '手動'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 text-[12px] font-black outline-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-inset ${mode === m ? 'bg-[#f6f1e7] text-[#0c0b0d]' : 'text-[#f6f1e7] hover:bg-[#f6f1e7]/15'}`}
            >
              <span className="inline-block skew-x-12">{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={reset}
          className="-skew-x-12 bg-[#e3141e] px-3 py-1 text-[12px] font-black text-[#f6f1e7] shadow-[3px_3px_0_#f6f1e7] ring-2 ring-[#0c0b0d] outline-none hover:bg-[#f6f1e7] hover:text-[#0c0b0d] focus-visible:ring-[#f6f1e7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0b0d]"
        >
          <span className="inline-block skew-x-12">リセット</span>
        </button>
        {L.wide && (
          <span className="hidden items-center gap-2 font-mono text-[10px] font-bold @min-[56rem]:flex" aria-hidden>
            {[
              ['Enter', '次へ'],
              ['↑↓', '返信'],
              ['Esc', '一覧'],
            ].map(([k, l]) => (
              <span key={k} className="flex items-center gap-1">
                <kbd className="-skew-x-12 bg-[#f6f1e7] px-1.5 text-[#0c0b0d]">{k}</kbd>
                <span className="[text-shadow:1px_1px_0_#0c0b0d]">{l}</span>
              </span>
            ))}
          </span>
        )}
      </div>

      <AnimatePresence>{cutin && <CutIn key={cutin.id} data={cutin} reduced={reduced} />}</AnimatePresence>
    </div>
  )
}

const PHONE_SHAPE = 'polygon(18px 0, calc(100% - 34px) 0, 100% 24px, 100% calc(100% - 16px), calc(100% - 20px) 100%, 28px 100%, 0 calc(100% - 26px), 0 16px)'
const SCREEN_SHAPE = 'polygon(8px 0, calc(100% - 22px) 0, 100% 14px, 100% calc(100% - 8px), calc(100% - 10px) 100%, 16px 100%, 0 calc(100% - 14px), 0 8px)'
