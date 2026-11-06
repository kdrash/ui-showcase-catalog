import type { DemoEntry } from './types'
import { backgroundDemos } from '../demos/backgrounds'
import { carouselDemos } from '../demos/carousels'
import { cardDemos } from '../demos/cards'
import { interactiveDemos } from '../demos/interactive'
import { textDemos } from '../demos/text'
import { layoutDemos } from '../demos/layout'
import { retroDemos } from '../demos/retro'
import { styleDemos } from '../demos/styles'
// 第2弾
import { sceneDemos } from '../demos/scene'
import { effectDemos } from '../demos/effects'
import { scrollDemos } from '../demos/scroll'
import { appDemos } from '../demos/app'
import { formDemos } from '../demos/forms'
import { navDemos } from '../demos/nav'
import { feedbackDemos } from '../demos/feedback'
import { recoveryDemos } from '../demos/recovery'
import { publicTerminalDemos } from '../demos/public-terminal'
import { mobileDemos } from '../demos/mobile'
import { aiDemos } from '../demos/ai'
import { chartDemos } from '../demos/charts'
import { landingDemos } from '../demos/landing'
import { commerceDemos } from '../demos/commerce'
import { creativeDemos } from '../demos/creative'
import { designDemos } from '../demos/design'

export const DEMOS: DemoEntry[] = [
  ...backgroundDemos,
  ...carouselDemos,
  ...cardDemos,
  ...interactiveDemos,
  ...textDemos,
  ...layoutDemos,
  ...retroDemos,
  ...styleDemos,
  ...sceneDemos,
  ...effectDemos,
  ...scrollDemos,
  ...appDemos,
  ...formDemos,
  ...navDemos,
  ...feedbackDemos,
  ...recoveryDemos,
  ...publicTerminalDemos,
  ...mobileDemos,
  ...aiDemos,
  ...chartDemos,
  ...landingDemos,
  ...commerceDemos,
  ...creativeDemos,
  ...designDemos,
]

/** デモのソースコード(?raw)を遅延ロード */
const sources = import.meta.glob('../demos/**/*.{ts,tsx,css}', { query: '?raw', import: 'default' })

export async function loadSource(file: string): Promise<string> {
  const loader = sources[`../demos/${file}`]
  if (!loader) return `// source not found: src/demos/${file}`
  return (await loader()) as string
}
