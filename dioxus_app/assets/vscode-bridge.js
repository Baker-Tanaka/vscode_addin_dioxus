// vscode-bridge.js
// Poll for the elements and attach event handler to the hello button.
(function () {
  // Cache vscode API if available (can only call acquireVsCodeApi once)
  let vscodeApi = null;
  try {
    if (typeof acquireVsCodeApi !== 'undefined') {
      vscodeApi = acquireVsCodeApi();
    }
  } catch (e) {
    // not available in iframe context
  }

  function sendHello(name) {
    const msg = { type: 'hello', name };
    if (vscodeApi) {
      // running directly in a webview top-level document
      vscodeApi.postMessage(msg);
    } else if (window.parent && window.parent !== window) {
      // running inside an iframe; post to parent (webview wrapper should forward)
      window.parent.postMessage(msg, '*');
    }
  }

  function tryAttach() {
    const input = document.getElementById('name-input');
    const button = document.getElementById('hello-button');
    if (input && button && !button._vscode_bridge_attached) {
      button._vscode_bridge_attached = true;
      button.addEventListener('click', function () {
        const name = (input.value || '').trim();
        sendHello(name);
      });
    }
  }

  // wait for the dioxus DOM to render
  const interval = setInterval(function () {
    tryAttach();
  }, 200);

  // stop polling after 10s
  setTimeout(function () {
    clearInterval(interval);
  }, 10000);
})();
