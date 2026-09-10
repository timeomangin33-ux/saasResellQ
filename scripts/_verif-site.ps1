$pages = @(
  'https://www.resellq.com/',
  'https://www.resellq.com/prix',
  'https://www.resellq.com/prix/nike',
  'https://www.resellq.com/pricing',
  'https://www.resellq.com/auth/signup'
)
foreach ($u in $pages) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 30
    $c = $r.Content
    $titre = if ($c -match '<title>([^<]*)</title>') { $Matches[1] } else { '(pas de titre)' }
    $h1 = if ($c -match '<h1[^>]*>([^<]{0,120})') { $Matches[1] -replace '<[^>]+>','' } else { '(pas de h1)' }
    $vente = ([regex]::Matches($c, 'prix de vente')).Count
    $nan = ([regex]::Matches($c, 'NaN|undefined|null%|Infinity')).Count
    Write-Host ("HTTP {0}  {1,7} o  {2}" -f $r.StatusCode, $c.Length, $u)
    Write-Host ("    titre : {0}" -f $titre)
    Write-Host ("    h1    : {0}" -f $h1)
    Write-Host ("    « prix de vente » : {0}   NaN/undefined/null% : {1}" -f $vente, $nan)
  } catch {
    Write-Host ("ECHEC  {0} -> {1}" -f $u, $_.Exception.Message)
  }
}
