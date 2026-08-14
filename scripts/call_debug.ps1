
Param(
  [string]$Token,
  [string]$HostUrl = 'https://resellq.com'
)

if (-not $Token) {
  Write-Host "Usage: .\scripts\call_debug.ps1 -Token '<DEBUG_TOKEN>' [-HostUrl 'https://resellq.com']"
  exit 1
}

$headers = @{ 'x-debug-token' = $Token }
try {
  $uri = "$HostUrl/api/debug/env"
  $resp = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers -ErrorAction Stop
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
