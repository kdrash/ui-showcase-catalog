import { useEffect, useRef } from 'react'

/**
 * デジタルレイン (Canvas 2D)
 * - 列ごとに落下位置 drops[] を持ち、毎フレーム半透明の黒で塗りつぶして残像を作る
 * - 先頭の文字だけ白く光らせ、それ以外は緑
 * - ResizeObserver + devicePixelRatio で高解像度対応、アンマウント時に rAF を停止
 */

const CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789'
const FONT_SIZE = 16
const FRAME_MS = 45 // 落下スピード (小さいほど速い)

export function MatrixRain() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return

    let width = 0
    let height = 0
    let drops: number[] = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      width = wrap.clientWidth
      height = wrap.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)
      const cols = Math.ceil(width / FONT_SIZE)
      drops = Array.from({ length: cols }, () => Math.floor((Math.random() * -height) / FONT_SIZE))
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    let raf = 0
    let last = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (now - last < FRAME_MS) return
      last = now

      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)' // 残像
      ctx.fillRect(0, 0, width, height)
      ctx.font = `${FONT_SIZE}px "JetBrains Mono", monospace`
      ctx.textBaseline = 'top'

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * FONT_SIZE
        const x = i * FONT_SIZE
        const ch = CHARS[(Math.random() * CHARS.length) | 0]
        // 1つ上を緑で上書きして、先頭だけ白く
        if (y > 0) {
          ctx.fillStyle = '#22c55e'
          ctx.fillText(CHARS[(Math.random() * CHARS.length) | 0], x, y - FONT_SIZE)
        }
        ctx.fillStyle = '#eafff0'
        ctx.shadowColor = '#4ade80'
        ctx.shadowBlur = 8
        ctx.fillText(ch, x, y)
        ctx.shadowBlur = 0

        if (y > height && Math.random() > 0.975) drops[i] = 0
        else drops[i]++
      }
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)]" />
      <div
        className="pointer-events-none absolute inset-0 grid place-items-center"
        style={{ fontFamily: "'VT323', monospace" }}
      >
        <div className="rounded border border-green-500/40 bg-black/70 px-5 py-3 text-center text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.35)]">
          <div className="text-3xl tracking-widest [text-shadow:0_0_8px_#22c55e]">
            SYSTEM ONLINE<span className="animate-pulse">_</span>
          </div>
          <div className="text-sm text-green-600">canvas 2d · katakana rain</div>
        </div>
      </div>
    </div>
  )
}
