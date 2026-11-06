import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const C = {
  r: '\x1b[0m',
  b: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  mag: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

const FILES: Record<string, string> = {
  'README.md': `# ui-showcase\n\nxterm.js で動く本物のターミナルエミュレータです。\nANSI カラー、カーソル移動、履歴、Tab 補完に対応しています。`,
  'package.json': `{\n  "name": "ui-showcase",\n  "private": true,\n  "scripts": { "dev": "vite" }\n}`,
  'todo.txt': `- [x] xterm.js を導入\n- [ ] WebSocket で本物のシェルに接続\n- [ ] テーマを切り替え`,
}
const DIRS = ['src/', 'public/', 'node_modules/']
const CMDS = ['help', 'ls', 'cat', 'clear', 'neofetch', 'echo', 'date', 'whoami', 'colors', 'history', 'npm', 'sl']

const PROMPT = `${C.green}${C.b}guest@showcase${C.r}:${C.blue}${C.b}~/ui-showcase${C.r}$ `

export function XtermTerminal() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      lineHeight: 1.15,
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host.current!)
    const doFit = () => {
      try {
        fit.fit()
      } catch {
        /* hidden */
      }
    }
    doFit()
    const ro = new ResizeObserver(doFit)
    ro.observe(host.current!)

    let line = ''
    let cursor = 0
    const history: string[] = []
    let hIdx = 0
    const w = (s: string) => term.write(s)
    const nl = (s = '') => term.writeln(s)
    const redraw = () => {
      w('\r\x1b[2K' + PROMPT + line)
      const back = line.length - cursor
      if (back > 0) w(`\x1b[${back}D`)
    }

    const neofetch = () => {
      const logo = [
        `${C.cyan}      ▄▄▄▄▄▄▄      `,
        `${C.cyan}    ▄█▀     ▀█▄    `,
        `${C.cyan}   ██  ${C.mag}◆   ◆${C.cyan}  ██   `,
        `${C.cyan}   ██    ${C.yellow}▄▄${C.cyan}    ██  `,
        `${C.cyan}    ▀█▄ ${C.mag}▀▀▀${C.cyan} ▄█▀    `,
        `${C.cyan}      ▀▀▀▀▀▀▀      `,
      ]
      const info = [
        `${C.b}${C.green}guest${C.r}@${C.b}${C.green}showcase${C.r}`,
        `${C.gray}─────────────────${C.r}`,
        `${C.cyan}${C.b}OS${C.r}: BrowserOS 2026 x86_64`,
        `${C.cyan}${C.b}Shell${C.r}: xterm.js 6 (fake sh)`,
        `${C.cyan}${C.b}Terminal${C.r}: ${term.cols}x${term.rows}`,
        `${C.cyan}${C.b}Uptime${C.r}: ${Math.floor(performance.now() / 1000)}s`,
      ]
      logo.forEach((l, i) => nl(`${l}${C.r}  ${info[i] ?? ''}`))
      nl('   ' + [41, 42, 43, 44, 45, 46, 47].map((c) => `\x1b[${c}m   `).join('') + C.r)
    }

    const run = (raw: string) => {
      const [cmd, ...args] = raw.trim().split(/\s+/)
      if (!cmd) return
      switch (cmd) {
        case 'help':
          nl(`${C.b}使えるコマンド${C.r}: ${CMDS.map((c) => C.yellow + c + C.r).join(', ')}`)
          nl(`${C.gray}↑↓ で履歴、Tab で補完、Ctrl+C で中断、Ctrl+L でクリア${C.r}`)
          break
        case 'ls':
          nl([...DIRS.map((d) => C.blue + C.b + d + C.r), ...Object.keys(FILES)].join('  '))
          break
        case 'cat':
          if (!args[0]) nl(`${C.red}cat: ファイル名を指定してください${C.r}`)
          else if (FILES[args[0]]) FILES[args[0]].split('\n').forEach((l) => nl(l))
          else nl(`${C.red}cat: ${args[0]}: No such file or directory${C.r}`)
          break
        case 'clear':
          term.clear()
          break
        case 'neofetch':
          neofetch()
          break
        case 'echo':
          nl(args.join(' '))
          break
        case 'date':
          nl(new Date().toLocaleString('ja-JP'))
          break
        case 'whoami':
          nl('guest')
          break
        case 'history':
          history.forEach((h, i) => nl(`${C.gray}${String(i + 1).padStart(4)}${C.r}  ${h}`))
          break
        case 'colors':
          for (let r = 0; r < 6; r++) nl(Array.from({ length: 36 }, (_, i) => `\x1b[48;5;${16 + r * 36 + i}m `).join('') + C.r)
          break
        case 'npm':
          if (args[0] === 'run' || args[0] === 'i' || args[0] === 'install') {
            nl(`${C.gray}> ui-showcase@1.0.0 ${args.join(' ')}${C.r}`)
            nl(`${C.green}✓${C.r} done in 0.42s`)
          } else nl(`${C.yellow}npm${C.r} <install|run> ...`)
          break
        case 'sl':
          nl(`${C.yellow}      ====        ________                ___________ `)
          nl(`  _D _|  |_______/        \\__I_I_____===__|_________| `)
          nl(`   |(_)---  |   H\\________/ |   |        =|___ ___|   ${C.r}`)
          break
        default:
          nl(`${C.red}command not found: ${cmd}${C.r}  ${C.gray}(help で一覧)${C.r}`)
      }
    }

    nl(`${C.b}${C.mag}Welcome!${C.r} これは ${C.cyan}xterm.js${C.r} で動く本物のターミナルエミュレータです。`)
    nl(`${C.gray}help と打って Enter。neofetch / colors / cat README.md もどうぞ。${C.r}`)
    nl('')
    neofetch()
    nl('')
    w(PROMPT)

    const sub = term.onData((d) => {
      switch (d) {
        case '\r': {
          nl('')
          if (line.trim()) {
            history.push(line)
            run(line)
          }
          hIdx = history.length
          line = ''
          cursor = 0
          w(PROMPT)
          return
        }
        case '\x7f':
          if (cursor > 0) {
            line = line.slice(0, cursor - 1) + line.slice(cursor)
            cursor--
            redraw()
          }
          return
        case '\x03':
          nl('^C')
          line = ''
          cursor = 0
          w(PROMPT)
          return
        case '\x0c':
          term.clear()
          redraw()
          return
        case '\t': {
          const parts = line.split(' ')
          const last = parts.at(-1) ?? ''
          const pool = parts.length === 1 ? CMDS : [...Object.keys(FILES), ...DIRS]
          const hits = pool.filter((c) => c.startsWith(last))
          if (hits.length === 1) {
            parts[parts.length - 1] = hits[0] + (parts.length === 1 ? ' ' : '')
            line = parts.join(' ')
            cursor = line.length
            redraw()
          } else if (hits.length > 1) {
            nl('')
            nl(hits.join('  '))
            redraw()
          }
          return
        }
        case '\x1b[A':
        case '\x1b[B':
          if (!history.length) return
          hIdx = Math.max(0, Math.min(history.length, hIdx + (d === '\x1b[A' ? -1 : 1)))
          line = history[hIdx] ?? ''
          cursor = line.length
          redraw()
          return
        case '\x1b[D':
          if (cursor > 0) {
            cursor--
            w(d)
          }
          return
        case '\x1b[C':
          if (cursor < line.length) {
            cursor++
            w(d)
          }
          return
      }
      if (d.startsWith('\x1b')) return
      const printable = d.replace(/[\x00-\x1f]/g, '')
      line = line.slice(0, cursor) + printable + line.slice(cursor)
      cursor += printable.length
      redraw()
    })

    return () => {
      sub.dispose()
      ro.disconnect()
      term.dispose()
    }
  }, [])

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#010409] p-3">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] shadow-2xl shadow-black">
        <div className="flex items-center gap-1.5 border-b border-white/5 bg-[#161b22] px-3 py-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="mx-auto font-mono text-[11px] text-zinc-500">guest@showcase: ~/ui-showcase — zsh</span>
        </div>
        <div ref={host} className="min-h-0 flex-1 px-2 py-1.5" />
      </div>
    </div>
  )
}
