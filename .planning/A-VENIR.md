# À venir — ce qui reste ouvert après `v3.0.0`

> Index au 16 septembre 2026. Une entrée par sujet ; le détail vit dans le
> document lié. Les documents réalisés sont rangés dans [`archive/`](archive/).
> `CONTRACTS.md` et `arbitrages/` sont des références, pas des listes de tâches.

## La mise en scène

- **Les emblèmes des cibles autres que 666.** Le moteur vise n'importe quelle
  cible, mais seul le 666 a son décor (les cornes) : `sce!` se replie en sobre
  partout ailleurs. Restent l'auréole (111), le jackpot (777), le fer à cheval et
  la merde (13), la référence à James Bond (007), le trou noir, la faux et les
  dés 10 (000) — et une question à poser : `bo!` et `ma!` sont-ils des registres
  à part entière, ou deux variantes de `sce!` ?
  → [A-VENIR-cibles.md](A-VENIR-cibles.md)

## Le classement

- **Cas 13 — sur « hope », le simple `m14` devrait mener.** Il n'entre même pas
  dans la liste : « m14 écarté par le pré-tri des sièges de vecteursDeSix aux
  curseurs par défaut (assemblage.js) ». Test `todo` « score arbitre 13 » dans
  [`src/recherche/tests/lents/score-arbitre.test.js`](../src/recherche/tests/lents/score-arbitre.test.js) ;
  verdict n° 13 de [arbitrages/2026-09-15-rang-ou-score.md](arbitrages/2026-09-15-rang-ou-score.md).
- **La forme chaînée d'une retouche.** « Pourquoi `0:fr13;ma1+mab` plutôt que
  `fr13+ma1+mab` ? il n'y a qu'un mot » (verdict n° 4, consigné dans
  `src/app/pages/arbitrage-cas.js`). Le score global paie désormais la retouche
  dans ses axes (`src/recherche/score.js › mesuresDeLaVoie`), mais le générateur
  la propose toujours : mesuré le 16 septembre 2026 sur « Capitalisme » aux
  curseurs `p25.200.50.150`, `0:fr13;ma1+mab` est 6ᵉ et `fr13+ma1+mab` n'est pas
  dans la liste. Aucun critère ne la tient encore : le cas 4 de
  [`score-arbitre.test.js`](../src/recherche/tests/lents/score-arbitre.test.js)
  ne vérifie que `mab`.
- **Trois moissons en attente d'arbitrage**, en `todo` « arbitrage ouvert » dans
  [`src/recherche/tests/lents/recherche.test.js`](../src/recherche/tests/lents/recherche.test.js) :
  `hope-hope-hope.fr` mène cinq séries de 666 en tête de liste ;
  `https://hope-hope-hope.fr/` atteint les six séries ; le « fr » reste en sept
  segments (4 + 2) au lieu de passer par `mpy+mr9`. Chaque test cite la
  préférence de l'auteur qu'il gèle.
- **La partition élégante de `https://reinfocovid.fr/`**
  (`0.1:mch+cs+prn,3.1:fc+nl,5.1:m7+cs`) n'est toujours pas dans la liste,
  ni au cran 0 ni au cran 2.
  → [A-VENIR-retours-cornes-et-moteur.md](A-VENIR-retours-cornes-et-moteur.md), §4
- **Les bornes de l'étage des retouches**, jamais balayées l'une contre l'autre.
  → [A-VENIR-retouches.md](A-VENIR-retouches.md), §3, « Ce qui reste ouvert sur
  cet étage »

## Les glyphes

- **La lecture cyclique des boucles fermées.** Le test « les panses n'ont aucune
  poignée oblique » est en `todo` dans
  [`src/app/glyphes.test.js`](../src/app/glyphes.test.js) : la mesure d'un trait
  fermé n'est pas lue cycliquement, le sommet proche de la couture échappe à la
  détection, et il manque le bas de l'ovale de l'`O`. Ce n'est pas un réglage à
  trouver, c'est une lecture à écrire.
