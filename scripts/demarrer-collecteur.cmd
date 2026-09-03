@echo off
rem ---------------------------------------------------------------------------
rem  Lance le collecteur Vinted et le relance s'il s'arrete.
rem
rem  Ce fichier est normalement demarre sans fenetre, par lancer-invisible.vbs.
rem  Tout ce qu'il a a dire va donc dans logs\collecteur.log, pas a l'ecran :
rem  une fenetre qui s'ouvre vole le focus, et sur un poste ou l'on joue, c'est
rem  l'ecran entier qui bascule.
rem
rem  Pour voir ce que fait la collecte : npm run collect:status
rem  Pour la suivre en direct  : type logs\collecteur.log
rem ---------------------------------------------------------------------------

cd /d "%~dp0.."
title Collecteur Vinted - ResellQ

if not exist "logs" mkdir "logs"
set "JOURNAL=logs\collecteur.log"

:boucle
echo [%date% %time%] Demarrage du collecteur. >> "%JOURNAL%"
call npm run collector >> "%JOURNAL%" 2>&1
set CODE=%errorlevel%

rem  Code 3 : un collecteur tourne deja sur cette machine. Relancer ne ferait
rem  que repeter le meme refus toutes les trente secondes.
if "%CODE%"=="3" goto fin

echo [%date% %time%] Arret du collecteur, code %CODE%. Relance dans 30 s. >> "%JOURNAL%"
timeout /t 30 /nobreak >nul
goto boucle

:fin
echo [%date% %time%] Un collecteur tourne deja, cette instance se retire. >> "%JOURNAL%"
