import type { ReactNode } from 'react'

/**
 * Button Style Matrix
 * 17 種類のデザイン言語のボタンを、それぞれに合う背景タイルの上に並べた「ボタン CSS 図鑑」。
 * すべて素の CSS クラス (.bsm-*) で書いているので、欲しいスタイルの CSS をそのままコピーできる。
 * hover / active の状態変化もスタイルごとの作法に合わせている。
 */
const css = `
.bsm-btn { cursor:pointer; border:none; display:inline-flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; }

/* Minimal */
.bsm-minimal { height:36px; padding:0 16px; border-radius:8px; background:#0a0a0a; color:#fff; font:500 13px Inter,sans-serif; transition:background .15s, transform .15s; }
.bsm-minimal:hover { background:#262626; } .bsm-minimal:active { transform:scale(.97); }

/* Glassmorphism */
.bsm-glass { height:38px; padding:0 18px; border-radius:12px; color:#fff; font:600 13px Inter,sans-serif;
  background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.35); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
  box-shadow:0 8px 24px rgba(31,38,135,.35), inset 0 1px 0 rgba(255,255,255,.4); transition:background .2s, transform .15s; }
.bsm-glass:hover { background:rgba(255,255,255,.25); } .bsm-glass:active { transform:scale(.97); }

/* Neumorphism */
.bsm-neu { height:40px; padding:0 22px; border-radius:14px; background:#e0e5ec; color:#6c63ff; font:700 13px Inter,sans-serif;
  box-shadow:6px 6px 12px rgb(163 177 198 / .6), -6px -6px 12px rgb(255 255 255 / .6); transition:box-shadow .15s; }
.bsm-neu:active { box-shadow:inset 4px 4px 8px rgb(163 177 198 / .6), inset -4px -4px 8px rgb(255 255 255 / .5); }

/* Neo-Brutalism */
.bsm-brutal { height:40px; padding:0 18px; background:#ff90e8; color:#000; border:3px solid #000; border-radius:6px; box-shadow:4px 4px 0 #000;
  font:700 14px 'Space Grotesk',sans-serif; transition:transform .1s, box-shadow .1s; }
.bsm-brutal:hover { transform:translate(-2px,-2px); box-shadow:6px 6px 0 #000; }
.bsm-brutal:active { transform:translate(4px,4px); box-shadow:0 0 0 #000; }

/* Claymorphism */
.bsm-clay { height:42px; padding:0 24px; border-radius:999px; background:#a78bfa; color:#fff; font:800 13px Inter,sans-serif; text-shadow:0 1px 2px rgba(91,33,182,.4);
  box-shadow:0 10px 20px -6px rgba(139,92,246,.55), inset -5px -5px 10px rgba(91,33,182,.45), inset 5px 5px 10px rgba(255,255,255,.6);
  transition:transform .25s cubic-bezier(.34,1.56,.64,1); }
.bsm-clay:hover { transform:scale(1.06); } .bsm-clay:active { transform:scale(.9); }

/* Skeuomorphism (gel) */
.bsm-skeuo { height:36px; padding:0 20px; border-radius:9px; color:#fff; font:700 13px Inter,sans-serif; text-shadow:0 -1px 0 rgba(0,0,0,.45);
  border:1px solid #13509a; background:linear-gradient(180deg,#8cc8ff 0%,#3d8fe0 50%,#1f6fcc 51%,#3a8ee6 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 2px 3px rgba(0,0,0,.45); }
.bsm-skeuo:hover { filter:brightness(1.06); }
.bsm-skeuo:active { background:linear-gradient(180deg,#2a72c4 0%,#1f63b3 50%,#1a5aa5 51%,#2c78cf 100%); box-shadow:inset 0 2px 6px rgba(0,0,0,.5); }

/* Material 3 (filled + state layer) */
.bsm-material { position:relative; overflow:hidden; height:40px; padding:0 24px; border-radius:20px; background:#6750a4; color:#fff;
  font:500 14px Roboto,Inter,sans-serif; letter-spacing:.1px; transition:box-shadow .2s; }
.bsm-material::after { content:''; position:absolute; inset:0; background:#fff; opacity:0; transition:opacity .15s; }
.bsm-material:hover { box-shadow:0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15); }
.bsm-material:hover::after { opacity:.08; } .bsm-material:active::after { opacity:.16; }

/* Dark Tech */
.bsm-dark { height:32px; padding:0 8px 0 14px; border-radius:8px; background:#f7f8f8; color:#08090a; font:500 13px Inter,sans-serif;
  box-shadow:0 0 0 1px rgba(255,255,255,.1), 0 4px 12px rgba(0,0,0,.4); transition:box-shadow .2s, background .2s; }
.bsm-dark:hover { background:#fff; box-shadow:0 0 0 4px rgba(94,106,210,.35), 0 4px 16px rgba(94,106,210,.35); }
.bsm-dark kbd { font:500 10px 'JetBrains Mono',monospace; color:#62666d; border:1px solid #d8d8d8; border-radius:4px; padding:1px 4px; }

/* Cyberpunk */
.bsm-cyber-wrap { filter:drop-shadow(0 0 8px rgba(252,238,10,.55)); }
.bsm-cyber { height:40px; padding:0 22px; background:#fcee0a; color:#000; font:700 12px Orbitron,sans-serif; letter-spacing:.14em; text-transform:uppercase;
  clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px)); transition:background .15s; }
.bsm-cyber:hover { background:#00f0ff; animation:bsm-jitter .25s steps(2) 1; }
@keyframes bsm-jitter { 0%{transform:translate(0)} 25%{transform:translate(-2px,1px)} 50%{transform:translate(2px,-1px)} 75%{transform:translate(-1px,0)} 100%{transform:translate(0)} }

/* Swiss */
.bsm-swiss { height:40px; padding:0 16px; gap:18px; background:#e30613; color:#fff; font:700 12px 'Helvetica Neue',Helvetica,Inter,sans-serif;
  letter-spacing:.1em; text-transform:uppercase; transition:background .15s; }
.bsm-swiss span { transition:transform .15s; } .bsm-swiss:hover { background:#111; } .bsm-swiss:hover span { transform:translateX(4px); }

/* Editorial */
.bsm-editorial { height:36px; padding:0 20px; background:#1a1a1a; color:#faf7f0; font:600 10px Inter,sans-serif; letter-spacing:.24em; text-transform:uppercase; transition:background .2s; }
.bsm-editorial:hover { background:#9b2c2c; }

/* Y2K (aqua gel) */
.bsm-y2k { position:relative; overflow:hidden; height:38px; padding:0 22px; border-radius:999px; color:#fff; font:700 13px Inter,sans-serif;
  text-shadow:0 1px 1px rgba(0,40,120,.5); border:1px solid #0b5bd3;
  background:linear-gradient(180deg,#a8e1ff 0%,#3aa0ff 50%,#1477ff 51%,#6cc4ff 100%);
  box-shadow:0 4px 10px rgba(20,119,255,.45), inset 0 -2px 6px rgba(255,255,255,.45); transition:filter .15s; }
.bsm-y2k::before { content:''; position:absolute; left:8%; right:8%; top:2px; height:45%; border-radius:999px; background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.15)); }
.bsm-y2k span { position:relative; } .bsm-y2k:hover { filter:brightness(1.1) saturate(1.1); } .bsm-y2k:active { filter:brightness(.92); }

/* Aurora */
.bsm-aurora { height:40px; padding:0 22px; border-radius:12px; color:#04111d; font:700 13px Inter,sans-serif;
  background:linear-gradient(90deg,#34d399,#22d3ee,#a78bfa,#f472b6); background-size:200% 100%; background-position:0 0;
  box-shadow:0 8px 24px -6px rgba(167,139,250,.75); transition:background-position .5s, transform .15s; }
.bsm-aurora:hover { background-position:100% 0; } .bsm-aurora:active { transform:scale(.97); }

/* Windows 98 */
.bsm-98 { min-width:75px; height:23px; padding:0 12px; background:#c0c0c0; color:#000; font:11px Tahoma,'MS Sans Serif',sans-serif;
  box-shadow:inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf; }
.bsm-98:active { box-shadow:inset -1px -1px #ffffff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px #808080; padding:2px 11px 0 13px; }
.bsm-98:focus-visible { outline:1px dotted #000; outline-offset:-4px; }

/* Windows XP */
.bsm-xp { min-width:75px; height:23px; padding:0 12px; color:#000; font:11px Tahoma,'Segoe UI',sans-serif; border:1px solid #003c74; border-radius:3px;
  background:linear-gradient(180deg,#ffffff 0%,#ecebe6 86%,#d6d0c5 100%); }
.bsm-xp:hover { box-shadow:inset -1px 1px #fff0cf, inset 1px 2px #fdd889, inset -2px 2px #fbc761, inset 2px -2px #e5a01a; }
.bsm-xp:active { background:linear-gradient(180deg,#cdcac3 0%,#e3e3db 8%,#e5e5de 94%,#f2f2f1 100%); }

/* 8bit Pixel (shadow で角を欠いたドット枠) */
.bsm-pixel { height:36px; margin:4px; padding:0 16px; background:#209cee; color:#fff; font:10px 'Press Start 2P',monospace;
  box-shadow:0 -4px 0 #000, 0 4px 0 #000, -4px 0 0 #000, 4px 0 0 #000, inset -4px -4px 0 #006bb3; }
.bsm-pixel:hover { background:#108de0; }
.bsm-pixel:active { box-shadow:0 -4px 0 #000, 0 4px 0 #000, -4px 0 0 #000, 4px 0 0 #000, inset 4px 4px 0 #006bb3; }

/* Terminal */
.bsm-term { height:32px; padding:0 12px; background:transparent; color:#33ff66; font:20px VT323,monospace; text-shadow:0 0 6px rgba(51,255,102,.8);
  border:1px solid #33ff66; box-shadow:0 0 8px rgba(51,255,102,.35), inset 0 0 8px rgba(51,255,102,.2); }
.bsm-term:hover { background:#33ff66; color:#001a07; text-shadow:none; }
.bsm-term .cur { animation:bsm-blink 1s steps(1) infinite; } @keyframes bsm-blink { 50% { opacity:0 } }
`

interface Tile {
  name: string
  bg: string
  label: string
  button: ReactNode
}

const TILES: Tile[] = [
  { name: 'Minimal', bg: '#fafafa', label: '#737373', button: <button className="bsm-btn bsm-minimal">Continue</button> },
  {
    name: 'Glassmorphism',
    bg: 'radial-gradient(circle at 20% 30%, #ec4899 0, transparent 45%), radial-gradient(circle at 80% 75%, #06b6d4 0, transparent 45%), linear-gradient(135deg,#312e81,#1e1b4b)',
    label: 'rgba(255,255,255,.7)',
    button: <button className="bsm-btn bsm-glass">Get started</button>,
  },
  { name: 'Neumorphism', bg: '#e0e5ec', label: '#8b93a7', button: <button className="bsm-btn bsm-neu">Press me</button> },
  {
    name: 'Neo-Brutalism',
    bg: 'radial-gradient(rgba(0,0,0,.18) 1.2px, transparent 1.2px) 0 0 / 14px 14px, #ffde59',
    label: '#000',
    button: <button className="bsm-btn bsm-brutal">Click me!</button>,
  },
  { name: 'Claymorphism', bg: 'linear-gradient(135deg,#ffe4f1,#e6e0ff)', label: '#8f84b5', button: <button className="bsm-btn bsm-clay">Squish</button> },
  {
    name: 'Skeuomorphism',
    bg: 'repeating-linear-gradient(0deg, rgba(255,255,255,0) 0 1px, rgba(255,255,255,.35) 1px 2px), linear-gradient(180deg,#f0f0f0,#c9c9c9)',
    label: '#4d4d4d',
    button: <button className="bsm-btn bsm-skeuo">Download</button>,
  },
  { name: 'Material 3', bg: '#fef7ff', label: '#49454f', button: <button className="bsm-btn bsm-material">Follow</button> },
  {
    name: 'Dark Tech',
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(94,106,210,.4), transparent 70%), #08090a',
    label: '#8a8f98',
    button: (
      <button className="bsm-btn bsm-dark">
        Deploy <kbd>⌘↵</kbd>
      </button>
    ),
  },
  {
    name: 'Cyberpunk',
    bg: 'linear-gradient(rgba(0,240,255,.08) 1px, transparent 1px) 0 0 / 18px 18px, linear-gradient(90deg, rgba(255,42,109,.08) 1px, transparent 1px) 0 0 / 18px 18px, #07070d',
    label: '#ff2a6d',
    button: (
      <span className="bsm-cyber-wrap">
        <button className="bsm-btn bsm-cyber">Jack in</button>
      </span>
    ),
  },
  {
    name: 'Swiss',
    bg: 'linear-gradient(#111,#111) 0 100% / 50% 6px no-repeat, #ffffff',
    label: '#111',
    button: (
      <button className="bsm-btn bsm-swiss">
        Start <span>→</span>
      </button>
    ),
  },
  { name: 'Editorial', bg: '#faf7f0', label: '#9b2c2c', button: <button className="bsm-btn bsm-editorial">Subscribe</button> },
  {
    name: 'Y2K',
    bg: 'linear-gradient(120deg,#ffd6ff,#c8b6ff,#b8e0ff,#bbf7d0,#fff1b8)',
    label: '#5b4bb7',
    button: (
      <button className="bsm-btn bsm-y2k">
        <span>★ Enter ★</span>
      </button>
    ),
  },
  {
    name: 'Aurora',
    bg: 'radial-gradient(ellipse at 20% 20%, rgba(52,211,153,.45), transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(167,139,250,.45), transparent 55%), #050816',
    label: '#94a3b8',
    button: <button className="bsm-btn bsm-aurora">Explore</button>,
  },
  { name: 'Windows 98', bg: '#008080', label: 'rgba(255,255,255,.8)', button: <button className="bsm-btn bsm-98">OK</button> },
  {
    name: 'Windows XP',
    bg: 'linear-gradient(180deg,#3a74d9 0%,#8cb8f2 60%,#5f9f3a 61%,#3e7f22 100%)',
    label: 'rgba(255,255,255,.9)',
    button: <button className="bsm-btn bsm-xp">OK</button>,
  },
  { name: '8bit Pixel', bg: '#f4f4f4', label: '#212529', button: <button className="bsm-btn bsm-pixel">START</button> },
  {
    name: 'Terminal',
    bg: 'repeating-linear-gradient(0deg, rgba(0,0,0,.3) 0 1px, transparent 1px 3px), #020a04',
    label: '#1f9e45',
    button: (
      <button className="bsm-btn bsm-term">
        &gt; RUN<span className="cur">_</span>
      </button>
    ),
  },
]

export function ButtonStyleMatrix() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0c0c0f]">
      <style>{css}</style>
      <div className="h-full overflow-y-auto p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {TILES.map((tile) => (
            <div
              key={tile.name}
              className="relative flex h-[104px] items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/5"
              style={{ background: tile.bg }}
            >
              <span className="absolute left-2.5 top-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: tile.label }}>
                {tile.name}
              </span>
              <div className="mt-3">{tile.button}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
