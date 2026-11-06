import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { FunctionSquare } from 'lucide-react'

const COLS = 'ABCDEFGH'.split('')
const ROWS = 20
type Sheet = Record<string, string>

const INITIAL: Sheet = {
  A1: '商品', B1: '単価', C1: '数量', D1: '小計',
  A2: 'コーヒー豆', B2: '1800', C2: '3', D2: '=B2*C2',
  A3: 'ドリッパー', B3: '2400', C3: '1', D3: '=B3*C3',
  A4: 'マグカップ', B4: '1200', C4: '4', D4: '=B4*C4',
  A5: 'フィルター', B5: '380', C5: '10', D5: '=B5*C5',
  A7: '合計', D7: '=SUM(D2:D5)',
  A8: '平均単価', D8: '=AVG(B2:B5)',
  A9: '税込', D9: '=ROUND(D7*1.1)',
  F1: 'メモ', F2: 'セルを選んで', F3: '「=式」を入力 →', F4: 'Enterで確定',
}

const key = (c: number, r: number) => `${COLS[c]}${r + 1}`
const parseRef = (ref: string) => ({ c: COLS.indexOf(ref[0]), r: parseInt(ref.slice(1), 10) - 1 })

/** 依存セルを再帰的に評価する簡易数式エンジン(循環参照は #CYCLE) */
function evaluate(sheet: Sheet) {
  const cache: Record<string, number | string> = {}
  const visiting = new Set<string>()
  const value = (ref: string): number | string => {
    if (ref in cache) return cache[ref]
    const raw = sheet[ref] ?? ''
    if (!raw.startsWith('=')) {
      const n = Number(raw)
      return (cache[ref] = raw !== '' && !Number.isNaN(n) ? n : raw)
    }
    if (visiting.has(ref)) return '#CYCLE'
    visiting.add(ref)
    let out: number | string
    try {
      const range = (a: string, b: string) => {
        const p = parseRef(a)
        const q = parseRef(b)
        const vals: number[] = []
        for (let c = Math.min(p.c, q.c); c <= Math.max(p.c, q.c); c++)
          for (let r = Math.min(p.r, q.r); r <= Math.max(p.r, q.r); r++) {
            const v = value(key(c, r))
            if (typeof v === 'number') vals.push(v)
          }
        return vals
      }
      let expr = raw
        .slice(1)
        .toUpperCase()
        .replace(/(SUM|AVG|MIN|MAX|COUNT)\(([A-H]\d+):([A-H]\d+)\)/g, (_, fn: string, a: string, b: string) => {
          const v = range(a, b)
          const r = fn === 'SUM' ? v.reduce((s, x) => s + x, 0) : fn === 'AVG' ? v.reduce((s, x) => s + x, 0) / (v.length || 1) : fn === 'MIN' ? Math.min(...v) : fn === 'MAX' ? Math.max(...v) : v.length
          return `(${r})`
        })
        .replace(/[A-H]\d+/g, (ref) => {
          const v = value(ref)
          if (typeof v === 'string' && v.startsWith('#')) throw new Error(v)
          return `(${typeof v === 'number' ? v : 0})`
        })
        .replace(/ROUND\(/g, 'Math.round(')
      if (!/^[\d+\-*/().\s]*(Math\.round\([\d+\-*/().\s]*\))?[\d+\-*/().\s]*$/.test(expr)) throw new Error('#ERR')
      expr = expr || '0'
      out = Number(Function(`"use strict";return (${expr})`)())
      if (!Number.isFinite(out)) out = '#DIV/0'
    } catch (e) {
      out = (e as Error).message.startsWith('#') ? (e as Error).message : '#ERR'
    }
    visiting.delete(ref)
    return (cache[ref] = out)
  }
  return value
}

const fmt = (v: number | string) => (typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 })) : v)

export function MiniSpreadsheet() {
  const [sheet, setSheet] = useState(INITIAL)
  const [sel, setSel] = useState({ c: 3, r: 6 })
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [widths, setWidths] = useState<number[]>(() => COLS.map((_, i) => (i === 0 ? 110 : 84)))
  const gridRef = useRef<HTMLDivElement>(null)
  const value = useMemo(() => evaluate(sheet), [sheet])
  const selKey = key(sel.c, sel.r)

  const commit = (k: string, v: string) => setSheet((s) => ({ ...s, [k]: v }))
  const startEdit = (initial?: string) => {
    setEditing(selKey)
    setDraft(initial ?? sheet[selKey] ?? '')
  }
  const move = (dc: number, dr: number) => setSel((s) => ({ c: Math.max(0, Math.min(COLS.length - 1, s.c + dc)), r: Math.max(0, Math.min(ROWS - 1, s.r + dr)) }))

  const onGridKey = (e: KeyboardEvent) => {
    if (editing) return
    const arrows: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], Tab: [1, 0] }
    if (arrows[e.key]) {
      e.preventDefault()
      move(...arrows[e.key])
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault()
      startEdit()
    } else if (e.key === 'Delete' || e.key === 'Backspace') commit(selKey, '')
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      startEdit(e.key)
    }
  }
  const finish = (dr: number, dc = 0) => {
    if (editing) commit(editing, draft)
    setEditing(null)
    move(dc, dr)
    requestAnimationFrame(() => gridRef.current?.focus())
  }

  const startResize = (i: number, e: React.PointerEvent) => {
    e.preventDefault()
    const x0 = e.clientX
    const w0 = widths[i]
    const mv = (ev: PointerEvent) => setWidths((w) => w.map((x, j) => (j === i ? Math.max(48, w0 + ev.clientX - x0) : x)))
    const up = () => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white font-sans text-[12.5px] text-zinc-800">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-[#f8faf8] px-3 py-1.5">
        <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[11px] font-bold text-white">表</span>
        <span className="font-medium">売上シート.xlsx</span>
        <span className="text-[11px] text-zinc-400">SUM / AVG / MIN / MAX / COUNT / ROUND と四則演算に対応</span>
      </div>
      <div className="flex items-center gap-2 border-b border-zinc-200 px-2 py-1">
        <span className="w-12 rounded border border-zinc-200 py-0.5 text-center font-mono text-[11px] text-zinc-600">{selKey}</span>
        <FunctionSquare size={15} className="text-zinc-400" />
        <input
          value={editing ? draft : (sheet[selKey] ?? '')}
          onFocus={() => !editing && startEdit()}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finish(1)
            if (e.key === 'Escape') {
              setEditing(null)
              gridRef.current?.focus()
            }
          }}
          className="h-7 flex-1 rounded border border-transparent px-2 font-mono text-[12px] outline-none focus:border-emerald-600"
        />
      </div>
      <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey} className="thin-scroll min-h-0 flex-1 overflow-auto outline-none">
        <table className="border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 36 }} />
            {widths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 border-r border-b border-zinc-300 bg-zinc-100" />
              {COLS.map((c, i) => (
                <th key={c} className={`relative border-r border-b border-zinc-300 py-1 text-[11px] font-medium ${i === sel.c ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'}`}>
                  {c}
                  <span onPointerDown={(e) => startResize(i, e)} className="absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize hover:bg-emerald-500/40" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, r) => (
              <tr key={r}>
                <td className={`sticky left-0 z-10 border-r border-b border-zinc-300 text-center text-[11px] ${r === sel.r ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'}`}>{r + 1}</td>
                {COLS.map((_, c) => {
                  const k = key(c, r)
                  const v = value(k)
                  const isSel = sel.c === c && sel.r === r
                  const isFormula = sheet[k]?.startsWith('=')
                  return (
                    <td
                      key={k}
                      onMouseDown={() => {
                        if (editing) finish(0)
                        setSel({ c, r })
                      }}
                      onDoubleClick={() => startEdit()}
                      className={`relative h-6 truncate border-r border-b border-zinc-200 px-1.5 ${typeof v === 'number' ? 'text-right tabular-nums' : ''} ${
                        r === 0 && v !== '' ? 'bg-zinc-50 font-semibold' : ''
                      } ${isFormula ? 'text-emerald-800' : ''} ${String(v).startsWith('#') ? 'text-red-600' : ''} ${isSel ? 'outline-2 -outline-offset-1 outline-emerald-600' : ''}`}
                    >
                      {editing === k ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') finish(1)
                            else if (e.key === 'Tab') {
                              e.preventDefault()
                              finish(0, 1)
                            } else if (e.key === 'Escape') {
                              setEditing(null)
                              gridRef.current?.focus()
                            }
                          }}
                          className="absolute inset-0 z-10 w-full bg-white px-1.5 font-mono text-[12px] shadow-lg outline-2 outline-emerald-600"
                        />
                      ) : (
                        fmt(v)
                      )}
                      {isSel && <span className="absolute -right-[3px] -bottom-[3px] h-1.5 w-1.5 bg-emerald-600 ring-1 ring-white" />}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
