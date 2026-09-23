# Audit avant publication — 23 septembre 2026

État audité : `eeae311`, branche `reprise-chantiers`, arbre initialement propre.
Audit transversal des contrats moteur/recherche/URL/animation, de l’interface,
du transport de recherche et de la chaîne de validation. Ce bilan ne constitue
pas une preuve exhaustive de l’absence d’autres défauts.

**Publication à différer.** La validation rapide est rouge et plusieurs
incohérences reproductibles nécessitent une correction. Aucun changement
fonctionnel ni aucune publication n’ont été effectués pendant cet audit.

## 1. P1 — Le test de plein écran bloque la validation de la nouvelle bascule

Références : `src/app/pleinecran.test.js:416`, `src/app/transport.js:298`.

Le test interdit `aria-pressed` dans la totalité de `transport.js`, alors que
son exigence porte sur le bouton de plein écran. La nouvelle bascule des
opérations utilise légitimement cet attribut avec un nom accessible stable.
Le test échoue donc sans démontrer une régression du plein écran.

Reproduction : `bun run test`. Résultat observé : 1 008 tests, 1 006 réussites,
1 échec et 1 TODO. L’échec empêche `bun run check` d’atteindre la suite lente
et le build ; cette commande est utilisée par les CI GitLab et GitHub.

Correction : limiter l’assertion au bouton de plein écran, idéalement en
vérifiant son comportement/accessibilité plutôt que le texte du module entier.
Conserver l’état accessible de la bascule des opérations.

## 2. P1 — Après la mort du worker, les recherches suivantes peuvent attendre indéfiniment

Références : `src/app/travailleur.js:206`, `:242`, `:260` ;
`src/app/pont.js:419`.

Après la poignée de main, `onerror` rejette les demandes en cours, ce qui
permet leur reprise locale. Mais la promesse `pret` reste résolue sur le
transport du worker défaillant. La demande suivante repart vers ce worker ;
s’il ne répond plus et n’émet plus d’erreur, elle ne se termine jamais.

Reproduction avec l’injection `ouvrir` prévue par le module : un worker
factice répond au ping, émet une erreur sur la première recherche, puis ignore
les messages. La première promesse est rejetée ; la deuxième reste en attente
et `mode()` annonce toujours `sources`. Il s’agit d’une vérification du
protocole avec une doublure, pas d’un crash provoqué dans Chromium.

Correction : invalider le transport après l’erreur et sélectionner un repli
durable ou recréer un worker. Couvrir deux recherches successives après panne,
pas seulement le rejet de celle qui était en cours.

## 3. P2 — Le changement de niveau d’animation laisse un contrôleur incohérent

Références : `src/app/transport.js:234`, `:292` ;
`src/app/pages/demonstration.js:379`.

La présence des commandes de vitesse et d’opérations dépend de `lecteur.reduced`
uniquement à leur construction. Changer le réglage recompile le lecteur et
rafraîchit le contrôleur sans réévaluer la présence de ces commandes.

Reproduction dans Chromium sur une démonstration :

- ouvrir en animation complète puis passer en animation réduite : les deux
  commandes restent affichées alors qu’elles n’agissent plus sur l’animation ;
- ouvrir en animation réduite puis passer en animation complète : elles
  restent absentes. Il faut recharger la page pour les retrouver.

Correction : rendre la présence de ces commandes réactive au mode du lecteur,
en préservant les abonnements et les préférences lors de la mise à jour.

## 4. P2 — Un test lent fabrique des URL César invalides

Référence : `src/recherche/tests/lents/cesars-justifies.test.js:19`.

Le remplacement `/fj(\d+)/g` → `fr$1` conserve la recette explicite du César
justifié. Par exemple, `fj22~c+fl+m14` devient `fr22~c+fl+m14`, que le parseur
refuse correctement : « fragment illisible ».

Reproduction directe du remplacement et du parseur sur :
`?sce!fj22~c+fl+m14$7NFn8xBqb5eNAq3YCY`.
L’original est canonique ; la version remplacée est invalide. Le test complet
au cran 3 n’a pas été exécuté jusqu’à son terme pendant cet audit.

Correction : remplacer le descripteur de preuve complet par le code `frN`.
Il ne faut pas réintroduire une rétrocompatibilité : son absence est voulue.

## 5. P2 — Sans stockage disponible, les réglages ne changent plus

Références : `src/app/reglages.js:59`, `:227`, `:232`.

Les erreurs de `localStorage` sont absorbées, mais aucune valeur de secours
en mémoire n’est conservée. Les getters relisent immédiatement le stockage.
Une écriture refusée laisse donc le réglage à son ancienne valeur ou au défaut,
y compris pendant la session courante.

Reproduction Node avec `getItem()` retournant `null` et `setItem()` levant une
exception : `definirRythme('simultane')` retourne `simultane`, mais
`rythmeChoisi()` retourne encore `pasAPas`. La nouvelle bascule paraît inerte.
Ce cas concerne un stockage refusé/indisponible, pas systématiquement la
navigation privée.

Correction : conserver les préférences en mémoire lorsque leur persistance
échoue, avec la même source de vérité pour les setters, getters et événements.

## 6. P2 — Le test de sélection exige encore un César arbitraire remplacé par une preuve

Référence : `src/recherche/tests/lents/sieges.test.js:66`.

Pour « Le jardin sur le rocher de la maison » avec `simplicite: 200`, le test
exige exactement `fr1+tsy+mlm+mdc2`. La liste produite contient désormais
`fj1~0~msfr+tsy+mlm+mdc2` : la voie attendue a une justification explicite.
L’exigence littérale contredit donc le remplacement demandé des `fr*` par
des `fj*` lorsqu’une justification existe.

Échec confirmé sans les autres tests lents en cours, en 26,8 secondes :

```sh
node --test --test-name-pattern='curseurs personnalisés' src/recherche/tests/lents/sieges.test.js
```

Correction : adapter l’assertion au contrat actuel et continuer de vérifier
les deux voies sans perte et l’absorption. Ne pas rétablir artificiellement
le `fr1` pour satisfaire l’ancien instantané.

## Contrôles et limites

- Suite rapide complète : **1 006 réussites, 1 échec, 1 TODO** sur 1 008 tests.
- Les **cinq builds** réussissent ; avertissements de taille de bundle.
- `bun run segments:check` : les deux contrôles de conformité réussissent.
- Suite lente `scenario.test.js` : **30 tests réussis**.
- Suite lente `sieges.test.js` : **5 réussites, 1 échec** lors de la passe
  parallèle ; échec confirmé par une exécution isolée du test concerné (§6).
- La suite lente complète a été interrompue volontairement : certains budgets
  autorisent plusieurs heures. Le contrôle ciblé `integration-visuel.test.js`
  a également été interrompu sans verdict. Ils ne sont pas considérés validés.
- Vérifications manuelles Chromium : changement dynamique du niveau
  d’animation ; vérifications isolées Node : panne du transport, stockage
  indisponible et conversion de l’URL de preuve.

Avant publication : corriger les constats, puis obtenir un `bun run check`
complet vert. La réussite du build
seul ne suffit pas à valider cette version.

## Corrections après audit

Le tag annoté local `v3.1.0-debug` conserve l’état audité `eeae311`, avant
correction. Il ne correspond pas à une publication.

Les six constats sont corrigés :

- le contrôle `aria-pressed` vise maintenant le bouton de plein écran ;
- un worker en erreur est arrêté et son transport remplacé durablement par
  le canal local, ou par l’absence de transport si aucun repli n’existe ;
- la barre réévalue ses commandes lorsque le mode réduit change, sans perdre
  leurs écouteurs et sans conserver un bloc de réglages vide ;
- la comparaison des URL retire la recette entière en passant de `fjN` à `frN` ;
- les préférences disposent d’un secours mémoire en cas de refus du stockage,
  y compris pour une suppression de préférence ;
- le test de sélection accepte désormais la preuve explicite du César 1.

Des tests de régression couvrent la deuxième recherche après panne, avec et
sans canal local, les transitions du mode réduit dans les deux sens et les
écritures/suppressions refusées par le stockage. Le test des César distingue
maintenant la vérification du cran 0 de celle du cran 3, sans retirer les
exigences de conservation des voies ni de score.

Vérifications après correction :

- suite rapide complète : **1 010 réussites, aucun échec, 1 TODO préexistant** ;
- tests des préférences, après ajout du cas de suppression : **7 réussites** ;
- sélection lente ciblée (`cran 0|curseurs personnalisés`) : **4 réussites**,
  dont le rejeu des preuves César et l’assertion de sélection auparavant rouge ;
- **cinq builds réussis** ;
- Chromium : animation réduite → complète → réduite, commandes retirées puis
  rétablies correctement sans rechargement ;
- `git diff --check` : aucune anomalie.

Au moment de ce relevé, la suite lente exhaustive lancée par `bun run check`
est encore en cours (`/tmp/corrections-check.log`). Aucun verdict global vert
n’est revendiqué et aucune publication n’a été effectuée.
