#!/usr/bin/env python3
"""Builds the PDF manuals of the FDX-HS web application from the Markdown sources of this folder.

Two editions: `user` (customer manual, FDX-HS-UM-004) and `service` (installers and FDX service).
Each one concatenates its files into one self-contained HTML (FDX branding, embedded screenshots,
numbered sections, table of contents) and prints it with headless Chromium.
Needs: python3-markdown, chromium, internet access (Google Fonts).
"""
import argparse
import base64
import datetime
import os
import re
import shutil
import struct
import subprocess
import sys

import markdown

HERE = os.path.dirname(os.path.abspath(__file__))
LANGS = {
    'en': {
        'product': 'FDX-HS-CM', 'site': 'fdx.systems',
        'title': {'user': 'Web Application User Manual', 'service': 'Web Application Service Manual'},
        'related': {
            'user': 'FDX-HS-UM-001 Quick Guide · FDX-HS-UM-002 User Manual · FDX-HS-UM-003 Terminal Connection Diagram',
            'service': 'FDX-HS-UM-004 Web Application User Manual · FDX-HS-UM-002 User Manual'},
        'doc_info': 'Document information', 'document': 'Document', 'product_l': 'Product', 'version': 'Version',
        'date': 'Date', 'related_l': 'Related', 'support': 'Support', 'distribution': 'Distribution',
        'distribution_txt': 'Restricted to installers and FDX service personnel. Do not hand over to the end customer.',
        'symbols': 'Symbols and conventions used in this manual', 'symbol': 'Symbol', 'meaning': 'Meaning',
        'NOTE': 'NOTE', 'WARNING': 'WARNING',
        'note_txt': 'Information that helps the operator make better use of the equipment, with no associated hazard.',
        'warning_txt': 'Potential hazard which, if not avoided, could result in damage to the equipment or injury.',
        'bold': 'Bold text',
        'bold_txt': 'Text shown on screen: buttons, fields, messages and menu entries, exactly as they appear.',
        'restricted_footer': 'Restricted: authorized personnel only',
        'restricted_tag': 'RESTRICTED · AUTHORIZED PERSONNEL ONLY', 'toc': 'Table of contents',
    },
    'es': {
        'product': 'FDX-HS-CM', 'site': 'fdx-ingenieria.com',
        'title': {'user': 'Manual de usuario de la aplicación web', 'service': 'Manual de servicio de la aplicación web'},
        'related': {
            'user': 'FDX-HS-UM-001 Guía rápida · FDX-HS-UM-002 Manual de usuario · FDX-HS-UM-003 Diagrama de conexión de terminales',
            'service': 'FDX-HS-UM-004 Manual de usuario de la aplicación web · FDX-HS-UM-002 Manual de usuario'},
        'doc_info': 'Información del documento', 'document': 'Documento', 'product_l': 'Producto', 'version': 'Versión',
        'date': 'Fecha', 'related_l': 'Relacionados', 'support': 'Soporte', 'distribution': 'Distribución',
        'distribution_txt': 'Restringida a instaladores y personal de servicio de FDX. No entregar al cliente final.',
        'symbols': 'Símbolos y convenciones utilizados en este manual', 'symbol': 'Símbolo', 'meaning': 'Significado',
        'NOTE': 'NOTA', 'WARNING': 'ADVERTENCIA',
        'note_txt': 'Información que ayuda al operador a aprovechar mejor el equipo, sin riesgo asociado.',
        'warning_txt': 'Riesgo potencial que, si no se evita, puede provocar daños al equipo o lesiones.',
        'bold': 'Texto en negrita',
        'bold_txt': 'Texto que aparece en pantalla (botones, campos, mensajes y menús), en inglés y tal como se muestra en la interfaz.',
        'restricted_footer': 'Restringido: solo personal autorizado',
        'restricted_tag': 'RESTRINGIDO · SOLO PERSONAL AUTORIZADO', 'toc': 'Índice',
    },
}
EDITIONS = {
    'user': {
        'code': 'FDX-HS-UM-004',
        'files': [
            '00-introduction.md',
            'components/shell.md',
            'components/overview.md',
            'components/system.md',
            'components/labels.md',
            'components/sensors.md',
            'components/alarms.md',
            'components/rfid-config.md',
            'components/modbus.md',
            '99-reference.md',
        ],
        'restricted': False,
    },
    'service': {
        'code': 'FDX-HS-UM-005',
        'files': [
            'admin/00-service-access.md',
            'admin/system.md',
            'admin/labels.md',
            'admin/alarms.md',
            'admin/rfid-config.md',
            'admin/installation.md',
            'admin/logs.md',
        ],
        'restricted': True,
    },
}
BRAND_DIR = os.path.expanduser(
    '~/.claude/skills/synced/9283a106-975b-45b2-a49f-9e5a39e72813_d5e22a3b-c5aa-46c1-9e87-274e7d5ad014/'
    'fdx-brand-presentations/assets/brand')


def key_of(rel):
    return os.path.splitext(rel)[0].replace('components/', '').replace('/', '-')


def data_uri(path, mime):
    with open(path, 'rb') as f:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())


def png_size(path):
    with open(path, 'rb') as f:
        head = f.read(24)
    return struct.unpack('>II', head[16:24])


def inline_svg(path, prefix):
    svg = re.sub(r'<\?xml[^>]*\?>', '', open(path).read())
    # The light and dark logos share class names: make them unique per use.
    return svg.replace('cls-', prefix + '-')


def render_file(root, rel, number, included, L):
    src = open(os.path.join(root, rel)).read()
    base = os.path.dirname(rel)
    key = key_of(rel)

    def fix_link(m):
        text, target = m.group(1), m.group(2)
        if target.startswith('http'):
            return m.group(0)
        path, _, anchor = target.partition('#')
        target_key = key_of(os.path.normpath(os.path.join(base, path))) if path else key
        if target_key not in included:
            return text  # the target is in the other edition: keep the words, drop the link
        return '[%s](#%s)' % (text, '%s--%s' % (target_key, anchor) if anchor else 'doc-' + target_key)

    src = re.sub(r'(?<!!)\[([^\]]+)\]\(([^)\s]+)\)', fix_link, src)
    body = markdown.Markdown(extensions=['tables', 'toc', 'attr_list', 'fenced_code', 'sane_lists']).convert(src)
    body = re.sub(r'id="([^"]+)"', lambda m: 'id="%s--%s"' % (key, m.group(1)), body)

    def figure(m):
        alt, src_path = m.group(1), m.group(2)
        full = os.path.normpath(os.path.join(root, base, src_path))
        w, h = png_size(full)
        # Phone screenshots, alone or side by side, are kept smaller than desktop ones.
        cls = 'portrait' if h > w or os.path.basename(full).startswith('phone-') else ''
        return '<figure class="%s"><img src="%s" alt="%s"><figcaption>%s</figcaption></figure>' % (
            cls, data_uri(full, 'image/png'), alt, alt)

    body = re.sub(r'<p><img alt="([^"]*)" src="([^"]+)"\s*/?>\s*</p>', figure, body)

    def callout(m):
        kind = m.group(1)
        return '<div class="callout %s"><div class="callout-label">%s</div><div>%s</div></div>' % (
            kind.lower(), L[kind], m.group(2).strip())

    body = re.sub(r'<blockquote>\s*<p><strong>(NOTE|WARNING):</strong>(.*?)</p>\s*</blockquote>',
                  callout, body, flags=re.S)

    # Number the H1 and H2 headings and collect them for the table of contents.
    toc = []
    h2 = [0]

    def num_h1(m):
        toc.append((1, '%d' % number, m.group(1), m.group(2)))
        return '<h1 id="%s"><span class="num">%d</span>%s</h1>' % (m.group(1), number, m.group(2))

    def num_h2(m):
        h2[0] += 1
        n = '%d.%d' % (number, h2[0])
        toc.append((2, n, m.group(1), m.group(2)))
        return '<h2 id="%s"><span class="num">%s</span>%s</h2>' % (m.group(1), n, m.group(2))

    body = re.sub(r'<h1 id="([^"]+)">(.*?)</h1>', num_h1, body)
    body = re.sub(r'<h2 id="([^"]+)">(.*?)</h2>', num_h2, body)
    return '<section class="chapter" id="doc-%s">%s</section>' % (key, body), toc


CSS = r"""
@import url('https://fonts.googleapis.com/css2?family=Changa+One&family=Montserrat:wght@400;500;600;700&display=swap');
:root { --red:#F70000; --bordo:#9F0018; --navy:#09013B; --grey:#B2B2B2; --light:#EBEBEB; --ink:#1d1a3a; }
@page {
  size: A4; margin: 20mm 17mm 18mm 17mm;
  @top-left { content: "%(site)s"; font: 600 8pt Montserrat, sans-serif; color: var(--red); }
  @top-right { content: "%(code)s  ·  %(title)s"; font: 500 8pt Montserrat, sans-serif; color: #8a8a8a; }
  @bottom-left { content: "%(footer)s"; font: 500 8pt Montserrat, sans-serif; color: #8a8a8a; }
  @bottom-right { content: "FDX   " counter(page); font: 700 8pt Montserrat, sans-serif; color: var(--navy); }
}
@page :first { margin: 0; @top-left { content: none; } @top-right { content: none; }
  @bottom-left { content: none; } @bottom-right { content: none; } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: Montserrat, sans-serif; font-size: 9.5pt; line-height: 1.5; color: var(--ink); margin: 0; }
.cover { height: 297mm; width: 210mm; position: relative; page-break-after: always; overflow: hidden; background: #fff; }
.cover .band { position: absolute; left: 0; right: 0; bottom: 0; height: 92mm; background: var(--navy); }
.cover .accent { position: absolute; left: 0; right: 0; bottom: 92mm; height: 3mm; background: var(--red); }
.cover .logo { position: absolute; top: 26mm; left: 22mm; height: 22mm; }
.cover .logo svg { height: 22mm; width: auto; }
.cover .product { position: absolute; top: 92mm; left: 22mm; height: 30mm; }
.cover h1 { position: absolute; top: 140mm; left: 22mm; right: 22mm; margin: 0; font: 400 34pt 'Changa One', sans-serif; color: var(--navy); line-height: 1.1; }
.cover .sub { position: absolute; top: 172mm; left: 22mm; font: 600 13pt Montserrat, sans-serif; color: var(--bordo); }
.cover .restricted { position: absolute; top: 182mm; left: 22mm; font: 700 9pt Montserrat, sans-serif; letter-spacing: .08em; color: #fff; background: var(--red); padding: 1.5mm 3mm; border-radius: 1mm; }
.cover .meta { position: absolute; bottom: 22mm; left: 22mm; right: 22mm; color: #fff; font-size: 9.5pt; display: flex; justify-content: space-between; align-items: flex-end; }
.cover .meta b { display: block; font-size: 11pt; margin-bottom: 2mm; }
.cover .web { font: 700 14pt Montserrat, sans-serif; color: #fff; }
.front h2, .toc h2 { font: 400 18pt 'Changa One', sans-serif; color: var(--navy); margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 2px solid var(--red); }
.front, .toc { page-break-after: always; }
.toc ol { list-style: none; padding: 0; margin: 0; }
.toc li { display: flex; gap: 4mm; padding: 1.2mm 0; border-bottom: 1px dotted #d6d6d6; }
.toc li.l1 { font-weight: 700; color: var(--navy); margin-top: 3mm; border-bottom-color: #bbb; }
.toc li.l2 { padding-left: 9mm; font-size: 9pt; }
.toc li .n { min-width: 9mm; color: var(--red); font-weight: 700; }
.toc a { color: inherit; text-decoration: none; border: 0; }
.chapter { page-break-before: always; }
h1 { font: 400 22pt 'Changa One', sans-serif; color: var(--navy); margin: 0 0 5mm; padding-bottom: 2.5mm; border-bottom: 3px solid var(--red); }
h2 { font: 700 13pt Montserrat, sans-serif; color: var(--navy); margin: 7mm 0 2.5mm; page-break-after: avoid; }
h3 { font: 700 10.5pt Montserrat, sans-serif; color: var(--bordo); margin: 5mm 0 2mm; page-break-after: avoid; }
.num { color: var(--red); margin-right: 3mm; }
p { margin: 0 0 2.5mm; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: 1mm; }
a { color: var(--bordo); text-decoration: none; border-bottom: 1px dotted var(--bordo); }
code { font-family: 'DejaVu Sans Mono', monospace; font-size: 8.5pt; background: var(--light); padding: 0.2mm 1.2mm; border-radius: 1mm; }
table { width: 100%%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 8.8pt; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th { background: var(--navy); color: #fff; text-align: left; font-weight: 600; padding: 1.8mm 2.5mm; }
td { padding: 1.6mm 2.5mm; border-bottom: 1px solid #dcdcdc; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f6f6f6; }
th:empty { display: none; }
figure { margin: 3mm 0 5mm; page-break-inside: avoid; text-align: center; }
figure img { max-width: 100%%; max-height: 90mm; border: 1px solid #d0d0d0; border-radius: 1.5mm; box-shadow: 0 1mm 3mm rgba(9,1,59,.12); }
figure.portrait img { max-height: 75mm; }
figcaption { font-size: 8pt; color: #7a7a7a; margin-top: 1.5mm; font-style: italic; }
.callout { display: flex; gap: 3mm; border-left: 4px solid var(--navy); background: #f1f0f7; padding: 2.5mm 3.5mm; margin: 3mm 0 4mm; page-break-inside: avoid; }
.callout.warning { border-left-color: var(--red); background: #fff1f1; }
.callout-label { font-weight: 700; font-size: 8pt; letter-spacing: .06em; color: var(--navy); min-width: 17mm; padding-top: 0.4mm; }
.callout.warning .callout-label { color: var(--red); }
.conv td:first-child { width: 30mm; }
"""


def build_html(ed, edition, lang, version, date):
    L = LANGS[lang]
    root = HERE if lang == 'en' else os.path.join(HERE, lang)
    included = {key_of(rel) for rel in ed['files']}
    chapters, toc = [], []
    for i, rel in enumerate(ed['files'], start=1):
        part, entries = render_file(root, rel, i, included, L)
        chapters.append(part)
        toc.extend(entries)

    toc_html = ''.join('<li class="l%d"><span class="n">%s</span><a href="#%s">%s</a></li>' % e for e in toc)
    footer = L['product'] + ('  ·  ' + L['restricted_footer'] if ed['restricted'] else '')
    v = dict(L, code=ed['code'], title=L['title'][edition], related=L['related'][edition], version_no=version,
             date_v=date, footer=footer, lang=lang)
    css = CSS % v
    restricted_row = ('<tr><td><b>%(distribution)s</b></td><td>%(distribution_txt)s</td></tr>' % v) if ed['restricted'] else ''
    restricted_tag = ('<div class="restricted">%(restricted_tag)s</div>' % v) if ed['restricted'] else ''

    front = """
<section class="front">
  <h2>%(doc_info)s</h2>
  <table class="conv"><tbody>
    <tr><td><b>%(document)s</b></td><td>%(code)s, %(title)s</td></tr>
    <tr><td><b>%(product_l)s</b></td><td>%(product)s</td></tr>
    <tr><td><b>%(version)s</b></td><td>%(version_no)s</td></tr>
    <tr><td><b>%(date)s</b></td><td>%(date_v)s</td></tr>
    <tr><td><b>%(related_l)s</b></td><td>%(related)s</td></tr>
    %(restricted_row)s
    <tr><td><b>%(support)s</b></td><td>support@fdx.systems · %(site)s</td></tr>
  </tbody></table>
  <h2 style="margin-top:10mm">%(symbols)s</h2>
  <table class="conv"><thead><tr><th>%(symbol)s</th><th>%(meaning)s</th></tr></thead><tbody>
    <tr><td><div class="callout" style="margin:0;padding:1mm 2mm"><div class="callout-label">%(NOTE)s</div></div></td><td>%(note_txt)s</td></tr>
    <tr><td><div class="callout warning" style="margin:0;padding:1mm 2mm"><div class="callout-label">%(WARNING)s</div></div></td><td>%(warning_txt)s</td></tr>
    <tr><td><b>%(bold)s</b></td><td>%(bold_txt)s</td></tr>
  </tbody></table>
</section>""" % dict(v, restricted_row=restricted_row)

    return """<!doctype html><html lang="%(lang)s"><head><meta charset="utf-8"><title>%(code)s %(title)s</title>
<style>%(css)s</style></head><body>
<section class="cover">
  <div class="logo">%(logo)s</div>
  <img class="product" src="%(product_img)s" alt="FDX HS">
  <h1>%(title)s</h1>
  <div class="sub">%(product)s</div>
  %(restricted_tag)s
  <div class="accent"></div><div class="band"></div>
  <div class="meta"><div><b>%(code)s</b>%(version)s %(version_no)s · %(date_v)s</div><div class="web">%(site)s</div></div>
</section>
%(front)s
<section class="toc"><h2>%(toc_title)s</h2><ol>%(toc)s</ol></section>
%(chapters)s
</body></html>""" % dict(v, css=css, logo=inline_svg(os.path.join(BRAND_DIR, 'logo-fdx.svg'), 'cvl'),
                          product_img=data_uri(os.path.join(BRAND_DIR, 'producto-hs.png'), 'image/png'),
                          restricted_tag=restricted_tag, front=front, toc_title=L['toc'], toc=toc_html,
                          chapters='\n'.join(chapters))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--edition', choices=sorted(EDITIONS), default='user')
    ap.add_argument('--lang', choices=sorted(LANGS), default='en', help='es reads the translation in es/')
    ap.add_argument('--version', default='Draft', help='document version, e.g. v1.0.0-rc1')
    ap.add_argument('--date', default=datetime.date.today().isoformat())
    ap.add_argument('--out', help='output PDF path (default: <code>-<LANG>.pdf)')
    ap.add_argument('--html-only', action='store_true', help='write the HTML and skip the PDF')
    args = ap.parse_args()
    ed = EDITIONS[args.edition]
    out = args.out or '%s-%s.pdf' % (ed['code'], args.lang.upper())
    if args.version == 'Draft' and args.lang == 'es':
        args.version = 'Borrador'

    # The snap Chromium cannot read /tmp, so work in a folder it can reach.
    work = os.path.expanduser('~/snap/chromium/common/fdx-manual')
    os.makedirs(work, exist_ok=True)
    html_path = os.path.join(work, '%s-%s.html' % (args.edition, args.lang))
    with open(html_path, 'w') as f:
        f.write(build_html(ed, args.edition, args.lang, args.version, args.date))
    if args.html_only:
        print(html_path)
        return
    browser = shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
    if not browser:
        sys.exit('chromium not found')
    pdf_tmp = os.path.join(work, '%s-%s.pdf' % (args.edition, args.lang))
    subprocess.run([browser, '--headless=new', '--no-pdf-header-footer', '--virtual-time-budget=15000',
                    '--user-data-dir=' + os.path.join(work, 'profile'), '--print-to-pdf=' + pdf_tmp,
                    'file://' + html_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    shutil.copyfile(pdf_tmp, out)
    print(os.path.abspath(out))


if __name__ == '__main__':
    main()
