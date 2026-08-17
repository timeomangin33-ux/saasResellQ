param()
# Replaces common garbled UTF-8 sequences and HTML entities across repository files
$exts = @('*.md','*.tsx','*.ts','*.js','*.json','*.html','*.txt','*.yaml','*.yml')
$replacements = @{
    'Ã©'='é'; 'Ã¨'='è'; 'Ãª'='ê'; 'Ã«'='ë'; 'Ã´'='ô'; 'Ã§'='ç'; 'Â'='';
    'â€™'='’'; 'â€“'='–'; 'â€”'='—'; 'â€¦'='…'; '&apos;'="'"; '&rsquo;'='’'; '&nbsp;'=' ';
    '&quot;'='"'; '&amp;apos;'="'"; 'â€œ'='“'; 'â€'='”'; 'Ã'='à';
}
Get-ChildItem -Path . -Include $exts -Recurse -File | ForEach-Object {
    $path = $_.FullName
    try { $content = Get-Content -Raw -LiteralPath $path -ErrorAction Stop } catch { return }
    $new = $content
    foreach ($k in $replacements.Keys) { $new = $new -replace [regex]::Escape($k), $replacements[$k] }
    if ($new -ne $content) { Set-Content -LiteralPath $path -Value $new; Write-Host "Updated: $path" }
}

Write-Host "Text sweep completed"
