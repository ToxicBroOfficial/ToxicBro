from pathlib import Path

p = Path('index.html')
text = p.read_text(encoding='utf-8', errors='replace')
replacements = {
    'â•': '═',
    'â€”': '—',
    'âˆ’': '−',
    'âœ•': '✕',
    'ðŸ“‹': '📋',
    'ðŸŽ®': '🎮',
    'ðŸ”´': '🔔',
    'â€™': '’',
    'â€“': '–',
    'â€œ': '“',
    'â€': '”',
    'â€˜': '‘',
    'â€¦': '…',
    'â€¢': '•',
    'â€': '“',
    'â€‹': '‌',
    'â': '',
    'ð': '',
    '�': '',
}
for old, new in replacements.items():
    text = text.replace(old, new)

p.write_text(text, encoding='utf-8')
print('rewritten')
