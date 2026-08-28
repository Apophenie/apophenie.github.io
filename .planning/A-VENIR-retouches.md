# À VENIR — la RETOUCHE : ce qui est livré, et les deux choses qui restent

> Ce document est un **report** et un **passage de relais**, pas une recherche.
>
> Ce qui est FAIT et livré : la grammaire (`;`), le rejeu, la scène, le lien
> canonique, et le générateur de recherche — **écrit, mesuré, éprouvé par des
> tests, mais DÉBRANCHÉ**.
>
> Ce qui reste : **(1) que le barème charge l'étage amont**, ce qui est la
> condition pour brancher le générateur ; **(2) la scénographie du 6
> surnuméraire** que l'auteur a décrite.

---

## 1. La demande, telle que l'auteur l'a écrite

> Pour "Donald Trump" ce que je voudrais, et qui n'est pas encore géré :
> `#so!2.1:fr13,tca+mtal+m14+mpf#2HuP1G8mNg3sJWhqR`
> En gros, on fait la conversion fr13 sur le 2nd mot, puis on trie l'ensemble,
> on applique m14 à l'ensemble, on enlève les chiffres minoritaires / on garde
> le chiffre majoritaire.
>
> […] si le programme entre ## s'écrit différemment, ça me va du moment que ça
> produit l'effet que je décris.
>
> Il reste un 6 de trop au verdict ; une fois les 6 réunis, celui (ou les deux)
> du centre surnuméraire disparaît (explose en mode scénique pour propulser les
> autres à grossir avant que la foudre ne les enflamme).

## 2. Ce qui est livré

**La notation est `;` et non `,`** — voir l'en-tête de `src/recherche/url.js`,
qui porte l'argument complet. En deux lignes : la virgule dit déjà « ces deux
morceaux donnent chacun leur chiffre », et `url.js` **lit la grammaire sans
catalogue** (c'est ce qui permet de tester `src/recherche` sur un catalogue de
fantaisie), donc il ne peut pas trancher en regardant si `fr13` rend du texte ou
un chiffre. Le sens devait être écrit, pas déduit.

**Le lien exact qui produit la démonstration décrite** :

```
#so!2.1:fr13;fl+tca+mtal+m14+mpf#2HuP1G8mNg3sJWhqR
```

Deux écarts avec ce que l'auteur avait écrit, tous deux mesurés :

- la virgule devient `;` (ci-dessus) ;
- **`fl` s'ajoute en tête du second étage**, et ce n'est pas un ornement : `tca`
  fait un jeton de l'espace entre les deux mots, et `m14` n'a aucun segment pour
  une espace. Sans `fl`, le programme n'est pas applicable et le lien est refusé
  (`retouche — un programme qui ne rend PAS du texte est refusé, en le disant`,
  `tests/integration-visuel.test.js`).

Ce lien rend `Donald Gehzc` → `acDdeGhlnoz` → `[7,4,6,6,6,6,6,3,6,6,4]` →
`[6,6,6,6,6,6,6]` : **sept 6, donc deux séries et un 6 de trop** — exactement ce
que l'auteur annonce.

## 3. Ce qui reste, n° 1 : QUE LE BARÈME CHARGE LA RETOUCHE

C'est le vrai chantier, et il commande tout le reste.

**Le fait, en une phrase** : les opérations d'une retouche voyagent dans
`approche.retouches`, **à côté** de `approche.parts` et jamais dedans. Ni
`score.js › noter` ni `elegance.js › bilanApproche` ne les voient. Une voie
retouchée est donc notée comme si son étage amont était gratuit.

**Pourquoi elles ne sont pas dans `parts`.** `parts` a un sens précis partout
ailleurs — « un morceau qui rend un chiffre » — et c'est sur lui que se lisent le
mode, la moisson, le verdict et la géométrie des portées disjointes. Une retouche
ne rend pas de chiffre : la glisser là ferait déduire une PARTITION là où il n'y
a qu'une préparation, et un mode faux se propagerait jusqu'au titre et jusqu'au
malus de mode. Le pavé complet est dans `index.js › rejouer`.

**Ce que ça coûte, MESURÉ** — sur le barème du 28 août (`c292171`), générateur
branché (`retouches: true`), sur les dix-neuf saisies témoins du banc :

| | |
|---|---|
| voies retouchées proposées | **15**, dans **9** listes sur 19 |
| têtes de liste changées | **2** — « Donald Trump » et « Marie Curie » |
| coût CPU, saisie la plus lourde du banc | **+64 ms** (288 → 348 ms, JIT chaud) |
| coût CPU, les trois autres saisies lourdes | +13 à +24 ms |

Les deux têtes changées gagnent sur les deux tableaux à la fois :

```
Donald Trump   avant : fl+tca+m14                    [GROUPEMENT s=1] sc=2296 el=431
               après : 2.1:fr13;fl+tca+m14           [GROUPEMENT s=2] sc=5656 el=904
Marie Curie    avant : tca+masb+mrn,fatb+tca+mpy+mr9 [MOISSON s=2]    sc=2989 el=748
               après : 2.1:fatb;fl+tca+mpy+mr9       [GROUPEMENT s=2] sc=4798 el=817
```

⚠️ **DEUX RAISONS DE LE LAISSER DÉBRANCHÉ, et la première suffirait.**

1. **Il détrône la voie que l'auteur a nommée.** Sur « Donald Trump », la MOISSON
   `tca+m14+m36,fr13+tca+m14+m36` — « j'aimerais que le premier résultat suggéré
   soit la combinaison des deux » — sort carrément des deux premières lignes,
   les deux voies retouchées prenant les rangs 1 et 2 avec deux séries chacune.
   Le test `★ « Donald Trump » : deux 666 déjà formés, en tête de liste` rougit,
   et le contourner reviendrait à trancher à la place de l'auteur.
2. **Le budget n'a plus la place.** Le pipeline est plafonné à une seconde
   (`recherche.test.js`), et la saisie la plus lourde du banc y consomme déjà
   954 à 964 ms au démarrage à froid. +64 ms la fait passer par-dessus.

Le générateur reste donc derrière `creerMoteur(catalogue, { retouches: true })`,
et deux tests gèlent les deux moitiés de la décision : qu'il marche, et qu'il
soit débranché.

**Le garde-fou provisoire, en attendant.** `groupementsRetouches` n'émet une voie
que si la retouche apporte **strictement plus de séries** que le même programme
sans elle. Ça borne le dégât — une retouche ne peut pas gagner sa place sans rien
apporter — mais ça ne le supprime pas : ça reste un seuil à la place d'un prix.

**Le chemin, en trois étapes.**

1. **Décider ce que coûte une retouche.** Trois postes existants la décrivent
   déjà sans changement de nature : la CONCISION (une opération de plus), la
   NOTORIÉTÉ (`fr13` vaut 0,25 et `fatb` 0,25 — ce sont des chiffrements, pas des
   évidences), et l'HOMOGÉNÉITÉ (l'étage amont n'est pas la méthode du reste).
   S'y ajoute peut-être un quatrième, propre à l'étage : `FILTRE_SELECTIF` (100)
   existe déjà pour « un filtre qu'on n'applique qu'à un mot », et une retouche
   EST littéralement cela — appliqué au texte plutôt qu'aux chiffres.
2. **Donner à `noter` et à `bilanApproche` de quoi les voir.** Le plus petit
   geste possible est un accès en lecture à `approche.retouches` à côté de
   `approche.parts`, sans toucher à la sémantique de `parts` (voir ci-dessus
   pourquoi il ne faut pas les y verser).
3. **Rebrancher, et remesurer sur le banc.** Le tableau ci-dessus est la ligne de
   base ; si la voie de référence de « Donald Trump » reprend la tête une fois la
   retouche payée, la question est réglée. ⚠️ Il restera alors le budget : +64 ms
   sur une saisie qui en consomme déjà 960 sur 1 000. Les trois bornes de
   `groupementsRetouches` (six mots, quatre vecteurs, la saisie entière seule)
   sont là pour ça et n'ont pas encore été balayées.

## 4. Ce qui reste, n° 2 : LE 6 SURNUMÉRAIRE QUI EXPLOSE

> « Il reste un 6 de trop au verdict ; une fois les 6 réunis, celui (ou les deux)
> du centre surnuméraire disparaît (explose en mode scénique pour propulser les
> autres à grossir avant que la foudre ne les enflamme). »

**Non fait, et délibérément.** Deux raisons.

1. C'est de la **scénographie de verdict**, et l'auteur travaillait en parallèle
   sur celle des cornes au moment où ceci a été écrit. Deux mains sur le même
   geste, c'est un conflit garanti.
2. La géométrie que ça demande n'existe pas encore côté visuel. Aujourd'hui le
   surplus tombe par `drop` en même temps que le reste, dans le geste unique de
   récolte (`scenario.js`, « on ne trie qu'UNE fois, et juste avant le verdict »).
   Ce que l'auteur décrit est **l'inverse d'une chute** : une explosion qui
   PROPULSE, donc une causalité entre le jeton qui part et ceux qui restent.

**Ce qui est déjà là pour le faire, et ce qui manque.**

- Le surplus est **déjà identifié et séparé** : `construireScenario` calcule
  `surplus` (ce qui dépasse le multiple de la série ou le plafond `MAX_SERIES`)
  et `aJeter`, et les distingue déjà des rejets ordinaires. Le « 6 de trop » est
  donc nommé ; il ne demande qu'un autre geste.
- Le **rythme** est là aussi : `reglerLesCornes` sait avancer un couronnement au
  plus tôt, et `placeDuCouronnement` sait dire si la ligne le permet. L'ordre
  demandé — les 6 se réunissent, PUIS le surnuméraire explose, PUIS les autres
  grossissent, PUIS la foudre — est une suite de jalons de ce genre.
- Ce qui **manque** est une primitive. Le vocabulaire est FERMÉ (§3.1) : `drop`
  fait tomber, il ne fait pas exploser. Il faudra soit un mode de `drop`
  (`mode: 'burst'`, comme il y a déjà `fall` et la gomme sur place), soit une
  primitive neuve — et dans les deux cas, sa sémantique devra être écrite **deux
  fois** (la primitive dans `src/visuel/primitives/`, son modèle dans
  `scenario.js › suivreLaLigne`), que le test d'intégration tient d'accord.
  ⚠️ Un `burst` qui ne fait que retirer un jeton se modélise exactement comme un
  `drop` : `suivreLaLigne` n'aurait rien à apprendre. C'est la partie « propulse
  les autres à grossir » qui, elle, touche au layout.

## 5. Où regarder dans le code

| | |
|---|---|
| la grammaire, et POURQUOI `;` | `src/recherche/url.js`, en-tête |
| l'étage amont au rejeu | `src/recherche/index.js › rejouer` |
| les codes qui nomment la retouche | `src/recherche/index.js › marquerLesCodes` |
| le générateur, débranché | `src/recherche/assemblage.js › groupementsRetouches` |
| la scène | `src/recherche/scenario.js`, « L'ÉTAGE DES RETOUCHES » |
| le sous-titre qui la nomme | `src/recherche/titres.js › regleApproche` |
| les tests | `tests/url.test.js`, `tests/recherche.test.js`, `tests/integration-visuel.test.js` |
