from __future__ import annotations
import os
import pathlib
import re
import urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
font_dir = root / 'fonts'
font_dir.mkdir(exist_ok=True)

css_url = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;600;700&family=Exo+2:wght@400;500;600;700&display=optional'

with urllib.request.urlopen(css_url, timeout=30) as response:
    css_text = response.read().decode('utf-8')

urls = []
for match in re.finditer(r'url\((https://fonts.gstatic.com/[^)]+)\)', css_text):
    urls.append(match.group(1))
urls = list(dict.fromkeys(urls))

for url in urls:
    filename = os.path.basename(url.split('?')[0])
    output_path = font_dir / filename
    if not output_path.exists():
        urllib.request.urlretrieve(url, output_path)
    print(f'downloaded {output_path.name}')

lines: list[str] = []
for url in urls:
    filename = os.path.basename(url.split('?')[0])
    lower = filename.lower()
    if 'bebas' in lower:
        lines.append(f"@font-face {{\n  font-family: 'Bebas Neue';\n  src: url('./{filename}') format('woff2');\n  font-weight: 400;\n  font-style: normal;\n  font-display: optional;\n}}\n")
    elif 'rajdhani' in lower:
        if 'semi' in lower or '600' in lower:
            weight = 600
        elif 'bold' in lower or '700' in lower:
            weight = 700
        else:
            weight = 400
        lines.append(f"@font-face {{\n  font-family: 'Rajdhani';\n  src: url('./{filename}') format('woff2');\n  font-weight: {weight};\n  font-style: normal;\n  font-display: optional;\n}}\n")
    elif 'exo2' in lower or 'exo' in lower:
        if 'medium' in lower or '500' in lower:
            weight = 500
        elif 'semi' in lower or '600' in lower:
            weight = 600
        elif 'bold' in lower or '700' in lower:
            weight = 700
        else:
            weight = 400
        lines.append(f"@font-face {{\n  font-family: 'Exo 2';\n  src: url('./{filename}') format('woff2');\n  font-weight: {weight};\n  font-style: normal;\n  font-display: optional;\n}}\n")

(font_dir / 'site-fonts.css').write_text(''.join(lines), encoding='utf-8')
print('wrote', font_dir / 'site-fonts.css')
