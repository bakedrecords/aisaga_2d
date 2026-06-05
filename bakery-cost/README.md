# パン屋 原価計算アプリ（bakery-cost）

パン屋向けの原価計算ツール。仕入れた材料の単価をもとに、生地（ベーカーズ%）・
フィリング・商品の原価を積み上げ、商品1個あたりの **原価・原価率・粗利** を算出します。

- 完全クライアントサイド（バックエンド・DB・ログインなし）
- データは **お使いのブラウザ内（localStorage）にのみ** 保存されます
- **JSONファイルへの書き出し／読み込み** でバックアップ・端末間移行ができます

> 計算の流れ: ① 仕入れ → ② 生地 → ③ フィリング → ④ 商品 → ⑤ 一覧比較

## 開発

```bash
npm install      # 依存をインストール
npm run dev      # 開発サーバを起動
npm test         # 計算ロジック・入出力のユニットテスト
npm run build    # dist/ を生成（静的サイト）
npm run preview  # 本番ビルドをローカル確認
```

Node 18 以上。依存は `react` / `react-dom` のみ（dev に `vite` / `@vitejs/plugin-react` / `vitest`）。

## ディレクトリ

```
src/
├── main.jsx              エントリポイント
├── App.jsx               レイアウト＋タブ＋データ管理UI
├── App.smoke.test.jsx    各画面が描画できることのスモークテスト
├── index.css             全スタイル（CSS変数でテーマ管理）
├── components/
│   ├── NumInput.jsx      数値入力（小数入力に対応した小さな部品）
│   └── RefSelect.jsx     参照select（削除済み参照は「(不明な材料)」表示）
├── lib/
│   ├── calc.js           原価計算（純粋関数, テスト対象）
│   ├── calc.test.js
│   ├── units.js          単位定義・換算
│   ├── storage.js        localStorage 読み書き
│   ├── io.js             JSON エクスポート/インポート
│   ├── io.test.js
│   ├── id.js             一意ID生成
│   └── seed.js           初回サンプルデータ
├── context/
│   └── DataContext.jsx   全データの状態管理＋CRUD＋自動保存
└── pages/
    ├── Ingredients.jsx   ① 仕入れ
    ├── DoughRecipes.jsx  ② 生地
    ├── Fillings.jsx      ③ フィリング
    ├── Products.jsx      ④ 商品
    └── Comparison.jsx    ⑤ 一覧比較
```

## プライバシー

入力したデータはサーバーには送信されず、お使いのブラウザ内にのみ保存されます。
ブラウザのデータを消すと失われるため、定期的に「書き出し」でバックアップしてください。
