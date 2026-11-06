import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

/**
 * 緑4階調LCDの携帯ゲーム機風UI(オリジナル)。
 * - 画面は 160×144 の論理解像度。タイル/スプライトは 8×8 のビットマップ文字列 → SVG data URI で描画
 * - 起動ロゴ → タイトル → マップ(十字キーで移動・Aで話す)→ STARTでメニュー → セーブ
 * - 十字キー/A/B/START はクリック、またはフォーカス中のキーボード(矢印・Z/Enter・X・Space)
 */

const PAL = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f']
const LCD_BG = PAL[0]

function bmp(rows: string[], flip = false) {
  let s = ''
  rows.forEach((r, y) =>
    [...r].forEach((c, x) => {
      if (c === '.') return
      const xx = flip ? r.length - 1 - x : x
      s += `<rect x="${xx}" y="${y}" width="1" height="1" fill="${PAL[+c]}"/>`
    }),
  )
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${s}</svg>`)}")`
}

const T = {
  grass: bmp(['00000000', '00010000', '00000000', '00000100', '01000000', '00000000', '00001000', '00000000']),
  tall: bmp(['00000000', '01001001', '12112112', '00000000', '00100100', '01201201', '00000000', '10010010']),
  tree: bmp(['00222200', '02211220', '22112212', '21122222', '22222232', '02222320', '00033000', '00033000']),
  water: bmp(['11111111', '11222111', '12111211', '11111111', '11111111', '21112221', '12221112', '11111111']),
  water2: bmp(['11111111', '11112221', '11121112', '11111111', '11111111', '12221112', '21112221', '11111111']),
  path: bmp(['11111111', '11111211', '11111111', '12111111', '11111111', '11112111', '11111111', '11111111']),
  roof: bmp(['33333333', '32323232', '33333333', '23232323', '33333333', '32323232', '33333333', '22222222']),
  wall: bmp(['11111111', '13333331', '13000031', '13000031', '13333331', '11111111', '22222222', '11111111']),
  door: bmp(['11111111', '11333311', '13222231', '13222231', '13222031', '13222231', '13222231', '13222231']),
  flower: bmp(['00000000', '00300300', '03230323', '00300300', '00200200', '00200200', '00000000', '00000000']),
  sign: bmp(['00000000', '03333330', '03111130', '03122130', '03111130', '03333330', '00033000', '00033000']),
}
const HERO = {
  down: ['00333300', '03111130', '03030330', '03111130', '00322300', '03322330', '00333300', '00300300'],
  up: ['00333300', '03333330', '03333330', '03333330', '00322300', '03322330', '00333300', '00300300'],
  side: ['00333300', '03111130', '03113030', '03111130', '00322300', '00332300', '00333300', '00300030'],
}
const NPC = bmp(['00222200', '02222220', '02010120', '00111100', '02333320', '23333332', '02333320', '00200200'])

// 10×9 マップ(16px メタタイル)
const MAP = [
  'TTTTTTTTTT',
  'T..ff..RRT',
  'T.,,...WDT',
  'T.,,..s..T',
  'T.....P..T',
  'T~~~..P..T',
  'T~~~..P,,T',
  'T.....P,,T',
  'TTTTTTTTTT',
]
const SOLID = new Set(['T', '~', 'R', 'W', 's'])
const tileOf = (c: string, f: number) =>
  ({ T: T.tree, '~': f ? T.water2 : T.water, ',': T.tall, P: T.path, R: T.roof, W: T.wall, D: T.door, f: T.flower, s: T.sign })[c] ?? T.grass

type Screen = 'boot' | 'title' | 'map'
type Dir = 'up' | 'down' | 'left' | 'right'

export function HandheldLcd() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [screen, setScreen] = useState<Screen>('boot')
  const [pos, setPos] = useState({ x: 4, y: 6 })
  const [dir, setDir] = useState<Dir>('down')
  const [dialog, setDialog] = useState<string[] | null>(null)
  const [typed, setTyped] = useState(0)
  const [menu, setMenu] = useState<null | number>(null)
  const [frame, setFrame] = useState(0)
  const [pressed, setPressed] = useState<string | null>(null)
  const [scale, setScale] = useState(1.5)
  const npc = { x: 7, y: 4 }

  // 起動ロゴ → タイトル
  useEffect(() => {
    if (screen !== 'boot') return
    const t = setTimeout(() => setScreen('title'), 2200)
    return () => clearTimeout(t)
  }, [screen])
  // 水面アニメ・点滅
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => f ^ 1), 520)
    return () => clearInterval(t)
  }, [])
  // タイプライター
  const fullText = dialog?.join('\n') ?? ''
  useEffect(() => {
    if (!dialog || typed >= fullText.length) return
    const t = setTimeout(() => setTyped((n) => n + 1), 35)
    return () => clearTimeout(t)
  }, [dialog, typed, fullText.length])
  // 画面サイズに合わせて拡大率を決める
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const h = el.clientHeight
      setScale(Math.max(1, Math.min(2.5, (h - 250) / 144)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const say = (lines: string[]) => {
    setDialog(lines)
    setTyped(0)
  }

  const press = useCallback(
    (b: string) => {
      setPressed(b)
      setTimeout(() => setPressed((p) => (p === b ? null : p)), 120)
      if (screen === 'boot') return
      if (screen === 'title') {
        if (b === 'START' || b === 'A') setScreen('map')
        return
      }
      if (dialog) {
        if (b === 'A' || b === 'B') {
          if (typed < fullText.length) setTyped(fullText.length)
          else setDialog(null)
        }
        return
      }
      if (menu !== null) {
        if (b === 'up') setMenu((m) => ((m ?? 0) + 3) % 4)
        if (b === 'down') setMenu((m) => ((m ?? 0) + 1) % 4)
        if (b === 'B' || b === 'START') setMenu(null)
        if (b === 'A') {
          const m = menu
          setMenu(null)
          if (m === 0) say(['ITEMS:', 'POTION x3  ROPE x1'])
          if (m === 1) say(['HERO  LV 12', 'HP 38/42  G 1280'])
          if (m === 2) say(['SAVING... DO NOT', 'TURN OFF POWER.'])
          if (m === 3) setScreen('title')
        }
        return
      }
      if (b === 'START') return setMenu(0)
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const
      if (b in d) {
        const [dx, dy] = d[b as Dir]
        setDir(b as Dir)
        const nx = pos.x + dx
        const ny = pos.y + dy
        const c = MAP[ny]?.[nx]
        if (c && !SOLID.has(c) && !(nx === npc.x && ny === npc.y)) setPos({ x: nx, y: ny })
        return
      }
      if (b === 'A') {
        const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir]
        const fx = pos.x + dx
        const fy = pos.y + dy
        if (fx === npc.x && fy === npc.y) say(['OLD MAN: THE LAKE', 'HIDES A SECRET...'])
        else if (MAP[fy]?.[fx] === 's') say(['<- LAKE   TOWN ->', 'PIXEL VILLAGE'])
        else if (MAP[fy]?.[fx] === 'D') say(['THE DOOR IS', 'LOCKED.'])
        else if (MAP[fy]?.[fx] === '~') say(['THE WATER IS', 'COLD AND CLEAR.'])
      }
    },
    [screen, dialog, typed, fullText.length, menu, pos, dir, npc.x, npc.y],
  )

  const onKey = (e: React.KeyboardEvent) => {
    const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', z: 'A', Z: 'A', x: 'B', X: 'B', Enter: 'START', ' ': 'A' }[e.key]
    if (k) {
      e.preventDefault()
      press(k)
    }
  }

  const heroSprite = useMemo(
    () => (dir === 'up' ? bmp(HERO.up) : dir === 'down' ? bmp(HERO.down) : bmp(HERO.side, dir === 'left')),
    [dir],
  )

  const px: CSSProperties = { imageRendering: 'pixelated' }
  const box: CSSProperties = { background: PAL[0], border: `2px solid ${PAL[3]}`, boxShadow: `inset 0 0 0 1px ${PAL[0]}, inset 0 0 0 2px ${PAL[2]}` }

  const btn = (b: string) => (pressed === b ? 'translate-y-[1px] brightness-90' : '')

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={() => rootRef.current?.focus()}
      className="relative flex h-full w-full items-center justify-center gap-6 overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#3f3f46,#18181b)] outline-none select-none"
    >
      {/* 本体 */}
      <div
        className="relative flex flex-col items-center rounded-[14px] rounded-br-[52px] px-4 pt-3 pb-3 shadow-[0_18px_40px_rgba(0,0,0,.6),inset_-4px_-6px_0_rgba(0,0,0,.12),inset_3px_3px_0_rgba(255,255,255,.5)]"
        style={{ background: 'linear-gradient(160deg,#d8d6cf,#bdbab1)' }}
      >
        <div className="mb-2 flex w-full justify-between font-mono text-[8px] tracking-widest text-[#7c7a73]">
          <span>◁ OFF·ON ▷</span>
        </div>
        {/* ベゼル */}
        <div className="rounded-[8px] rounded-br-[28px] bg-[#5c5f6b] px-5 pt-3 pb-5 shadow-inner">
          <div className="mb-1 flex items-center gap-2 font-mono text-[7px] tracking-[.18em] text-[#c9c9d1]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_#f00]" />
            <span className="h-[2px] w-6 bg-[#8b2d5a]" />
            DOT MATRIX LCD
            <span className="h-[2px] w-6 bg-[#2b3a87]" />
          </div>
          <div style={{ width: 160 * scale, height: 144 * scale, background: LCD_BG }} className="relative overflow-hidden">
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{ width: 160, height: 144, transform: `scale(${scale})`, fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: PAL[3], lineHeight: '10px' }}
            >
              {screen === 'boot' && (
                <div className="absolute inset-x-0 text-center text-[10px] font-bold tracking-tight" style={{ animation: 'hlLogo 1.6s steps(24) forwards', color: PAL[3] }}>
                  POCKET·PIXEL<sup className="text-[5px]">®</sup>
                </div>
              )}
              {screen === 'title' && (
                <div className="flex h-full flex-col items-center justify-center gap-3" style={{ background: PAL[1] }}>
                  <div className="px-2 py-1 text-[11px] leading-[14px]" style={{ ...box, background: PAL[0] }}>
                    PIXEL
                    <br />
                    &nbsp;&nbsp;QUEST
                  </div>
                  <div className="h-4 w-4" style={{ backgroundImage: bmp(HERO.down), backgroundSize: 'cover', ...px }} />
                  <div style={{ visibility: frame ? 'visible' : 'hidden' }}>PRESS START</div>
                  <div className="text-[6px]" style={{ color: PAL[2] }}>
                    © 2001 RETRO DEMO
                  </div>
                </div>
              )}
              {screen === 'map' && (
                <>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(10,16px)' }}>
                    {MAP.flatMap((row, y) =>
                      [...row].map((c, x) => (
                        <div key={`${x}-${y}`} style={{ width: 16, height: 16, backgroundImage: tileOf(c, frame), backgroundSize: '16px 16px', ...px }} />
                      )),
                    )}
                  </div>
                  <div className="absolute" style={{ left: npc.x * 16, top: npc.y * 16, width: 16, height: 16, backgroundImage: NPC, backgroundSize: 'cover', ...px }} />
                  <div
                    className="absolute transition-[left,top] duration-150 ease-linear"
                    style={{ left: pos.x * 16, top: pos.y * 16 - (frame ? 1 : 0), width: 16, height: 16, backgroundImage: heroSprite, backgroundSize: 'cover', ...px }}
                  />
                  {menu !== null && (
                    <div className="absolute top-1 right-1 w-[78px] px-1 py-1.5" style={box}>
                      {['ITEMS', 'STATUS', 'SAVE', 'EXIT'].map((m, i) => (
                        <div key={m} className="flex h-[13px] items-center">
                          <span className="w-[10px]">{menu === i ? '▶' : ''}</span>
                          {m}
                        </div>
                      ))}
                    </div>
                  )}
                  {dialog && (
                    <div className="absolute inset-x-0 bottom-0 h-[44px] px-2 py-2 whitespace-pre" style={box}>
                      {fullText.slice(0, typed)}
                      {typed >= fullText.length && (
                        <span className="absolute right-2 bottom-1" style={{ visibility: frame ? 'visible' : 'hidden' }}>
                          ▼
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            {/* 液晶のドット格子 */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(rgba(15,56,15,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,56,15,.08) 1px, transparent 1px)`,
                backgroundSize: `${scale}px ${scale}px`,
              }}
            />
          </div>
        </div>
        <div className="mt-1 self-start pl-1 font-[Orbitron] text-[11px] font-black text-[#2b3a87] italic">
          Pocket<span className="text-[#8b2d5a]">·</span>Pixel
        </div>

        {/* コントローラ */}
        <div className="mt-2 flex w-full items-center justify-between px-1">
          <div className="relative h-[66px] w-[66px]">
            {(
              [
                ['up', 'left-[22px] top-0 h-[24px] w-[22px] rounded-t-[3px]'],
                ['down', 'left-[22px] bottom-0 h-[24px] w-[22px] rounded-b-[3px]'],
                ['left', 'left-0 top-[22px] h-[22px] w-[24px] rounded-l-[3px]'],
                ['right', 'right-0 top-[22px] h-[22px] w-[24px] rounded-r-[3px]'],
              ] as const
            ).map(([b, cls]) => (
              <button key={b} aria-label={b} onClick={() => press(b)} className={`absolute bg-[#27272a] shadow-[0_2px_0_#000] ${cls} ${btn(b)}`} />
            ))}
            <div className="absolute top-[22px] left-[22px] h-[22px] w-[22px] bg-[#27272a]" />
            <div className="absolute top-[29px] left-[29px] h-2 w-2 rounded-full bg-[#1c1c1f] shadow-inner" />
          </div>
          <div className="flex -rotate-[25deg] gap-3">
            {['B', 'A'].map((b) => (
              <div key={b} className="flex flex-col items-center">
                <button
                  onClick={() => press(b)}
                  className={`h-[30px] w-[30px] rounded-full bg-[#9a2257] shadow-[0_3px_0_#5a0f30,inset_0_2px_0_rgba(255,255,255,.25)] ${btn(b)}`}
                  aria-label={b}
                />
                <span className="mt-0.5 font-mono text-[9px] font-bold text-[#2b3a87]">{b}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex gap-4">
          {['SELECT', 'START'].map((b) => (
            <div key={b} className="flex -rotate-[25deg] flex-col items-center">
              <button onClick={() => press(b)} className={`h-[8px] w-[30px] rounded-full bg-[#77766f] shadow-[0_2px_0_#55544e] ${btn(b)}`} aria-label={b} />
              <span className="mt-0.5 font-mono text-[7px] font-bold text-[#2b3a87]">{b}</span>
            </div>
          ))}
        </div>
        {/* スピーカー */}
        <div className="absolute right-5 bottom-5 flex -rotate-[25deg] gap-[5px]">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="h-[30px] w-[4px] rounded-full bg-[#8f8c84] shadow-[inset_1px_1px_1px_rgba(0,0,0,.4)]" />
          ))}
        </div>
      </div>

      {/* 操作ガイド */}
      <div className="hidden max-w-[150px] flex-col gap-1.5 font-mono text-[10px] leading-relaxed text-zinc-400 sm:flex">
        <div className="mb-1 text-[11px] font-bold text-zinc-200">操作</div>
        <div>↑↓←→ 移動</div>
        <div>Z / Space = A(話す)</div>
        <div>X = B(戻る)</div>
        <div>Enter = START(メニュー)</div>
        <div className="mt-2 text-zinc-500">クリックしてフォーカス → キーボード操作も可</div>
      </div>

      <style>{`@keyframes hlLogo { from { top: -16px } to { top: 62px } }`}</style>
    </div>
  )
}
