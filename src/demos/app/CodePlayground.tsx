import { useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { Play, RotateCcw, Terminal } from 'lucide-react'

type Tab = 'html' | 'css' | 'js'
const START: Record<Tab, string> = {
  html: `<div class="card">
  <h1>Hello, Playground 👋</h1>
  <p>コードを編集すると右にライブ反映されます</p>
  <button id="btn">クリック: <span id="n">0</span></button>
</div>`,
  css: `body {
  margin: 0; min-height: 100vh; display: grid; place-items: center;
  font-family: system-ui, sans-serif;
  background: linear-gradient(135deg, #fdf2f8, #ede9fe);
}
.card { padding: 24px 28px; border-radius: 18px; background: white;
  box-shadow: 0 20px 40px -20px #7c3aed55; text-align: center; }
h1 { margin: 0 0 4px; font-size: 22px; color: #4c1d95; }
p { margin: 0 0 14px; color: #6b7280; font-size: 13px; }
button { border: 0; border-radius: 999px; padding: 8px 16px;
  background: #7c3aed; color: white; font-weight: 600; cursor: pointer; }`,
  js: `let n = 0
document.getElementById('btn').onclick = () => {
  n++
  document.getElementById('n').textContent = n
  console.log('clicked', n, 'times')
  if (n % 5 === 0) console.warn('5の倍数です!')
}
console.log('ready ✨', new Date().toLocaleTimeString('ja-JP'))`,
}
const LANG = { html: html(), css: css(), js: javascript() }
const LABEL: Record<Tab, string> = { html: 'index.html', css: 'style.css', js: 'script.js' }
const DOT: Record<Tab, string> = { html: 'bg-orange-400', css: 'bg-sky-400', js: 'bg-yellow-300' }

type Log = { level: 'log' | 'warn' | 'error'; text: string }

const bridge = (id: string) => `<script>
(function(){var send=function(l,a){parent.postMessage({__pg:'${id}',level:l,text:Array.from(a).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')};
['log','warn','error'].forEach(function(l){var o=console[l];console[l]=function(){send(l,arguments);o.apply(console,arguments)}});
window.onerror=function(m){send('error',[m])};})();
<\/script>`

export function CodePlayground() {
  const [tab, setTab] = useState<Tab>('html')
  const [code, setCode] = useState(START)
  const [doc, setDoc] = useState('')
  const [logs, setLogs] = useState<Log[]>([])
  const host = useRef<HTMLDivElement>(null)
  const views = useRef<Partial<Record<Tab, EditorView>>>({})
  const id = useRef(Math.random().toString(36).slice(2))

  // 各タブの EditorView を1度だけ作り、表示だけ切り替える(undo履歴を保持)
  useEffect(() => {
    const el = host.current!
    const made: EditorView[] = []
    ;(Object.keys(START) as Tab[]).forEach((t) => {
      const wrap = document.createElement('div')
      wrap.dataset.tab = t
      wrap.style.height = '100%'
      el.appendChild(wrap)
      const v = new EditorView({
        parent: wrap,
        state: EditorState.create({
          doc: START[t],
          extensions: [
            basicSetup,
            LANG[t],
            oneDark,
            EditorView.theme({ '&': { height: '100%', fontSize: '12.5px' }, '.cm-scroller': { fontFamily: "'JetBrains Mono', monospace" } }),
            EditorView.updateListener.of((u) => u.docChanged && setCode((c) => ({ ...c, [t]: u.state.doc.toString() }))),
          ],
        }),
      })
      views.current[t] = v
      made.push(v)
    })
    return () => {
      made.forEach((v) => v.destroy())
      el.innerHTML = ''
    }
  }, [])

  useEffect(() => {
    host.current?.querySelectorAll<HTMLElement>('[data-tab]').forEach((w) => (w.style.display = w.dataset.tab === tab ? 'block' : 'none'))
  }, [tab])

  // デバウンスしてプレビュー更新
  useEffect(() => {
    const t = setTimeout(() => {
      setLogs([])
      setDoc(`<!doctype html><html><head><meta charset="utf-8">${bridge(id.current)}<style>${code.css}</style></head><body>${code.html}<script>${code.js}<\/script></body></html>`)
    }, 400)
    return () => clearTimeout(t)
  }, [code])

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.__pg !== id.current) return
      setLogs((l) => [...l.slice(-40), { level: e.data.level, text: e.data.text }])
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const reset = () => {
    ;(Object.keys(START) as Tab[]).forEach((t) => {
      const v = views.current[t]
      v?.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: START[t] } })
    })
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#1e2127] font-sans text-zinc-300">
      <div className="flex min-w-0 flex-1 flex-col border-r border-black/40">
        <div className="flex items-center bg-[#16181d] text-[12px]">
          {(Object.keys(START) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 border-r border-black/30 px-3 py-2 transition ${tab === t ? 'bg-[#282c34] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${DOT[t]}`} />
              {LABEL[t]}
            </button>
          ))}
          <button type="button" onClick={reset} title="リセット" className="ml-auto mr-2 rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200">
            <RotateCcw size={13} />
          </button>
        </div>
        <div ref={host} className="min-h-0 flex-1 overflow-hidden" />
      </div>
      <div className="flex w-[44%] min-w-0 flex-col">
        <div className="flex items-center gap-1.5 bg-[#16181d] px-3 py-2 text-[12px] text-zinc-400">
          <Play size={12} className="text-emerald-400" /> プレビュー
          <span className="ml-auto text-[10px] text-zinc-600">自動更新 · 400ms</span>
        </div>
        <iframe title="preview" sandbox="allow-scripts" srcDoc={doc} className="min-h-0 flex-1 bg-white" />
        <div className="h-[34%] min-h-[64px] border-t border-black/40 bg-[#16181d]">
          <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-1 text-[11px] text-zinc-500">
            <Terminal size={11} /> Console
            <button type="button" onClick={() => setLogs([])} className="ml-auto hover:text-zinc-300">
              clear
            </button>
          </div>
          <div className="thin-scroll h-[calc(100%-22px)] overflow-y-auto px-3 py-1 font-mono text-[11px]">
            {logs.map((l, i) => (
              <div key={i} className={l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-amber-300' : 'text-zinc-300'}>
                <span className="text-zinc-600">› </span>
                {l.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
