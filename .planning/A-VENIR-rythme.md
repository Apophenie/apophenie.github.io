# Le RYTHME des gestes : ce qui a été livré, et ce qui reste

> Ce document est un **report** et un **passage de relais**, pas une recherche.
>
> Les trois volets du chantier « Pas à pas ou Simultané » sont livrés. Ce qui
> reste ouvert tient en **une décision de produit** que je n'ai pas voulu
> prendre seul, parce qu'elle se paie sur l'accessibilité : faire jouer
> plusieurs conversions dans une SEULE étape.
>
> Branche : `rythme-pas-a-pas-ou-simultane`.

---

## 1. Ce qui est livré

| volet | état |
|---|---|
| Suppression du mode « redites » | **fait** — machinerie, réglage, bouton, libellés, CSS, tests |
| Bascule de RYTHME, septième contrôle | **fait** — persistée, retirée en mouvement réduit |
| Pas à pas : aucune addition ne se superpose | **fait** — mesuré 17 → 0 recouvrements |
| Simultané : vague de 0,1 s | **fait** |
| `mrn` en largeur, deux items à la fois | **fait** |
| Afficheurs : un par caractère, sans recouvrement ni débordement | **fait** |

Mesures de référence, sur `?sce!fmaj+mas+mrdE$6hVamBkJyG1MWtPRwR` :

| | étapes | durée | recouvrements de même type |
|---|---|---|---|
| avant | 29 | 93 s | **17**, jusqu'à 7 sommes simultanées |
| Pas à pas | 29 | 139 s | **0** |
| Simultané | 29 | 93 s | la vague, par construction |

---

## 2. Ce qui reste : une étape peut-elle porter PLUSIEURS conversions ?

### La situation

Le mode « Simultané » joue ensemble les gestes de même type **d'une même
étape**. Or `moteur/transformations/mappeurs.js › etapeMappeur` émet, pour les
afficheurs à segments et le comptage de traits, **un step par jeton** — c'est
une doctrine explicite, et elle est argumentée :

> « ★ **UN STEP PAR JETON.** […] Montrer quatre lettres à la fois donnerait
> quatre chantiers simultanés : illisible. Une chose à la fois, et tant pis pour
> la durée. » (`mappeurs.js`, vers la ligne 4459)

Conséquence : sur `m7`, `m14`, `mas`, `countStrokes`, la bascule de rythme n'a
**rien à ordonner** — il n'y a jamais deux gestes de même type dans une étape.
Les afficheurs par caractère existent et se rangent correctement (plusieurs
coexistent grâce au décor mutualisé, et le relais joue), mais ils ne partent
jamais en VAGUE.

### Ce qu'il faudrait faire, et ce que ça coûte

Grouper les conversions d'une série dans une seule étape. Le moteur visuel est
prêt : `placement.js` sait ranger `n` afficheurs, réduire l'échelle d'un facteur
commun, et dire combien tiennent (`combienTiennent`) quand il faut faire des
vagues. Le chemin de dégradation par l'ÉCHELLE est écrit et testé mais **pas
encore emprunté** — aujourd'hui on relaie toujours.

**Le prix, et c'est lui qui bloque :**

1. **Le Registre perd des entrées.** Il lit `lecteur.steps` et donne une entrée
   par étape (CONTRACTS §6 : c'est l'équivalent accessible obligatoire, et le
   repli si le moteur visuel échoue). Seize conversions dans une étape, c'est
   **une** entrée au lieu de seize — pour quelqu'un qui lit au lecteur d'écran,
   quinze conversions disparaissent.
2. **`step.figure` est au singulier.** L'illustration du Registre — l'afficheur
   dessiné à côté du texte — est un objet par étape (`visuel/scenario.js`, la
   validation l'impose). Il en faudrait une liste.
3. **La jauge compte les étapes.** Seize dalles deviennent une.

**Aucun de ces trois points n'est difficile ; les trois sont des décisions.**
Faut-il que le Registre suive la scène (une entrée par étape, donc moins
d'entrées), ou qu'il garde son grain propre (une entrée par conversion, même
quand la scène les joue ensemble) ? Le contrat dit que le Registre est
l'équivalent accessible de la scène, ce qui plaide pour le second — mais alors
`steps` n'est plus l'unité commune aux deux, et c'est un changement de contrat.

**Proposition, à valider :** découpler le Registre de la timeline — une entrée
par OP décrite plutôt que par step, la jauge restant sur les steps. Le
`figure` deviendrait une liste, et `titreEtape` lirait l'op.

### Une piste plus économe

Grouper par **vagues de la taille que le cadre permet** plutôt que toute la
série : `combienTiennent` rend 3 avec la géométrie actuelle. Seize conversions
feraient six étapes de trois au lieu de seize étapes de une — le Registre perd
alors dix entrées sur seize au lieu de quinze, et la scène montre vraiment une
vague. C'est un compromis, donc c'est à l'auteur de le trancher.

---

## 3. Deux défauts trouvés en chemin, corrigés, et qui méritaient d'être dits

### 3.1 L'accolade qui adoptait la place de sa voisine

`visuel/primitives/helpers.js › reserverLaPlace` adoptait toute accolade encore
« en attente de résultat », sans regarder DE QUI est le résultat attendu. Tant
que les sommes d'une étape étaient simultanées, personne ne le voyait. En
« Pas à pas », l'accolade de la première somme — déjà refermée sur son
résultat, mais pas encore effacée puisque l'étape finit par une fermeture
commune — était étirée pour couvrir la place réservée au résultat de sa
voisine, puis revenait : le « yoyo » que la garde de routine interdit.

**Le défaut touchait aussi `mrdE`**, sur les sept sommes de la 15ᵉ étape de
« Didier Raoult » : il n'y avait simplement aucun vecteur gelé qui mît deux
sommes dans une même étape, donc la garde ne le voyait pas. Corrigé — une
accolade ne s'engage que dans UNE place gardée — et `mrn` fournit désormais le
vecteur qui l'exerce.

### 3.2 `fadeAt`, une dépendance figée en nombre

`moteur/transformations/commun.js › retirerAccolade` écrit sur l'op `group` un
`fadeAt` calculé sur les instants DÉCLARÉS des autres ops. C'est « quand
l'action finit », figé. Tout ce qui décale les ops — le rythme, et demain autre
chose — doit le reporter, sinon l'accolade s'efface au milieu de l'action.

`visuel/rythme.js` le reporte. **Mais le motif reste fragile** : rien
n'empêche un futur émetteur d'écrire une autre dépendance sous forme de nombre
absolu, et rien ne le signalerait. Une piste, si l'occasion se présente :
exprimer ces liens en RELATIF (« après la dernière op du step ») plutôt qu'en
millisecondes, pour qu'il n'y ait rien à reporter.

---

## 4. Points de détail laissés en l'état

- **L'échelle des afficheurs ne descend jamais.** On relaie toujours. Le
  chemin par l'échelle est écrit et testé (`placement.js`), et servira quand une
  étape portera plusieurs conversions (§2).
- **L'encombrement d'un afficheur est approché par une boîte symétrique.** Le
  compteur déborde à droite et pas à gauche ; on réserve donc un peu trop à
  gauche. Le sens de l'erreur est le bon (relayer un cadre trop tôt plutôt que
  laisser un compteur mordre son voisin), mais on pourrait gagner une place en
  traitant l'asymétrie.
- **`RYTHME_DEFAUT` vaut `'pasAPas'`.** « Quand ça sera au point, on passera
  probablement en parallèle/par lots par défaut » (l'auteur) : c'est **une
  seule ligne** dans `src/visuel/rythme.js`, et le test qui la couvre gèle son
  unicité, pas sa valeur — il restera vert le jour où elle changera.
