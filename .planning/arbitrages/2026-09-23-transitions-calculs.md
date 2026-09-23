# Enchaîner les phases de calcul sans pause de redécoupage

Demande : après les anciennes accolades, mêler le resserrement des espaces
et le redécoupage en une transition presque instantanée, aussi bien en mode
simultané qu’en mode pas à pas, notamment pour les passes de `mrdE`.

Le raccord entre deux phases utilise désormais une seule redistribution de
150 ms. Les résultats restent en place pendant le retrait des accolades ;
la préparation des signes suivants ferme ensuite les trous et installe les
nouvelles paires dans le même mouvement. Les nouvelles accolades commencent
à se tracer aussitôt les signes installés.

Si un résultat doit être séparé en chiffres, ses glyphes deviennent des
jetons indépendants sur place, sans déplacement. Cette étape réserve une
seule image (16 ms), sans pause de lecture. Un découpage invisible ne réserve
plus les 1 800 ms du découpage animé dans l’ordonnanceur.

Les raccords couvrent les niveaux d’addition, les réductions et les passages
entre deux passes de `mrdE`. Les autres opérateurs qui utilisent ces mêmes
phases bénéficient aussi du raccord. Les cornes d’un 666 stable apparu à cet
endroit accompagnent le retrait des accolades, sans étape d’attente ajoutée.
Leur constat reste présent dans les jalons du scénario.

À vitesse normale, le délai après disparition des accolades est donc de
150 ms, ou 166 ms avec séparation en chiffres. La vitesse globale raccourcit
les mouvements ; la séparation garde au plus une image de navigation.

Vérification : rejeu de « Didier Raoult » via `fmaj+tca+mas+mrdE` dans
Chromium, avant et après la séparation des résultats en chiffres. Tests des
raccords dans les deux modes à vitesse normale et ×10 : aucune redistribution
intermédiaire, délai borné, aucune animation concurrente signalée et même
résultat final. Test dédié au coût nul du découpage invisible dans les deux
modes.

Validation finale : suite rapide de 1 002 tests, 1 001 réussites, aucun échec,
un TODO de glyphe préexistant ; 32 tests ciblés réussis après le dernier
ajustement de vitesse ; les cinq builds réussissent.
