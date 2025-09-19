console.log('Service Worker do Gerador de Manual iniciado.');

// A lógica de orquestração do addon será adicionada aqui.

// Para fins de desenvolvimento e teste, a configuração está aqui.
// No futuro, isso será carregado do chrome.storage.
const CONFIG = {
    "SOURCES": [
        {
            "name": "Oobj BC",
            "base_url": "https://oobj.com.br/bc/",
            "domain_match": "oobj.com.br",
            "article_links_selector": "a[href*=\"/bc/\"]",
            "title_selector": "article.conteudo h1, h1.entry-title, h1",
            "content_selector": "article.conteudo, div.kb-article-content, div.entry-content",
        },
        {
            "name": "Wikipedia",
            "base_url": "https://pt.wikipedia.org/",
            "domain_match": "wikipedia.org",
            "article_links_selector": null,
            "title_selector": "h1#firstHeading",
            "content_selector": "div#mw-content-text .mw-parser-output",
        }
    ]
};

/**
 * Encontra a configuração de fonte correta para uma determinada URL.
 * @param {string} url A URL a ser verificada.
 * @returns {object|null} A configuração da fonte ou nulo se não for encontrada.
 */
function getSourceConfigForUrl(url) {
  for (const source of CONFIG.SOURCES) {
    if (url.includes(source.domain_match)) {
      return source;
    }
  }
  return null;
}

// Exemplo de teste (será removido posteriormente)
console.log("--- TESTE getSourceConfigForUrl ---");
const testUrlWiki = "https://pt.wikipedia.org/wiki/JavaScript";
const wikiConfig = getSourceConfigForUrl(testUrlWiki);
console.log(`URL: ${testUrlWiki}, Fonte: ${wikiConfig ? wikiConfig.name : 'Nenhuma'}`);

const testUrlOobj = "https://oobj.com.br/bc/rejeicao-598-como-resolver/";
const oobjConfig = getSourceConfigForUrl(testUrlOobj);
console.log(`URL: ${testUrlOobj}, Fonte: ${oobjConfig ? oobjConfig.name : 'Nenhuma'}`);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "capturePage") {
    // 1. Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error("Nenhuma aba ativa encontrada.");
        sendResponse({ status: "error", message: "Nenhuma aba ativa encontrada." });
        return;
      }
      const activeTab = tabs[0];

      // 2. Find the source config for the URL
      const sourceConfig = getSourceConfigForUrl(activeTab.url);
      if (!sourceConfig) {
        const errorMessage = `Nenhuma fonte de configuração encontrada para a URL: ${activeTab.url}`;
        console.error(errorMessage);
        sendResponse({ status: "error", message: errorMessage });
        return;
      }

      // 3. Send a message to the content script
      chrome.tabs.sendMessage(activeTab.id, {
        action: "extractContent",
        config: sourceConfig
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
          // A resposta do content script será tratada no próximo passo do plano
          console.log("Dados recebidos do content script:", response);
          sendResponse({ status: "success", data: response });
        }
      });
    });

    // Retorna true para indicar que a resposta será enviada de forma assíncrona
    return true;
  }
});
