# Hello VSCode Dioxus Extension

VSCode拡張機能とDioxus WebAssemblyを組み合わせた開発プロジェクトです。

## 機能

- Dioxus製のWebUIをVSCodeのエディタエリアに表示
- 名前を入力してボタンをクリックすると、VSCodeの通知として「Hello, [名前]!」が表示される

## 必要なツール

- [pixi](https://pixi.sh/) - パッケージマネージャー

## セットアップ

1. pixi環境のインストール:
```bash
pixi install
```

2. dioxus-cliのインストール:
```bash
pixi run setup
```

3. npm依存関係のインストール:
```bash
pixi run npm install
```

## 開発方法

### 方法1: Dioxusのホットリロード開発

Dioxus UIを単独で開発・確認する場合:

```bash
pixi run dev-dioxus
```

ブラウザで `http://localhost:8080` を開いて確認できます。

### 方法2: VSCode拡張機能として実行

1. Dioxusアプリをビルド:
```bash
pixi run build-dioxus
```

2. VSCodeで `F5` を押してデバッグ実行

3. 新しいVSCodeウィンドウが開いたら、コマンドパレット (`Cmd+Shift+P`) を開き、「Show Hello Dioxus Panel」を実行

## プロジェクト構造

```
.
├── pixi.toml              # Pixi環境設定
├── package.json           # Node.js依存関係
├── tsconfig.json          # TypeScript設定
├── src/
│   └── extension.ts       # VSCode拡張機能のメインコード
├── dioxus-app/
│   ├── Cargo.toml         # Rust依存関係
│   ├── Dioxus.toml        # Dioxus設定
│   └── src/
│       └── main.rs        # DioxusアプリのUIコード
└── .vscode/
    ├── launch.json        # デバッグ設定
    └── tasks.json         # ビルドタスク
```

## ビルドコマンド

- `pixi run dev-dioxus` - Dioxusのホットリロード開発サーバー起動
- `pixi run build-dioxus` - Dioxusアプリをリリースビルド
- `pixi run dev-vscode` - TypeScriptのウォッチモード
- `pixi run vscode-debug` - VSCode拡張機能をコンパイル

## トラブルシューティング

### Dioxusアプリが表示されない

1. まず `pixi run build-dioxus` を実行してビルドしてください
2. `dioxus-app/dist/` ディレクトリにファイルが生成されているか確認してください

### 依存関係エラー

```bash
pixi install
pixi run setup
npm install
```

を順番に実行してください。
