@echo off
rem  Remet la collecte en route apres une construction.

schtasks /Change /TN "ResellQ - Veilleur collecteur" /ENABLE >nul 2>&1
schtasks /Run /TN "ResellQ - Veilleur collecteur" >nul 2>&1
echo Collecte relancee. Verifiez avec : npm run collect:status
