import Atropos from 'atropos/react'
import 'atropos/atropos.css'
import { art } from '../_shared/art'

const SKY = art('landscape', 0, 600, 800)
const GRAD = art('gradient', 5, 600, 800)

/** Atropos の多層パララックス 3D チルトカード(data-atropos-offset で奥行きを付ける) */
export function AtroposParallaxCard() {
  return (
    <div className="relative flex h-full w-full items-center justify-center gap-6 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#312e81,#0b0b14_70%)] p-6">
      {/* ポスター */}
      <Atropos className="h-[86%] max-h-[340px] w-[min(42%,240px)]" shadowScale={0.9} activeOffset={40} rotateXMax={12} rotateYMax={12}>
        <div className="relative h-full w-full overflow-hidden rounded-2xl">
          <img src={SKY} alt="" className="absolute -inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] max-w-none object-cover" data-atropos-offset="-6" />
          <div className="absolute inset-x-0 top-6 text-center" data-atropos-offset="2">
            <div className="text-[10px] tracking-[0.4em] text-white/70 uppercase">Expedition</div>
            <div className="font-['Playfair_Display'] text-3xl font-black text-white italic drop-shadow-lg">Dusk Ridge</div>
          </div>
          <div className="absolute right-3 bottom-16 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-indigo-900 shadow-lg" data-atropos-offset="8">
            2,180m ▲
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white" data-atropos-offset="4">
            <div className="text-[11px] opacity-80">Nov 2026 · 3 days</div>
            <div className="text-sm font-semibold">夕暮れの稜線を歩く</div>
          </div>
        </div>
      </Atropos>
      {/* チケット */}
      <Atropos className="h-[86%] max-h-[340px] w-[min(42%,240px)]" shadowScale={0.9} activeOffset={40} highlight>
        <div className="relative h-full w-full overflow-hidden rounded-2xl bg-zinc-950">
          <img src={GRAD} alt="" className="absolute -inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] max-w-none object-cover opacity-90" data-atropos-offset="-5" />
          <div className="absolute inset-3 rounded-xl border border-white/40" data-atropos-offset="1" />
          <div className="absolute inset-0 flex flex-col justify-between p-5 text-white" data-atropos-offset="5">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-widest uppercase">
              <span>Admit one</span>
              <span>No. 0427</span>
            </div>
            <div>
              <div className="font-['Space_Grotesk'] text-4xl leading-none font-bold tracking-tighter">SYNTH
                <br />
                WAVE
              </div>
              <div className="mt-2 text-xs opacity-80">Live at Zepp · 19:00</div>
            </div>
          </div>
          <div
            className="absolute right-5 bottom-5 grid h-14 w-14 place-items-center rounded-full bg-white text-[10px] font-black text-fuchsia-700 shadow-2xl"
            data-atropos-offset="12"
          >
            VIP
          </div>
        </div>
      </Atropos>
    </div>
  )
}
