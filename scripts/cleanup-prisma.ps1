# Cleanup script to attempt to remove .prisma client files that may be locked on Windows
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/cleanup-prisma.ps1

$prismaClientPath = Join-Path -Path $PSScriptRoot -ChildPath "..\node_modules\.prisma\client"
$prismaClientPath = [IO.Path]::GetFullPath($prismaClientPath)
Write-Host "Prisma client path: $prismaClientPath"

if (Test-Path $prismaClientPath) {
  try {
    Write-Host "Attempting to remove folder: $prismaClientPath"
    Remove-Item -LiteralPath $prismaClientPath -Force -Recurse -ErrorAction Stop
    Write-Host "Removed prisma client folder"
  } catch {
    Write-Warning "Failed to remove prisma client folder: $_"
    Write-Host "Try closing editors, terminals or OneDrive syncing, then re-run this script."
    exit 1
  }
} else {
  Write-Host "Prisma client folder not found. Nothing to do."
}

# Also remove temporary dll files if present
$pattern = Join-Path -Path (Join-Path -Path $PSScriptRoot -ChildPath "..\node_modules\.prisma\client") -ChildPath "query_engine-windows.dll.node.tmp*"
$pattern = [IO.Path]::GetFullPath($pattern)
Write-Host "Checking for temp files: $pattern"
Get-ChildItem -Path (Split-Path $pattern) -Filter "query_engine-windows.dll.node.tmp*" -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction Stop
    Write-Host "Removed temp file: $($_.FullName)"
  } catch {
    Write-Warning "Could not remove temp file: $($_.FullName) - $_"
  }
}

Write-Host "Cleanup complete. Run 'npm run build' again when ready."
