# Hello VSCode Dioxus Extension

VSCode拡張機能とDioxus WebAssemblyを組み合わせた開発プロジェクトです。

## 機能

- **Dioxus製のWebUI**: Rust + WebAssemblyで構築されたモダンなUIをVSCodeのエディタエリアに表示
- **インタラクティブな通知**: 名前を入力してボタンをクリックすると、VSCodeの通知として「Hello, [名前]!」が表示されます
- **リアルタイム更新**: 入力フィールドとボタンのクリックイベントがリアルタイムで動作

## 必要なツール

- [pixi](https://pixi.sh/) - パッケージマネージャー

## セットアップ

1. **pixi環境のインストール**:
```bash
pixi install
```

2. **dioxus-cliと依存関係のインストール**:
```bash
pixi run setup
```

3. **npm依存関係のインストール**:
```bash
pixi run npm install
```

4. **Dioxusアプリの初回ビルド**:
```bash
pixi run build-dioxus
```

## 開発ワークフロー

### 推奨: ウォッチモード開発

2つのターミナルを開いて同時に実行:

**ターミナル1**: TypeScript自動コンパイル
```bash
npm run watch
```

**ターミナル2**: Dioxus自動ビルド
```bash
pixi run dioxus-watch
```

**使い方**:
1. VS Codeで `F5` を押してデバッグセッション開始
2. コマンドパレット (`Cmd+Shift+P`) → `Hello VSCode Dioxus: Show Hello` 実行
3. コードを変更すると自動でビルド
4. WebViewパネルを閉じて再度開くと変更が反映

### 代替: 手動ビルド開発

1. **Dioxusコードを変更**
2. **ビルド実行**:
```bash
pixi run build-dioxus
```
3. **WebViewパネルを再読込**: パネルを閉じて再度 `Hello VSCode Dioxus: Show Hello` を実行

### スタンドアロン開発

Dioxus UIを単独で開発・確認する場合（VSCode拡張機能なしでブラウザで確認）:

```bash
pixi run dev-dioxus
```

ブラウザで `http://localhost:8080` を開いて確認できます。
**注意**: VSCode APIは利用できないため、通知機能は動作しません。

## 利用可能なコマンド

### セットアップ
- `pixi install` - pixi環境の初期化
- `pixi run setup` - dioxus-cliとWASMターゲットのインストール
- `pixi run npm install` - Node.js依存関係のインストール

### ビルド
- `pixi run build-dioxus` - Dioxusアプリのリリースビルド + dist/へコピー
- `pixi run npm run compile` - TypeScript拡張機能のコンパイル

### 開発
- `npm run watch` - TypeScriptウォッチモード（変更を自動コンパイル）
- `pixi run dioxus-watch` - Dioxus自動ビルドループ
- `pixi run dev-dioxus` - Dioxusスタンドアロン開発サーバー

## プロジェクト構造

```
.
├── pixi.toml              # Pixi環境設定（Rust, Node.js）
├── package.json           # Node.js依存関係・VS Code拡張メタデータ
├── tsconfig.json          # TypeScript設定
├── src/
│   └── extension.ts       # VS Code拡張機能のメインコード（WebView管理）
├── dioxus-app/
│   ├── Cargo.toml         # Rust依存関係（Dioxus 0.7.1）
│   ├── Dioxus.toml        # Dioxus設定（WebAssemblyビルド設定）
│   ├── src/
│   │   └── main.rs        # DioxusアプリのUIコード（入力フィールド・ボタン）
│   └── dist/              # ビルド成果物（WebViewで読み込まれる）
│       ├── index.html
│       └── assets/        # JS・WASMファイル
└── .vscode/
    ├── launch.json        # F5デバッグ設定
    └── tasks.json         # ビルドタスク
```

## 技術スタック

- **VS Code Extension**: TypeScript 5.6.3, VS Code API 1.95.0
- **UI Framework**: Dioxus 0.7.1 (Rust)
- **Build Tools**: pixi (Rust 1.85+, Node.js 22.11.0), dioxus-cli 0.7.1
- **Runtime**: WebAssembly (wasm32-unknown-unknown)

## トラブルシューティング

### WebViewパネルが空白

1. Dioxusアプリがビルドされているか確認:
```bash
pixi run build-dioxus
```

2. `dioxus-app/dist/` ディレクトリにファイルが生成されているか確認:
```bash
ls -la dioxus-app/dist/
```

### 通知が表示されない

- WebView DevToolsを開いてエラーを確認: 
  コマンドパレット → `Developer: Open Webview Developer Tools`
- ボタンをクリックしても反応がない場合、`dioxus-app/src/main.rs`の`send_to_vscode()`関数を確認

### 依存関係エラー

すべての依存関係を再インストール:
```bash
pixi install
pixi run setup
pixi run npm install
```

### Rustバージョンエラー

Dioxus 0.7.1はRust 1.85以上が必要です。pixiが自動的に正しいバージョンをインストールします:
```bash
pixi run cargo --version  # 1.85以上であることを確認
```
