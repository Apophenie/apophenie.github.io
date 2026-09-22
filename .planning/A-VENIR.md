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
- **Descendre le plancher du facteur d'élégance — mesuré, écarté le 22 septembre 2026.**
  L'auteur demande que « la QUANTITÉ DE SAISIE PERDUE, et le fait qu'une
  égalisation ne tombe pas juste » pèsent davantage. Mesuré, **le barème les pèse
  déjà, et lourdement** : sur la tête de « numherololgeek.1000i100.fr » aux
  curseurs `p25.200.50.150` (`fl+mqwc+meg`), l'égalisation coûte −3 000 et la
  saisie supprimée −648, pour un crédit brut de −1 951.
  ⚠️ **Le problème n'est pas le poids, c'est le PLAFONNEMENT.** `facteur()` borne
  le crédit à [`FACTEUR_PLANCHER`, 1 000], et **252 voies du corpus sur 381
  (66 %), 11 têtes de liste sur 19 (58 %), sont AU PLANCHER** — leur facteur vaut
  520 que le crédit brut soit à −294 ou à −3 242. Pour deux tiers de la liste, le
  barème mesure la perte puis jette sa mesure, et aucune repondération d'un poste
  de perte ne peut se voir sur une voie déjà écrasée. Reproductible :
  `node .planning/banc/classement.mjs --json --plancher N`.
  ⚠️ **Ce que ça coûte** (plancher 520 → 200, 19 saisies) : **0 tête change**,
  77 déplacements, et une **SORTIE SÈCHE** — sur « Emmanuel Macron »,
  `fl+tca+mt9+mtri` quitte la 3ᵉ place et RIEN n'entre (19 → 18 voies).
  « Le chat dort sur le tapis rouge » perd de même `fc+nlc,fc+nlc,fc+nlc` de la
  11ᵉ place, sa remplaçante n'arrivant qu'au rang 28.
  ⚠️ **Ce que ça rapporte** : rien de mesurable. Aucune tête ne bouge, et les
  trois cas qui motivaient la demande ne peuvent pas en profiter (voir ci-dessous).
  ⚠️ **Et il y a une raison de fond de ne pas s'y fier** : aux curseurs
  PERSONNALISÉS, l'ordre affiché est celui du global (`index.js ›
  rangerParLeGlobal`), qui ne lit PAS le crédit d'élégance — il ne lit que les
  quatre axes. Le crédit n'a alors prise que sur la SÉLECTION, jamais sur l'ordre.
  Faire peser la perte sur une tête à curseurs personnalisés demanderait de passer
  par l'axe `exhaustivite` de `score.js`, pas par le barème.
- **Les trois voies nommées par l'auteur le 22 septembre 2026 ne sont plus
  fabriquées.** Vérifié en élargissant la fouille, ce qui distingue « mal classée »
  de « inexistante » :
  · `0:nv,2+3:flt+mpy+mr9` sur « numherololgeek.1000i100.fr » — absente aux crans
    0, 1 et 2 (23, 38 et 65 voies). Elle était 1ʳᵉ en 3.1.0 ; `git bisect` (4
    étapes, sonde `.planning/banc/_bisect-cas7.mjs`, rejouable telle quelle)
    désigne
    **`7b80556`**, « Le code ASCII casse comprise, le point de code Unicode, et
    l'addition qui prépare l'égalisation » — les trois opérateurs `mas`, `mu8`,
    `mam`.
  · `fl+mz26+mr9+mrdE` sur « Marie Curie » — absente aux crans 0, 1 et 2 (16, 27
    et 40 voies). Le départage « je préfère `mz26` à `mas` » n'a donc plus d'objet
    en l'état : la voie à `mz26` n'existe plus pour être préférée.
  · `fr9+mas+mrd+meg` sur « Louis Fouché » au cran 3 (« elle finit sur 3 ») —
    absente aux crans 3, 4 et 5 (69, 76 et 89 voies). **Le défaut ne se reproduit
    plus** ; il a été refermé par les commits du 19-21 septembre (`mrd9`, `mrtE`,
    `mt9E`). Rien à faire.
  ⚠️ **LA PRÉFÉRENCE GELÉE DE L'AUTEUR EST DÉJÀ ROUGE SUR `main`.** Le test
  « score arbitre 7 — numherololgeek.1000i100.fr (v2) : la moisson nv /
  flt+mpy+mr9 mène, le leet partiel + mab est relégué »
  ([`tests/lents/score-arbitre.test.js`](../src/recherche/tests/lents/score-arbitre.test.js))
  échoue, et sa liste constatée est exactement celle qu'on mesure à la main :
  `fl+mqwc+meg · fl+mazc+meg · 0:fr3+mt9+meg · 0:fr1;fr4+mas+mdc3 · 0:maz4+mrdE`.
  Le retour de l'auteur du 22 septembre ne signale donc pas un désaccord de goût
  nouveau : il redit à la main ce que la suite lente criait déjà.
  ⚠️ **ET CE N'EST PAS UNE VOIE, C'EST UNE FAMILLE.** La suite lente de `main`
  est déjà ROUGE sur un second point, et pas en `todo` : le test affirmatif
  « ★ moisson — la voie groupée de `hope-hope-hope.fr` est dans la liste au cran
  2, et `fl+m14` avec elle » échoue des deux côtés, au mot près — « cran 2 : la
  voie groupée est absente des 64 voies », « cran 0 : […] des 34 voies ». Ce test
  gèle une préférence de l'autrice (README des lents, § « Les `todo` d'arbitrage »
  : le `todo` a été RETIRÉ le 16 septembre, l'énoncé est devenu affirmatif). Il
  est tombé depuis, sans que personne le rattache à sa cause.
  → À reprendre comme une question de FABRICATION (`assemblage.js`), pas de
  barème — et en traitant les moissons de `hope-hope-hope.fr` avec celles de
  l'auteur : c'est vraisemblablement le même mécanisme qui les fait toutes
  disparaître.
- **Les absorptions en ficelles (`mab`/`mabx`/`mabd`) — essayé, mesuré, écarté.**
  « Peut-être que c'est `mab` qu'il faudrait ajouter aux ficelles pour que ça ne
  soit utilisé qu'en dernier recours » (l'autrice). C'est FAISABLE : le registre
  de `elegance.test.js` n'est pas un obstacle, et le compteur `absorptions` se
  scinde (`absorptionsExactes` pour `mrdE`) sans toucher au barème — contrôle au
  bit près sur les 24 voies à `mrdE` : diff VIDE. Le prix, lui, reste la SOMME des
  deux compteurs, donc `mab` ne paie pas un poste de plus.
  ⚠️ **Ce que ça coûte** : 1 liste sur 26 change, 0 tête sur 26 — et ce seul
  changement est une SORTIE SÈCHE. Sur « Sarah Kerrigan » → 007, `tca+masb+mabx`
  (global 572, rang 8 sur 11) quitte la liste et RIEN n'entre, pendant que trois
  voies moins bien notées survivent (547, 538, 518). La cause est mesurée :
  `vierge()` et `honnete()` (`assemblage.js` 1613 / 1723) ne nommaient que
  `m.absorption` et ramassent `mabx`/`mabd` dès qu'ils entrent dans `FICELLES` ;
  le siège « addition uniquement » les refuse alors à bon droit, mais AUCUN
  successeur éligible n'existe pour reprendre la place.
  ⚠️ **Ce que ça rapporte** : aucune mesure ne le constate. L'option 1 (siège doté
  de sa propre liste de refus) déloge déjà les trois `mab` des lignes réservées,
  « Marie Curie » comprise, sans geste dédié.
  Deux replis ont été mesurés et tous deux refusés : exempter `mabx`/`mabd` des
  deux filtres rend 0/26 mais ROUVRE SCIEMMENT l'omission que l'inscription venait
  de fermer (un chiffre propre acheté en débranchant ce qu'on installe) ; faire
  retomber le siège sur un candidat non encore élu ne change RIEN (mesuré :
  liste identique à l'octet près). Écarté le 17 septembre 2026.
- **Deux têtes `alambiquée` sur « Sarah Kerrigan » → 007 — condition PRÉEXISTANTE.**
  `=mdl0!fatb+tca+mexc+cs` et `=mdlc!fr14+tca+mt9+cp` occupent les deux lignes
  réservées de ce couple et comptent 8 gestes chacune. `fenetre-sieges.mjs` les
  signale à chaque passage. Ce n'est imputable à aucun chantier récent : vérifié
  sur DEUX arbres (têtes changées 0/26 des deux côtés). À traiter pour elles-mêmes
  si on y revient, pas comme une régression.

## Les glyphes

- **La lecture cyclique des boucles fermées.** Le test « les panses n'ont aucune
  poignée oblique » est en `todo` dans
  [`src/app/glyphes.test.js`](../src/app/glyphes.test.js) : la mesure d'un trait
  fermé n'est pas lue cycliquement, le sommet proche de la couture échappe à la
  détection, et il manque le bas de l'ovale de l'`O`. Ce n'est pas un réglage à
  trouver, c'est une lecture à écrire.

## L'outillage

- ~~**La suite lente relancée après coup.**~~ **Fait, sur la vraie suite.**
  Interrompue en plein vol par `SIGINT` au PID du lanceur, après 10 fichiers
  verts sur 17 : les 4 fichiers en cours sont sortis en `code 143` sans bilan
  TAP, donc comptés ROUGES et jamais verts ; la descendance capturée avant la
  coupe — douze PID, `sh`, `node --test` et les petits-fils isolés — était
  **entièrement éteinte** après, vérifiée PID par PID ; l'état de reprise
  contenait exactement les 10 verts. La reprise a ensuite relancé **les 7
  fichiers manquants et eux seuls**, est repassée verte (code 0), et a **effacé
  l'état** qu'elle venait d'épuiser. Les cinq promesses tiennent.
- **La table des durées de référence est complète, et elle a changé de nature.**
  [`scripts/durees-lentes.json`](../scripts/durees-lentes.json) porte désormais,
  pour les dix-sept fichiers, un `cpuSecondes` et un `murSecondes` nommés plutôt
  qu'un nombre dont il fallait deviner l'unité. La passe verte du 17 septembre y
  a inscrit `monotonie` et `recherche`, qui manquaient faute d'une première
  passe verte — la table refuse toujours, à dessein, les durées d'une relance
  seule.
  Ce qui reste ouvert n'est plus le remplissage mais le RÉGLAGE : le facteur du
  budget CPU est resté à 4, celui d'avant, alors que le CPU est bien plus stable
  que le mur et permettrait sans doute plus serré. Le resserrer demande une série
  de passes sur plusieurs machines et plusieurs charges, pas une intuition — et
  un garde trop serré tue des fichiers sains, ce qui est plus grave que de
  laisser courir un blocage quelques minutes de trop.
