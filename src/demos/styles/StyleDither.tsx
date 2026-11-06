import { useEffect, useRef, useState } from 'react'
import { art } from '../_shared/art'

/**
 * Dither / 1-bit
 * 画像を Canvas で読み込み → グレースケール → 1bit(黒/白)に減色。
 * Bayer 8×8 の“組織的ディザ”と Floyd–Steinberg の“誤差拡散”を切り替え、
 * スライダーでしきい値を変えるとリアルタイムに再ディザリング。
 * 小さく描いて image-rendering: pixelated で拡大し、初期 Mac 風の 1bit UI 枠に収める。
 */
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
]
const INK: [number, number, number] = [20, 20, 30]
const PAPER: [number, number, number] = [232, 230, 216]
const W = 200
const H = 130

function dither(src: ImageData, mode: 'bayer' | 'fs', bias: number) {
  const { width: w, height: h, data } = src
  const g = new Float32Array(w * h)
  let lo = 1
  let hi = 0
  for (let i = 0; i < w * h; i++) {
    g[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255
    lo = Math.min(lo, g[i])
    hi = Math.max(hi, g[i])
  }
  // コントラストを正規化(0〜1 に引き伸ばす)してからバイアスを足す
  for (let i = 0; i < w * h; i++) g[i] = (g[i] - lo) / Math.max(hi - lo, 1e-3) + bias
  const out = new ImageData(w, h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      let on: boolean
      if (mode === 'bayer') {
        on = g[i] > (BAYER[y % 8][x % 8] + 0.5) / 64
      } else {
        const old = g[i]
        on = old > 0.5
        const err = old - (on ? 1 : 0)
        if (x + 1 < w) g[i + 1] += (err * 7) / 16
        if (y + 1 < h) {
          if (x > 0) g[i + w - 1] += (err * 3) / 16
          g[i + w] += (err * 5) / 16
          if (x + 1 < w) g[i + w + 1] += (err * 1) / 16
        }
      }
      const c = on ? PAPER : INK
      out.data[i * 4] = c[0]
      out.data[i * 4 + 1] = c[1]
      out.data[i * 4 + 2] = c[2]
      out.data[i * 4 + 3] = 255
    }
  return out
}

export function StyleDither() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [src, setSrc] = useState<ImageData | null>(null)
  const [mode, setMode] = useState<'bayer' | 'fs'>('bayer')
  const [bias, setBias] = useState(50)
  const [seed, setSeed] = useState(3)

  // 画像の読み込み → 縮小してピクセル取得
  useEffect(() => {
    let alive = true
    const img = new Image()
    img.onload = () => {
      if (!alive) return
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(img, 0, 0, W, H)
      setSrc(ctx.getImageData(0, 0, W, H))
    }
    img.src = art(seed % 2 ? 'landscape' : 'gradient', seed, W * 2, H * 2)
    return () => {
      alive = false
    }
  }, [seed])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !src) return
    ctx.putImageData(dither(src, mode, (bias - 50) / 100), 0, 0)
  }, [src, mode, bias])

  const ink = `rgb(${INK.join(',')})`
  const paper = `rgb(${PAPER.join(',')})`
  const pattern = `repeating-conic-gradient(${ink} 0 25%, ${paper} 0 50%) 0 0 / 2px 2px`

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden" style={{ background: pattern, fontFamily: '"VT323", monospace', color: ink }}>
      <div className="w-[300px] border-2" style={{ borderColor: ink, background: paper, boxShadow: `3px 3px 0 ${ink}` }}>
        {/* title bar with stripes */}
        <div className="relative flex h-6 items-center justify-center border-b-2" style={{ borderColor: ink, background: `repeating-linear-gradient(180deg, ${ink} 0 1px, ${paper} 1px 3px)` }}>
          <span className="absolute left-2 h-3.5 w-3.5 border-2" style={{ borderColor: ink, background: paper }} />
          <span className="px-2 text-[18px] leading-none" style={{ background: paper }}>
            mika_sato.pict
          </span>
        </div>
        <div className="p-3">
          <canvas ref={canvasRef} width={W} height={H} className="block w-full border-2" style={{ borderColor: ink, imageRendering: 'pixelated', aspectRatio: `${W} / ${H}` }} />
          <div className="mt-2 flex items-center justify-between text-[18px] leading-none">
            <span>Mika Sato · 1-bit designer</span>
            <span>128 ▪ 2.4k</span>
          </div>
          <div className="mt-2 flex gap-1.5 text-[17px]">
            {(['bayer', 'fs'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="h-7 flex-1 rounded-[6px] border-2"
                style={{ borderColor: ink, background: mode === m ? ink : paper, color: mode === m ? paper : ink, boxShadow: mode === m ? 'none' : `0 0 0 1px ${paper}, 0 0 0 2px ${ink}` }}
              >
                {m === 'bayer' ? 'Bayer 8×8' : 'Floyd–Steinberg'}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[17px]">
            <span>Threshold</span>
            <div className="relative h-4 flex-1 border-2" style={{ borderColor: ink, background: `repeating-linear-gradient(90deg, ${ink} 0 1px, ${paper} 1px 3px)` }}>
              <input type="range" value={bias} onChange={(e) => setBias(+e.target.value)} aria-label="Threshold" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
              <span className="absolute -top-[5px] h-[22px] w-3 border-2" style={{ left: `calc(${bias}% - ${bias * 0.12}px)`, borderColor: ink, background: paper }} />
            </div>
            <button onClick={() => setSeed((s) => s + 1)} className="h-7 rounded-[6px] border-2 px-2" style={{ borderColor: ink }}>
              Next ▸
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
