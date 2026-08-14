Param(
  [string]$envFile = '.env.local'
)

Write-Host "Vérification des variables d'environnement (fichier: $envFile)"
if (Test-Path $envFile) {
  $content = Get-Content $envFile | Where-Object { $_ -and ($_ -notmatch '^#') }
  $vars = $content -replace '"', '' -split "\n" | ForEach-Object { ($_ -split '=')[0].Trim() }
} else {
  $vars = [System.Environment]::GetEnvironmentVariables().Keys
}

$required = @(
  'DATABASE_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY', 'OPENAI_API_KEY'
)

$missing = @()
foreach ($r in $required) {
  if (-not ($vars -contains $r)) { $missing += $r }
}

if ($missing.Count -eq 0) {
  Write-Host "Toutes les variables requises semblent présentes." -ForegroundColor Green
} else {
  Write-Host "Variables manquantes:" -ForegroundColor Yellow
  $missing | ForEach-Object { Write-Host " - $_" }
}

Write-Host "Astuce: sur Vercel, ajoute les variables dans Settings → Environment Variables." -ForegroundColor Cyan
