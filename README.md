# Gerador de Manual HTML

Este script é um Gerador de Manual HTML que extrai dados de um site de base de conhecimento e compila todos os artigos em um único arquivo HTML para uso offline. Ele utiliza multithreading para baixar várias páginas simultaneamente, o que acelera significativamente o processo.

## Como Usar

1.  **Instale as dependências:**
    O script requer as bibliotecas `requests`, `beautifulsoup4` e `Pygments`. Se você não as tiver instaladas, o script tentará instalar o `Pygments` automaticamente. Você também pode instalá-las manualmente:
    ```bash
    pip install requests beautifulsoup4 Pygments
    ```

2.  **Configure o script:**
    Abra o arquivo `gerador_manual.py` e edite o dicionário `CONFIG` no topo do arquivo para atender às suas necessidades. Consulte a seção [Configuração](#configuração) abaixo para mais detalhes.

3.  **Execute o script:**
    ```bash
    python gerador_manual.py
    ```
    O script irá gerar um arquivo HTML chamado `manual_completo_gerado.html` (ou o nome que você especificou na configuração) no mesmo diretório.

## Configuração

A configuração principal é feita no dicionário `CONFIG` dentro do script `gerador_manual.py`.

```python
CONFIG = {
    # 1. URL PRINCIPAL: Usada no modo automático para encontrar os links.
    "base_url": "https://oobj.com.br/bc/",

    # 2. SELETOR DE LINKS: Seletor CSS para encontrar os links dos artigos no modo automático.
    "article_links_selector": 'a[href*="/bc/"]',

    # 3. SELETOR DE TÍTULO: Seletor CSS para o título do artigo dentro da página de um artigo.
    "title_selector": 'article.conteudo h1, h1.entry-title, h1',

    # 4. SELETOR DE CONTEÚDO: Seletor CSS para o contêiner principal de conteúdo de um artigo.
    "content_selector": 'article.conteudo, div.kb-article-content, div.entry-content',

    # 5. NOME DO ARQUIVO FINAL: O nome do arquivo HTML de saída.
    "output_filename": "manual_completo_gerado.html",

    # 6. MODO DE OPERAÇÃO:
    #    - Para MODO MANUAL: Cole as URLs aqui.
    #    - Para MODO AUTOMÁTICO: Deixe a lista VAZIA -> []
    "link_list_override": [],

    # 7. OTIMIZAÇÃO: Número de threads concorrentes para baixar as páginas.
    #    Comece com 10. Aumente para 20 ou 30 se sua conexão for boa. Não exagere.
    "MAX_WORKERS": 10
}
```

### Opções de Configuração

-   `base_url`: A URL principal da base de conhecimento que você deseja extrair. É usada no modo automático para encontrar todos os links dos artigos.
-   `article_links_selector`: O seletor CSS usado para identificar os links para os artigos na página `base_url`. Você pode precisar inspecionar o HTML do site de destino para encontrar o seletor correto.
-   `title_selector`: O seletor CSS para o título de um artigo dentro da página do artigo.
-   `content_selector`: O seletor CSS para o bloco de conteúdo principal de um artigo.
-   `output_filename`: O nome do arquivo HTML final que será gerado.
-   `link_list_override`: Esta opção controla o modo de operação.
    -   **Modo Automático:** Se você deixar esta lista vazia (`[]`), o script irá extrair da `base_url` para encontrar todos os links de artigos automaticamente usando o `article_links_selector`.
    -   **Modo Manual:** Se você deseja extrair apenas páginas específicas, pode colar as URLs completas nesta lista. Por exemplo: `["http://exemplo.com/artigo1", "http://exemplo.com/artigo2"]`.
-   `MAX_WORKERS`: O número de threads paralelas que serão usadas para baixar as páginas. Um número maior pode acelerar o processo, mas esteja ciente dos limites de taxa do site e da sua conexão com a internet. `10` é um ponto de partida seguro.
