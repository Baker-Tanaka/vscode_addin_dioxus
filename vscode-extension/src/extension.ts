import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.openDioxusWebview', async () => {
    const port = 8080; // should match pixi task

    // ensure dev server is running (try to start it if not)
    await ensureDevServerRunning(port, context);
    const panel = vscode.window.createWebviewPanel(
      'dioxusWebview',
      'Dioxus Webview',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getWebviewContent(port);

    panel.webview.onDidReceiveMessage(message => {
      console.log('[extension] Received message from webview:', message);
      if (message && message.type === 'hello') {
        const name = message.name || '';
        console.log('[extension] Showing notification for:', name);
        vscode.window.showInformationMessage('hello ' + name);
      }
    });
  });

  const helloOpenCommand = vscode.commands.registerCommand('extension.helloOpen', async () => {
    const port = 8080;
    await ensureDevServerRunning(port, context);
    const panel = vscode.window.createWebviewPanel(
      'dioxusWebview',
      'Hello Dioxus',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getWebviewContent(port);

    panel.webview.onDidReceiveMessage(message => {
      console.log('[extension] Received message from webview:', message);
      if (message && message.type === 'hello') {
        const name = message.name || '';
        console.log('[extension] Showing notification for:', name);
        vscode.window.showInformationMessage('hello ' + name);
      }
    });
  });

  context.subscriptions.push(disposable, helloOpenCommand);
}

export function deactivate() {}

let spawnedProcess: ChildProcess | null = null;

async function ensureDevServerRunning(port: number, context: vscode.ExtensionContext) {
  const isOpen = await checkPortOpen(port, '127.0.0.1');
  if (isOpen) {
    return;
  }

  const output = vscode.window.createOutputChannel('Dioxus Serve');
  output.show(true);

  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;

  // prefer pixi if available, else fallback to dx
  const tryCommands = [] as Array<{ cmd: string; args: string[]; cwd?: string }>;
  if (workspaceRoot) {
    tryCommands.push({ cmd: 'pixi', args: ['run', 'dioxus-serve'], cwd: workspaceRoot });
    tryCommands.push({ cmd: 'dx', args: ['serve', '--platform', 'web', '--port', String(port)], cwd: path.join(workspaceRoot, 'dioxus_app') });
  } else {
    tryCommands.push({ cmd: 'dx', args: ['serve', '--platform', 'web', '--port', String(port)], cwd: undefined });
  }

  for (const t of tryCommands) {
    try {
      output.appendLine(`Starting dev server: ${t.cmd} ${t.args.join(' ')} (cwd=${t.cwd || '.'})`);
      const child = spawn(t.cmd, t.args, { cwd: t.cwd, shell: true });
      spawnedProcess = child;

      child.stdout?.on('data', (d) => output.appendLine(d.toString()));
      child.stderr?.on('data', (d) => output.appendLine(d.toString()));
      child.on('exit', (code, sig) => output.appendLine(`Dev server exited: code=${code} sig=${sig}`));

      // wait up to 10s for port to open
      const ok = await waitForPort(port, 10000);
      if (ok) {
        output.appendLine('Dev server is up');
        // register dispose to kill process on deactivate
        context.subscriptions.push({ dispose: () => { try { spawnedProcess?.kill(); } catch(e) {} } });
        return;
      } else {
        output.appendLine('Dev server did not open port in time, trying next command...');
        try { child.kill(); } catch(e) {}
        spawnedProcess = null;
      }
    } catch (e: any) {
      output.appendLine(`Failed to start ${t.cmd}: ${e?.message || e}`);
    }
  }

  vscode.window.showWarningMessage('Unable to start Dioxus dev server automatically. Please start it manually: `pixi run dioxus-serve` or `dx serve --platform web --port 8080`.');
}

function checkPortOpen(port: number, host: string, timeout = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let called = false;
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      called = true;
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      if (!called) { called = true; socket.destroy(); resolve(false); }
    });
    socket.on('error', () => { if (!called) { called = true; socket.destroy(); resolve(false); } });
    socket.connect(port, host);
  });
}

function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    (function poll() {
      checkPortOpen(port, '127.0.0.1', 500).then((open) => {
        if (open) return resolve(true);
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(poll, 300);
      });
    })();
  });
}

function getWebviewContent(port: number) {
  const iframeSrc = `http://localhost:${port}`;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://localhost:${port} http://127.0.0.1:${port}; script-src 'unsafe-inline'; style-src 'unsafe-inline';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body, iframe { height: 100%; margin: 0; padding: 0; }
      iframe { width: 100%; border: none; }
    </style>
  </head>
  <body>
    <iframe id="dioxus-frame" src="${iframeSrc}"></iframe>
    <script>
      const vscode = acquireVsCodeApi();
      console.log('[webview-wrapper] vscode API acquired');

      // forward messages from iframe (dioxus) to the extension
      window.addEventListener('message', (event) => {
        console.log('[webview-wrapper] Received message from iframe:', event.data, 'origin:', event.origin);
        const msg = event.data;
        try {
          if (msg && msg.type === 'hello') {
            console.log('[webview-wrapper] Forwarding hello message to extension:', msg);
            vscode.postMessage(msg);
          }
        } catch (e) {
          console.error('[webview-wrapper] Error forwarding message:', e);
        }
      });

      // Also, forward messages from extension to iframe if needed
      window.addEventListener('messagefromextension', (e) => {
        const iframe = document.getElementById('dioxus-frame');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(e.detail, '*');
        }
      });
    </script>
  </body>
</html>`;
}
