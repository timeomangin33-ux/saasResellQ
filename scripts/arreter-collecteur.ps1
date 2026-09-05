# Arrete le collecteur, vraiment.
#
# La version precedente faisait « taskkill /F /IM node.exe ». Deux problemes :
# elle visait tous les Node de la machine, y compris ceux qui n'ont rien a voir
# avec ce projet, et surtout elle echouait en silence — le collecteur tournait
# toujours apres « Collecte en pause », ce qui faisait rater le prisma generate
# suivant sur EPERM, sans que rien n'explique pourquoi.
#
# Ici on vise les processus par leur ligne de commande : ceux qui executent
# scripts/collector.ts, et eux seuls. On tue l'arbre, parce que npm lance tsx
# qui lance node : tuer le parent laisse les enfants vivants, et ce sont les
# enfants qui tiennent le moteur Prisma ouvert.

$ErrorActionPreference = 'SilentlyContinue'

# Le veilleur d'abord : le laisser actif reviendrait a relancer le collecteur
# cinq minutes plus tard, au milieu du build qu'on essaie de proteger.
schtasks /Change /TN "ResellQ - Veilleur collecteur" /DISABLE | Out-Null

# Deux familles de processus a arreter, et l'ordre compte.
#
# demarrer-collecteur.cmd est un superviseur : quand le collecteur s'arrete, il
# le relance trente secondes plus tard. Tuer d'abord le collecteur revient donc
# a le voir revenir tout seul — c'est exactement ce qui se passait, et ce qui
# faisait echouer « prisma generate » juste apres un « collect:pause » reussi.
# On coupe donc le superviseur en premier, le collecteur ensuite.
$motifs = @(
  @{ Nom = 'cmd.exe';  Motif = 'demarrer-collecteur' },
  @{ Nom = 'node.exe'; Motif = 'collector\.ts' }
)

$tues = 0
foreach ($m in $motifs) {
  $cibles = Get-CimInstance Win32_Process -Filter "Name='$($m.Nom)'" |
    Where-Object { $_.CommandLine -and $_.CommandLine -match $m.Motif }
  foreach ($p in $cibles) {
    & taskkill /F /T /PID $p.ProcessId | Out-Null
    $tues++
  }
}

Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $env:TEMP 'resellq-collecteur.lock')

# On verifie au lieu d'affirmer : un message « en pause » qui ment coute une
# heure de diagnostic la prochaine fois que le build echoue.
Start-Sleep -Milliseconds 1500
$restants = @(Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -and $_.CommandLine -match 'collector\.ts|demarrer-collecteur' })

if ($restants.Count -gt 0) {
  Write-Host "ATTENTION : $($restants.Count) processus collecteur resiste(nt). PID : $($restants.ProcessId -join ', ')"
  exit 1
}

Write-Host "Collecte arretee ($tues processus). Relancez-la avec : npm run collect:resume"
exit 0
