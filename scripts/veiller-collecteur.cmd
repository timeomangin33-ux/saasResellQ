@echo off
rem ---------------------------------------------------------------------------
rem  Le veilleur.
rem
rem  Appele toutes les cinq minutes par une tache planifiee. Il ne fait rien
rem  quand le collecteur tourne : c'est le collecteur lui-meme qui refuse de
rem  demarrer en double, grace a son verrou. Le veilleur se contente donc de
rem  relancer le lanceur, et le lanceur se retire tout seul si de trop.
rem
rem  Pourquoi il existe : le lanceur relance le collecteur quand celui-ci
rem  plante, mais rien ne relancait le lanceur quand la fenetre disparaissait.
rem  La collecte s'est arretee cinq jours de cette facon, puis une nuit
rem  entiere, sans qu'aucune de ces deux fois ne laisse de trace.
rem ---------------------------------------------------------------------------

cd /d "%~dp0.."

rem  Une fenetre de collecteur est-elle deja ouverte ? On le demande a Windows
rem  plutot que de se fier au verrou : un verrou peut survivre a son processus.
tasklist /FI "IMAGENAME eq cmd.exe" /FO CSV /V 2>nul | find /I "Collecteur Vinted" >nul
if not errorlevel 1 goto dejala

if not exist "logs" mkdir "logs"
echo [%date% %time%] Veilleur : aucun collecteur, relance. >> "logs\collecteur.log"
start "" /MIN cmd /c "%~dp0demarrer-collecteur.cmd"
goto fin

:dejala
rem  Rien a faire. On ne journalise pas : une ligne toutes les cinq minutes
rem  pour dire que tout va bien noierait les lignes qui comptent.

:fin
