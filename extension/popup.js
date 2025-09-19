document.getElementById('captureBtn').addEventListener('click', () => {
  // Envia uma mensagem para o background script para iniciar a captura.
  chrome.runtime.sendMessage({ action: "capturePage" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    } else {
      console.log('Resposta do background:', response);
    }
  });
});
