@echo off
rem ---------------------------------------------------------------------------
rem  Double-cliquez ce fichier.
rem
rem  Il corrige la fenetre de terminal qui s'ouvrait toutes les cinq minutes et
rem  volait le focus.
rem
rem  Ce qui n'allait pas : le veilleur cherchait le collecteur par le titre de
rem  sa fenetre. Une fenetre reduite n'expose pas ce titre, donc il croyait
rem  chaque fois qu'aucun collecteur ne tournait, en ouvrait un, qui se retirait
rem  aussitot a cause du verrou. Une fenetre pour rien, toutes les cinq minutes.
rem
rem  Apres cette reparation, le collecteur tourne sans aucune fenetre. Pour voir
rem  ce qu'il fait : npm run collect:status
rem ---------------------------------------------------------------------------

cd /d "%~dp0.."
title Reparation ResellQ

echo.
echo   Reparation du collecteur ResellQ
echo   --------------------------------
echo.

echo   [1/5] Arret du veilleur...
schtasks /Delete /TN "ResellQ - Veilleur collecteur" /F >nul 2>&1
schtasks /Delete /TN "ResellQ - Collecteur Vinted" /F >nul 2>&1

echo   [2/5] Fermeture des fenetres de collecteur...
taskkill /F /FI "WINDOWTITLE eq Collecteur Vinted*" >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
del /Q "%TEMP%\resellq-collecteur.lock" >nul 2>&1

echo   [3/5] Reinstallation, cette fois sans aucune fenetre...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer-demarrage-windows.ps1"
if errorlevel 1 goto rate

echo   [4/5] Demarrage de la collecte, en arriere-plan...
wscript "%~dp0lancer-invisible.vbs" "%~dp0demarrer-collecteur.cmd"
timeout /t 12 /nobreak >nul

echo   [5/5] Verification...
tasklist /FI "IMAGENAME eq node.exe" /NH 2>nul | find /I "node.exe" >nul
if errorlevel 1 goto pasdemarre

echo.
echo   C'est bon. Le collecteur tourne, et plus aucune fenetre ne s'ouvrira.
echo.
echo   Pour verifier quand vous voulez :  npm run collect:status
echo   Le journal :                       logs\collecteur.log
echo.
echo   Cette fenetre se ferme dans 15 secondes.
timeout /t 15 /nobreak >nul
exit /b 0

:pasdemarre
echo.
echo   Le veilleur est installe, mais le collecteur n'a pas demarre tout de
echo   suite. Le veilleur reessaiera dans cinq minutes.
echo   Regardez logs\collecteur.log pour la raison.
echo.
pause
exit /b 0

:rate
echo.
echo   La reinstallation a echoue. Rien n'a ete casse : relancez ce fichier,
echo   ou dites-le a Claude avec le message d'erreur ci-dessus.
echo.
pause
exit /b 1
