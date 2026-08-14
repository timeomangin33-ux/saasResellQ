Param(
  [string]$Token,
  [string]$Host = 'https://resellq.com'
)

if (-not $Token) {
  Write-Host "Usage: .\scripts\call_debug.ps1 -Token '<DEBUG_TOKEN>' [-Host 'https://resellq.com']"
  exit 1
}

$headers = @{ 'x-debug-token' = $Token }
try {
  $resp = Invoke-RestMethod -Uri "$Host/api/debug/env" -Method Get -Headers $headers
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
