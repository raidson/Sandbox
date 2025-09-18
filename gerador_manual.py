# -*- coding: utf-8 -*-
"""
Gerador de Manual HTML v2.0 (Versão Otimizada com Multithreading)

Utiliza concorrência para baixar múltiplas páginas ao mesmo tempo,
acelerando drasticamente o processo de captura em massa.
"""

# PASSO 1: Importação de bibliotecas
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import os
import sys
import concurrent.futures # Biblioteca para concorrência

# Tenta importar a biblioteca Pygments, se não existir, instala
try:
    from pygments import highlight
    from pygments.lexers import guess_lexer, TextLexer
    from pygments.formatters import HtmlFormatter
except ImportError:
    print("Instalando a biblioteca 'Pygments' necessária...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pygments"])
    from pygments import highlight
    from pygments.lexers import guess_lexer, TextLexer
    from pygments.formatters import HtmlFormatter

# ====================================================================================
# ||                              CONFIGURAÇÃO PRINCIPAL                            ||
# ====================================================================================
CONFIG = {
    # 1. URL PRINCIPAL: Usada no modo automático para encontrar os links.
    "base_url": "https://oobj.com.br/bc/",

    # 2. SELETOR DE LINKS: Usado no modo automático.
    "article_links_selector": 'a[href*="/bc/"]',

    # 3. SELETOR DE TÍTULO: Dentro da página de um artigo.
    "title_selector": 'article.conteudo h1, h1.entry-title, h1',

    # 4. SELETOR DE CONTEÚDO: O container do conteúdo do artigo.
    "content_selector": 'article.conteudo, div.kb-article-content, div.entry-content',

    # 5. NOME DO ARQUIVO FINAL:
    "output_filename": "manual_completo_gerado.html",

    # 6. MODO DE OPERAÇÃO:
    #    - Para MODO MANUAL: Cole as URLs aqui.
    #    - Para MODO AUTOMÁTICO: Deixe a lista VAZIA -> []
    "link_list_override": [],

    # 7. OTIMIZAÇÃO: Número de "ajudantes" (threads) para baixar páginas simultaneamente.
    #    Comece com 10. Aumente para 20 ou 30 se sua conexão for boa. Não exagere.
    "MAX_WORKERS": 10
}
# ====================================================================================
# ||                           FIM DA CONFIGURAÇÃO PRINCIPAL                          ||
# ====================================================================================

# Headers para simular um navegador (ESTE BLOCO ESTAVA FALTANDO)
HTTP_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
}

def get_soup(session, url):
    """Faz o download do HTML de uma URL usando uma sessão."""
    try:
        response = session.get(url, timeout=15)
        response.raise_for_status()
        return BeautifulSoup(response.content, 'html.parser')
    except requests.exceptions.RequestException as e:
        print(f"  [AVISO] Falha ao acessar a URL {url}: {e}")
        return None

def process_html_content(base_url, content_element):
    """Processa o HTML, tornando links absolutos e colorindo snippets de código."""
    if not content_element: return ""
    for a_tag in content_element.find_all('a', href=True): a_tag['href'] = urljoin(base_url, a_tag['href'])
    for img_tag in content_element.find_all('img', src=True): img_tag['src'] = urljoin(base_url, img_tag['src'])
    formatter = HtmlFormatter(style='default', full=False, cssclass="codehilite", linenos='inline')
    for pre_tag in content_element.find_all('pre'):
        code_container = pre_tag.find('code') or pre_tag
        strong_texts = [strong.text for strong in code_container.find_all('strong')]
        for strong_tag in code_container.find_all('strong'): strong_tag.unwrap()
        code_text = code_container.get_text()
        if '<code>' in code_text:
            code_text = code_text.replace('<code>', '[...]').replace('</code>', '')
        try:
            lexer = guess_lexer(code_text)
            if 'text' in lexer.name.lower(): lexer = TextLexer()
        except Exception: lexer = TextLexer()
        highlighted_code = highlight(code_text, lexer, formatter)
        for text in strong_texts: highlighted_code = highlighted_code.replace(text, f"<strong>{text}</strong>")
        pre_tag.replace_with(BeautifulSoup(highlighted_code, 'html.parser'))
    return str(content_element)

def extract_article_details(session, article_url):
    """Extrai o título e o conteúdo HTML de uma página."""
    if "#" in article_url.split('/')[-1]: return None
    print(f"  -> Processando: {article_url}")
    soup = get_soup(session, article_url)
    if not soup: return None
    title_element = soup.select_one(CONFIG['title_selector'])
    if not title_element:
        print(f"    -> Título não encontrado, pulando página (provavelmente uma categoria).")
        return None
    title = title_element.get_text(strip=True)
    content_element = soup.select_one(CONFIG['content_selector'])
    html_content = process_html_content(article_url, content_element)
    if not html_content.strip(): html_content = "<p>Conteúdo não encontrado ou vazio.</p>"
    return (title, html_content)

def create_html_manual(articles_data, filename):
    """Gera um arquivo HTML com o conteúdo dos artigos."""
    pygments_css = HtmlFormatter(style='default').get_style_defs('.codehilite')
    html_style = f"""
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f8f9fa; color: #212529; }}
        .container {{ max-width: 960px; margin: 20px auto; padding: 30px; background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; }}
        h1, h2 {{ color: #0056b3; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; }}
        h1 {{ text-align: center; }}
        article {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; }}
        #indice ul {{ list-style-type: none; padding-left: 0; }}
        #indice a {{ text-decoration: none; color: #0056b3; font-size: 1.1em; }}
        #indice a:hover {{ text-decoration: underline; }}
        img {{ max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd; }}
        a {{ color: #0066cc; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }}
        th, td {{ border: 1px solid #dee2e6; padding: 12px; text-align: left; }}
        th {{ background-color: #f8f9fa; font-weight: bold; }}
        tr:nth-child(even) {{ background-color: #f8f9fa; }}
        {pygments_css}
        .codehilite {{
            border: 1px solid #ccc; border-radius: 4px; padding: 10px; overflow-x: auto; margin: 1.5em 0;
            white-space: pre-wrap; word-break: break-all;
        }}
        .codehilite strong {{ font-weight: bold !important; color: #CD0000 !important; }}
    </style>
    """
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"<!DOCTYPE html>\n<html lang='pt-BR'><head><meta charset='UTF-8'><title>Manual - Base de Conhecimento</title>{html_style}</head><body><div class='container'>")
            f.write("<h1>Manual - Base de Conhecimento</h1><section id='indice'><h2>Índice</h2><ul>")
            for i, (title, _) in enumerate(articles_data):
                anchor = f"artigo-{i}"
                f.write(f"<li><a href='#{anchor}'>{title}</a></li>")
            f.write("</ul></section>")
            for i, (title, html_content) in enumerate(articles_data):
                anchor = f"artigo-{i}"
                f.write(f"<article id='{anchor}'><h2>{title}</h2>{html_content}</article>")
            f.write("</div></body></html>")
        print(f"\n✅ Arquivo HTML '{filename}' criado com sucesso!")
    except Exception as e: print(f"\n❌ Erro ao salvar o arquivo HTML: {e}")

# Lógica principal de execução
if __name__ == "__main__":
    lista_de_links_extraidos = []

    if CONFIG['link_list_override']:
        print("ℹ️ MODO MANUAL: Usando a lista de links fornecida.")
        lista_de_links_extraidos = CONFIG['link_list_override']
    else:
        print(f"🚀 MODO AUTOMÁTICO: Iniciando a extração de links de: {CONFIG['base_url']}")
        with requests.Session() as session:
            session.headers.update(HTTP_HEADERS)
            main_soup = get_soup(session, CONFIG['base_url'])
            if main_soup:
                links = main_soup.select(CONFIG['article_links_selector'])
                if links:
                    unique_urls = set()
                    for link_element in links:
                        link_url = link_element.get('href')
                        if link_url and '#' not in link_url and '/cat/' not in link_url:
                            full_url = urljoin(CONFIG['base_url'], link_url)
                            unique_urls.add(full_url)
                    lista_de_links_extraidos = sorted(list(unique_urls))
                else: print(f"\n❌ Nenhum link de artigo encontrado com o seletor '{CONFIG['article_links_selector']}'.")

    if lista_de_links_extraidos:
        print(f"✅ Total de {len(lista_de_links_extraidos)} URLs para processar com até {CONFIG['MAX_WORKERS']} 'ajudantes'.")

        extracted_articles = []
        with requests.Session() as session:
            session.headers.update(HTTP_HEADERS)
            # A mágica da concorrência acontece aqui
            with concurrent.futures.ThreadPoolExecutor(max_workers=CONFIG['MAX_WORKERS']) as executor:
                # Mapeia a função de extração para cada URL, distribuindo o trabalho
                future_to_url = {executor.submit(extract_article_details, session, url): url for url in lista_de_links_extraidos}
                for future in concurrent.futures.as_completed(future_to_url):
                    result = future.result()
                    if result:
                        extracted_articles.append(result)

        if extracted_articles:
            extracted_articles.sort(key=lambda x: x[0])
            create_html_manual(extracted_articles, CONFIG['output_filename'])
        else: print("\n❌ Nenhum dado de artigo válido foi extraído.")
    else: print("\n❌ Nenhum link foi encontrado ou fornecido.")
