/**
 * ★ **L'ŒUF DE PÂQUES — « cheval sur oiseau = π ».**
 *
 * > « Si on demande à révéler "cheval sur oiseau" ou "cheval sur oiseau = pi"
 * >   (peu importe la casse, la présence d'accent, pi en lettre ou symbole, =
 * >   en toutes lettres ou symbole), alors on va sur l'écran de démonstration
 * >   animée. » (l'auteur)
 *
 * La blague, pour qui la découvre :
 *
 *     CHEVAL        VACHE L       bête à pie L      β π L
 *     ──────   →    ──────   →    ────────────  →   ─────   →   π
 *     OISEAU        OISEAU        bête à ailes       β L
 *
 * `VACHE L` est l'anagramme de `CHEVAL` ; une vache est une bête à pie, un
 * oiseau une bête à ailes ; lues à voix haute, ce sont *bêta pi L* et *bêta L*,
 * dont le quotient vaut π. Rien de tout cela n'est vrai, et c'est le propos du
 * site.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ★ **POURQUOI UN SCÉNARIO ÉCRIT À LA MAIN, ET POURQUOI C'EN EST UN VRAI.**
 *
 * Le moteur de recherche ne produira jamais ceci : il transforme des lettres en
 * nombres, et aucune de ses règles ne sait qu'une vache est une bête à pie.
 * L'œuf est donc écrit, pas trouvé — c'est la seule chose du dépôt qui le soit.
 *
 * Mais il est écrit dans le MÊME format que les autres, et joué par le MÊME
 * moteur visuel : un `{ version, tokens, steps }` que `visuel/compile.js`
 * compile sans savoir d'où il vient, avec les ops du vocabulaire fermé
 * (CONTRACTS §3.1) et pas une de plus. Deux raisons, et la seconde compte
 * davantage :
 *
 *  · la barre de transport, le Registre, le pas-à-pas, les deux registres de
 *    mise en scène, le plein écran — tout marche gratuitement ;
 *  · et surtout, l'œuf ne peut pas mentir plus que le reste du site. S'il
 *    demandait une primitive à lui, cette primitive n'aurait aucun compte à
 *    rendre. Ici, `merge` refuse un collage faux, `substitute` refuse une
 *    substitution qui part de deux jetons, `collapse` refuse une famille d'un
 *    seul membre : les mêmes gardes que partout ailleurs, sur une blague.
 *
 * ★ **CE QU'IL N'EST PAS.** Il n'entre pas au catalogue, ne porte pas de code,
 *   ne s'écrit pas dans une URL de programme et n'a pas de score. Ce n'est pas
 *   une VOIE — c'est une carte postale. Le classement ne le voit jamais, et
 *   `assemblage.js` n'a pas à savoir qu'il existe.
 */

import { t } from '../i18n/index.js';

/**
 * ★ **LA RECONNAISSANCE — large sur la forme, stricte sur le fond.**
 *
 * « Peu importe la casse, la présence d'accent, pi en lettre ou symbole, = en
 * toutes lettres ou symbole » (l'auteur). On replie donc tout ce qui ne change
 * pas ce qui est dit : casse, accents, espaces multiples, ponctuation de
 * bordure. Ce qui reste doit être exactement la phrase — un œuf qui se
 * déclencherait sur « le cheval sur l'oiseau » ne serait plus un œuf, ce serait
 * un piège.
 *
 * ⚠️ `NFD` puis retrait des diacritiques : c'est la seule façon de traiter « é »
 *   composé et « é » précomposé de la même manière. Le premier jet comparait des
 *   chaînes brutes et ratait la moitié des claviers.
 */
const RE_OEUF = new RegExp(
  // ★ « sur » ou la BARRE OBLIQUE : « cheval/oiseau = Pi devrait marcher aussi »
  //   (l'auteur). C'est la même phrase, écrite comme une fraction plutôt que
  //   dite — et c'est bien une fraction que la scène va poser.
  '^cheval\\s*(?:sur|/)\\s*oiseau'
  + '(?:\\s*(?:=|est\\s+egale?\\s+a|egale?\\s+a|egale?|vaut)\\s*(?:pi|π))?$',
);

/** Replie une saisie sur sa forme comparable : sans casse, sans accent, sans bruit. */
function aplatir(saisie) {
  return String(saisie ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // La barre oblique SURVIT au repliage : elle dit la division, exactement
    // comme « sur ». Tout le reste — ponctuation, espaces multiples — se replie
    // sur une espace, parce que rien de tout cela ne change ce qui est dit.
    .replace(/[^a-z0-9=π/]+/g, ' ')
    .trim();
}

/** La saisie demande-t-elle l'œuf ? */
export function estOeuf(saisie) {
  return RE_OEUF.test(aplatir(saisie));
}

/**
 * ★ **LES DEUX MOTS, TELS QU'ILS ONT ÉTÉ TAPÉS.**
 *
 * > « L'easter egg devrait se déclencher quelle que soit la casse, mais se
 * >   dérouler en respectant la casse saisie » (l'auteur).
 *
 * La reconnaissance se fait à plat — sans casse, sans accent — pour attraper
 * toutes les façons d'écrire la phrase ; l'AFFICHAGE, lui, doit rendre ce que
 * le visiteur a écrit. `cheval` en bas de casse reste en bas de casse, et le
 * `L` de « VACHE L » est le sien, pas un `L` de convention.
 *
 * ★ **ON RETROUVE LES MOTS PAR APLATISSEMENT, jamais par une seconde
 *   expression.** Écrire un `/(ch[eéèê]val)/i` à côté du premier motif, ce
 *   serait deux reconnaissances pour une phrase, donc deux occasions de ne pas
 *   s'accorder. On balaie la saisie et l'on garde la tranche de six signes qui
 *   s'aplatit sur le mot cherché : c'est la MÊME fonction qui décide des deux
 *   côtés, donc elles ne peuvent pas diverger.
 *
 * Rend `null` si la saisie n'est pas l'œuf, et les majuscules de convention si
 * — cas qui ne devrait pas exister — un mot restait introuvable.
 */
export function motsDeLOeuf(saisie) {
  if (!estOeuf(saisie)) return null;
  const brut = String(saisie ?? '');
  const trancheQuiVaut = (cible) => {
    const n = [...cible].length;
    const cs = [...brut];
    for (let i = 0; i + n <= cs.length; i++) {
      const tranche = cs.slice(i, i + n).join('');
      if (aplatir(tranche) === cible) return tranche;
    }
    return cible.toUpperCase();
  };
  return { cheval: trancheQuiVaut('cheval'), oiseau: trancheQuiVaut('oiseau') };
}

/* ══════════════════════════ Le scénario, à la main ═════════════════════════ */

const tok = (id, text, kind = 'letter') => ({ id, text, kind });

/**
 * L'espace, en tant que JETON.
 *
 * > « N'oublie pas les espaces, leur absence nuit à la lisibilité. » (l'auteur)
 *
 * ★ **ET IL EN FAUT UN VRAI, PAS UN ÉCART.** « Bête à pie » se lit en trois
 *   mots ; l'étape suivante en prend DEUX — « bête à » — pour en faire un β. Un
 *   écart de mise en page ne se désigne pas : on ne peut pas le nommer dans une
 *   liste de cibles, donc on ne pourrait pas le convertir avec ce qu'il sépare,
 *   et il survivrait à la conversion — une espace orpheline devant le β. Le
 *   jeton, lui, se cible, se convertit et meurt avec ses voisins.
 */
const esp = (id) => ({ id, text: ' ', kind: 'space' });

/**
 * La casse du `L` — celle de la DERNIÈRE lettre du mot tapé au numérateur.
 *
 * C'est ce `L`-là qui survit à la qualification (« VACHE L »), et c'est donc
 * lui qui fait loi : celui que « ailes » deviendra doit lui ressembler, sans
 * quoi l'annulation de l'étape suivante ne se lirait plus.
 */
const casseDuL = (mots) => {
  const dernier = [...mots.cheval].pop() || 'L';
  return dernier === dernier.toLowerCase() ? 'l' : 'L';
};

/**
 * ★ **LES MOTS DU CALEMBOUR NE SE TRADUISENT PAS**, et c'est le seul texte du
 *   dépôt dont on puisse le dire. « Bête à pie » et « bête à ailes » ne valent
 *   que parce qu'ils s'entendent *bêta pi* et *bêta L* : traduits, ils cessent
 *   d'être une démonstration pour devenir une phrase sur des animaux. Les
 *   TITRES d'étape, eux, sont bien bilingues — ils décrivent le geste, et un
 *   anglophone a le droit de savoir ce qu'on prétend faire.
 */
const MOT = Object.freeze({ bete: 'bête', a: 'à', pie: 'pie', ailes: 'ailes' });

/** L'anagramme du numérateur, dans l'ordre où la scène va la ranger. */
const anagramme = (mots) => {
  const c = [...mots.cheval];
  return [3, 4, 0, 1, 2].map((i) => c[i]).join('');
};

/**
 * ★ **LA BARRE DE FRACTION EST UN TRAIT, PAS UNE SUITE DE TIRETS.**
 *
 * > « La barre de fraction doit suivre en longueur quand le contenu s'adapte. »
 * >   (l'auteur)
 *
 * Le premier jet l'écrivait `————————`, comme un jeton de plus. Ça tient tant
 * que rien ne bouge : la longueur d'un texte est un NOMBRE DE SIGNES, elle ne
 * s'interpole pas, et une barre qui doit rétrécir ne peut alors que sauter
 * d'une image à l'autre. Elle est donc un nœud de rôle `filet`, gouverné par
 * `rule` — le trait se recalcule à chaque changement, en continu.
 *
 * ★ **SA LARGEUR DE DÉPART S'ÉCRIT EN SIGNES, et c'est ce qui évite un nombre
 *   magique** : `text` porte autant d'espaces que la plus longue des deux
 *   lignes a de lettres, plus DEUX. Le scénario ne connaît pas les métriques de
 *   la scène — il ne DOIT pas les connaître —, mais il connaît la longueur d'un
 *   mot, et la scène sait ce que vaut un signe. `rule` ajuste ensuite au
 *   dixième d'unité.
 *
 * ⚠️ Plus UNE, et c'était trop court d'une chasse entière : un mot de `n`
 *   lettres occupe `n` chasses ET ses `n−1` écarts, et le trait doit encore
 *   déborder d'une demi-chasse de chaque côté. Mesuré sur « cheval » : 201,6
 *   pour une couverture de 231,6 — la barre ne couvrait pas son numérateur
 *   pendant la seconde et demie qui précède le premier `rule`, c'est-à-dire
 *   pendant tout le temps où l'on découvre l'énoncé. Plus deux tombe à 230,4,
 *   à une unité et deux dixièmes près.
 */
const filet = (id, signes) => ({ id, role: 'filet', kind: 'sep', text: ' '.repeat(signes) });

/**
 * ★ **LA SAISIE PORTE-T-ELLE DÉJÀ SA CONCLUSION ?**
 *
 * > « L'animation doit partir de la saisie utilisateur : s'il a saisi "cheval
 * >   sur oiseau = pi", la partie "= pi" doit apparaître tout du long ; pi sera
 * >   converti en symbole en même temps que les autres apparitions de symbole,
 * >   la conclusion est alors π = π. Et dans cette version, pas de verdict mais
 * >   "CQFD". » (l'auteur)
 *
 * Les deux saisies ne demandent donc pas la même démonstration. Celle qui pose
 * l'égalité demande qu'on la VÉRIFIE — le membre de droite reste là du premier
 * au dernier temps, et la fin est une confrontation. Celle qui n'en pose pas
 * demande qu'on la TROUVE, et la fin est un énoncé qu'on récrit avec sa
 * réponse. Une seule chorégraphie pour les deux aurait, dans un cas sur deux,
 * répondu à une question qu'on n'avait pas posée.
 */
function conclusionSaisie(saisie) {
  const plat = aplatir(saisie);
  const m = /(=|est\s+egale?\s+a|egale?\s+a|egale?|vaut)\s*(pi|π)$/.exec(plat);
  if (!m) return null;
  // Le `pi` TEL QU'IL A ÉTÉ TAPÉ — même règle que pour les deux mots : on
  // balaie la saisie et l'on garde la tranche qui s'aplatit dessus.
  const brut = String(saisie ?? '');
  const cs = [...brut];
  for (let n = 2; n >= 1; n--) {
    for (let i = 0; i + n <= cs.length; i++) {
      const tranche = cs.slice(i, i + n).join('');
      if (aplatir(tranche) === m[2] && i + n === cs.length) return tranche;
    }
  }
  return m[2];
}

/** Les jetons de départ : le numérateur, le trait, le dénominateur — trois lignes. */
function jetonsDeDepart(mots, pi) {
  const haut = [...mots.cheval].map((c, i) => tok(`h${i}`, c));
  const bas = [...mots.oiseau].map((c, i) => tok(`b${i}`, c));
  bas[0].breakBefore = true;
  const large = Math.max([...mots.cheval].length, [...mots.oiseau].length) + 2;
  const trait = { ...filet('barre', large), breakBefore: true };
  return [
    ...haut,
    trait,
    // « = pi » se pose sur la ligne du TRAIT, à sa droite : c'est là qu'une
    // égalité se lit, à hauteur de ce qui sépare, jamais sous le dénominateur.
    ...(pi ? [esp('e0'), tok('eq', '=', 'operator'), esp('e1'), tok('pi', pi, 'letter')] : []),
    ...bas,
  ];
}

/**
 * ★ **CINQ PHASES, ET CHACUNE EST UN ATELIER PLUTÔT QU'UN REMPLACEMENT.**
 *
 * > « Quand une expression va à la pointe de l'accolade, elle y va centrée,
 * >   puis ajoute flèche et nouvelle expression, puis coulisse pour centrer la
 * >   cible, puis la cible vient prendre la place d'origine (puis disparition
 * >   de l'accolade). » (l'auteur)
 *
 * C'est `convert` qui joue ce geste (`visuel/primitives/convert.js`), et il est
 * ici employé SIX fois : deux qualifications, quatre synthèses. Le choix n'est
 * pas décoratif — un `substitute` aurait montré « vache » DEVENANT « bête à
 * pie », c'est-à-dire une identité ; l'atelier montre quelqu'un qui l'AFFIRME,
 * sous le nom de la règle invoquée. Sur une démonstration dont tout le propos
 * est que les règles sont fausses, la différence est le sujet même.
 *
 * ★ **ET LES ACCOLADES S'OUVRENT DU CÔTÉ DE LEUR LIGNE.** Le numérateur ouvre
 *   vers le haut, le dénominateur vers le bas — « ensuite même opération en
 *   miroir en dessous » (l'auteur). Une accolade qui s'ouvrirait vers le bas
 *   sous le numérateur écrirait son atelier par-dessus le trait de fraction.
 */
function etapes(mots, pi) {
  // ⚠️ `t()` rend la langue COURANTE, et c'est ce qu'il faut : un scénario est
  //    construit pour être joué maintenant, et le routeur le refabrique quand la
  //    langue change (comme il le fait pour une vraie voie).
  const dire = (cle) => t(`oeuf.${cle}`);
  const L = casseDuL(mots);
  const large = Math.max([...mots.cheval].length, [...mots.oiseau].length) + 2;

  /* ① CHEVAL devient VACHE L.

        ★ **LE TITRE EST « MULTIPLICATION COMMUTATIVE », et c'est là qu'est la
          blague.** L'auteur ne fait pas nommer le geste par ce qu'il FAIT —
          « réagencement des lettres » le décrivait exactement, et n'expliquait
          rien. Il le fait nommer par ce qui le JUSTIFIE : si `CHEVAL` est le
          produit C × H × E × V × A × L, alors la multiplication étant
          commutative, on peut permuter les facteurs. La rigueur invoquée est
          impeccable ; c'est sa prémisse qui est absurde, et c'est tout le
          procédé du site.

        Le geste, lui, reste un simple RÉARRANGEMENT : `move` avec `order`
        permute sur place, sans rien créer ni détruire. Ce sont les mêmes six
        lettres et le spectateur doit pouvoir les suivre une à une — un
        `substitute` aurait fait naître six lettres neuves, c'est-à-dire aurait
        affirmé une réécriture là où il n'y a qu'un déplacement.

        ★ **ET L'ACCOLADE EST AU-DESSUS.** « Dans la scène, une accolade
          au-dessus de cheval indiquant Multiplication commutative pendant que
          les lettres sont déplacées » (l'auteur). En dessous, elle aurait
          promis un résultat sous sa pointe — or rien ne descend ici, les
          lettres se rangent sur place. Le côté DIT ce qui va se passer. */
  const s1 = {
    id: 's_oeuf_1',
    title: dire('commutation'),
    caption: `${dire('commutationDetail')} : ${mots.cheval} → ${anagramme(mots)} ${[...mots.cheval].pop()}`,
    ops: [
      {
        op: 'group',
        targets: ['h0', 'h1', 'h2', 'h3', 'h4', 'h5'],
        sens: 'haut',
        label: dire('commutation'),
        // Elle DÉSIGNE un rangement : ni resserrement (les lettres vont bouger
        // pour une autre raison), ni promesse de résultat sous la pointe.
        tighten: 0,
        promet: false,
        at: 0,
        dur: 900,
        fadeAt: 2500,
      },
      {
        op: 'move',
        order: ['h3', 'h4', 'h0', 'h1', 'h2', 'h5'],
        // Le `L` s'isole : c'est le facteur qu'on met de côté, et l'espace est
        // ce qui le dit. Voir `move.ecarts` — un écart, pas un jeton : une
        // permutation ne crée pas de matière.
        ecarts: { h5: 1 },
        at: 900,
        dur: 1500,
      },
      { op: 'rule', id: 'barre', couvre: { all: true }, at: 1500, dur: 900 },
    ],
  };

  /* ② La qualification animale, en deux ateliers successifs — l'un au-dessus
        du trait, l'autre en dessous. La première lettre de chaque mot n'est
        pas « remplacée » : le mot MONTE sous l'accolade, s'y voit égalé à sa
        qualification, et c'est la qualification qui redescend. Le `L` de
        VACHE L ne bouge pas : il n'est pas un animal, il est déjà une lettre. */
  const s2 = {
    id: 's_oeuf_2',
    title: dire('qualification'),
    caption: `${anagramme(mots)} → ${MOT.bete} ${MOT.a} ${MOT.pie} · ${mots.oiseau} → ${MOT.bete} ${MOT.a} ${MOT.ailes}`,
    ops: [
      {
        op: 'convert',
        targets: ['h3', 'h4', 'h0', 'h1', 'h2'],
        to: [
          tok('qh0', MOT.bete), esp('qhs1'), tok('qh1', MOT.a), esp('qhs2'), tok('qh2', MOT.pie),
        ],
        label: dire('qualification'),
        sens: 'haut',
        at: 0,
        dur: 3400,
      },
      { op: 'rule', id: 'barre', couvre: { all: true }, at: 2600, dur: 800 },
      {
        op: 'convert',
        targets: ['b0', 'b1', 'b2', 'b3', 'b4', 'b5'],
        to: [
          tok('qb0', MOT.bete), esp('qbs1'), tok('qb1', MOT.a), esp('qbs2'), tok('qb2', MOT.ailes),
        ],
        label: dire('qualification'),
        sens: 'bas',
        at: 3400,
        dur: 3400,
      },
      { op: 'rule', id: 'barre', couvre: { all: true }, at: 6000, dur: 800 },
    ],
  };

  /* ③ La synthèse phonétique : ce qui s'ENTEND devient ce qui s'écrit.
        « bête à » se lit β — et c'est bien « bête à » et non « bête », la
        correction de l'auteur est phonétique : sans le « à », on entend *bêt*,
        pas *bêta*. « pie » se lit π, « ailes » se lit L.

        Quatre ateliers, un par conversion : « une par une avec déplacement
        bête à → β puis redescente de β, ou remontée pour la partie sous la
        barre de fraction » (l'auteur). Les regrouper aurait fait paraître
        quatre β et π d'un coup, sans qu'on voie lequel vient d'où.

        ★ **ET UN CINQUIÈME ATELIER QUAND L'ÉNONCÉ PORTE SON « = pi ».**

          > « Il n'empêche qu'on convertit Pi en π : c'est une synthèse
          >   phonétique aussi. Donc que ce soit pie ou Pi ou pi, ça reste une
          >   conversion vers le symbole mathématique. Je veux donc le même
          >   appareillage et processus que pour pie ou bête à. » (l'auteur)

          ⚠️ J'avais donné à celui-là un traitement au rabais — une désignation,
            un fondu, un battement — au motif qu'il est RECOPIÉ de l'énoncé et
            non démontré. L'argument est faux, et l'auteur le dit exactement :
            ce qui définit le geste n'est pas d'où vient le mot, c'est ce qu'on
            lui fait. Passer de trois lettres à un signe est une synthèse
            phonétique, que le mot vienne d'une qualification animale ou de la
            saisie. Deux traitements pour un même geste auraient dit qu'il y a
            deux gestes.

          ⚠️ **SAUF SI L'ÉNONCÉ PORTE DÉJÀ LE SYMBOLE.** « Si Pi est déjà écrit
            π, il n'y a pas à le convertir — alors qu'actuellement tu le
            convertis quand même » (l'auteur). Une synthèse phonétique va d'un
            MOT à un signe ; sur `Cheval/Oiseau=π`, il n'y a pas de mot, il y a
            déjà le signe. L'atelier aurait ouvert une accolade pour montrer que
            π devient π, c'est-à-dire pour justifier un geste qui n'a pas lieu —
            la seule chose que cette page ne peut pas se permettre.

          `decalPi` est ce que ce cinquième atelier coûte au reste de l'étape,
          et il vaut ZÉRO quand il n'y a rien à convertir : ni dans la branche
          sans « = pi », ni quand le symbole est déjà là. */
  /* ★ **LE π DE DROITE A DEUX IDENTITÉS POSSIBLES**, et c'est l'énoncé qui
     tranche : le jeton de DÉPART quand la saisie porte déjà `π`, celui que
     l'atelier fait naître quand elle porte un mot. Tout ce qui le désigne
     ensuite — le battement du verdict — passe par ce nom-là. */
  const dejaSymbole = pi === 'π';
  const aConvertir = Boolean(pi) && !dejaSymbole;
  const piDroite = dejaSymbole ? 'pi' : 'P2';
  const decalPi = aConvertir ? 3000 : 0;
  const s3 = {
    id: 's_oeuf_3',
    title: dire('synthese'),
    caption: `${MOT.bete} ${MOT.a} → β · ${MOT.pie} → π · ${MOT.ailes} → ${L}`,
    ops: [
      {
        op: 'convert',
        targets: ['qh0', 'qhs1', 'qh1'],
        to: [tok('B1', 'β')],
        label: dire('synthese'),
        sens: 'haut',
        at: 0,
        dur: 2800,
      },
      {
        op: 'convert',
        targets: ['qh2'],
        to: [tok('P1', 'π')],
        label: dire('synthese'),
        sens: 'haut',
        at: 2800,
        dur: 2400,
      },
      /* ★ **LE `pi` DE LA SAISIE DEVIENT π DANS LE MÊME TEMPS — pas dans la
         même milliseconde.** « Pi sera converti en symbole en même temps que
         les autres apparitions de symbole » (l'auteur). C'est un `substitute`
         et non un atelier : celui de droite n'est pas DÉMONTRÉ, il est recopié
         de l'énoncé — lui ouvrir une accolade lui donnerait une justification
         qu'il n'a pas.

         ⚠️ Il se posait à `3400`, en plein milieu de l'atelier « pie → π »
           (2800 → 5200), et depuis que les rangs d'une fraction partagent l'axe
           du trait (`visuel/layout.js`), les deux gestes se contredisent : « pi »
           compte deux signes et « π » un seul, donc le membre de droite
           rétrécit, donc l'expression entière se recentre — pendant que
           l'atelier déplace déjà ces mêmes jetons. Quatre avertissements
           « animations concurrentes » à la compilation, et à l'écran deux
           mouvements qui se marchent dessus.

         Il se pose donc À LA SUITE, à l'instant où le π du numérateur vient de
         prendre sa place : les deux π sont neufs du même temps de la
         démonstration, ce qui est ce que l'auteur demande. */
      /* Le « pi » de l'énoncé : MÊME atelier, même accolade, même règle nommée
         que les quatre autres. Il s'ouvre vers le HAUT, comme ceux du
         numérateur : la zone au-dessus de lui est libre — le numérateur et le
         dénominateur sont centrés sur l'axe du trait, donc à sa gauche —, alors
         qu'en dessous il rencontrerait le dénominateur. */
      ...(aConvertir ? [{
        op: 'convert',
        targets: ['pi'],
        to: [tok('P2', 'π')],
        label: dire('synthese'),
        sens: 'haut',
        at: 5200,
        dur: 2400,
      }] : []),
      { op: 'rule', id: 'barre', couvre: { all: true }, at: 4600 + decalPi, dur: 700 },
      {
        op: 'convert',
        targets: ['qb0', 'qbs1', 'qb1'],
        to: [tok('B2', 'β')],
        label: dire('synthese'),
        sens: 'bas',
        at: 5300 + decalPi,
        dur: 2800,
      },
      {
        op: 'convert',
        targets: ['qb2'],
        to: [tok('L2', L)],
        label: dire('synthese'),
        sens: 'bas',
        at: 8100 + decalPi,
        dur: 2400,
      },
      { op: 'rule', id: 'barre', couvre: { all: true }, at: 10200 + decalPi, dur: 700 },
    ],
  };

  /* ④ La réduction mathématique — et c'est la chute.

        > « Le titre de la phase doit aussi apparaître dans la scène et rester
        >   durant la phase (même s'il n'y a pas besoin d'accolade pour ça).
        >   Les deux β sont rayés en diagonale du bas gauche vers le haut droit,
        >   puis ils se jettent l'un vers l'autre (mais celui du bas fait les
        >   3/4 du trajet pour que la superposition ne se fasse pas par-dessus
        >   la barre de fraction). Quand ils se collisionnent, ils explosent
        >   (comme les 6 excédentaires au verdict). Puis c'est au tour des l
        >   d'être barrés puis réunis et explosés. Pendant ce temps, la barre de
        >   fraction se réduit pour s'adapter à ce qui reste ; quand il ne reste
        >   plus rien en bas, elle finit de se réduire et disparaît. Enfin Pi
        >   restant descend à hauteur principale. » (l'auteur)

        ★ **AUCUNE ACCOLADE ICI, ET C'EST VOULU.** Les trois phases précédentes
          en avaient une parce qu'elles INVOQUAIENT une règle : il fallait
          nommer ce qui autorisait le passage. Simplifier une fraction
          n'invoque rien — c'est le seul moment vrai de toute la
          démonstration. Le titre suffit, et il se pose dans la scène.

        ★ **`part: 0.25` N'EST PAS UN RÉGLAGE D'ESTHÈTE.** À mi-chemin, les
          deux β se rencontreraient SUR le trait de fraction, c'est-à-dire à
          l'endroit précis que la collision ne doit pas recouvrir : on ne peut
          pas faire disparaître deux termes en cachant ce qui les sépare. Celui
          du haut ne fait donc qu'un quart du trajet. */
  const s4 = {
    id: 's_oeuf_4',
    title: dire('reduction'),
    caption: `β π ${L} / β ${L} = π`,
    ops: [
      {
        op: 'annotate', text: dire('reduction'), place: 'scene', fugace: true,
        at: 0, dur: 9200,
      },
      { op: 'highlight', mode: 'raye', targets: ['B1', 'B2'], at: 500, dur: 800, stagger: 120 },
      {
        op: 'collapse',
        mode: 'annulation',
        // Ils sont déjà séparés par le trait : les faire s'envoler d'abord les
        // ferait le franchir avant l'heure (`collapse.envol`).
        envol: 0,
        souffle: true,
        familles: [{ membres: ['B1', 'B2'], part: 0.25 }],
        at: 1400,
        dur: 1800,
      },
      { op: 'highlight', mode: 'raye', targets: ['h5', 'L2'], at: 3400, dur: 800, stagger: 120 },
      {
        op: 'collapse',
        mode: 'annulation',
        envol: 0,
        souffle: true,
        familles: [{ membres: ['h5', 'L2'], part: 0.25 }],
        at: 4300,
        dur: 1800,
      },
      // Les espaces qui séparaient des mots dont il ne reste rien.
      { op: 'drop', targets: ['qhs2', 'qbs2'], mode: 'erase', at: 6200, dur: 700 },
      /* Le trait n'a plus rien à séparer : il se referme sur place, puis s'en
         va. Il ne referme PAS la ligne en partant — il emporte seulement sa
         coupure, et c'est le `move` qui suit qui rassemble ce qui reste. */
      { op: 'rule', id: 'barre', to: 0, retire: true, at: 6900, dur: 1200 },
      /* ★ **LA DESCENTE EST UN SEUL MOUVEMENT, et c'est `rule` qui le permet.**
         « Enfin Pi restant descend à hauteur principale » (l'auteur) : le trait
         mort quitte le flux sans refermer la ligne derrière lui, et ce `move`
         referme tout d'un coup — le rang du dénominateur, celui du trait, et la
         coupure qu'il portait. Le π rejoint la ligne de base en une fois, et
         « = π » l'y rejoint : « la conclusion est alors π = π » (l'auteur).

         ⚠️ Il descendait en DEUX temps : le retrait du trait reflowait avant de
           le tuer, donc la mise en page passait par un état à deux rangs dont
           celui du milieu était vide, et le π s'arrêtait à mi-hauteur (y 162 →
           201) avant de finir ici (201 → 240). Voir `primitives/rule.js`. */
      { op: 'move', at: 8100, dur: 1000 },
    ],
    /* Le temps de regarder le résultat avant la conclusion. Sans lui, le π se
       pose et « C.Q.F.D. » paraît dans la foulée — « son retour sur la ligne de
       base […] arrive dans un second temps avec CQFD » (l'auteur). La chute a
       besoin d'un silence, pas d'un enchaînement. */
    hold: 800,
  };

  /* ⑤ La fin, et il y en a DEUX — c'est la saisie qui décide.

        > « S'il y a déjà = Pi, il n'y a plus qu'à afficher dans la scène
        >   C.Q.F.D. Sinon, Pi migre vers la droite, et cheval/oiseau =
        >   apparaît à gauche tel qu'au début de la démonstration, puis
        >   C.Q.F.D. est ajouté comme titre en scène. » (l'auteur)

        Dans les deux cas la conclusion est un TITRE EN SCÈNE et non le verdict
        du site : l'orage, les cornes et les triptyques sont la scénographie du
        666, et il n'y a pas de 666 ici. « C.Q.F.D. » est ce qu'écrit quelqu'un
        qui vient de finir une démonstration — c'est exactement le ton. */
  /* ★ **DEUX FINS, DEUX PLACES — et c'est la scène qui décide, pas le goût.**
   *
   * > « Quand on finit sur Pi = Pi, CQFD est bien, centré au-dessus. Quand on
   * >   finit sur cheval/oiseau = Pi, CQFD au-dessus est disgracieux […] il
   * >   devrait venir comme une signature en bas à droite. » (l'auteur)
   *
   * ★ **ET C'EST LA SIGNATURE DANS LES DEUX CAS** — « place-le aussi comme ça
   *   pour la version Pi = Pi » (l'auteur). Le titre centré au haut de la vue
   *   convenait à une ligne unique et détonnait sur une fraction, dont l'axe
   *   n'est pas le milieu de la scène : deux centrages différents dans une même
   *   image se lisent comme un défaut d'alignement. Le paraphe, lui, se cale
   *   sur le contenu et le suit où qu'il aille — il n'a donc rien à accorder,
   *   et les deux fins se ressemblent enfin.
   */
  const cqfd = () => ({
    op: 'annotate', text: dire('cqfd'), place: 'signature', taille: 0.9, ton: 'gold',
  });
  const s5 = pi
    ? {
      id: 's_oeuf_5',
      title: dire('cqfd'),
      caption: `π = π`,
      ops: [
        { op: 'pulse', targets: ['P1', piDroite], at: 0, dur: 900 },
        { ...cqfd(), at: 700, dur: 1800 },
      ],
    }
    : {
      id: 's_oeuf_5',
      title: dire('cqfd'),
      caption: `${mots.cheval} / ${mots.oiseau} = π`,
      ops: [
        /* ★ **LE π NE DISPARAÎT PAS — c'est LUI que l'énoncé vient encadrer.**
         *
         * > « L'étape CQFD a un problème : elle fait disparaître Pi pour
         * >   réafficher cheval/oiseau = Pi. Il faudrait déplacer Pi vers la
         * >   droite puis faire apparaître cheval/oiseau = à sa gauche. »
         * >   (l'auteur)
         *
         * C'était un `substitute` : le π mourait et un autre renaissait au
         * milieu de l'énoncé — deux π, dont le second n'avait rien démontré,
         * alors que ce lien-là est le seul que toute la démonstration ait
         * construit. Avec `insert`, la ligne s'ouvre DEVANT lui : il glisse à
         * droite parce qu'il y a désormais quelque chose à sa gauche, et
         * l'énoncé s'écrit ensuite.
         */
        {
          op: 'insert',
          avant: 'P1',
          tokens: [
            ...[...mots.cheval].map((c, i) => tok(`v${i}`, c)),
            { ...filet('barre2', large), breakBefore: true },
            esp('v_e0'), tok('veq', '=', 'operator'), esp('v_e1'),
          ],
          at: 0,
          dur: 2200,
        },
        /* ⚠️ Le dénominateur entre APRÈS le π, et sur son propre rang — c'est le
           `breakBefore` de son premier jeton qui le dit. Le glisser dans la même
           insertion l'aurait posé avant le π, donc entre le trait et lui. */
        {
          op: 'insert',
          apres: 'P1',
          tokens: [...mots.oiseau].map((c, i) => {
            const j = tok(`w${i}`, c);
            if (i === 0) j.breakBefore = true;
            return j;
          }),
          at: 2200,
          dur: 1600,
        },
        // Le trait renaît avec l'énoncé, et se cale sur lui : sa largeur de
        // départ est écrite en signes, `rule` l'ajuste au dixième d'unité.
        { op: 'rule', id: 'barre2', couvre: { all: true }, at: 3800, dur: 700 },
        { op: 'pulse', targets: ['P1'], at: 4500, dur: 900 },
        { ...cqfd(), at: 5000, dur: 1800 },
      ],
    };

  return [s1, s2, s3, s4, s5];
}

/**
 * Le scénario complet de l'œuf, prêt pour `pageDemonstration`.
 *
 * `registre: 'sobre'` : l'orage et les cornes sont la scénographie du 666, et
 * il n'y a pas de 666 ici. Les faire tonner sur un π serait la seule fausseté
 * que cette page ne peut pas se permettre — celle qui trompe sur ce qu'on
 * regarde, et non sur ce qu'on démontre.
 */
export function scenarioDeLOeuf(saisie) {
  // Les mots TELS QUE TAPÉS : c'est eux que la scène montre, du premier jeton
  // au verdict. Une saisie qui ne serait pas l'œuf ne devrait jamais arriver
  // ici — le routeur ne l'appelle qu'après `estOeuf` — mais on retombe sur les
  // capitales de convention plutôt que d'exploser sur un `null`.
  const mots = motsDeLOeuf(saisie) || { cheval: 'CHEVAL', oiseau: 'OISEAU' };
  const pi = conclusionSaisie(saisie);
  return {
    version: 1,
    input: saisie,
    method: {
      id: 0,
      label: t('oeuf.titre'),
      rule: t('oeuf.regle'),
    },
    result: 'π',
    tokens: jetonsDeDepart(mots, pi),
    steps: etapes(mots, pi),
    registre: 'sobre',
  };
}

/**
 * L'approche de façade — ce que la page de démonstration lit d'une voie.
 * Elle n'a ni rang, ni score, ni URL de programme : l'œuf ne se classe pas.
 */
export function approcheDeLOeuf() {
  // Une chaîne simple, et non un `{fr, en}` : `localiser` accepte les deux, et
  // l'œuf n'a pas de raison de traîner un dictionnaire quand la page qui
  // l'affiche vient d'être construite dans une langue connue.
  return {
    rang: 1,
    titre: t('oeuf.titre'),
    regle: t('oeuf.regle'),
    series: 0,
    codes: '',
    joker: false,
  };
}
