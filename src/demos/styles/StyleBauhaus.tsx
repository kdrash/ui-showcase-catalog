import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * Bauhaus
 * 赤・青・黄の三原色 + 黒 + 生成り。円・三角・四分円だけで構成し、角丸や影は使わない。
 * 文字は太いジオメトリック・サンセリフの小文字(バウハウスの“universal”書体の思想)。
 * コントロールも図形:トグル=円が四角の中を移動、スライダー=三角のつまみ、ボタン=半円/四角。
 */
const R = '#d62828'
const B = '#1d4e9e'
const Y = '#f4b400'
const K = '#111111'
const CREAM = '#f2ead3'

export function StyleBauhaus() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(58)
  const [following, setFollowing] = useState(false)

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: CREAM, fontFamily: '"Space Grotesk", "Futura", Inter, sans-serif', color: K }}>
      {/* composition */}
      <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full" style={{ background: R }} />
      <div className="absolute left-[18%] top-0 h-full w-3" style={{ background: K }} />
      <div className="absolute bottom-0 right-0 h-40 w-40 rounded-tl-full" style={{ background: B }} />
      <div className="absolute bottom-6 left-6 h-0 w-0" style={{ borderLeft: '46px solid transparent', borderRight: '46px solid transparent', borderBottom: `80px solid ${Y}` }} />
      <div className="absolute right-[8%] top-[10%] h-16 w-16 border-[10px]" style={{ borderColor: K }} />
      <p className="absolute right-4 top-1/2 origin-right -translate-y-1/2 rotate-90 text-[11px] font-bold tracking-[0.4em]">bauhaus · 1919</p>

      <div className="absolute left-1/2 top-1/2 w-[300px] -translate-x-1/2 -translate-y-1/2 bg-white" style={{ boxShadow: `0 0 0 4px ${K}` }}>
        <div className="grid grid-cols-[88px_1fr]">
          <div className="relative h-[88px] overflow-hidden" style={{ background: Y }}>
            <div className="absolute bottom-0 left-0 h-[88px] w-[88px] rounded-tr-full" style={{ background: B }} />
            <div className="absolute right-3 top-3 h-7 w-7 rounded-full" style={{ background: R }} />
          </div>
          <div className="flex flex-col justify-center border-l-4 border-black px-3">
            <p className="text-[26px] font-bold lowercase leading-[0.9] tracking-[-0.04em]">mika sato</p>
            <p className="mt-1 text-[11px] font-bold lowercase tracking-[0.2em]">product designer</p>
          </div>
        </div>

        <div className="grid grid-cols-3 border-y-4 border-black">
          {[
            ['128', 'posts', R],
            ['2.4k', 'fans', Y],
            ['312', 'follow', B],
          ].map(([v, l, c], i) => (
            <div key={l} className={`flex items-center gap-2 px-2 py-2 ${i < 2 ? 'border-r-4 border-black' : ''}`}>
              <span className={`h-3.5 w-3.5 shrink-0 ${i === 0 ? 'rounded-full' : ''}`} style={i === 1 ? { width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: `13px solid ${c}` } : { background: c }} />
              <div>
                <p className="text-[17px] font-bold leading-none">{v}</p>
                <p className="text-[10px] font-bold lowercase">{l}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold lowercase tracking-wide">notifications</span>
            <button role="switch" aria-checked={notify} aria-label="Notifications" onClick={() => setNotify((v) => !v)} className="relative h-7 w-14 border-[3px] border-black bg-white">
              <motion.span
                className="absolute top-[3px] h-4 w-4 rounded-full"
                animate={{ left: notify ? 30 : 4, backgroundColor: notify ? R : K }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          <div className="relative h-6">
            <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
            <div className="absolute inset-x-0 top-2 h-[4px] bg-black" />
            <div className="absolute left-0 top-[6px] h-[6px]" style={{ width: `${volume}%`, background: B }} />
            <div
              className="absolute top-[10px] h-0 w-0"
              style={{ left: `calc(${volume}% - ${volume * 0.18}px)`, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: `14px solid ${R}` }}
            />
          </div>

          <input
            placeholder="write a status"
            className="h-9 w-full border-b-4 border-black bg-transparent px-1 text-[14px] font-bold lowercase outline-none placeholder:text-black/35 focus:border-[#d62828]"
          />

          <div className="grid grid-cols-2 gap-0">
            <button
              onClick={() => setFollowing((f) => !f)}
              className="h-11 text-[14px] font-bold lowercase text-white transition-colors"
              style={{ background: following ? K : R, borderRadius: '22px 0 0 22px' }}
            >
              {following ? '● following' : 'follow'}
            </button>
            <button className="h-11 border-[3px] border-l-0 border-black text-[14px] font-bold lowercase transition-colors hover:bg-[#f4b400]">message ▲</button>
          </div>
        </div>
      </div>
    </div>
  )
}
