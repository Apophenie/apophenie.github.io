# Scène plus large, commandes visibles à l’arrivée

La page de démonstration passe d’un plafond de 72 rem à 112 rem, dans les
deux registres. Le registre latéral conserve sa largeur ; l’espace gagné
revient à la scène et à ses commandes. Les autres pages gardent leur largeur.

La hauteur maximale de la scène utilise la hauteur dynamique de la fenêtre,
moins la position réelle du cadre dans le document, la hauteur du contrôleur
(y compris ses retours à la ligne), les bordures et une marge de 16 px.
Un ResizeObserver actualise cette réserve lorsque le titre, les commandes ou
l’en-tête changent de taille ; le redimensionnement de la fenêtre la met aussi
à jour. La mesure ne dépend pas du défilement. L’observateur est débranché au
changement de page, et le plein écran garde son propre dimensionnement.

Sur les fenêtres de moins de 600 px de haut, les marges du titre et sa taille
diminuent pour préserver une scène utilisable en paysage.

Contrôle Chromium à l’ouverture, en scénique et en sobre : 1920×1080,
1366×768, 1024×768, 390×844 et 844×390. Pas de débordement horizontal ; scène
et contrôleur restent au-dessus du bas de la fenêtre. En Full HD, la scène
mesure environ 1342×711 px et le contrôleur occupe une rangée de boutons,
avec son bord inférieur à 1064 px pour une fenêtre haute de 1080 px.

Les 43 tests existants du transport, du plein écran et de l’amorçage passent.
Les cinq builds réussissent.
