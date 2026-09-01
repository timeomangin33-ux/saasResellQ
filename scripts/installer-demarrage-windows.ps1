<#
    Installe le collecteur Vinted au demarrage de Windows.

    A lancer une fois, depuis la racine du projet :

        powershell -ExecutionPolicy Bypass -File .\scripts\installer-demarrage-windows.ps1

    Pour l'enlever :

        powershell -ExecutionPolicy Bypass -File .\scripts\installer-demarrage-windows.ps1 -Desinstaller

    Deux mecanismes, du plus simple au plus solide. Le script installe le
    premier qui reussit :

    1. Un raccourci dans le dossier Demarrage de votre session. Ne demande
       aucun droit particulier, et suffit dans la plupart des cas : le
       collecteur repart a chaque ouverture de session, et le lanceur .cmd le
       relance tout seul s'il plante.

    2. Une tache planifiee, si PowerShell est lance en administrateur. Elle
       survit en plus a une fermeture de session et se relance apres un echec
       du systeme lui-meme.

    Ce que ni l'un ni l'autre ne couvre : un PC eteint. Pour une collecte qui
    ne s'arrete jamais, il faut une machine allumee en permanence — voir
    COLLECTEUR.md.
#>

param(
    [switch]$Desinstaller
)

$ErrorActionPreference = 'Stop'

$nomTache = 'ResellQ - Collecteur Vinted'
$racine = Split-Path -Parent $PSScriptRoot
$lanceur = Join-Path $PSScriptRoot 'demarrer-collecteur.cmd'
$dossierDemarrage = [Environment]::GetFolderPath('Startup')
$raccourci = Join-Path $dossierDemarrage 'ResellQ - Collecteur Vinted.lnk'

function Test-Administrateur {
    $identite = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal $identite).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
}

if ($Desinstaller) {
    $faitQuelqueChose = $false

    if (Test-Path $raccourci) {
        Remove-Item $raccourci -Force
        Write-Host "Raccourci de demarrage supprime."
        $faitQuelqueChose = $true
    }

    if (Get-ScheduledTask -TaskName $nomTache -ErrorAction SilentlyContinue) {
        try {
            Unregister-ScheduledTask -TaskName $nomTache -Confirm:$false
            Write-Host "Tache planifiee supprimee."
            $faitQuelqueChose = $true
        } catch {
            Write-Warning "Tache planifiee presente mais non supprimable sans droits administrateur."
        }
    }

    if (-not $faitQuelqueChose) { Write-Host "Rien a desinstaller." }
    return
}

if (-not (Test-Path $lanceur)) {
    throw "Lanceur introuvable : $lanceur"
}

# 1. Le raccourci dans le dossier Demarrage. Sans droits particuliers.
$shell = New-Object -ComObject WScript.Shell
$lien = $shell.CreateShortcut($raccourci)
$lien.TargetPath = $lanceur
$lien.WorkingDirectory = $racine
$lien.Description = 'Collecte en continu les annonces Vinted et alimente la base ResellQ.'
$lien.WindowStyle = 7   # reduite dans la barre des taches, pas cachee : on doit pouvoir la regarder
$lien.Save()

Write-Host "Raccourci installe dans le dossier Demarrage :"
Write-Host "  $raccourci"
Write-Host "Le collecteur demarrera a votre prochaine ouverture de session."

# 2. La tache planifiee, en plus, si on en a le droit.
if (Test-Administrateur) {
    $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$lanceur`"" -WorkingDirectory $racine
    $declencheur = New-ScheduledTaskTrigger -AtLogOn
    $reglages = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 999 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit ([TimeSpan]::Zero)

    Register-ScheduledTask `
        -TaskName $nomTache `
        -Action $action `
        -Trigger $declencheur `
        -Settings $reglages `
        -Description 'Collecte en continu les annonces Vinted et alimente la base ResellQ.' `
        -Force | Out-Null

    Write-Host "Tache planifiee installee en plus du raccourci."
} else {
    Write-Host ""
    Write-Host "Le raccourci suffit. Pour ajouter une tache planifiee (qui survit aussi a"
    Write-Host "une fermeture de session), relancez ce script dans un PowerShell ouvert"
    Write-Host "en tant qu'administrateur."
}

Write-Host ""
Write-Host "Pour demarrer la collecte tout de suite, sans attendre :"
Write-Host "  scripts\demarrer-collecteur.cmd"
