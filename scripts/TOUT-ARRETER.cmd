@echo off
rem ---------------------------------------------------------------------------
rem  Double-cliquez pour arreter completement la collecte.
rem
rem  Plus rien ne tournera et plus rien ne se relancera tant que vous n'aurez
rem  pas double-clique sur TOUT-RELANCER.cmd. A utiliser si quelque chose vous
rem  derange et que vous voulez la paix immediatement.
rem
rem  La collecte s'arrete, mais rien n'est perdu : les annonces deja relevees
rem  restent en base, et le site continue de les afficher. Elles vieillissent,
rem  simplement, et le bandeau du tableau de bord le dira au bout de trois
rem  heures.
rem ---------------------------------------------------------------------------

cd /d "%~dp0.."
title Arret de la collecte ResellQ

echo.
echo   Arret de la collecte ResellQ
echo   ----------------------------
echo.

schtasks /Delete /TN "ResellQ - Veilleur collecteur" /F >nul 2>&1
echo   [1/3] Veilleur desactive.

taskkill /F /FI "WINDOWTITLE eq Collecteur Vinted*" >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo   [2/3] Collecteur arrete.

del /Q "%TEMP%\resellq-collecteur.lock" >nul 2>&1
echo   [3/3] Verrou libere.

echo.
echo   C'est fini, plus rien ne tourne et plus rien ne se relancera.
echo   Pour reprendre : double-cliquez sur TOUT-RELANCER.cmd
echo.
timeout /t 10 /nobreak >nul
