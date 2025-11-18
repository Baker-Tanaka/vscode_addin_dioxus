import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import * as path from 'path';

const PORT = 8080;
let spawnedProcess: ChildProcess | null = null;

export function activate(context: vscode.ExtensionContext) {
  const createWebviewCommand = (title: string) => async () => {
    await ensureDevServerRunning(PORT, context);
    const panel = vscode.window.createWebviewPanel(
      'dioxusWebview',
      title,
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    panel.webview.html = getWebviewContent(PORT);
    panel.webview.onDidReceiveMessage(handleMessage);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.openDioxusWebview', createWebviewCommand('Dioxus Webview')),
    vscode.commands.registerCommand('extension.helloOpen', createWebviewCommand('Hello Dioxus'))
  );
}

export function deactivate() {
  spawnedProcess?.kill();
}

function handleMessage(message: any) {
  if (message?.type === 'hello') {
    vscode.window.showInformationMessage(`hello ${message.name || ''}`);
  }
}

async function ensureDevServerRunning(port: number, context: vscode.ExtensionContext) {
  if (await checkPortOpen(port, '127.0.0.1')) return;

  const output = vscode.window.createOutputChannel('Dioxus Serve');
  output.show(true);

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const commands: Array<{ cmd: string; args: string[]; cwd?: string }> = workspaceRoot
    ? [
      { cmd: 'pixi', args: ['run', 'dioxus-serve'], cwd: workspaceRoot },
      { cmd: 'dx', args: ['serve', '--platform', 'web', '--port', String(port)], cwd: path.join(workspaceRoot, 'dioxus_app') }
    ]
    : [{ cmd: 'dx', args: ['serve', '--platform', 'web', '--port', String(port)] }];

  for (const config of commands) {
    const { cmd, args, cwd } = config;
    try {
      output.appendLine(`Starting: ${cmd} ${args.join(' ')} ${cwd ? `(cwd=${cwd})` : ''}`);
      const child = spawn(cmd, args, { cwd, shell: true });
      spawnedProcess = child;

      child.stdout?.on('data', (d) => output.append(d.toString()));
      child.stderr?.on('data', (d) => output.append(d.toString()));

      if (await waitForPort(port, 10000)) {
        output.appendLine('Dev server is up');
        context.subscriptions.push({ dispose: () => spawnedProcess?.kill() });
        return;
      }
      child.kill();
      spawnedProcess = null;
    } catch (e: any) {
      output.appendLine(`Failed: ${e?.message || e}`);
    }
  }

  vscode.window.showWarningMessage('Unable to start dev server. Please run: pixi run dioxus-serve');
}

function checkPortOpen(port: number, host: string, timeout = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    const poll = () => {
      checkPortOpen(port, '127.0.0.1').then((open) => {
        if (open) return resolve(true);
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(poll, 300);
      });
    };
    poll();
  });
}

function getWebviewContent(port: number) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://localhost:${port} http://127.0.0.1:${port}; script-src 'unsafe-inline'; style-src 'unsafe-inline';" />
    <style>html, body, iframe { height: 100%; margin: 0; padding: 0; } iframe { width: 100%; border: none; }</style>
  </head>
  <body>
    <iframe src="http://localhost:${port}"></iframe>
    <script>
      const vscode = acquireVsCodeApi();
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'hello') vscode.postMessage(e.data);
      });
    </script>
  </body>
</html>`;
}
