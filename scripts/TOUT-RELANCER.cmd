@echo off
rem ---------------------------------------------------------------------------
rem  Double-cliquez pour remettre la collecte en route.
rem
rem  Reinstalle le veilleur et redemarre le collecteur, tous deux invisibles :
rem  aucune fenetre ne s'ouvrira, ni maintenant ni plus tard.
rem ---------------------------------------------------------------------------

cd /d "%~dp0.."
title Relance de la collecte ResellQ

echo.
echo   Relance de la collecte ResellQ
echo   ------------------------------
echo.

del /Q "%TEMP%\resellq-collecteur.lock" >nul 2>&1

echo   [1/3] Installation du veilleur, sans fenetre...
schtasks /Create /TN "ResellQ - Veilleur collecteur" /TR "wscript.exe \"%~dp0lancer-invisible.vbs\" \"%~dp0veiller-collecteur.cmd\"" /SC MINUTE /MO 5 /F >nul 2>&1
if errorlevel 1 goto rate

echo   [2/3] Demarrage du collecteur, en arriere-plan...
wscript "%~dp0lancer-invisible.vbs" "%~dp0demarrer-collecteur.cmd"
timeout /t 15 /nobreak >nul

echo   [3/3] Verification...
tasklist /FI "IMAGENAME eq node.exe" /NH 2>nul | find /I "node.exe" >nul
if errorlevel 1 goto pasdemarre

echo.
echo   La collecte tourne. Aucune fenetre ne s'ouvrira.
echo   Pour verifier quand vous voulez : npm run collect:status
echo.
timeout /t 10 /nobreak >nul
exit /b 0

:pasdemarre
echo.
echo   Le veilleur est en place mais le collecteur n'a pas demarre tout de
echo   suite. Il reessaiera dans cinq minutes.
echo   La raison est dans logs\collecteur.log
echo.
pause
exit /b 0

:rate
echo.
echo   Installation du veilleur impossible.
echo.
pause
exit /b 1
