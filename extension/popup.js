const captureBtn = document.getElementById('captureBtn');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const statusDiv = document.getElementById('status');

function showStatus(message, isError = false, duration = 0) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? 'red' : 'green';

    if (duration > 0) {
        setTimeout(() => {
            statusDiv.textContent = '';
        }, duration);
    }
}

captureBtn.addEventListener('click', () => {
    captureBtn.disabled = true;
    showStatus('Capturando...', false);

    chrome.runtime.sendMessage({ action: "capturePage" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            showStatus('Erro: ' + chrome.runtime.lastError.message, true);
            captureBtn.disabled = false;
        } else if (response.status === 'error') {
            console.error('Erro do background:', response.message);
            showStatus(response.message, true);
            captureBtn.disabled = false;
        } else {
            showStatus('Página capturada!', false);
            setTimeout(() => window.close(), 1500);
        }
    });
});

generateBtn.addEventListener('click', () => {
    showStatus('Gerando manual...', false);
    chrome.runtime.sendMessage({ action: "generateManual" });
    // A popup pode fechar antes do manual ser gerado, o que é aceitável.
    setTimeout(() => window.close(), 500);
});

clearBtn.addEventListener('click', () => {
    if (confirm("Tem certeza que deseja limpar todos os artigos salvos?")) {
        chrome.runtime.sendMessage({ action: "clearArticles" });
        showStatus('Artigos limpos!', false, 1500);
    }
});
