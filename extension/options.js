const sourcesTableBody = document.querySelector("#sourcesTable tbody");
const addSourceForm = document.getElementById("addSourceForm");

let sources = [];

// Função para renderizar as fontes na tabela
function renderSources() {
  sourcesTableBody.innerHTML = ""; // Limpa a tabela
  sources.forEach((source, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${source.name}</td>
      <td>${source.domain_match}</td>
      <td>${source.title_selector}</td>
      <td>${source.content_selector}</td>
      <td><button class="deleteBtn" data-index="${index}">Remover</button></td>
    `;
    sourcesTableBody.appendChild(row);
  });
}

// Função para salvar as fontes no storage
function saveSources() {
  chrome.storage.local.set({ sources: sources }, () => {
    console.log("Fontes salvas com sucesso.");
  });
}

// Carregar as fontes do storage ao abrir a página
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get({ sources: null }, (result) => {
    if (result.sources === null) {
      // Se não há nada no storage, busca a config padrão do background
      // Nota: Isso requer que o background script esteja pronto para responder.
      chrome.runtime.sendMessage({ action: "getDefaultSources" }, (response) => {
        if (response && response.data) {
          sources = response.data;
          saveSources();
          renderSources();
        }
      });
    } else {
      sources = result.sources;
      renderSources();
    }
  });
});

// Adicionar nova fonte
addSourceForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(addSourceForm);
  const newSource = {
    name: formData.get("name"),
    domain_match: formData.get("domain_match"),
    base_url: formData.get("base_url"),
    title_selector: formData.get("title_selector"),
    content_selector: formData.get("content_selector"),
    article_links_selector: formData.get("article_links_selector") || null,
  };
  sources.push(newSource);
  saveSources();
  renderSources();
  addSourceForm.reset();
});

// Remover uma fonte (usando delegação de eventos)
sourcesTableBody.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("deleteBtn")) {
    const index = e.target.getAttribute("data-index");
    if (confirm(`Tem certeza que deseja remover a fonte "${sources[index].name}"?`)) {
      sources.splice(index, 1);
      saveSources();
      renderSources();
    }
  }
});
