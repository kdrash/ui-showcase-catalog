import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const publicTerminalDemos: DemoEntry[] = [
  {
    id: 'station-ticket-machine',
    title: 'East Bay Line — 駅の券売機',
    description: '行き先と運賃を選ぶと、濃い色の取り出し口から紙のきっぷがせり出す。',
    category: 'public-terminal',
    styles: ['wayfinding', 'skeuo', 'paper'],
    tech: ['react', 'motion', 'tailwind', 'lucide', 'css'],
    prompt: '架空の鉄道の券売機を作ってください。生成りの筐体に、駅番号と運賃を載せた3つの押しボタン、深緑の案内表示、オレンジの発券ボタンを置く。行き先を選んで発券すると、印字された紙のきっぷが暗い取り出し口からせり出し、クリックやキーボードで受け取れる。発券中と受け取り前は内容を固定し、動きを減らす設定ではきっぷの位置を即座に切り替える。',
    file: 'public-terminal/StationTicketMachine.tsx',
    component: lazy(() => import('./StationTicketMachine').then((m) => ({ default: m.StationTicketMachine }))),
    height: 455,
  },
  {
    id: 'split-flap-departures',
    title: 'Skyline Airport — パタパタ式の出発案内',
    description: '昔の空港を思わせる反転フラップ式の出発案内。次の便を表示すると、上下に分かれた札が順に回る。',
    category: 'public-terminal',
    styles: ['wayfinding', 'skeuo'],
    tech: ['react', 'motion', 'tailwind', 'lucide', 'css'],
    prompt: '機械式の空港出発案内板を作ってください。黒い札に等幅文字で時刻・便名・行き先・搭乗口を表示し、上下の札に分ける。次の便を表示すると古い上半分が中央の軸に向かって倒れ、新しい下半分が開く。行と列で開始時刻をずらす。読み上げ用に表の文字を残し、動きを減らす設定では即座に切り替える。',
    file: 'public-terminal/SplitFlapDepartures.tsx',
    component: lazy(() => import('./SplitFlapDepartures').then((m) => ({ default: m.SplitFlapDepartures }))),
    height: 325,
  },
]
