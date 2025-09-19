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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error("Nenhuma aba ativa encontrada.");
        sendResponse({ status: "error", message: "Nenhuma aba ativa encontrada." });
        return;
      }
      const activeTab = tabs[0];

      const sourceConfig = getSourceConfigForUrl(activeTab.url);
      if (!sourceConfig) {
        const errorMessage = `Nenhuma fonte de configuração encontrada para a URL: ${activeTab.url}`;
        console.error(errorMessage);
        sendResponse({ status: "error", message: errorMessage });
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, {
        action: "extractContent",
        config: sourceConfig
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Erro ao comunicar com o content script:", chrome.runtime.lastError.message);
          sendResponse({ status: "error", message: chrome.runtime.lastError.message });
          return;
        }

        if (response && response.status === 'success') {
          console.log("Dados recebidos do content script:", response.data);

          chrome.storage.local.get({ articles: [] }, (result) => {
            const articles = result.articles;
            articles.push(response.data);
            chrome.storage.local.set({ articles: articles }, () => {
              console.log("Artigo salvo com sucesso!");
              sendResponse({ status: "success", message: "Artigo salvo!" });
            });
          });
        } else {
          const errorMessage = (response && response.message) || "Erro desconhecido no content script.";
          console.error("Falha ao extrair conteúdo:", errorMessage);
          sendResponse({ status: "error", message: errorMessage });
        }
      });
    });

    return true; // Necessário para sendResponse assíncrono
  } else if (request.action === "generateManual") {
    chrome.storage.local.get({ articles: [] }, (result) => {
      if (result.articles.length === 0) {
        console.log("Nenhum artigo salvo para gerar o manual.");
        return;
      }

      const finalHtml = createHtmlManual(result.articles);
      const url = "data:text/html;charset=utf-8," + encodeURIComponent(finalHtml);
      chrome.tabs.create({ url: url });
    });
  } else if (request.action === "clearArticles") {
    chrome.storage.local.set({ articles: [] }, () => {
      console.log("Artigos limpos do storage.");
    });
  }
});

/**
 * Gera o conteúdo HTML completo do manual a partir dos artigos salvos.
 * @param {Array<object>} articlesData Uma lista de objetos de artigo, cada um com 'title' e 'htmlContent'.
 * @returns {string} Uma string contendo o documento HTML completo.
 */
function createHtmlManual(articlesData) {
    const pygmentsCss = `
        pre { line-height: 125%; }
        td.linenos .normal { color: inherit; background-color: transparent; padding-left: 5px; padding-right: 5px; }
        span.linenos { color: inherit; background-color: transparent; padding-left: 5px; padding-right: 5px; }
        td.linenos .special { color: #000000; background-color: #ffffc0; padding-left: 5px; padding-right: 5px; }
        span.linenos.special { color: #000000; background-color: #ffffc0; padding-left: 5px; padding-right: 5px; }
        .codehilite .hll { background-color: #ffffcc }
        .codehilite { background: #f8f8f8; }
        .codehilite .c { color: #3D7B7B; font-style: italic } /* Comment */
        .codehilite .err { border: 1px solid #F00 } /* Error */
        .codehilite .k { color: #008000; font-weight: bold } /* Keyword */
        .codehilite .o { color: #666 } /* Operator */
        .codehilite .ch { color: #3D7B7B; font-style: italic } /* Comment.Hashbang */
        .codehilite .cm { color: #3D7B7B; font-style: italic } /* Comment.Multiline */
        .codehilite .cp { color: #9C6500 } /* Comment.Preproc */
        .codehilite .cpf { color: #3D7B7B; font-style: italic } /* Comment.PreprocFile */
        .codehilite .c1 { color: #3D7B7B; font-style: italic } /* Comment.Single */
        .codehilite .cs { color: #3D7B7B; font-style: italic } /* Comment.Special */
        .codehilite .gd { color: #A00000 } /* Generic.Deleted */
        .codehilite .ge { font-style: italic } /* Generic.Emph */
        .codehilite .ges { font-weight: bold; font-style: italic } /* Generic.EmphStrong */
        .codehilite .gr { color: #E40000 } /* Generic.Error */
        .codehilite .gh { color: #000080; font-weight: bold } /* Generic.Heading */
        .codehilite .gi { color: #008400 } /* Generic.Inserted */
        .codehilite .go { color: #717171 } /* Generic.Output */
        .codehilite .gp { color: #000080; font-weight: bold } /* Generic.Prompt */
        .codehilite .gs { font-weight: bold } /* Generic.Strong */
        .codehilite .gu { color: #800080; font-weight: bold } /* Generic.Subheading */
        .codehilite .gt { color: #04D } /* Generic.Traceback */
        .codehilite .kc { color: #008000; font-weight: bold } /* Keyword.Constant */
        .codehilite .kd { color: #008000; font-weight: bold } /* Keyword.Declaration */
        .codehilite .kn { color: #008000; font-weight: bold } /* Keyword.Namespace */
        .codehilite .kp { color: #008000 } /* Keyword.Pseudo */
        .codehilite .kr { color: #008000; font-weight: bold } /* Keyword.Reserved */
        .codehilite .kt { color: #B00040 } /* Keyword.Type */
        .codehilite .m { color: #666 } /* Literal.Number */
        .codehilite .s { color: #BA2121 } /* Literal.String */
        .codehilite .na { color: #687822 } /* Name.Attribute */
        .codehilite .nb { color: #008000 } /* Name.Builtin */
        .codehilite .nc { color: #00F; font-weight: bold } /* Name.Class */
        .codehilite .no { color: #800 } /* Name.Constant */
        .codehilite .nd { color: #A2F } /* Name.Decorator */
        .codehilite .ni { color: #717171; font-weight: bold } /* Name.Entity */
        .codehilite .ne { color: #CB3F38; font-weight: bold } /* Name.Exception */
        .codehilite .nf { color: #00F } /* Name.Function */
        .codehilite .nl { color: #767600 } /* Name.Label */
        .codehilite .nn { color: #00F; font-weight: bold } /* Name.Namespace */
        .codehilite .nt { color: #008000; font-weight: bold } /* Name.Tag */
        .codehilite .nv { color: #19177C } /* Name.Variable */
        .codehilite .ow { color: #A2F; font-weight: bold } /* Operator.Word */
        .codehilite .w { color: #BBB } /* Text.Whitespace */
        .codehilite .mb { color: #666 } /* Literal.Number.Bin */
        .codehilite .mf { color: #666 } /* Literal.Number.Float */
        .codehilite .mh { color: #666 } /* Literal.Number.Hex */
        .codehilite .mi { color: #666 } /* Literal.Number.Integer */
        .codehilite .mo { color: #666 } /* Literal.Number.Oct */
        .codehilite .sa { color: #BA2121 } /* Literal.String.Affix */
        .codehilite .sb { color: #BA2121 } /* Literal.String.Backtick */
        .codehilite .sc { color: #BA2121 } /* Literal.String.Char */
        .codehilite .dl { color: #BA2121 } /* Literal.String.Delimiter */
        .codehilite .sd { color: #BA2121; font-style: italic } /* Literal.String.Doc */
        .codehilite .s2 { color: #BA2121 } /* Literal.String.Double */
        .codehilite .se { color: #AA5D1F; font-weight: bold } /* Literal.String.Escape */
        .codehilite .sh { color: #BA2121 } /* Literal.String.Heredoc */
        .codehilite .si { color: #A45A77; font-weight: bold } /* Literal.String.Interpol */
        .codehilite .sx { color: #008000 } /* Literal.String.Other */
        .codehilite .sr { color: #A45A77 } /* Literal.String.Regex */
        .codehilite .s1 { color: #BA2121 } /* Literal.String.Single */
        .codehilite .ss { color: #19177C } /* Literal.String.Symbol */
        .codehilite .bp { color: #008000 } /* Name.Builtin.Pseudo */
        .codehilite .fm { color: #00F } /* Name.Function.Magic */
        .codehilite .vc { color: #19177C } /* Name.Variable.Class */
        .codehilite .vg { color: #19177C } /* Name.Variable.Global */
        .codehilite .vi { color: #19177C } /* Name.Variable.Instance */
        .codehilite .vm { color: #19177C } /* Name.Variable.Magic */
        .codehilite .il { color: #666 } /* Literal.Number.Integer.Long */
    `;

    const htmlStyle = `
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
        ${pygmentsCss}
        .codehilite {
            border: 1px solid #ccc; border-radius: 4px; padding: 10px; overflow-x: auto; margin: 1.5em 0;
            white-space: pre-wrap; word-break: break-all;
        }
        .codehilite strong { font-weight: bold !important; color: #CD0000 !important; }
    </style>
    `;

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
