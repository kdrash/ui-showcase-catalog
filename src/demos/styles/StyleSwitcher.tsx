import { useId, useState } from 'react'
import { AnimatePresence, motion, type Transition } from 'motion/react'

/**
 * Style Switcher
 * 同じプロフィールカードを、セグメントコントロールでデザイン言語ごと切り替える。
 *  ・色 / 角丸 / 枠線 / 影 / blur / 回転 を Motion の animate で補間
 *  ・box-shadow は全テーマで「外側2つ + inset 2つ」の同じ構造に揃える → 異なる影同士も滑らかに補間できる
 *  ・セグメントの白いピルは layoutId、ヘッダーの並び替え(横並び⇄中央寄せ)は layout アニメーション
 *  ・背景はテーマごとのレイヤーをクロスフェード(グラデーション同士は直接補間できないため)
 */
const NONE = '0px 0px 0px 0px rgba(0,0,0,0)'
const sh = (a = NONE, b = NONE, c = NONE, d = NONE) => `${a}, ${b}, inset ${c}, inset ${d}`
const CLEAR = 'rgba(0,0,0,0)'

type Box = { bg: string; radius: number; shadow: string; border: string; bw: number; color?: string }

interface Theme {
  label: string
  stage: string
  font: string
  nameFont?: string
  upper?: boolean
  centered?: boolean
  muted: string
  nameShadow: string
  card: Box & { color: string; blur: string; rotate: number }
  avatar: Box & { color: string }
  stat: Box
  track: { off: string; on: string; knob: string; radius: number; knobRadius: number }
  bar: { bg: string; fill: string }
  primary: Box & { color: string }
  secondary: Box & { color: string }
  tokens: [string, string][]
}

const THEMES = {
  minimal: {
    label: 'Minimal',
    stage: '#fafafa',
    font: 'Inter, sans-serif',
    muted: '#737373',
    nameShadow: '0px 0px 0px rgba(0,0,0,0)',
    card: { bg: '#ffffff', color: '#0a0a0a', radius: 12, bw: 1, border: '#e5e5e5', shadow: sh('0px 1px 2px 0px rgba(0,0,0,0.05)'), blur: 'blur(0px)', rotate: 0 },
    avatar: { bg: '#f4f4f5', color: '#404040', radius: 999, bw: 1, border: '#e5e5e5', shadow: sh() },
    stat: { bg: '#fafafa', radius: 8, bw: 1, border: '#f0f0f0', shadow: sh() },
    track: { off: '#e5e5e5', on: '#0a0a0a', knob: '#ffffff', radius: 999, knobRadius: 999 },
    bar: { bg: '#e5e5e5', fill: '#0a0a0a' },
    primary: { bg: '#0a0a0a', color: '#ffffff', radius: 8, bw: 1, border: '#0a0a0a', shadow: sh() },
    secondary: { bg: '#ffffff', color: '#0a0a0a', radius: 8, bw: 1, border: '#e5e5e5', shadow: sh() },
    tokens: [
      ['background', '#ffffff'],
      ['border', '1px solid #e5e5e5'],
      ['border-radius', '12px'],
      ['box-shadow', '0 1px 2px rgba(0,0,0,.05)'],
      ['accent', '#0a0a0a'],
      ['font-family', 'Inter'],
    ],
  },
  glass: {
    label: 'Glass',
    stage:
      'radial-gradient(circle at 20% 25%, #ec4899 0, transparent 40%), radial-gradient(circle at 82% 30%, #8b5cf6 0, transparent 42%), radial-gradient(circle at 45% 88%, #06b6d4 0, transparent 45%), linear-gradient(135deg,#1e1b4b,#312e81)',
    font: 'Inter, sans-serif',
    muted: 'rgba(255,255,255,0.65)',
    nameShadow: '0px 0px 0px rgba(0,0,0,0)',
    card: {
      bg: 'rgba(255,255,255,0.12)',
      color: '#ffffff',
      radius: 24,
      bw: 1,
      border: 'rgba(255,255,255,0.3)',
      shadow: sh('0px 8px 32px 0px rgba(31,38,135,0.37)', NONE, '0px 1px 0px 0px rgba(255,255,255,0.35)'),
      blur: 'blur(18px)',
      rotate: 0,
    },
    avatar: { bg: 'rgba(255,255,255,0.2)', color: '#ffffff', radius: 999, bw: 2, border: 'rgba(255,255,255,0.45)', shadow: sh() },
    stat: { bg: 'rgba(255,255,255,0.1)', radius: 16, bw: 1, border: 'rgba(255,255,255,0.18)', shadow: sh() },
    track: { off: 'rgba(255,255,255,0.15)', on: 'rgba(255,255,255,0.5)', knob: '#ffffff', radius: 999, knobRadius: 999 },
    bar: { bg: 'rgba(255,255,255,0.2)', fill: '#ffffff' },
    primary: { bg: '#ffffff', color: '#312e81', radius: 12, bw: 1, border: CLEAR, shadow: sh('0px 8px 24px 0px rgba(0,0,0,0.25)') },
    secondary: { bg: 'rgba(255,255,255,0.1)', color: '#ffffff', radius: 12, bw: 1, border: 'rgba(255,255,255,0.3)', shadow: sh() },
    tokens: [
      ['background', 'rgba(255,255,255,.12)'],
      ['backdrop-filter', 'blur(18px)'],
      ['border', '1px solid rgba(255,255,255,.3)'],
      ['border-radius', '24px'],
      ['box-shadow', '0 8px 32px rgba(31,38,135,.37)'],
      ['stage', 'vivid blurred color blobs'],
    ],
  },
  neu: {
    label: 'Neumorphism',
    stage: '#e0e5ec',
    font: 'Inter, sans-serif',
    centered: true,
    muted: '#8b93a7',
    nameShadow: '0px 0px 0px rgba(0,0,0,0)',
    card: {
      bg: '#e0e5ec',
      color: '#3d4468',
      radius: 28,
      bw: 0,
      border: CLEAR,
      shadow: sh('9px 9px 16px 0px rgba(163,177,198,0.6)', '-9px -9px 16px 0px rgba(255,255,255,0.5)'),
      blur: 'blur(0px)',
      rotate: 0,
    },
    avatar: {
      bg: '#e0e5ec',
      color: '#6c63ff',
      radius: 999,
      bw: 0,
      border: CLEAR,
      shadow: sh(NONE, NONE, '4px 4px 8px 0px rgba(163,177,198,0.6)', '-4px -4px 8px 0px rgba(255,255,255,0.5)'),
    },
    stat: {
      bg: '#e0e5ec',
      radius: 16,
      bw: 0,
      border: CLEAR,
      shadow: sh(NONE, NONE, '3px 3px 6px 0px rgba(163,177,198,0.6)', '-3px -3px 6px 0px rgba(255,255,255,0.5)'),
    },
    track: { off: '#d1d9e6', on: '#6c63ff', knob: '#ffffff', radius: 999, knobRadius: 999 },
    bar: { bg: '#d1d9e6', fill: '#6c63ff' },
    primary: {
      bg: '#6c63ff',
      color: '#ffffff',
      radius: 16,
      bw: 0,
      border: CLEAR,
      shadow: sh('5px 5px 10px 0px rgba(163,177,198,0.7)', '-5px -5px 10px 0px rgba(255,255,255,0.7)'),
    },
    secondary: {
      bg: '#e0e5ec',
      color: '#6c63ff',
      radius: 16,
      bw: 0,
      border: CLEAR,
      shadow: sh('5px 5px 10px 0px rgba(163,177,198,0.6)', '-5px -5px 10px 0px rgba(255,255,255,0.6)'),
    },
    tokens: [
      ['background', '#e0e5ec  (= stage)'],
      ['border-radius', '28px'],
      ['box-shadow', '9px 9px 16px rgba(163,177,198,.6),'],
      ['', '-9px -9px 16px rgba(255,255,255,.5)'],
      ['pressed', 'same values with inset'],
      ['accent', '#6c63ff'],
    ],
  },
  brutal: {
    label: 'Brutalism',
    stage: 'radial-gradient(rgba(0,0,0,0.18) 1.2px, transparent 1.2px) 0 0 / 16px 16px, #ffde59',
    font: "'Space Grotesk', Inter, sans-serif",
    muted: '#333333',
    nameShadow: '0px 0px 0px rgba(0,0,0,0)',
    card: { bg: '#ffffff', color: '#000000', radius: 10, bw: 3, border: '#000000', shadow: sh('8px 8px 0px 0px rgba(0,0,0,1)'), blur: 'blur(0px)', rotate: -1.5 },
    avatar: { bg: '#ff90e8', color: '#000000', radius: 8, bw: 3, border: '#000000', shadow: sh('3px 3px 0px 0px rgba(0,0,0,1)') },
    stat: { bg: '#a3e635', radius: 6, bw: 2.5, border: '#000000', shadow: sh('3px 3px 0px 0px rgba(0,0,0,1)') },
    track: { off: '#ffffff', on: '#a3e635', knob: '#000000', radius: 0, knobRadius: 0 },
    bar: { bg: '#ffffff', fill: '#ff90e8' },
    primary: { bg: '#ff90e8', color: '#000000', radius: 6, bw: 3, border: '#000000', shadow: sh('4px 4px 0px 0px rgba(0,0,0,1)') },
    secondary: { bg: '#ffffff', color: '#000000', radius: 6, bw: 3, border: '#000000', shadow: sh('4px 4px 0px 0px rgba(0,0,0,1)') },
    tokens: [
      ['background', '#ffffff'],
      ['border', '3px solid #000'],
      ['border-radius', '10px'],
      ['box-shadow', '8px 8px 0 #000'],
      ['transform', 'rotate(-1.5deg)'],
      ['font-family', "'Space Grotesk'"],
    ],
  },
  clay: {
    label: 'Clay',
    stage: 'linear-gradient(135deg,#ffe4f1 0%,#ece4ff 50%,#dcf3ff 100%)',
    font: "ui-rounded, 'Hiragino Maru Gothic ProN', Inter, sans-serif",
    centered: true,
    muted: '#8f84b5',
    nameShadow: '0px 0px 0px rgba(0,0,0,0)',
    card: {
      bg: '#fdfaff',
      color: '#4b3f72',
      radius: 36,
      bw: 0,
      border: CLEAR,
      shadow: sh('0px 30px 60px -15px rgba(150,120,255,0.5)', NONE, '-10px -10px 20px 0px rgba(170,150,255,0.3)', '10px 10px 20px 0px rgba(255,255,255,0.95)'),
      blur: 'blur(0px)',
      rotate: 0,
    },
    avatar: {
      bg: '#ffb3d1',
      color: '#4b3f72',
      radius: 999,
      bw: 0,
      border: CLEAR,
      shadow: sh('0px 10px 20px -6px rgba(255,120,180,0.5)', NONE, '-5px -5px 10px 0px rgba(219,90,150,0.4)', '5px 5px 10px 0px rgba(255,255,255,0.75)'),
    },
    stat: {
      bg: '#b8f2d0',
      radius: 20,
      bw: 0,
      border: CLEAR,
      shadow: sh('0px 10px 20px -6px rgba(80,200,140,0.45)', NONE, '-5px -5px 10px 0px rgba(60,170,110,0.35)', '5px 5px 10px 0px rgba(255,255,255,0.75)'),
    },
    track: { off: '#efe9fd', on: '#b8f2d0', knob: '#ffffff', radius: 999, knobRadius: 999 },
    bar: { bg: '#efe9fd', fill: '#a78bfa' },
    primary: {
      bg: '#a78bfa',
      color: '#ffffff',
      radius: 999,
      bw: 0,
      border: CLEAR,
      shadow: sh('0px 10px 20px -6px rgba(139,92,246,0.55)', NONE, '-5px -5px 10px 0px rgba(91,33,182,0.45)', '5px 5px 10px 0px rgba(255,255,255,0.6)'),
    },
    secondary: {
      bg: '#ffffff',
      color: '#7c5cf0',
      radius: 999,
      bw: 0,
      border: CLEAR,
      shadow: sh('0px 10px 20px -6px rgba(150,120,255,0.35)', NONE, '-5px -5px 10px 0px rgba(170,150,255,0.35)', '5px 5px 10px 0px rgba(255,255,255,0.75)'),
    },
    tokens: [
      ['background', '#fdfaff'],
      ['border-radius', '36px'],
      ['box-shadow', '0 30px 60px -15px rgba(150,120,255,.5),'],
      ['', 'inset -10px -10px 20px rgba(170,150,255,.3),'],
      ['', 'inset 10px 10px 20px rgba(255,255,255,.95)'],
      ['palette', '#ffb3d1 #b8f2d0 #a78bfa'],
    ],
  },
  cyber: {
    label: 'Cyberpunk',
    stage:
      'linear-gradient(rgba(0,240,255,0.07) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgba(255,42,109,0.07) 1px, transparent 1px) 0 0 / 24px 24px, #07070d',
    font: "'JetBrains Mono', monospace",
    nameFont: 'Orbitron, sans-serif',
    upper: true,
    muted: '#ff2a6d',
    nameShadow: '0px 0px 8px rgba(0,240,255,0.9)',
    card: {
      bg: '#0d0d1a',
      color: '#d1f7ff',
      radius: 2,
      bw: 1,
      border: '#00f0ff',
      shadow: sh('0px 0px 24px 0px rgba(0,240,255,0.45)', '0px 0px 48px 0px rgba(255,42,109,0.25)', '0px 0px 16px 0px rgba(0,240,255,0.15)'),
      blur: 'blur(0px)',
      rotate: 0,
    },
    avatar: { bg: '#0d0d1a', color: '#fcee0a', radius: 2, bw: 1, border: '#ff2a6d', shadow: sh('0px 0px 12px 0px rgba(255,42,109,0.6)') },
    stat: { bg: 'rgba(0,240,255,0.06)', radius: 0, bw: 1, border: 'rgba(0,240,255,0.5)', shadow: sh() },
    track: { off: '#1f2233', on: '#fcee0a', knob: '#0d0d1a', radius: 0, knobRadius: 0 },
    bar: { bg: '#1f2233', fill: '#00f0ff' },
    primary: { bg: '#fcee0a', color: '#000000', radius: 0, bw: 1, border: '#fcee0a', shadow: sh('0px 0px 16px 0px rgba(252,238,10,0.6)') },
    secondary: { bg: 'rgba(255,42,109,0.08)', color: '#ff2a6d', radius: 0, bw: 1, border: '#ff2a6d', shadow: sh('0px 0px 12px 0px rgba(255,42,109,0.35)') },
    tokens: [
      ['background', '#0d0d1a'],
      ['border', '1px solid #00f0ff'],
      ['border-radius', '2px'],
      ['box-shadow', '0 0 24px rgba(0,240,255,.45)'],
      ['font-family', 'Orbitron / JetBrains Mono'],
      ['accents', '#00f0ff #ff2a6d #fcee0a'],
    ],
  },
  dark: {
    label: 'Dark Tech',
    stage: 'radial-gradient(ellipse at 50% 0%, rgba(94,106,210,0.35), transparent 60%), #08090a',
    font: 'Inter, sans-serif',
    muted: '#8a8f98',
    nameShadow: '0px 0px 0px rgba(0,0,0,0)',
    card: {
      bg: '#0f1012',
      color: '#f7f8f8',
      radius: 12,
      bw: 1,
      border: 'rgba(255,255,255,0.08)',
      shadow: sh('0px 24px 48px -12px rgba(0,0,0,0.9)', '0px 0px 0px 1px rgba(0,0,0,0.6)', '0px 1px 0px 0px rgba(255,255,255,0.06)'),
      blur: 'blur(0px)',
      rotate: 0,
    },
    avatar: { bg: '#5e6ad2', color: '#ffffff', radius: 999, bw: 1, border: 'rgba(255,255,255,0.1)', shadow: sh() },
    stat: { bg: '#0b0c0d', radius: 8, bw: 1, border: 'rgba(255,255,255,0.06)', shadow: sh() },
    track: { off: '#2a2b2f', on: '#5e6ad2', knob: '#ffffff', radius: 999, knobRadius: 999 },
    bar: { bg: '#26272b', fill: '#5e6ad2' },
    primary: { bg: '#f7f8f8', color: '#08090a', radius: 8, bw: 1, border: CLEAR, shadow: sh() },
    secondary: { bg: '#1b1c1f', color: '#d0d6e0', radius: 8, bw: 1, border: '#2c2e33', shadow: sh() },
    tokens: [
      ['background', '#0f1012'],
      ['border', '1px solid rgba(255,255,255,.08)'],
      ['border-radius', '12px'],
      ['box-shadow', '0 24px 48px -12px rgba(0,0,0,.9)'],
      ['stage', '#08090a + glow #5e6ad2'],
      ['font-family', 'Inter'],
    ],
  },
} satisfies Record<string, Theme>

type Key = keyof typeof THEMES
const KEYS = Object.keys(THEMES) as Key[]
const T: Transition = { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
const LAYOUT: Transition = { type: 'spring', stiffness: 260, damping: 30 }

const boxAnim = (b: Box) => ({
  backgroundColor: b.bg,
  borderRadius: b.radius,
  boxShadow: b.shadow,
  borderColor: b.border,
  borderWidth: b.bw,
  ...(b.color ? { color: b.color } : {}),
})

export function StyleSwitcher() {
  const [key, setKey] = useState<Key>('glass')
  const [notify, setNotify] = useState(true)
  const pillId = useId()
  const t: Theme = THEMES[key]

  return (
    <div className="@container relative h-full w-full overflow-hidden font-sans">
      {/* stage layers (crossfade) */}
      {KEYS.map((k) => (
        <motion.div
          key={k}
          className="absolute inset-0"
          style={{ background: THEMES[k].stage }}
          initial={false}
          animate={{ opacity: k === key ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        />
      ))}

      <div className="relative flex h-full flex-col items-center gap-5 p-5">
        {/* segmented control */}
        <div
          className="flex max-w-full overflow-x-auto rounded-full p-1"
          style={{ background: 'rgba(12,12,16,0.62)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
        >
          {KEYS.map((k) => (
            <button key={k} onClick={() => setKey(k)} className="relative shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium">
              {k === key && (
                <motion.span
                  layoutId={`pill-${pillId}`}
                  className="absolute inset-0 rounded-full bg-white"
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                />
              )}
              <span className={`relative transition-colors ${k === key ? 'text-black' : 'text-white/75 hover:text-white'}`}>{THEMES[k].label}</span>
            </button>
          ))}
        </div>

        <div className="flex w-full flex-1 items-center justify-center gap-8">
          {/* themed card */}
          <motion.div
            layout
            className="w-[300px] shrink-0 p-5"
            style={{ borderStyle: 'solid', fontFamily: t.font }}
            initial={false}
            animate={{ ...boxAnim(t.card), rotate: t.card.rotate, backdropFilter: t.card.blur }}
            transition={{ default: T, layout: LAYOUT }}
          >
            {/* header: layout アニメーションで 横並び ⇄ 中央寄せ */}
            <motion.div
              layout
              transition={LAYOUT}
              className={`flex gap-3 ${t.centered ? 'flex-col items-center text-center' : 'flex-row items-center'}`}
            >
              <motion.div
                layout
                className="grid h-11 w-11 shrink-0 place-items-center text-sm font-bold"
                style={{ borderStyle: 'solid' }}
                initial={false}
                animate={boxAnim(t.avatar)}
                transition={{ default: T, layout: LAYOUT }}
              >
                MS
              </motion.div>
              <motion.div layout transition={LAYOUT}>
                <motion.p
                  className="text-base font-bold"
                  style={{ fontFamily: t.nameFont ?? t.font, textTransform: t.upper ? 'uppercase' : 'none', letterSpacing: t.upper ? '0.06em' : '0' }}
                  initial={false}
                  animate={{ textShadow: t.nameShadow }}
                  transition={T}
                >
                  Mika Sato
                </motion.p>
                <motion.p className="text-xs" initial={false} animate={{ color: t.muted }} transition={T}>
                  Product Designer · Tokyo
                </motion.p>
              </motion.div>
            </motion.div>

            {/* stats */}
            <motion.div layout transition={LAYOUT} className="mt-4 grid grid-cols-3 gap-2">
              {[
                ['128', 'Posts'],
                ['2.4k', 'Fans'],
                ['312', 'Following'],
              ].map(([value, label]) => (
                <motion.div
                  key={label}
                  className="py-2 text-center"
                  style={{ borderStyle: 'solid' }}
                  initial={false}
                  animate={boxAnim(t.stat)}
                  transition={T}
                >
                  <p className="text-[15px] font-bold">{value}</p>
                  <motion.p className="text-[10px]" initial={false} animate={{ color: t.muted }} transition={T}>
                    {label}
                  </motion.p>
                </motion.div>
              ))}
            </motion.div>

            {/* toggle */}
            <motion.div layout transition={LAYOUT} className="mt-4 flex items-center justify-between text-[13px]">
              <span>Notifications</span>
              <motion.button
                role="switch"
                aria-checked={notify}
                aria-label="Notifications"
                onClick={() => setNotify((v) => !v)}
                className="relative h-6 w-11"
                initial={false}
                animate={{ backgroundColor: notify ? t.track.on : t.track.off, borderRadius: t.track.radius }}
                transition={T}
              >
                <motion.span
                  className="absolute left-[3px] top-[3px] h-[18px] w-[18px]"
                  initial={false}
                  animate={{ x: notify ? 20 : 0, backgroundColor: t.track.knob, borderRadius: t.track.knobRadius }}
                  transition={{ default: T, x: { type: 'spring', stiffness: 500, damping: 30 } }}
                />
              </motion.button>
            </motion.div>

            {/* progress */}
            <motion.div layout transition={LAYOUT} className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs">
                <span>Profile strength</span>
                <motion.span initial={false} animate={{ color: t.muted }} transition={T}>
                  72%
                </motion.span>
              </div>
              <motion.div className="h-2 overflow-hidden" initial={false} animate={{ backgroundColor: t.bar.bg, borderRadius: t.track.radius }} transition={T}>
                <motion.div className="h-full w-[72%]" initial={false} animate={{ backgroundColor: t.bar.fill }} transition={T} />
              </motion.div>
            </motion.div>

            {/* buttons */}
            <motion.div layout transition={LAYOUT} className="mt-5 grid grid-cols-2 gap-3">
              <motion.button
                className="h-10 text-[13px] font-bold"
                style={{ borderStyle: 'solid', textTransform: t.upper ? 'uppercase' : 'none' }}
                initial={false}
                animate={boxAnim(t.primary)}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                transition={T}
              >
                Follow
              </motion.button>
              <motion.button
                className="h-10 text-[13px] font-bold"
                style={{ borderStyle: 'solid', textTransform: t.upper ? 'uppercase' : 'none' }}
                initial={false}
                animate={boxAnim(t.secondary)}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                transition={T}
              >
                Message
              </motion.button>
            </motion.div>
          </motion.div>

          {/* live tokens panel (コンテナ幅 700px 以上で表示) */}
          <div
            className="hidden w-[270px] shrink-0 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-zinc-200 @min-[700px]:block"
            style={{ background: 'rgba(10,10,14,0.74)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-400">.card — {t.label}</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.ul
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {t.tokens.map(([prop, value], i) => (
                  <li key={i} className="break-words">
                    {prop ? (
                      <>
                        <span className="text-sky-300">{prop}</span>: <span className="text-amber-200">{value}</span>
                      </>
                    ) : (
                      <span className="pl-4 text-amber-200">{value}</span>
                    )}
                  </li>
                ))}
              </motion.ul>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
