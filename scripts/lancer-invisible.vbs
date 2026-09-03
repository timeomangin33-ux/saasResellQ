' Lance un script sans afficher la moindre fenetre.
'
' Windows n'a pas d'autre moyen simple de demarrer un fichier .cmd sans qu'une
' console apparaisse, ne serait-ce qu'une fraction de seconde. Et une fenetre
' qui apparait, meme reduite, vole le focus : en plein jeu, elle bascule
' l'ecran. Comme le veilleur s'execute toutes les cinq minutes, cela devenait
' inutilisable.
'
' wscript.exe n'a pas de console du tout, et le 0 passe a Run demande une
' fenetre cachee. Rien ne s'affiche donc, jamais.
'
' Usage : wscript lancer-invisible.vbs "C:\chemin\vers\script.cmd"

Option Explicit

Dim arguments, shell, commande
Set arguments = WScript.Arguments

If arguments.Count < 1 Then
  WScript.Quit 1
End If

Set shell = CreateObject("WScript.Shell")
commande = "cmd /c """ & arguments(0) & """"

' 0 = fenetre cachee. False = on n'attend pas la fin du script lance.
shell.Run commande, 0, False
