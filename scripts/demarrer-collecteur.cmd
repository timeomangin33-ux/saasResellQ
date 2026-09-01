@echo off
rem ---------------------------------------------------------------------------
rem  Lance le collecteur Vinted et le relance s'il s'arrete.
rem
rem  Le collecteur sort avec un code d'erreur quand quelque chose l'empeche de
rem  continuer (base injoignable, exception non rattrapee). Sans cette boucle,
rem  une coupure reseau de trente secondes arreterait la collecte jusqu'au
rem  prochain redemarrage manuel, sans que personne ne s'en apercoive.
rem
rem  Double-cliquez ce fichier pour lancer la collecte, ou installez-le au
rem  demarrage de Windows avec scripts\installer-demarrage-windows.ps1.
rem  Fermez la fenetre pour tout arreter.
rem ---------------------------------------------------------------------------

cd /d "%~dp0.."
title Collecteur Vinted - ResellQ

:boucle
echo.
echo [%date% %time%] Demarrage du collecteur...
call npm run collector
set CODE=%errorlevel%

rem  Code 3 : un collecteur tourne deja sur cette machine. Relancer ne ferait
rem  que repeter le meme refus toutes les trente secondes.
if "%CODE%"=="3" goto fin

echo.
echo [%date% %time%] Le collecteur s'est arrete (code %CODE%). Nouvelle tentative dans 30 s.
timeout /t 30 /nobreak >nul
goto boucle

:fin
echo.
echo [%date% %time%] Un collecteur tourne deja. Cette fenetre peut etre fermee.
timeout /t 15 /nobreak >nul
