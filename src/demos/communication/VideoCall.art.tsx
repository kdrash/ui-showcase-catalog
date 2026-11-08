import { useId, type CSSProperties, type ReactNode } from 'react'

/*
 * VideoCall で使うオリジナルの SVG イラスト。
 * 参加者の「映像」は 160x90 の背景シーン + 上半身のキャラクターで、口の開きと頭の傾きは
 * 親要素に毎フレーム書き込まれる CSS 変数 --lvl(0〜1 の音量)だけで動く(React の再レンダーなし)。
 * 待機中の揺れ・まばたき・背景の小さな動きは nv- で始まる CSS keyframes(VideoCall.tsx の <style>)。
 */

const useSvgId = () => useId().replace(/[^a-zA-Z0-9_-]/g, '')

export type SceneKind = 'study' | 'studio' | 'night' | 'plants' | 'kitchen' | 'room' | 'beach' | 'library'
export type HairStyle = 'short' | 'bob' | 'long' | 'bun' | 'crop'
export type Look = { skin: string; hair: string; style: HairStyle; shirt: string; glasses?: boolean; accent?: string }

const fb: CSSProperties = { transformBox: 'fill-box' }

/** 背景シーン */
export function Scene({ kind, blur, seed = 0 }: { kind: SceneKind; blur?: boolean; seed?: number }) {
  const id = useSvgId()
  const d = (n: number): CSSProperties => ({ animationDelay: `${-((seed * 1.7 + n) % 9)}s` })
  let body: ReactNode
  switch (kind) {
    case 'study':
      body = (
        <>
          <rect width="160" height="90" fill="#d9c3a5" />
          <rect width="160" height="90" fill={`url(#${id}lamp)`} className="nv-glow" style={d(1)} />
          <rect x="104" y="6" width="50" height="84" fill="#6b4a33" />
          {[18, 40, 62].map((y, r) => (
            <g key={y}>
              <rect x="106" y={y} width="46" height="2.5" fill="#4d3424" />
              {Array.from({ length: 8 }, (_, i) => {
                const h = 10 + ((i * 7 + r * 5) % 7)
                const cols = ['#c0583e', '#3f6e8c', '#e0b04a', '#6e8b4a', '#8a5a9e', '#d9d2c5']
                return <rect key={i} x={107.5 + i * 5.6} y={y - h} width={4.4} height={h} rx="0.6" fill={cols[(i + r * 2) % cols.length]} />
              })}
            </g>
          ))}
          <rect x="14" y="14" width="30" height="22" fill="#f4ead8" stroke="#8b6a4b" strokeWidth="1.6" />
          <path d="M17 33 L25 24 L31 30 L35 26 L41 33Z" fill="#7aa38a" />
          <circle cx="36" cy="20" r="2.6" fill="#e9a65a" />
          <path d="M10 90 V70 h22 v20" fill="#5a3d2a" />
          <path d="M14 70 l3 -14 h8 l3 14Z" fill="#f2d39b" />
        </>
      )
      break
    case 'studio':
      body = (
        <>
          <rect width="160" height="90" fill={`url(#${id}paper)`} />
          <ellipse cx="80" cy="96" rx="90" ry="22" fill="#000" opacity="0.08" />
          <g opacity="0.95">
            <rect x="6" y="8" width="26" height="34" rx="2" fill="#f7f7f2" />
            <rect x="6" y="8" width="26" height="34" rx="2" fill="none" stroke="#2a2d34" strokeWidth="2" />
            <path d="M19 42 V90" stroke="#2a2d34" strokeWidth="1.6" />
            <ellipse cx="19" cy="25" rx="26" ry="30" fill="#fff" opacity="0.18" className="nv-glow" style={d(2)} />
          </g>
          <path d="M140 90 C136 70 146 60 150 52 C152 64 148 74 152 90Z" fill="#5c8a5a" className="nv-leaf" style={{ ...fb, transformOrigin: 'bottom', ...d(3) }} />
          <path d="M146 90 C150 72 158 66 160 60 V90Z" fill="#4b7449" />
        </>
      )
      break
    case 'night':
      body = (
        <>
          <rect width="160" height="90" fill="#1d2233" />
          <rect x="18" y="8" width="70" height="52" fill="#0c1430" />
          <rect x="18" y="8" width="70" height="52" fill={`url(#${id}sky)`} />
          {[
            [20, 34, 10, 26],
            [31, 26, 9, 34],
            [41, 38, 12, 22],
            [54, 20, 8, 40],
            [63, 30, 11, 30],
            [75, 36, 13, 24],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill={i % 2 ? '#1a2342' : '#141c37'} />
          ))}
          {Array.from({ length: 22 }, (_, i) => (
            <rect
              key={i}
              x={22 + ((i * 13) % 62)}
              y={30 + ((i * 7) % 26)}
              width="1.6"
              height="1.6"
              fill={i % 3 ? '#ffd88a' : '#9fd3ff'}
              className="nv-twinkle"
              style={{ animationDelay: `${-((i * 0.37 + seed) % 4)}s`, animationDuration: `${2.5 + (i % 4)}s` }}
            />
          ))}
          <rect x="16" y="6" width="74" height="56" fill="none" stroke="#323a52" strokeWidth="3" />
          <path d="M53 6 V62" stroke="#323a52" strokeWidth="2" />
          <rect x="112" y="40" width="3" height="40" fill="#30364a" />
          <path d="M104 40 h19 l-4 -10 h-11z" fill="#ffcc73" />
          <ellipse cx="113" cy="62" rx="30" ry="34" fill="#ffcc73" opacity="0.12" className="nv-glow" style={d(1)} />
        </>
      )
      break
    case 'plants':
      body = (
        <>
          <rect width="160" height="90" fill="#eef0e6" />
          <rect x="92" y="6" width="60" height="58" rx="2" fill={`url(#${id}day)`} />
          <g className="nv-drift" style={d(0)}>
            <ellipse cx="108" cy="22" rx="10" ry="3.4" fill="#fff" opacity="0.9" />
            <ellipse cx="136" cy="32" rx="8" ry="2.6" fill="#fff" opacity="0.8" />
          </g>
          <rect x="92" y="6" width="60" height="58" rx="2" fill="none" stroke="#f9faf5" strokeWidth="3" />
          <path d="M122 6 V64" stroke="#f9faf5" strokeWidth="2" />
          <rect x="88" y="62" width="68" height="4" fill="#d6d2c2" />
          <g className="nv-leaf" style={{ ...fb, transformOrigin: 'bottom', ...d(2) }}>
            <path d="M18 70 C10 52 14 36 20 28 C24 42 26 56 22 70Z" fill="#5f9460" />
            <path d="M22 70 C26 50 36 42 44 38 C40 52 34 62 26 70Z" fill="#76ad6c" />
            <path d="M18 70 C10 60 4 56 0 54 C2 62 8 68 16 72Z" fill="#4f8250" />
          </g>
          <path d="M12 70 h20 l-3 20 h-14z" fill="#c9774f" />
          <g className="nv-leaf" style={{ ...fb, transformOrigin: 'bottom', ...d(5) }}>
            <path d="M138 62 C134 50 138 44 142 40 C144 48 144 56 140 62Z" fill="#6aa36b" />
          </g>
          <rect x="134" y="56" width="12" height="7" rx="1" fill="#e0e5ef" />
        </>
      )
      break
    case 'kitchen':
      body = (
        <>
          <rect width="160" height="90" fill="#f1ece2" />
          {Array.from({ length: 10 }, (_, c) =>
            Array.from({ length: 4 }, (_, r) => <rect key={`${c}-${r}`} x={c * 16 + (r % 2) * 8 - 8} y={44 + r * 8} width="15" height="7" fill="#e3ddd0" />),
          )}
          <rect x="0" y="40" width="160" height="2" fill="#c9bfae" />
          <rect x="8" y="16" width="56" height="3" fill="#9c7a58" />
          {[12, 24, 36, 48].map((x, i) => (
            <path key={x} d={`M${x} 16 v-8 h9 v8`} fill={['#3d6f8e', '#e2a54a', '#d36b5c', '#7a9c6a'][i]} />
          ))}
          <g>
            <path d="M120 40 h14 v-14 a7 7 0 0 0 -14 0z" fill="#4a5a6e" />
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M${123 + i * 4} 24 q-2 -4 0 -8 q2 -4 0 -8`}
                stroke="#fff"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                className="nv-steam"
                style={{ animationDelay: `${-i * 0.8 - seed}s` }}
              />
            ))}
          </g>
        </>
      )
      break
    case 'beach':
      body = (
        <>
          <rect width="160" height="50" fill={`url(#${id}beachsky)`} />
          <circle cx="122" cy="20" r="7" fill="#fff6d6" />
          <rect y="48" width="160" height="20" fill="#3fa4c9" />
          <g className="nv-wave" style={d(0)}>
            {Array.from({ length: 6 }, (_, i) => (
              <path key={i} d={`M${i * 40 - 40} ${56 + (i % 2) * 4} q10 -3 20 0 t20 0`} stroke="#bfe9f6" strokeWidth="1.2" fill="none" />
            ))}
          </g>
          <path d="M0 66 Q80 58 160 66 V90 H0Z" fill="#f1dcb2" />
          <path d="M14 90 C16 70 20 56 26 48" stroke="#7a5a3a" strokeWidth="2.4" fill="none" />
          <g className="nv-leaf" style={{ ...fb, transformOrigin: '0% 100%', ...d(1) }}>
            <path d="M26 48 q-12 -6 -20 2 q10 -2 20 -2 q-4 -12 -14 -14 q8 6 14 14 q6 -10 16 -8 q-10 2 -16 8 q14 0 16 8 q-6 -6 -16 -8z" fill="#3f8a55" />
          </g>
        </>
      )
      break
    case 'library':
      body = (
        <>
          <rect width="160" height="90" fill="#3b2c26" />
          {Array.from({ length: 4 }, (_, r) => (
            <g key={r}>
              <rect x="0" y={18 + r * 22} width="160" height="3" fill="#24180f" />
              {Array.from({ length: 26 }, (_, i) => {
                const h = 12 + ((i * 5 + r * 3) % 6)
                const cols = ['#8c3b2e', '#2f5263', '#b98a3e', '#4e6b3c', '#6a4a7a', '#c9b99a', '#5a2a2a']
                return <rect key={i} x={i * 6.2} y={18 + r * 22 - h} width="5.2" height={h} fill={cols[(i * 3 + r) % cols.length]} opacity="0.9" />
              })}
            </g>
          ))}
          <rect width="160" height="90" fill={`url(#${id}lamp)`} opacity="0.7" />
        </>
      )
      break
    default:
      body = (
        <>
          <rect width="160" height="90" fill="#e7e2f2" />
          <rect x="102" y="12" width="34" height="44" rx="1.5" fill="#fff" />
          <rect x="105" y="15" width="28" height="30" fill="#f6b38d" />
          <circle cx="119" cy="30" r="8" fill="#fde3b5" />
          <path d="M105 45 L113 36 L119 41 L126 33 L133 45Z" fill="#7a6aa6" />
          <path d="M6 10 Q40 20 74 8" stroke="#9e95b8" strokeWidth="0.8" fill="none" />
          {Array.from({ length: 8 }, (_, i) => (
            <circle
              key={i}
              cx={10 + i * 8.5}
              cy={13 + Math.sin(i * 0.9) * 2 + (i > 3 ? 2 - (i - 4) : i * 0.6)}
              r="1.6"
              fill={['#ffd36e', '#ff9fb2', '#9fd8ff'][i % 3]}
              className="nv-twinkle"
              style={{ animationDelay: `${-i * 0.4}s` }}
            />
          ))}
          <path d="M140 90 v-24 q6 -8 12 0 v24z" fill="#c9bfe0" />
        </>
      )
  }
  return (
    <g>
      <defs>
        <radialGradient id={`${id}lamp`} cx="0.15" cy="0.8" r="0.7">
          <stop offset="0" stopColor="#ffd28a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffd28a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}paper`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9bb0c4" />
          <stop offset="1" stopColor="#d8e1e8" />
        </linearGradient>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1230" />
          <stop offset="1" stopColor="#3a2f5e" />
        </linearGradient>
        <linearGradient id={`${id}day`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fc7ef" />
          <stop offset="1" stopColor="#d7eefb" />
        </linearGradient>
        <linearGradient id={`${id}beachsky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc3ee" />
          <stop offset="1" stopColor="#ffe1b8" />
        </linearGradient>
        <filter id={`${id}blur`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
      </defs>
      <g filter={blur ? `url(#${id}blur)` : undefined}>{body}</g>
    </g>
  )
}

/** 上半身のキャラクター。口と頭の傾きは --lvl で動く */
export function Character({ look, seed = 0 }: { look: Look; seed?: number }) {
  const shade = 'rgb(0 0 0 / 0.12)'
  const delay = { animationDelay: `${-((seed * 2.3) % 7)}s` }
  const hairBack =
    look.style === 'long' ? (
      <path d="M62 40 C60 22 72 18 80 18 C90 18 101 22 98 40 C100 56 102 70 104 80 L56 80 C58 70 60 56 62 40Z" fill={look.hair} />
    ) : look.style === 'bob' ? (
      <path d="M62 42 C60 25 71 19 80 19 C90 19 100 25 98 42 L99 57 C95 59 92 57 92 54 L68 54 C68 57 65 59 61 57Z" fill={look.hair} />
    ) : look.style === 'bun' ? (
      <circle cx="80" cy="21" r="7" fill={look.hair} />
    ) : null
  const hairFront =
    look.style === 'short' ? (
      <path d="M65 41 C63 27 73 22 81 22 C91 22 98 28 95 41 C93 34 87 30 80 31 C73 31 68 35 65 41Z" fill={look.hair} />
    ) : look.style === 'crop' ? (
      <path d="M66 38 C66 28 74 24 81 24 C89 24 95 28 94 38 C90 33 85 31 80 31 C75 31 70 33 66 38Z" fill={look.hair} />
    ) : (
      <path d="M65 40 C66 28 74 24 81 24 C90 24 96 30 95 40 C90 34 84 31 78 33 C73 34 69 36 65 40Z" fill={look.hair} />
    )
  return (
    <g className="nv-sway" style={{ ...fb, transformOrigin: '50% 100%', ...delay }}>
      {hairBack}
      {/* 肩と服 */}
      <path d="M34 92 C36 72 54 64 80 64 C106 64 124 72 126 92Z" fill={look.shirt} />
      <path d="M70 64 L80 74 L90 64" fill="none" stroke={look.accent ?? shade} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M34 92 C36 72 54 64 80 64 C66 66 54 74 50 92Z" fill={shade} opacity="0.5" />
      <rect x="74" y="54" width="12" height="13" rx="5" fill={look.skin} />
      <rect x="74" y="56" width="12" height="5" fill={shade} />
      {/* 頭(--lvl で少しうなずく) */}
      <g style={{ ...fb, transformOrigin: '50% 100%', transform: 'rotate(calc(var(--lvl, 0) * -5deg)) translateY(calc(var(--lvl, 0) * -0.8px))', transition: 'transform 120ms' }}>
        <g className="nv-tilt" style={{ ...fb, transformOrigin: '50% 100%', ...delay }}>
          <ellipse cx="65.5" cy="45" rx="2.4" ry="3.4" fill={look.skin} />
          <ellipse cx="94.5" cy="45" rx="2.4" ry="3.4" fill={look.skin} />
          <ellipse cx="80" cy="42" rx="14.5" ry="16.5" fill={look.skin} />
          {hairFront}
          <path d="M71 38.4 q3 -1.4 6 0 M83 38.4 q3 -1.4 6 0" stroke={look.hair} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.85" />
          <g className="nv-blink" style={{ ...fb, transformOrigin: '50% 50%', animationDelay: `${-((seed * 1.3) % 5)}s` }}>
            <ellipse cx="74.5" cy="43.6" rx="1.45" ry="1.9" fill="#2a2230" />
            <ellipse cx="85.5" cy="43.6" rx="1.45" ry="1.9" fill="#2a2230" />
          </g>
          <path d="M80 45.5 q-0.8 2.4 0.6 2.8" stroke="rgb(0 0 0 / 0.25)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <circle cx="71" cy="48.6" r="2.4" fill="#ff8f8f" opacity="0.28" />
          <circle cx="89" cy="48.6" r="2.4" fill="#ff8f8f" opacity="0.28" />
          <ellipse
            cx="80"
            cy="51.6"
            rx="2.7"
            ry="1.7"
            fill="#7a3434"
            style={{ ...fb, transformOrigin: '50% 30%', transform: 'scaleY(calc(0.22 + var(--lvl, 0) * 1.7))', transition: 'transform 70ms' }}
          />
          <path d="M77.6 51.2 q2.4 1 4.8 0" stroke="#7a3434" strokeWidth="0.7" fill="none" strokeLinecap="round" />
          {look.glasses && (
            <g fill="none" stroke="#26232b" strokeWidth="1">
              <rect x="69.4" y="40" width="10" height="7.4" rx="2.6" />
              <rect x="80.6" y="40" width="10" height="7.4" rx="2.6" />
              <path d="M79.4 43 h1.2 M69.4 42.4 l-3 -0.8 M90.6 42.4 l3 -0.8" />
            </g>
          )}
        </g>
      </g>
    </g>
  )
}

/** 映像フレーム全体(背景 + 人物 + ビネット) */
export function VideoArt({ scene, look, seed, blur }: { scene: SceneKind; look: Look; seed: number; blur?: boolean }) {
  const id = useSvgId()
  return (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id={`${id}v`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.32" />
        </radialGradient>
      </defs>
      <Scene kind={scene} blur={blur} seed={seed} />
      <Character look={look} seed={seed} />
      <rect width="160" height="90" fill={`url(#${id}v)`} />
    </svg>
  )
}

/** 架空のビデオ会議サービス「Madoi Meet」(円居＝人が輪になって集まること)のロゴ。水面に昇る丸 */
export function MadoiMark({ size = 24 }: { size?: number }) {
  const id = useSvgId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="10" fill={`url(#${id}g)`} />
      <circle cx="16" cy="14" r="5.2" fill="#fff" />
      <path d="M7 20.5 q4.5 -2.4 9 0 t9 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M9.5 24.5 q3.2 -1.6 6.5 0 t6.5 0" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/* ───────── 共有されるスライド(架空のブランドガイドライン) ───────── */

const SWATCHES = [
  { name: '夕凪オレンジ', hex: '#E0794A' },
  { name: '墨', hex: '#2B2A33' },
  { name: '生成り', hex: '#F3EBDE' },
  { name: '藍', hex: '#2F4B8A' },
]

function TomoMark({ x, y, s, color = '#E0794A', bg = '#F3EBDE', simple }: { x: number; y: number; s: number; color?: string; bg?: string; simple?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={s / 2} cy={s / 2} r={s / 2} fill={color} />
      {!simple && <path d={`M${s / 2} ${s * 0.2} L${s / 2} ${s * 0.6}`} stroke={bg} strokeWidth={s * 0.12} strokeLinecap="round" />}
      {simple && <circle cx={s / 2} cy={s * 0.42} r={s * 0.1} fill={bg} />}
    </g>
  )
}

export const SLIDE_TITLES = ['表紙', 'カラーパレット', 'ロゴの最小サイズ', '封筒バリエーション']

export function Slide({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 320 180" className="block size-full" aria-label={`スライド ${index + 1}: ${SLIDE_TITLES[index]}`} role="img">
      <rect width="320" height="180" fill="#F3EBDE" />
      {index === 0 && (
        <g>
          <rect x="0" y="0" width="120" height="180" fill="#2B2A33" />
          <TomoMark x={34} y={58} s={52} bg="#2B2A33" />
          <text x="60" y="140" textAnchor="middle" fontSize="10" fill="#F3EBDE" letterSpacing="3" fontFamily="sans-serif">
            TOMOSHIBI
          </text>
          <text x="146" y="64" fontSize="9" fill="#E0794A" fontFamily="sans-serif" letterSpacing="1.5">
            BRAND REFRESH 2027
          </text>
          <text x="146" y="92" fontSize="20" fill="#2B2A33" fontWeight="700" fontFamily="sans-serif">
            灯をともす、
          </text>
          <text x="146" y="116" fontSize="20" fill="#2B2A33" fontWeight="700" fontFamily="sans-serif">
            あたらしい顔。
          </text>
          <text x="146" y="146" fontSize="8" fill="#6b6570" fontFamily="sans-serif">
            ブランドガイドライン v3 ・ デザイン定例
          </text>
        </g>
      )}
      {index === 1 && (
        <g fontFamily="sans-serif">
          <text x="24" y="34" fontSize="13" fontWeight="700" fill="#2B2A33">
            カラーパレット
          </text>
          <text x="24" y="48" fontSize="7" fill="#6b6570">
            夕凪オレンジは「アクセント」専用。本文には墨を使います。
          </text>
          {SWATCHES.map((s, i) => (
            <g key={s.hex} transform={`translate(${24 + i * 70} 62)`}>
              <rect width="62" height="70" rx="6" fill={s.hex} stroke="#d9cdb8" />
              <text x="0" y="86" fontSize="8" fontWeight="700" fill="#2B2A33">
                {s.name}
              </text>
              <text x="0" y="97" fontSize="7" fill="#6b6570">
                {s.hex}
              </text>
            </g>
          ))}
        </g>
      )}
      {index === 2 && (
        <g fontFamily="sans-serif">
          <text x="24" y="34" fontSize="13" fontWeight="700" fill="#2B2A33">
            ロゴの最小サイズ
          </text>
          <text x="24" y="48" fontSize="7" fill="#6b6570">
            16px 以下では切れ込みが潰れるため、簡易版マークに切り替えます。
          </text>
          {[48, 28, 16, 10].map((s, i) => (
            <g key={s}>
              <TomoMark x={30 + i * 70} y={100 - s / 2} s={s} simple={s <= 16} />
              <text x={30 + i * 70} y="140" fontSize="8" fill="#2B2A33">
                {s}px
              </text>
              <text x={30 + i * 70} y="151" fontSize="6.5" fill={s <= 16 ? '#E0794A' : '#6b6570'}>
                {s <= 16 ? '簡易版' : '通常版'}
              </text>
            </g>
          ))}
          <path d="M152 70 V150" stroke="#d9cdb8" strokeDasharray="3 3" />
        </g>
      )}
      {index === 3 && (
        <g fontFamily="sans-serif">
          <text x="24" y="34" fontSize="13" fontWeight="700" fill="#2B2A33">
            封筒バリエーション
          </text>
          <text x="24" y="48" fontSize="7" fill="#6b6570">
            角2(資料送付用)と、窓付きの長3(請求書用)を追加。
          </text>
          <g transform="translate(30 62) rotate(-3)">
            <rect width="120" height="88" rx="3" fill="#fff" stroke="#d9cdb8" />
            <TomoMark x={10} y={10} s={14} />
            <text x="28" y="21" fontSize="6.5" fill="#2B2A33" letterSpacing="1">
              TOMOSHIBI
            </text>
            <rect x="0" y="78" width="120" height="10" fill="#E0794A" />
          </g>
          <g transform="translate(178 72) rotate(2)">
            <rect width="112" height="60" rx="3" fill="#fff" stroke="#d9cdb8" />
            <rect x="12" y="20" width="50" height="22" rx="2" fill="#F3EBDE" stroke="#d9cdb8" />
            <TomoMark x={92} y={8} s={12} />
            <rect x="0" y="52" width="112" height="8" fill="#2F4B8A" />
          </g>
          <text x="30" y="166" fontSize="7" fill="#6b6570">
            角2
          </text>
          <text x="178" y="152" fontSize="7" fill="#6b6570">
            長3 窓付き
          </text>
        </g>
      )}
      <text x="300" y="170" textAnchor="end" fontSize="7" fill="#9b938a" fontFamily="sans-serif">
        {index + 1} / {SLIDE_TITLES.length}
      </text>
    </svg>
  )
}

/** 共有ピッカーのサムネイル */
export function ShareThumb({ kind }: { kind: 'screen' | 'window' | 'tab' }) {
  if (kind === 'window') return <Slide index={0} />
  return (
    <svg viewBox="0 0 320 180" className="block size-full" aria-hidden>
      <rect width="320" height="180" fill={kind === 'screen' ? '#1e2a44' : '#f6f7fb'} />
      {kind === 'screen' ? (
        <>
          <rect x="0" y="166" width="320" height="14" fill="#0f172a" opacity="0.8" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={120 + i * 16} y="169" width="10" height="8" rx="2" fill={['#5eead4', '#f472b6', '#fbbf24', '#60a5fa', '#a78bfa'][i]} />
          ))}
          <rect x="40" y="26" width="150" height="100" rx="4" fill="#F3EBDE" />
          <rect x="40" y="26" width="150" height="10" rx="4" fill="#d6cbb8" />
          <rect x="150" y="56" width="130" height="90" rx="4" fill="#fff" />
          <rect x="150" y="56" width="130" height="10" rx="4" fill="#e2e6ef" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x="160" y={76 + i * 14} width={i % 2 ? 80 : 108} height="6" rx="3" fill="#e2e6ef" />
          ))}
        </>
      ) : (
        <>
          <rect x="0" y="0" width="320" height="22" fill="#e5e8f0" />
          <rect x="10" y="5" width="90" height="17" rx="4" fill="#fff" />
          <rect x="20" y="40" width="80" height="120" rx="6" fill="#fff" stroke="#e2e6ef" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="30" y={52 + i * 18} width="60" height="8" rx="4" fill={i === 1 ? '#5eead4' : '#e2e6ef'} />
          ))}
          <rect x="116" y="40" width="184" height="54" rx="6" fill="#2B2A33" />
          <rect x="116" y="104" width="88" height="56" rx="6" fill="#E0794A" />
          <rect x="212" y="104" width="88" height="56" rx="6" fill="#2F4B8A" />
        </>
      )}
    </svg>
  )
}
