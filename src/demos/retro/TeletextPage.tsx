import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * テレテキスト(文字放送)風ページ。
 * - 40桁×24行のセルグリッド、8色、2×3 の「ブロックモザイク」グラフィック、倍高文字
 * - 3桁のページ番号を入力(キーボード or リモコン)→ ヘッダーのページ番号が回りながら検索 → 表示
 * - Fastext(赤・緑・黄・シアン)ボタンでページ移動、ニュースはサブページが自動で切り替わる
 */

const COL = { k: '#000', r: '#ff0000', g: '#00ff00', y: '#ffff00', b: '#0000ff', m: '#ff00ff', c: '#00ffff', w: '#ffffff' } as const
type Col = keyof typeof COL
interface Cell {
  ch: string
  fg: Col
  bg: Col
  mos?: number
  dh?: boolean
}
const W = 40
const H = 24

const FONT: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], N: ['#.#', '###', '###', '#.#', '#.#'], O: ['###', '#.#', '#.#', '#.#', '###'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '#.#', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'], ' ': ['...', '...', '...', '...', '...'],
}

function blank(): Cell[][] {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => ({ ch: ' ', fg: 'w' as Col, bg: 'k' as Col })))
}
/** "{y}TEXT{w}more" 形式で色付き文字を書く */
function put(g: Cell[][], r: number, c: number, s: string, bg: Col = 'k', dh = false) {
  let fg: Col = 'w'
  let x = c
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{' && s[i + 2] === '}') {
      fg = s[i + 1] as Col
      i += 2
      continue
    }
    if (x < W) g[r][x++] = { ch: s[i], fg, bg, dh }
  }
}
function fill(g: Cell[][], r: number, bg: Col, c0 = 0, c1 = W) {
  for (let x = c0; x < c1; x++) g[r][x] = { ...g[r][x], bg }
}
/** 2×3 ピクセル = 1セル のモザイクを描く(# がON) */
function mosaic(g: Cell[][], r0: number, c0: number, px: string[], fg: Col, bg: Col = 'k') {
  for (let r = 0; r * 3 < px.length; r++)
    for (let c = 0; c * 2 < px[0].length; c++) {
      let m = 0
      for (let dy = 0; dy < 3; dy++)
        for (let dx = 0; dx < 2; dx++) if (px[r * 3 + dy]?.[c * 2 + dx] === '#') m |= 1 << (dy * 2 + dx)
      const R = r0 + r
      const C = c0 + c
      if (R < H && C < W) g[R][C] = { ch: ' ', fg, bg, mos: m }
    }
}
/** 3×5 フォントを2倍にしてモザイク文字にする */
function bigText(s: string) {
  const rows = Array.from({ length: 10 }, () => '')
  for (const ch of s) {
    const f = FONT[ch] ?? FONT[' ']
    for (let y = 0; y < 10; y++) {
      const line = f[Math.floor(y / 2)]
      rows[y] += [...line].map((p) => p + p).join('') + '..'
    }
  }
  return [...rows, '.'.repeat(rows[0].length), '.'.repeat(rows[0].length)]
}
function sunCloud() {
  const sun = ['......##......', '..#..####..#..', '...########...', '..##########..', '.############.', '..##########..', '...########...', '..#..####..#..', '......##......']
  return sun
}

function buildPage(no: number, sub: number): Cell[][] {
  const g = blank()
  const banner = (title: string, fg: Col, bg: Col) => {
    for (let r = 1; r <= 4; r++) fill(g, r, bg)
    mosaic(g, 1, 2, bigText(title), fg, bg)
  }
  const fast = (labels: [string, string, string, string]) => {
    const cols: Col[] = ['r', 'g', 'y', 'c']
    let x = 0
    labels.forEach((l, i) => {
      put(g, 23, x, `{${cols[i]}}${l}`)
      x += 10
    })
  }
  if (no === 100) {
    banner('INDEX', 'y', 'b')
    put(g, 2, 26, '{w}TEXT  TV', 'b')
    put(g, 3, 26, '{c}SERVICE', 'b')
    const rows: [string, string, Col][] = [
      ['NEWS HEADLINES', '101', 'y'],
      ['WEATHER & MAPS', '200', 'g'],
      ['TV GUIDE TONIGHT', '300', 'c'],
      ['SPORT RESULTS', '400', 'm'],
      ['TRAVEL & TRAINS', '500', 'y'],
      ['SUBTITLES', '888', 'w'],
    ]
    rows.forEach(([t, p, c], i) => put(g, 7 + i * 2, 3, `{${c}}${t.padEnd(26, '.')}{w}${p}`))
    put(g, 20, 3, '{c}Type a 3-digit page number')
    fast(['News', 'Weather', 'TV Guide', 'Index'])
  } else if (no === 101) {
    banner('NEWS', 'w', 'r')
    put(g, 2, 26, `{y}${sub + 1}/3`, 'r')
    const stories = [
      ['TRAIN LINE REOPENS AFTER', 'STORM REPAIRS COMPLETED', 'Services on the coastal line resumed', 'this morning after three days of', 'repairs to flooded track sections.'],
      ['CITY FESTIVAL DRAWS', 'RECORD CROWDS', 'More than 200,000 visitors attended', 'the weekend lantern festival, the', 'organisers said on Sunday evening.'],
      ['NEW SPACE PROBE SENDS', 'FIRST IMAGES HOME', 'Scientists say the pictures of the', 'outer moons are "beyond what we had', 'hoped for" in clarity and detail.'],
    ][sub]
    put(g, 6, 1, `{y}${stories[0]}`, 'k', true)
    put(g, 8, 1, `{y}${stories[1]}`, 'k', true)
    stories.slice(2).forEach((l, i) => put(g, 11 + i, 1, `{w}${l}`))
    put(g, 16, 1, '{c}More stories on pages 102-109')
    for (let x = 1; x < 39; x++) g[18][x] = { ch: ' ', fg: 'b', bg: 'k', mos: 0b001100 }
    put(g, 19, 1, '{g}LATEST: {w}Markets close higher')
    fast(['Next', 'Weather', 'TV Guide', 'Index'])
  } else if (no === 200) {
    banner('WEATHER', 'k', 'c')
    mosaic(g, 6, 2, sunCloud(), 'y')
    put(g, 6, 12, '{y}TODAY: {w}SUNNY SPELLS, LIGHT')
    put(g, 7, 12, '{w}WINDS. CLOUD LATER.')
    const cities: [string, number, number, Col][] = [
      ['TOKYO', 18, 9, 'y'],
      ['OSAKA', 19, 11, 'y'],
      ['SAPPORO', 9, 2, 'c'],
      ['FUKUOKA', 20, 12, 'y'],
      ['NAHA', 25, 20, 'r'],
    ]
    put(g, 11, 2, '{c}CITY          MAX   MIN')
    cities.forEach(([n, mx, mn, c], i) => put(g, 12 + i, 2, `{w}${n.padEnd(14)}{${c}}${String(mx).padStart(3)}C {c}${String(mn).padStart(3)}C`))
    put(g, 19, 2, '{g}OUTLOOK: {w}Dry and mild all week')
    fast(['News', 'Index', 'TV Guide', 'Index'])
  } else if (no === 300) {
    banner('TV', 'w', 'm')
    put(g, 2, 26, '{y}TONIGHT', 'm')
    const progs: [string, string][] = [
      ['18.00', 'Evening News & Weather'],
      ['18.30', 'Wildlife Diaries'],
      ['19.00', 'Quiz Night Live'],
      ['20.00', 'Detective Mori (3/6)'],
      ['21.00', 'Late Movie: Neon City'],
      ['23.15', 'Night Music'],
      ['00.30', 'Close / Test Card'],
    ]
    progs.forEach(([t, p], i) => put(g, 7 + i * 2, 2, `{c}${t}  {w}${p}`))
    put(g, 21, 2, '{y}Subtitles available on page 888')
    fast(['News', 'Weather', 'Next', 'Index'])
  } else {
    put(g, 10, 6, `{r}PAGE ${no}`, 'k', true)
    put(g, 13, 6, '{w}This page is not in transmission.')
    put(g, 15, 6, '{c}Press {r}RED{c} for the index.')
    fast(['Index', 'News', 'Weather', 'TV Guide'])
  }
  return g
}

const LINKS: Record<number, [number, number, number, number]> = {
  100: [101, 200, 300, 100],
  101: [101, 200, 300, 100],
  200: [101, 100, 300, 100],
  300: [101, 200, 300, 100],
}
const NAMES = ['日', '月', '火', '水', '木', '金', '土']

function MosaicCell({ m, fg }: { m: number; fg: string }) {
  return (
    <span className="grid h-full w-full grid-cols-2 grid-rows-3">
      {[0, 1, 2, 3, 4, 5].map((b) => (
        <span key={b} style={{ background: m & (1 << b) ? fg : 'transparent' }} />
      ))}
    </span>
  )
}

export function TeletextPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(100)
  const [entry, setEntry] = useState('')
  const [searching, setSearching] = useState<number | null>(null)
  const [roll, setRoll] = useState(100)
  const [sub, setSub] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const [cell, setCell] = useState({ w: 12, h: 14 })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const el = screenRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = Math.floor(Math.min(el.clientWidth / W, el.clientHeight / H / 1.18))
      setCell({ w, h: Math.floor(w * 1.18) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // ページ検索中はヘッダーの番号がくるくる回る
  useEffect(() => {
    if (searching === null) return
    let n = roll
    const it = setInterval(() => {
      n = n >= 899 ? 100 : n + 7
      setRoll(n)
    }, 45)
    const done = setTimeout(() => {
      setPage(searching)
      setRoll(searching)
      setSub(0)
      setSearching(null)
    }, 900)
    return () => {
      clearInterval(it)
      clearTimeout(done)
    }
  }, [searching])
  // ニュースのサブページ自動送り
  useEffect(() => {
    if (page !== 101) return
    const t = setInterval(() => setSub((s) => (s + 1) % 3), 6000)
    return () => clearInterval(t)
  }, [page])

  const goto = (n: number) => {
    setEntry('')
    if (n === page && n !== 101) return
    if (n === 101 && page === 101) return setSub((s) => (s + 1) % 3)
    setSearching(n)
  }
  const digit = (d: string) => {
    const e = (entry + d).slice(0, 3)
    if (e.length === 1 && d === '0') return
    setEntry(e)
    if (e.length === 3) setTimeout(() => goto(+e), 150)
  }
  const color = (i: number) => goto((LINKS[page] ?? [100, 101, 200, 300])[i])

  const grid = useMemo(() => buildPage(page, sub), [page, sub])
  const p2 = (n: number) => String(n).padStart(2, '0')
  const shown = searching !== null ? roll : page
  const header = `P${(entry || String(searching ?? page)).padEnd(3, '-')}  TEXT-TV ${shown} ${NAMES[now.getDay()]} ${p2(now.getDate())}/${p2(now.getMonth() + 1)} ${p2(now.getHours())}:${p2(now.getMinutes())}/${p2(now.getSeconds())}`
  const rows: Cell[][] = grid.map((r, i) => (i === 0 ? [...header.padEnd(W)].map((ch, x): Cell => ({ ch, fg: (x < 5 ? 'w' : x < 14 ? 'c' : x < 18 ? 'y' : 'w') as Col, bg: 'k' as Col })) : r))

  const onKey = (e: React.KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) digit(e.key)
    else if ('rgyc'.includes(e.key) && e.key.length === 1) color('rgyc'.indexOf(e.key))
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') goto(Math.min(899, page + 1))
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') goto(Math.max(100, page - 1))
    else return
    e.preventDefault()
  }

  const fastBtn = ['bg-red-600', 'bg-green-500', 'bg-yellow-400', 'bg-cyan-400']
  const fastLbl = ['赤', '緑', '黄', '青']

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={() => rootRef.current?.focus()}
      className="relative flex h-full w-full items-center gap-4 overflow-hidden bg-[radial-gradient(circle_at_30%_30%,#3f3f46,#0a0a0a)] p-4 outline-none select-none"
    >
      {/* TV */}
      <div className="flex h-full min-w-0 flex-1 flex-col rounded-[22px] bg-[linear-gradient(#4a4a4f,#2a2a2e)] p-3 shadow-[0_20px_40px_rgba(0,0,0,.6),inset_0_2px_0_rgba(255,255,255,.15)]">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] bg-black shadow-[inset_0_0_30px_rgba(0,0,0,.9)]" ref={screenRef}>
          <div className="absolute top-1/2 left-1/2 -translate-1/2" style={{ fontFamily: 'VT323, monospace', fontSize: cell.w * 1.75, lineHeight: `${cell.h}px` }}>
            {rows.map((r, y) => (
              <div key={y} className="flex" style={{ height: cell.h, visibility: y > 0 && rows[y - 1].some((c) => c.dh) ? 'hidden' : 'visible' }}>
                {r.map((c, x) => (
                  <span key={x} className="relative block overflow-visible text-center" style={{ width: cell.w, height: cell.h, background: COL[c.bg], color: COL[c.fg] }}>
                    {c.mos !== undefined ? (
                      <MosaicCell m={c.mos} fg={COL[c.fg]} />
                    ) : c.dh ? (
                      <span className="absolute inset-x-0 top-0 block origin-top scale-y-[2]">{c.ch}</span>
                    ) : (
                      c.ch
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(transparent_0_2px,rgba(0,0,0,.25)_2px_3px)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[18px] shadow-[inset_0_0_40px_rgba(255,255,255,.06)]" />
        </div>
        <div className="mt-2 flex items-center justify-between px-2 text-[9px] tracking-[.3em] text-zinc-500">
          <span>COLOUR TV</span>
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_red]" />
        </div>
      </div>

      {/* リモコン */}
      <div className="flex w-[104px] shrink-0 flex-col items-center gap-2 rounded-[28px] bg-[linear-gradient(#27272a,#18181b)] px-2.5 py-3 shadow-[0_10px_24px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.12)]">
        <div className="text-[9px] text-zinc-400">文字放送 TEXT</div>
        <div className="grid grid-cols-3 gap-1.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map((d, i) =>
            d ? (
              <button key={i} onClick={() => digit(d)} className="h-6 w-6 rounded-full bg-zinc-600 text-[11px] font-bold text-white shadow-[0_2px_0_#111] active:translate-y-[1px]">
                {d}
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {fastBtn.map((c, i) => (
            <button key={c} onClick={() => color(i)} className={`h-4 w-5 rounded-sm ${c} text-[7px] font-bold text-black shadow-[0_2px_0_#111] active:translate-y-[1px]`}>
              {fastLbl[i]}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => goto(Math.max(100, page - 1))} className="rounded-md bg-zinc-700 px-2 text-[10px] text-white">
            P−
          </button>
          <button onClick={() => goto(Math.min(899, page + 1))} className="rounded-md bg-zinc-700 px-2 text-[10px] text-white">
            P+
          </button>
        </div>
        <div className="text-center text-[8.5px] leading-tight text-zinc-500">数字3桁でページ移動 / キー r g y c</div>
      </div>
    </div>
  )
}
