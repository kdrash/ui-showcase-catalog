import type { ReactNode } from 'react'
import type { Category } from './MapExplorer.data'

/**
 * MapExplorer の「写真」。外部画像は使わず、カテゴリごとに 3 種類の SVG イラストを描く。
 * hue(店ごとの色相)で看板や小物の色を変えて、同じカテゴリでも店ごとに違って見えるようにする。
 */

type PhotoProps = { cat: Category; variant: number; hue: number; name: string; className?: string }

const hsl = (h: number, s: number, l: number, a = 1) => `hsl(${h} ${s}% ${l}% / ${a})`

export function PlacePhoto({ cat, variant, hue, name, className }: PhotoProps) {
  const v = variant % 3
  let body: ReactNode
  if (v === 1) body = <Storefront cat={cat} hue={hue} name={name} />
  else if (cat === 'cafe') body = v === 0 ? <Latte hue={hue} /> : <CafeInterior hue={hue} />
  else if (cat === 'ramen') body = v === 0 ? <RamenBowl hue={hue} /> : <RamenCounter hue={hue} />
  else if (cat === 'park') body = v === 0 ? <ParkLawn hue={hue} /> : <ParkPond hue={hue} />
  else if (cat === 'books') body = v === 0 ? <Bookshelf hue={hue} /> : <BookStack hue={hue} />
  else if (cat === 'bakery') body = v === 0 ? <BreadRack hue={hue} /> : <Baguettes hue={hue} />
  else body = v === 0 ? <BathMural hue={hue} /> : <ShoeLockers hue={hue} />
  return (
    <svg viewBox="0 0 160 110" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {body}
      <rect width="160" height="110" fill="url(#mx-photo-vignette)" />
      <defs>
        <radialGradient id="mx-photo-vignette" cx="50%" cy="45%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function Latte({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill="#7a5134" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={i * 16} width="160" height="15" fill={i % 2 ? '#835a3b' : '#734b2f'} />
      ))}
      <path d="M0 30 Q40 34 80 29 T160 31" stroke="#5f3c24" strokeWidth="0.8" fill="none" opacity="0.6" />
      <ellipse cx="86" cy="62" rx="44" ry="38" fill="#00000030" />
      <ellipse cx="82" cy="58" rx="44" ry="38" fill={hsl(hue, 25, 92)} />
      <ellipse cx="82" cy="58" rx="34" ry="29" fill={hsl(hue, 18, 84)} />
      <ellipse cx="82" cy="57" rx="27" ry="23" fill="#f4f1ec" />
      <ellipse cx="82" cy="57" rx="23" ry="19.5" fill="#a8693c" />
      <ellipse cx="82" cy="57" rx="23" ry="19.5" fill="url(#mx-crema)" />
      <path
        d="M82 70 C70 62 68 52 76 49 C80 47.5 82 51 82 53 C82 51 84 47.5 88 49 C96 52 94 62 82 70Z"
        fill="#f6ead8"
      />
      <path d="M82 70 L82 76" stroke="#f6ead8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M125 50 q14 2 14 10 q0 8-14 9" stroke={hsl(hue, 25, 92)} strokeWidth="6" fill="none" />
      <rect x="20" y="80" width="26" height="4" rx="2" fill="#d9d4cb" transform="rotate(-22 33 82)" />
      <defs>
        <radialGradient id="mx-crema">
          <stop offset="0%" stopColor="#c58a57" />
          <stop offset="100%" stopColor="#7c4a26" />
        </radialGradient>
      </defs>
    </g>
  )
}

function CafeInterior({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill="#3b2a20" />
      <rect y="0" width="160" height="62" fill="#efe4d2" />
      <rect x="10" y="10" width="44" height="40" rx="2" fill="#bcd9e6" />
      <path d="M32 10v40M10 30h44" stroke="#efe4d2" strokeWidth="2" />
      <rect x="10" y="10" width="44" height="40" rx="2" fill="none" stroke="#8a6a50" strokeWidth="2" />
      {[0, 1].map((r) => (
        <g key={r}>
          <rect x="74" y={16 + r * 20} width="76" height="3" fill="#8a6a50" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              x={78 + i * 10}
              y={6 + r * 20}
              width="7"
              height="10"
              rx="1.5"
              fill={hsl(hue + i * 25, 40, r ? 55 : 70)}
            />
          ))}
        </g>
      ))}
      {[40, 90, 130].map((x, i) => (
        <g key={i}>
          <path d={`M${x} 0v22`} stroke="#2a2420" strokeWidth="1" />
          <path d={`M${x - 8} 30 Q${x} 18 ${x + 8} 30Z`} fill="#2a2420" />
          <ellipse cx={x} cy="31" rx="10" ry="5" fill="#ffd98a" opacity="0.55" />
        </g>
      ))}
      <rect y="62" width="160" height="10" fill="#6b4a33" />
      <rect y="72" width="160" height="38" fill="#4a3325" />
      <rect x="18" y="52" width="16" height="10" rx="2" fill={hsl(hue, 30, 88)} />
      <rect x="112" y="48" width="10" height="14" rx="1" fill="#c9c2b6" />
      <rect x="126" y="44" width="16" height="18" rx="2" fill="#9aa3ab" />
      <circle cx="56" cy="58" r="4" fill="#5c8a4c" />
      <rect x="54" y="58" width="4" height="4" fill="#8a5a3b" />
    </g>
  )
}

function RamenBowl({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill="#2b2522" />
      <rect y="0" width="160" height="110" fill={hsl(hue, 15, 18)} />
      <rect x="0" y="86" width="160" height="2" fill="#00000040" />
      <ellipse cx="82" cy="58" rx="54" ry="48" fill="#00000055" />
      <ellipse cx="80" cy="55" rx="54" ry="48" fill={hsl(hue, 55, 38)} />
      <ellipse cx="80" cy="55" rx="54" ry="48" fill="none" stroke="#f3e9d8" strokeWidth="3" strokeDasharray="6 5" opacity="0.6" />
      <ellipse cx="80" cy="55" rx="44" ry="39" fill="#e9c98f" />
      <ellipse cx="80" cy="55" rx="44" ry="39" fill="url(#mx-broth)" />
      {Array.from({ length: 7 }, (_, i) => (
        <path
          key={i}
          d={`M${44 + i * 4} ${44 + i * 5} q8 -6 16 0 t16 0 t16 0 t16 0`}
          stroke="#f7e3a6"
          strokeWidth="2.2"
          fill="none"
          opacity="0.9"
        />
      ))}
      <circle cx="104" cy="42" r="13" fill="#b9805a" />
      <circle cx="104" cy="42" r="10" fill="#d9a47e" />
      <path d="M97 40 q7 -5 14 1" stroke="#a46b45" strokeWidth="1.5" fill="none" />
      <ellipse cx="62" cy="38" rx="10" ry="8" fill="#fbf4e6" />
      <ellipse cx="62" cy="38.5" rx="6" ry="5" fill="#f2a536" />
      <rect x="92" y="58" width="22" height="26" rx="1" fill="#1d2b22" transform="rotate(14 103 71)" />
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={58 + (i % 5) * 6} cy={66 + Math.floor(i / 5) * 5} r="2" fill="#6bb34a" stroke="#d8f0c0" strokeWidth="0.6" />
      ))}
      <rect x="128" y="10" width="4" height="80" rx="2" fill="#c9a26b" transform="rotate(20 130 50)" />
      <rect x="136" y="10" width="4" height="80" rx="2" fill="#c9a26b" transform="rotate(20 138 50)" />
      <defs>
        <radialGradient id="mx-broth" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#fff3cf" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#d9a65c" stopOpacity="0" />
        </radialGradient>
      </defs>
    </g>
  )
}

function RamenCounter({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill="#2a211c" />
      <rect width="160" height="54" fill="#d8c3a2" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={6 + i * 19} y="8" width="15" height="22" rx="1" fill="#f4ead8" stroke="#a88b63" strokeWidth="0.8" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          <rect x={9 + i * 19} y="12" width="9" height="2" fill="#4a3a2a" opacity="0.7" />
          <rect x={9 + i * 19} y="17" width="6" height="2" fill="#4a3a2a" opacity="0.5" />
          <rect x={9 + i * 19} y="23" width="8" height="3" fill={hsl(hue, 70, 45)} opacity="0.8" />
        </g>
      ))}
      <rect y="54" width="160" height="12" fill="#8a5a36" />
      <rect y="66" width="160" height="44" fill="#3c2c22" />
      {[30, 80, 128].map((x, i) => (
        <g key={i}>
          <path d={`M${x - 18} 54 Q${x} 74 ${x + 18} 54Z`} fill={hsl(hue, 50, i === 1 ? 30 : 36)} />
          <ellipse cx={x} cy="54" rx="18" ry="5" fill="#e6c27e" />
          <path
            d={`M${x - 6} 44 q-4 -6 0 -12 q4 -6 0 -12 M${x + 5} 46 q-4 -6 0 -12 q4 -6 0 -12`}
            stroke="#fff"
            strokeWidth="2"
            fill="none"
            opacity="0.35"
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  )
}

function ParkLawn({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill="#bfe1f2" />
      <circle cx="128" cy="22" r="10" fill="#fff4c8" />
      <path d="M0 52 Q40 40 80 48 T160 44 V110 H0Z" fill="#8fc77a" />
      <path d="M0 66 Q50 56 100 64 T160 60 V110 H0Z" fill="#78b864" />
      <path d="M58 110 Q76 80 92 66 Q98 62 104 62" stroke="#e7dcc0" strokeWidth="10" fill="none" />
      {[
        [26, 50, 1],
        [52, 44, 0.8],
        [120, 46, 1.1],
        [146, 52, 0.7],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="-2" y="0" width="4" height="16" fill="#6b4a33" />
          <circle cx="0" cy="-8" r="14" fill={hsl(110 + (hue % 30), 38, 36)} />
          <circle cx="-7" cy="-2" r="9" fill={hsl(110 + (hue % 30), 38, 42)} />
          <circle cx="7" cy="-4" r="10" fill={hsl(110 + (hue % 30), 38, 32)} />
        </g>
      ))}
      <rect x="110" y="78" width="22" height="3" rx="1" fill="#7a5a3c" />
      <rect x="112" y="81" width="2" height="6" fill="#4a3a2a" />
      <rect x="128" y="81" width="2" height="6" fill="#4a3a2a" />
    </g>
  )
}

function ParkPond({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill="#cfe7f0" />
      <path d="M0 40 Q60 30 160 38 V110 H0Z" fill="#86bf74" />
      <ellipse cx="80" cy="78" rx="70" ry="22" fill="#5aa0c8" />
      <ellipse cx="80" cy="78" rx="70" ry="22" fill="url(#mx-pond)" />
      <path d="M30 70 Q80 46 130 70" stroke="#b5432f" strokeWidth="4" fill="none" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M${38 + i * 11} ${66 - Math.sin((i / 8) * Math.PI) * 18} v10`} stroke="#b5432f" strokeWidth="2" />
      ))}
      <path d="M30 76 Q80 52 130 76" stroke="#8d3122" strokeWidth="3" fill="none" />
      {[14, 150].map((x, i) => (
        <g key={i}>
          <rect x={x - 2} y="30" width="4" height="22" fill="#5b4330" />
          <path d={`M${x} 30 q-14 4 -18 24 M${x} 30 q-6 8 -8 26 M${x} 30 q8 6 10 24 M${x} 30 q14 4 18 22`} stroke={hsl(100 + (hue % 40), 40, 38)} strokeWidth="3" fill="none" />
        </g>
      ))}
      <path d="M60 86 q6 -3 12 0 M96 92 q6 -3 12 0" stroke="#e8f4fa" strokeWidth="1.2" fill="none" opacity="0.8" />
      <defs>
        <linearGradient id="mx-pond" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </g>
  )
}

function Bookshelf({ hue }: { hue: number }) {
  const rows = [8, 42, 76]
  return (
    <g>
      <rect width="160" height="110" fill="#5a3d2a" />
      {rows.map((y, r) => (
        <g key={r}>
          {Array.from({ length: 22 }, (_, i) => {
            const w = 4 + ((i * 7 + r * 3) % 5)
            const x = 4 + Array.from({ length: i }, (_, k) => 4 + ((k * 7 + r * 3) % 5) + 1).reduce((a, b) => a + b, 0)
            if (x + w > 156) return null
            const hgt = 22 + ((i * 5 + r) % 7)
            const tilt = (i * 13 + r) % 17 === 0
            return (
              <rect
                key={i}
                x={x}
                y={y + 30 - hgt}
                width={w}
                height={hgt}
                rx="0.6"
                fill={hsl(hue + ((i * 47 + r * 90) % 200) - 60, 35 + ((i * 11) % 25), 30 + ((i * 17 + r * 7) % 35))}
                transform={tilt ? `rotate(-8 ${x} ${y + 30})` : undefined}
              />
            )
          })}
          <rect x="0" y={y + 30} width="160" height="4" fill="#3d281b" />
        </g>
      ))}
    </g>
  )
}

function BookStack({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill="#efe6d6" />
      <rect x="92" y="8" width="58" height="56" fill="#cfe2ea" />
      <path d="M121 8v56M92 36h58" stroke="#efe6d6" strokeWidth="2.5" />
      <rect y="78" width="160" height="32" fill="#a27650" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect
          key={i}
          x={26 + ((i * 7) % 9) - 4}
          y={70 - i * 9}
          width={58 - ((i * 5) % 12)}
          height="8"
          rx="1"
          fill={hsl(hue + i * 40, 40, 40 + (i % 3) * 10)}
        />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={28 + ((i * 7) % 9) - 4} y={72 - i * 9} width={52 - ((i * 5) % 12)} height="1.2" fill="#fff" opacity="0.5" />
      ))}
      <rect x="100" y="60" width="20" height="18" rx="3" fill="#f7f3ea" stroke="#d2c6b0" />
      <path d="M120 64 q6 1 6 5 q0 4 -6 5" stroke="#d2c6b0" strokeWidth="2" fill="none" />
      <rect x="126" y="70" width="22" height="8" rx="1" fill={hsl(hue, 50, 55)} transform="rotate(-6 137 74)" />
    </g>
  )
}

function BreadRack({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill="#f3e6cf" />
      {[22, 58, 94].map((y, r) => (
        <g key={r}>
          <rect x="0" y={y + 10} width="160" height="5" fill="#a77b52" />
          {Array.from({ length: 5 }, (_, i) => {
            const x = 18 + i * 31
            if (r === 0)
              return (
                <g key={i}>
                  <path d={`M${x - 13} ${y + 10} Q${x - 10} ${y - 8} ${x} ${y - 9} Q${x + 10} ${y - 8} ${x + 13} ${y + 10}Z`} fill="#c98a45" />
                  <path d={`M${x - 6} ${y - 2} l4 6 M${x} ${y - 4} l4 6 M${x + 6} ${y - 2} l3 5`} stroke="#f2d39c" strokeWidth="1.6" />
                </g>
              )
            if (r === 1)
              return (
                <g key={i}>
                  <path
                    d={`M${x - 14} ${y + 8} Q${x - 8} ${y - 6} ${x} ${y - 4} Q${x + 8} ${y - 6} ${x + 14} ${y + 8} Q${x} ${y + 2} ${x - 14} ${y + 8}Z`}
                    fill="#d99a4e"
                  />
                  <path d={`M${x - 7} ${y - 1} q2 6 0 9 M${x} ${y - 3} v10 M${x + 7} ${y - 1} q-2 6 0 9`} stroke="#b06f2c" strokeWidth="1.2" fill="none" />
                </g>
              )
            return (
              <g key={i}>
                <circle cx={x} cy={y + 2} r="9" fill="#b9773d" />
                <circle cx={x} cy={y + 1} r="2.2" fill={hsl(hue + 300, 40, 30)} />
              </g>
            )
          })}
        </g>
      ))}
    </g>
  )
}

function Baguettes({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill={hsl(hue, 30, 86)} />
      <rect y="70" width="160" height="40" fill="#8e6a4a" />
      <path d="M44 100 L56 52 H104 L116 100Z" fill="#c39b6a" />
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} d={`M${48 + i * 2} ${92 - i * 9} H${112 - i * 2}`} stroke="#a37b4c" strokeWidth="1.4" />
      ))}
      {[-18, -6, 6, 18].map((a, i) => (
        <g key={i} transform={`rotate(${a} ${80 + a} 60)`}>
          <rect x={74 + a} y="6" width="13" height="64" rx="6.5" fill="#d08f45" />
          {Array.from({ length: 4 }, (_, k) => (
            <path key={k} d={`M${77 + a} ${16 + k * 13} l7 6`} stroke="#f1cf92" strokeWidth="1.6" />
          ))}
        </g>
      ))}
      <rect x="20" y="58" width="22" height="12" rx="2" fill="#fbf6ec" />
      <path d="M24 63h14M24 66h10" stroke="#a37b4c" strokeWidth="1" />
    </g>
  )
}

function BathMural({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill="#bfe0f2" />
      <path d="M0 50 L44 18 L66 34 L96 10 L160 50 Z" fill="#6f95b8" />
      <path d="M86 18 L96 10 L106 18 L100 17 L96 20 L92 17Z" fill="#fff" />
      <path d="M0 50 Q40 44 80 50 T160 48 V60 H0Z" fill="#3d7fb4" />
      <path d="M10 52 q6 -3 12 0 M60 54 q6 -3 12 0 M120 52 q6 -3 12 0" stroke="#e7f4fb" strokeWidth="1.2" fill="none" />
      <path d="M128 40 l-6 6 h12Z" fill="#fff" />
      <rect y="60" width="160" height="50" fill="#e9f1f3" />
      {Array.from({ length: 16 }, (_, i) =>
        Array.from({ length: 4 }, (_, j) => (
          <rect key={`${i}-${j}`} x={i * 10} y={60 + j * 10} width="9.4" height="9.4" fill={j < 2 ? hsl(hue, 35, 82) : '#f2f6f7'} />
        )),
      )}
      <rect x="0" y="78" width="160" height="32" fill={hsl(hue, 55, 62)} opacity="0.75" />
      <path d="M0 80 q20 -4 40 0 t40 0 t40 0 t40 0" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.7" />
      <path d="M40 74 q-3 -6 0 -12 q3 -6 0 -12 M110 74 q-3 -6 0 -12 q3 -6 0 -12" stroke="#fff" strokeWidth="2" fill="none" opacity="0.55" strokeLinecap="round" />
    </g>
  )
}

function ShoeLockers({ hue }: { hue: number }) {
  return (
    <g>
      <rect width="160" height="110" fill="#d9c7a8" />
      {Array.from({ length: 6 }, (_, i) =>
        Array.from({ length: 4 }, (_, j) => (
          <g key={`${i}-${j}`}>
            <rect x={14 + i * 22} y={10 + j * 22} width="20" height="20" fill="#8b5e3c" stroke="#6b462c" />
            <rect x={20 + i * 22} y={14 + j * 22} width="8" height="4" rx="1" fill="#efe3c8" />
            <text x={24 + i * 22} y={17.3 + j * 22} fontSize="3.6" textAnchor="middle" fill="#3a2a1c">
              {j * 6 + i + 1}
            </text>
            <rect x={22 + i * 22} y={22 + j * 22} width="4" height="5" rx="1" fill={hsl(hue, 30, 60)} />
          </g>
        )),
      )}
      <rect y="98" width="160" height="12" fill="#6b4a33" />
    </g>
  )
}

const CAT_SIGN: Record<Category, { bg: (h: number) => string; mark: string }> = {
  cafe: { bg: (h) => hsl(h, 35, 32), mark: 'COFFEE' },
  ramen: { bg: (h) => hsl(h, 55, 30), mark: '麺' },
  park: { bg: () => '#3d6b3a', mark: 'PARK' },
  books: { bg: (h) => hsl(h, 30, 28), mark: '本' },
  bakery: { bg: (h) => hsl(h, 45, 42), mark: 'PAIN' },
  sento: { bg: (h) => hsl(h, 50, 30), mark: 'ゆ' },
}

function Storefront({ cat, hue, name }: { cat: Category; hue: number; name: string }) {
  if (cat === 'park') {
    return (
      <g>
        <rect width="160" height="110" fill="#cde6f2" />
        <path d="M0 62 H160 V110 H0Z" fill="#9aca83" />
        <path d="M60 110 L74 62 H86 L100 110Z" fill="#e6dcc2" />
        {[16, 40, 120, 144].map((x, i) => (
          <g key={i}>
            <rect x={x - 2} y="40" width="4" height="24" fill="#6b4a33" />
            <circle cx={x} cy="34" r="16" fill={i % 2 ? '#f2b8c6' : '#efc4d0'} />
            <circle cx={x - 6} cy="40" r="10" fill="#f6ced8" />
          </g>
        ))}
        <rect x="64" y="30" width="32" height="14" rx="2" fill="#3d6b3a" />
        <text x="80" y="40" fontSize="6.5" fill="#fff" textAnchor="middle" fontWeight="700">
          {name.slice(0, 6)}
        </text>
        <rect x="66" y="44" width="2" height="18" fill="#3d3a33" />
        <rect x="92" y="44" width="2" height="18" fill="#3d3a33" />
      </g>
    )
  }
  const s = CAT_SIGN[cat]
  const awning = hsl(hue, 55, 48)
  return (
    <g>
      <rect width="160" height="110" fill="#d7dde2" />
      <rect x="0" y="0" width="160" height="16" fill="#c4ccd3" />
      <rect x="14" y="14" width="132" height="96" fill={cat === 'sento' ? '#a88b6a' : '#f2ede4'} />
      <rect x="14" y="14" width="132" height="22" fill={s.bg(hue)} />
      <text x="80" y="29" fontSize={s.mark.length > 2 ? 8 : 11} fill="#fff" textAnchor="middle" fontWeight="700" letterSpacing="2">
        {cat === 'sento' || cat === 'ramen' || cat === 'books' ? name.slice(0, 7) : s.mark}
      </text>
      {cat === 'ramen' || cat === 'sento' ? (
        <g>
          {Array.from({ length: 4 }, (_, i) => (
            <rect key={i} x={40 + i * 20.5} y="38" width="19.5" height="30" fill={cat === 'sento' ? hsl(hue, 60, 34) : '#24324a'} />
          ))}
          <text x="80" y="58" fontSize="14" fill="#fff" textAnchor="middle" fontWeight="700">
            {s.mark}
          </text>
          <rect x="40" y="68" width="82" height="34" fill="#2b231d" />
          <rect x="44" y="72" width="36" height="30" fill="#e8d6b4" opacity="0.6" />
          {cat === 'ramen' && (
            <g>
              <rect x="22" y="44" width="10" height="14" rx="5" fill="#d2402e" />
              <rect x="22" y="44" width="10" height="14" rx="5" fill="url(#mx-lantern)" />
            </g>
          )}
        </g>
      ) : (
        <g>
          <path d="M14 36 H146 L140 48 H20Z" fill={awning} />
          {Array.from({ length: 11 }, (_, i) => (
            <path key={i} d={`M${20 + i * 12} 36 h6 l-0.5 12 h-6Z`} fill="#fff" opacity="0.85" />
          ))}
          <rect x="24" y="54" width="62" height="44" fill="#bcd6e0" />
          <rect x="24" y="54" width="62" height="44" fill="url(#mx-glass)" />
          <path d="M55 54v44" stroke="#f2ede4" strokeWidth="2" />
          <rect x="96" y="54" width="34" height="56" fill="#6b4a33" />
          <circle cx="124" cy="82" r="1.6" fill="#f0d27a" />
          {Array.from({ length: 4 }, (_, i) => (
            <circle key={i} cx={34 + i * 14} cy="90" r="4" fill={hsl(hue + i * 30, 45, 55)} />
          ))}
        </g>
      )}
      <rect x="0" y="102" width="160" height="8" fill="#9aa3ab" />
      <defs>
        <linearGradient id="mx-glass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="mx-lantern">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffcf8a" stopOpacity="0" />
        </radialGradient>
      </defs>
    </g>
  )
}

/** 配達パートナーのアバター(架空) */
export function CourierAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="24" fill="#cfe3f5" />
      <path d="M8 48 Q10 34 24 32 Q38 34 40 48Z" fill="#2f6f4f" />
      <path d="M18 34 l6 6 l6 -6" stroke="#f5f2ea" strokeWidth="2" fill="none" />
      <circle cx="24" cy="22" r="9" fill="#f1cfb0" />
      <path d="M14 20 Q15 9 24 9 Q33 9 34 20 Q30 15 24 15 Q18 15 14 20Z" fill="#2c2a28" />
      <path d="M13 19 Q14 6 24 6 Q34 6 35 19 L35 21 H13Z" fill="#3a9a6b" />
      <rect x="11" y="19" width="26" height="3" rx="1.5" fill="#2f7d55" />
      <circle cx="20.5" cy="23" r="1.1" fill="#2c2a28" />
      <circle cx="27.5" cy="23" r="1.1" fill="#2c2a28" />
      <path d="M21.5 27 q2.5 2 5 0" stroke="#b9775a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
