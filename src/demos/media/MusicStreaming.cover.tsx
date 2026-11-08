import { useEffect, useId, useState, type ReactNode, type Ref, type RefObject } from 'react'
import { ALBUMS, PLAYLISTS, type CoverSpec, type Playlist } from './MusicStreaming.data'

/**
 * MusicStreaming のジャケット生成と、ジャケットからの色抽出。
 * - 8 種類の描き方(夕日+グリッド / 月とダイナー / 波 / ネオンの鯉 / 葉 / ピクセル / ぼけた球 / 温室)を 4 色パレットで描く SVG
 * - 色抽出は、描画済みの <svg> を XMLSerializer で文字列化 → data URL の Image → 24px の canvas に縮小 → 彩度で重み付けした平均色。
 *   ヘッダーのグラデーションやミニプレーヤーの背景はこの色から作る(結果はジャケットごとにキャッシュ)
 */

export type AnyCover = Playlist['cover']
export type RGB = [number, number, number]

export const COVERS: Record<string, CoverSpec> = {}
for (const a of ALBUMS) COVERS[a.cover.id] = a.cover
for (const p of PLAYLISTS) if ('style' in p.cover) COVERS[p.cover.id] = p.cover

function rand(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hashStr = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0

function fish(cx: number, cy: number, rot: number, color: string, eye: string) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <path d="M-16 0 C -10 -7.5, 6 -7.5, 12 0 C 6 7.5, -10 7.5, -16 0Z" fill={color} />
      <path d="M11 0 L21 -7 Q18 0 21 7Z" fill={color} />
      <path d="M-4 -5 L2 -10 L4 -5Z M-4 5 L2 10 L4 5Z" fill={color} opacity={0.8} />
      <circle cx={-10} cy={-1.8} r={1.2} fill={eye} />
    </g>
  )
}

function body(cover: AnyCover, u: string): ReactNode {
  if ('liked' in cover)
    return (
      <>
        <defs>
          <linearGradient id={`${u}l`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4527d8" />
            <stop offset="1" stopColor="#9ad7ff" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${u}l)`} />
        <path d="M50 74 C 22 56, 24 30, 40 30 C 46 30, 49 34, 50 37 C 51 34, 54 30, 60 30 C 76 30, 78 56, 50 74Z" fill="#fff" />
      </>
    )
  if ('mix' in cover) {
    const a = COVERS[cover.mix[0]]
    const b = COVERS[cover.mix[1]]
    return (
      <>
        {body(a, `${u}a`)}
        <svg x="58" y="8" width="34" height="34" viewBox="0 0 100 100">
          <rect width="100" height="100" fill="#000" />
          {body(b, `${u}b`)}
        </svg>
        <rect x="58" y="8" width="34" height="34" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.6" />
        <rect y="74" width="100" height="26" fill={cover.tint} />
        <text x="7" y="91" fontSize="9.5" fontWeight="800" fill="#0b0b0d">
          {cover.label}
        </text>
        <circle cx="10" cy="10" r="4" fill="#fff" opacity="0.9" />
        <path d="M8 10 Q10 7 12 10 Q10 13 8 10Z" fill={cover.tint} />
      </>
    )
  }
  const [p0, p1, p2, p3] = cover.pal
  const r = rand(hashStr(cover.id))
  switch (cover.style) {
    case 'sunset':
      return (
        <>
          <defs>
            <linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={p0} />
              <stop offset="0.72" stopColor={p1} />
            </linearGradient>
            <linearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={p2} />
              <stop offset="1" stopColor={p1} />
            </linearGradient>
            <clipPath id={`${u}c`}>
              <rect width="100" height="72" />
            </clipPath>
          </defs>
          <rect width="100" height="100" fill={`url(#${u}g)`} />
          <g clipPath={`url(#${u}c)`}>
            <circle cx="50" cy="60" r="26" fill={`url(#${u}s)`} />
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x="20" y={57 + i * 3.4} width="60" height={0.8 + i * 0.55} fill={p1} />
            ))}
          </g>
          <rect y="72" width="100" height="28" fill={p0} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1="0" x2="100" y1={73 + i * i * 1.1} y2={73 + i * i * 1.1} stroke={p1} strokeOpacity="0.7" strokeWidth="0.5" />
          ))}
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k) => (
            <line key={k} x1={50 + k * 6} y1="72" x2={50 + k * 24} y2="100" stroke={p1} strokeOpacity="0.6" strokeWidth="0.5" />
          ))}
          {cover.label && (
            <text x="7" y="12" fontSize="5.4" fontWeight="800" letterSpacing="1.2" fill={p3}>
              {cover.label}
            </text>
          )}
        </>
      )
    case 'moon':
      return (
        <>
          <defs>
            <radialGradient id={`${u}r`} cx="0.66" cy="0.3" r="0.9">
              <stop offset="0" stopColor={p1} />
              <stop offset="1" stopColor={p0} />
            </radialGradient>
          </defs>
          <rect width="100" height="100" fill={`url(#${u}r)`} />
          {Array.from({ length: 22 }, (_, i) => (
            <circle key={i} cx={r() * 100} cy={r() * 55} r={0.3 + r() * 0.6} fill={p3} opacity={0.4 + r() * 0.6} />
          ))}
          <circle cx="66" cy="30" r="15" fill={p2} />
          <circle cx="61" cy="26" r="3.2" fill={p0} opacity="0.12" />
          <circle cx="71" cy="35" r="2.2" fill={p0} opacity="0.12" />
          <circle cx="68" cy="22" r="1.4" fill={p0} opacity="0.12" />
          <rect y="80" width="100" height="20" fill={p0} />
          <rect x="10" y="60" width="56" height="22" rx="2" fill="#0a1114" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={14 + i * 12.5} y="67" width="9" height="8" rx="0.8" fill={p2} opacity="0.85" />
          ))}
          <rect x="18" y="52.5" width="28" height="7" rx="1.5" fill="none" stroke={p2} strokeWidth="0.8" />
          <text x="32" y="58" textAnchor="middle" fontSize="4.6" fontWeight="800" fill={p2}>
            DINER
          </text>
          {cover.label && (
            <text x="50" y="93" textAnchor="middle" fontSize="4.4" letterSpacing="1.4" fill={p3}>
              {cover.label}
            </text>
          )}
        </>
      )
    case 'waves':
      return (
        <>
          <rect width="100" height="100" fill={p0} />
          {Array.from({ length: 8 }, (_, i) => {
            const y = 30 + i * 9
            return (
              <path
                key={i}
                d={`M-5 ${y} C 20 ${y - 8 - i}, 40 ${y + 8}, 55 ${y} S 90 ${y - 6}, 105 ${y + 2} V 105 H -5 Z`}
                fill={i % 2 ? p1 : p2}
                fillOpacity={0.18 + i * 0.07}
              />
            )
          })}
          <circle cx="76" cy="20" r="6" fill={p3} opacity="0.85" />
          {cover.label && (
            <text x="9" y="24" fontSize={cover.label.length > 3 ? 9 : 14} fontWeight="700" fill={p3}>
              {cover.label}
            </text>
          )}
        </>
      )
    case 'koi':
      return (
        <>
          <defs>
            <filter id={`${u}f`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.4" />
            </filter>
          </defs>
          <rect width="100" height="100" fill={p0} />
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i} stroke={p1} strokeOpacity="0.16" strokeWidth="0.3">
              <line x1={i * 10} y1="0" x2={i * 10} y2="100" />
              <line x1="0" y1={i * 10} x2="100" y2={i * 10} />
            </g>
          ))}
          <circle cx="50" cy="45" r="30" fill="none" stroke={p2} strokeWidth="1" opacity="0.7" />
          <g filter={`url(#${u}f)`} opacity="0.9">
            {fish(40, 38, -25, p1, p0)}
            {fish(60, 54, 155, p2, p0)}
          </g>
          {fish(40, 38, -25, p1, p0)}
          {fish(60, 54, 155, p2, p0)}
          {cover.label && (
            <>
              <text x="50" y="91" textAnchor="middle" fontSize="8" fontWeight="900" fontStyle="italic" fill={p1} filter={`url(#${u}f)`}>
                {cover.label}
              </text>
              <text x="50" y="91" textAnchor="middle" fontSize="8" fontWeight="900" fontStyle="italic" fill={p3}>
                {cover.label}
              </text>
            </>
          )}
        </>
      )
    case 'leaf':
      return (
        <>
          <rect width="100" height="100" fill={p0} />
          {[
            [8, 30, -30, 1.2, p1],
            [40, 18, 20, 0.9, p2],
            [56, 46, -60, 1.1, p1],
            [20, 62, 10, 1, p2],
            [62, 76, -20, 0.8, p2],
            [76, 22, 70, 0.7, p1],
            [-6, 86, -40, 0.9, p1],
          ].map(([x, y, rot, s, c], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
              <path d="M0 0 C 8 -11 26 -11 34 0 C 26 11 8 11 0 0Z" fill={c as string} />
              <line x1="2" y1="0" x2="31" y2="0" stroke={p0} strokeOpacity="0.5" strokeWidth="0.7" />
            </g>
          ))}
          <circle cx="80" cy="58" r="4.5" fill={p3} />
          <circle cx="83" cy="56" r="2.6" fill={p3} />
          <path d="M85.2 55.6 L88 56.4 L85.2 57.2Z" fill="#e0a43a" />
          {cover.label && (
            <text x="8" y="93" fontSize="7" fontStyle="italic" fontFamily="Georgia, serif" fill={p3}>
              {cover.label}
            </text>
          )}
        </>
      )
    case 'pixel':
      return (
        <>
          <rect width="100" height="100" fill={p0} />
          {Array.from({ length: 100 }, (_, k) => {
            const gx = k % 10
            const gy = Math.floor(k / 10)
            const cx = gx * 10 + 5
            const cy = gy * 10 + 5
            const d = Math.hypot(cx - 50, cy - 44)
            const n = r()
            let fill: string | null = null
            if (d < 21) fill = n > 0.55 ? p2 : n > 0.2 ? p3 : p1
            else if (d < 30) fill = p1
            else if (n > 0.93 && gy < 8) fill = p3
            if (!fill) return null
            const small = d >= 30
            return <rect key={k} x={gx * 10 + (small ? 3.5 : 0.4)} y={gy * 10 + (small ? 3.5 : 0.4)} width={small ? 3 : 9.2} height={small ? 3 : 9.2} rx="0.8" fill={fill} />
          })}
          {cover.label && (
            <text x="50" y="95" textAnchor="middle" fontSize="5.6" fontFamily="ui-monospace, monospace" fontWeight="700" letterSpacing="1" fill={p3}>
              {cover.label}
            </text>
          )}
        </>
      )
    case 'orbs':
      return (
        <>
          <defs>
            <filter id={`${u}b`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>
          <rect width="100" height="100" fill={p0} />
          <g filter={`url(#${u}b)`}>
            <circle cx="32" cy="36" r="24" fill={p1} />
            <circle cx="70" cy="58" r="22" fill={p2} />
            <circle cx="40" cy="80" r="12" fill={p3} opacity="0.8" />
          </g>
          <ellipse cx="50" cy="50" rx="40" ry="14" fill="none" stroke={p3} strokeOpacity="0.55" strokeWidth="0.5" transform="rotate(-24 50 50)" />
          <circle cx="83" cy="35" r="1.6" fill={p3} />
          {cover.label && (
            <text x="8" y="92" fontSize="6" fontWeight="800" letterSpacing="2" fill={p3}>
              {cover.label}
            </text>
          )}
        </>
      )
    case 'bloom':
      return (
        <>
          <defs>
            <linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={p0} />
              <stop offset="1" stopColor={p1} />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill={`url(#${u}g)`} />
          <path d="M12 100 V40 A38 38 0 0 1 88 40 V100" fill="none" stroke={p3} strokeOpacity="0.35" strokeWidth="0.8" />
          {[28, 50, 72].map((x) => (
            <line key={x} x1={x} y1={x === 50 ? 2 : 10} x2={x} y2="100" stroke={p3} strokeOpacity="0.2" strokeWidth="0.6" />
          ))}
          <line x1="12" y1="60" x2="88" y2="60" stroke={p3} strokeOpacity="0.2" strokeWidth="0.6" />
          {[
            [30, 72, 1],
            [56, 64, 1.3],
            [74, 80, 0.9],
            [42, 86, 0.7],
          ].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <line x1="0" y1="0" x2="0" y2="40" stroke={p3} strokeOpacity="0.4" strokeWidth="0.8" />
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="0" cy="-4.5" rx="3" ry="5" fill={p2} opacity="0.85" transform={`rotate(${a})`} />
              ))}
              <circle r="2.2" fill="#fff6c8" />
            </g>
          ))}
          {cover.label && (
            <text x="92" y="12" textAnchor="end" fontSize="4.6" letterSpacing="1.4" fontWeight="700" fill={p3}>
              {cover.label}
            </text>
          )}
        </>
      )
  }
}

export function CoverArt({ cover, className, ref, label }: { cover: AnyCover; className?: string; ref?: Ref<SVGSVGElement>; label?: string }) {
  const u = `cv${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      fontFamily='"Inter","Noto Sans JP",sans-serif'
    >
      {body(cover, u)}
    </svg>
  )
}

export function ArtistAvatar({ name, hue, className }: { name: string; hue: number; className?: string }) {
  const u = `av${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <radialGradient id={u} cx="0.3" cy="0.25" r="1">
          <stop offset="0" stopColor={`hsl(${hue} 70% 70%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 50) % 360} 55% 28%)`} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${u})`} />
      <circle cx="50" cy="40" r="15" fill="rgba(255,255,255,0.82)" />
      <path d="M20 86 C 26 64, 74 64, 80 86" fill="rgba(255,255,255,0.82)" />
      <text x="84" y="22" textAnchor="middle" fontSize="13" fontWeight="800" fill="rgba(255,255,255,0.9)" fontFamily='"Inter","Noto Sans JP",sans-serif'>
        {[...name][0]}
      </text>
    </svg>
  )
}

/* ───────────── 色抽出 ───────────── */

const colorCache = new Map<string, RGB>()

function hexRgb(h: string): RGB {
  const s = h.replace('#', '')
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}

/** HSL で明度と彩度を UI 向けに整える */
function tame([r, g, b]: RGB): RGB {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const mx = Math.max(R, G, B)
  const mn = Math.min(R, G, B)
  let h = 0
  let s = 0
  let l = (mx + mn) / 2
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4
    h /= 6
  }
  l = Math.min(0.4, Math.max(0.26, l))
  s = Math.min(0.72, Math.max(0.28, s))
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t: number) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)]
}

export function fallbackColor(cover: AnyCover): RGB {
  if ('liked' in cover) return tame([80, 56, 220])
  if ('mix' in cover) return tame(hexRgb(cover.tint))
  return tame(hexRgb(cover.pal[1]))
}

export function extractColor(svg: SVGSVGElement, key: string): Promise<RGB | null> {
  const hit = colorCache.get(key)
  if (hit) return Promise.resolve(hit)
  return new Promise((resolve) => {
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('width', '48')
      clone.setAttribute('height', '48')
      clone.removeAttribute('class')
      const str = new XMLSerializer().serializeToString(clone)
      const img = new Image()
      img.onload = () => {
        try {
          const cv = document.createElement('canvas')
          cv.width = 24
          cv.height = 24
          const ctx = cv.getContext('2d', { willReadFrequently: true })
          if (!ctx) return resolve(null)
          ctx.drawImage(img, 0, 0, 24, 24)
          const d = ctx.getImageData(0, 0, 24, 24).data
          let R = 0
          let G = 0
          let B = 0
          let W = 0
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i]
            const g = d[i + 1]
            const b = d[i + 2]
            const mx = Math.max(r, g, b)
            const mn = Math.min(r, g, b)
            const sat = mx ? (mx - mn) / mx : 0
            const w = 0.05 + sat * (mx / 255) * (mx / 255)
            R += r * w
            G += g * w
            B += b * w
            W += w
          }
          const c = tame([R / W, G / W, B / W])
          colorCache.set(key, c)
          resolve(c)
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`
    } catch {
      resolve(null)
    }
  })
}

/** ref の SVG(ジャケット)から色を取り出す。取れるまではパレットからの代替色 */
export function useCoverColor(ref: RefObject<SVGSVGElement | null>, cover: AnyCover): RGB {
  const key = cover.id
  const [state, setState] = useState<{ key: string; c: RGB } | null>(() => {
    const hit = colorCache.get(key)
    return hit ? { key, c: hit } : null
  })
  useEffect(() => {
    let dead = false
    const el = ref.current
    if (!el) return
    void extractColor(el, key).then((c) => {
      if (!dead && c) setState({ key, c })
    })
    return () => {
      dead = true
    }
  }, [key, ref])
  return state && state.key === key ? state.c : (colorCache.get(key) ?? fallbackColor(cover))
}

export const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
