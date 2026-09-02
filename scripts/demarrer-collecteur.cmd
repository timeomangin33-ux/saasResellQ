@echo off
rem ---------------------------------------------------------------------------
rem  Lance le collecteur Vinted, le relance s'il s'arrete, et garde une trace.
rem
rem  Le collecteur sort avec un code d'erreur quand quelque chose l'empeche de
rem  continuer (base injoignable, exception non rattrapee). Sans cette boucle,
rem  une coupure reseau de trente secondes arreterait la collecte jusqu'au
rem  prochain redemarrage manuel.
rem
rem  Ce que cette boucle ne couvre pas, et qui est arrive : la fenetre elle-meme
rem  disparait (fermee, tuee, session qui se termine). Plus rien ne relance
rem  alors quoi que ce soit. C'est le role de scripts\veiller-collecteur.cmd,
rem  appele toutes les cinq minutes par une tache planifiee.
rem
rem  Le journal s'ecrit dans logs\collecteur.log : sans lui, un arret nocturne
rem  ne laisse aucune trace de sa cause, ce qui est exactement ce qui s'est
rem  passe dans la nuit du 1er au 2 septembre.
rem ---------------------------------------------------------------------------

cd /d "%~dp0.."
title Collecteur Vinted - ResellQ

if not exist "logs" mkdir "logs"
set JOURNAL=logs\collecteur.log

:boucle
echo. >> "%JOURNAL%"
echo [%date% %time%] Demarrage du collecteur... >> "%JOURNAL%"
echo [%date% %time%] Demarrage du collecteur...
call npm run collector 2>&1
set CODE=%errorlevel%

rem  Code 3 : un collecteur tourne deja sur cette machine. Relancer ne ferait
rem  que repeter le meme refus toutes les trente secondes.
if "%CODE%"=="3" goto fin

echo [%date% %time%] Arret du collecteur, code %CODE%. Relance dans 30 s. >> "%JOURNAL%"
echo [%date% %time%] Le collecteur s'est arrete (code %CODE%). Nouvelle tentative dans 30 s.
timeout /t 30 /nobreak >nul
goto boucle

:fin
echo [%date% %time%] Un collecteur tourne deja, cette instance se retire. >> "%JOURNAL%"
echo [%date% %time%] Un collecteur tourne deja. Cette fenetre peut etre fermee.
timeout /t 15 /nobreak >nul
