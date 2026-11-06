import { useId } from 'react'
import Particles, { ParticlesProvider } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { Engine, ISourceOptions } from '@tsparticles/engine'

/**
 * 線でつながるパーティクルネットワーク (tsParticles v4)
 * - ParticlesProvider の init で slim バンドル(links / grab / push 等)を登録
 *   ※ init はアプリ全体で同一の関数である必要があるのでモジュールレベルに定義
 * - fullScreen: false にして親要素サイズのキャンバスにする
 * - ホバーで grab(マウスに線が伸びる)、クリックで push(粒子追加)
 */

const initParticles = async (engine: Engine) => {
  await loadSlim(engine)
}

// options はレンダーごとに作り直すと再初期化されるので定数にする
const OPTIONS: ISourceOptions = {
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  detectRetina: true,
  particles: {
    number: { value: 70, density: { enable: true, width: 900, height: 900 } },
    paint: { color: { value: ['#7dd3fc', '#a5b4fc', '#c4b5fd'] } },
    opacity: { value: { min: 0.4, max: 0.9 } },
    size: { value: { min: 1, max: 3 } },
    links: { enable: true, distance: 130, color: '#8ea2ff', opacity: 0.35, width: 1 },
    move: { enable: true, speed: 0.9, outModes: { default: 'bounce' } },
  },
  interactivity: {
    events: {
      onHover: { enable: true, mode: 'grab' },
      onClick: { enable: true, mode: 'push' },
    },
    modes: {
      grab: { distance: 170, links: { opacity: 0.8 } },
      push: { quantity: 4 },
    },
  },
}

export function ParticleNetwork() {
  const id = `tsparticles-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,#1e2a5a_0%,#0b1020_60%)]">
      <ParticlesProvider init={initParticles}>
        <Particles id={id} options={OPTIONS} className="absolute inset-0" />
      </ParticlesProvider>
      <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
        <div>
          <div className="text-[11px] font-medium tracking-[0.3em] text-sky-300/80 uppercase">Network</div>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-white">Everything, connected.</h3>
          <p className="mt-2 text-sm text-slate-400">ホバーで線がマウスに伸び、クリックで粒子が増えます</p>
        </div>
      </div>
    </div>
  )
}
