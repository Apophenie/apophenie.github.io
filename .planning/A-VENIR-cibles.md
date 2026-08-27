# À VENIR — la mise en scène des cibles autres que 666

> Ce document est un **report**, pas une recherche. Il consigne une demande de
> l'auteur, transmise mot pour mot, dont il a lui-même remis l'exécution à plus
> tard : « note en todo les variantes auréoles et compagnie, mais concentre-toi
> sur le moteur de calcul en mode sobre, on verra plus tard pour les variantes
> scéniques ».
>
> Ce qui est FAIT et livré : le moteur vise une suite de chiffres arbitraire, la
> cible voyage dans l'URL (`c111!`), le listing sait la changer. Voir
> `src/recherche/cible.js` et l'amendement « LA CIBLE » de `CONTRACTS.md §4.2`.
>
> Ce qui reste : **le décor du verdict**, et lui seul.

---

## 1. La demande, telle que l'auteur l'a écrite

> Les cornes de diable sont l'emblème du 666. Chaque autre cible a le sien :
>
> - **111** : une auréole.
> - **777** : un jackpot — des pièces, des billets, à toi de voir, mais **plutôt
>   une animation ponctuelle que quelque chose qui reste**. Si quelque chose doit
>   rester, ce serait un effet de cases de machine à sous autour de chacun des 7
>   du triptyque.
> - **13** : deux variantes scéniques — **fer à cheval** pour la version
>   porte-bonheur, **merde** pour la version porte-malheur. « Donc au lieu de
>   `so!` et `sce!` on aurait `so!`, `bo!` et `ma!` ».
> - **007** : un revolver, ou des lunettes, ou une voiture — bref une référence à
>   James Bond.
> - **000** : un **trou noir** en `sce!`, la **faux de la faucheuse** en `ma!`, et
>   **deux dés 10** — qui évoquent la réussite critique au D100 — pour `bo!`.

Le détail du 777 — *ponctuel plutôt que persistant* — n'est pas un détail de
goût : il rejoint mot pour mot l'arbitrage déjà tranché sur l'orage sonore
(`CONTRACTS.md §0.4`, « L'ORAGE SONORE passe de quatre sons à TROIS »), où
l'auteur a retiré la nappe continue au motif qu'« un fond continu ne peut
souligner AUCUN instant, par définition ». La même règle vaut ici, et la réserve
qu'il pose — « si quelque chose doit rester, ce serait un effet de cases de
machine à sous autour de chacun des 7 » — dit exactement ce qui a le droit de
persister : un décor **accroché à un chiffre**, comme les cornes, jamais un fond.

## 2. L'état du dépôt aujourd'hui, et ce sur quoi le chantier s'appuiera

**Le registre de mise en scène a DEUX valeurs, et n'a pas bougé** :
`sobre` (`so!`) et `scenique` (`sce!`), dans `src/recherche/url.js`. `bo!` et
`ma!` n'existent pas.

**Un point d'ancrage a été posé, et un seul** — `miseEnSceneDisponible(cible)`
dans `src/recherche/url.js` :

```js
export const miseEnSceneDisponible = (cible) => normaliserCible(cible).defaut;
```

C'est là que la connaissance « quelles cibles ont un emblème » est centralisée.
Tout le reste en dépend et n'aura pas à changer :

- `registreEffectif(registre, cible)` replie `sce!` sur `so!` pour toute cible
  sans emblème, **à la lecture ET à l'écriture** ;
- `registresDisponibles(cible)` décide du nombre de boutons d'un panneau de voie
  (`src/app/pages/resultat.js`) ;
- `autreRegistre(registre, cible)` rend `null` quand il n'y a rien à basculer ;
- `construireScenario` (`src/recherche/scenario.js`) force le registre sobre pour
  une cible sans emblème, y compris hors de tout lien.

**Le jour où l'auréole existe, c'est cette ligne-là qui change.**

## 3. Les deux questions restées ouvertes — et la réponse de l'auteur

Elles avaient été posées ainsi :

1. que se passe-t-il si l'on demande `bo!` sur une cible qui n'a pas de variante
   bonheur/malheur (666, 111, 777, 007) ?
2. que vaut `sce!` pour une cible qui n'a que `bo!` et `ma!` (13) ?

**L'auteur a tranché les deux d'un coup** : « quand `bo!`, `ma!` ou `sce!` est
utilisé dans un cas non supporté → repli en sobre ». C'est déjà la règle
implémentée (`registreEffectif`), et elle s'étendra aux deux registres nouveaux
sans changer de forme.

Reste une question qu'il n'a pas tranchée, et qu'il faudra lui poser :

> ⚠️ **`bo!` et `ma!` sont-ils des registres à part entière, ou deux variantes de
> `sce!` ?** La formulation de l'auteur — « au lieu de `so!` et `sce!` on aurait
> `so!`, `bo!` et `ma!` » — suggère que sur `13`, `sce!` **disparaît** au profit
> des deux humeurs, plutôt que de cohabiter avec elles. Si c'est bien cela, alors
> `REGISTRES` n'est plus une liste fixe : c'est une fonction de la cible, et
> `registresDisponibles` devient le point d'entrée principal plutôt qu'un
> accessoire. Le code y est prêt — il rend déjà une liste — mais la table des
> emblèmes devra dire, par cible, **quels registres existent** et non seulement
> **quel dessin va avec**.

## 4. Ce que le chantier coûtera, mesuré sur le précédent

Les cornes ne sont pas un dessin, c'est un contrôle croisé
(`CONTRACTS.md §0.3`) : `src/visuel/primitives/horns.js` pousse « dans le
prolongement exact du flanc du 6, dérivé de la police », et la CI vérifie le
calage (`src/visuel/tests/cornes.test.js`). Cinq emblèmes à ce niveau
d'exigence, ce n'est pas cinq fois un `<path>` — c'est cinq fois la question
« qu'est-ce que ce dessin ATTESTE ? ».

Deux d'entre eux échappent peut-être à cette question, et c'est par eux qu'il
faudrait commencer :

- l'**auréole** du 111 se pose au-dessus du triptyque entier plutôt que sur un
  chiffre : un seul nœud, une seule géométrie, aucun ancrage par glyphe ;
- les **dés 10** du 000 en `bo!` sont deux objets autonomes, posés à côté du
  verdict — ils n'ont rien à épouser.

Le **jackpot** du 777, lui, demande de l'animation ponctuelle (donc une op du
vocabulaire fermé §3.1, ou l'extension d'une existante), et le **revolver** du
007 pose une question de droit d'auteur autant que de dessin.

## 5. Ce qui ne doit PAS bouger en le faisant

- Le **registre de codes d'opérateurs** reste clos (`CONTRACTS.md §4.1`). Un
  emblème n'est pas un opérateur : il ne transforme aucun état, il décore un
  verdict. C'est du vocabulaire VISUEL (§3.1), pas du catalogue.
- Le **contrôle croisé de `horns`** — « seuls trois 6 font un 666 »
  (`src/visuel/scenario.js`) — ne se relâche pas. Un emblème par cible, c'est
  un contrôle croisé par emblème, pas un contrôle croisé assoupli.
- La **non-régression sur 666** : les cornes gardent leur dessin, leur calage,
  leur émission et leur test. Elles sont l'emblème d'une cible parmi d'autres,
  pas un cas particulier à refondre.
- ⚠️ L'**émission** des cornes — `reglerLesCornes` dans
  `src/recherche/scenario.js` et l'opérateur `m36` — décide QUAND un décor
  apparaît au fil de la démonstration. C'est un sujet distinct de « QUEL décor
  pour QUELLE cible », et il était en cours de refonte par un autre agent au
  moment où ce document a été écrit.
