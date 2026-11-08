/* TeamChat のイラスト類。アバター・ワークスペースのロゴ・添付画像・ファイルアイコンをすべてインライン SVG で描く */
import { useId } from 'react'
import type { ArtKind, User } from './TeamChat.data'

/** 人物アバター(角丸の正方形 + 胴体 + 頭 + 髪型 4 種)。アプリは専用ロゴ */
export function AvatarArt({ user, size = 36, className = '' }: { user: User; size?: number; className?: string }) {
  const rad = Math.round(size * 0.24)
  if (user.app) {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden style={{ borderRadius: rad }}>
        <rect width="40" height="40" fill={user.bg} />
        {user.id === 'ci' ? (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 24c3-4 6-4 9 0s6 4 9 0 4-3 4-3" stroke="#5fd1b9" strokeWidth="3" />
            <path d="M12 15l3 3 6-7" stroke="#fff" strokeWidth="3" />
          </g>
        ) : (
          <g>
            <circle cx="15" cy="17" r="6.5" fill="#fff" />
            <circle cx="25.5" cy="23" r="6.5" fill="#fff" opacity=".75" />
            <circle cx="15" cy="17" r="2.2" fill={user.bg} />
            <circle cx="25.5" cy="23" r="2.2" fill={user.bg} />
          </g>
        )}
      </svg>
    )
  }
  const hair = user.hair
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden style={{ borderRadius: rad }}>
      <rect width="40" height="40" fill={user.bg} />
      {user.style === 1 && <path d="M10.5 19C10.5 9.5 15.5 7.5 20 7.5S29.5 9.5 29.5 19L31 33H9Z" fill={hair} />}
      <path d="M5 41c0-9 6.5-13 15-13s15 4 15 13Z" fill={user.shirt} />
      <path d="M17.2 24h5.6v5.2a2.8 2.8 0 0 1-5.6 0Z" fill={user.skin} />
      <ellipse cx="20" cy="18.5" rx="7.6" ry="8.2" fill={user.skin} />
      {user.style === 0 && (
        <path
          d="M11.4 20C10.6 11 15 8.2 20 8.2S29.4 11 28.6 20L28.7 25.2C27.2 25 26.8 22.6 26.9 20.6 26.9 15.6 24 13.4 20 13.2 16 13.4 13.1 15.6 13.1 20.6 13.2 22.6 12.8 25 11.3 25.2Z"
          fill={hair}
        />
      )}
      {user.style === 1 && <path d="M12.3 18C13 11.5 16.4 9.6 20 9.6S27 11.5 27.7 18C25.4 14.6 22.4 13.4 19.4 14 17 13.6 14.4 15 12.3 18Z" fill={hair} />}
      {user.style === 2 && <path d="M12.2 18C11.6 11 15.4 8.6 20 8.6S28.4 11 27.8 18C26.6 14.4 24.6 13.1 21.6 13.3 19 12.4 15 13.6 12.2 18Z" fill={hair} />}
      {user.style === 3 && (
        <g fill={hair}>
          <circle cx="20" cy="8.2" r="4.2" />
          <path d="M12.2 19C11.8 12 15.4 9.6 20 9.6S28.2 12 27.8 19C26.4 15.2 23.8 13.6 20 13.6S13.6 15.2 12.2 19Z" />
        </g>
      )}
      <circle cx="17.1" cy="19.6" r="0.95" fill="#2b2320" />
      <circle cx="22.9" cy="19.6" r="0.95" fill="#2b2320" />
      <ellipse cx="15.6" cy="22.2" rx="1.4" ry="0.8" fill="#f08f7f" opacity=".35" />
      <ellipse cx="24.4" cy="22.2" rx="1.4" ry="0.8" fill="#f08f7f" opacity=".35" />
      <path d="M18.6 23.1q1.4 1.1 2.8 0" stroke="#7a4434" strokeWidth=".8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** ワークスペースのロゴ */
export function WorkspaceLogo({ kind, size = 36 }: { kind: 'minamo' | 'boulder' | 'kagari'; size?: number }) {
  const gid = useId()
  if (kind === 'minamo') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4cc9b0" />
            <stop offset="1" stopColor="#1d6f86" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill={`url(#${gid})`} />
        <circle cx="26" cy="13" r="4.5" fill="#ffe7a8" />
        <path d="M6 24c3.5-3.6 7-3.6 10.5 0s7 3.6 10.5 0 5.5-3 7-2" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M6 31c3.5-3.6 7-3.6 10.5 0s7 3.6 10.5 0 5.5-3 7-2" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".55" />
      </svg>
    )
  }
  if (kind === 'boulder') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <rect width="40" height="40" rx="10" fill="#f2b84b" />
        <path d="M6 31l9-14 5 7 4-5 10 12Z" fill="#7a3f1d" />
        <circle cx="16" cy="22" r="1.4" fill="#ffd98a" />
        <circle cx="25" cy="25" r="1.4" fill="#ff8a6a" />
        <circle cx="20" cy="27.5" r="1.4" fill="#8ad0ff" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="10" fill="#2a2140" />
      <path d="M20 8c4 5 7 8 7 13a7 7 0 0 1-14 0c0-3 1.6-5 3-6.5.3 2.4 1.4 3.8 2.8 4.3C18 15 18.6 11.4 20 8Z" fill="#ff8a4c" />
      <path d="M20 19c2 2.4 3.2 3.8 3.2 6a3.2 3.2 0 0 1-6.4 0c0-2 1.4-3.6 3.2-6Z" fill="#ffd36b" />
    </svg>
  )
}

/** ファイルの種類アイコン */
export function FileGlyph({ ext, size = 40 }: { ext: 'pdf' | 'zip' | 'mov' | 'pen'; size?: number }) {
  const color = { pdf: '#e0503c', zip: '#d99a1e', mov: '#7c5ad6', pen: '#8a5cc7' }[ext]
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="9" fill={color} />
      <path d="M13 9h10l6 6v16a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2Z" fill="#fff" opacity=".95" />
      <path d="M23 9v4.5a1.5 1.5 0 0 0 1.5 1.5H29" fill="none" stroke={color} strokeWidth="1.2" opacity=".5" />
      <text x="20" y="27.5" textAnchor="middle" fontSize="6.2" fontWeight="800" fill={color} fontFamily="ui-sans-serif, system-ui">
        {ext.toUpperCase()}
      </text>
    </svg>
  )
}

/** リンクプレビューのサムネイル */
export function UnfurlThumb({ kind }: { kind: 'pen' | 'docs' }) {
  if (kind === 'pen') {
    return (
      <svg viewBox="0 0 96 72" className="h-full w-full" aria-hidden>
        <rect width="96" height="72" fill="#f1ecfa" />
        <rect x="8" y="10" width="24" height="44" rx="4" fill="#fff" stroke="#d9cdf0" />
        <rect x="36" y="10" width="24" height="44" rx="4" fill="#1b2340" />
        <rect x="64" y="10" width="24" height="44" rx="4" fill="#fff" stroke="#d9cdf0" />
        <path d="M10 40c4-6 8-6 12 0s6 4 8 2" stroke="#2f9e8a" strokeWidth="2" fill="none" />
        <path d="M38 40c4-6 8-6 12 0s6 4 8 2" stroke="#6fd3ff" strokeWidth="2" fill="none" />
        <rect x="67" y="16" width="14" height="3" rx="1.5" fill="#c9b8ec" />
        <rect x="67" y="22" width="18" height="3" rx="1.5" fill="#e3daf5" />
        <rect x="67" y="28" width="10" height="3" rx="1.5" fill="#e3daf5" />
        <circle cx="76" cy="58" r="5" fill="#8a5cc7" />
        <path d="M74 58h4M76 56v4" stroke="#fff" strokeWidth="1.4" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 96 72" className="h-full w-full" aria-hidden>
      <rect width="96" height="72" fill="#e8f3f1" />
      <rect x="12" y="10" width="72" height="54" rx="5" fill="#fff" />
      <rect x="18" y="17" width="30" height="4" rx="2" fill="#2f6f73" />
      <rect x="18" y="26" width="58" height="2.6" rx="1.3" fill="#cfdedb" />
      <rect x="18" y="31" width="50" height="2.6" rx="1.3" fill="#cfdedb" />
      <rect x="18" y="39" width="60" height="16" rx="3" fill="#1c2b30" />
      <rect x="22" y="43" width="20" height="2.4" rx="1.2" fill="#5fd1b9" />
      <rect x="22" y="48" width="32" height="2.4" rx="1.2" fill="#f2c46b" />
    </svg>
  )
}

/* ───────────── 添付画像 ───────────── */

function TideCurve({ x, y, w, h, stroke, fill }: { x: number; y: number; w: number; h: number; stroke: string; fill: string }) {
  const pts: string[] = []
  for (let i = 0; i <= 48; i++) {
    const t = i / 48
    const v = Math.sin(t * Math.PI * 2 * 1.6 + 0.6) * 0.38 + Math.sin(t * Math.PI * 7) * 0.05
    pts.push(`${(x + t * w).toFixed(1)},${(y + h / 2 - v * h).toFixed(1)}`)
  }
  return (
    <g>
      <path d={`M${pts.join(' L')} L${x + w},${y + h} L${x},${y + h}Z`} fill={fill} />
      <path d={`M${pts.join(' L')}`} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
    </g>
  )
}

function PhoneTide({ x, dark }: { x: number; dark: boolean }) {
  const bg = dark ? '#0f1b33' : '#ffffff'
  const fg = dark ? '#e8f0ff' : '#14262b'
  const sub = dark ? '#7f93b8' : '#7b8d90'
  return (
    <g transform={`translate(${x} 18)`}>
      <rect width="170" height="214" rx="18" fill={bg} stroke={dark ? '#24365e' : '#d6e2e0'} />
      <text x="16" y="30" fontSize="9" fill={sub} fontFamily="system-ui">今日の潮位 · 汐見港</text>
      <text x="16" y="52" fontSize="20" fontWeight="700" fill={fg} fontFamily="system-ui">132<tspan fontSize="10" dx="2">cm</tspan></text>
      <text x="96" y="52" fontSize="9" fill={dark ? '#6fd3ff' : '#2f9e8a'} fontFamily="system-ui">↑ 上げ潮</text>
      <TideCurve x={10} y={70} w={150} h={90} stroke={dark ? '#6fd3ff' : '#2f9e8a'} fill={dark ? 'rgba(111,211,255,.16)' : 'rgba(47,158,138,.14)'} />
      <line x1="62" y1="66" x2="62" y2="166" stroke={dark ? '#ffd27a' : '#e0674c'} strokeDasharray="2 3" />
      <circle cx="62" cy="96" r="3.6" fill={dark ? '#ffd27a' : '#e0674c'} />
      {['0', '6', '12', '18', '24'].map((t, i) => (
        <text key={t} x={12 + i * 36} y="178" fontSize="7.5" fill={sub} fontFamily="system-ui">{t}時</text>
      ))}
      <rect x="16" y="188" width="64" height="16" rx="8" fill={dark ? '#1c2c52' : '#e9f4f1'} />
      <text x="24" y="199" fontSize="7.5" fill={fg} fontFamily="system-ui">満潮 14:32</text>
      <rect x="88" y="188" width="64" height="16" rx="8" fill={dark ? '#1c2c52' : '#e9f4f1'} />
      <text x="96" y="199" fontSize="7.5" fill={fg} fontFamily="system-ui">干潮 20:48</text>
      {dark && [[120, 24], [140, 36], [150, 18]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r=".9" fill="#fff" opacity=".7" />)}
    </g>
  )
}

export function Art({ kind }: { kind: ArtKind }) {
  const gid = useId().replace(/:/g, '')
  switch (kind) {
    case 'tide-pair':
      return (
        <svg viewBox="0 0 420 250" className="block h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={`${gid}a`} x1="0" x2="1">
              <stop offset="0" stopColor="#e6f4f1" />
              <stop offset="1" stopColor="#dfe6f6" />
            </linearGradient>
          </defs>
          <rect width="420" height="250" fill={`url(#${gid}a)`} />
          <PhoneTide x={30} dark={false} />
          <PhoneTide x={220} dark />
        </svg>
      )
    case 'flicker':
      return (
        <svg viewBox="0 0 300 220" className="block h-full w-full" aria-hidden>
          <rect width="300" height="220" fill="#202428" />
          <rect x="70" y="14" width="160" height="192" rx="16" fill="#fff" />
          <text x="84" y="38" fontSize="9" fill="#7b8d90" fontFamily="system-ui">今日の潮位 · 汐見港</text>
          <g transform="translate(0 2)" opacity=".55">
            <TideCurve x={80} y={60} w={140} h={90} stroke="#e0503c" fill="transparent" />
          </g>
          <g transform="translate(3 -3)" opacity=".5">
            <TideCurve x={80} y={60} w={140} h={90} stroke="#3aa7e8" fill="transparent" />
          </g>
          <TideCurve x={80} y={60} w={140} h={90} stroke="#2f9e8a" fill="rgba(47,158,138,.12)" />
          <rect x="80" y="104" width="140" height="6" fill="#fff" opacity=".7" />
          <rect x="80" y="122" width="140" height="3" fill="#2f9e8a" opacity=".35" />
          <circle cx="22" cy="22" r="5" fill="#ff4d4d" />
          <text x="32" y="26" fontSize="10" fill="#fff" fontFamily="ui-monospace, monospace">REC 00:07</text>
          <path d="M248 180a14 14 0 1 1 10-4" stroke="#fff" strokeWidth="2" fill="none" opacity=".7" />
          <path d="M258 170l1 7-7-1" stroke="#fff" strokeWidth="2" fill="none" opacity=".7" />
        </svg>
      )
    case 'icons':
      return (
        <svg viewBox="0 0 400 170" className="block h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={`${gid}b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a8fd0" />
              <stop offset="1" stopColor="#164a8a" />
            </linearGradient>
            <linearGradient id={`${gid}c`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5fd1b9" />
              <stop offset="1" stopColor="#1d6f86" />
            </linearGradient>
          </defs>
          <rect width="400" height="170" fill="#f6f4f0" />
          {/* 1 */}
          <g transform="translate(40 26)">
            <rect width="88" height="88" rx="22" fill={`url(#${gid}b)`} />
            <circle cx="44" cy="40" r="16" fill="#fff" opacity=".9" />
            <path d="M8 62c9-8 18-8 27 0s18 8 27 0 14-6 18-4v30H8Z" fill="#9fe3ff" opacity=".8" />
          </g>
          {/* 2 */}
          <g transform="translate(156 26)">
            <rect width="88" height="88" rx="22" fill={`url(#${gid}c)`} />
            <circle cx="60" cy="28" r="9" fill="#ffe7a8" />
            <path d="M14 52c7-7 14-7 21 0s14 7 21 0 12-6 18-3" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M14 68c7-7 14-7 21 0s14 7 21 0 12-6 18-3" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" opacity=".5" />
          </g>
          {/* 3 */}
          <g transform="translate(272 26)">
            <rect width="88" height="88" rx="22" fill="#fff" stroke="#e1ddd5" />
            <text x="44" y="60" textAnchor="middle" fontSize="40" fontWeight="800" fill="#1d6f86" fontFamily="system-ui">潮</text>
          </g>
          {['1', '2', '3'].map((n, i) => (
            <g key={n} transform={`translate(${84 + i * 116} 140)`}>
              <circle r="11" fill="#fff" stroke="#d9d4ca" />
              <text y="4" textAnchor="middle" fontSize="11" fontWeight="700" fill="#555" fontFamily="system-ui">{n}</text>
            </g>
          ))}
        </svg>
      )
    case 'icon-final':
      return (
        <svg viewBox="0 0 260 200" className="block h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={`${gid}d`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#58cdb6" />
              <stop offset="1" stopColor="#1a6683" />
            </linearGradient>
            <pattern id={`${gid}g`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M10 0H0V10" fill="none" stroke="#e3e9ec" strokeWidth=".6" />
            </pattern>
          </defs>
          <rect width="260" height="200" fill={`url(#${gid}g)`} />
          <rect width="260" height="200" fill="#f7fafb" opacity=".6" />
          <g transform="translate(70 30)">
            <rect width="120" height="120" rx="30" fill={`url(#${gid}d)`} />
            <circle cx="83" cy="36" r="12" fill="#ffe7a8" />
            <path d="M20 70c9.5-9 19-9 28.5 0s19 9 28.5 0 16-8 24-4" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M20 92c9.5-9 19-9 28.5 0s19 9 28.5 0 16-8 24-4" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" opacity=".5" />
            <rect x="12" y="12" width="96" height="96" rx="20" fill="none" stroke="#ff7a59" strokeDasharray="3 3" opacity=".7" />
          </g>
          <text x="130" y="176" textAnchor="middle" fontSize="9" fill="#8a979b" fontFamily="system-ui">1024 × 1024 · 角丸 22.4%</text>
        </svg>
      )
    case 'sea':
      return (
        <svg viewBox="0 0 380 240" className="block h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={`${gid}s`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b3a78" />
              <stop offset=".45" stopColor="#d9708a" />
              <stop offset=".7" stopColor="#ffb36b" />
            </linearGradient>
            <linearGradient id={`${gid}w`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6a5a8e" />
              <stop offset="1" stopColor="#1f2348" />
            </linearGradient>
          </defs>
          <rect width="380" height="150" fill={`url(#${gid}s)`} />
          <circle cx="250" cy="140" r="26" fill="#ffd89a" />
          <rect y="140" width="380" height="100" fill={`url(#${gid}w)`} />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={250 - 30 + (i % 3) * 6 - i * 2} y={146 + i * 9} width={60 - i * 4 + (i % 2) * 10} height="2" rx="1" fill="#ffd89a" opacity={0.7 - i * 0.07} />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M${(i * 61) % 380} ${168 + i * 10}q8-3 16 0t16 0`} stroke="#c9b8e6" strokeWidth="1.2" fill="none" opacity=".45" />
          ))}
          <path d="M0 196 L150 168 L156 172 L0 214Z" fill="#141530" />
          <rect x="40" y="181" width="3" height="10" fill="#141530" />
          <path d="M80 70q4-3 8 0q4-3 8 0M110 54q3-2 6 0q3-2 6 0" stroke="#2a2550" strokeWidth="1.4" fill="none" />
        </svg>
      )
    case 'moon':
      return (
        <svg viewBox="0 0 300 200" className="block h-full w-full" aria-hidden>
          <defs>
            <radialGradient id={`${gid}m`} cx=".62" cy=".32" r=".7">
              <stop offset="0" stopColor="#2c3f73" />
              <stop offset="1" stopColor="#0b1026" />
            </radialGradient>
          </defs>
          <rect width="300" height="200" fill={`url(#${gid}m)`} />
          <circle cx="186" cy="64" r="34" fill="#ffe9b8" opacity=".14" />
          <circle cx="186" cy="64" r="22" fill="#fff4d6" />
          <circle cx="179" cy="58" r="4" fill="#efdcb0" />
          <circle cx="192" cy="72" r="3" fill="#efdcb0" />
          <rect y="150" width="300" height="50" fill="#0a1a33" />
          <rect x="176" y="154" width="20" height="2" rx="1" fill="#fff4d6" opacity=".7" />
          <rect x="170" y="162" width="32" height="2" rx="1" fill="#fff4d6" opacity=".4" />
          <path d="M0 150h60l6-14h10l4 14h220" fill="none" stroke="#050b1a" strokeWidth="6" />
          {[[30, 30], [60, 70], [250, 40], [120, 24], [270, 100], [90, 110]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="#fff" opacity=".7" />
          ))}
        </svg>
      )
    case 'bento':
      return (
        <svg viewBox="0 0 300 200" className="block h-full w-full" aria-hidden>
          <rect width="300" height="200" fill="#e9d9c3" />
          <rect x="40" y="26" width="220" height="150" rx="16" fill="#2b1d17" />
          <rect x="50" y="36" width="130" height="130" rx="10" fill="#fbf7ee" />
          <path d="M58 104c10-10 20-10 30 0s20 10 30 0 20-10 30 0 14 8 24 2" stroke="#1d2a1f" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M58 132c10-10 20-10 30 0s20 10 30 0 20-10 30 0 14 8 24 2" stroke="#1d2a1f" strokeWidth="9" fill="none" strokeLinecap="round" opacity=".85" />
          <circle cx="140" cy="62" r="11" fill="#e74a3b" />
          <rect x="188" y="36" width="62" height="62" rx="8" fill="#f5c84b" />
          <rect x="196" y="48" width="46" height="10" rx="5" fill="#fbe08a" />
          <rect x="196" y="66" width="46" height="10" rx="5" fill="#fbe08a" />
          <rect x="188" y="104" width="62" height="62" rx="8" fill="#5f9e45" />
          <circle cx="206" cy="124" r="9" fill="#7cc35a" />
          <circle cx="230" cy="146" r="10" fill="#d4573b" />
        </svg>
      )
    case 'screenshot':
    default:
      return (
        <svg viewBox="0 0 320 200" className="block h-full w-full" aria-hidden>
          <rect width="320" height="200" fill="#eef2f3" />
          <rect x="16" y="14" width="288" height="172" rx="10" fill="#fff" stroke="#d8e0e2" />
          <circle cx="30" cy="27" r="3.5" fill="#ff6b5c" />
          <circle cx="42" cy="27" r="3.5" fill="#ffc24d" />
          <circle cx="54" cy="27" r="3.5" fill="#33c46a" />
          <rect x="16" y="38" width="288" height="1" fill="#e4eaec" />
          <rect x="28" y="52" width="70" height="122" rx="6" fill="#12343a" />
          <rect x="36" y="62" width="40" height="4" rx="2" fill="#5fd1b9" />
          <rect x="36" y="74" width="50" height="4" rx="2" fill="#4c6c70" />
          <rect x="36" y="86" width="44" height="4" rx="2" fill="#4c6c70" />
          <rect x="110" y="52" width="180" height="56" rx="6" fill="#e9f4f1" />
          <TideCurve x={116} y={58} w={168} h={44} stroke="#2f9e8a" fill="rgba(47,158,138,.15)" />
          <rect x="110" y="118" width="120" height="6" rx="3" fill="#d5dde0" />
          <rect x="110" y="132" width="160" height="6" rx="3" fill="#e4eaec" />
          <rect x="110" y="146" width="90" height="6" rx="3" fill="#e4eaec" />
        </svg>
      )
  }
}
