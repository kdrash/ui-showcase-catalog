import NumberFlow from '@number-flow/react'
import { ALargeSmall, Bookmark, BookmarkCheck, BookmarkPlus, ChevronLeft, ChevronRight, Minus, Plus, TableOfContents, Trash2, X } from 'lucide-react'
import { AnimatePresence, animate, motion, useAnimate, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import {
  ANCHORS,
  BOOK_AUTHOR,
  BOOK_IMPRINT,
  BOOK_NODES,
  BOOK_TITLE,
  CHAPTER_ANCHORS,
  CHAPTER_INFO,
  COLOPHON_ANCHOR,
  TOTAL_CHARS,
} from './VerticalNovelReader.data'

/**
 * 縦書き(縦組み)の電子書籍リーダー。本文は架空の短編「潮見坂の時計屋」(灯舟文庫・水城 透)で、すべてオリジナル。
 * - 本文は writing-mode: vertical-rl + CSS 段組み。縦書きで段組みにすると「段」が下方向に積み重なるので、
 *   段の高さ = 1ページの字詰め、段の幅 = 1ページの行数 として、translateY で n 段目だけを切り抜くとページになる。
 *   行送り(文字サイズ×行間)の整数倍に版面の幅を丸め、字詰めも文字サイズの整数倍にして、行や字が半端に切れないようにする
 * - ルビ(<ruby>/<rt>)、縦中横(text-combine-upright: 2桁の数字と「!?」)、傍点(text-emphasis: sesame)、line-break: strict の禁則、
 *   章扉は break-before: column、扉と奥付も同じ流れの中に組む
 * - 非表示の計測用コピーで各「文」の span の getClientRects() を読み、文ごとの開始ページを求める。
 *   しおりと現在位置は「文の番号」で持つので、文字サイズ・行間・書体・画面幅を変えても同じ文のページへ戻れる
 * - 広い画面は見開き(右ページが先)、狭い画面は単ページ。見開きは綴じ目を軸に左ページが rotateY で右へめくれる 3D のめくり
 *   (表裏の面を backface-visibility で貼り合わせ、角度に応じて陰を濃くする)、単ページは紙が右へ抜けて下のページが現れる。
 *   目次やスライダーからの離れたジャンプは短いクロスフェード
 * - 左半分のクリック/タップ・右へのスワイプ・← キーで次へ(右綴じなので進む方向は左)。進捗スライダーも右から左へ伸び、
 *   章の区切りとしおりの印を表示。目次/しおり一覧のドロワー、文字サイズ・行間・明朝/ゴシック・白/セピア/夜の表示設定
 * - キー操作はデモ内にフォーカスがあるときだけ。Esc でパネルを閉じる。useReducedMotion 時はめくりをやめて短いフェードだけにする
 */

/* ───────────── 設定値 ───────────── */

type ThemeId = 'white' | 'sepia' | 'night'
type FontId = 'mincho' | 'gothic'
type SpacingId = 'tight' | 'normal' | 'loose'

const THEMES: Record<ThemeId, { label: string; vars: Record<string, string> }> = {
  white: {
    label: '白',
    vars: {
      '--paper': '#fbfaf6',
      '--ink': '#262420',
      '--sub': '#8d877c',
      '--desk': '#e6e2da',
      '--desk2': '#d6d0c4',
      '--chrome': '#f7f5f0',
      '--panel': '#ffffff',
      '--line': 'rgba(38,36,32,.12)',
      '--accent': '#b2432d',
      '--gutter': 'rgba(70,52,30,.16)',
      '--edge': '#ddd7cb',
      '--hover': 'rgba(38,36,32,.06)',
    },
  },
  sepia: {
    label: 'セピア',
    vars: {
      '--paper': '#f3e7cf',
      '--ink': '#43331f',
      '--sub': '#94805f',
      '--desk': '#d8c7a4',
      '--desk2': '#c7b28a',
      '--chrome': '#efe2c6',
      '--panel': '#f8eed9',
      '--line': 'rgba(67,51,31,.16)',
      '--accent': '#a33b24',
      '--gutter': 'rgba(96,62,20,.2)',
      '--edge': '#e0cfac',
      '--hover': 'rgba(67,51,31,.07)',
    },
  },
  night: {
    label: '夜',
    vars: {
      '--paper': '#1f2126',
      '--ink': '#d0cabe',
      '--sub': '#7f7b73',
      '--desk': '#111215',
      '--desk2': '#08090a',
      '--chrome': '#16171b',
      '--panel': '#1c1e22',
      '--line': 'rgba(208,202,190,.12)',
      '--accent': '#d97a5f',
      '--gutter': 'rgba(0,0,0,.5)',
      '--edge': '#2b2d33',
      '--hover': 'rgba(208,202,190,.07)',
    },
  },
}

const FONTS: Record<FontId, { label: string; family: string }> = {
  mincho: { label: '明朝', family: '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP","BIZ UDPMincho",serif' },
  gothic: { label: 'ゴシック', family: '"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic","YuGothic",sans-serif' },
}

const SPACINGS: Record<SpacingId, { label: string; value: number }> = {
  tight: { label: '狭め', value: 1.7 },
  normal: { label: '標準', value: 1.9 },
  loose: { label: '広め', value: 2.2 },
}

const SIZES = [14, 15, 16, 17, 18, 20, 22, 24]
/** 段と段の間(=ページ間)。clip-path で切り抜くので見えない */
const GAP = 80

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/* ───────────── レイアウトと計測 ───────────── */

type Layout = {
  spread: boolean
  pw: number
  ph: number
  cw: number
  ch: number
  x: number
  y: number
  stride: number
  pitch: number
}

function computeLayout(areaW: number, areaH: number, fs: number, lh: number): Layout {
  const availW = Math.max(220, areaW - 28)
  const ph = Math.max(220, Math.floor(areaH - 26))
  const spread = availW >= Math.max(600, ph * 1.25)
  const pw = Math.floor(spread ? Math.min(availW / 2, ph * 0.8) : Math.min(availW, ph * 0.98, 620))
  const padY = clamp(Math.round(ph * 0.09), 30, 72)
  const padX = clamp(Math.round(pw * 0.085), 20, 64)
  const pitch = fs * lh
  const lines = Math.max(3, Math.floor((pw - padX * 2) / pitch))
  const cw = Math.ceil(lines * pitch) + 1
  const ch = Math.max(fs * 6, Math.floor((ph - padY * 2) / fs) * fs)
  return { spread, pw, ph, cw, ch, x: Math.round((pw - cw) / 2), y: Math.round((ph - ch) / 2), stride: ch + GAP, pitch }
}

type Measure = {
  total: number
  first: number[]
  pageAnchor: number[]
  chapterPage: number[]
  titlePage: number
  colophonPage: number
}

function measureFlow(el: HTMLElement, stride: number): Measure {
  const base = el.getBoundingClientRect()
  const scale = el.offsetWidth ? base.width / el.offsetWidth : 1
  const n = ANCHORS.length
  const first = new Array<number>(n).fill(-1)
  const last = new Array<number>(n).fill(-1)
  el.querySelectorAll<HTMLElement>('[data-a]').forEach((node) => {
    const id = Number(node.dataset.a)
    for (const r of Array.from(node.getClientRects())) {
      if (r.width === 0 && r.height === 0) continue
      const p = Math.max(0, Math.floor(((r.top - base.top) / scale + 2) / stride))
      if (first[id] < 0 || p < first[id]) first[id] = p
      if (p > last[id]) last[id] = p
    }
  })
  for (let i = 0; i < n; i++) {
    if (first[i] < 0) {
      first[i] = i ? first[i - 1] : 0
      last[i] = first[i]
    }
  }
  const total = Math.max(...last) + 1
  const pageAnchor = new Array<number>(total).fill(-1)
  for (let i = 0; i < n; i++) if (pageAnchor[first[i]] < 0) pageAnchor[first[i]] = i
  for (let p = 0; p < total; p++) if (pageAnchor[p] < 0) pageAnchor[p] = p ? pageAnchor[p - 1] : 0
  return {
    total,
    first,
    pageAnchor,
    chapterPage: CHAPTER_ANCHORS.map((a) => first[a]),
    titlePage: first[0],
    colophonPage: first[COLOPHON_ANCHOR],
  }
}

const FALLBACK: Measure = { total: 1, first: ANCHORS.map(() => 0), pageAnchor: [0], chapterPage: CHAPTER_ANCHORS.map(() => 0), titlePage: 0, colophonPage: 0 }

function chapterOf(m: Measure, p: number) {
  let c = -1
  m.chapterPage.forEach((cp, i) => {
    if (cp <= p) c = i
  })
  return c
}

/* ───────────── 本文の CSS ───────────── */

const FLOW_CSS = `
.vnr-flow{orphans:1;widows:1;writing-mode:vertical-rl;text-orientation:mixed;text-align:justify;line-break:strict;word-break:normal;overflow-wrap:normal;font-kerning:normal;hanging-punctuation:allow-end}
.vnr-flow p{margin:0;text-indent:1em}
.vnr-flow p.vnr-dlg{text-indent:0}
.vnr-flow p.vnr-quote{text-indent:0;padding-inline-start:2.5em;margin-block:.35em}
.vnr-flow rt{font-size:.5em;letter-spacing:0;line-height:1}
.vnr-flow .vnr-em{-webkit-text-emphasis:filled sesame;text-emphasis:filled sesame;text-emphasis-position:over right}
.vnr-flow .vnr-tcy{text-combine-upright:all;-webkit-text-combine:horizontal}
.vnr-flow .vnr-title{break-after:column;padding-block-start:var(--title-pad)}
.vnr-flow .vnr-k{text-indent:0;font-size:.72em;letter-spacing:.4em;color:var(--sub);padding-inline-start:4.2em}
.vnr-flow h1{margin:0;margin-block-start:.4em;padding-inline-start:1.7em;font-size:1.9em;letter-spacing:.2em;font-weight:600;line-height:1.5}
.vnr-flow .vnr-au{text-indent:0;text-align:end;margin-block-start:1.6em;padding-inline-end:3em;letter-spacing:.35em;font-size:.95em}
.vnr-flow h2.vnr-ch{break-before:column;margin:0;margin-block-end:1.4em;padding-inline-start:2.6em;font-weight:600}
.vnr-flow .vnr-n{display:block;font-size:.78em;letter-spacing:.3em;color:var(--accent);font-weight:500}
.vnr-flow .vnr-t{display:block;font-size:1.34em;letter-spacing:.16em;line-height:1.7}
.vnr-flow .vnr-endmark{text-indent:0;text-align:end;padding-inline-end:1.5em;margin-block-start:.5em}
.vnr-flow .vnr-colo{break-before:column;padding-block-start:var(--colo-pad);font-size:.78em;color:var(--ink)}
.vnr-flow .vnr-colo p{text-indent:0;padding-inline-start:30%}
.vnr-flow .vnr-colo .vnr-ct{font-size:1.25em;font-weight:600;letter-spacing:.14em;padding-block-end:.5em;margin-block-end:.7em;border-block-end:1px solid color-mix(in srgb,var(--sub) 55%,transparent);padding-inline-end:2.5em;inline-size:fit-content}
.vnr-flow .vnr-colo .vnr-note{color:var(--sub);font-size:.86em;margin-block-start:1em;padding-inline-end:1em}
`

/* ───────────── ページ ───────────── */

type PageCtx = {
  layout: Layout
  m: Measure
  flowStyle: CSSProperties
  bookmarkedPages: Set<number>
  onToggleBookmark: (page: number) => void
  reduce: boolean
}

type Side = 'right' | 'left' | 'single'

function Page({ index, side, ctx, interactive = true }: { index: number; side: Side; ctx: PageCtx; interactive?: boolean }) {
  const { layout: L, m } = ctx
  const blank = index >= m.total || index < 0
  const isTitle = index === m.titlePage
  const isChapterStart = m.chapterPage.includes(index)
  const isColophon = index >= m.colophonPage
  const plainPage = blank || isTitle || isChapterStart || isColophon
  const ch = chapterOf(m, index)
  const head = side === 'right' ? BOOK_TITLE : ch >= 0 ? `${CHAPTER_INFO[ch].num}　${CHAPTER_INFO[ch].title}` : BOOK_TITLE
  const bookmarked = !blank && ctx.bookmarkedPages.has(index)
  const outer = side === 'left' ? 'left' : 'right'
  const edgeX = Math.max(30, L.x)

  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--paper)] transition-colors duration-300">
      {/* 綴じ側の陰と紙の質感 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            side === 'right'
              ? 'linear-gradient(90deg, var(--gutter), transparent 7%, transparent 96%, rgba(255,255,255,.04))'
              : side === 'left'
                ? 'linear-gradient(270deg, var(--gutter), transparent 7%, transparent 96%, rgba(255,255,255,.04))'
                : 'linear-gradient(90deg, rgba(0,0,0,.03), transparent 4%, transparent 96%, rgba(0,0,0,.03))',
        }}
      />
      {!blank && (
        <div aria-hidden="true">
          {!plainPage && (
            <p
              className="absolute m-0 text-[10px] tracking-[.22em] text-[var(--sub)]"
              style={{ top: Math.round(L.y * 0.42), [outer]: edgeX, fontFamily: ctx.flowStyle.fontFamily }}
            >
              {head}
            </p>
          )}
          <div className="absolute" style={{ left: L.x, top: L.y, width: L.cw, height: L.ch, clipPath: `inset(-2px -${L.x}px)` }}>
            <div className="vnr-flow" style={{ ...ctx.flowStyle, transform: `translateY(${-index * L.stride}px)` }}>
              {BOOK_NODES}
            </div>
          </div>
          {!isTitle && !isColophon && (
            <p
              className="absolute m-0 text-[10px] tracking-[.1em] text-[var(--sub)] tabular-nums"
              style={{
                bottom: Math.round(L.y * 0.36),
                ...(side === 'single' ? { left: 0, right: 0, textAlign: 'center' } : { [outer]: edgeX }),
              }}
            >
              {index + 1}
            </p>
          )}
        </div>
      )}
      {!blank && (
        <Ribbon
          bookmarked={bookmarked}
          side={outer}
          interactive={interactive}
          reduce={ctx.reduce}
          onToggle={() => ctx.onToggleBookmark(index)}
          page={index + 1}
        />
      )}
    </div>
  )
}

/** ページの上端から垂れる栞紐。押すと挟む/外す。未設定でもホバーで輪郭だけ見える */
function Ribbon({
  bookmarked,
  side,
  interactive,
  reduce,
  onToggle,
  page,
}: {
  bookmarked: boolean
  side: 'left' | 'right'
  interactive: boolean
  reduce: boolean
  onToggle: () => void
  page: number
}) {
  const ribbon = (
    <>
      <span
        aria-hidden="true"
        className="absolute top-0 left-1/2 h-[42px] w-[13px] -translate-x-1/2 border border-t-0 border-dashed border-[var(--sub)] opacity-0 transition-opacity duration-200 group-hover:opacity-60 group-focus-visible:opacity-60"
        style={{ clipPath: 'polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)', borderRadius: 1 }}
      />
      <AnimatePresence initial={false}>
        {bookmarked && (
          <motion.span
            aria-hidden="true"
            className="absolute top-0 left-1/2 block h-[48px] w-[13px] -translate-x-1/2 origin-top bg-[var(--accent)] shadow-[0_2px_3px_rgba(0,0,0,.18)]"
            style={{ clipPath: 'polygon(0 0,100% 0,100% 100%,50% 84%,0 100%)' }}
            initial={reduce ? { opacity: 0 } : { scaleY: 0 }}
            animate={reduce ? { opacity: 1 } : { scaleY: 1 }}
            exit={reduce ? { opacity: 0 } : { scaleY: 0 }}
            transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 22 }}
          >
            <span className="absolute inset-y-0 left-[3px] w-px bg-white/25" />
          </motion.span>
        )}
      </AnimatePresence>
    </>
  )
  const pos: CSSProperties = { top: 0, [side]: 2 }
  if (!interactive) {
    return (
      <span className="absolute h-14 w-9" style={pos} aria-hidden="true">
        {ribbon}
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-pressed={bookmarked}
      aria-label={bookmarked ? `${page}ページのしおりを外す` : `${page}ページにしおりを挟む`}
      title={bookmarked ? 'しおりを外す' : 'しおりを挟む'}
      className="group absolute z-10 h-14 w-9 cursor-pointer rounded-b-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
      style={pos}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={onToggle}
    >
      {ribbon}
    </button>
  )
}

/* ───────────── めくりアニメーション ───────────── */

type Turn = { id: number; from: number; to: number; dir: 1 | -1; kind: 'flip' | 'fade' }

/** 見開きの 3D めくり。綴じ目(中央)を軸に1枚の紙が回転し、表と裏に別のページを貼る */
function FlipLeaf({ turn, ctx, onDone }: { turn: Turn; ctx: PageCtx; onDone: () => void }) {
  const { pw, ph } = ctx.layout
  const forward = turn.dir === 1
  const rot = useMotionValue(0)
  const lift = useTransform(rot, (v) => Math.sin((Math.abs(v) * Math.PI) / 180))
  const frontShade = useTransform(rot, (v) => Math.min(0.42, (Math.abs(v) / 90) * 0.32))
  const backShade = useTransform(rot, (v) => Math.max(0, ((180 - Math.abs(v)) / 90) * 0.3))
  const castShadow = useTransform(lift, (s) => s * 0.22)
  const revealShade = useTransform(rot, (v) => Math.max(0, 0.18 * (1 - Math.abs(v) / 110)))
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    const controls = animate(rot, forward ? 180 : -180, {
      duration: 0.72,
      ease: [0.42, 0.06, 0.22, 1],
      onComplete: () => doneRef.current(),
    })
    return () => controls.stop()
  }, [rot, forward])

  // forward: 紙は左半分にあり、右端(綴じ目)を軸に右へ。backward: 右半分にあり、左端を軸に左へ
  const leafLeft = forward ? 0 : pw
  const front = forward ? turn.from + 1 : turn.from
  const back = forward ? turn.to : turn.to + 1
  const faceSide: Side = forward ? 'left' : 'right'
  const backSide: Side = forward ? 'right' : 'left'

  return (
    <>
      {/* めくれて現れたページに落ちる陰 */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-0"
        style={{
          left: leafLeft,
          width: pw,
          height: ph,
          opacity: revealShade,
          background: `linear-gradient(${forward ? 270 : 90}deg, rgba(0,0,0,.9), rgba(0,0,0,.35) 30%, transparent 75%)`,
          zIndex: 3,
        }}
      />
      {/* 紙が覆いかぶさる側のページに落ちる影 */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-0"
        style={{
          left: forward ? pw : 0,
          width: pw,
          height: ph,
          opacity: castShadow,
          background: `linear-gradient(${forward ? 90 : 270}deg, rgba(0,0,0,.85), transparent 70%)`,
          zIndex: 3,
        }}
      />
      <motion.div
        className="absolute top-0"
        style={{
          left: leafLeft,
          width: pw,
          height: ph,
          rotateY: rot,
          transformOrigin: forward ? 'right center' : 'left center',
          transformStyle: 'preserve-3d',
          zIndex: 4,
        }}
      >
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <Page index={front} side={faceSide} ctx={ctx} interactive={false} />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: frontShade,
              background: `linear-gradient(${forward ? 90 : 270}deg, rgba(0,0,0,.05), rgba(0,0,0,.55))`,
            }}
          />
        </div>
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <Page index={back} side={backSide} ctx={ctx} interactive={false} />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: backShade,
              background: `linear-gradient(${forward ? 90 : 270}deg, rgba(0,0,0,.5), rgba(255,255,255,.04) 60%, rgba(0,0,0,.1))`,
            }}
          />
        </div>
      </motion.div>
    </>
  )
}

/* ───────────── 進捗スライダー(右から左へ) ───────────── */

function ProgressSlider({
  value,
  max,
  step,
  chapterPages,
  bookmarkPages,
  labelFor,
  onChange,
}: {
  value: number
  max: number
  step: number
  chapterPages: number[]
  bookmarkPages: number[]
  labelFor: (v: number) => string
  onChange: (v: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const shown = drag ?? value
  const ratio = max > 0 ? shown / max : 0
  const toValue = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect()
    if (!r || max <= 0) return 0
    const raw = Math.round(((r.right - clientX) / r.width) * max)
    const v = clamp(raw, 0, max)
    return v - (v % step)
  }
  const tip = drag ?? hover

  const onKeyDown = (e: ReactKeyboardEvent) => {
    let v: number | null = null
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') v = value + step
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') v = value - step
    else if (e.key === 'PageUp') v = value + step * 5
    else if (e.key === 'PageDown') v = value - step * 5
    else if (e.key === 'Home') v = 0
    else if (e.key === 'End') v = max
    if (v === null) return
    e.preventDefault()
    e.stopPropagation()
    const c = clamp(v, 0, max)
    onChange(c - (c % step))
  }

  return (
    <div
      className="relative h-7 w-full cursor-pointer touch-none select-none"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const v = toValue(e.clientX)
        setDrag(v)
        onChange(v)
      }}
      onPointerMove={(e) => {
        const v = toValue(e.clientX)
        if (drag !== null) {
          if (v !== drag) {
            setDrag(v)
            onChange(v)
          }
        } else if (e.pointerType === 'mouse') setHover(v)
      }}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
      onPointerLeave={() => setHover(null)}
    >
      <div ref={trackRef} className="absolute inset-x-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--line)]">
        <div className="absolute inset-y-0 right-0 rounded-full bg-[var(--ink)]/70" style={{ width: `${ratio * 100}%` }} />
        {chapterPages.map((p, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute top-1/2 h-[9px] w-px -translate-y-1/2 bg-[var(--sub)]/70"
            style={{ right: `${max ? (p / max) * 100 : 0}%` }}
          />
        ))}
        {bookmarkPages.map((p) => (
          <span
            key={p}
            aria-hidden="true"
            className="absolute -top-[9px] h-[7px] w-[5px] translate-x-1/2 bg-[var(--accent)]"
            style={{ right: `${max ? (p / max) * 100 : 0}%`, clipPath: 'polygon(0 0,100% 0,100% 100%,50% 70%,0 100%)' }}
          />
        ))}
        <div
          role="slider"
          tabIndex={0}
          aria-label="読書位置"
          aria-orientation="horizontal"
          aria-valuemin={1}
          aria-valuemax={max + 1}
          aria-valuenow={value + 1}
          aria-valuetext={labelFor(value)}
          onKeyDown={onKeyDown}
          className="absolute top-1/2 size-3.5 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--chrome)] bg-[var(--ink)] shadow outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
          style={{ right: `${ratio * 100}%`, transform: `translate(50%,-50%) scale(${drag !== null ? 1.25 : 1})` }}
        />
        <AnimatePresence>
          {tip !== null && (
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="pointer-events-none absolute bottom-3 z-20 translate-x-1/2 rounded-md bg-[var(--ink)] px-2 py-1 text-[11px] whitespace-nowrap text-[var(--paper)] shadow-lg"
              style={{ right: `clamp(3.5rem, ${max ? (tip / max) * 100 : 0}%, calc(100% - 3.5rem))` }}
            >
              {labelFor(tip)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ───────────── 小物 ───────────── */

function CoverArt({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 60 86" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efc2ad" />
          <stop offset=".5" stopColor="#8e7a96" />
          <stop offset="1" stopColor="#273350" />
        </linearGradient>
      </defs>
      <rect width="60" height="86" fill={`url(#${id}sky)`} />
      <path d="M0 60 Q15 57 30 60 T60 60 V86 H0Z" fill="#1c2640" />
      <path d="M0 64 Q15 62 30 64 T60 64" fill="none" stroke="#f3d9c6" strokeOpacity=".35" strokeWidth=".6" />
      <path d="M0 46 L34 66 L0 66Z" fill="#232c47" opacity=".85" />
      <circle cx="40" cy="31" r="10" fill="#f6ecdc" fillOpacity=".12" stroke="#f6ecdc" strokeWidth="1.1" />
      <circle cx="40" cy="19.6" r="1.6" fill="none" stroke="#f6ecdc" strokeWidth=".9" />
      <path d="M40 31 L40 23.6 M40 31 L38.8 25.4" stroke="#f6ecdc" strokeWidth=".9" strokeLinecap="round" />
      <text x="10" y="10" fill="#fff8ee" fontSize="6.4" style={{ writingMode: 'vertical-rl', fontFamily: FONTS.mincho.family, letterSpacing: '.12em' }}>
        {BOOK_TITLE}
      </text>
      <text x="9" y="80" fill="#f3d9c6" fontSize="3.4" textAnchor="end" style={{ writingMode: 'vertical-rl', fontFamily: FONTS.mincho.family }}>
        {BOOK_AUTHOR}
      </text>
    </svg>
  )
}

function IconButton({
  label,
  active,
  onClick,
  children,
  buttonRef,
  expanded,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: ReactNode
  buttonRef?: Ref<HTMLButtonElement>
  expanded?: boolean
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-full outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 ${active ? 'bg-[var(--hover)] text-[var(--accent)]' : 'text-[var(--ink)]'}`}
    >
      {children}
    </button>
  )
}

function relTime(t: number, now: number) {
  const d = Math.max(0, now - t)
  if (d < 60_000) return 'たった今'
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}分前`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}時間前`
  return `${Math.floor(d / 86_400_000)}日前`
}

/* ───────────── 本体 ───────────── */

type Mark = { id: number; anchor: number; at: number }

const SEED_ANCHOR = ANCHORS.findIndex((a) => a.text.startsWith('「これを、直して'))

export function VerticalNovelReader() {
  const reduce = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const tocBtnRef = useRef<HTMLButtonElement>(null)
  const setBtnRef = useRef<HTMLButtonElement>(null)

  const [area, setArea] = useState({ w: 0, h: 0 })
  const [sizeIdx, setSizeIdx] = useState(2)
  const [spacing, setSpacing] = useState<SpacingId>('normal')
  const [font, setFont] = useState<FontId>('mincho')
  const [theme, setTheme] = useState<ThemeId>('white')
  const [m, setM] = useState<Measure>(FALLBACK)
  const [page, setPage] = useState(0)
  const [turn, setTurn] = useState<Turn | null>(null)
  const [marks, setMarks] = useState<Mark[]>(() => [{ id: 1, anchor: Math.max(0, SEED_ANCHOR), at: Date.now() - 3 * 86_400_000 }])
  const [panel, setPanel] = useState<'toc' | 'settings' | null>(null)
  const [tab, setTab] = useState<'toc' | 'marks'>('toc')
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null)
  const [intro, setIntro] = useState(true)
  const [fontsTick, setFontsTick] = useState(0)
  const [bookScope, animateBook] = useAnimate()

  const anchorRef = useRef(0)
  const turnId = useRef(0)
  const downRef = useRef<{ x: number; y: number } | null>(null)
  const markId = useRef(2)

  const fs = SIZES[sizeIdx]
  const lh = SPACINGS[spacing].value
  const layout = useMemo(() => computeLayout(area.w, area.h, fs, lh), [area.w, area.h, fs, lh])
  const step = layout.spread ? 2 : 1
  const lastStart = layout.spread ? m.total - 1 - ((m.total - 1) % 2) : m.total - 1

  /* 領域サイズ */
  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    const read = () => {
      const r = el.getBoundingClientRect()
      const w = Math.round(el.clientWidth || r.width)
      const h = Math.round(el.clientHeight || r.height)
      setArea((a) => (a.w === w && a.h === h ? a : { w, h }))
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => alive && setFontsTick((t) => t + 1))
    const t = window.setTimeout(() => setIntro(false), 2600)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [])

  const flowStyle = useMemo<CSSProperties>(() => {
    const coloWidth = 8 * layout.pitch * 0.78 + layout.pitch * 0.6
    return {
      width: layout.cw,
      height: layout.ch,
      columnWidth: layout.ch,
      columnGap: GAP,
      columnFill: 'auto',
      fontFamily: FONTS[font].family,
      fontSize: fs,
      lineHeight: lh,
      color: 'var(--ink)',
      ['--title-pad' as string]: `${Math.round(layout.cw * 0.2)}px`,
      ['--colo-pad' as string]: `${Math.max(0, Math.round(layout.cw - coloWidth))}px`,
    }
  }, [layout, font, fs, lh])

  /* 割り付けの計測。レイアウトが変わったら、記録しておいた「文」のあるページへ戻る */
  const layoutKey = `${layout.cw}|${layout.ch}|${fs}|${lh}|${font}|${layout.spread}|${fontsTick}`
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el || area.w === 0) return
    const res = measureFlow(el, layout.stride)
    setM(res)
    const p = res.first[anchorRef.current] ?? 0
    setPage(layout.spread ? p - (p % 2) : p)
    setTurn(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey])

  const bookmarkPages = useMemo(() => {
    const s = new Set<number>()
    for (const mk of marks) s.add(m.first[mk.anchor] ?? 0)
    return s
  }, [marks, m])

  const showToast = useCallback((text: string) => setToast({ id: Date.now(), text }), [])
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 1700)
    return () => window.clearTimeout(t)
  }, [toast])

  const toggleBookmark = useCallback(
    (p: number) => {
      const existing = marks.filter((mk) => (m.first[mk.anchor] ?? -1) === p)
      if (existing.length) {
        setMarks((ms) => ms.filter((mk) => !existing.includes(mk)))
        showToast('しおりを外しました')
      } else {
        setMarks((ms) => [...ms, { id: markId.current++, anchor: m.pageAnchor[p] ?? 0, at: Date.now() }])
        showToast(`${p + 1}ページにしおりを挟みました`)
      }
    },
    [marks, m, showToast],
  )

  const ctx: PageCtx = { layout, m, flowStyle, bookmarkedPages: bookmarkPages, onToggleBookmark: toggleBookmark, reduce }

  /* ページ移動 */
  const go = useCallback(
    (target: number, mode: 'animate' | 'instant' = 'animate') => {
      let t = clamp(target, 0, Math.max(0, lastStart))
      if (layout.spread) t -= t % 2
      if (t === page) return
      anchorRef.current = m.pageAnchor[t] ?? 0
      setIntro(false)
      if (mode === 'instant') {
        setTurn(null)
        setPage(t)
        return
      }
      const adjacent = Math.abs(t - page) === step
      setTurn({ id: ++turnId.current, from: page, to: t, dir: t > page ? 1 : -1, kind: !reduce && adjacent ? 'flip' : 'fade' })
      setPage(t)
    },
    [lastStart, layout.spread, page, m, step, reduce],
  )

  const bump = useCallback(
    (dir: 1 | -1) => {
      if (!bookScope.current || reduce) return
      animateBook(bookScope.current, { x: [0, dir * 9, 0] }, { duration: 0.34, ease: 'easeOut' })
    },
    [animateBook, bookScope, reduce],
  )

  const next = useCallback(() => {
    if (page >= lastStart) {
      bump(1)
      showToast('最後のページです')
      return
    }
    go(page + step)
  }, [page, lastStart, go, step, bump, showToast])

  const prev = useCallback(() => {
    if (page <= 0) {
      bump(-1)
      showToast('最初のページです')
      return
    }
    go(page - step)
  }, [page, go, step, bump, showToast])

  const finishTurn = useCallback((id: number) => setTurn((t) => (t && t.id === id ? null : t)), [])

  /* パネル */
  const closePanel = useCallback(() => {
    const which = panel
    setPanel(null)
    requestAnimationFrame(() => (which === 'toc' ? tocBtnRef : setBtnRef).current?.focus())
  }, [panel])

  const onRootKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && panel) {
      e.preventDefault()
      closePanel()
      return
    }
    if (panel || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
    const tgt = e.target as HTMLElement
    if (tgt.closest('input,textarea,select,[role="slider"]')) return
    const onButton = tgt.closest('button')
    if (e.key === 'ArrowLeft' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey && !onButton)) {
      e.preventDefault()
      next()
    } else if (e.key === 'ArrowRight' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey && !onButton)) {
      e.preventDefault()
      prev()
    } else if (e.key === 'Home') {
      e.preventDefault()
      go(0, 'animate')
    } else if (e.key === 'End') {
      e.preventDefault()
      go(lastStart, 'animate')
    }
  }

  /* タップ・スワイプ */
  const onAreaPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    downRef.current = { x: e.clientX, y: e.clientY }
  }
  const onAreaPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = downRef.current
    downRef.current = null
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx > 0) next()
      else prev()
      return
    }
    if (Math.hypot(dx, dy) > 12) return
    const r = e.currentTarget.getBoundingClientRect()
    if (e.clientX < r.left + r.width / 2) next()
    else prev()
  }
  const onAreaPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const s = e.clientX < r.left + r.width / 2 ? 'left' : 'right'
    if (s !== hoverSide) setHoverSide(s)
  }

  /* 表示 */
  const { pw, ph, spread } = layout
  const bookW = spread ? pw * 2 : pw
  const viewEnd = Math.min(m.total, page + step)
  const progress = m.total > 1 ? Math.min(1, viewEnd / m.total) : 0
  const curChapter = chapterOf(m, spread ? page + 1 : page)
  const chapterLabel =
    page >= m.colophonPage ? '奥付' : curChapter < 0 ? '扉' : `${CHAPTER_INFO[curChapter].num}　${CHAPTER_INFO[curChapter].title}`
  const remainMin = Math.max(0, Math.ceil(((1 - progress) * TOTAL_CHARS) / 550))
  const pageLabel = (p: number) => {
    const c = chapterOf(m, spread ? p + 1 : p)
    const name = p >= m.colophonPage ? '奥付' : c < 0 ? '扉' : `${CHAPTER_INFO[c].num}　${CHAPTER_INFO[c].title}`
    return `${p + 1}ページ ・ ${name}`
  }

  const slot = (index: number, side: Side, key: string, extra?: ReactNode) => (
    <div key={key} className="absolute top-0" style={{ left: side === 'right' ? pw : 0, width: pw, height: ph }}>
      <Page index={index} side={side} ctx={ctx} />
      {extra}
    </div>
  )

  let view: ReactNode
  if (spread) {
    if (turn && turn.kind === 'flip') {
      const f = turn.dir === 1
      view = (
        <>
          {slot(f ? turn.from : turn.to, 'right', 'R')}
          {slot(f ? turn.to + 1 : turn.from + 1, 'left', 'L')}
          <FlipLeaf key={turn.id} turn={turn} ctx={ctx} onDone={() => finishTurn(turn.id)} />
        </>
      )
    } else {
      view = (
        <>
          {slot(page, 'right', 'R')}
          {slot(page + 1, 'left', 'L')}
          {turn && (
            <motion.div
              key={turn.id}
              className="pointer-events-none absolute inset-0 z-[5]"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.16 : 0.26 }}
              onAnimationComplete={() => finishTurn(turn.id)}
            >
              <div className="absolute top-0" style={{ left: pw, width: pw, height: ph }}>
                <Page index={turn.from} side="right" ctx={ctx} interactive={false} />
              </div>
              <div className="absolute top-0 left-0" style={{ width: pw, height: ph }}>
                <Page index={turn.from + 1} side="left" ctx={ctx} interactive={false} />
              </div>
            </motion.div>
          )}
        </>
      )
    }
  } else {
    const single = (index: number) => (
      <div className="absolute inset-0">
        <Page index={index} side="single" ctx={ctx} interactive={false} />
      </div>
    )
    if (turn && turn.kind === 'flip') {
      const f = turn.dir === 1
      view = (
        <>
          <div key="S" className="absolute inset-0">
            <Page index={f ? turn.to : turn.from} side="single" ctx={ctx} />
          </div>
          <motion.div
            key={turn.id}
            className="absolute inset-0 z-[5] shadow-[-18px_0_30px_-14px_rgba(0,0,0,.45)]"
            initial={{ x: f ? '0%' : '106%' }}
            animate={{ x: f ? '106%' : '0%' }}
            transition={{ duration: 0.46, ease: [0.32, 0.08, 0.2, 1] }}
            onAnimationComplete={() => finishTurn(turn.id)}
          >
            {single(f ? turn.from : turn.to)}
          </motion.div>
        </>
      )
    } else {
      view = (
        <>
          <div key="S" className="absolute inset-0">
            <Page index={page} side="single" ctx={ctx} />
          </div>
          {turn && (
            <motion.div
              key={turn.id}
              className="pointer-events-none absolute inset-0 z-[5]"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.16 : 0.24 }}
              onAnimationComplete={() => finishTurn(turn.id)}
            >
              {single(turn.from)}
            </motion.div>
          )}
        </>
      )
    }
  }

  const readEdge = Math.round(progress * 6)
  const restEdge = Math.round((1 - progress) * 6)
  const themeVars = THEMES[theme].vars as CSSProperties
  const curMarked = bookmarkPages.has(page) || (spread && bookmarkPages.has(page + 1))
  const sortedMarks = [...marks].sort((a, b) => (m.first[a.anchor] ?? 0) - (m.first[b.anchor] ?? 0) || a.anchor - b.anchor)
  const now = Date.now()

  return (
    <div
      ref={rootRef}
      lang="ja"
      onKeyDown={onRootKeyDown}
      className="@container relative flex h-full w-full flex-col overflow-hidden bg-[var(--desk)] text-[var(--ink)] transition-colors duration-300"
      style={themeVars}
    >
      <style>{FLOW_CSS}</style>

      {/* ── ヘッダー ── */}
      <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--chrome)] px-2 transition-colors duration-300 @md:px-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--ink)] text-[var(--paper)]" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-5">
            <path d="M12 3.5c1.6 2.2 2.4 4 2.4 5.6A2.4 2.4 0 0 1 12 11.5a2.4 2.4 0 0 1-2.4-2.4c0-1.6.8-3.4 2.4-5.6Z" fill="currentColor" />
            <path d="M4 15.5h16l-2.6 4H6.6Z" fill="currentColor" opacity=".85" />
            <path d="M12 12v3.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-semibold tracking-wide" style={{ fontFamily: FONTS.mincho.family }}>
            {BOOK_TITLE}
          </p>
          <p className="truncate text-[10.5px] text-[var(--sub)]">
            {BOOK_AUTHOR}
            <span className="hidden @md:inline">　·　{BOOK_IMPRINT}</span>
          </p>
        </div>
        <IconButton
          label="目次としおり"
          buttonRef={tocBtnRef}
          active={panel === 'toc'}
          expanded={panel === 'toc'}
          onClick={() => setPanel((p) => (p === 'toc' ? null : 'toc'))}
        >
          <TableOfContents className="size-[18px]" />
        </IconButton>
        <IconButton
          label={curMarked ? 'このページのしおりを外す' : 'このページにしおりを挟む'}
          active={curMarked}
          onClick={() => toggleBookmark(spread && !bookmarkPages.has(page) && bookmarkPages.has(page + 1) ? page + 1 : page)}
        >
          {curMarked ? <BookmarkCheck className="size-[18px]" /> : <BookmarkPlus className="size-[18px]" />}
        </IconButton>
        <IconButton
          label="表示設定"
          buttonRef={setBtnRef}
          active={panel === 'settings'}
          expanded={panel === 'settings'}
          onClick={() => setPanel((p) => (p === 'settings' ? null : 'settings'))}
        >
          <ALargeSmall className="size-[19px]" />
        </IconButton>
      </header>

      {/* ── 本 ── */}
      <div
        ref={areaRef}
        tabIndex={0}
        role="region"
        aria-roledescription="縦書きの本"
        aria-label={`${BOOK_TITLE} 本文。左右の矢印キーでページをめくります`}
        className="relative min-h-0 flex-1 cursor-pointer touch-pan-y overflow-hidden outline-none select-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]/30 focus-visible:ring-inset"
        style={{ background: 'radial-gradient(120% 90% at 50% 45%, var(--desk), var(--desk2))' }}
        onPointerDown={onAreaPointerDown}
        onPointerUp={onAreaPointerUp}
        onPointerMove={onAreaPointerMove}
        onPointerLeave={() => setHoverSide(null)}
      >
        <div className="absolute inset-0 grid place-items-center">
          <div ref={bookScope} className="relative" style={{ width: bookW, height: ph, perspective: spread ? 2400 : undefined }}>
            {/* 本の厚み(読んだ分は右、残りは左に積もる) */}
            {spread && (
              <>
                <div
                  aria-hidden="true"
                  className="absolute top-[2px] bottom-[1px] rounded-r-[2px]"
                  style={{
                    left: '100%',
                    width: readEdge + 1,
                    background: 'repeating-linear-gradient(90deg, var(--edge) 0 1px, var(--paper) 1px 2px)',
                  }}
                />
                <div
                  aria-hidden="true"
                  className="absolute top-[2px] bottom-[1px] rounded-l-[2px]"
                  style={{
                    right: '100%',
                    width: restEdge + 1,
                    background: 'repeating-linear-gradient(270deg, var(--edge) 0 1px, var(--paper) 1px 2px)',
                  }}
                />
              </>
            )}
            <div className="absolute inset-0 rounded-[2px] shadow-[0_18px_40px_-16px_rgba(0,0,0,.45),0_2px_6px_rgba(0,0,0,.12)]" />
            {view}
            {spread && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 z-[2] w-[2px] -translate-x-1/2 bg-black/10"
                style={{ left: pw }}
              />
            )}
          </div>
        </div>

        {/* めくり方向のヒント */}
        {(['left', 'right'] as const).map((s) => (
          <div
            key={s}
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-full bg-[var(--ink)]/75 px-1.5 py-1.5 text-[11px] @md:px-2.5 text-[var(--paper)] shadow-md transition-all duration-300 ${s === 'left' ? 'left-2' : 'right-2 flex-row-reverse'}`}
            style={{
              opacity: intro || hoverSide === s ? 1 : 0,
              transform: `translateY(-50%) translateX(${intro || hoverSide === s ? 0 : s === 'left' ? -6 : 6}px)`,
            }}
          >
            {s === 'left' ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            <span className="hidden @md:inline">{s === 'left' ? '次へ' : '前へ'}</span>
          </div>
        ))}

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              initial={{ opacity: 0, y: reduce ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : 6 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-[12px] whitespace-nowrap text-[var(--paper)] shadow-lg"
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 進捗 ── */}
      <footer className="relative z-10 shrink-0 border-t border-[var(--line)] bg-[var(--chrome)] px-3 pt-1.5 pb-1 transition-colors duration-300 @md:px-4">
        <div className="flex items-baseline justify-between gap-3 text-[11px] text-[var(--sub)]">
          <span className="min-w-0 truncate" style={{ fontFamily: FONTS.mincho.family }}>
            {chapterLabel}
          </span>
          <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
            <span className="hidden @sm:inline">{progress >= 1 ? '読了' : `残り約${remainMin}分`}</span>
            <span className="text-[var(--ink)]">
              <NumberFlow value={page + 1} />
              {spread && page + 1 < m.total && (
                <>
                  –<NumberFlow value={page + 2} />
                </>
              )}
              <span className="text-[var(--sub)]"> / {m.total}</span>
            </span>
          </span>
        </div>
        <ProgressSlider
          value={page}
          max={Math.max(0, lastStart)}
          step={step}
          chapterPages={m.chapterPage}
          bookmarkPages={[...bookmarkPages]}
          labelFor={pageLabel}
          onChange={(v) => go(v, 'instant')}
        />
      </footer>

      <p className="sr-only" aria-live="polite">
        {`${pageLabel(page)}（全${m.total}ページ）`}
      </p>

      {/* ── 計測用の非表示コピーと、スクリーンリーダー向けの本文 ── */}
      <div aria-hidden="true" className="pointer-events-none invisible absolute top-0 left-0 -z-10 overflow-hidden" style={{ width: 1, height: 1 }}>
        <div ref={measureRef} className="vnr-flow" style={flowStyle}>
          {BOOK_NODES}
        </div>
      </div>
      <article className="sr-only" aria-label={`${BOOK_TITLE}（本文）`}>
        {BOOK_NODES}
      </article>

      {/* ── 目次・しおり ── */}
      <AnimatePresence>
        {panel === 'toc' && (
          <motion.div key="toc" className="absolute inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 bg-black/30" onClick={closePanel} />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="目次としおり"
              initial={reduce ? { opacity: 0 } : { x: '100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 40 }}
              className="absolute inset-y-0 right-0 flex w-[min(360px,90%)] flex-col bg-[var(--panel)] shadow-2xl"
            >
              <div className="flex items-start gap-3 border-b border-[var(--line)] p-4">
                <CoverArt className="h-[86px] w-[60px] shrink-0 rounded-[2px] shadow-md" />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[15px] font-semibold" style={{ fontFamily: FONTS.mincho.family }}>
                    {BOOK_TITLE}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--sub)]">
                    {BOOK_AUTHOR}　/　{BOOK_IMPRINT}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--sub)]">
                    <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                      <div className="absolute inset-y-0 right-0 rounded-full bg-[var(--accent)]" style={{ width: `${progress * 100}%` }} />
                    </div>
                    <span className="tabular-nums">{Math.round(progress * 100)}%</span>
                  </div>
                </div>
                <button
                  type="button"
                  autoFocus
                  aria-label="閉じる"
                  onClick={closePanel}
                  className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div role="tablist" aria-label="表示する一覧" className="flex gap-1 border-b border-[var(--line)] px-3">
                {(
                  [
                    ['toc', '目次'],
                    ['marks', `しおり（${marks.length}）`],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={tab === k}
                    onClick={() => setTab(k)}
                    className={`relative px-3 py-2.5 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 ${tab === k ? 'font-semibold text-[var(--ink)]' : 'text-[var(--sub)] hover:text-[var(--ink)]'}`}
                  >
                    {label}
                    {tab === k && <motion.span layoutId="vnr-tab" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[var(--accent)]" />}
                  </button>
                ))}
              </div>
              <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {tab === 'toc' ? (
                  <ol className="space-y-0.5">
                    {[{ label: '扉', num: '', page: m.titlePage, c: -1 }, ...CHAPTER_INFO.map((c, i) => ({ label: c.title, num: c.num, page: m.chapterPage[i], c: i }))].map((row) => {
                      const current = row.c === curChapter && page < m.colophonPage
                      return (
                        <li key={row.label}>
                          <button
                            type="button"
                            aria-current={current ? 'true' : undefined}
                            onClick={() => {
                              go(row.page)
                              closePanel()
                            }}
                            className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 ${current ? 'bg-[var(--hover)]' : ''}`}
                          >
                            <span className={`h-7 w-[3px] rounded-full ${current ? 'bg-[var(--accent)]' : 'bg-transparent'}`} />
                            <span className="w-5 text-center text-[13px] text-[var(--accent)]" style={{ fontFamily: FONTS.mincho.family }}>
                              {row.num || '◇'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px]" style={{ fontFamily: FONTS.mincho.family }}>
                                {row.label}
                              </span>
                              {current && <span className="block text-[10.5px] text-[var(--accent)]">読書中</span>}
                            </span>
                            <span className="text-[11px] text-[var(--sub)] tabular-nums">{row.page + 1}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                ) : sortedMarks.length === 0 ? (
                  <div className="grid place-items-center px-6 py-10 text-center">
                    <Bookmark className="size-8 text-[var(--sub)]/60" strokeWidth={1.4} />
                    <p className="mt-3 text-[13px]">しおりはまだありません</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--sub)]">ページの上端の角を押すか、上のしおりボタンで挟めます。</p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    <AnimatePresence initial={false}>
                      {sortedMarks.map((mk) => {
                        const p = m.first[mk.anchor] ?? 0
                        const a = ANCHORS[mk.anchor]
                        const c = a.chapter
                        const snippet = a.kind === 'heading' || a.kind === 'title' ? (ANCHORS[mk.anchor + 1]?.text ?? a.text) : a.text
                        return (
                          <motion.li
                            key={mk.id}
                            layout={!reduce}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="group flex items-stretch gap-1 rounded-lg transition-colors hover:bg-[var(--hover)]">
                              <button
                                type="button"
                                onClick={() => {
                                  go(p)
                                  closePanel()
                                }}
                                className="flex min-w-0 flex-1 gap-3 rounded-lg px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
                              >
                                <span
                                  aria-hidden="true"
                                  className="mt-0.5 h-5 w-2.5 shrink-0 bg-[var(--accent)]"
                                  style={{ clipPath: 'polygon(0 0,100% 0,100% 100%,50% 78%,0 100%)' }}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-baseline gap-2 text-[11px] text-[var(--sub)]">
                                    <span className="font-semibold text-[var(--ink)] tabular-nums">{p + 1}ページ</span>
                                    <span className="truncate">{c >= 0 ? `${CHAPTER_INFO[c].num}　${CHAPTER_INFO[c].title}` : '扉'}</span>
                                    <span className="ml-auto shrink-0">{relTime(mk.at, now)}</span>
                                  </span>
                                  <span className="mt-1 line-clamp-2 block text-[12.5px] leading-relaxed" style={{ fontFamily: FONTS.mincho.family }}>
                                    {snippet}
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                aria-label={`${p + 1}ページのしおりを削除`}
                                onClick={() => {
                                  setMarks((ms) => ms.filter((x) => x.id !== mk.id))
                                  showToast('しおりを削除しました')
                                }}
                                className="my-2 mr-1 grid size-8 shrink-0 place-items-center self-center rounded-full text-[var(--sub)] opacity-70 outline-none hover:bg-[var(--hover)] hover:text-[var(--accent)] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 group-hover:opacity-100"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </motion.li>
                        )
                      })}
                    </AnimatePresence>
                  </ul>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 表示設定 ── */}
      <AnimatePresence>
        {panel === 'settings' && (
          <>
            <motion.button
              key="settings-backdrop"
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute inset-0 z-30 cursor-default bg-black/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
            />
            <motion.div
              key="settings"
              role="dialog"
              aria-label="表示設定"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="absolute top-[52px] right-2 z-40 w-[min(312px,calc(100%-16px))] origin-top-right rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-2xl"
            >
              <SettingsBody
                sizeIdx={sizeIdx}
                setSizeIdx={setSizeIdx}
                spacing={spacing}
                setSpacing={setSpacing}
                font={font}
                setFont={setFont}
                theme={theme}
                setTheme={setTheme}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────── 表示設定パネル ───────────── */

function SettingsBody({
  sizeIdx,
  setSizeIdx,
  spacing,
  setSpacing,
  font,
  setFont,
  theme,
  setTheme,
}: {
  sizeIdx: number
  setSizeIdx: (n: number) => void
  spacing: SpacingId
  setSpacing: (s: SpacingId) => void
  font: FontId
  setFont: (f: FontId) => void
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}) {
  const firstRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    firstRef.current?.focus()
  }, [])
  const sectionTitle = 'mb-2 text-[11px] font-semibold tracking-[.12em] text-[var(--sub)]'
  const seg = (on: boolean) =>
    `rounded-lg border px-2 py-2 text-[12px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 ${on ? 'border-[var(--ink)] bg-[var(--hover)] font-semibold' : 'border-[var(--line)] hover:bg-[var(--hover)]'}`

  return (
    <div className="space-y-4">
      <section>
        <h3 className={sectionTitle}>文字サイズ</h3>
        <div className="flex items-center gap-2">
          <button
            ref={firstRef}
            type="button"
            aria-label="文字を小さく"
            disabled={sizeIdx === 0}
            onClick={() => setSizeIdx(Math.max(0, sizeIdx - 1))}
            className="grid size-9 place-items-center rounded-full border border-[var(--line)] outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 disabled:opacity-35"
          >
            <Minus className="size-4" />
          </button>
          <div className="flex flex-1 items-end justify-between px-1" role="group" aria-label={`文字サイズ ${SIZES[sizeIdx]}px`}>
            {SIZES.map((s, i) => (
              <button
                key={s}
                type="button"
                aria-label={`${s}px`}
                aria-pressed={i === sizeIdx}
                onClick={() => setSizeIdx(i)}
                className="grid h-7 w-5 place-items-end justify-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
              >
                <span
                  className={`block w-1 rounded-full transition-colors ${i <= sizeIdx ? 'bg-[var(--ink)]' : 'bg-[var(--line)]'}`}
                  style={{ height: 6 + i * 2.6 }}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="文字を大きく"
            disabled={sizeIdx === SIZES.length - 1}
            onClick={() => setSizeIdx(Math.min(SIZES.length - 1, sizeIdx + 1))}
            className="grid size-9 place-items-center rounded-full border border-[var(--line)] outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 disabled:opacity-35"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-center text-[10.5px] text-[var(--sub)] tabular-nums">{SIZES[sizeIdx]}px</p>
      </section>

      <section>
        <h3 className={sectionTitle}>行間</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(SPACINGS) as SpacingId[]).map((k, i) => (
            <button key={k} type="button" aria-pressed={spacing === k} onClick={() => setSpacing(k)} className={`${seg(spacing === k)} flex flex-col items-center gap-1.5`}>
              <span aria-hidden="true" className="flex h-4 flex-row-reverse items-stretch" style={{ gap: 2 + i * 2 }}>
                {[0, 1, 2, 3].map((n) => (
                  <span key={n} className="w-[2px] rounded-full bg-current opacity-60" />
                ))}
              </span>
              {SPACINGS[k].label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>書体</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(FONTS) as FontId[]).map((k) => (
            <button key={k} type="button" aria-pressed={font === k} onClick={() => setFont(k)} className={`${seg(font === k)} flex items-center justify-center gap-2`}>
              <span className="text-[19px] leading-none" style={{ fontFamily: FONTS[k].family }} aria-hidden="true">
                永あ
              </span>
              <span>{FONTS[k].label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>背景</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(THEMES) as ThemeId[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={theme === k}
              onClick={() => setTheme(k)}
              className="group flex flex-col items-center gap-1.5 rounded-lg py-1 text-[11.5px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
            >
              <span
                className={`relative grid size-11 place-items-center rounded-full text-[15px] ring-offset-2 ring-offset-[var(--panel)] transition-shadow ${theme === k ? 'ring-2 ring-[var(--accent)]' : 'ring-1 ring-[var(--line)] group-hover:ring-[var(--sub)]'}`}
                style={{ background: THEMES[k].vars['--paper'], color: THEMES[k].vars['--ink'], fontFamily: FONTS.mincho.family }}
                aria-hidden="true"
              >
                あ
              </span>
              <span className={theme === k ? 'font-semibold' : 'text-[var(--sub)]'}>{THEMES[k].label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
