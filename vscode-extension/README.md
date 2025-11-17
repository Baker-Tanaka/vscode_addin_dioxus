# Dioxus Webview VS Code Extension

This extension shows the `dioxus_app` dev server inside a VS Code Webview and forwards a simple `hello <name>` message from the web UI to VS Code notifications.

## Dev setup

1. Install dependencies and build the extension:

```bash
cd vscode-extension
npm install
npm run build
```

2. Start the dioxus dev server (use pixi if you prefer):

```bash
# from workspace root (recommended)
pixi run dioxus-serve

# or directly:
cd dioxus_app
dx serve --platform web --port 8080
```

3. Open this workspace in VS Code, run the `Run Extension` debug configuration (F5), then run the command `Dioxus: Open Webview` (Command Palette) in the Extension Development Host.

4. In the Dioxus page, type a name and click "Say Hello" — you should see `hello <name>` as a VS Code notification.
