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
                if (message.command === 'showNotification') {
                    vscode.window.showInformationMessage(message.text);
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
        const distPath = vscode.Uri.joinPath(this._extensionUri, 'dioxus-app', 'dist');
        const indexPath = vscode.Uri.joinPath(distPath, 'index.html');

        if (!fs.existsSync(indexPath.fsPath)) {
            return this._getNotBuiltHtml();
        }

        let html = fs.readFileSync(indexPath.fsPath, 'utf8');
        const assetsUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'assets'));

        // デバッグ: assetsUriをログ出力
        console.log('Assets URI:', assetsUri.toString());

        // JSファイルを見つけてWASMパスを書き換え
        const jsMatch = html.match(/src="\/\.\/assets\/([^"]+\.js)"/);
        if (jsMatch) {
            const jsFileName = jsMatch[1];
            const jsPath = vscode.Uri.joinPath(distPath, 'assets', jsFileName);
            
            console.log('JS file found:', jsFileName);
            console.log('JS path:', jsPath.fsPath);
            
            if (fs.existsSync(jsPath.fsPath)) {
                let jsContent = fs.readFileSync(jsPath.fsPath, 'utf8');
                
                console.log('JS file loaded, size:', jsContent.length);
                
                // WASMパスをWebView URIに書き換え
                const originalWasmPath = jsContent.match(/module_or_path:"\/\.\/assets\/([^"]+\.wasm)"/);
                if (originalWasmPath) {
                    console.log('Original WASM path:', originalWasmPath[0]);
                }
                
                jsContent = jsContent.replace(
                    /module_or_path:"\/\.\/assets\/([^"]+\.wasm)"/g,
                    `module_or_path:"${assetsUri}/$1"`
                );
                
                const newWasmPath = jsContent.match(/module_or_path:"[^"]+\.wasm"/);
                if (newWasmPath) {
                    console.log('New WASM path:', newWasmPath[0]);
                }
                
                // デバッグ用: WASMファイルの存在確認とパスをHTMLに埋め込む
                const wasmMatch = jsContent.match(/module_or_path:"([^"]+\.wasm)"/);
                if (wasmMatch && wasmMatch[1]) {
                    const wasmFullPath = wasmMatch[1];
                    const wasmFileName = wasmFullPath.split('/').pop();
                    if (wasmFileName) {
                        const wasmFilePath = vscode.Uri.joinPath(distPath, 'assets', wasmFileName);
                        const wasmExists = fs.existsSync(wasmFilePath.fsPath);
                        const wasmSize = wasmExists ? fs.statSync(wasmFilePath.fsPath).size : 0;
                        
                        console.log('WASM file check:', {
                            fileName: wasmFileName,
                            exists: wasmExists,
                            size: wasmSize,
                            expectedPath: wasmFilePath.fsPath,
                            webviewUri: wasmFullPath
                        });
                        
                        // デバッグ情報をコンソールに出力（JSコンテンツの先頭に追加）
                        const debugScript = `\nconsole.log('%cWASM Debug Info:', 'color: #4ade80; font-weight: bold;');
console.log('WASM URI:', '${wasmFullPath}');
console.log('WASM exists on disk:', ${wasmExists});
console.log('WASM size:', ${wasmSize}, 'bytes');
console.log('Assets URI:', '${assetsUri}');\n`;
                        jsContent = debugScript + jsContent;
                    }
                }
                
                // JSをインライン化（linkとscriptタグを削除）
                html = html.replace(/<link[^>]*href="\/\.\/assets\/[^"]+"[^>]*>/g, '');
                html = html.replace(
                    /<script[^>]*src="\/\.\/assets\/[^"]+"[^>]*><\/script>/g,
                    `<script type="module">${jsContent}</script>`
                );
                
                console.log('JS inlined successfully');
            } else {
                console.error('JS file not found:', jsPath.fsPath);
            }
        } else {
            console.error('JS file pattern not matched in HTML');
        }

        // CSP設定
        const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline' 'wasm-unsafe-eval'; img-src ${webview.cspSource} data:;">`;
        html = html.replace(/<meta charset="UTF-8">/, `<meta charset="UTF-8">\n    ${csp}`);
        
        // エラー表示用のスクリプトを追加
        const errorHandler = `
<script>
window.addEventListener('error', (e) => {
    const errorDiv = document.getElementById('error-display') || createErrorDisplay();
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'padding: 8px; margin: 4px 0; background: #3d1a1a; border-left: 3px solid #ff6b6b; font-size: 12px; font-family: "SF Mono", Monaco, monospace; white-space: pre-wrap; word-break: break-all; color: #ffcccc; line-height: 1.4;';
    errorMsg.textContent = \`[\${new Date().toLocaleTimeString()}] ERROR: \${e.message}\\nFile: \${e.filename}:\${e.lineno}:\${e.colno}\`;
    errorDiv.appendChild(errorMsg);
    errorDiv.scrollTop = errorDiv.scrollHeight;
    console.error('Caught error:', e);
});

window.addEventListener('unhandledrejection', (e) => {
    const errorDiv = document.getElementById('error-display') || createErrorDisplay();
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'padding: 8px; margin: 4px 0; background: #3d2a1a; border-left: 3px solid #ffb86b; font-size: 12px; font-family: "SF Mono", Monaco, monospace; white-space: pre-wrap; word-break: break-all; color: #ffd699; line-height: 1.4;';
    const reason = e.reason?.stack || e.reason?.message || e.reason || 'Unknown';
    errorMsg.textContent = \`[\${new Date().toLocaleTimeString()}] PROMISE REJECTED:\\n\${reason}\`;
    errorDiv.appendChild(errorMsg);
    errorDiv.scrollTop = errorDiv.scrollHeight;
    console.error('Caught promise rejection:', e.reason);
});

function createErrorDisplay() {
    const div = document.createElement('div');
    div.id = 'error-display';
    div.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; max-height: 250px; overflow-y: auto; background: #1a1a1a; color: #e0e0e0; padding: 12px; font-family: "SF Mono", Monaco, monospace; font-size: 12px; z-index: 10000; border-top: 2px solid #ff6b6b; box-shadow: 0 -2px 10px rgba(0,0,0,0.5);';
    
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #333;';
    
    const title = document.createElement('div');
    title.style.cssText = 'font-weight: bold; color: #ff6b6b; font-size: 13px;';
    title.textContent = '🐛 Error Console';
    
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = 'background: #2a2a2a; color: #e0e0e0; border: 1px solid #444; padding: 4px 12px; border-radius: 3px; cursor: pointer; font-size: 11px;';
    clearBtn.onclick = () => {
        const msgs = div.querySelectorAll('div[style*="padding: 8px"]');
        msgs.forEach(msg => msg.remove());
    };
    
    header.appendChild(title);
    header.appendChild(clearBtn);
    div.appendChild(header);
    
    document.body.appendChild(div);
    return div;
}

console.log('%c✅ Error handler initialized', 'color: #4ade80; font-weight: bold;');
</script>`;
        
        html = html.replace('</body>', `${errorHandler}</body>`);
        
        return html;
    }

    private _getNotBuiltHtml(): string {
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
