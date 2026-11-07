/**
 * カタログ全体の「動き」設定。OS の「動きを減らす」設定(prefers-reduced-motion)に従うか、
 * どちらかに固定するかを選べるようにする。
 *
 * - デモは Motion の useReducedMotion や matchMedia でこの設定を読むため、ページ読み込みの最初に
 *   window.matchMedia を差し替え、prefers-reduced-motion の問い合わせにだけ選んだ値を返す
 *   (このモジュールは main.tsx で最初に import する。Motion などは初回の問い合わせ結果を覚えるので、切り替えたら再読み込みする)
 * - CSS 側は <html data-motion="full|reduce|system"> を見る。Tailwind の motion-safe: / motion-reduce: は index.css で
 *   この属性にも従うよう定義し直し、デモ内の生の @media も同じ属性で上書きしている
 * - 選んだ値は localStorage に保存。?motion=full|reduce|system を付けた URL はその値を優先し、保存もする
 */

export type MotionMode = 'system' | 'full' | 'reduce'

const KEY = 'ui-showcase-motion'
const isMode = (v: unknown): v is MotionMode => v === 'system' || v === 'full' || v === 'reduce'

const nativeMatchMedia = window.matchMedia.bind(window)

/** OS(ブラウザ)本来の設定で「動きを減らす」になっているか */
export const systemPrefersReduced = () => nativeMatchMedia('(prefers-reduced-motion: reduce)').matches

function initialMode(): MotionMode {
  const fromUrl = new URLSearchParams(location.search).get('motion')
  if (isMode(fromUrl)) {
    save(fromUrl)
    return fromUrl
  }
  try {
    const saved = localStorage.getItem(KEY)
    if (isMode(saved)) return saved
  } catch {
    // ストレージが使えない環境では OS の設定に従う
  }
  return 'system'
}

function save(mode: MotionMode) {
  try {
    if (mode === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, mode)
  } catch {
    // 保存できなくても今回の表示には反映する
  }
}

export const motionMode: MotionMode = initialMode()

/** 実際にデモへ伝わる値(OS に従う場合は OS の設定) */
export const effectiveReduced = motionMode === 'system' ? systemPrefersReduced() : motionMode === 'reduce'

document.documentElement.dataset.motion = motionMode

if (motionMode !== 'system') {
  window.matchMedia = (query: string): MediaQueryList => {
    const list = nativeMatchMedia(query)
    if (!/prefers-reduced-motion/.test(query)) return list
    // "(prefers-reduced-motion)" と "(prefers-reduced-motion: reduce)" は「減らす」、": no-preference" は「減らさない」を問う
    const matches = /no-preference/.test(query) ? motionMode === 'full' : motionMode === 'reduce'
    return new Proxy(list, {
      get(target, key) {
        if (key === 'matches') return matches
        const value = Reflect.get(target, key, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  }
}

/** 設定を変えて再読み込みする(Motion などが覚えている初回の値を確実に入れ替えるため) */
export function selectMotionMode(mode: MotionMode) {
  if (mode === motionMode) return
  save(mode)
  const url = new URL(location.href)
  url.searchParams.delete('motion')
  // URL が同じ(#付きなど)だと replace では再読み込みされないので reload を使う
  if (url.href === location.href) location.reload()
  else location.replace(url.href)
}
