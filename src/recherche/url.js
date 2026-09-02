// src/recherche/url.js
// Grammaire d'URL : lecture tolérante, écriture toujours canonique.
// CONTRACTS.md §4.2, §4.3, §4.4.
//
//   url        := {chemin} '#' [approche] '#' saisie
//              |  {chemin} '#' saisie                 // un seul `#`, voir plus bas
//   approche   := marqueur* (retouche ';')* fragment (',' fragment)*
//   marqueur   := registre '!' | 'c' chiffre+ '!'
//               |  'p' cran '.' cran '.' cran '.' cran '!'   // les 4 curseurs
//               |  'f' chiffre '!'                           // puissance de fouille
//   registre   := 'so' | 'sce'        (formes longues encore LUES, plus écrites)
//   cran       := chiffre+            // 0 à 200 ; 100 = position par défaut
//   retouche   := [portee ':'] programme       // STR → STR : réécrit la saisie
//   fragment   := [portees ':'] programme
//   portees    := portee ('+' portee)*         // un programme, plusieurs places
//   portee     := offset '.' longueur          // en jetons ; absent ⇒ saisie entière
//   programme  := code ('+' code)* | '?'+        // les '?' : une COMMANDE
//              // `tca` (« un caractère, un jeton ») est IMPLICITE : il ne
//              // s'écrit pas et se réinsère à la lecture — voir
//              // `CODE_DECOUPE_IMPLICITE`.
//   saisie     := b58(texte) | texte           // le b58 gagne, voir plus bas
//
// `+` sépare les OPÉRATIONS d'un même fragment (arbitrage utilisateur) — et,
// AVANT le `:`, les PORTÉES qui se partagent ce programme. Les deux régions sont
// étanches, voir « les portées groupées » plus bas.
// `,` sépare les FRAGMENTS dont les 6 s'assemblent en 666.
// `;` sépare les ÉTAGES : ce qui réécrit la saisie, puis ce qui la lit.
// `×3:programme` abrège la résonance (le même programme sur les 3 occurrences).
// `so!` / `sce!` préfixe l'approche entière — voir ci-dessous.
//
// ── LA SAISIE EN CLAIR, quand le base58 ne prend pas ───────────────────────
//
// « Si après le 2nd # une séquence non b58 est présente, plutôt que d'échouer,
// considère la chaîne comme étant la saisie brute (celle qui serait dans le
// champ de la page d'accueil). » (l'auteur)
//
// Une URL se tape à la main, se dicte au téléphone, se recopie d'un message.
// `#Donald Trump` est ce que quelqu'un écrit spontanément ; jusqu'ici c'était un
// lien mort. La tolérance est en LECTURE SEULE — `ecrire()` ne produit que du
// base58, et `canoniser()` réécrit la barre d'adresse dès l'ouverture : un lien
// tapé à la main se convertit tout seul en lien partageable, exactement comme
// `sobre!` s'abrège en `so!` sans qu'on ait rien demandé.
//
// ★ **QUATRE FORMES, et ce qui les distingue est le NOMBRE DE `#`** :
//
//     #Donald Trump              recherche, puis animation de la 1ʳᵉ voie
//     ##Donald Trump             recherche, puis ÉNUMÉRATION des voies
//     #c111!sce!#Donald Trump    recherche visant 111, puis animation scénique
//     #c111!#Donald Trump        idem, registre par défaut — la MAIN
//     #c111!#<b58>               la LISTE des voies visant 111 — la MACHINE
//     #so!tca+m36#Donald Trump   aucune recherche : CE programme, sur ce texte
//
// La première est le geste de « Révéler » (`pages/accueil.js`) : on cherche et
// on montre, sans passer par la liste. La troisième est la même chose avec des
// réglages — « si après les ...! il y a d'autres instructions, saute la
// recherche et effectue directement le programme demandé » (l'auteur), donc a
// contrario : tant qu'il n'y a QUE des marqueurs, on cherche.
//
// ⚠️ **UNE EXCEPTION, et elle n'est pas de moi.** `#c111!#…` — cible seule, sans
// registre — reste la PAGE DE RÉSULTATS visant 111, contre la lecture littérale
// de la règle ci-dessus. Deux raisons, et la seconde suffirait : c'est la forme
// que `ecrire({saisie, cible})` PRODUIT (le lien de partage de la page de
// listing), et l'écriture ne change pas ; et sans elle il n'existerait aucune
// façon de demander l'énumération pour une autre cible que 666. Le registre,
// lui, n'est jamais écrit sans programme : `#so!#…` ne dénotait rien, il dénote
// désormais l'animation. La frontière est celle qui était déjà argumentée plus
// bas, mot pour mot — le registre dit comment MONTRER une démonstration, et une
// liste n'en montre aucune ; la cible dit ce qu'on CHERCHE, et une liste est le
// résultat d'une recherche.
//
// ★ **LE BASE58 GAGNE TOUJOURS**, et la règle tient en trois conditions.
//
// La collision est réelle, et vaste : l'alphabet base58 est fait de lettres et
// de chiffres, si bien que 134 357 des 346 244 mots de `/usr/share/dict/french`
// — 39 % — n'emploient que les 58 signes autorisés. « Macron », « chat »,
// « aide » en sont. Ce n'est donc pas `estBase58()` qui peut trancher.
//
// Ce qui tranche est le DÉCODAGE. Un texte quelconque lu comme un grand entier
// puis redécoupé en octets ne fait presque jamais de l'UTF-8 valide — « Macron »
// et « chat » échouent là —, et quand il en fait, ce sont des caractères de
// COMMANDE : « amour » rend U+0016 Ƕ a, « cat » rend U+0001 ә. Or le site n'a
// jamais encodé un caractère de commande : le champ d'accueil est un `<input
// type=text>` qui n'en accepte aucun et qui coupe les blancs de bord
// (`pages/accueil.js`).
//
// D'où la règle, déterministe et sans horloge (§4.4) — c'est du base58 si :
//   1. la chaîne n'emploie que les 58 signes de l'alphabet ;
//   2. elle décode en UTF-8 valide ;
//   3. le texte obtenu ne porte AUCUN caractère de commande (C0/C1) et n'est
//      pas fait que de blancs.
// Les trois tiennent ⇒ c'est du base58, parce que c'est ce que le site PRODUIT
// et qu'un lien produit par le site ne doit JAMAIS être relu comme autre chose.
// Sinon, c'est le texte lui-même.
//
// ⚠️ **LE PRIX, MESURÉ SUR LE MÊME DICTIONNAIRE** : 435 mots sur 346 244
// (0,13 %) restent lus comme du base58. Vingt-quatre sont des lettres seules —
// les 25 minuscules de l'alphabet décodent en « ! » à « 9 » — et les 411 autres
// font 4, 5, 8, 11 ou 12 signes, les seules longueurs qui rendent un compte rond
// d'octets imprimables : « aide » rend « db9 », « abattent » rend « Cwd!9a ».
//
// Ce reste est tenable pour une raison qui n'est pas une excuse : L'ÉCHEC EST
// BRUYANT. La page cite entre guillemets, en titre, la saisie qu'elle a
// comprise — qui écrit `##aide` lit « db9 » du premier coup d'œil. §4.3 interdit
// les replis MUETS ; celui-ci se dénonce tout seul, et le remède est à portée :
// `##<b58 de « aide »>`, que le champ d'accueil produit de toute façon.
//
// ⚠️ Et il n'y a PAS de quatrième condition à ajouter. Une longueur minimale
// tuerait la plupart de ces 435 mots — mais elle tuerait aussi `##KD8Z`, qui est
// le lien légitime de la saisie « 666 », quatre signes. Un lien produit par le
// site passe avant un mot du dictionnaire. Second angle mort, théorique
// celui-là : une saisie qui contiendrait vraiment un caractère de commande
// serait relue en clair au lieu d'être décodée. Aucun chemin de l'interface ne
// peut en produire une.
//
// ── LA RETOUCHE, `2.1:fr13;…` — transformer UN mot, puis lire LE TOUT ───────
//
// « Pour "Donald Trump" ce que je voudrais, et qui n'est pas encore géré : on
// fait la conversion fr13 sur le 2ᵉ mot, puis on trie l'ensemble, on applique
// m14 à l'ensemble, on enlève les chiffres minoritaires. » (l'auteur)
//
// La grammaire ne savait pas l'écrire. Un fragment porte son programme de bout
// en bout et les fragments ne se recombinent qu'au verdict ; il manquait un
// étage AMONT — une transformation locale dont le résultat est ensuite lu par
// tout le monde. C'est une RETOUCHE : elle prend une portée, lui applique un
// programme qui rend du TEXTE, et repose ce texte à sa place dans la saisie.
// Ce qui suit le `;` travaille sur la saisie ainsi réécrite.
//
// ★ **Pourquoi un signe NEUF, et pas la virgule que l'auteur avait écrite.**
// L'auteur proposait `2.1:fr13,tca+mtal+m14+mpf`, et a laissé la notation
// ouverte (« si le programme entre ## s'écrit différemment, ça me va du moment
// que ça produit l'effet que je décris »). La virgule ne pouvait pas : elle dit
// déjà « ces deux morceaux donnent chacun leur chiffre, et les chiffres
// s'assemblent ». Lui faire dire aussi « ce morceau nourrit le suivant »
// laisserait `a,b` indécidable — et surtout indécidable ICI : **ce module lit la
// grammaire sans catalogue** (les codes ne sont vérifiés que si l'appelant en
// fournit un, précisément pour que `src/recherche` reste testable sur un
// catalogue de fantaisie). Il ne peut donc PAS trancher en regardant si `fr13`
// rend du texte ou un chiffre. Le sens doit être écrit, pas déduit.
//
// ★ **Pourquoi `;`.** Trois raisons, dans cet ordre.
//   1. Il est légal tel quel dans un fragment d'URL (`sub-delims`, RFC 3986
//      §3.4) : aucune messagerie ne le transformera en `%3B`, contrairement à
//      `>` ou `|`, qui se lisaient pourtant mieux.
//   2. Il dit « puis » partout où on l'a déjà vu — shell, CSS, C. La grammaire
//      avait besoin d'un ET PUIS ; c'est son signe.
//   3. Il est à UN caractère de ce que l'auteur avait écrit : son lien se
//      transpose sans se relire.
//
// ★ **Une retouche rend du TEXTE, et c'est le moteur qui le vérifie** (§4.3,
// `index.js › rejouer`) : un programme qui finirait sur un nombre ne saurait pas
// se reposer dans la saisie, et le lien est refusé avec son bandeau plutôt que
// de jouer autre chose. La grammaire, elle, n'a pas à le savoir — voir plus
// haut, elle n'a pas le catalogue.
//
// ★ **Pas d'abréviation de résonance dans une retouche.** `×3:` nomme les trois
// occurrences d'un motif COMME TROIS PARTS qui s'assemblent ; une retouche ne
// s'assemble avec rien, elle réécrit une place. Trois places se réécrivent avec
// trois retouches, dont l'ordre est alors écrit noir sur blanc — ce qui vaut
// mieux qu'une abréviation qui tairait dans quel sens les offsets se décalent.
//
// ── LES PORTÉES GROUPÉES, `0.1+2.1+4.1:tca+m14` — un programme, plusieurs places
//
// « Pour hope-hope-hope.fr voici celui que je trouve le plus élégant :
// `#so!0.1:tca+m14,2.1:tca+m14,4.1:tca+m14,1.1:tca+mtc+cs,3.1:tca+mtc+cs,6.1:tca+mpy+mr9#…`
// Qui gagnerait à pouvoir s'écrire :
// `#so!0.1+2.1+4.1:tca+m14,1.1+3.1:tca+mtc+cs,6.1:tca+mpy+mr9#…` » (l'auteur)
//
// Le lien répétait `tca+m14` trois fois et `tca+mtc+cs` deux fois ; le groupe
// les écrit une fois. Sur son exemple, l'approche passe de 84 signes à 57 —
// un tiers de moins.
//
// ★ **C'EST UNE ABRÉVIATION, ET RIEN D'AUTRE.** `0.1+2.1:P` se DÉPLIE en
// `0.1:P,2.1:P` dans `lire()`, avant que quiconque en aval n'en voie la trace :
// les descripteurs rendus sont les mêmes objets, dans le même ordre, et le
// moteur ne sait pas — ne peut pas savoir — que le lien était groupé. C'est ce
// qui rend l'équivalence VÉRIFIABLE plutôt que promise : un test compare les
// deux lectures champ par champ, il ne compare pas deux exécutions.
//
// ★ **LE `+` NE DEVIENT PAS AMBIGU, ET CE N'EST PAS UN PARI.** Il sépare
// désormais deux choses — les portées avant le `:`, les codes après — mais
// jamais dans la même région, parce que c'est le `:` qui est cherché EN PREMIER
// (`lireFragments`) : il coupe le fragment en deux zones étanches avant qu'un
// seul `+` n'ait été lu. Et le premier `:` est toujours LE bon, puisqu'un
// programme ne peut pas en contenir (§4.1 : `[ftnmcpj][0-9a-z]+[A-Z]?`).
//
// La sûreté est même DOUBLE, et c'est ce qui compte ici : ce module lit la
// grammaire **sans catalogue** — c'est ce qui permet de tester `src/recherche`
// sur un catalogue de fantaisie —, il ne peut donc jamais se demander « est-ce
// que `2` est un code connu ». Il n'en a pas besoin : les deux alphabets sont
// disjoints par CONSTRUCTION. Une portée commence par un chiffre, un code par
// une lettre de famille ; même privé du `:`, `2.1` ne peut pas passer pour un
// code ni `tca` pour une portée. C'est toute la différence avec la virgule que
// l'auteur avait proposée pour la retouche, qui aurait exigé, elle, de savoir
// ce que `fr13` PRODUIT.
//
// ★ **ET `ecrire()` LA PRODUIT** — la forme groupée est la forme CANONIQUE, pas
// une tolérance de lecture de plus. Trois raisons, dans cet ordre.
//   1. Sans cela, la grammaire ferait le CONTRAIRE de ce qu'on lui demande :
//      `canoniser()` réécrit la barre d'adresse à chaque ouverture (§4.3), si
//      bien qu'un lien groupé se ferait déplier sous les yeux de celui qui
//      vient de l'écrire. Une abréviation qu'on ne peut pas garder n'est pas
//      une abréviation.
//   2. La forme canonique de cette grammaire est déjà, partout, la plus
//      courte : `sobre!` s'abrège en `so!`, `c666!` ne s'écrit pas, une portée
//      qui couvre tout ne s'écrit pas — et `×3:` abrège déjà, mot pour mot,
//      « le même programme sur trois places ». Le groupe est ce même geste sur
//      des places quelconques ; l'écrire autrement ferait deux règles là où il
//      n'y en a qu'une.
//   3. Le coût est MESURÉ, et il est nul là où il aurait fait mal : aucune des
//      URL figées de ce dépôt ne change — les deux puces d'accueil
//      (`i18n/fr.js`) alternent leurs programmes, `tca+m14` puis `tca+mtc+cs`,
//      si bien qu'aucune n'est contiguë à sa jumelle. Sur 133 voies produites
//      pour 14 saisies, 5 se groupent (3,8 %), pour 12 signes gagnés en moyenne.
//
// ★ **SEULES LES PORTÉES CONTIGUËS SE GROUPENT, ET C'EST UN INVARIANT, PAS UNE
// PARESSE.** L'ordre des fragments est ce qui ÉCRIT la cible, de gauche à droite
// (§4.2, « quelles positions ÉCRIVENT la cible ? ») : rapprocher les jumeaux
// de `0.1:P,1.1:Q,2.1:P` pour écrire `0.1+2.1:P,1.1:Q` rendrait les chiffres
// dans l'ordre P P Q au lieu de P Q P — donc `007` là où le lien disait `070`.
// Sur 666 la faute serait invisible, les trois chiffres y étant égaux ; c'est
// exactement pour cela qu'elle est écrite ici. L'auteur avait d'ailleurs déjà
// rangé son exemple dans cet ordre : ses fragments vont 0, 2, 4, 1, 3, 6 et non
// 0 à 6, précisément pour que ses jumeaux se touchent.
//
// ★ **PAS DE GROUPE DANS UNE RETOUCHE**, pour la raison qui y interdit déjà
// `×3:` : un groupe a l'air PARALLÈLE et serait SÉQUENTIEL. Les jetons sont
// recomptés à chaque étage (`index.js › rejouer`), donc le `2.1` de `0.1+2.1:`
// désignerait le deuxième jeton du texte que la PREMIÈRE réécriture a laissé,
// et non celui qu'on voit. Deux places se réécrivent avec deux retouches, dont
// l'ordre est alors écrit noir sur blanc.
//
// ★ **RIEN N'EST VALIDÉ DE PLUS, RIEN DE MOINS.** `0.1+0.1:P` est accepté parce
// que `0.1:P,0.1:P` l'était déjà, et une portée hors bornes est refusée au même
// endroit qu'avant — par le moteur, qui seul connaît la saisie. Le groupe est
// un raccourci d'écriture, pas un contrôle : lui faire refuser ce que la forme
// dépliée accepte ferait deux grammaires au lieu d'une.
//
// ── LA CIBLE, `c111!` — viser autre chose que 666 ──────────────────────────
//
// « Via la page de listing, pouvoir indiquer un autre objectif que 666, par
// exemple 111 ou 777 ou 13 ou 000 ou 007, et relancer la recherche mais pour
// produire ces résultats. » (l'auteur)
//
// Le marqueur suit le précédent du registre, point par point — même position
// (en tête de l'approche entière, jamais dans un fragment), même séparateur
// (`!`, qui n'apparaît nulle part ailleurs dans la grammaire), même brièveté :
// « l'URL reste essentiellement cryptique et ça participe à l'effet de
// surprise ». Une lettre, les chiffres visés, un point d'exclamation.
//
// ★ **Ce n'est pas un opérateur, et le registre §4.1 reste fermé.** Même
// argument que pour `so!` / `sce!` : un opérateur transforme l'état, il a un
// `from`, un `to`, un `apply()`. La cible ne transforme rien — elle dit ce
// qu'on CHERCHE, donc ce que le moteur retiendra. C'est une extension de la
// GRAMMAIRE, au même titre que `×3:` et que les portées `0.1:`.
//
// ★ **Aucune ambiguïté avec un code de combinateur.** Quand la cible a été
// écrite, `cs` était le code de la somme et `c111!` commençait par les mêmes
// signes ; c'est le `!` qui les séparait sans reste — il est interdit dans un
// programme, et le marqueur ne se lit qu'en TÊTE, avant le premier fragment.
// Depuis le passage aux codes parlants, la coïncidence n'existe même plus :
// aucun combinateur ne s'écrit avec un chiffre au deuxième signe (`cs`, `cst`,
// `cp`, `cal`, `cmm`, `cmo`, `cnv`, `ccat`, `cmx`, `cmn`, `cnj`, `cnjd`). Le
// `!` reste néanmoins la séparation qui fait foi, parce qu'un code neuf de la
// famille `c` pourrait un jour porter un chiffre. `#cs+mch#…` est donc un
// programme qui commence par la somme, et `#c111!cs+mch#…` la même somme visant
// 111.
//
// ★ **L'ABSENCE DE MARQUEUR VAUT 666, ET LE MARQUEUR N'EST PAS ÉCRIT QUAND IL
// VAUT 666.** C'est la seule différence avec le registre, et elle est
// délibérée. `ecrire()` pose TOUJOURS `sce!` ou `so!`, même au défaut, parce
// que ce défaut-là avait été tranché entre deux lectures également
// défendables : il fallait qu'un lien cesse d'en dépendre. Ici, il n'y a rien
// à trancher — 666 est la promesse du site, elle est écrite dans son titre, et
// aucun lien existant n'a jamais voulu dire autre chose. Écrire `c666!` sur
// chaque lien coûterait six signes à la totalité des URL pour lever une
// ambiguïté qui n'existe pas, et — surtout — CHANGERAIT la forme canonique de
// tous les liens déjà partagés, que `canoniser()` réécrit à chaque ouverture.
// Le marqueur ne paraît donc que là où il dit quelque chose.

// ── LES QUATRE CURSEURS, `p100.100.100.100!` — partager une liste PONDÉRÉE ──
//
// L'écran de liste offre quatre curseurs indépendants — simplicité,
// exhaustivité, quantité, cohérence — qui repondèrent le classement
// (`score.js › ponderer`). Une liste ainsi repondérée n'est PAS la liste du
// site : c'est une autre réponse à une autre question. Si le lien ne la porte
// pas, celui qui le reçoit voit autre chose que ce qu'on lui a montré, ce que
// §4.3 interdit exactement autant qu'un rang qui bouge en silence.
//
// ★ **Un seul marqueur pour les quatre, dans un ORDRE FIXE** — celui où
// l'auteur les a nommés : simplicité, exhaustivité, quantité, cohérence. Quatre
// marqueurs séparés auraient demandé quatre lettres, dont `c` (cohérence) qui
// est déjà la cible et `f` (…) qui est déjà la fouille. Un marqueur unique
// n'a besoin d'aucune lettre pour ses quatre champs : leur POSITION suffit, et
// c'est ce que le point sépare.
//
// ★ **Pourquoi le POINT.** Il est légal tel quel dans un fragment d'URL
// (`unreserved`, RFC 3986 §2.3) — aucune messagerie ne l'échappera — et il dit
// déjà « des champs dans un nombre » partout où on l'a vu. Il sert par ailleurs
// dans la grammaire (`0.1:` est une portée), mais jamais au même endroit : une
// portée vit DANS un fragment, un marqueur vit devant TOUS les fragments, et le
// `!` clôt le marqueur avant que le premier fragment ne commence.
//
// ★ **Décidable sans catalogue**, comme tout ce module. `p` est bien une lettre
// de famille d'opérateur (`prn`, `pr`…), mais un programme ne contient JAMAIS ni
// `!` ni `.` hors d'une portée qui le précède : `p` suivi de quatre nombres
// pointés et d'un `!`, en tête de l'approche, ne peut être qu'un marqueur. C'est
// mot pour mot l'argument déjà écrit pour `c111!`, et le `!` y reste la
// séparation qui fait foi.
//
// ★ **ÉCRIT SEULEMENT S'IL DIT QUELQUE CHOSE**, comme la cible. Quatre curseurs
// au cran 100 rendent exactement le barème du site : le marqueur ne paraît pas,
// et tous les liens déjà partagés gardent leur forme canonique au caractère
// près. Un cran hors de [0, 200] est BORNÉ plutôt que refusé — c'est une
// position de curseur, elle n'a pas de sens hors de sa glissière, et la borner
// rend exactement ce que la glissière aurait rendu. Ce qui est refusé, avec son
// bandeau, c'est un marqueur qui n'a pas ses quatre champs : là, on ne sait pas
// lequel manque, donc on ne sait pas ce qu'on rejoue.
//
// ── LA PUISSANCE DE FOUILLE, `f3!` — chercher 2^N fois plus loin ────────────
//
// La réglette de `config.js › reglagesDeBudget` multiplie tous les budgets de
// recherche par 2^N, N de 0 à 7. Elle voyage pour la même raison que les
// curseurs, et c'en est même le cas le plus net : une liste obtenue en
// fouillant cent vingt-huit fois plus contient des voies que la recherche
// ordinaire n'a jamais eu le temps d'atteindre. Un lien qui tairait le cran
// rendrait une liste PLUS COURTE que celle qu'on partage — l'échec le plus
// silencieux qui soit, puisque rien n'y paraîtrait cassé.
//
// ★ `f` pour fouille, un seul chiffre (0 à 7 tient dans un signe), le `!` qui
// clôt. Le cran 0 est le défaut et ne s'écrit pas ; un cran au-delà de 7 est
// borné à 7, pour la même raison qu'un curseur est borné à sa glissière.
//
// ★ **Les deux marqueurs valent la LISTE, pas la première voie.** `#p…!#texte`
// et `#f3!#texte` rendent la page de résultats, même écrits en clair — à la
// différence de `#c111!#texte`, qui joue la démonstration de tête. Ce n'est pas
// une exception de plus : la frontière est celle que l'en-tête pose déjà. La
// cible dit ce qu'on CHERCHE, et cela vaut aussi bien pour une animation ; les
// curseurs et la fouille disent comment on CLASSE et jusqu'où on FOUILLE, deux
// choses dont une démonstration unique n'a rien à faire. Un marqueur qui ne
// peut rien changer à ce qu'on montre ne peut pas décider qu'on le montre.
//
// ★ Ils sont néanmoins ÉCRITS sur les liens de voie, quand ils ne sont pas au
// défaut. Deux raisons : le score affiché sous une voie rejouée est celui de la
// liste dont elle vient, donc il dépend des curseurs ; et le visiteur qui
// remonte de la voie vers la liste retrouve ses réglages. La fouille, elle, ne
// change rien à un rejeu (il n'y a pas de recherche) — elle est écrite quand
// même, parce qu'une règle unique se relit et qu'une exception se discute.

// ── LE REGISTRE, et pourquoi ce n'est PAS un opérateur ──────────────────────
//
// Le registre de codes d'opérateurs est FERMÉ (CONTRACTS §4.1) : aucun code ne
// peut être alloué pour dire « sobre » ou « scénique ». Et ce serait de toute
// façon une faute de modélisation : un opérateur TRANSFORME l'état — il a un
// `from`, un `to`, un `apply()` —, alors que le registre ne touche à rien de ce
// qui est calculé. Deux liens qui ne diffèrent que par lui portent le MÊME
// programme, produisent le MÊME verdict et méritent le MÊME score : ils sont la
// même voie, montrée de deux manières. C'est donc une extension de la
// GRAMMAIRE (§4.2), au même titre que le préfixe de résonance `×3:` ou les
// portées `0.1:` — qui, eux non plus, ne sont pas des opérateurs.
//
// Il préfixe l'APPROCHE ENTIÈRE et non chaque fragment : montrer un fragment
// sobrement et le suivant en fanfare n'aurait aucun sens. Une seule mise en
// scène par démonstration, donc un seul marqueur, en tête.
//
// ── L'ABSENCE DE MARQUEUR VAUT « SOBRE ». Voici pourquoi ──────────────────
//
// ★ **C'est un renversement, et il est assumé.** Le défaut a valu « scénique »
// tant qu'on croyait devoir protéger des liens déjà partagés : sous cette
// contrainte, seule la lecture qui ne changeait pas le nombre d'étapes d'un
// vieux lien était tenable. L'auteur a confirmé qu'aucun lien n'a été diffusé
// hors des scénarios de test de ce dépôt. La contrainte tombe, et avec elle le
// seul argument qui tenait « scénique » debout.
//
// Ce qui reste est l'argument de fond, et il va dans l'autre sens : **la mise
// en scène s'OPTE**. Un lien nu doit rendre la version la plus crédible — celle
// qu'on peut montrer à quelqu'un sans qu'il voie d'abord des cornes de diable —
// et le spectacle doit être demandé. « Sobre » est ce qu'on obtient quand on
// n'a rien dit ; « scénique » est ce qu'on obtient quand on l'a écrit.
//
// ⚠️ Le registre de CODES D'OPÉRATEURS (§4.1) n'est pas concerné et reste
// clos : ce qui vient d'être levé porte sur les LIENS, pas sur la grammaire.
// Aucun code ne change de sens ici, aucun n'est réattribué.
//
// ── ET UN REGISTRE QU'ON NE SAIT PAS JOUER RETOMBE SUR « SOBRE » ──────────
//
// « Quand `bo!`, `ma!` ou `sce!` est utilisé dans un cas non supporté → repli
// en sobre. » (l'auteur)
//
// La mise en scène du verdict est aujourd'hui celle du 666 : les cornes de
// diable, et rien d'autre. Une cible qui n'a pas encore d'emblème — 111, 777,
// 13, 007, 000 — n'a donc pas de version scénique à jouer. Trois conduites
// étaient possibles, et deux sont mauvaises : ÉCHOUER (un lien mort pour une
// décoration manquante) ou JOUER AUTRE CHOSE (des cornes au-dessus d'un 111,
// c'est-à-dire un mensonge dessiné). La troisième est le repli sur le plus
// neutre — on montre la démonstration, sans la costumer.
//
// ★ Le repli est fait à la LECTURE **et** à l'ÉCRITURE, sans quoi l'aller-retour
// mentirait : `ecrire({registre:'scenique', cible:'111'})` rend `so!`, et
// relire `so!` rend « sobre ». Une forme canonique, une seule lecture.
// `lecture.registreDemande` conserve ce que le lien portait, pour qui voudrait
// le dire à l'écran — mais le site ne l'affiche pas : ce n'est pas une erreur
// du visiteur, c'est un décor que nous n'avons pas encore dessiné.
//
// Le principe de fond : **l'URL transporte le programme, pas un rang**. Un rang
// est le résultat d'un calcul ; le publier revient à publier un pointeur vers
// une structure mutable, et les liens cassent à la première évolution du
// catalogue. Ici un lien est rejouable sans recherche.

import { encoderTexte, decoderTexte, estBase58, LIMITE_SAISIE } from './base58.js';
import { normaliserCatalogue } from './bfs.js';
import { lireCible, normaliserCible, CIBLE_DEFAUT, MAX_CHIFFRES } from './cible.js';
import { CURSEURS, normaliserCurseurs, auDefaut } from './score.js';
import { CODE_DECOUPE_IMPLICITE } from '../config.js';
import { PUISSANCE_DE_FOUILLE_DEFAUT, normaliserPuissance } from '../config.js';

/**
 * La grammaire d'un code (CONTRACTS §4.1) : lettre de famille, corps parlant en
 * minuscules et chiffres, majuscule de variante facultative (`m14F`).
 *
 * ⚠ Recopiée depuis `moteur/transformations/commun.js`, et **pas importée** :
 * `src/recherche` ne connaît le catalogue que par injection, c'est ce qui lui
 * permet d'être testé sur un catalogue de fantaisie. Le prix de ce découpage
 * est cette copie ; il est payé par un test qui exige les trois écritures
 * identiques (`url.test.js`), plutôt que par une dépendance qui les
 * réconcilierait en cassant l'injection.
 */
export const RE_CODE = /^[ftnmcpj][0-9a-z]+[A-Z]?$/;

/**
 * ★ **LE PROGRAMME À TROUVER — une suite de `?`, et rien d'autre.**
 *
 * > « Une voie indiquée comme ça pourrait déclencher une recherche spécifique
 * >   pour remplacer les fragments dont le programme est `????` par exactement
 * >   autant de 6 (ou de caractères dans le motif recherché) qu'il y a de "?".
 * >   Ça permettrait de construire des voies sur mesure. » (l'auteur)
 *
 * `0.1+9.1:????` ne DÉCRIT pas une méthode, il en COMMANDE une : « trouve, pour
 * ces portées, un programme qui rende exactement quatre 6 ». C'est la seule
 * construction de cette grammaire qui demande au lieu de dire, et c'est assumé :
 * un lien reste la description exacte d'une démonstration, mais on peut
 * désormais en écrire une à trous et laisser le moteur les remplir.
 *
 * ★ **UN `?` VAUT UN CARACTÈRE DE LA CIBLE, pas un 6.** L'auteur l'écrit
 *   lui-même — « autant de 6 (ou de caractères dans le motif recherché) » : sur
 *   une cible `111`, quatre `?` demandent quatre 1. Le compte est celui des
 *   valeurs qui SERVENT, quelle que soit la cible visée.
 *
 * ★ Il ne se mélange pas : `??+tca` n'a aucun sens et est refusé. Une commande
 *   est une commande, un programme est un programme.
 */
export const RE_A_TROUVER = /^\?+$/;

/**
 * ★ **`tca` EST IMPLICITE — le découpage par défaut ne s'écrit plus.**
 *
 * > « Si `tca` devient implicite, et qu'on saute `mpf`, ça donne `#mt9#` comme
 * >   programme : là, la concision est vraiment exemplaire ! » (l'auteur)
 *
 * `t.caracteres` — « un caractère, un jeton » — ouvre la quasi-totalité des
 * voies du site : c'est le passage obligé entre le TEXTE et les JETONS, et le
 * plus neutre des quatre. L'écrire à chaque fois revenait à faire dire à chaque
 * lien la même chose que tous les autres.
 *
 * ★ **IL EST LE DÉFAUT, PAS LE SEUL.** Trois autres opérateurs font ce même
 *   passage — `tm` (par mots), `tsp` (par séparateurs), `tsy` (par syllabes) —
 *   et ceux-là s'écrivent, parce qu'ils DISENT quelque chose : découper « hope »
 *   en syllabes n'est pas le découper en lettres. Seul le découpage qui ne
 *   choisit rien se tait.
 *
 * ★ **L'ALLER-RETOUR RESTE EXACT, et ce n'est pas une chance.** `tca` transforme
 *   `STR` en `TOKENS` : il ne peut donc PARAÎTRE qu'à l'endroit exact où la
 *   règle de réinsertion le remettrait — après les filtres qui travaillent le
 *   texte, avant le premier opérateur qui réclame des jetons. Il n'existe aucune
 *   place où il serait facultatif, donc aucune où l'omettre perdrait une
 *   information. C'est ce qui autorise à le taire plutôt qu'à l'abréger.
 *
 * ⚠️ Un programme RÉDUIT à `tca` garde son code : le taire laisserait un
 *   fragment vide, c'est-à-dire une grammaire cassée pour gagner trois signes.
 */
export { CODE_DECOUPE_IMPLICITE };

/** Les codes tels qu'on les ÉCRIT : sans le découpage implicite. */
export function codesEcrits(codes) {
  const liste = [...codes];
  if (liste.length < 2) return liste;
  const sortie = liste.filter((c) => c !== CODE_DECOUPE_IMPLICITE);
  return sortie.length ? sortie : liste;
}
const RE_PORTEE = /^(\d+)\.(\d+)$/;
const RE_RESONANCE = /^[×xX*](\d+)$/;
const RE_RANGS = /^\d+(\+\d+)*$/;

/**
 * Les deux registres de mise en scène, et le mot qui les écrit dans l'URL.
 *
 * ★ **`so!` et `sce!`, abrégés.** Le premier jet écrivait « sobre » et
 * « scenique » en toutes lettres, au nom de la lisibilité. L'auteur a tranché
 * dans l'autre sens, et son argument est meilleur que le mien : « l'URL reste
 * essentiellement cryptique et ça participe à l'effet de surprise ». Le reste
 * de la grammaire est déjà illisible — `0.1:fatb+tca+m14` —, et un seul mot clair
 * au milieu ne rendait pas le lien compréhensible : il annonçait juste, à qui
 * reçoit le lien, qu'il y a quelque chose à voir. Trois lettres suffisent à
 * distinguer les deux registres sans rien divulguer.
 *
 * Sans accent, comme tout le reste de la grammaire : une URL accentuée
 * s'échappe en `%C3%A9` dès qu'une messagerie la touche.
 *
 * ★ Les identifiants INTERNES (`'sobre'`, `'scenique'`) ne changent pas : c'est
 * du code, il se lit. Seul le mot écrit dans l'URL est abrégé.
 */
export const REGISTRES = Object.freeze(['sobre', 'scenique']);

/** Le mot de chaque registre dans l'URL. */
const MOT_URL = Object.freeze({ sobre: 'so', scenique: 'sce' });

/**
 * Le registre appliqué à un lien qui n'en porte pas — voir l'en-tête.
 * ★ **`sobre`**, depuis que la mise en scène s'opte au lieu de se subir.
 */
export const REGISTRE_DEFAUT = 'sobre';

/**
 * ★ QUELLES CIBLES ONT UNE MISE EN SCÈNE — une seule, aujourd'hui.
 *
 * Le décor du verdict est celui du 666 : les cornes de diable, dérivées de la
 * police et calées au flanc du 6 (`visuel/primitives/horns.js`), émises par
 * l'opérateur `m36`. L'auteur a décrit un emblème par cible — une auréole pour
 * 111, un jackpot pour 777, un fer à cheval ou une bouse pour 13, une référence
 * à James Bond pour 007, un trou noir, une faux ou deux dés pour 000 — et a
 * demandé de les REMETTRE À PLUS TARD (`.planning/A-VENIR-cibles.md`).
 *
 * Tant qu'ils ne sont pas dessinés, les autres cibles n'ont rien à mettre en
 * scène, et le dire ici est ce qui permet au repli d'être une règle et non une
 * suite de cas particuliers : le jour où l'auréole existe, une ligne change.
 */
export const miseEnSceneDisponible = (cible) => normaliserCible(cible).defaut;

/**
 * Le registre RÉELLEMENT joué pour une cible — le demandé, ou « sobre » quand
 * ce qu'on demande n'existe pas encore pour cette cible.
 */
export function registreEffectif(registre, cible) {
  const r = REGISTRES.includes(registre) ? registre : REGISTRE_DEFAUT;
  if (r === 'sobre') return 'sobre';
  return miseEnSceneDisponible(cible) ? r : 'sobre';
}

/** Les registres qu'une cible sait offrir — un seul bouton quand elle n'en a qu'un. */
export const registresDisponibles = (cible) =>
  (miseEnSceneDisponible(cible) ? REGISTRES : ['sobre']);

/**
 * ★ La forme longue est encore LUE, jamais écrite.
 *
 * Elle n'aura vécu qu'une version — la 1.2.0, publiée quelques heures —, mais
 * les liens de cette fenêtre-là existent. Les relire coûte deux alternatives
 * dans une expression rationnelle ; les casser coûterait un lien mort à qui
 * s'en est servi. `ecrire()` ne produit plus que la forme brève, et
 * `canoniser()` réécrit la barre d'adresse : un vieux lien se corrige tout seul
 * dès qu'on l'ouvre.
 */
const RE_REGISTRE = /^(so|sce|sobre|scenique)!/;

/**
 * Le marqueur de CIBLE — `c111!`, `c007!`, `c13!`.
 *
 * Il n'est pas borné à `MAX_CHIFFRES` ici : une suite de dix chiffres est
 * bien un marqueur de cible, simplement une cible ILLISIBLE, et il vaut mieux
 * le dire (bandeau + repli sur la page de résultats, §4.3) que la laisser
 * passer pour un fragment et échouer plus loin sur « code inconnu ».
 */
const RE_CIBLE = /^c([0-9]+)!/;

/**
 * Le marqueur des QUATRE CURSEURS — `p100.100.100.100!`.
 *
 * Les quatre champs sont EXIGÉS : un marqueur amputé ne dit pas lequel de ses
 * curseurs manque, donc ne dit pas ce qu'on rejoue, et il est refusé avec son
 * bandeau plutôt que complété au hasard. Les valeurs, elles, ne sont pas bornées
 * ici — c'est `normaliserCurseurs` qui les ramène dans la glissière, et une
 * position hors glissière n'est pas une erreur de lien : c'est une position que
 * la glissière aurait butée de la même façon.
 */
const RE_CURSEURS = /^p([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)!/;

/**
 * Le marqueur de PUISSANCE DE FOUILLE — `f3!`.
 *
 * UN SEUL CHIFFRE : la réglette va de 0 à 7 (`config.js ›
 * PUISSANCE_DE_FOUILLE_MAX`). `f8!` et `f9!` sont bornés à 7, comme un curseur
 * poussé au-delà de sa butée ; `f12!` n'est pas un cran mais une faute de
 * frappe, et il échoue bruyamment plus loin (« fragment illisible ») plutôt que
 * de se faire deviner. Un chiffre de plus ne serait pas une tolérance, ce serait
 * une invention.
 */
const RE_FOUILLE = /^f([0-9])!/;

/**
 * Les quatre curseurs au cran par défaut, figés une fois.
 * `normaliserCurseurs({})` les recalcule à l'identique ; les figer ici évite
 * qu'un appelant ne modifie l'objet que TOUTES les lectures partagent.
 */
const CURSEURS_DEFAUT_URL = Object.freeze(normaliserCurseurs({}));

/** Le mot lu dans l'URL → l'identifiant interne. */
const REGISTRE_DU_MOT = Object.freeze({
  so: 'sobre', sce: 'scenique', sobre: 'sobre', scenique: 'scenique',
});

/**
 * @typedef {Object} FragmentUrl
 * @property {{offset:number,longueur:number}|null} portee
 * @property {number|null} resonance   nombre d'occurrences si abrégé `×3:`
 * @property {string[]} codes
 *
 * @typedef {Object} LectureUrl
 * @property {'canonique'|'premiere'|'heritee'|'resultats'|'invalide'} forme
 * @property {string|null} saisie
 * @property {boolean} saisieBrute  lue en clair faute de base58 valide ?
 * @property {FragmentUrl[]} retouches  les étages qui RÉÉCRIVENT la saisie, dans l'ordre
 * @property {FragmentUrl[]|null} fragments
 * @property {'sobre'|'scenique'|null} registre  résolu ; `null` hors forme canonique
 * @property {boolean} registreEcrit  le lien le portait-il en toutes lettres ?
 * @property {import('./cible.js').Cible} cible  la suite visée ; `666` par défaut
 * @property {boolean} cibleEcrite  le lien portait-il un marqueur `c…!` ?
 * @property {Object} curseurs      les quatre positions, résolues et bornées
 * @property {boolean} curseursEcrits  le lien portait-il un marqueur `p…!` ?
 * @property {number} fouille       le cran de puissance de fouille, 0 par défaut
 * @property {boolean} fouilleEcrite  le lien portait-il un marqueur `f…!` ?
 * @property {number[]|null} rangs
 * @property {string|null} bandeau     message à afficher (jamais silencieux)
 * @property {string|null} raison
 */

/**
 * Lecture tolérante du fragment d'URL.
 * Un lien ne renvoie JAMAIS silencieusement vers une autre démonstration :
 * soit il rejoue exactement, soit il l'annonce.
 *
 * @param {string} hash          `location.hash` (avec ou sans `#` initial)
 * @param {{catalogue?:Object}} [options]
 * @returns {LectureUrl}
 */
export function lire(hash, options = {}) {
  const vide = {
    forme: 'invalide', saisie: null, saisieBrute: false, fragments: null, retouches: [],
    registre: null, registreEcrit: false,
    cible: CIBLE_DEFAUT, cibleEcrite: false, registreDemande: null,
    // ★ Les deux réglages de recherche sont TOUJOURS rendus, résolus, sur toutes
    //   les formes — y compris invalides. L'appelant n'a jamais à savoir si le
    //   lien les portait pour savoir avec quoi chercher ; `curseursEcrits` et
    //   `fouilleEcrite` sont là pour qui veut le dire à l'écran.
    curseurs: CURSEURS_DEFAUT_URL, curseursEcrits: false,
    fouille: PUISSANCE_DE_FOUILLE_DEFAUT, fouilleEcrite: false,
    rangs: null, bandeau: null, raison: null,
  };
  if (typeof hash !== 'string') return { ...vide, raison: 'hash absent' };

  let brut = hash;
  if (brut.startsWith('#')) brut = brut.slice(1);
  if (brut === '') return { ...vide, forme: 'resultats', saisie: null };

  // ★ Le pourcentage se décode PAR SEGMENT, et non sur le fragment entier.
  //   Tant que la saisie était du base58 la distinction ne se voyait pas —
  //   aucun des 58 signes ne s'échappe. Elle se voit dès que la saisie est du
  //   texte : `##%23JeSuis666` porte un `#` DANS la saisie, et décoder avant de
  //   découper en ferait un troisième segment, donc un lien mort. Découper
  //   d'abord, décoder ensuite, c'est l'ordre que le navigateur lui-même
  //   applique — le fragment commence au premier `#` NON échappé.
  const parts = brut.split('#').map(depourcenter);
  if (parts.length > 2) {
    return { ...vide, raison: 'format inconnu', bandeau: BANDEAUX.formatInconnu };
  }
  // ★ UN SEUL `#` : il n'y a pas d'approche, tout est saisie. C'est la forme
  //   qu'on écrit de mémoire — `#Donald Trump` —, et elle vaut « cherche, puis
  //   montre ». Elle ne peut porter aucun marqueur : `#so!Machin` est une
  //   saisie qui commence par « so! », pas un registre sans saisie.
  let approche = parts.length === 2 ? parts[0] : '';
  const texteSaisie = parts[parts.length - 1];

  // ★ Les MARQUEURS se détachent AVANT tout le reste : ils préfixent l'approche
  //   entière, ils n'appartiennent à aucun fragment. Deux existent — le
  //   registre de mise en scène et la cible —, et la boucle les accepte dans
  //   L'UN OU L'AUTRE ORDRE.
  //
  //   ★ Pourquoi tolérer les deux ordres alors qu'on n'en écrit qu'un. Ce sont
  //   deux marqueurs indépendants, portant sur deux choses sans rapport (ce
  //   qu'on démontre, comment on le montre) : rien dans la grammaire ne fonde
  //   une préséance, et un lien recopié à la main dans le mauvais ordre serait
  //   refusé pour une raison que personne ne pourrait deviner. `ecrire()` en
  //   fixe UN — registre puis cible —, et `canoniser()` réécrit la barre
  //   d'adresse : la forme canonique reste unique, la lecture reste indulgente.
  //   C'est exactement la doctrine de §4.3.
  //
  //   Le registre absent vaut « scénique » (règle de lecture héritée, voir
  //   l'en-tête) ; la cible absente vaut 666 (la promesse du site).
  let registre = REGISTRE_DEFAUT;
  let registreEcrit = false;
  let cible = CIBLE_DEFAUT;
  let cibleEcrite = false;
  let curseurs = CURSEURS_DEFAUT_URL;
  let curseursEcrits = false;
  let fouille = PUISSANCE_DE_FOUILLE_DEFAUT;
  let fouilleEcrite = false;
  for (;;) {
    const mReg = registreEcrit ? null : RE_REGISTRE.exec(approche);
    if (mReg) {
      registre = REGISTRE_DU_MOT[mReg[1]];
      registreEcrit = true;
      approche = approche.slice(mReg[0].length);
      continue;
    }
    const mCib = cibleEcrite ? null : RE_CIBLE.exec(approche);
    if (mCib) {
      const lue = lireCible(mCib[1]);
      // Une cible illisible — plus de `MAX_CHIFFRES` signes — n'est pas repliée
      // en silence sur 666 : le lien promettait autre chose, et §4.3 interdit
      // de renvoyer sans le dire vers une autre démonstration.
      if (!lue) {
        return { ...vide, raison: `cible illisible : ${mCib[1]}`, bandeau: BANDEAUX.cibleIllisible };
      }
      cible = lue;
      cibleEcrite = true;
      approche = approche.slice(mCib[0].length);
      continue;
    }
    // ★ LES QUATRE CURSEURS. Les crans sont BORNÉS, pas refusés : une position
    //   hors glissière est ce que la glissière aurait rendu. Ce qui est refusé,
    //   c'est un marqueur amputé — mais la grammaire l'attrape déjà, faute de
    //   ses quatre champs il ne ressemble plus à un marqueur et il finira en
    //   « fragment illisible », avec son bandeau.
    const mCur = curseursEcrits ? null : RE_CURSEURS.exec(approche);
    if (mCur) {
      const crans = {};
      CURSEURS.forEach((c, i) => { crans[c] = Number(mCur[i + 1]); });
      curseurs = normaliserCurseurs(crans);
      curseursEcrits = true;
      approche = approche.slice(mCur[0].length);
      continue;
    }
    // ★ LA PUISSANCE DE FOUILLE, bornée de la même façon.
    const mFou = fouilleEcrite ? null : RE_FOUILLE.exec(approche);
    if (mFou) {
      fouille = normaliserPuissance(mFou[1]);
      fouilleEcrite = true;
      approche = approche.slice(mFou[0].length);
      continue;
    }
    break;
  }

  // Le base58 d'abord, le texte en clair à défaut (voir l'en-tête).
  const lueSaisie = lireSaisie(texteSaisie);
  if (!lueSaisie) {
    // Ne subsiste ici qu'une saisie VIDE, ou faite de blancs : elle ne désigne
    // aucune démonstration et n'est pas un texte à chercher.
    return { ...vide, raison: 'saisie absente', bandeau: BANDEAUX.lienIllisible };
  }
  const { saisie, brute: saisieBrute } = lueSaisie;
  // Le plafond vaut pour les deux lectures : une saisie en clair n'a aucune
  // raison d'échapper à la borne qui protège l'encodage (`base58.js`, O(n²)).
  if (saisie.length > LIMITE_SAISIE) {
    return {
      ...vide, saisie, saisieBrute,
      raison: 'saisie trop longue', bandeau: BANDEAUX.saisieTropLongue,
    };
  }

  if (approche === '') {
    // ★ RIEN À GAUCHE : on CHERCHE. Reste à savoir ce qu'on montre ensuite —
    //   la première voie, ou la liste.
    //
    //   `#texte` (un seul `#`) et `#so!#texte` (un registre, pas de programme)
    //   valent la PREMIÈRE VOIE, animée : c'est le geste de « Révéler ».
    //   Le second cas était jusqu'ici refusé — « un marqueur de mise en scène
    //   sans programme à mettre en scène est un lien tronqué ». Il ne l'est
    //   plus, et c'est le même argument qui a changé de conclusion : demander
    //   une mise en scène, c'est demander une DÉMONSTRATION ; nous savons
    //   maintenant laquelle montrer quand le lien ne la nomme pas — celle que
    //   le classement met en tête, exactement comme le bouton de l'accueil.
    //
    //   ★ **ET LA CIBLE SEULE VAUT AUSSI LA PREMIÈRE VOIE — QUAND LA SAISIE EST
    //   ÉCRITE EN CLAIR.** « Je veux l'inverse » (l'auteur), sur l'exception qui
    //   avait d'abord été faite à `#c111!#…`. Donc `#c111!#Donald Trump` cherche
    //   111 et JOUE la démonstration de tête, comme `#Donald Trump` le fait
    //   pour 666.
    //
    //   ⚠️ **Mais `#c111!#<b58>` reste la liste, et ce n'est pas un
    //   contournement de sa consigne — c'est la frontière qu'il a lui-même
    //   posée** : « la version b58 est bien sûr toujours supportée et à
    //   conserver par défaut quand on passe par l'interface du site ». Cette
    //   forme-là, le site l'ÉCRIT : c'est le sélecteur de cible de la page de
    //   listing (`pages/resultat.js`, « changer de cible, c'est changer
    //   d'URL »). La lire comme une animation ferait sauter dans une
    //   démonstration au moment où l'on clique sur `[111]` pour voir la LISTE
    //   des voies menant à 111.
    //
    //   La règle se lit donc en une phrase : **ce que le site écrit garde son
    //   sens, ce qu'un humain tape suit la règle simple de l'auteur.** Le
    //   base58 est la signature de la machine, le texte en clair celle de la
    //   main ; les quatre exemples de l'auteur sont tous en clair.
    //
    //   ⚠️ C'est un choix que l'auteur n'a pas tranché explicitement — il a dit
    //   « je veux l'inverse » sans mentionner le sélecteur de cible, qu'il ne
    //   pouvait pas avoir en tête. À défaire en une ligne s'il préfère que la
    //   bascule vaille aussi pour les liens du site : il faudra alors donner au
    //   listing une autre façon d'écrire « la liste, pour cette cible-là ».
    //
    //   ⚠️ **LES CURSEURS ET LA FOUILLE N'ENTRENT PAS DANS CETTE CONDITION**, et
    //   c'est raisonné en tête de fichier : ils disent comment on CLASSE et
    //   jusqu'où on FOUILLE, deux questions dont une démonstration unique n'a
    //   rien à faire. `#p…!#texte` et `#f3!#texte` rendent donc la LISTE, que la
    //   saisie soit en base58 ou en clair. Ils s'ajoutent en revanche sans rien
    //   changer quand un AUTRE marqueur a déjà fait pencher vers la première
    //   voie : `#sce!p0.200.100.100!#texte` anime bien la voie de tête — celle
    //   que le classement repondéré met en tête.
    if (parts.length === 1 || registreEcrit || (cibleEcrite && saisieBrute)) {
      return {
        forme: 'premiere', saisie, saisieBrute, fragments: null, retouches: [],
        // Même résolution que la forme canonique : le registre rendu est celui
        // qu'on saura JOUER sur cette cible, pas celui qui était écrit.
        registre: registreEffectif(registre, cible),
        registreDemande: registre,
        registreEcrit, cible, cibleEcrite,
        curseurs, curseursEcrits, fouille, fouilleEcrite,
        rangs: null, bandeau: null, raison: null,
      };
    }
    // ★ La CIBLE, elle, a parfaitement sa place sur une page de résultats — et
    //   c'est même le lien que la page de listing doit savoir écrire quand on
    //   lui demande de viser autre chose. `#c111!#…` est la liste des voies
    //   menant à 111, exactement comme `##…` est celle des voies menant à 666.
    //   La différence avec le registre n'est pas un caprice : le registre dit
    //   comment MONTRER une démonstration, et une liste n'en montre aucune ;
    //   la cible dit ce qu'on CHERCHE, et une liste est le résultat d'une
    //   recherche.
    //
    //   ⚠️ C'est aussi ce qui fait de `#c111!#…` l'EXCEPTION à la règle « des
    //   marqueurs seuls ⇒ la première voie » : voir l'en-tête, et le fait que
    //   `ecrire()` produit exactement cette forme.
    return {
      forme: 'resultats', saisie, saisieBrute, fragments: null, retouches: [],
      registre: null, registreEcrit: false,
      cible, cibleEcrite,
      curseurs, curseursEcrits, fouille, fouilleEcrite,
      rangs: null, bandeau: null, raison: null,
    };
  }

  // Forme héritée du README : des rangs, pas un programme.
  if (RE_RANGS.test(approche)) {
    return {
      forme: 'heritee',
      saisie,
      saisieBrute,
      fragments: null,
      retouches: [],
      // Une forme héritée relance la recherche : elle n'aboutit pas à une
      // démonstration mais à un rang du classement courant, et c'est ce rang
      // qui apportera son propre lien canonique — registre compris.
      registre: null,
      registreEcrit: false,
      // La cible, elle, SURVIT au recalcul : elle dit ce qu'on cherche, pas
      // quelle ligne du classement on voulait. `#c111!3#…` relance donc bien
      // la recherche de 111 et va au troisième rang de CETTE liste.
      cible,
      cibleEcrite,
      // Les curseurs et la fouille survivent au recalcul pour la même raison que
      // la cible : ils décrivent la RECHERCHE qu'on relance, pas la ligne qu'on
      // voulait. `#p0.200.100.100!3#…` refait bien la liste repondérée, puis va
      // à son troisième rang.
      curseurs, curseursEcrits, fouille, fouilleEcrite,
      rangs: approche.split('+').map(Number),
      bandeau: BANDEAUX.recalculee,
      raison: null,
    };
  }

  // ★ LES ÉTAGES, séparés par `;`. Le DERNIER est l'approche proprement dite —
  //   les fragments dont les chiffres s'assemblent. Tous ceux d'avant sont des
  //   RETOUCHES : elles réécrivent la saisie que le suivant lira (voir
  //   l'en-tête). Découper par la droite plutôt que par la gauche n'est pas un
  //   détail de style : ça fait de « aucun `;` » exactement l'ancienne
  //   grammaire, un étage unique et aucune retouche, sans qu'aucun cas
  //   particulier n'ait à le dire.
  const etages = approche.split(';');
  const brutFragments = etages.pop();
  const retouches = [];
  for (const brutRet of etages) {
    const r = lireFragments(brutRet);
    if (!r) return { ...vide, saisie, saisieBrute, raison: `retouche illisible : ${brutRet}`, bandeau: BANDEAUX.formatInconnu };
    // ★ Ni résonance ni portées groupées dans une retouche, et c'est le MÊME
    //   argument (voir l'en-tête) : les deux abrègent « plusieurs places à la
    //   fois », alors qu'une retouche réécrit une place et décale ce qui suit.
    //   L'abréviation aurait l'air parallèle et serait séquentielle ; on la
    //   refuse plutôt que de lui inventer un sens que personne ne devinerait.
    if (r.length > 1) {
      return {
        ...vide, saisie, saisieBrute,
        raison: `portées groupées dans une retouche : ${brutRet}`, bandeau: BANDEAUX.formatInconnu,
      };
    }
    if (r[0].resonance) {
      return {
        ...vide, saisie, saisieBrute,
        raison: `résonance dans une retouche : ${brutRet}`, bandeau: BANDEAUX.formatInconnu,
      };
    }
    retouches.push(r[0]);
  }

  const fragments = [];
  let groupee = false;
  for (const brutFrag of brutFragments.split(',')) {
    const f = lireFragments(brutFrag);
    if (!f) return { ...vide, saisie, saisieBrute, raison: `fragment illisible : ${brutFrag}`, bandeau: BANDEAUX.formatInconnu };
    // ★ Le DÉPLIAGE est ici, et il est total : à partir de cette ligne, plus
    //   rien dans le site ne sait qu'un lien était groupé. `0.1+2.1:P` a rendu
    //   deux descripteurs, exactement ceux de `0.1:P,2.1:P`.
    if (f.length > 1 && !f[0].resonance) groupee = true;
    fragments.push(...f);
  }
  // ★ UNE LIGNE GROUPÉE SE LIT DANS L'ORDRE DU TEXTE.
  //
  //   L'ordre des fragments est ce qui écrit la cible de gauche à droite. Tant
  //   qu'on ne groupait que des portées VOISINES, l'ordre écrit et l'ordre du
  //   texte coïncidaient et la question ne se posait pas. Grouper des portées
  //   éloignées les sépare : `0.1+2.1:A,1.1+3.1:B` se déplierait en 0, 2, 1, 3
  //   — et sur une cible dont les places ne rendent pas toutes le même chiffre,
  //   `070` deviendrait `007`.
  //
  //   Une ligne qui factorise déclare donc lire dans l'ordre du texte, et le
  //   dépliage l'y remet. C'est la contrepartie exacte de `factorisable()`, qui
  //   ne factorise QUE des lignes déjà rangées ainsi : les deux formes dénotent
  //   la même démonstration, dans le même ordre, et l'aller-retour est neutre.
  //
  //   ⚠️ Tri par insertion sur les offsets — pas de comparateur de tri fourni
  //   par la plateforme, pas de `localeCompare` : le déterminisme du moteur ne
  //   se délègue pas (§4.4).
  if (groupee && fragments.every((f) => f.portee)) {
    for (let i = 1; i < fragments.length; i++) {
      const courant = fragments[i];
      let j = i - 1;
      while (j >= 0 && fragments[j].portee.offset > courant.portee.offset) {
        fragments[j + 1] = fragments[j];
        j--;
      }
      fragments[j + 1] = courant;
    }
  }

  if (options.catalogue) {
    const connus = new Set(normaliserCatalogue(options.catalogue).map((o) => o.code));
    for (const f of [...retouches, ...fragments]) {
      for (const c of f.codes) {
        if (!connus.has(c)) {
          return { ...vide, saisie, saisieBrute, raison: `code inconnu : ${c}`, bandeau: BANDEAUX.codeInconnu };
        }
      }
    }
  }

  return {
    forme: 'canonique', saisie, saisieBrute, fragments, retouches,
    // ★ Le registre rendu est celui qu'on JOUERA, pas celui qu'on a lu : un
    //   `sce!` sur une cible sans emblème retombe sur « sobre » (voir
    //   l'en-tête). Ce qui était écrit reste lisible dans `registreDemande`.
    registre: registreEffectif(registre, cible),
    registreDemande: registre,
    registreEcrit, cible, cibleEcrite,
    // ★ Une voie rejouée porte les curseurs de la liste dont elle vient : le
    //   score affiché sous elle est celui de cette liste-là (`index.js ›
    //   rejouer`). La fouille, elle, ne change rien à un rejeu — il n'y a pas de
    //   recherche —, mais elle est relue pour que le retour à la liste retrouve
    //   le cran demandé.
    curseurs, curseursEcrits, fouille, fouilleEcrite,
    rangs: null, bandeau: null, raison: null,
  };
}

/**
 * Un segment d'URL, dépourcenté — et rendu tel quel si le pourcentage ment.
 *
 * `decodeURIComponent` jette sur un `%` isolé ou sur une paire d'octets qui ne
 * fait pas de l'UTF-8. Une saisie tapée à la main en contient facilement un
 * (« 100% vrai ») : la refuser reviendrait à faire échouer le lien pour la
 * seule ponctuation que le visiteur n'a pas songé à échapper.
 */
function depourcenter(segment) {
  try { return decodeURIComponent(segment); } catch { return segment; }
}

/**
 * Les caractères de COMMANDE, C0 et C1 — ce qu'une saisie ne contient jamais.
 * C'est le crible qui sépare le base58 du texte en clair (voir l'en-tête) :
 * décoder « amour » rend U+0016, décoder « cat » rend U+0001. Un texte tapé
 * dans un `<input type=text>`, jamais.
 */
const RE_COMMANDE = /[\u0000-\u001F\u007F-\u009F]/;

/**
 * La saisie d'un lien : du base58 si c'en est, le texte lui-même sinon.
 *
 * L'ordre n'est pas négociable — le base58 est ce que le site ÉCRIT, il doit
 * donc être ce qu'il relit en premier. La règle exacte, ses trois conditions et
 * son unique angle mort mesuré sont en tête de fichier.
 *
 * @param {string} segment
 * @returns {{saisie:string, brute:boolean}|null}  `null` si rien à chercher.
 */
function lireSaisie(segment) {
  const decode = texteBase58(segment);
  if (decode !== null) return { saisie: decode, brute: false };
  // ★ On COUPE les blancs de bord, comme le fait le champ d'accueil avant de
  //   chercher (`pages/accueil.js › aller`). Sans cela, `#Macron ` et `#Macron`
  //   seraient deux saisies différentes pour un œil qui ne voit pas l'espace,
  //   donc deux classements et deux liens canoniques. La normalisation NFC est
  //   celle de §4.4 règle 5, la même que `encoderTexte` applique — faute de
  //   quoi un « é » recopié depuis un traitement de texte ne donnerait pas le
  //   même résultat qu'un « é » tapé au clavier.
  const brute = segment.trim().normalize('NFC');
  return brute ? { saisie: brute, brute: true } : null;
}

/** Le texte porté par un segment base58, ou `null` si ce n'en est pas un. */
function texteBase58(segment) {
  if (!estBase58(segment)) return null;
  const texte = decoderTexte(segment);
  if (texte === null) return null;
  if (RE_COMMANDE.test(texte)) return null;
  if (!texte.trim()) return null;
  return texte;
}

/**
 * Un fragment écrit → les descripteurs qu'il DÉNOTE, dépliés.
 *
 * Rend une LISTE et non un objet, parce qu'une tête peut porter plusieurs
 * portées : `0.1+2.1:P` dénote exactement les deux fragments de `0.1:P,2.1:P`,
 * et le dépliage se fait ici pour que personne en aval n'ait à connaître le
 * groupe (voir l'en-tête, « les portées groupées »).
 *
 * ★ **L'ORDRE DE LECTURE EST CE QUI LÈVE L'AMBIGUÏTÉ DU `+`.** Le `:` est
 * cherché d'abord, et il partage le fragment en deux zones étanches : à gauche
 * des portées, à droite des codes. Aucun `+` n'est lu avant ce partage, et un
 * programme ne peut pas contenir de `:` (§4.1) — le premier est donc toujours
 * le bon. Les deux alphabets sont de surcroît disjoints (un chiffre ouvre une
 * portée, une lettre de famille ouvre un code), ce qui vaut filet : la lecture
 * reste décidable sans catalogue, comme tout ce module.
 *
 * @param {string} brut
 * @returns {FragmentUrl[]|null}
 */
function lireFragments(brut) {
  if (!brut) return null;
  let tetes = null;
  let programme = brut;
  const i = brut.indexOf(':');
  if (i >= 0) {
    tetes = brut.slice(0, i).split('+');
    programme = brut.slice(i + 1);
  }
  if (!programme) return null;
  // ★ La COMMANDE se reconnaît avant tout découpage : elle ne se compose pas.
  const codes = RE_A_TROUVER.test(programme)
    ? [programme]
    : programme.split('+');
  if (!RE_A_TROUVER.test(programme) && !codes.every((c) => RE_CODE.test(c))) return null;
  // Pas de tête : le fragment porte sur la saisie entière, comme toujours.
  if (!tetes) return [{ portee: null, resonance: null, codes }];
  // La résonance ne se groupe pas — elle nomme DÉJÀ plusieurs places, et les
  // mêler à des portées écrites demanderait d'inventer dans quel ordre les
  // unes et les autres rendent leur chiffre. Elle reste donc seule en tête.
  if (tetes.length === 1) {
    const mr = RE_RESONANCE.exec(tetes[0]);
    if (mr) return [{ portee: null, resonance: Number(mr[1]), codes }];
  }
  const sortie = [];
  for (const tete of tetes) {
    const mp = RE_PORTEE.exec(tete);
    if (!mp) return null;
    // ★ `codes` est RECOPIÉ pour chaque place. Le dépliage doit rendre ce que
    //   la forme écrite en toutes lettres aurait rendu, et celle-ci fabrique un
    //   tableau par fragment : partager le même laisserait deux descripteurs
    //   liés par un alias, ce qu'aucun appelant n'attend.
    sortie.push({
      portee: { offset: Number(mp[1]), longueur: Number(mp[2]) },
      resonance: null,
      codes: codes.slice(),
    });
  }
  return sortie;
}

export const BANDEAUX = {
  recalculee: 'Démonstration recalculée : ce lien désigne des rangs, pas une méthode.',
  codeInconnu: 'Ce lien emploie une règle que cette version ne connaît pas.',
  // ★ Le refus n'est PAS l'inconnu : la règle est là, elle a dit non. Voir
  //   `recherche/index.js › diagnostic`. Confondre les deux envoyait chercher
  //   une version manquante pour un opérateur présent.
  regleRefusee: (code) => `La règle « ${code} » ne s’applique pas à cette valeur : `
    + 'la démonstration s’arrête là.',
  cibleIllisible: `Ce lien vise une suite que le moteur ne sait pas viser : au plus ${MAX_CHIFFRES} chiffres.`,
  formatInconnu: 'Ce lien a été créé par une autre version du site.',
  lienIllisible: 'Ce lien est illisible : la saisie n’a pas pu être décodée.',
  // Seul bandeau du moteur : le filet de sécurité temporel a mordu. Le
  // classement rendu n'est alors PAS reproductible — il dépend de la charge de
  // la machine — et le contrat §4.3 interdit de laisser varier un rang en
  // silence. Traduit, parce qu'il s'affiche via `localiser()` côté interface.
  rechercheTronquee: {
    fr: 'Recherche écourtée : cette machine a manqué de temps, la liste ci-dessous '
      + 'est partielle et ses rangs ne sont pas reproductibles. Les liens de partage, eux, '
      + 'restent exacts : ils transportent la méthode, pas le rang.',
    en: 'Search cut short: this machine ran out of time, so the list below is partial and '
      + 'its ranks are not reproducible. Share links remain exact: they carry the method, '
      + 'not the rank.',
  },
  saisieTropLongue: `Ce lien dépasse le plafond de ${LIMITE_SAISIE} caractères.`,
  // ★ Une COMMANDE (`????`) à laquelle rien ne répond : ce n'est ni un lien
  //   cassé ni une règle inconnue, c'est une demande impossible sur ce mot-là.
  commandeSansReponse: (n) => `Ce lien demande ${n} chiffre(s) utile(s) d’un morceau `
    + 'qui ne sait pas en donner autant.',
};

// ══════════════════════════════════ écriture canonique

/**
 * ★ Le registre est écrit EN TOUTES LETTRES, même quand il vaut le défaut.
 *
 * Un lien qui se tait sur sa mise en scène dépend d'une règle de lecture, et
 * une règle de lecture peut être discutée, oubliée, ou lue de travers dix ans
 * plus tard. Trois caractères achètent une chose : plus jamais de lien ambigu.
 * Et le registre écrit est celui qu'on JOUERA — replié sur « sobre » si la
 * cible n'a pas d'emblème —, de sorte que relire ce qu'on vient d'écrire rende
 * exactement ce qu'on a écrit.
 *
 * La page de RÉSULTATS, elle, n'en porte pas : elle ne montre aucune
 * démonstration, il n'y a rien à mettre en scène.
 *
 * ★ La CIBLE, elle, n'est écrite QUE si elle diffère de 666 — voir l'en-tête.
 * Et elle est écrite même sans programme : `#c111!#…` désigne la LISTE des
 * voies menant à 111, qui est précisément le lien que la page de listing doit
 * pouvoir partager quand on lui a demandé de viser autre chose.
 *
 * ★ Les RETOUCHES précèdent les fragments, chacune suivie de son `;`. Une
 * démonstration sans retouche s'écrit donc **au caractère près comme avant** :
 * le séparateur n'apparaît que là où il y a deux étages à séparer.
 *
 * ★ Les PORTÉES VOISINES qui partagent un programme sont GROUPÉES —
 * `0.1+2.1:tca+m14` —, parce que la forme canonique de cette grammaire est
 * partout la plus courte et qu'une abréviation que `canoniser()` déplierait à
 * chaque ouverture n'en serait pas une. Voir l'en-tête. Comme pour le `;`, le
 * signe ne paraît que là où il dit quelque chose : sans deux voisines
 * identiques, l'écriture est inchangée au caractère près.
 *
 * ★ Les CURSEURS et la FOUILLE suivent la règle de la cible — écrits seulement
 * s'ils disent quelque chose. Au défaut, `ecrire()` produit exactement les
 * mêmes octets qu'avant qu'ils n'existent, ce qu'un test vérifie : la forme
 * canonique de tous les liens déjà partagés ne bouge pas d'un signe.
 *
 * ★ L'ORDRE est fixé ici, une fois : registre, cible, curseurs, fouille — du
 * plus ancien au plus récent, de sorte qu'un lien d'hier reste un préfixe d'un
 * lien d'aujourd'hui. `lire()` les accepte dans n'importe quel ordre (même
 * doctrine que §4.3), `canoniser()` remet celui-ci.
 *
 * @param {{saisie:string, fragments?:FragmentUrl[], retouches?:FragmentUrl[],
 *          registre?:'sobre'|'scenique',
 *          cible?:import('./cible.js').Cible|string,
 *          curseurs?:Object, fouille?:number}} demonstration
 * @returns {string} le fragment d'URL complet, `#…#…`
 */
export function ecrire({ saisie, fragments, retouches, registre, cible, curseurs, fouille }) {
  const b58 = encoderTexte(saisie);
  const reglages = marqueurCible(cible) + marqueurCurseurs(curseurs) + marqueurFouille(fouille);
  // Une page de RÉSULTATS n'a pas de programme, donc rien à préparer : une
  // retouche sans fragment à nourrir ne désigne aucune démonstration, et on ne
  // l'écrit pas plutôt que d'écrire un lien qui ne se relit pas.
  if (!fragments || !fragments.length) return `#${reglages}#${b58}`;
  return `#${marqueur(registre, cible)}${reglages}${ecrireRetouches(retouches)}${ecrireApproche(fragments)}#${b58}`;
}

/**
 * Les retouches et leurs `;`, ou rien du tout.
 *
 * Exportée parce que `index.js` en a besoin AILLEURS que dans une URL : les
 * `codes` d'une approche — la chaîne qui la nomme dans le classement, dans le
 * banc et dans le dernier départage de `ordreTotal` — doivent dire exactement
 * ce que le lien dit. Deux voies qui ne diffèrent que par leur retouche ont les
 * mêmes codes de fragment ; sans ce préfixe, elles deviennent indiscernables et
 * l'ordre total cesse d'être total (§4.4-1).
 */
export function ecrireRetouches(retouches) {
  if (!retouches || !retouches.length) return '';
  return retouches.map((r) => `${ecrireFragment(r)};`).join('');
}

/** Le préfixe de registre, normalisé — et REPLIÉ sur ce que la cible sait jouer,
 *  faute de quoi l'aller-retour mentirait (voir l'en-tête). */
function marqueur(registre, cible) {
  return `${MOT_URL[registreEffectif(registre, cible)]}!`;
}

/** Le préfixe de cible — vide au défaut, `c111!` sinon. */
function marqueurCible(cible) {
  const c = normaliserCible(cible);
  return c.defaut ? '' : `c${c.texte}!`;
}

/**
 * Le préfixe des quatre curseurs — vide au défaut, `p0.200.100.100!` sinon.
 * L'ordre est celui de `score.js › CURSEURS`, et c'est le seul endroit où il
 * s'écrit : la grammaire n'a pas de nom pour ses champs, elle n'a que leur rang.
 */
function marqueurCurseurs(curseurs) {
  if (!curseurs) return '';
  const c = normaliserCurseurs(curseurs);
  if (auDefaut(c)) return '';
  return `p${CURSEURS.map((k) => c[k]).join('.')}!`;
}

/** Le préfixe de puissance de fouille — vide au cran 0, `f3!` sinon. */
function marqueurFouille(fouille) {
  const n = normaliserPuissance(fouille);
  return n === PUISSANCE_DE_FOUILLE_DEFAUT ? '' : `f${n}!`;
}

/**
 * Le registre OPPOSÉ — l'autre bouton du panneau de voie.
 *
 * ★ Sur une cible sans emblème, il n'y a pas d'autre registre : la bascule
 * rendrait un lien identique à celui d'où l'on vient, donc un bouton qui ne
 * fait rien. On rend alors `null`, et l'interface n'affiche pas le bouton
 * (`registresDisponibles` dit la même chose sous l'autre forme).
 */
export function autreRegistre(registre, cible = CIBLE_DEFAUT) {
  if (!miseEnSceneDisponible(cible)) return null;
  return registre === 'sobre' ? 'scenique' : 'sobre';
}

/**
 * L'approche écrite — avec ses PORTÉES GROUPÉES quand il y en a.
 *
 * ★ Le groupement est une affaire d'ÉCRITURE, et de rien d'autre : les
 * descripteurs reçus ne le portent pas, `lire()` le déplie, et les deux formes
 * dénotent la même démonstration. C'est ce qui permet de l'ajouter sans toucher
 * ni au modèle, ni au rejeu, ni au barème.
 *
 * ★ **On ne groupe QUE des voisines.** L'ordre des fragments est ce qui écrit
 * la cible de gauche à droite : rapprocher deux jumelles séparées par une
 * tierce changerait la suite de chiffres produite — `070` deviendrait `007`.
 * Voir l'en-tête, où la démonstration est faite ; l'exemple de l'auteur est
 * d'ailleurs déjà rangé pour que ses jumelles se touchent.
 */
export function ecrireApproche(fragments) {
  if (!factorisable(fragments)) {
    // Forme à plat : plus longue, mais fidèle à l'ordre écrit.
    return fragments.map(ecrireFragment).join(',');
  }
  // Une `Map` garde l'ordre de PREMIÈRE INSERTION : les groupes sortent donc
  // rangés par leur plus petite portée, et les portées d'un groupe dans l'ordre
  // croissant — la ligne d'entrée l'étant déjà. Aucun tri, donc aucun
  // comparateur à qui faire confiance (§4.4).
  const groupes = new Map();
  for (const f of fragments) {
    const programme = codesEcrits(f.codes).join('+');
    const place = `${f.portee.offset}.${f.portee.longueur}`;
    const deja = groupes.get(programme);
    if (deja) deja.push(place);
    else groupes.set(programme, [place]);
  }
  return [...groupes]
    .map(([programme, places]) => `${places.join('+')}:${programme}`)
    .join(',');
}

/**
 * Peut-on FACTORISER cette ligne sans rien perdre ?
 *
 * ★ LA TROISIÈME CONDITION EST CELLE QUI PROTÈGE LE SENS. Grouper des portées
 *   non adjacentes REORDONNE la lecture : `0.1:A,1.1:B,2.1:A,3.1:B` factorisé
 *   en `0.1+2.1:A,1.1+3.1:B` se relit dans l'ordre 0, 2, 1, 3. Sur une cible
 *   dont toutes les places rendent le même chiffre, c'est sans conséquence ;
 *   sur `007`, la suite produite changerait — `070` deviendrait `007`.
 *
 *   On exige donc que les portées soient DÉJÀ dans l'ordre du texte, et le
 *   dépliage les y remet (`lireFragments`). Les deux formes dénotent alors
 *   exactement la même démonstration, dans le même ordre, et une approche qui
 *   lit ses parts autrement s'écrit à plat.
 */
function factorisable(fragments) {
  if (fragments.length < 2) return false;
  let precedent = -1;
  for (const f of fragments) {
    if (f.resonance || !f.portee) return false;
    if (f.portee.offset <= precedent) return false;
    precedent = f.portee.offset;
  }
  const programmes = fragments.map((f) => codesEcrits(f.codes).join('+'));
  return new Set(programmes).size < programmes.length;
}


function ecrireFragment(f) {
  const programme = codesEcrits(f.codes).join('+');
  if (f.resonance) return `×${f.resonance}:${programme}`;
  if (f.portee) return `${f.portee.offset}.${f.portee.longueur}:${programme}`;
  return programme;
}

/**
 * Traduit une approche notée en descripteurs d'URL.
 * Applique l'abréviation de résonance quand les 3 programmes sont identiques.
 * @param {Object} approche
 * @param {{nbJetons?:number}} [ctx]
 * @returns {FragmentUrl[]}
 */
export function descripteursDe(approche, ctx = {}) {
  const parts = approche.parts.map((p) => ({
    codes: codesEcrits(p.chemin.ops.map((o) => o.code)),
    fragment: p.fragment,
  }));
  const memeProgramme = parts.length === 3
    && parts.every((p) => p.codes.join('+') === parts[0].codes.join('+'));

  if (approche.resonance && memeProgramme) {
    return [{ portee: null, resonance: parts.length, codes: parts[0].codes }];
  }
  return parts.map((p) => ({
    portee: porteeDe(p.fragment, ctx),
    resonance: null,
    codes: codesEcrits(p.codes),
  }));
}

/**
 * Les descripteurs des RETOUCHES d'une approche — l'étage amont, dans l'ordre
 * où il a été appliqué.
 *
 * ⚠️ **Pas de `nbJetons` ici, et c'est délibéré.** Une retouche voit la saisie
 * déjà réécrite par celles qui la précèdent : le nombre de jetons n'est pas le
 * même d'un étage à l'autre, et un compte unique se tromperait forcément
 * quelque part. La question que `porteeDe` pose avec ce compte — « cette portée
 * couvre-t-elle tout, donc peut-on l'omettre ? » — se répond ici par la
 * FAMILLE du fragment, que `index.js › rejouer` pose en déroulant les étages :
 * il est le seul à savoir de quel texte chaque retouche est partie.
 * @param {Object} approche
 * @param {{nbJetons?:number}} [ctx]
 * @returns {FragmentUrl[]}
 */
export function retouchesDe(approche, ctx = {}) {
  return (approche.retouches || []).map((r) => ({
    portee: porteeDe(r.fragment, ctx),
    resonance: null,
    codes: codesEcrits(r.chemin.ops.map((o) => o.code)),
  }));
}

function porteeDe(fragment, ctx) {
  if (!fragment) return null;
  const nb = ctx.nbJetons ?? -1;
  if (fragment.tokenDebut === 0 && (fragment.tokenLong === nb || fragment.famille === 'entier')) return null;
  if (fragment.tokenDebut < 0 || fragment.tokenLong < 0) return null;
  return { offset: fragment.tokenDebut, longueur: fragment.tokenLong };
}

/**
 * Réécrit la barre d'adresse en forme canonique, sans empiler d'historique.
 * L'utilisateur qui copie l'URL copie un lien permanent sans avoir à le savoir.
 */
export function canoniser(demonstration, portee = globalThis) {
  const frag = ecrire(demonstration);
  const h = portee && portee.history;
  const loc = portee && portee.location;
  if (!h || typeof h.replaceState !== 'function' || !loc) return frag;
  if (loc.hash === frag) return frag;
  h.replaceState(null, '', (loc.pathname || '') + (loc.search || '') + frag);
  return frag;
}
