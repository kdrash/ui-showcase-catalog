import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const recoveryDemos: DemoEntry[] = [
  {
    id: 'missing-archive-404',
    title: 'Missing Archive — 404 ページが見つかりません',
    description: '紙の索引から一枚が抜け落ちたような404画面。破線の「0」を囲む朱色の捜索線と、見出し、戻り先をひとつの紙面に収める。',
    category: 'recovery',
    styles: ['editorial', 'paper', 'swiss'],
    tech: ['react', 'motion', 'tailwind', 'lucide', 'svg'],
    prompt: '紙の索引をモチーフにした404ページを作ってください。生成りの紙面に太い2つの「4」をSVGで描き、「0」の部分は朱色の破線と見当線で空ける。その内側を回る捜索線をMotionで一度描画し、右の数字にMISSINGの印を重ねる。「ページが見つかりません」という見出し、短い理由、ホームに戻るリンクを下段にまとめる。狭い画面ではリンクを見出しの下に配置する。',
    file: 'recovery/MissingArchive404.tsx',
    component: lazy(() => import('./MissingArchive404').then((m) => ({ default: m.MissingArchive404 }))),
    height: 420,
  },
  {
    id: 'signal-lost-500',
    title: 'Signal Room — 500 サーバーエラー',
    description: '放送が途切れたブラウン管をモチーフにした500画面。再試行すると走査線が流れ、カラーバーが風景に切り替わる。',
    category: 'recovery',
    styles: ['skeuo', 'dark'],
    tech: ['react', 'motion', 'tailwind', 'lucide', 'css', 'svg'],
    prompt: '放送モニターをモチーフにした500サーバーエラー画面を作ってください。丸いブラウン管の中にくすんだカラーバーと走査線を重ね、脇にエラーの説明、再試行、ホームへのリンクを置く。再試行をシミュレーションし、確認中は光の帯が画面を流れ、復旧したらSVGの風景と接続完了メッセージを表示する。動きを減らす設定では光の帯を止め、再び500に戻せるようにする。',
    file: 'recovery/SignalLost500.tsx',
    component: lazy(() => import('./SignalLost500').then((m) => ({ default: m.SignalLost500 }))),
    height: 440,
  },
]
