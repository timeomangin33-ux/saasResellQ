@echo off
rem  Met la collecte en pause, le temps d'une construction.
rem
rem  `prisma generate` ne peut pas remplacer son moteur pendant qu'un processus
rem  Node le tient ouvert : le build echoue alors sur « EPERM ... rename
rem  query_engine-windows.dll.node ». Comme le veilleur relance le collecteur
rem  toutes les cinq minutes, l'arreter a la main ne suffit pas — il faut aussi
rem  suspendre le veilleur, sinon il le ramene au milieu du build.

schtasks /Change /TN "ResellQ - Veilleur collecteur" /DISABLE >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Collecteur Vinted*" >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
del /Q "%TEMP%\resellq-collecteur.lock" >nul 2>&1
echo Collecte en pause. Relancez-la avec : npm run collect:resume
