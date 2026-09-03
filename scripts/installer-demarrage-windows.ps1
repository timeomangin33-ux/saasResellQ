<#
    Installe le collecteur Vinted pour qu'il tourne tout seul, sans jamais
    afficher de fenetre.

    A lancer une fois, depuis la racine du projet :

        powershell -ExecutionPolicy Bypass -File .\scripts\installer-demarrage-windows.ps1

    Pour tout enlever :

        powershell -ExecutionPolicy Bypass -File .\scripts\installer-demarrage-windows.ps1 -Desinstaller

    Deux mecanismes, tous deux invisibles :

    1. Un raccourci dans le dossier Demarrage de la session, qui lance le
       collecteur a l'ouverture de session.
    2. Une tache planifiee toutes les cinq minutes, le veilleur, qui le relance
       s'il s'est arrete.

    Les deux passent par lancer-invisible.vbs. C'est indispensable : une fenetre
    de console qui s'ouvre, meme reduite et pour une fraction de seconde, prend
    le focus. Toutes les cinq minutes, sur un poste ou l'on joue, cela rend la
    machine inutilisable.

    Pour voir ce que fait la collecte : npm run collect:status
#>

param(
    [switch]$Desinstaller
)

$ErrorActionPreference = 'Stop'

$nomTache = 'ResellQ - Veilleur collecteur'
$racine = Split-Path -Parent $PSScriptRoot
$invisible = Join-Path $PSScriptRoot 'lancer-invisible.vbs'
$lanceur = Join-Path $PSScriptRoot 'demarrer-collecteur.cmd'
$veilleur = Join-Path $PSScriptRoot 'veiller-collecteur.cmd'
$dossierDemarrage = [Environment]::GetFolderPath('Startup')
$raccourci = Join-Path $dossierDemarrage 'ResellQ - Collecteur Vinted.lnk'

if ($Desinstaller) {
    $fait = $false

    if (Test-Path $raccourci) {
        Remove-Item $raccourci -Force
        Write-Host "Raccourci de demarrage supprime."
        $fait = $true
    }

    $sortie = schtasks /Delete /TN $nomTache /F 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Veilleur supprime."
        $fait = $true
    }

    # L'ancienne tache, si elle existe encore sous son premier nom.
    schtasks /Delete /TN 'ResellQ - Collecteur Vinted' /F 2>&1 | Out-Null

    if (-not $fait) { Write-Host "Rien a desinstaller." }
    return
}

foreach ($fichier in @($invisible, $lanceur, $veilleur)) {
    if (-not (Test-Path $fichier)) { throw "Fichier introuvable : $fichier" }
}

# 1. Le raccourci de demarrage, qui pointe sur le lanceur invisible.
$shell = New-Object -ComObject WScript.Shell
$lien = $shell.CreateShortcut($raccourci)
$lien.TargetPath = 'wscript.exe'
$lien.Arguments = "`"$invisible`" `"$lanceur`""
$lien.WorkingDirectory = $racine
$lien.Description = 'Collecte en continu les annonces Vinted et alimente la base ResellQ.'
$lien.Save()
Write-Host "Raccourci de demarrage installe."

# 2. Le veilleur, toutes les cinq minutes. Sans droits administrateur.
$action = "wscript.exe `"$invisible`" `"$veilleur`""
schtasks /Create /TN $nomTache /TR $action /SC MINUTE /MO 5 /F | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Creation du veilleur impossible." }
Write-Host "Veilleur installe : verification toutes les 5 minutes, sans fenetre."

Write-Host ""
Write-Host "Pour demarrer la collecte tout de suite :"
Write-Host "  wscript scripts\lancer-invisible.vbs scripts\demarrer-collecteur.cmd"
Write-Host "Pour verifier :"
Write-Host "  npm run collect:status"
