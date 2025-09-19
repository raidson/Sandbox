document.getElementById('captureBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "capturePage" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    } else {
      console.log('Resposta do background:', response);
      // Maybe show a status to the user in the popup
      window.close(); // Close popup after action
    }
  });
});

document.getElementById('generateBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "generateManual" });
});

document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm("Tem certeza que deseja limpar todos os artigos salvos?")) {
    chrome.runtime.sendMessage({ action: "clearArticles" });
  }
});
