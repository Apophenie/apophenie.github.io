# Le modulo — chantier interrompu, et ce qu'il reste à faire

> « Modulo est implémentable aussi : 135 → 13 % 5 → 3. Une accolade de modulo
>   se forme, façon `meg` ; B absorbe autant de fois sa valeur que A la
>   contient, jusqu'à ce que 0 ≤ A < B. Deux variantes : l'une dissout B dans
>   l'accolade, l'autre le garde — il n'a servi que de catalyseur. » (l'auteur)

Le patch `modulo-en-chantier.patch` contient un travail **qui marche à moitié**,
et qui n'est PAS dans l'historique parce que la suite était rouge. Il se
réapplique avec `git apply .planning/chantiers/modulo-en-chantier.patch`.

## Ce qui est fait et vérifié

- **La primitive** `visuel/primitives/group.js › planModulo` (mode `modulo`).
  Elle trace l'accolade, fait partir les paquets de A vers B, et dissout ou
  garde le diviseur selon `garderLeDiviseur`. Ses contrôles croisés mordent :
  un résultat annoncé faux (`13 % 5` annoncé `2`), un diviseur nul, un quotient
  trop long sont tous refusés, mesuré.
- **`helpers.js › jouerTransferts`** accepte un `montant` par transfert. Il
  créait un `'1'` en dur — l'égalisation passe des unités, le modulo des
  paquets. Sans montant, le comportement de `meg` est inchangé.
- **L'arithmétique** : `135 → [3]`, `mmoc 135 → [3, 5]`, `[13,27] → [1,2]`,
  `[999] → [0]`, et les refus qu'il faut (`[10]` diviseur nul, `[7]` un seul
  chiffre).

## ⚠️ Ce qui bloque, et qu'il faudra traiter

1. **`steps : vocabulaire fermé`** — « mmod : aucun step, mais les jetons
   changent d'identité ». Les steps existent pourtant quand on les appelle à la
   main sur `[135]` : c'est le helper `etapes()` du test qu'il faut suivre pour
   comprendre ce qu'il passe en `ctx`. **Piste non explorée.**
2. **`intégration — chaque scénario émis compile`** — un `sum` d'un scénario
   EXISTANT devient incohérent (« la somme vaut 18, mais `to.text` annonce
   autre chose »). À élucider avant tout le reste : soit l'ajout d'opérateurs
   révèle un défaut ailleurs, soit le `montant` de `jouerTransferts` a un effet
   de bord non vu.
3. **Trois tables à alimenter**, en plus des deux déjà faites : l'exemple
   témoin (« ces opérateurs ne sont jouables sur aucune saisie témoin : il en
   faut une de plus ») et le nom de VEDETTE (`titres.js`), distinct des formes
   courtes et de `PRECISIONS`.

## Ce que ce chantier a appris, et qui vaut pour tout opérateur neuf

- **Passer par `def({...})`** dès le départ. Le catalogue exige `cout`,
  `sortie`, `outil` bilingue et `note` ; les découvrir un par un en heurtant
  quatre fois la validation est une perte de temps pure.
- **`MAX_TRANSFERTS` vaut 18** (`helpers.js`). Un geste qui montre chaque
  paquet partir n'est jouable que pour de petits quotients : `135 % 5` en
  demande vingt-sept et le moteur visuel refuse, à raison. L'opérateur doit
  refuser AVANT, plutôt que de fabriquer une voie qu'on ne saura pas jouer.
