# VS Code + Dioxus Webview 拡張 - 動作確認手順

## 修正内容（問題対応）

1. **CSP（Content Security Policy）追加**: Webview で localhost の iframe を許可するよう `frame-src` を追加しました。
2. **`acquireVsCodeApi()` のキャッシュ**: VS Code API は1度しか取得できないため、ブリッジ JS でキャッシュするよう修正しました。
3. **iframe とメッセージ転送の整理**: iframe → wrapper → extension の通信パスを明確化しました。

## 動作確認手順

### 1. Dioxus 開発サーバーの起動（手動起動推奨）

ワークスペースルートで以下を実行してください：

\`\`\`bash
pixi run dioxus-serve
\`\`\`

または直接：

\`\`\`bash
cd dioxus_app
dx serve --platform web --port 8080
\`\`\`

サーバーが起動したら http://127.0.0.1:8080 でアクセスできることを確認してください。

### 2. 拡張の実行

1. このワークスペースを VS Code で開く
2. `F5` を押して Extension Development Host を起動
3. 開発ホストで `Cmd+Shift+P` → `Dioxus: Open Webview` を実行
4. Webview が開き、Dioxus アプリが表示されます
5. "Say hello" セクションで名前を入力して「Say Hello」ボタンをクリック
6. VS Code 右下に `hello <入力した名前>` の通知が表示されます

### トラブルシューティング

- **Webview が空白**: Output パネル（View → Output）で「Dioxus Serve」チャンネルを確認してサーバーログを見てください。
- **ボタンを押しても反応しない**: ブラウザの開発者ツール（Webview 内で右クリック → Inspect）でコンソールエラーを確認してください。ブリッジ JS がロードされているか確認します。
- **拡張が起動しない**: `vscode-extension/out` フォルダが存在し、`extension.js` が生成されているか確認してください（`npm run build` を実行）。

### 自動サーバー起動について

拡張は自動で `pixi run dioxus-serve` を試みますが、環境によっては失敗する可能性があります。その場合は上記手動起動を使ってください。
