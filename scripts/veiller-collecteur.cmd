@echo off
setlocal enabledelayedexpansion

rem ---------------------------------------------------------------------------
rem  Le veilleur.
rem
rem  Appele toutes les cinq minutes par une tache planifiee. Il relance le
rem  collecteur uniquement s'il ne tourne plus.
rem
rem  La premiere version cherchait le collecteur par le titre de sa fenetre
rem  (tasklist /V, "Collecteur Vinted"). Une fenetre reduite ou lancee par le
rem  planificateur n'expose pas ce titre : le veilleur croyait donc qu'il n'y
rem  avait aucun collecteur, en ouvrait un toutes les cinq minutes, et celui-ci
rem  se retirait aussitot a cause du verrou. Resultat : une fenetre qui
rem  apparait sans arret et vole le focus, y compris en plein jeu.
rem
rem  On interroge maintenant le verrou, qui est la seule source de verite : il
rem  contient le PID du collecteur. Un PID mort ne compte pas.
rem ---------------------------------------------------------------------------

cd /d "%~dp0.."

set "VERROU=%TEMP%\resellq-collecteur.lock"

if not exist "%VERROU%" goto relancer

set "PID="
set /p PID=<"%VERROU%"
if "!PID!"=="" goto relancer

rem  Le processus dont le verrou porte le numero est-il encore vivant ?
tasklist /FI "PID eq !PID!" /NH 2>nul | find "!PID!" >nul
if not errorlevel 1 goto fin

:relancer
if not exist "logs" mkdir "logs"
echo [%date% %time%] Veilleur : collecteur absent, relance. >> "logs\collecteur.log"
wscript "%~dp0lancer-invisible.vbs" "%~dp0demarrer-collecteur.cmd"

:fin
endlocal
