# UI Showcase Catalog

いろいろな UI 要素 × デザインスタイル × フロントエンドライブラリを一覧できるカタログ。
各デモに **使用技術・デザインスタイル・そのまま使える依頼プロンプト・ソースコード** が付いています。

## 起動

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 型チェック + 本番ビルド
```

## 使い方

- 左サイドバーで **カテゴリ / デザインスタイル / 使用技術** で絞り込み、キーワード検索もできます。
- 各カードの **「プロンプトをコピー」** で、次のような依頼文がクリップボードに入ります。

  ```
  【3D Tilt Card】
  Motion の useMotionValue / useSpring で…(UIの具体的な説明)

  - 使用技術: Motion (npm: motion), Tailwind CSS (npm: tailwindcss)
  - デザインスタイル: Glassmorphism(半透明・backdrop-blur・…)
  - 参考実装: UI Showcase Catalog の src/demos/cards/TiltCard.tsx
  ```

- 拡大ボタン(またはコード)で詳細モーダルを開くと、プロンプト全文・`npm i` コマンド・ソースコード・技術解説が見られます。
  URL は `#<demo-id>` になるので、特定デモへのリンク共有もできます。
- `?solo=<demo-id>`(モーダル右上の ↗ ボタン)で、そのデモだけを全画面で表示する単体ページを開けます。
- 「技術」タブ: ライブラリごとの npm 名・用途・使いどころ。
- 「スタイル」タブ: デザインスタイル名とプロンプト用キーワード。

## 日本語 / English

上部の **日本語 / English** で切り替えられます。選択はブラウザに保存され、詳細モーダルと単体ページでも変更できます。英語で開くリンクには `?lang=en` を使います（例 `?lang=en#transition-directions`）。

Use **日本語 / English** at the top of the catalog, in the demo details, or on a full-screen demo. Choose **English prompts only** to find the 37 demos with English descriptions and prompts. The other demos include their original Japanese prompts.

## 使っている主なライブラリ

| 分野 | ライブラリ |
| --- | --- |
| 3D / WebGL | three, @react-three/fiber, @react-three/drei, GLSL |
| アニメーション | motion (旧 Framer Motion), gsap (ScrollTrigger / SplitText) |
| カルーセル | embla-carousel-react, swiper |
| パーティクル | @tsparticles/react + @tsparticles/slim, canvas-confetti |
| UI部品 | cmdk, sonner, vaul, recharts, lucide-react |
| レトロCSS | 98.css, xp.css, 7.css, nes.css |
| スタイリング | Tailwind CSS v4 |

## デザインの見本

- **アートディレクション**では、同じ展覧会の3案、アール・ヌーヴォーの招待状、ミッドセンチュリーの家具LP、サイケデリックのフェスポスター、Splineの3Dポスターを見られます。
- **日本語タイポグラフィ・組版**では、文芸誌、百貨店の催事広告、観光冊子を切り替えられます。**素材・光・表面加工**では、同じチケットで箔押し、空押し、紙の透けを比較できます。
- **モーションの演出比較**では、同じ画面の3つの遷移、Theatre.jsのブランドフィルム、Riveのポートレートを見られます。

コピー誌、字間と行間の活字見本、器の材質と刺繍の見本、ヒーローの登場順と変形するロゴも収録しています。

**エラー画面・復旧**では、紙の索引をモチーフにした404ページと、ブラウン管の放送中断をモチーフにした500ページを見られます。**公共端末・案内表示**では、券売機で切符を発券し、パタパタ式の出発案内の便や駅サインの方面を切り替えられます。

レトロ系には雑誌付録CD-ROM、お絵かきBBS、プリ帳、Y2Kプレイヤーの着せ替えを収録しています。「クリエイティブ・サウンド」ではMemphisのステッカー自販機と、Rough.jsの手描き商店街マップを試せます。

Splineは[公式のサンプルシーン](https://github.com/splinetool/react-spline#usage)を読み込み、取得できない場合はポインターで傾けられるSVGでポスターを表示します。Riveは[公式リポジトリのアバター素材](https://github.com/rive-app/rive-react/blob/main/examples/public/avatars.riv)とWASMを同じ配信元から読み込みます。[Rive素材のライセンス](src/demos/design/assets/rive-LICENSE.txt)

## 構成

```
src/
  App.tsx                 カタログのシェル(サイドバー・フィルタ・各ビュー)
  catalog/
    types.ts              DemoEntry / カテゴリ / 技術 / スタイルの型
    meta.ts               カテゴリ・技術・スタイルの説明データ
    registry.ts           全デモの集約 + ソースコードの遅延読み込み
    prompt.ts             コピー用プロンプト生成
    helpers.tsx           LazyMount / ShadowScope / ErrorBoundary
    DemoCard.tsx, DemoModal.tsx
  demos/
    backgrounds/ carousels/ cards/ interactive/ text/ layout/ retro/ styles/ design/ …
      XxxDemo.tsx         1ファイル = 1デモ
      index.ts            そのカテゴリの DemoEntry 一覧(説明・プロンプト・技術)
```

### 仕組みのポイント

- **遅延読み込み**: 各デモは `React.lazy` で登録されており、画面に入ったときに初めてコードを読み込む(three.js などの重いライブラリも必要になるまで読まない)。
- **LazyMount**: 画面に入ったデモだけマウント。WebGL デモ(`heavy: true`)は画面外でアンマウントし、ブラウザの WebGL コンテキスト上限を回避。
- **ShadowScope**: 98.css / XP.css / NES.css などは `button` や `input` をグローバルに上書きするため、Shadow DOM の中に閉じ込めて適用(`?inline` で CSS を文字列 import)。中は `color-scheme: light` に固定。
- **ソース表示**: `import.meta.glob('../demos/**/*', { query: '?raw' })` で各デモのコードを遅延ロード。

### 注意点

- 型チェックは `npm run typecheck`(= `tsc -p tsconfig.json --noEmit`)。TypeScript 7 の `tsc -b` はこの構成だとチェックをスキップすることがある。
- 98.css / XP.css に仕様上不正なセレクタがあるため、`vite.config.ts` で lightningcss の `errorRecovery` を有効にしている(該当ルールのみ捨てて警告を出す)。
- コンソールに出る `THREE.Clock ... deprecated` 警告は React Three Fiber 内部由来で、動作に影響はない。

## デモの追加方法

1. `src/demos/<category>/MyDemo.tsx` を作成(ルート要素は `relative h-full w-full overflow-hidden`)。
2. 同フォルダの `index.ts` にエントリを追加:

```ts
{
  id: 'my-demo',
  title: 'My Demo',
  description: '何をするUIか',
  category: 'card',
  styles: ['glass'],
  tech: ['react', 'motion', 'tailwind'],
  prompt: 'このUIを別プロジェクトで頼むときの依頼文…',
  file: 'cards/MyDemo.tsx',
  component: lazy(() => import('./MyDemo').then((m) => ({ default: m.MyDemo }))),
  height: 360,   // 任意
  wide: false,   // 任意: 2カラム幅
  heavy: false,  // 任意: WebGL など重いもの
}
```
