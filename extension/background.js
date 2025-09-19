console.log('Service Worker do Gerador de Manual iniciado.');

let sourcesConfig = [];

const defaultConfigSources = [
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
];

function loadConfig() {
    chrome.storage.local.get({ sources: defaultConfigSources }, (result) => {
        console.log("Configuração de fontes carregada.");
        sourcesConfig = result.sources;
    });
}

// Carrega a configuração na inicialização e ouve por mudanças
loadConfig();
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.sources) {
        console.log("Configuração de fontes foi atualizada em tempo real.");
        sourcesConfig = changes.sources.newValue;
    }
});

function getSourceConfigForUrl(url) {
  if (!url) return null;
  for (const source of sourcesConfig) {
    if (url.includes(source.domain_match)) {
      return source;
    }
  }
  return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "capturePage") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        return sendResponse({ status: "error", message: "Nenhuma aba ativa encontrada." });
      }
      const activeTab = tabs[0];
      const sourceConfig = getSourceConfigForUrl(activeTab.url);

      if (!sourceConfig) {
        return sendResponse({ status: "error", message: `Nenhuma fonte de configuração encontrada para a URL: ${activeTab.url}` });
      }

      chrome.tabs.sendMessage(activeTab.id, { action: "extractContent", config: sourceConfig }, (response) => {
        if (chrome.runtime.lastError) {
          return sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        }
        if (response && response.status === 'success') {
          chrome.storage.local.get({ articles: [] }, (result) => {
            const articles = result.articles;
            articles.push(response.data);
            chrome.storage.local.set({ articles }, () => {
              sendResponse({ status: "success", message: "Artigo salvo!" });
            });
          });
        } else {
          sendResponse({ status: "error", message: (response && response.message) || "Erro no content script." });
        }
      });
    });
    return true; // para sendResponse assíncrono
  }
  else if (request.action === "generateManual") {
    chrome.storage.local.get({ articles: [] }, (result) => {
      if (result.articles && result.articles.length > 0) {
        const finalHtml = createHtmlManual(result.articles);
        const url = "data:text/html;charset=utf-8," + encodeURIComponent(finalHtml);
        chrome.tabs.create({ url: url });
      }
    });
  }
  else if (request.action === "clearArticles") {
    chrome.storage.local.set({ articles: [] }, () => console.log("Artigos limpos."));
  }
  else if (request.action === "getDefaultSources") {
    sendResponse({ data: defaultConfigSources });
  }
});

function createHtmlManual(articlesData) {
    const pygmentsCss = `
        pre { line-height: 125%; }
        td.linenos .normal { color: inherit; background-color: transparent; padding-left: 5px; padding-right: 5px; }
        span.linenos { color: inherit; background-color: transparent; padding-left: 5px; padding-right: 5px; }
        td.linenos .special { color: #000000; background-color: #ffffc0; padding-left: 5px; padding-right: 5px; }
        span.linenos.special { color: #000000; background-color: #ffffc0; padding-left: 5px; padding-right: 5px; }
        .codehilite .hll { background-color: #ffffcc }
        .codehilite { background: #f8f8f8; }
        .codehilite .c { color: #3D7B7B; font-style: italic }
        .codehilite .err { border: 1px solid #F00 }
        .codehilite .k { color: #008000; font-weight: bold }
        .codehilite .o { color: #666 }
        .codehilite .ch { color: #3D7B7B; font-style: italic }
        .codehilite .cm { color: #3D7B7B; font-style: italic }
        .codehilite .cp { color: #9C6500 }
        .codehilite .cpf { color: #3D7B7B; font-style: italic }
        .codehilite .c1 { color: #3D7B7B; font-style: italic }
        .codehilite .cs { color: #3D7B7B; font-style: italic }
        .codehilite .gd { color: #A00000 }
        .codehilite .ge { font-style: italic }
        .codehilite .ges { font-weight: bold; font-style: italic }
        .codehilite .gr { color: #E40000 }
        .codehilite .gh { color: #000080; font-weight: bold }
        .codehilite .gi { color: #008400 }
        .codehilite .go { color: #717171 }
        .codehilite .gp { color: #000080; font-weight: bold }
        .codehilite .gs { font-weight: bold }
        .codehilite .gu { color: #800080; font-weight: bold }
        .codehilite .gt { color: #04D }
        .codehilite .kc { color: #008000; font-weight: bold }
        .codehilite .kd { color: #008000; font-weight: bold }
        .codehilite .kn { color: #008000; font-weight: bold }
        .codehilite .kp { color: #008000 }
        .codehilite .kr { color: #008000; font-weight: bold }
        .codehilite .kt { color: #B00040 }
        .codehilite .m { color: #666 }
        .codehilite .s { color: #BA2121 }
        .codehilite .na { color: #687822 }
        .codehilite .nb { color: #008000 }
        .codehilite .nc { color: #00F; font-weight: bold }
        .codehilite .no { color: #800 }
        .codehilite .nd { color: #A2F }
        .codehilite .ni { color: #717171; font-weight: bold }
        .codehilite .ne { color: #CB3F38; font-weight: bold }
        .codehilite .nf { color: #00F }
        .codehilite .nl { color: #767600 }
        .codehilite .nn { color: #00F; font-weight: bold }
        .codehilite .nt { color: #008000; font-weight: bold }
        .codehilite .nv { color: #19177C }
        .codehilite .ow { color: #A2F; font-weight: bold }
        .codehilite .w { color: #BBB }
        .codehilite .mb { color: #666 }
        .codehilite .mf { color: #666 }
        .codehilite .mh { color: #666 }
        .codehilite .mi { color: #666 }
        .codehilite .mo { color: #666 }
        .codehilite .sa { color: #BA2121 }
        .codehilite .sb { color: #BA2121 }
        .codehilite .sc { color: #BA2121 }
        .codehilite .dl { color: #BA2121 }
        .codehilite .sd { color: #BA2121; font-style: italic }
        .codehilite .s2 { color: #BA2121 }
        .codehilite .se { color: #AA5D1F; font-weight: bold }
        .codehilite .sh { color: #BA2121 }
        .codehilite .si { color: #A45A77; font-weight: bold }
        .codehilite .sx { color: #008000 }
        .codehilite .sr { color: #A45A77 }
        .codehilite .s1 { color: #BA2121 }
        .codehilite .ss { color: #19177C }
        .codehilite .bp { color: #008000 }
        .codehilite .fm { color: #00F }
        .codehilite .vc { color: #19177C }
        .codehilite .vg { color: #19177C }
        .codehilite .vi { color: #19177C }
        .codehilite .vm { color: #19177C }
        .codehilite .il { color: #666 }
    `;

    const htmlStyle = \`
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f8f9fa; color: #212529; }
        .container { max-width: 960px; margin: 20px auto; padding: 30px; background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; }
        h1, h2 { color: #0056b3; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; }
        h1 { text-align: center; }
        article { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; }
        #indice ul { list-style-type: none; padding-left: 0; }
        #indice a { text-decoration: none; color: #0056b3; font-size: 1.1em; }
        #indice a:hover { text-decoration: underline; }
        img { max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd; }
        a { color: #0066cc; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
        th, td { border: 1px solid #dee2e6; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        tr:nth-child(even) { background-color: #f8f9fa; }
        \${pygmentsCss}
        .codehilite {
            border: 1px solid #ccc; border-radius: 4px; padding: 10px; overflow-x: auto; margin: 1.5em 0;
            white-space: pre-wrap; word-break: break-all;
        }
        .codehilite strong { font-weight: bold !important; color: #CD0000 !important; }
    </style>
    \`;

    let html = \`<!DOCTYPE html>
<html lang='pt-BR'>
<head>
  <meta charset='UTF-8'>
  <title>Manual - Base de Conhecimento</title>
  \${htmlStyle}
</head>
<body>
<div class='container'>
  <h1>Manual - Base de Conhecimento</h1>
  <section id='indice'>
    <h2>Índice</h2>
    <ul>\`;

    articlesData.forEach((article, i) => {
        const anchor = \`artigo-\${i}\`;
        html += \`<li><a href='#\${anchor}'>\${article.title}</a></li>\`;
    });

    html += \`</ul></section>\`;

    articlesData.forEach((article, i) => {
        const anchor = \`artigo-\${i}\`;
        html += \`<article id='\${anchor}'><h2>\${article.title}</h2>\${article.htmlContent}</article>\`;
    });

    html += \`</div></body></html>\`;
    return html;
}
