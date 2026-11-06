import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

/**
 * ブラウン管(CRT)風ターミナル。ライブラリ不使用、CSS のみで質感を表現。
 * - 走査線: repeating-linear-gradient、流れる光の帯: keyframes、ちらつき: opacity の微振動
 * - 文字の発光: text-shadow、周辺減光: inset box-shadow + radial-gradient
 * - 起動シーケンスを順に表示 → コマンド入力(help / ls / neofetch / theme など)
 * - 履歴は ↑↓、画面クリックで入力にフォーカス(preventScroll でページを動かさない)
 */

type Kind = 'out' | 'cmd' | 'err' | 'dim' | 'hi'
type Line = { text: string; kind: Kind }
type Theme = 'green' | 'amber' | 'cyan'

const THEMES: Record<Theme, string> = { green: '#39ff7a', amber: '#ffb000', cyan: '#5ff4ff' }
const PROMPT = 'guest@ui-catalog:~$'

const BOOT: Line[] = [
  { text: 'UI-BIOS v2.6   (C) 1986-2026 Retro Systems Inc.', kind: 'hi' },
  { text: 'CPU: Virtual 8086 @ 4.77 MHz', kind: 'out' },
  { text: 'Memory Test: 640K OK', kind: 'out' },
  { text: 'Detecting drives....... [A:] [C:] [D:]', kind: 'out' },
  { text: 'Loading kernel: react-19.sys ............ OK', kind: 'out' },
  { text: 'Mounting /dev/three ...................... OK', kind: 'out' },
  { text: 'Starting crt-sh ........................... OK', kind: 'out' },
  { text: '', kind: 'out' },
  { text: "Welcome to UI-OS 1.0. Type 'help' to get started.", kind: 'hi' },
]

const NEOFETCH = [
  '   .------.      guest@ui-catalog',
  '  / ===== \\     ----------------',
  ' |  >_     |    OS:     UI-OS 1.0 (Retro)',
  ' |         |    Kernel: React 19',
  '  \\_______/     Shell:  crt-sh',
  '   _|___|_      UI:     Tailwind CSS v4',
  '  [_______]     Motion: motion / GSAP',
  '                3D:     three.js + R3F',
  '                Uptime: 42 mins',
]

const FILES = ['readme.txt', 'projects/', 'secret.txt', 'catalog.exe']

function runCommand(raw: string, setTheme: (t: Theme) => void): Line[] | 'clear' {
  const [cmd, ...args] = raw.trim().split(/\s+/)
  const out = (text: string, kind: Kind = 'out'): Line => ({ text, kind })
  switch ((cmd ?? '').toLowerCase()) {
    case '':
      return []
    case 'help':
      return [
        out('Available commands:', 'hi'),
        out('  help        show this help'),
        out('  ls          list files'),
        out('  cat <file>  print a file'),
        out('  neofetch    system information'),
        out('  whoami      current user'),
        out('  date        current date and time'),
        out('  echo <txt>  print text'),
        out('  theme <green|amber|cyan>  change phosphor color'),
        out('  clear       clear the screen'),
      ]
    case 'ls':
      return [out(FILES.join('   '))]
    case 'cat': {
      const f = args[0]
      if (f === 'readme.txt') return [out('This terminal is pure CSS: scanlines, glow, flicker and vignette.'), out('No libraries were harmed.')]
      if (f === 'secret.txt') return [out('Permission denied. Nice try ;)', 'err')]
      if (!f) return [out('usage: cat <file>', 'err')]
      return [out(`cat: ${f}: No such file or directory`, 'err')]
    }
    case 'neofetch':
      return NEOFETCH.map((l) => out(l, 'hi'))
    case 'whoami':
      return [out('guest')]
    case 'date':
      return [out(new Date().toString())]
    case 'echo':
      return [out(args.join(' '))]
    case 'theme': {
      const t = args[0] as Theme
      if (t in THEMES) {
        setTheme(t)
        return [out(`phosphor set to ${t}`, 'dim')]
      }
      return [out('usage: theme <green|amber|cyan>', 'err')]
    }
    case 'sudo':
      return [out('guest is not in the sudoers file. This incident will be reported.', 'err')]
    case 'clear':
      return 'clear'
    case './catalog.exe':
    case 'catalog.exe':
      return [out('Launching UI Showcase Catalog... (you are already here)', 'hi')]
    default:
      return [out(`${cmd}: command not found`, 'err')]
  }
}

const CSS = `
@keyframes crt-flicker { 0%{opacity:.97} 25%{opacity:1} 50%{opacity:.985} 75%{opacity:1} 100%{opacity:.975} }
@keyframes crt-band { 0%{transform:translateY(-120%)} 100%{transform:translateY(520%)} }
@keyframes crt-blink { 50%{opacity:0} }
@keyframes crt-on { 0%{transform:scale(1,0.004); filter:brightness(4)} 40%{transform:scale(1,0.004)} 70%{transform:scale(1,1); filter:brightness(2)} 100%{filter:brightness(1)} }
.crt-screen { animation: crt-on .9s ease-out both; }
.crt-text { text-shadow: 0 0 1px currentColor, 0 0 6px color-mix(in srgb, currentColor 70%, transparent), 0 0 14px color-mix(in srgb, currentColor 35%, transparent); animation: crt-flicker .12s infinite; }
.crt-scan { background: repeating-linear-gradient(to bottom, rgba(0,0,0,.28) 0px, rgba(0,0,0,.28) 1px, transparent 1px, transparent 3px); }
.crt-band { animation: crt-band 6s linear infinite; background: linear-gradient(to bottom, transparent, rgba(255,255,255,.05), transparent); }
.crt-caret { animation: crt-blink 1s steps(2) infinite; }
`

export function TerminalCRT() {
  const [lines, setLines] = useState<Line[]>([])
  const [booted, setBooted] = useState(false)
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [theme, setTheme] = useState<Theme>('green')
  const [history, setHistory] = useState<string[]>([])
  const [hIdx, setHIdx] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // boot sequence
  useEffect(() => {
    const timers = BOOT.map((line, i) =>
      window.setTimeout(() => setLines((l) => [...l, line]), 700 + i * 260 + (i > 3 ? 200 : 0)),
    )
    timers.push(window.setTimeout(() => setBooted(true), 700 + BOOT.length * 260 + 300))
    return () => timers.forEach(clearTimeout)
  }, [])

  // auto scroll (scrollTop なのでページはスクロールしない)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, booted])

  const submit = () => {
    const result = runCommand(input, setTheme)
    if (input.trim()) setHistory((h) => [...h, input])
    setHIdx(-1)
    if (result === 'clear') setLines([])
    else setLines((l) => [...l, { text: `${PROMPT} ${input}`, kind: 'cmd' }, ...result])
    setInput('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
    else if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault()
      const i = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1)
      setHIdx(i)
      setInput(history[i])
    } else if (e.key === 'ArrowDown' && hIdx >= 0) {
      e.preventDefault()
      const i = hIdx + 1
      if (i >= history.length) {
        setHIdx(-1)
        setInput('')
      } else {
        setHIdx(i)
        setInput(history[i])
      }
    }
  }

  const color = THEMES[theme]
  const kindColor: Record<Kind, string> = {
    out: color,
    cmd: color,
    hi: color,
    dim: `color-mix(in srgb, ${color} 55%, black)`,
    err: '#ff5f56',
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#1a1a17] p-3">
      <style>{CSS}</style>
      {/* bezel */}
      <div className="relative h-full w-full rounded-[22px] bg-gradient-to-b from-[#3a3a34] to-[#24241f] p-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.6)]">
        <div
          className="crt-screen relative h-full w-full cursor-text overflow-hidden rounded-[18px/26px]"
          style={{ background: `radial-gradient(ellipse at center, color-mix(in srgb, ${color} 9%, #050805) 0%, #020302 75%)` }}
          onClick={() => inputRef.current?.focus({ preventScroll: true })}
        >
          <div
            ref={scrollRef}
            className="crt-text relative h-full overflow-y-auto overscroll-contain px-5 py-4 text-[17px] leading-[1.15] [scrollbar-width:none]"
            style={{ color, fontFamily: "VT323, 'JetBrains Mono', monospace" }}
          >
            {lines.map((l, i) => (
              <div key={i} className="min-h-[1.15em] whitespace-pre-wrap break-words" style={{ color: kindColor[l.kind] }}>
                {l.kind === 'hi' ? <b className="font-normal brightness-125">{l.text}</b> : l.text}
              </div>
            ))}
            {booted && (
              <div className="flex whitespace-pre-wrap break-all">
                <span>
                  {PROMPT} {input}
                  <span className={`inline-block h-[0.95em] w-[0.55em] translate-y-[0.12em] ${focused ? 'crt-caret' : 'opacity-40'}`} style={{ background: color }} />
                </span>
              </div>
            )}
            {booted && !focused && lines.length > 0 && (
              <div className="mt-2" style={{ color: kindColor.dim }}>
                [ click to type ]
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={!booted}
            aria-label="terminal input"
            autoComplete="off"
            spellCheck={false}
            className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
          />
          {/* overlays */}
          <div className="crt-scan pointer-events-none absolute inset-0" />
          <div className="crt-band pointer-events-none absolute inset-x-0 top-0 h-1/4" />
          <div className="pointer-events-none absolute inset-0 rounded-[18px/26px] shadow-[inset_0_0_60px_rgba(0,0,0,0.9),inset_0_0_8px_rgba(0,0,0,0.9)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.06),transparent_45%)]" />
        </div>
        <div className="absolute bottom-1 right-6 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor]" style={{ background: color, color }} />
          <span className="font-mono text-[8px] tracking-widest text-zinc-500">POWER</span>
        </div>
      </div>
    </div>
  )
}
