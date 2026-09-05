@echo off
rem  Met la collecte en pause, le temps d'une construction.
rem
rem  `prisma generate` ne peut pas remplacer son moteur pendant qu'un processus
rem  Node le tient ouvert : le build echoue alors sur « EPERM ... rename
rem  query_engine-windows.dll.node ». Comme le veilleur relance le collecteur
rem  toutes les cinq minutes, l'arreter a la main ne suffit pas — il faut aussi
rem  suspendre le veilleur, sinon il le ramene au milieu du build.
rem
rem  Le detail du travail est dans arreter-collecteur.ps1 : PowerShell sait
rem  lire la ligne de commande d'un processus, ce que `taskkill /IM` ne sait pas
rem  faire, et c'est ce qui permet de ne tuer que les Node de ce projet.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0arreter-collecteur.ps1"
