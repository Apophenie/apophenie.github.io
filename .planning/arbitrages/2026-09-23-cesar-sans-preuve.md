# Présentation des César sans preuve

Les `fr1` à `fr25` affichent désormais leur titre avec la table, sans attendre
la fin du déplacement. Le décalage connu fournit directement la cible du
compteur : `César 0 != N`, puis `César N`. Aucune justification n’est recherchée.

Ils utilisent le même pointeur fin que les César avec preuve, avec sa pointe
au contact des bords des cases. Le coulissement utilise `EASE.move` : départ
progressif et ralentissement à l’arrivée. Les instants de chaque cran, les
oscillations, le compteur et les passages aux extrémités suivent cette même
progression, via son inverse pour les événements définis en distance.

À l’arrivée, la couture Z–A s’ouvre avant les conversions. Le pointeur
disparaît entièrement avant le rangement du titre. Le titre et le compteur
suivent le décor lors d’un déplacement de la vue et disparaissent avec lui.
Les César avec preuve conservent leur cadence actuelle.

Validation : 44 tests ciblés réussis (compteur, compilation, cadrage et
conversions simultanées). Les 25 `frN` sont vérifiés à vitesse normale et
doublée : apparition du titre dès le départ, vitesse variable, nombre exact
de crans, compteur synchronisé et espace Z–A avant le vol des lettres.
Contrôle dans Chromium de « Test » en `fr4`, pendant la descente puis après
l’ouverture de la couture. Les cinq builds réussissent.
