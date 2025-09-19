# Gerador de Manual HTML

Este script é uma ferramenta flexível para extrair conteúdo de diferentes sites (como bases de conhecimento e wikis) e compilá-lo em um único arquivo HTML para uso offline. Ele utiliza multithreading para baixar várias páginas simultaneamente.

## Como Usar

O script oferece dois modos principais de operação: modo manual (passando URLs diretamente) e modo de varredura (scanning).

### 1. Instale as dependências

O script requer as bibliotecas `requests`, `beautifulsoup4` e `Pygments`. Se não estiverem instaladas, você pode instalá-las manualmente:
```bash
pip install requests beautifulsoup4 Pygments
```

### 2. Modo Manual (URLs Específicas)

Passe uma ou mais URLs como argumentos para extrair o conteúdo de páginas específicas.

**Exemplo:**
```bash
python gerador_manual.py https://pt.wikipedia.org/wiki/Inteligencia_artificial
```

### 3. Modo de Varredura (Automático)

Use a opção `--scan` para fornecer uma URL "raiz". O script irá encontrar todos os links nessa página (que correspondam à fonte configurada) e processá-los.

**Exemplo:**
```bash
python gerador_manual.py --scan https://oobj.com.br/bc/
```

#### Limite de Captura

Você pode usar a opção `--limit` junto com `--scan` para limitar o número de páginas a serem capturadas. O padrão é 50.

**Exemplo com limite:**
```bash
python gerador_manual.py --scan https://oobj.com.br/bc/ --limit 10
```

### Modo Automático (Legado)

Se nenhum argumento de URL for fornecido, o script tentará usar um modo automático legado, que busca e extrai todos os links da `base_url` da primeira fonte configurada na lista `SOURCES`.

```bash
python gerador_manual.py
```

## Configuração

A configuração principal é feita no dicionário `CONFIG` dentro do script `gerador_manual.py`.

```python
CONFIG = {
    "output_filename": "manual_completo_gerado.html",
    "MAX_WORKERS": 10,
    "SOURCES": [
        {
            "name": "Oobj BC",
            "base_url": "https://oobj.com.br/bc/",
            "domain_match": "oobj.com.br",
            "article_links_selector": 'a[href*="/bc/"]',
            "title_selector": 'article.conteudo h1, h1.entry-title, h1',
            "content_selector": 'article.conteudo, div.kb-article-content, div.entry-content',
        },
        {
            "name": "Wikipedia",
            "base_url": "https://pt.wikipedia.org/",
            "domain_match": "wikipedia.org",
            "article_links_selector": None,
            "title_selector": 'h1#firstHeading',
            "content_selector": 'div#mw-content-text .mw-parser-output',
        }
    ]
}
```

### Opções de Configuração

-   `output_filename`: O nome do arquivo HTML final que será gerado.
-   `MAX_WORKERS`: O número de threads paralelas para baixar as páginas.
-   `SOURCES`: Uma lista de dicionários, onde cada dicionário representa uma fonte de dados configurada.
    -   `name`: Um nome amigável para a fonte (usado em logs).
    -   `base_url`: A URL base da fonte, usada para resolver links relativos.
    -   `domain_match`: Uma string que identifica a fonte a partir da URL do artigo (ex: "wikipedia.org").
    -   `article_links_selector`: (Opcional) Seletor CSS para o modo automático, para encontrar todos os links de artigos na `base_url`.
    -   `title_selector`: Seletor CSS para o título do artigo.
    -   `content_selector`: Seletor CSS para o bloco de conteúdo principal do artigo.

Você pode adicionar novas fontes à lista `SOURCES` para expandir a capacidade do script.
