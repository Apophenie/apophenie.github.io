# Opérations indépendantes en simultané

Le regroupement entre étapes était limité aux afficheurs, au comptage de
traits et aux tables. Un carré par nombre restait donc séquentiel, même si les
nombres étaient distincts.

Le compilateur regroupe maintenant les répétitions du même geste à partir de
leurs références : sources, résultats et exposants. Les titres et légendes
peuvent différer sans empêcher le regroupement. Les répétitions indépendantes
peuvent occuper une seule étape ou plusieurs étapes consécutives. Les étapes
d’origine restent accessibles dans le registre. Deux calculs dont les
références se recoupent restent séquentiels.

Chaque calcul dispose d’un flux local et d’une place dimensionnée d’après le
geste effectivement compilé, y compris ses agrandissements. Les places
s’ouvrent ensemble, puis les calculs partent à 100 ms d’intervalle. Les
exposants et autres décors attachés accompagnent leurs nombres. Les reflows,
accolades et réserves d’un calcul ne déplacent pas ses voisins ; la ligne
commune se reforme à la fin de la vague. La caméra est coordonnée pour toute
la vague et retrouve ensuite son zoom antérieur.

Les factorielles ont un titre et une annonce propres à chaque calcul parallèle.
Le scénario et son annonce commune restent inchangés en mode pas à pas.
Un atelier César reste un flux distinct : élargir le travail sur les copies
ne déplace pas les caractères originaux.

La détection conserve les dépendances globales et les sélecteurs dont les
sources ne sont pas explicites. Le mode réduit ne regroupe pas les étapes.
Les vagues de conversions en table et les placements d’afficheurs conservent
leur disposition spécialisée.

Les tests couvrent les carrés et factorielles répétés dans une ou plusieurs
étapes, les calculs dépendants, la vitesse et le mode réduit, ainsi que les
opérateurs réels `mcar`, `mpui`, `mfac`, `mcc` et `mecl`. Le contrôle géométrique
des carrés échantillonne 300 instants et refuse tout chevauchement entre
nombres appartenant à des calculs différents. Les essais Chromium montrent
les carrés et les factorielles en parallèle. Un balayage complémentaire de
75 cas numériques du catalogue conserve les résultats sans nouvel
avertissement de concurrence.

Validation : suite rapide complète, **1 014 réussites, aucun échec et un TODO
préexistant** ; cinq builds réussis. Après synchronisation du retour du zoom
avec le resserrement final, les 32 tests ciblant le rythme et les ateliers
César passent également. La suite lente exhaustive de publication reste
séparée de ce verdict et n’a pas encore rendu un bilan vert.

Le regroupement efface aussi les anciens horaires séquentiels des répétitions
indépendantes inscrites dans une seule étape. La vérification finale du moteur
visuel et des ateliers César compte **490 tests réussis, aucun échec**.
