import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'

/**
 * 赤・黒・白の3色だけで組んだスタイリッシュJRPG風のページ遷移。
 * - 遷移は「覆う(in) → 裏でページを差し替え → 抜ける(out)」の2段階。タイマーで段階を進め、各レイヤーは Motion で時間差をつける
 * - 斜め帯 / 破片 / ストライプ / ハーフトーン / インクの5パターン。破片は中心から放射する多角形を、隣同士で共有するギザギザ頂点で隙間なく敷き詰めた SVG
 * - どのパターンでも、覆いきる瞬間にハーフトーンとギザギザの破片、次ページ名の切り抜き文字が一瞬だけ重なる
 * - ハーフトーンの円 12×8 個は CSS keyframes の animation-delay だけで対角に広げる(要素数が多いので Motion を使わない)
 * - インクは素の WebGL + GLSL。ドメインワープした fbm ノイズをしきい値で切って墨がにじむように塗り、前線の手前に 45° の網点、抜けるときは網点の穴を開けて消える
 * - 見出しは文字ごとに背景色・角度・書体・大きさを擬似乱数で変える切り抜き文字(文字列から作るシードで固定)
 * - ←→ / 1〜4 キーでも切り替え(デモ内にフォーカスがあるときのみ)。useReducedMotion 時は 0.2 秒のクロスフェードだけ
 */

const RED = '#e3141e'
const BLACK = '#0c0b0d'
const WHITE = '#f6f1e7'

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

function Ransom({ text, size, shadow = BLACK, delay = 0, animateIn = true }: { text: string; size: string; shadow?: string; delay?: number; animateIn?: boolean }) {
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
      }
    })
  }, [text])

  return (
    <span aria-hidden className="inline-flex flex-wrap items-center" style={{ fontSize: size, filter: `drop-shadow(0.07em 0.07em 0 ${shadow})` }}>
      {letters.map((l, i) =>
        l.ch === ' ' ? (
          <span key={i} className="inline-block w-[0.3em]" />
        ) : (
          <motion.span
            key={i}
            className="inline-block leading-none"
            style={{ ...l.style, fontSize: `${l.scale}em`, padding: '0.1em 0.15em 0.13em', marginRight: '-0.02em', clipPath: l.clip }}
            initial={animateIn ? { opacity: 0, y: '-0.9em', rotate: l.rot - 50, scale: 1.8 } : false}
            animate={{ opacity: 1, y: `${l.dy}em`, rotate: l.rot, scale: 1 }}
            transition={{ type: 'spring', stiffness: 560, damping: 20, delay: delay + i * 0.045 }}
          >
            {l.ch}
          </motion.span>
        ),
      )}
    </span>
  )
}

/* ───────────── 装飾 SVG ───────────── */

function Figure({ className, color, accent }: { className?: string; color: string; accent: string }) {
  return (
    <svg viewBox="0 0 200 260" className={className} aria-hidden>
      <g fill={color}>
        <path d="M100 30C128 30 140 52 138 80 136 104 120 120 100 120 80 120 64 104 62 80 60 52 72 30 100 30Z" />
        <path d="M58 88 52 52 66 28 88 12 120 12 144 28 152 56 146 96 136 70 130 88 124 60 112 76 104 54 94 74 84 56 76 78 70 62Z" />
        <path d="M84 116h32l8 18 48 18 28 108H0l28-108 48-18Z" />
      </g>
      <path d="M76 136 100 200l24-64-12-4-12 30-12-30Z" fill={accent} />
      <path d="M80 84l18 3-16 5ZM120 84l-18 3 16 5Z" fill={accent} />
    </svg>
  )
}

const ic = (d: string) => (
  <svg viewBox="0 0 24 24" className="size-full" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
)
const ELEMENT_ICONS: Record<string, ReactNode> = {
  火炎: ic('M12 2c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-3 1-6 1-9z'),
  電撃: ic('M13 2 4 14h7l-1 8 9-12h-7z'),
  氷結: ic('M12 1l6 11-6 11-6-11zM12 6l-3 6 3 6 3-6z'),
  疾風: (
    <svg viewBox="0 0 24 24" className="size-full" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" aria-hidden>
      <path d="M2 8h13a3 3 0 1 0-3-3M2 13h17a3 3 0 1 1-3 3M2 18h8" />
    </svg>
  ),
  回復: ic('M9 2h6v7h7v6h-7v7H9v-7H2V9h7z'),
}
const ITEM_ICONS = [
  ic('M9 2h6v4l4 5v11H5V11l4-5z'),
  ic('M4 20C4 9 11 3 21 3c0 10-6 17-17 17z'),
  ic('M11 22a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM15 7l4-5 2 2-5 4z'),
  ic('M7 7a5 5 0 1 1 0 10A5 5 0 0 1 7 7zm4 4h11v3h-2v3h-3v-3h-6z'),
  ic('M2 6l7-3 6 3 7-3v15l-7 3-6-3-7 3z'),
  ic('M12 2l10 18H2zM7 14h10v6H7z'),
]

/* ───────────── ページの中身 ───────────── */

type Tone = 'dark' | 'light'
const PANEL: Record<Tone, string> = {
  dark: 'bg-[#0c0b0d] text-[#f6f1e7] hover:bg-[#f6f1e7] hover:text-[#0c0b0d]',
  light: 'bg-[#f6f1e7] text-[#0c0b0d] hover:bg-[#0c0b0d] hover:text-[#f6f1e7]',
}
const rowIn = (animateIn: boolean, i: number) =>
  animateIn
    ? { initial: { opacity: 0, x: 60, skewX: -18 }, animate: { opacity: 1, x: 0, skewX: 0 }, transition: { type: 'spring' as const, stiffness: 420, damping: 30, delay: 0.18 + i * 0.05 } }
    : {}

const MEMBERS = [
  { name: 'ヒバナ', role: '剣士', lv: 34, hp: [312, 340], sp: [88, 120] },
  { name: 'ミナト', role: '術士', lv: 33, hp: [205, 268], sp: [140, 196] },
  { name: 'サザレ', role: '拳士', lv: 33, hp: [298, 355], sp: [41, 92] },
  { name: 'トウマ', role: '射手', lv: 32, hp: [61, 251], sp: [77, 133] },
]
const HAIRS = [
  'M11 25 12 12 18 6 26 5 34 8 37 15 37 26 33 18 30 23 28 14 24 21 21 13 17 22Z',
  'M10 31C9 14 16 7 24 7s15 7 14 24h-4l-1-13H15l-1 13Z',
  'M12 23C12 12 18 7 25 7s11 5 11 12l8 7-5 4-4-9-15-4-4 7Z',
  'M8 27C8 12 15 5 24 5s16 7 16 22h-5c0-8-5-13-11-13s-11 5-11 13Z',
]
function Head({ hair }: { hair: number }) {
  return (
    <svg viewBox="0 0 48 48" className="size-full" aria-hidden>
      <path d="M5 48c2-10 10-13 19-13s17 3 19 13Z" fill="currentColor" />
      <ellipse cx="24" cy="24" rx="11" ry="13" fill="currentColor" />
      <path d={HAIRS[hair]} fill="currentColor" />
      <path d="M17 24l5 1-5 2ZM31 24l-5 1 5 2Z" fill={RED} />
    </svg>
  )
}

function PartyContent({ animateIn }: { animateIn: boolean }) {
  return (
    <ul className="flex flex-col gap-1.5 @min-[40rem]:gap-2.5">
      {MEMBERS.map((m, i) => {
        const pinch = m.hp[0] / m.hp[1] < 0.3
        return (
          <motion.li
            key={m.name}
            {...rowIn(animateIn, i)}
            className={`group flex items-center gap-2.5 py-1 pr-3 pl-1.5 transition-colors duration-100 ${PANEL.dark}`}
            style={{ clipPath: 'polygon(1.5% 0, 100% 8%, 98.5% 100%, 0 90%)', marginLeft: `${i * 3}%` }}
          >
            <span className="grid size-10 shrink-0 -skew-x-6 place-items-center overflow-hidden bg-[#e3141e] text-[#0c0b0d] @min-[40rem]:size-11">
              <Head hair={i} />
            </span>
            <span className="w-[4.5em] shrink-0 leading-tight">
              <span className="block text-[13px] font-black">{m.name}</span>
              <span className="block font-mono text-[9px] opacity-70">Lv{m.lv} / {m.role}</span>
            </span>
            <span className="grid min-w-0 flex-1 grid-cols-[1.6em_minmax(0,1fr)_3.4em] items-center gap-x-1.5 gap-y-1 font-mono text-[9px] font-bold">
              <span>HP</span>
              <span className="h-2 -skew-x-[30deg] bg-current/20">
                <span className={`block h-full ${pinch ? 'bg-[#e3141e]' : 'bg-current'}`} style={{ width: `${(m.hp[0] / m.hp[1]) * 100}%` }} />
              </span>
              <span className={`text-right tabular-nums ${pinch ? 'text-[#e3141e]' : ''}`}>{m.hp[0]}</span>
              <span>SP</span>
              <span className="h-2 -skew-x-[30deg] bg-current/20">
                <span className="block h-full bg-[#e3141e]" style={{ width: `${(m.sp[0] / m.sp[1]) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">{m.sp[0]}</span>
            </span>
            {pinch && <span className="hidden -rotate-6 bg-[#e3141e] px-1 text-[10px] font-black text-white @min-[30rem]:inline">ピンチ</span>}
          </motion.li>
        )
      })}
    </ul>
  )
}

const SKILLS = [
  { name: '紅蓮斬', el: '火炎', cost: 'SP 8', desc: '敵1体に炎の斬撃。まれに炎上させる。' },
  { name: '迅雷', el: '電撃', cost: 'SP 6', desc: '敵1体に雷を落とす。感電すると動きが止まる。' },
  { name: '氷華', el: '氷結', cost: 'SP 6', desc: '足元から氷の花を咲かせ、敵1体を凍てつかせる。' },
  { name: '疾風陣', el: '疾風', cost: 'SP 14', desc: '敵全体を風の刃で切り刻む。' },
  { name: '癒しの灯', el: '回復', cost: 'SP 4', desc: '味方1人の体力を小さく回復する。' },
]
function SkillContent({ animateIn }: { animateIn: boolean }) {
  const [sel, setSel] = useState(0)
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <ul className="flex min-h-0 flex-col gap-1">
        {SKILLS.map((s, i) => (
          <motion.li key={s.name} {...rowIn(animateIn, i)}>
            <button
              type="button"
              onMouseEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onClick={() => setSel(i)}
              aria-pressed={sel === i}
              className={`flex w-full items-center gap-2 px-3 py-1 text-left outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-[#e3141e] ${
                sel === i ? 'bg-[#e3141e] text-white' : PANEL.light
              }`}
              style={{ clipPath: sel === i ? 'polygon(0 12%, 4% 0, 100% 10%, 97% 100%, 3% 88%)' : 'polygon(0 0, 100% 6%, 99% 100%, 1% 94%)', marginLeft: `${(i % 2) * 4}%` }}
            >
              <span className="size-4 shrink-0">{ELEMENT_ICONS[s.el]}</span>
              <span className="flex-1 text-sm font-black tracking-wider">{s.name}</span>
              <span className="text-[10px] opacity-70">{s.el}</span>
              <span className="w-12 text-right font-mono text-[11px] font-bold">{s.cost}</span>
            </button>
          </motion.li>
        ))}
      </ul>
      <motion.p
        key={sel}
        initial={animateIn ? { opacity: 0, x: -14 } : false}
        animate={{ opacity: 1, x: 0 }}
        className="relative -rotate-1 border-l-4 border-[#e3141e] bg-[#0c0b0d] px-3 py-1.5 text-[11px] leading-snug text-[#f6f1e7] ring-1 ring-[#f6f1e7]/30"
      >
        <span className="mr-2 bg-[#f6f1e7] px-1 text-[10px] font-black text-[#0c0b0d]">効果</span>
        {SKILLS[sel].desc}
      </motion.p>
    </div>
  )
}

const ITEMS = [
  { name: '回復の小瓶', n: 5, note: '体力 小回復' },
  { name: '気付けの葉', n: 2, note: '気絶から復帰' },
  { name: '煙玉', n: 3, note: '戦闘から離脱' },
  { name: '古びた鍵', n: 1, note: 'どこかの扉の鍵' },
  { name: '手描きの地図', n: 1, note: '旧市街の抜け道' },
  { name: 'おにぎり', n: 8, note: 'SP 小回復' },
]
function ItemContent({ animateIn }: { animateIn: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-1.5 @min-[40rem]:gap-2">
      {ITEMS.map((it, i) => (
        <motion.li
          key={it.name}
          {...rowIn(animateIn, i)}
          className={`group flex items-center gap-2 px-2 py-1.5 transition-[background-color,color,rotate] duration-100 hover:-rotate-2 @min-[40rem]:py-2.5 ${PANEL.dark}`}
          style={{ clipPath: i % 2 ? 'polygon(0 6%, 100% 0, 97% 100%, 2% 96%)' : 'polygon(3% 0, 100% 5%, 100% 94%, 0 100%)' }}
        >
          <span className="grid size-8 shrink-0 rotate-6 place-items-center bg-[#e3141e] p-1.5 text-[#f6f1e7] group-hover:bg-[#0c0b0d]">{ITEM_ICONS[i]}</span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[12px] font-black">{it.name}</span>
            <span className="block truncate text-[9px] opacity-65">{it.note}</span>
          </span>
          <span className="font-['Playfair_Display'] text-lg font-black italic tabular-nums">×{it.n}</span>
        </motion.li>
      ))}
    </ul>
  )
}

const PLANS = [
  { time: '放課後', what: '図書室で調べもの', gain: '知恵 +2' },
  { time: '夕方', what: '路地裏の喫茶店でアルバイト', gain: '根気 +1' },
  { time: '夜', what: '屋上から街の灯りを眺める', gain: '度胸 +2' },
]
function PlanContent({ animateIn }: { animateIn: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <motion.div {...rowIn(animateIn, 0)} className="flex items-end gap-2">
        <span className="-rotate-6 font-['Space_Grotesk'] text-[clamp(40px,8cqw,84px)] leading-[.8] font-bold tracking-tighter text-[#f6f1e7] [text-shadow:4px_4px_0_#0c0b0d]">11/07</span>
        <span className="mb-1 rotate-3 bg-[#0c0b0d] px-2 py-0.5 text-lg font-black text-[#e3141e]">土</span>
        <span className="mb-1 grid size-9 rotate-12 place-items-center rounded-full bg-[#f6f1e7] text-[#e3141e]" aria-label="晴れ">
          <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden>
            <circle cx="12" cy="12" r="5" />
            <path d="M11 0h2v4h-2zM11 20h2v4h-2zM0 11h4v2H0zM20 11h4v2h-4zM3.5 2.1 6.4 5 5 6.4 2.1 3.5zM19 17.6l2.9 2.9-1.4 1.4-2.9-2.9zM2.1 20.5 5 17.6 6.4 19l-2.9 2.9zM17.6 5l2.9-2.9 1.4 1.4L19 6.4z" />
          </svg>
        </span>
      </motion.div>
      <ul className="flex flex-col gap-1.5">
        {PLANS.map((p, i) => (
          <motion.li
            key={p.time}
            {...rowIn(animateIn, i + 1)}
            className={`flex items-center gap-2 py-1.5 pr-3 transition-colors duration-100 ${PANEL.dark}`}
            style={{ clipPath: 'polygon(0 0, 100% 10%, 98% 100%, 1% 90%)' }}
          >
            <span className="w-16 shrink-0 -skew-x-12 bg-[#e3141e] py-1 text-center text-[11px] font-black text-[#f6f1e7]">{p.time}</span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{p.what}</span>
            <span className="shrink-0 font-mono text-[10px] font-bold text-[#e3141e]">{p.gain}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

/* ───────────── ページ定義 ───────────── */

type Theme = { bg: string; tone: Tone; shadow: string; badge: string; figure: string; figureAccent: string; stroke: string; deco?: ReactNode }

const PAGES: { title: string; en: string; tab: string; sub: string; theme: Theme; Body: (p: { animateIn: boolean }) => ReactNode }[] = [
  {
    title: '仲間たち',
    en: 'PARTY',
    tab: '仲間',
    sub: '共に夜を駆ける4人',
    Body: PartyContent,
    theme: {
      bg: `repeating-conic-gradient(from 3deg at 20% 82%, rgba(0,0,0,.17) 0deg 4deg, transparent 4deg 11deg), ${RED}`,
      tone: 'dark',
      shadow: BLACK,
      badge: 'bg-[#0c0b0d] text-[#f6f1e7]',
      figure: BLACK,
      figureAccent: WHITE,
      stroke: 'rgba(12,11,13,.45)',
    },
  },
  {
    title: '技の書',
    en: 'SKILLS',
    tab: 'スキル',
    sub: '覚えている技 5/8',
    Body: SkillContent,
    theme: {
      bg: `radial-gradient(circle at 88% 12%, rgba(227,20,30,.4), transparent 45%), ${BLACK}`,
      tone: 'light',
      shadow: RED,
      badge: 'bg-[#e3141e] text-[#f6f1e7]',
      figure: RED,
      figureAccent: BLACK,
      stroke: 'rgba(227,20,30,.55)',
      deco: (
        <div
          className="absolute -top-10 -right-10 size-[70%]"
          style={{
            backgroundImage: `radial-gradient(${RED} 32%, transparent 35%)`,
            backgroundSize: '11px 11px',
            maskImage: 'radial-gradient(circle at 100% 0%, #000 0, transparent 62%)',
            WebkitMaskImage: 'radial-gradient(circle at 100% 0%, #000 0, transparent 62%)',
          }}
        />
      ),
    },
  },
  {
    title: '持ち物',
    en: 'ITEMS',
    tab: '道具',
    sub: '鞄の中身 20/99',
    Body: ItemContent,
    theme: {
      bg: `repeating-linear-gradient(-62deg, transparent 0 22px, rgba(12,11,13,.07) 22px 25px), ${WHITE}`,
      tone: 'dark',
      shadow: RED,
      badge: 'bg-[#0c0b0d] text-[#f6f1e7]',
      figure: BLACK,
      figureAccent: RED,
      stroke: 'rgba(12,11,13,.25)',
      deco: <div className="absolute -bottom-[30%] -left-[8%] aspect-square w-[46%] rounded-full bg-[#e3141e]" />,
    },
  },
  {
    title: '予定表',
    en: 'SCHEDULE',
    tab: '予定',
    sub: '何をして過ごす?',
    Body: PlanContent,
    theme: {
      bg: `linear-gradient(112deg, ${BLACK} 0 46%, ${WHITE} 46% 47.6%, ${RED} 47.6% 100%)`,
      tone: 'dark',
      shadow: RED,
      badge: 'bg-[#f6f1e7] text-[#0c0b0d]',
      figure: RED,
      figureAccent: BLACK,
      stroke: 'rgba(246,241,231,.3)',
    },
  },
]

function Page({ index, animateIn }: { index: number; animateIn: boolean }) {
  const p = PAGES[index]
  const t = p.theme
  const Body = p.Body
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: t.bg }}>
      {t.deco}
      <span
        aria-hidden
        className="pointer-events-none absolute right-[-2%] -bottom-[0.12em] -rotate-6 font-['Space_Grotesk'] text-[clamp(84px,21cqw,280px)] leading-none font-bold tracking-tighter text-transparent italic select-none"
        style={{ WebkitTextStroke: `2px ${t.stroke}` }}
      >
        {p.en}
      </span>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[2%] hidden h-[86%] @min-[40rem]:block"
        initial={animateIn ? { x: -80, opacity: 0 } : false}
        animate={{ x: 0, opacity: 0.9 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 }}
      >
        <Figure className="h-full -rotate-3" color={t.figure} accent={t.figureAccent} />
      </motion.div>

      <div className="absolute inset-x-0 top-12 bottom-[calc(var(--solo-footer-clearance,0px)_+_4.4rem)] grid @min-[40rem]:bottom-[calc(var(--solo-footer-clearance,0px)_+_3rem)] grid-rows-[auto_minmax(0,1fr)] gap-2 px-4 @min-[40rem]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] @min-[40rem]:grid-rows-1 @min-[40rem]:gap-6 @min-[40rem]:px-8">
        <div className="flex min-w-0 flex-col justify-center gap-1.5 @min-[40rem]:gap-3 @min-[40rem]:pl-[4%]">
          <span className={`w-fit -rotate-6 px-2 py-0.5 font-mono text-[10px] font-bold tracking-[.25em] ${t.badge}`}>
            {String(index + 1).padStart(2, '0')} / {p.en}
          </span>
          <h2 aria-label={p.title} className="w-fit -rotate-[7deg] origin-left">
            <Ransom text={p.title} size="clamp(30px, 6.6cqw, 78px)" shadow={t.shadow} delay={0.06} animateIn={animateIn} />
          </h2>
          <p className="w-fit -rotate-3 bg-[#0c0b0d] px-2 py-0.5 text-[11px] font-black tracking-wider text-[#f6f1e7] shadow-[3px_3px_0_#e3141e] @min-[40rem]:text-[12px]">
            <span className="mr-1.5 inline-block size-2 rotate-45 bg-[#e3141e] align-middle" />
            {p.sub}
          </p>
        </div>
        <div className="spt-body min-h-0 min-w-0 self-center">
          <Body animateIn={animateIn} />
        </div>
      </div>
    </div>
  )
}

/* ───────────── 遷移オーバーレイ ───────────── */

type PatternId = 'slash' | 'shatter' | 'stripes' | 'dots' | 'ink'
type Stage = 'in' | 'out'
const PATTERNS: { id: PatternId; label: string }[] = [
  { id: 'slash', label: '斜め帯' },
  { id: 'shatter', label: '破片' },
  { id: 'stripes', label: 'ストライプ' },
  { id: 'dots', label: 'ハーフトーン' },
  { id: 'ink', label: 'インク' },
]
/** 各パターンの in / out の所要時間 (ms)。in の終わりで裏のページを差し替える */
const TIMING: Record<PatternId, { in: number; out: number }> = {
  slash: { in: 520, out: 560 },
  shatter: { in: 560, out: 760 },
  stripes: { in: 540, out: 560 },
  dots: { in: 540, out: 560 },
  ink: { in: 640, out: 660 },
}
const HOLD = 170
const EASE_IN = [0.75, 0, 0.25, 1] as const
const EASE_OUT = [0.6, 0, 0.2, 1] as const

function SlashBands({ stage }: { stage: Stage }) {
  const colors = [BLACK, RED, WHITE, RED, BLACK, RED]
  return (
    <div className="absolute inset-[-60%] flex rotate-[-20deg] flex-col">
      {colors.map((c, i) => {
        const dir = i % 2 ? 1 : -1
        return (
          <motion.div
            key={i}
            className="relative flex-1"
            style={{ background: c, boxShadow: `0 0 0 1px ${c}` }}
            initial={{ x: `${dir * 102}%` }}
            animate={{ x: stage === 'in' ? '0%' : `${-dir * 102}%` }}
            transition={{ duration: stage === 'in' ? 0.34 : 0.36, ease: stage === 'in' ? EASE_IN : EASE_OUT, delay: i * 0.035 }}
          >
            {c === WHITE && <div className="absolute inset-x-0 top-[38%] h-[6%] bg-[#0c0b0d]" />}
          </motion.div>
        )
      })}
    </div>
  )
}

function StripeBlinds({ stage }: { stage: Stage }) {
  const n = 14
  return (
    <div className="absolute inset-[-60%] flex rotate-[24deg] flex-col">
      {Array.from({ length: n }, (_, i) => {
        const dir = i % 2 ? 1 : -1
        const c = i % 4 === 3 ? WHITE : i % 2 ? BLACK : RED
        return (
          <motion.div
            key={i}
            className="flex-1"
            style={{ background: c, boxShadow: `0 0 0 1px ${c}` }}
            initial={{ x: `${dir * 102}%` }}
            animate={{ x: stage === 'in' ? '0%' : `${dir * 102}%` }}
            transition={{ duration: stage === 'in' ? 0.26 : 0.28, ease: stage === 'in' ? EASE_IN : EASE_OUT, delay: (stage === 'in' ? i : n - 1 - i) * 0.02 }}
          />
        )
      })}
    </div>
  )
}

/** 中心から放射状に割れた破片。隣り合う破片は同じギザギザ頂点を共有するので隙間ができない */
const SHARDS = (() => {
  const r = mulberry32(11)
  const C = { x: 86, y: 46 }
  const N = 11
  const R = 135
  const spokes = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 + (r() - 0.5) * 0.3
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    const jag = (t: number, o: number) => ({ x: C.x + ux * R * t - uy * o, y: C.y + uy * R * t + ux * o })
    return { a, p: { x: C.x + ux * R, y: C.y + uy * R }, j1: jag(0.12 + r() * 0.1, (r() - 0.5) * 12), j2: jag(0.34 + r() * 0.14, (r() - 0.5) * 16) }
  })
  const f = (q: { x: number; y: number }) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`
  return spokes.map((s, i) => {
    const n = spokes[(i + 1) % N]
    const mid = s.a + (((n.a - s.a + Math.PI * 2) % (Math.PI * 2)) / 2)
    return {
      points: [C, s.j1, s.j2, s.p, n.p, n.j2, n.j1].map(f).join(' '),
      dx: Math.cos(mid),
      dy: Math.sin(mid),
      color: [RED, BLACK, WHITE][i % 3],
      spin: (r() - 0.5) * 120,
      fall: r() * 0.18,
    }
  })
})()

function ShatterCover({ stage }: { stage: Stage }) {
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full overflow-visible">
      {SHARDS.map((s, i) => (
        <motion.polygon
          key={i}
          points={s.points}
          fill={s.color}
          stroke={BLACK}
          strokeWidth={2.5}
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={{ x: s.dx * 110, y: s.dy * 110, rotate: i % 2 ? 35 : -35 }}
          animate={stage === 'in' ? { x: 0, y: 0, rotate: 0, opacity: 1 } : { x: s.dx * 30, y: 130, rotate: s.spin, opacity: 0 }}
          transition={
            stage === 'in'
              ? { duration: 0.3, ease: [0.2, 0.9, 0.3, 1], delay: i * 0.024 }
              : { duration: 0.55, ease: [0.55, 0, 0.9, 0.4], delay: s.fall, opacity: { duration: 0.18, delay: s.fall + 0.36 } }
          }
        />
      ))}
    </svg>
  )
}

const DOT_COLS = 12
const DOT_ROWS = 8
function DotsCover({ stage }: { stage: Stage }) {
  const cells: ReactNode[] = []
  for (let y = 0; y < DOT_ROWS; y++)
    for (let x = 0; x < DOT_COLS; x++) {
      const d = (x + y) * 18
      const base = { transformBox: 'fill-box', transformOrigin: 'center' } as const
      cells.push(
        <g key={`${x}-${y}`}>
          <circle
            cx={x * 10 + 5}
            cy={y * 10 + 5}
            r={7.7}
            fill={(x + y) % 5 === 0 ? BLACK : RED}
            style={{ ...base, animation: `${stage === 'in' ? 'spt-pop' : 'spt-shrink'} 200ms cubic-bezier(.3,.7,.3,1) ${stage === 'in' ? d : d + 70}ms both` }}
          />
          <circle
            cx={x * 10 + 5}
            cy={y * 10 + 5}
            r={1.2 + ((x * 7 + y * 3) % 4) * 0.55}
            fill={BLACK}
            style={{ ...base, animation: `${stage === 'in' ? 'spt-pop' : 'spt-shrink'} 160ms ease-out ${stage === 'in' ? d + 110 : d}ms both` }}
          />
        </g>,
      )
    }
  return (
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
      {cells}
    </svg>
  )
}


/* ───────── インク(GLSL) ───────── */

const INK_VS = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'
/** ドメインワープした fbm ノイズを「しきい値」で切り、墨がにじむように画面を塗る。前線の手前は 45° のハーフトーン網点 */
const INK_FS = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uIn; uniform float uOut; uniform float uSeed; uniform float uDpr;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 q = vec2(uv.x * uRes.x / uRes.y, uv.y);
  float d = dot(uv - 0.5, normalize(vec2(1.0, 0.5))) + 0.5;
  vec2 w = vec2(fbm(q * 2.2 + uSeed), fbm(q * 2.2 - uSeed + 3.1));
  float n = fbm(q * 3.0 + w * 1.6 + uSeed);
  float drops = smoothstep(0.64, 0.7, fbm(q * 7.0 - uSeed * 2.0));
  float field = d + (n - 0.5) * 0.55;
  float fIn = uIn * 2.2 - 0.62;
  float fOut = uOut * 2.2 - 0.62;
  vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / (10.0 * uDpr);
  float cell = length(fract(g) - 0.5);
  float red = step(field, fIn + 0.1);
  float black = step(field, fIn - 0.04);
  float fringe = clamp(1.0 - (field - (fIn + 0.1)) / 0.22, 0.0, 1.0);
  float dotsR = (1.0 - red) * step(cell, fringe * 0.62) * step(0.02, fringe);
  float speck = (1.0 - red) * drops * step(field, fIn + 0.35);
  float white = red * (1.0 - black) * step(fIn + 0.02, field) * step(field, fIn + 0.05);
  vec3 col = mix(vec3(0.89, 0.08, 0.118), vec3(0.047, 0.043, 0.051), black);
  col = mix(col, vec3(0.965, 0.945, 0.906), white);
  float a = max(max(red, dotsR), speck);
  float hole = step(field, fOut);
  float ofr = clamp(1.0 - (field - fOut) / 0.2, 0.0, 1.0) * (1.0 - hole);
  float punch = step(cell, ofr * 0.62) * step(0.02, ofr);
  a *= 1.0 - max(hole, punch);
  gl_FragColor = vec4(col * a, a);
}`

type InkGL = { ctx: WebGLRenderingContext; u: Record<'uRes' | 'uIn' | 'uOut' | 'uSeed' | 'uDpr', WebGLUniformLocation | null>; w: number; h: number; dpr: number }

function InkCover({ stage, inMs, outMs }: { stage: Stage; inMs: number; outMs: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const glRef = useRef<InkGL | null>(null)
  const prog = useRef({ in: 0, out: 0 })
  const seed = useMemo(() => Math.random() * 40, [])
  const [failed, setFailed] = useState(false)

  const draw = () => {
    const g = glRef.current
    if (!g) return
    const { ctx, u } = g
    ctx.viewport(0, 0, g.w, g.h)
    ctx.clearColor(0, 0, 0, 0)
    ctx.clear(ctx.COLOR_BUFFER_BIT)
    ctx.uniform2f(u.uRes, g.w, g.h)
    ctx.uniform1f(u.uIn, prog.current.in)
    ctx.uniform1f(u.uOut, prog.current.out)
    ctx.uniform1f(u.uSeed, seed)
    ctx.uniform1f(u.uDpr, g.dpr)
    ctx.drawArrays(ctx.TRIANGLES, 0, 3)
  }

  // WebGL の初期化(遷移ごとに canvas を作り、終わったらコンテキストごと破棄。StrictMode の再実行でも毎回新しい canvas)
  useEffect(() => {
    const host = ref.current!
    const canvas = document.createElement('canvas')
    canvas.className = 'absolute inset-0 size-full'
    host.appendChild(canvas)
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    const w = Math.max(1, Math.round(host.clientWidth * dpr))
    const h = Math.max(1, Math.round(host.clientHeight * dpr))
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!ctx) {
      canvas.remove()
      setFailed(true)
      return
    }
    const sh = (type: number, src: string) => {
      const s = ctx.createShader(type)!
      ctx.shaderSource(s, src)
      ctx.compileShader(s)
      return s
    }
    const pr = ctx.createProgram()!
    ctx.attachShader(pr, sh(ctx.VERTEX_SHADER, INK_VS))
    ctx.attachShader(pr, sh(ctx.FRAGMENT_SHADER, INK_FS))
    ctx.linkProgram(pr)
    if (!ctx.getProgramParameter(pr, ctx.LINK_STATUS)) {
      canvas.remove()
      setFailed(true)
      return
    }
    ctx.useProgram(pr)
    const buf = ctx.createBuffer()
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf)
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW)
    const loc = ctx.getAttribLocation(pr, 'p')
    ctx.enableVertexAttribArray(loc)
    ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0)
    const u = Object.fromEntries((['uRes', 'uIn', 'uOut', 'uSeed', 'uDpr'] as const).map((k) => [k, ctx.getUniformLocation(pr, k)])) as InkGL['u']
    glRef.current = { ctx, u, w, h, dpr }
    draw()
    return () => {
      glRef.current = null
      ctx.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 段階ごとに 0→1 を進める
  useEffect(() => {
    if (failed) return
    let raf = 0
    const start = performance.now()
    const dur = stage === 'in' ? inMs : outMs
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur)
      if (stage === 'in') prog.current.in = ease(k)
      else prog.current.out = ease(k)
      draw()
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, failed])

  if (failed) return <SlashBands stage={stage} />
  return <div ref={ref} className="absolute inset-0" />
}

/** 全パターン共通: 覆いきる瞬間に重なるギザギザ破片 */
const ACCENTS = (() => {
  const r = mulberry32(5)
  const spots = [
    [18, 22], [44, 80], [70, 14], [122, 24], [140, 70], [100, 88], [8, 64], [150, 40],
  ]
  return spots.map(([cx, cy], k) => {
    const n = 5 + Math.floor(r() * 3)
    const size = 6 + r() * 9
    const pts = Array.from({ length: n * 2 }, (_, i) => {
      const a = (i / (n * 2)) * Math.PI * 2 + r() * 0.3
      const rad = size * (i % 2 ? 0.35 + r() * 0.2 : 0.8 + r() * 0.4)
      return `${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`
    }).join(' ')
    const dx = cx - 80
    const dy = cy - 50
    const len = Math.hypot(dx, dy) || 1
    return { pts, color: [WHITE, BLACK, RED][k % 3], dx: dx / len, dy: dy / len, rot: (r() - 0.5) * 200 }
  })
})()

function Accents({ stage, inMs }: { stage: Stage; inMs: number }) {
  return (
    <>
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(12,11,13,.6) 0 33%, transparent 36%)',
          backgroundSize: '9px 9px',
          maskImage: 'linear-gradient(115deg, transparent 15%, #000 45%, #000 55%, transparent 85%)',
          WebkitMaskImage: 'linear-gradient(115deg, transparent 15%, #000 45%, #000 55%, transparent 85%)',
        }}
        initial={{ opacity: 0, x: '-20%' }}
        animate={stage === 'in' ? { opacity: 1, x: '0%' } : { opacity: 0, x: '20%' }}
        transition={stage === 'in' ? { duration: 0.2, delay: (inMs * 0.6) / 1000 } : { duration: 0.22 }}
      />
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full overflow-visible">
        {ACCENTS.map((a, i) => (
          <motion.polygon
            key={i}
            points={a.pts}
            fill={a.color}
            stroke={a.color === BLACK ? RED : BLACK}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={{ scale: 0, rotate: -90 }}
            animate={stage === 'in' ? { scale: 1, rotate: 0, x: 0, y: 0, opacity: 1 } : { scale: 0.6, rotate: a.rot, x: a.dx * 70, y: a.dy * 70, opacity: 0 }}
            transition={
              stage === 'in'
                ? { type: 'spring', stiffness: 700, damping: 18, delay: (inMs * 0.55) / 1000 + i * 0.02 }
                : { duration: 0.4, ease: [0.3, 0, 0.8, 0.5], delay: i * 0.015 }
            }
          />
        ))}
      </svg>
    </>
  )
}

function Overlay({ pattern, stage, to }: { pattern: PatternId; stage: Stage; to: number }) {
  const inMs = TIMING[pattern].in
  return (
    <div className="absolute inset-0 z-40 overflow-hidden" aria-hidden>
      {pattern === 'slash' && <SlashBands stage={stage} />}
      {pattern === 'shatter' && <ShatterCover stage={stage} />}
      {pattern === 'stripes' && <StripeBlinds stage={stage} />}
      {pattern === 'dots' && <DotsCover stage={stage} />}
      {pattern === 'ink' && <InkCover stage={stage} inMs={TIMING.ink.in} outMs={TIMING.ink.out} />}
      <Accents stage={stage} inMs={inMs} />
      <motion.div
        className="absolute inset-0 grid place-items-center"
        initial={{ opacity: 0, scale: 1.9, rotate: -22 }}
        animate={
          stage === 'in'
            ? { opacity: 1, scale: 1, rotate: -8, x: 0, transition: { type: 'spring', stiffness: 640, damping: 22, delay: (inMs * 0.62) / 1000 } }
            : { opacity: 0, scale: 1.12, rotate: -8, x: 120, transition: { duration: 0.18, ease: 'easeIn', delay: 0.04 } }
        }
      >
        <div className="flex flex-col items-start gap-1">
          <span className="-skew-x-12 bg-[#0c0b0d] px-2 font-mono text-[11px] font-bold tracking-[.3em] text-[#f6f1e7] ring-2 ring-[#f6f1e7]">NEXT ▶</span>
          <Ransom text={PAGES[to].en} size="clamp(40px, 10cqw, 120px)" shadow={BLACK} animateIn={false} />
        </div>
      </motion.div>
    </div>
  )
}

/* ───────────── 本体 ───────────── */

const CSS = `
@keyframes spt-pop { from { transform: scale(0) } to { transform: scale(1) } }
@keyframes spt-shrink { from { transform: scale(1) } to { transform: scale(0) } }
@container (min-width: 64rem) and (min-height: 620px) { .spt-body { zoom: 1.35 } }
`

type Tx = { key: number; pattern: PatternId; stage: Stage; to: number }

export function SlashPageTransition() {
  const reduced = !!useReducedMotion()
  const [page, setPage] = useState(0)
  const [pattern, setPattern] = useState<PatternId | 'random'>('slash')
  const [tx, setTx] = useState<Tx | null>(null)
  const busy = useRef(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])

  const go = (to: number) => {
    const target = (to + PAGES.length) % PAGES.length
    if (target === page || busy.current) return
    if (reduced) {
      setPage(target)
      return
    }
    busy.current = true
    const p = pattern === 'random' ? PATTERNS[Math.floor(Math.random() * PATTERNS.length)].id : pattern
    const t = TIMING[p]
    setTx({ key: Date.now(), pattern: p, stage: 'in', to: target })
    timers.current.push(
      window.setTimeout(() => {
        setPage(target)
        setTx((s) => (s ? { ...s, stage: 'out' } : s))
      }, t.in + HOLD),
      window.setTimeout(() => {
        setTx(null)
        busy.current = false
      }, t.in + HOLD + t.out + 40),
    )
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') go(page + 1)
    else if (e.key === 'ArrowLeft') go(page - 1)
    else if (/^[1-4]$/.test(e.key)) go(Number(e.key) - 1)
    else return
    e.preventDefault()
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="ページ遷移デモ。左右キーでページを切り替え"
      className="relative h-full w-full overflow-hidden bg-[#0c0b0d] [container-type:size] font-['Noto_Sans_JP',sans-serif] text-[#f6f1e7] outline-none select-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-inset"
    >
      <style>{CSS}</style>

      {reduced ? (
        <AnimatePresence initial={false}>
          <motion.div key={page} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Page index={page} animateIn={false} />
          </motion.div>
        </AnimatePresence>
      ) : (
        <Page key={page} index={page} animateIn />
      )}

      {/* タブ */}
      <nav aria-label="ページ" className="absolute inset-x-0 top-0 z-30 flex items-center gap-1.5 px-3 pt-2.5 @min-[40rem]:gap-2 @min-[40rem]:px-5">
        <span className="mr-1 hidden -rotate-6 bg-[#e3141e] px-1.5 font-['Orbitron'] text-[11px] font-black tracking-widest text-[#0c0b0d] ring-2 ring-[#0c0b0d] @min-[34rem]:inline">MENU</span>
        {PAGES.map((p, i) => (
          <button
            key={p.en}
            type="button"
            onClick={() => go(i)}
            aria-current={page === i ? 'page' : undefined}
            className={`-skew-x-12 px-2.5 py-1 text-[11px] font-black tracking-wider transition-[transform,background-color,color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#e3141e] @min-[40rem]:px-4 @min-[40rem]:text-xs ${
              page === i
                ? 'scale-110 bg-[#f6f1e7] text-[#0c0b0d] shadow-[3px_3px_0_#e3141e]'
                : 'bg-[#0c0b0d] text-[#f6f1e7]/75 ring-1 ring-[#f6f1e7]/25 hover:-translate-y-0.5 hover:text-[#f6f1e7]'
            }`}
          >
            <span className="inline-block skew-x-12">{p.tab}</span>
          </button>
        ))}
      </nav>

      {/* 遷移パターン */}
      <div className="absolute bottom-[calc(var(--solo-footer-clearance,0px)_+_0.6rem)] left-3 z-30 flex flex-wrap items-center gap-1.5 @min-[40rem]:left-5">
        <span className="-skew-x-12 bg-[#e3141e] px-1.5 py-0.5 text-[10px] font-black text-[#f6f1e7] ring-2 ring-[#0c0b0d]">
          <span className="inline-block skew-x-12">遷移</span>
        </span>
        {[...PATTERNS, { id: 'random' as const, label: 'ランダム' }].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPattern(p.id)}
            aria-pressed={pattern === p.id}
            className={`-skew-x-12 px-2 py-0.5 text-[10px] font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#e3141e] @min-[40rem]:text-[11px] ${
              pattern === p.id ? 'bg-[#0c0b0d] text-[#f6f1e7] shadow-[2px_2px_0_#e3141e]' : 'bg-[#f6f1e7] text-[#0c0b0d] ring-1 ring-[#0c0b0d] hover:bg-[#0c0b0d] hover:text-[#f6f1e7]'
            }`}
          >
            <span className="inline-block skew-x-12">{p.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => go(page + 1)}
          className="ml-1 -skew-x-12 bg-[#e3141e] px-3 py-0.5 text-[11px] font-black text-[#f6f1e7] ring-2 ring-[#0c0b0d] outline-none hover:bg-[#0c0b0d] focus-visible:ring-[#f6f1e7]"
        >
          <span className="inline-block skew-x-12">次へ ▶</span>
        </button>
        <span className="hidden bg-[#0c0b0d] px-1 font-mono text-[9px] tracking-wider text-[#f6f1e7] @min-[52rem]:inline">← → / 1-4 KEY</span>
      </div>

      {tx && <Overlay key={tx.key} pattern={tx.pattern} stage={tx.stage} to={tx.to} />}
      <p className="sr-only" aria-live="polite">
        {PAGES[page].title}
      </p>
    </div>
  )
}
