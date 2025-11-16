import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('Hello VSCode Dioxus extension is now active!');

    const disposable = vscode.commands.registerCommand('hello-vscode-dioxus.showHello', () => {
        HelloPanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

class HelloPanel {
    public static currentPanel: HelloPanel | undefined;
    private static readonly viewType = 'helloDioxus';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (HelloPanel.currentPanel) {
            HelloPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            HelloPanel.viewType,
            'Hello Dioxus',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dioxus-app', 'dist')]
            }
        );

        HelloPanel.currentPanel = new HelloPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'showNotification':
                        vscode.window.showInformationMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        HelloPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Hello Dioxus';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Dioxusのビルド成果物のパス
        const distPath = vscode.Uri.joinPath(this._extensionUri, 'dioxus-app', 'dist');
        const indexPath = vscode.Uri.joinPath(distPath, 'index.html');

        // index.htmlが存在する場合はそれを読み込む
        if (fs.existsSync(indexPath.fsPath)) {
            let html = fs.readFileSync(indexPath.fsPath, 'utf8');
            
            // WebView用のURIを取得
            const distUri = webview.asWebviewUri(distPath);
            const assetsUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'assets'));
            
            // まずJSファイルのパスを見つける（置き換え前）
            const jsMatch = html.match(/src="\/\.\/assets\/([^"]+\.js)"/);
            if (jsMatch) {
                const jsFileName = jsMatch[1];
                const jsPath = vscode.Uri.joinPath(distPath, 'assets', jsFileName);
                
                if (fs.existsSync(jsPath.fsPath)) {
                    // JSファイルの内容を読み込む
                    let jsContent = fs.readFileSync(jsPath.fsPath, 'utf8');
                    
                    // JSファイル内のWASMパスを置き換え
                    jsContent = jsContent.replace(
                        /module_or_path:"\/\.\/assets\/([^"]+\.wasm)"/g,
                        `module_or_path:"${assetsUri}/$1"`
                    );
                    
                    // 元のscriptタグとlinkタグを削除し、インラインJSに置き換え
                    html = html.replace(
                        /<link[^>]*href="\/\.\/assets\/[^"]+\.js"[^>]*>/g,
                        ''
                    );
                    html = html.replace(
                        /<script[^>]*src="\/\.\/assets\/[^"]+\.js"[^>]*><\/script>/g,
                        `<script type="module">${jsContent}</script>`
                    );
                }
            }
            
            // 残りのパスを完全なWebView URIに置き換え
            html = html.replace(/href="\/\.\//g, `href="${distUri}/`);
            html = html.replace(/src="\/\.\//g, `src="${distUri}/`);
            
            // デバッグ情報を追加
            const debugInfo = `
<div style="position: fixed; bottom: 10px; left: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; font-size: 12px; max-width: 400px; z-index: 9999;">
    <strong>Debug Info:</strong><br>
    Dist URI: ${distUri}<br>
    Index exists: ${fs.existsSync(indexPath.fsPath)}<br>
</div>`;
            
            // CSPを緩和（デバッグ用）
            const cspSource = webview.cspSource;
            const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; img-src ${cspSource} https: data:; font-src ${cspSource}; connect-src ${cspSource};">`;
            html = html.replace(/<meta charset="UTF-8">/, `<meta charset="UTF-8">\n    ${csp}`);
            html = html.replace('</body>', `${debugInfo}</body>`);
            
            return html;
        }

        // フォールバック: Dioxusアプリがまだビルドされていない場合
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello Dioxus</title>
</head>
<body>
    <div style="padding: 20px; text-align: center;">
        <h1>Dioxus App Not Built</h1>
        <p>Please build the Dioxus application first:</p>
        <pre>pixi run build-dioxus</pre>
    </div>
</body>
</html>`;
    }
}
