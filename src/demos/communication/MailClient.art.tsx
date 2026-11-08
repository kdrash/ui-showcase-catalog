import { useId } from 'react'
import type { AttachKind } from './MailClient.data'

/* MailClient で使うオリジナルの SVG イラスト(ロゴ・添付ファイルのサムネイル・空状態) */

const useSvgId = () => useId().replace(/[^a-zA-Z0-9_-]/g, '')

/** 架空のメールサービス「Tayori」のロゴマーク: 封筒のフラップと、右上の小さな切手(灯) */
export function TayoriMark({ size = 28 }: { size?: number }) {
  const id = useSvgId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a6cf0" />
          <stop offset="1" stopColor="#2337a8" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${id}g)`} />
      <path d="M7.5 11.5h17v10.5a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7.8 12 16 18l8.2-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24.5" cy="8" r="3.4" fill="#ffb454" stroke="#2a3fb5" strokeWidth="1.4" />
    </svg>
  )
}

/** 添付ファイルのサムネイル。写真もすべてベクターで描いた架空の風景 */
export function AttachmentArt({ kind, className }: { kind: AttachKind; className?: string }) {
  const id = useSvgId()
  const common = { viewBox: '0 0 160 100', preserveAspectRatio: 'xMidYMid slice', className, 'aria-hidden': true } as const
  switch (kind) {
    case 'lake':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b3f8f" />
              <stop offset="0.45" stopColor="#e26d5c" />
              <stop offset="0.62" stopColor="#ffc078" />
            </linearGradient>
            <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f39a6b" />
              <stop offset="1" stopColor="#2d2f6b" />
            </linearGradient>
          </defs>
          <rect width="160" height="62" fill={`url(#${id}s)`} />
          <circle cx="104" cy="56" r="11" fill="#fff1c9" opacity="0.95" />
          <path d="M0 58 L22 40 L38 50 L58 30 L82 52 L100 44 L124 58 L146 42 L160 50 V62 H0Z" fill="#2c2752" />
          <rect y="62" width="160" height="38" fill={`url(#${id}w)`} />
          {[66, 71, 77, 84, 92].map((y, i) => (
            <rect key={y} x={92 - i * 4} y={y} width={24 + i * 8} height="1.4" rx="0.7" fill="#fff1c9" opacity={0.75 - i * 0.12} />
          ))}
          <path d="M0 62 H160" stroke="#1f1c3d" strokeWidth="1.2" />
        </svg>
      )
    case 'tent':
      return (
        <svg {...common}>
          <defs>
            <radialGradient id={`${id}g`} cx="0.5" cy="0.8" r="0.5">
              <stop offset="0" stopColor="#ffb347" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="160" height="100" fill="#141a3a" />
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={(i * 53) % 160} cy={(i * 29) % 58} r={i % 4 === 0 ? 1.1 : 0.6} fill="#fff" opacity={0.4 + (i % 3) * 0.2} />
          ))}
          <path d="M0 78 Q40 66 80 74 T160 70 V100 H0Z" fill="#0d2a2a" />
          <path d="M10 80 L18 52 L26 80Z M134 76 L144 44 L154 76Z M120 78 L127 58 L134 78Z" fill="#0a1f22" />
          <ellipse cx="80" cy="82" rx="46" ry="16" fill={`url(#${id}g)`} />
          <path d="M56 84 L80 50 L104 84Z" fill="#f08a3c" />
          <path d="M80 50 L104 84 H92Z" fill="#c4612a" />
          <path d="M74 84 L80 66 L86 84Z" fill="#ffd27a" />
        </svg>
      )
    case 'coffee':
      return (
        <svg {...common}>
          <rect width="160" height="100" fill="#b98457" />
          {[14, 34, 54, 74, 94].map((y) => (
            <path key={y} d={`M0 ${y} Q80 ${y + 4} 160 ${y - 2}`} stroke="#a3714a" strokeWidth="1.2" fill="none" />
          ))}
          <ellipse cx="74" cy="56" rx="34" ry="30" fill="#000" opacity="0.15" />
          <circle cx="72" cy="52" r="30" fill="#f6f1ea" />
          <circle cx="72" cy="52" r="23" fill="#7a4a2a" />
          <path d="M72 38c-7 0-11 6-9 12 2 5 9 10 9 14 0-4 7-9 9-14 2-6-2-12-9-12z" fill="#f2dcc2" opacity="0.9" />
          <path d="M100 46 q14 0 14 8 q0 8-14 8" fill="none" stroke="#f6f1ea" strokeWidth="5" />
          <rect x="118" y="20" width="28" height="18" rx="3" fill="#e9e2d6" transform="rotate(12 132 29)" />
        </svg>
      )
    case 'lighting':
      return (
        <svg {...common}>
          <rect width="160" height="100" fill="#f7f3ea" />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M0 ${10 + i * 11} H160`} stroke="#dfe6f3" strokeWidth="0.8" />
          ))}
          <g fill="none" stroke="#2b3a67" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="64" y="56" width="32" height="22" rx="2" />
            <path d="M64 56 L72 48 H104 L96 56 M104 48 V70 L96 78" />
            <path d="M22 24 l10 6 l-6 10z" />
            <path d="M32 30 L66 58 M28 38 L64 70" strokeDasharray="3 3" />
            <path d="M136 22 v14 M130 36 h12" />
            <path d="M136 36 L98 56" strokeDasharray="3 3" />
          </g>
          <circle cx="27" cy="31" r="12" fill="#ffd166" opacity="0.35" />
          <text x="10" y="94" fontSize="8" fill="#2b3a67" fontFamily="sans-serif">key light 45°</text>
        </svg>
      )
    case 'logo':
      return (
        <svg {...common}>
          <rect width="160" height="100" fill="#f3ebde" />
          {[48, 28, 16, 10].map((s, i) => {
            const x = 18 + [0, 58, 96, 122][i]
            return (
              <g key={s} transform={`translate(${x} ${50 - s / 2})`}>
                <circle cx={s / 2} cy={s / 2} r={s / 2} fill="#e0794a" />
                <path d={`M${s / 2} ${s * 0.18} L${s / 2} ${s * 0.62}`} stroke="#f3ebde" strokeWidth={Math.max(1, s * 0.12)} strokeLinecap="round" />
              </g>
            )
          })}
          <text x="18" y="90" fontSize="7" fill="#7b5b45" fontFamily="sans-serif">48px · 28px · 16px · 10px</text>
        </svg>
      )
    case 'doc':
      return (
        <svg {...common}>
          <rect width="160" height="100" fill="#eef7f0" />
          <rect x="28" y="10" width="104" height="84" rx="3" fill="#fff" stroke="#cfe3d4" />
          <rect x="28" y="10" width="104" height="12" rx="3" fill="#2f8f57" />
          {Array.from({ length: 6 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <rect key={`${r}-${c}`} x={32 + c * 25} y={27 + r * 10} width={c === 0 ? 20 : 14 + ((r * 7 + c * 3) % 8)} height="4" rx="1" fill={c === 0 ? '#9fbfa8' : '#d6e6da'} />
            )),
          )}
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect width="160" height="100" fill="#eef0f5" />
          <g transform="translate(46 8)">
            <rect width="68" height="88" rx="3" fill="#fff" stroke="#dde1ea" />
            <rect x="8" y="10" width="34" height="6" rx="1.5" fill="#e5484d" />
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x="8" y={24 + i * 7} width={i % 3 === 2 ? 34 : 52} height="2.6" rx="1.3" fill="#cfd5e2" />
            ))}
            <rect x="8" y="80" width="22" height="3" rx="1.5" fill="#f2a1a3" />
          </g>
        </svg>
      )
  }
}

/** 空のフォルダ用: 雲の上を飛ぶ紙ヒコーキ */
export function EmptyArt({ className }: { className?: string }) {
  const id = useSvgId()
  return (
    <svg viewBox="0 0 200 130" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe5fb" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="66" r="54" fill="#eef1fb" />
      <path d="M44 96c0-9 8-15 16-13 3-8 13-12 21-7 6-6 18-4 21 4 9-1 15 6 13 16z" fill="#fff" stroke="#dfe4f3" />
      <path d="M118 104c0-6 5-10 11-9 2-5 9-8 14-4 5-3 12 0 13 6 6 0 9 4 8 9z" fill="#fff" stroke="#dfe4f3" />
      <path d="M58 58 L150 30 L112 92 L98 70Z" fill={`url(#${id}p)`} stroke="#3557d4" strokeWidth="2" strokeLinejoin="round" />
      <path d="M98 70 L150 30" stroke="#3557d4" strokeWidth="2" />
      <path d="M98 70 L100 86 L112 92" fill="#c9d3f7" stroke="#3557d4" strokeWidth="2" strokeLinejoin="round" />
      <path d="M40 66 q10 -4 18 -8" stroke="#9fb0ea" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/** スレッド未選択時: 便箋と封筒 */
export function LetterArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 150" className={className} aria-hidden>
      <ellipse cx="110" cy="136" rx="74" ry="7" fill="#e6e9f2" />
      <g transform="rotate(-8 92 70)">
        <rect x="46" y="22" width="92" height="104" rx="6" fill="#fff" stroke="#dfe3ee" />
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={i} x="58" y={40 + i * 11} width={i === 6 ? 40 : 68} height="3" rx="1.5" fill="#e4e8f2" />
        ))}
        <rect x="58" y="30" width="30" height="4" rx="2" fill="#3557d4" opacity="0.7" />
      </g>
      <g transform="rotate(6 140 96)">
        <rect x="92" y="64" width="98" height="62" rx="6" fill="#f8f4ec" stroke="#e7dccb" />
        <path d="M94 67 L141 100 L188 67" fill="none" stroke="#d8c8b0" strokeWidth="2" strokeLinejoin="round" />
        <rect x="164" y="72" width="16" height="20" rx="2" fill="#ffb454" />
        <circle cx="172" cy="82" r="4" fill="#fff" opacity="0.7" />
      </g>
    </svg>
  )
}
