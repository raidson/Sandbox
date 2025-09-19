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
import argparse

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
            "article_links_selector": None, # Não aplicável para processamento direto de URLs
            "title_selector": 'h1#firstHeading',
            "content_selector": 'div#mw-content-text .mw-parser-output',
        }
    ]
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

def extract_article_details(session, article_url, source_config):
    """Extrai o título e o conteúdo HTML de uma página usando uma configuração de fonte específica."""
    if "#" in article_url.split('/')[-1]: return None
    print(f"  -> Processando [{source_config['name']}]: {article_url}")
    soup = get_soup(session, article_url)
    if not soup: return None
    title_element = soup.select_one(source_config['title_selector'])
    if not title_element:
        print(f"    -> Título não encontrado, pulando página (provavelmente uma categoria).")
        return None
    title = title_element.get_text(strip=True)
    content_element = soup.select_one(source_config['content_selector'])
    html_content = process_html_content(source_config['base_url'], content_element)
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

def get_source_config_for_url(url):
    for source in CONFIG['SOURCES']:
        if source['domain_match'] in url:
            return source
    return None

# Lógica principal de execução
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Gera um manual HTML a partir de URLs específicas ou escaneando um site.",
        epilog="Exemplos:\n"
               "  python gerador_manual.py https://.../artigo1\n"
               "  python gerador_manual.py --scan https://.../ --limit 50"
    )
    parser.add_argument('urls', metavar='URL', type=str, nargs='*',
                        help='URLs para extrair o conteúdo diretamente.')
    parser.add_argument('--scan', metavar='URL_RAIZ', type=str,
                       help='URL raiz para iniciar a varredura automática de links.')
    parser.add_argument('--limit', metavar='N', type=int, default=50,
                        help='Número máximo de páginas a serem capturadas no modo de varredura (padrão: 50).')

    args = parser.parse_args()

    lista_de_links_para_processar = []

    if args.urls:
        print("ℹ️ MODO MANUAL: Usando URLs fornecidas via linha de comando.")
        lista_de_links_para_processar = args.urls
    elif args.scan:
        print(f"🚀 MODO DE VARREDURA: Iniciando extração de links de: {args.scan}")
        scan_source_config = get_source_config_for_url(args.scan)
        if not scan_source_config or not scan_source_config.get('article_links_selector'):
            print(f"   ❌ O modo de varredura não é suportado para a URL fornecida (fonte não encontrada ou sem 'article_links_selector').")
        else:
            with requests.Session() as session:
                session.headers.update(HTTP_HEADERS)
                main_soup = get_soup(session, args.scan)
                if main_soup:
                    links = main_soup.select(scan_source_config['article_links_selector'])
                    if links:
                        unique_urls = set()
                        for link_element in links:
                            link_url = link_element.get('href')
                            if link_url and '#' not in link_url:
                                full_url = urljoin(scan_source_config['base_url'], link_url)
                                # Simple filter to stay on the same domain
                                if scan_source_config['domain_match'] in full_url:
                                    unique_urls.add(full_url)

                        lista_de_links_para_processar = sorted(list(unique_urls))[:args.limit]
                        print(f"   ✅ {len(links)} links encontrados. Processando os primeiros {len(lista_de_links_para_processar)} (limite: {args.limit}).")
                    else:
                        print(f"\n❌ Nenhum link de artigo encontrado com o seletor '{scan_source_config['article_links_selector']}'.")
    else:
        # Modo automático legado
        print("Nenhuma URL ou opção --scan fornecida. Use --help para mais informações.")

    if lista_de_links_para_processar:
        print(f"✅ Total de {len(lista_de_links_para_processar)} URLs para processar com até {CONFIG['MAX_WORKERS']} 'ajudantes'.")

        extracted_articles = []
        with requests.Session() as session:
            session.headers.update(HTTP_HEADERS)
            with concurrent.futures.ThreadPoolExecutor(max_workers=CONFIG['MAX_WORKERS']) as executor:
                future_to_url = {}
                for url in lista_de_links_para_processar:
                    source_config = get_source_config_for_url(url)
                    if source_config:
                        future = executor.submit(extract_article_details, session, url, source_config)
                        future_to_url[future] = url
                    else:
                        print(f"  [AVISO] Nenhuma fonte de configuração encontrada para a URL: {url}")

                for future in concurrent.futures.as_completed(future_to_url):
                    result = future.result()
                    if result:
                        extracted_articles.append(result)

        if extracted_articles:
            extracted_articles.sort(key=lambda x: x[0])
            create_html_manual(extracted_articles, CONFIG['output_filename'])
        else:
            print("\n❌ Nenhum dado de artigo válido foi extraído.")
    elif not args.scan: # Only show this if not in scan mode which has its own messages
        print("\n❌ Nenhum link foi encontrado ou fornecido. Use --help para ver as opções.")
