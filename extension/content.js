console.log('Script de conteúdo do Gerador de Manual injetado.');

/**
 * Processa o elemento de conteúdo, tornando links e imagens absolutos.
 * @param {Element} contentElement O elemento DOM que contém o conteúdo do artigo.
 * @param {string} baseUrl A URL base para resolver links relativos.
 */
function processHtmlContent(contentElement, baseUrl) {
    if (!contentElement) return "";

    // Tornar links absolutos
    contentElement.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (href) {
            a.href = new URL(href, baseUrl).href;
        }
    });

    // Tornar imagens absolutas
    contentElement.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src) {
            img.src = new URL(src, baseUrl).href;
        }
    });

    // A remoção da simplificação de <pre> significa que o conteúdo do código
    // será agora passado como está, permitindo o highlighting no passo final.
    return contentElement.innerHTML;
}


/**
 * Extrai os detalhes do artigo da página atual.
 * @param {object} sourceConfig A configuração da fonte para a página atual.
 * @returns {object|null} Um objeto com título e conteúdo, ou nulo se não for encontrado.
 */
function extractArticleDetails(sourceConfig) {
    const titleElement = document.querySelector(sourceConfig.title_selector);
    if (!titleElement) {
        console.warn("Gerador de Manual: Título não encontrado com o seletor:", sourceConfig.title_selector);
        return null;
    }
    const title = titleElement.innerText.trim();

    const contentElement = document.querySelector(sourceConfig.content_selector);
    if (!contentElement) {
        console.warn("Gerador de Manual: Conteúdo não encontrado com o seletor:", sourceConfig.content_selector);
        return null;
    }

    // Clonamos o elemento para não modificar a página original ao processar
    const contentClone = contentElement.cloneNode(true);
    const htmlContent = processHtmlContent(contentClone, sourceConfig.base_url);

    if (!htmlContent.trim()) {
        return { title, htmlContent: "<p>Conteúdo não encontrado ou vazio.</p>" };
    }

    return { title, htmlContent };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractContent") {
        try {
            console.log("Recebida mensagem para extrair conteúdo com a configuração:", request.config);
            const articleDetails = extractArticleDetails(request.config);

            if (articleDetails) {
                sendResponse({ status: "success", data: articleDetails });
            } else {
                // Envia uma resposta de erro estruturada se a extração falhar logicamente.
                sendResponse({
                    status: "error",
                    message: "Não foi possível encontrar o conteúdo com os seletores fornecidos.",
                    error: {
                        name: "ExtractionError",
                        message: "Os seletores de título ou conteúdo não corresponderam a nenhum elemento na página."
                    }
                });
            }
        } catch (e) {
            // Captura qualquer erro inesperado durante a extração e o envia para o background.
            console.error("Gerador de Manual: Erro inesperado durante a extração de conteúdo.", e);
            sendResponse({
                status: "error",
                message: `Erro inesperado no script de conteúdo: ${e.message}`,
                error: { // Garante que o erro seja serializável
                    name: e.name,
                    message: e.message,
                    stack: e.stack
                }
            });
        }
    }
    // Retorna true para indicar que a resposta será enviada de forma assíncrona.
    return true;
});
