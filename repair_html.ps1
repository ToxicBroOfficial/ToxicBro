$path = 'index.html'
$text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$replacements = @{
  'â•' = '═'
  'âœ¦' = '✦'
  'ðŸ”´' = '🔔'
  'ðŸŽ®' = '🎮'
  'ðŸ”¥' = '📺'
  'â€”' = '—'
  'â€“' = '–'
  'â€œ' = '“'
  'â€' = '”'
  'â€˜' = '‘'
  'â€™' = '’'
  'â€¦' = '…'
  'â€¢' = '•'
  'â€' = '“'
  'â€‹' = '‌'
  'Â·' = '·'
  'Â©' = '©'
  'â' = ''
  'ð' = ''
  '�' = ''
}
foreach ($key in $replacements.Keys) {
  $text = $text.Replace($key, $replacements[$key])
}
[System.IO.File]::WriteAllText($path, $text, [System.Text.Encoding]::UTF8)
Write-Output 'rewritten'