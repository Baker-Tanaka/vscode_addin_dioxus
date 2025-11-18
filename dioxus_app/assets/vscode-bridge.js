// vscode-bridge.js (compiled from vscode-bridge.ts)
// Minimal runtime bridge that posts { type: 'hello', name } to the
// extension via acquireVsCodeApi() when available, or to the parent
// window when running inside an iframe.
(function () {
  var vscodeApi = null;
  try {
    if (typeof acquireVsCodeApi !== 'undefined') {
      vscodeApi = acquireVsCodeApi();
    }
  }
  catch (e) { }
  function sendHello(name) {
    var msg = { type: 'hello', name: name };
    if (vscodeApi) {
      vscodeApi.postMessage(msg);
    }
    else if (window.parent && window.parent !== window) {
      window.parent.postMessage(msg, '*');
    }
  }
  function tryAttach() {
    var input = document.getElementById('name-input');
    var button = document.getElementById('hello-button');
    if (input && button && !(button._vscode_bridge_attached)) {
      button._vscode_bridge_attached = true;
      button.addEventListener('click', function () {
        var name = (input.value || '').trim();
        sendHello(name);
      });
    }
  }
  var interval = setInterval(function () {
    tryAttach();
  }, 200);
  setTimeout(function () {
    clearInterval(interval);
  }, 10000);
})();
