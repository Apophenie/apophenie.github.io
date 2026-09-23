# Audit du moteur d’animation — 24 septembre 2026

Point de retour avant refonte : commit `8b9109f`, tag `v3.2.1-debug`.

## Périmètre et vérifications

Les 232 opérateurs du catalogue ont été parcourus sur leur vecteur gelé. Les
231 qui émettent des étapes ont été compilés en mode pas à pas et simultané :
462 compilations, 687 étapes sources. `m09` est une lecture implicite sans étape
et n’est donc pas compilable isolément. Aucun écart de résultat final entre les
deux modes n’a été observé sur ces vecteurs. La suite rapide passe : 1 019 tests
réussis, un test TODO connu, aucun échec (environ 67 s).

Cette couverture est représentative du catalogue, mais ne prouve pas tous les
enchaînements, toutes les saisies ou chaque image intermédiaire. Six primitives
(`reveal`, `wait`, `horns`, `rule`, `convert`, `insert`) ne sont pas exercées par
les vecteurs isolés ; elles ont des tests ciblés ailleurs.

## Constats

1. **Avertissements d’animations concurrentes.** `fcnj` et `faux` produisent,
   dans les deux modes, deux animations d’opacité simultanées sur la même
   accolade (`@group:0`, plages 2224–3148 et 2700–3000 ms). Le fondu planifié
   par `fadeAt` recouvre un autre fondu du même tracé ; il faut départager la
   fermeture déclarée et le suivi des sources. La suite rapide ne vérifie pas l’absence d’avertissements pour chaque
   opérateur du catalogue.
2. **Calculs par paquets non homogènes.** L’émetteur `etapesEnLargeur` pose tous
   les signes via un seul `insertOperators.lots`, puis plusieurs `sum` avec
   `garderPlace`, et enfin un `move` qui retire toutes les accolades. En pas à
   pas, les sommes sont sérielles, mais les signes précèdent tous les calculs
   et les accolades attendent la dernière somme. En simultané, les calculs
   démarrent en vague, mais une somme finie garde son accolade jusqu’à la fin
   commune. Ce modèle apparaît sur les vecteurs de `mrn`, `mrd`, `mrdE`, `mad9`,
   `mrd9`, `md9E`, `mrtE` et `mt9E` ; plusieurs autres variantes partagent
   l’émetteur.
3. **Trois niveaux d’ordonnancement se recouvrent.** `rythme.js` déplace les ops
   d’une étape ; `vagues.js` réordonne et regroupe les étapes indépendantes ;
   `compile.js` applique un traitement particulier aux conversions en table et
   au clavier. Ces niveaux ne partagent pas une définition explicite des phases
   d’un calcul. `memeGeste` compare une liste limitée de propriétés ; les
   dépendances sont reconstruites séparément dans `empreinteDe`,
   `empreinteEtape` et `produitsDe`. Chaque nouvelle option peut donc modifier
   un geste sans modifier toutes les décisions de regroupement.
4. **Une accolade n’a pas de propriétaire explicite.** `retirerLesAccolades`,
   `refermerSurLesResultats` et le `move` final agissent sur toutes les
   accolades ou tous les résultats en attente de l’étape. L’essai de fermeture
   locale des additions a montré que la garde `finsDesAccolades` suppose elle
   aussi une seule fin d’action par étape : elle compare le premier fondu à la
   dernière opération de tous les paquets. Ce n’est pas une preuve de défaut
   visuel supplémentaire ; c’est une limite mesurée de la représentation et
   du test actuels.
5. **La simultanéité dépend du cas de figure.** Les conversions disposent de
   vagues de décor, les calculs isolés de zones indépendantes, les sommes par
   paquets de `garderPlace` et d’une fermeture commune. Les tests couvrent les
   exemples majeurs, mais aucun contrôle transversal ne compile chaque vecteur
   dans les deux modes avec égalité du résultat et zéro avertissement.

## Corrections proposées, dans cet ordre

1. Ajouter un contrôle rapide, fondé sur les vecteurs gelés, qui compile les
   deux modes, compare le flux final et signale les animations concurrentes.
   Traiter `fcnj` et `faux` en supprimant le fondu en double à sa source.
2. Définir un geste de calcul avec phases explicites : apparition de ses signes,
   calcul, arrivée du résultat, fermeture de **son** accolade, puis restitution
   de **sa** place. Le mode pas à pas enchaînerait ces gestes ; le mode
   simultané décalerait de 100 ms les gestes indépendants. Un réajustement
   commun de la ligne resterait possible, sans retenir les accolades terminées.
3. Rattacher chaque signe, accolade, résultat et réservation de place au geste
   qui les crée. Les fonctions de fermeture recevraient cette portée ; elles ne
   balaieraient plus toute l’étape. Le test de fin d’accolade mesurerait alors
   chaque geste, et non le premier fondu contre la dernière action de l’étape.
4. Unifier la décision de simultanéité autour des sources, produits et effets
   sur la mise en page d’un geste. La même description servirait à ordonner les
   ops et les étapes, puis aux conversions ; les effets globaux garderaient un
   verrou explicite. Vérifier séparément les tables, claviers, accolades et
   zones indépendantes sur des scénarios à plusieurs phases.

Le correctif exploratoire de `mrdE` n’est pas inclus dans le point de retour :
il produisait encore des échecs de géométrie et de chronologie des accolades.
La refonte doit résoudre ce contrat commun avant de le réintroduire.
