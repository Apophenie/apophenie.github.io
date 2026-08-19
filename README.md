# NumHeroLOLgeek
La numérologie est un art, parfoit taquin pour les superstitions anxieuses.

Saisissez un mot, une phrase, une url, ce que vous voulez, ce site vous montrera ce qui se cache derrière !


Chaque démonstration est illustré par une animation montrant chaque étapes pour un résultat sans équivoque !

Venez vous essayer à la science des nombre enfin rendu accessible à toutes et tous !

----

Méthodologie : la séquence saisie doit être analysé et décomposé pour voir tout les méthodes permettant d'obtenir des 6, idéalement 3 d'affilé, idéalement selon la même méthode.
Les calcule doivent être montré visuellement (grace à du svg) pour rendre le processus le plus convainquant possible.

Il faut donc :
- Un moteur de traduction d'une séquence de caractères en 6 (conversion des lettre en position dans l'alphabet, ou position sur le clavier (comme - sur la même touche que 6 en azerty) nombre de segment en afficheur 7 segment, nombre d'extrémité d'une lettre, en majuscule, en minuscule, nombre de trait pour dessiner une lettre, utilisation des - pour passer de l'addition à la soustraction, utilisation des nombres négatif pour retrancher le 1er chiffre aux autres, ou pour les soustraires entre eux, ou la valeur absolu si ça ne donne pas 6... ) Explore toutes les variantes répendu pour ce genre d'exercice, et on en ajoutera si besoin. ça peut aussi inclure d'ignorer une partie (https:// ou partie après ou avant un / ou les voyelles, ou les consonnes, ou les lettre qui se répettent... bref, il faut une liste de transformation possible, qui auront chacune un mode de rendu visuel animé dans le moteur suivant, et un séquenceur de transformation pour arriver à l'issue visée).

- Un moteur visuel pour animer chaque transformation afin de rendre limpide et authentique le passage de la séquence d'origine aux 666 d'arrivée.

- Un séquençage dans l'url pour pouvoir partager le lien d'une transformation visuelle donnée.




## L'interface du site :
### Page d'accueil

Titre svg : 
Num'Hero Logic (en insérant le 2nd L de LOL sous forme d'apostrophe entre lo et gic en mettant les 2 e de geek l'un au dessus de l'autre pour former le i de gic et le k sous forme de c avec un petit morceau qui dépasse pour faire deviner le k. Bref, numerologic à première vu mais qui cache num héro lol geek)

Ensuite la phrase :
L'art de la numérologie, enfin accessible au plus grand nombre !

De quel contenu voulez vous réveller les arcanes ?
[champs de saisie]
[Bouton: Réveller]

### Page de résultat

Url : {domain/path}##{b58 de la séquence recherchée}
Titre : {Séquence recherchée}
Liste clicable des approche menant à 666
Liste clicable des fragments menant à 6

Mémo d'assemblage de fragments dans l'url

### Page de démonstration
cible des liens de la page résultat, pour illustrer une méthode de calcul.

Url : {domain/path}#{numéro de l'approche, ou numéro+numéro+numéro pour la composition de plusieurs fragments}#{b58 de la séquence recherchée}
Titre : La vérité derrière "{Séquence recherchée}"

Animation svg (ou css) avec la séquence de départ, transition vers étape suivante... jusqu'au résultat fatidique.

Controle d'avancement type : Début, précédent, play, pause, suivant.
Play ne se déclenche automatiquement qu'une fois la page chargé et le focus sur l'onglet présent (pour éviter de la jouer en arrière plan). Il ne se redéclenche pas automatiquement (sauf rechargement de la page)
Début renvoi au point de départ, précédent au début de la transformation en cours, ou au début de la tranformation précédente si on est déjà à la charnière entre l'actuelle et la précédente. Suivant envoi à la fin de la transformation actuelle (ou la suivant si on est déjà à la charnière avec la suivante) Suivant est grisé/désactivé si on est à la fin. Précédent et début le sont si on est au début. Play et pause se remplace mutuellement selon l'état. (play quand on est en pause, pause quand on est en play)

Les transformations sont numérotées et le numéro en cours est distingable (pour debug principalement)


---------------


Inspiration :
*méthodes pour faire atterrir hope-hope-hope.fr sur 666*

---

**Méthode 1 – Le détour linguistique (le français)**
- **Règle** : On traduit le mot anglais en français.
- **Calcul** : *Hope* → *Espoir*, *Espoir* -> 6 lettres, https://hope-hope-hope.fr/ on ignore ce qui n'est pas hope, hope est là 3 fois, donc 3 rempalcement -> 666
- **Résultat** : Chaque "hope" vaut 6 → `6-6-6`.

---

**Méthode 2 – Le compte des lettres + voyelles**
- **Règle** : On comptabilise le nombre total de lettres, puis on ajoute le nombre de voyelles.
- **Calcul** : H-O-P-E = 4 lettres + 2 voyelles (O, E) = 6.
- **Résultat** : Chaque "hope" vaut 6 → `6-6-6`.

---

**Méthode 3 – Le compte des lettres + consonnes**
- **Règle** : On comptabilise le nombre total de lettres, puis on ajoute le nombre de consonnes.
- **Calcul** : H-O-P-E = 4 lettres + 2 consonnes (H, P) = 6.
- **Résultat** : Chaque "hope" vaut 6 → `6-6-6`.

---

**Méthode 4 – La somme des 3 répétitions en A1Z26**
- **Règle** : On utilise la numérologie standard (A=1, B=2... Z=26), puis on réduit la somme des trois mots.
- **Calcul** : HOPE = 8+15+16+5 = 44 → 4+4 = 8. Les trois "hope" : 8+8+8 = 24 → 2+4 = 6.
- **Résultat** : Le triplet global donne 6 et les séparateur en "tiret du 6" donnent les 2 autres 6 -> 666

---

**Méthode 5 – L'affichage 7 segments (traits continus fusionnés)**
- **Règle** : On compte les traits géométriques *continus* (on fusionne les segments alignés qui se touchent) pour écrire HOPE en capitales.
- **Calcul** : H = 3 traits, O = 4 traits, P = 4 traits, E = 4 traits. Total par mot = 3+4+4+4 = 15 → 1+5 = 6.
- **Résultat** : Chaque "hope" vaut 6 → `6-6-6`.

---

**Méthode 6 – L'astuce AZERTY et le retournement du 9**
- **Règle** : On utilise le clavier français et une double pirouette arithmétique.
- **Calcul** : 
  - Les deux tirets `-` entre les trois "hope" sont situés sur la **touche du 6** en AZERTY → on récupère deux 6 (6 et 6).
  - Pour le troisième 6 : on additionne les valeurs numériques des lettres de HOPE (8+15+16+5 = 44 → 8) en incluant les deux tirets (6 et 6) : 8 + 6 + 8 + 6 + 8 = 36 → 3+6 = 9. On **retourne** le 9 pour obtenir un 6.
- **Résultat** : Les deux tirets donnent `6` et `6`, et la réduction/retournement donne le troisième `6` → `6-6-6`.

**Méthode 7 – la soustraction**
- **Règle** : Les mots sont séparé par des - c'est donc des soustraction et non des addition qu'il faut faire entre les lettres.
- **Calcul** : HOPE = 8-15-16-5 = -28, -28 -> -2 et 8, donc 8 -2 -> 6



Instruction :

Un agent sur le design du site
Un agent sur le moteur visuel pour montrer les transformations de manière visuelles
Un agent sur le moteur arithmétique
Un agent sur le moteur de tri/filtre heuristique parmis les transformations arithmétique disponible pour trouver les chemins les plus court qui mène au résultat.

