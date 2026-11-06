import { useMemo, useState } from 'react'
import { HexColorInput, HexColorPicker } from 'react-colorful'
import { Check, Copy } from 'lucide-react'

// ---- sRGB <-> OKLCH (https://bottosson.github.io/posts/oklab/) ----
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
function hexToOklch(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16) / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(A, B), H: Math.atan2(B, A) }
}
function oklchToHex(L: number, C: number, H: number) {
  const A = C * Math.cos(H)
  const B = C * Math.sin(H)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, toGam(c))) * 255).toString(16).padStart(2, '0')).join('')
}
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const LIGHT = [0.97, 0.93, 0.87, 0.79, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3, 0.22]

export function ColorPalettePicker() {
  const [color, setColor] = useState('#7c3aed')
  const [copied, setCopied] = useState(false)
  const [sel, setSel] = useState(5)

  const scale = useMemo(() => {
    const { C, H } = hexToOklch(color.length === 7 ? color : '#7c3aed')
    return STEPS.map((step, i) => {
      // 端(明るすぎ/暗すぎ)は彩度を落として sRGB に収める
      const c = C * (1 - Math.abs(i - 5) / 7.5)
      return { step, hex: oklchToHex(LIGHT[i], c, H) }
    })
  }, [color])

  const cur = scale[sel]
  const onWhite = contrast(cur.hex, '#ffffff')
  const onBlack = contrast(cur.hex, '#000000')
  const css = scale.map((s) => `  --brand-${s.step}: ${s.hex};`).join('\n')

  const badge = (r: number) =>
    r >= 7 ? ['AAA', 'bg-emerald-500/20 text-emerald-300'] : r >= 4.5 ? ['AA', 'bg-lime-500/20 text-lime-300'] : r >= 3 ? ['AA Large', 'bg-amber-500/20 text-amber-300'] : ['NG', 'bg-rose-500/20 text-rose-300']

  return (
    <div className="relative flex h-full w-full gap-4 overflow-hidden bg-zinc-950 p-4 font-sans text-zinc-100">
      <div className="flex w-[168px] shrink-0 flex-col gap-2 [&_.react-colorful]:h-[150px]! [&_.react-colorful]:w-full! [&_.react-colorful__hue]:h-3 [&_.react-colorful__pointer]:h-4 [&_.react-colorful__pointer]:w-4 [&_.react-colorful__saturation]:rounded-t-lg [&_.react-colorful__hue]:rounded-b-lg">
        <HexColorPicker color={color} onChange={setColor} />
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5">
          <span className="h-4 w-4 rounded" style={{ background: color }} />
          <span className="text-xs text-zinc-500">#</span>
          <HexColorInput color={color} onChange={setColor} className="w-full bg-transparent font-mono text-xs uppercase outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className="h-5 w-5 rounded-full ring-2 ring-transparent transition hover:scale-110 hover:ring-white/40"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-semibold">カラースケール (OKLCH)</div>
          <div className="text-[11px] text-zinc-500">クリックでコントラスト確認</div>
        </div>
        <div className="grid grid-cols-11 overflow-hidden rounded-lg ring-1 ring-white/10">
          {scale.map((s, i) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setSel(i)}
              className={`relative h-14 transition-all ${i === sel ? 'z-10 scale-y-110 shadow-lg' : ''}`}
              style={{ background: s.hex }}
              title={s.hex}
            >
              <span
                className="absolute inset-x-0 bottom-1 text-center font-mono text-[9px]"
                style={{ color: i < 5 ? '#18181b' : '#fafafa' }}
              >
                {s.step}
              </span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['#ffffff', onWhite, '白背景'],
            ['#000000', onBlack, '黒背景'],
          ].map(([bg, r, label]) => {
            const [b, cls] = badge(r as number)
            return (
              <div key={label as string} className="rounded-lg p-2.5" style={{ background: bg as string }}>
                <div className="text-base font-bold" style={{ color: cur.hex }}>
                  Aa あ 文字
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-[11px]" style={{ color: bg === '#ffffff' ? '#52525b' : '#a1a1aa' }}>
                    {label} {(r as number).toFixed(2)}:1
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{b}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
          <pre className="thin-scroll h-full overflow-auto p-2 font-mono text-[10px] leading-relaxed text-zinc-400">{`:root {\n${css}\n}`}</pre>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`:root {\n${css}\n}`)
              } catch {
                /* ignore */
              }
              setCopied(true)
              setTimeout(() => setCopied(false), 1400)
            }}
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'コピー済' : 'CSS変数をコピー'}
          </button>
        </div>
      </div>
    </div>
  )
}
