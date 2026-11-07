# UI Showcase Catalog

触って試せるUIデザイン集。レトロな画面、ゲームUI、タイポグラフィ、モーションなどの作例を、実際に操作しながら比べられます。

An interactive catalog of UI patterns and visual styles, from retro interfaces to typography and motion.

**[デモを開く / Live demo](https://ui-showcase-catalog.kdrash.workers.dev/)** · [English](#english) · [MIT License](LICENSE)

## 代表デモ / Featured demos

| Demo | 見どころ |
| --- | --- |
| [Y2K Chrome Media Player](https://ui-showcase-catalog.kdrash.workers.dev/#y2k-media-player) | クロームの筐体、ジェルボタン、回せるボリュームノブ。 |
| [Heisei Personal Homepage](https://ui-showcase-catalog.kdrash.workers.dev/#heisei-homepage) | キリ番カウンターや書き込める掲示板で、平成の個人サイトを再現。 |
| [Memphis — プロフィールカード](https://ui-showcase-catalog.kdrash.workers.dev/#style-memphis) | 原色の幾何学模様と、形が変わるトグルやスライダー。 |

## 使い方

- カテゴリ、デザインスタイル、使用技術で絞り込めます。名前やキーワードでの検索もできます。
- デモの詳細を開くと、ソースコード、使用ライブラリ、再現用プロンプトが見られます。詳細のURLで共有でき、右上の ↗ からデモ単体を全画面で開けます。
- カタログ上部の **JA / EN** で表示言語を切り替えられます。英語表示では **English prompts only** で英訳のあるデモを探せます。
- **デモの動き** から **OSに従う / フル演出 / 減らす** を選べます。選択はブラウザに保存され、再読み込みで反映されます。共有リンクでは `?motion=full` や `?motion=reduce` で指定できます。

## ローカルで起動

Node.js 22.20以降を推奨します。

```bash
git clone https://github.com/kdrash/ui-showcase-catalog.git
cd ui-showcase-catalog
npm ci
npm run dev
```

ターミナルに表示されるローカルURLを開きます（既定は `http://localhost:5173`）。型チェックと本番用ビルドは `npm run build` で実行できます。

## English

Explore live demos of retro interfaces, game UI, typography, and motion. Filter the catalog by category, design style, or library. Open a demo to try it, inspect its source code, and copy a prompt for recreating it.

**[Open the catalog in English](https://ui-showcase-catalog.kdrash.workers.dev/?lang=en)**

The catalog interface is available in Japanese and English. Select **English prompts only** to find demos with translated descriptions and prompts. **Demo motion** lets you follow your system setting, enable full motion, or reduce motion.

### Run locally

Node.js 22.20 or later is recommended.

```bash
git clone https://github.com/kdrash/ui-showcase-catalog.git
cd ui-showcase-catalog
npm ci
npm run dev
```

Open the local URL shown in the terminal (usually `http://localhost:5173`). Run `npm run build` to type-check the project and create a production build.

## ライセンス / License

このプロジェクトのコードとドキュメントは [MITライセンス](LICENSE) で公開しています。サードパーティの素材とライブラリには、それぞれのライセンスが適用されます。

The project's original code and documentation are licensed under the [MIT License](LICENSE). Third-party assets and libraries retain their own licenses.

- [Riveのアバター素材 / Rive avatar assets](src/demos/design/assets/rive-LICENSE.txt)
- [Helvetikerフォント / Helvetiker font](src/demos/scene/fonts/helvetiker-LICENSE.txt)
- [GitHubアイコン / Primer Octicons](https://github.com/primer/octicons/blob/main/LICENSE)

<details>
<summary>実装とデモの追加方法 / Development notes</summary>

カタログは React、TypeScript、Vite、Tailwind CSS で構成しています。作例ごとに Motion、GSAP、Three.js、Rough.js、98.css などを使用しています。

- [`src/App.tsx`](src/App.tsx) にカタログの画面と絞り込み、[`src/catalog/`](src/catalog/) に分類、言語設定、プロンプト生成などがあります。
- [`src/demos/`](src/demos/) 以下のカテゴリにデモコンポーネントを作り、同じフォルダの `index.ts` に `DemoEntry` を追加します。登録例は [3D Tilt Card](src/demos/cards/index.ts) を参照してください。
- デモとそのソース表示は遅延読み込みします。負荷の高いWebGLデモは画面外でマウントを解除し、98.cssなどのレトロCSSはShadow DOMに閉じ込めています。
- 型チェックだけを行う場合は `npm run typecheck` を使います。ビルド時には98.cssやXP.cssの一部のCSSルールについて警告が出ます。
- Splineの作例は[公式サンプルシーン](https://github.com/splinetool/react-spline#usage)を読み込みます。シーンを取得できない場合はSVGのポスターを表示します。

</details>
