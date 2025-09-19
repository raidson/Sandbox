window.onerror = function(message, source, lineno, colno, error) {
    chrome.runtime.sendMessage({
        action: "logError",
        message: `Error: ${message} at ${source}:${lineno}:${colno}`
    });
    return true; // Prevents the default browser error handling
};

const captureBtn = document.getElementById('captureBtn');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const viewLogsLink = document.getElementById('viewLogsLink');
const statusDiv = document.getElementById('status');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

function showStatus(message, isError = false, duration = 0) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? 'red' : 'green';

    if (duration > 0) {
        setTimeout(() => {
            statusDiv.textContent = '';
        }, duration);
    }
}

// Verifica no início se um manual já existe para habilitar o botão de download
function checkExistingManual() {
    chrome.storage.local.get('lastGeneratedManualHtml', (result) => {
        if (result.lastGeneratedManualHtml) {
            downloadBtn.style.display = 'block';
        }
    });
}

// Listener for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "progressUpdate") {
        const percent = (request.total > 0) ? (request.current / request.total) * 100 : 0;
        progressBar.value = percent;
        progressText.textContent = `Etapa ${request.current} de ${request.total}...`;
    } else if (request.action === "generationComplete") {
        progressContainer.style.display = 'none';
        generateBtn.disabled = false;
        captureBtn.disabled = false;
        showStatus('Manual gerado com sucesso!', false, 3000);
        if (request.downloadReady) {
            downloadBtn.style.display = 'block';
        }
    } else if (request.action === "criticalError") {
        progressContainer.style.display = 'none';
        generateBtn.disabled = false;
        captureBtn.disabled = false;
        showStatus("Ocorreu um erro. Verifique os logs.", true);
    }
});

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
    showStatus('');
    progressContainer.style.display = 'block';
    progressText.textContent = 'Iniciando...';
    progressBar.value = 0;
    downloadBtn.style.display = 'none';

    generateBtn.disabled = true;
    captureBtn.disabled = true;

    chrome.runtime.sendMessage({ action: "generateManual" });
});

clearBtn.addEventListener('click', () => {
    if (confirm("Tem certeza que deseja limpar todos os artigos salvos?")) {
        chrome.runtime.sendMessage({ action: "clearArticles" });
        // Limpa também o manual salvo para download
        chrome.storage.local.remove('lastGeneratedManualHtml', () => {
            downloadBtn.style.display = 'none';
            showStatus('Artigos e manual limpos!', false, 2000);
        });
    }
});

downloadBtn.addEventListener('click', () => {
    downloadBtn.disabled = true;
    showStatus('Preparando download...', false);

    chrome.storage.local.get('lastGeneratedManualHtml', (result) => {
        if (result.lastGeneratedManualHtml) {
            const blob = new Blob([result.lastGeneratedManualHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'manual.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showStatus('Download iniciado!', false, 2000);
        } else {
            showStatus('Nenhum manual encontrado para baixar.', true, 3000);
        }
        downloadBtn.disabled = false;
    });
});

viewLogsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'logs.html' });
});

// Inicializa o estado do botão de download ao abrir o popup
checkExistingManual();
