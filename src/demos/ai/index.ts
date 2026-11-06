import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const aiDemos: DemoEntry[] = [
  {
    id: 'ai-chat-streaming',
    title: 'AIチャット(ストリーミング)',
    description:
      '回答が1トークンずつ流れてくるAIチャット。Markdown(表・チェックリスト・コードブロック)を描画し、停止・再生成・コピー、上にスクロールすると自動追従を止める挙動まで再現。',
    category: 'ai',
    styles: ['dark', 'saas'],
    tech: ['react', 'markdown', 'motion', 'tailwind', 'lucide'],
    prompt:
      'ChatGPT風のAIチャット画面を作ってください。空の状態では挨拶と2×2の「質問候補」カードを表示し、クリックか入力欄から送信します。ユーザー発言は右寄せの紫の吹き出し、アシスタントは左にグラデーションのアバター付きで表示。回答は最初に3つのドットが跳ねる「考え中」インジケーターを出し、その後 setTimeout で2〜5文字ずつ追記してストリーミング風に表示します(本番では Vercel AI SDK の useChat や fetch の ReadableStream に置き換え)。本文は react-markdown + remark-gfm で描画し、表・タスクリスト・引用・インラインコードを Tailwind の任意セレクタ([&_table]: など)で整え、```コードブロックは components.pre を上書きして言語ラベルとコピーボタン付きのカードにします。生成中は送信ボタンが■停止ボタンに変わり、完了後はホバーで「コピー」「再生成」を表示。スクロール位置が下端から40px以上離れたら自動スクロールを止め、↓ボタンで最新へ戻れるようにします。ダーク(#0b0b10)に紫のぼかしグロー。',
    file: 'ai/AiChatStreaming.tsx',
    component: lazy(() => import('./AiChatStreaming').then((m) => ({ default: m.AiChatStreaming }))),
    height: 480,
    wide: true,
  },
  {
    id: 'voice-orb',
    title: 'ボイスアシスタント・オーブ',
    description:
      '音声に反応して輪郭が揺れる光の球。待機・聞き取り・発話の3状態を切り替え、マイクを許可すると実際の声の大きさで動く(拒否時は疑似波形)。',
    category: 'ai',
    styles: ['dark', 'aurora'],
    tech: ['react', 'canvas', 'webaudio', 'tailwind', 'lucide'],
    prompt:
      '音声アシスタントの「オーブ」UIを Canvas 2D で作ってください。中心に、シアン・紫・ピンクの3層のブロブを globalCompositeOperation = "lighter" で重ね、各層の輪郭は角度ごとに sin を足し合わせたノイズで半径を揺らします。揺れ幅は振幅 amp に比例し、amp は目標値へ毎フレーム 12% ずつ近づけて滑らかにします。状態は「待機(ゆっくり呼吸)」「聞き取り」「発話」の3つ。聞き取りボタンで navigator.mediaDevices.getUserMedia → AudioContext → AnalyserNode(fftSize 256)を作り、getByteFrequencyData の平均で振幅を決め、周囲に64本の放射状イコライザ線を描きます。許可が拒否されたら疑似振幅で続行し注意文を表示。発話ボタンでは字幕をタイプライター表示。ResizeObserver で devicePixelRatio 対応、アンマウント時に rAF とマイクトラックを停止してください。',
    file: 'ai/VoiceOrb.tsx',
    component: lazy(() => import('./VoiceOrb').then((m) => ({ default: m.VoiceOrb }))),
    height: 380,
  },
  {
    id: 'ai-prompt-box',
    title: '高機能プロンプト入力',
    description:
      '自動で伸びるテキストエリアに、添付ファイルチップ・モデル選択・Web検索トグル・「/」コマンドメニュー・文字数/トークン数表示。送信ボタンは生成中に停止ボタンへモーフ。',
    category: 'ai',
    styles: ['shadcn', 'minimal'],
    tech: ['react', 'motion', 'tailwind', 'lucide'],
    prompt:
      'AIアプリ用のプロンプト入力欄(コンポーザー)を作ってください。textarea は useLayoutEffect で height を 0 → scrollHeight に設定して内容に合わせて自動で伸ばし(最大132px)、Enter で送信・Shift+Enter で改行(IME変換中は送信しない: nativeEvent.isComposing)。入力が「/」で始まると上にコマンドメニューをポップアップし、↑↓で選択、Enter/Tab で挿入、Esc で閉じます。上部には添付ファイルのチップ(アイコン・ファイル名・サイズ・×ボタン)を Motion の AnimatePresence で出し入れ。下段にクリップ(添付)、Web検索トグル、モデル選択ドロップダウン(Pro/Fast/Vision)、右端に「文字数/上限 · 約Nトークン」と丸い送信ボタン。生成中は送信ボタンのアイコンが回転しながら■停止に切り替わり、上にシマー文字で「生成中…」を表示します。白基調の shadcn/ui 風、細いボーダーと大きめのソフトシャドウ。',
    file: 'ai/AiPromptBox.tsx',
    component: lazy(() => import('./AiPromptBox').then((m) => ({ default: m.AiPromptBox }))),
    height: 340,
  },
  {
    id: 'agent-steps-timeline',
    title: 'エージェント実行タイムライン',
    description:
      'AIエージェントの「考える→検索→ツール呼び出し→コード実行→回答」を縦のタイムラインで順に表示。思考中はシマー文字、各ステップは開閉でき、ツールの入出力JSONも見られる。',
    category: 'ai',
    styles: ['dark', 'terminal'],
    tech: ['react', 'motion', 'tailwind', 'lucide'],
    prompt:
      'AIエージェントの実行過程を見せるタイムラインUIを作ってください。ステップ配列(kind: think / search / tool / code / answer, 所要ms, 本文)を setTimeout で順番に追加し、実行中のステップはアイコンをスピナーに、完了したら所要時間と緑のチェックを表示します。思考ステップの実行中はタイトルを「考え中…」にし、linear-gradient を background-clip:text で流すシマー表現に。各ステップはクリックで開閉(Motion で height: 0 → auto)し、ツール呼び出しは input / output の JSON を等幅フォントの小さなコードカードで左右に並べます。左に縦線でつながる丸いアイコン、最後の「回答」はアクセントカラーの枠で強調。新しいステップが出るたびに自動スクロールし、最後に「完了 · 4ステップ · 5.6秒」のサマリーと「再実行」ボタン。ダーク基調。',
    file: 'ai/AgentStepsTimeline.tsx',
    component: lazy(() => import('./AgentStepsTimeline').then((m) => ({ default: m.AgentStepsTimeline }))),
    height: 440,
  },
  {
    id: 'ai-search-answer',
    title: 'AI検索の回答(出典付き)',
    description:
      'Perplexity 風のAI検索結果。情報源カードの列と、ストリーミングで現れる回答文中の引用番号。番号にホバーすると対応する出典カードが光り、関連する質問から次の検索へ進める。',
    category: 'ai',
    styles: ['minimal', 'editorial'],
    tech: ['react', 'motion', 'tailwind', 'lucide'],
    prompt:
      'AI検索エンジン(Perplexity風)の回答画面を作ってください。上に質問の見出し、その下に「情報源」として出典カード(タイトル2行・ファビコン代わりの色付き丸・ドメイン・番号)を4列で並べます。回答本文は「…です[1]。」のような文字列を正規表現で文字トークンと引用トークンに分割し、setTimeout で少しずつ表示するストリーミング表現に(最初はスケルトンの棒を表示)。引用トークンは小さな丸い番号チップとして描画し、ホバーすると同じ番号の出典カードがリング付きで強調・拡大、逆にカードにホバーしてもチップがハイライトされるよう hover 状態を共有します。回答が終わったら「関連する質問」のリストをフェードインし、クリックで別の質問に切り替えて再ストリーミング。生成り色の背景(#fbfaf7)、ティールのアクセント、読みやすい行間1.85。',
    file: 'ai/AiSearchAnswer.tsx',
    component: lazy(() => import('./AiSearchAnswer').then((m) => ({ default: m.AiSearchAnswer }))),
    height: 460,
  },
]
