document.addEventListener('DOMContentLoaded', () => {
    const logContainer = document.getElementById('logContainer');
    const refreshBtn = document.getElementById('refreshBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');

    function loadLogs() {
        if (!chrome.storage) {
            logContainer.textContent = "Erro: A API chrome.storage não está disponível. Execute esta página como parte da extensão.";
            return;
        }

        chrome.storage.local.get('manualGeneratorLogs', (result) => {
            if (chrome.runtime.lastError) {
                logContainer.textContent = `Erro ao carregar logs: ${chrome.runtime.lastError.message}`;
                return;
            }

            const logs = result.manualGeneratorLogs;
            if (logs && logs.length > 0) {
                // Exibe os logs em ordem reversa (mais recentes primeiro)
                logContainer.textContent = logs.slice().reverse().join('\n');
            } else {
                logContainer.textContent = 'Nenhum log encontrado.';
            }
        });
    }

    refreshBtn.addEventListener('click', () => {
        logContainer.textContent = 'Atualizando...';
        loadLogs();
    });

    clearLogsBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar todos os logs?')) {
            chrome.storage.local.remove('manualGeneratorLogs', () => {
                if (chrome.runtime.lastError) {
                    alert(`Erro ao limpar os logs: ${chrome.runtime.lastError.message}`);
                } else {
                    logContainer.textContent = 'Logs limpos.';
                    // Recarrega para mostrar a lista vazia
                    loadLogs();
                }
            });
        }
    });

    // Carrega os logs na inicialização
    loadLogs();
});
