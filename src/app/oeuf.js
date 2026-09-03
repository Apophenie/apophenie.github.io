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
 * ★ **LA BARRE DE DIVISION EST UN JETON, et c'est ce qui la rend possible.**
 *
 * Aucune primitive ne trace un filet horizontal : `fraction` en dessine un, mais
 * c'est une chorégraphie complète de moyenne — poser une somme, la diviser —
 * qui n'a rien à voir avec une fraction qu'on garde à l'écran d'un bout à
 * l'autre. Un jeton de tirets, lui, existe dans le flux comme les autres : il
 * se centre avec les lignes, il survit aux reflows, et il tombe quand on n'en
 * a plus besoin. Le geste le plus simple qui dise la chose.
 *
 * ★ **ET LES TROIS LIGNES SONT NATIVES.** `layout.js` centre chaque ligne
 *   horizontalement et le bloc verticalement — c'est-à-dire exactement la mise
 *   en page d'une fraction. Il suffit de demander la coupure (`breakBefore`),
 *   ce que `compile.js` honore désormais dès qu'un jeton la déclare.
 */
const BARRE = '————————';

/** Les jetons de départ : le numérateur, la barre, le dénominateur — trois lignes. */
function jetonsDeDepart(mots) {
  const haut = [...mots.cheval].map((c, i) => tok(`h${i}`, c));
  const bas = [...mots.oiseau].map((c, i) => tok(`b${i}`, c));
  bas[0].breakBefore = true;
  return [
    ...haut,
    { ...tok('barre', BARRE, 'sep'), breakBefore: true },
    ...bas,
  ];
}

/**
 * ★ **CINQ ÉTAPES, ET CHACUNE PORTE SON TITRE DE REGISTRE** — ceux que l'auteur
 * a dictés. Le Registre les affiche comme il affiche ceux d'une vraie voie :
 * c'est lui qui raconte, et il ne doit pas savoir que celle-ci est fausse.
 */
function etapes(mots) {
  // ⚠️ `t()` rend la langue COURANTE, et c'est ce qu'il faut : un scénario est
  //    construit pour être joué maintenant, et le routeur le refabrique quand la
  //    langue change (comme il le fait pour une vraie voie).
  const dire = (cle) => t(`oeuf.${cle}`);

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
        affirmé une réécriture là où il n'y a qu'un déplacement. */
  const s1 = {
    id: 's_oeuf_1',
    title: dire('commutation'),
    caption: dire('commutationDetail'),
    ops: [{ op: 'move', order: ['h3', 'h4', 'h0', 'h1', 'h2', 'h5'] }],
  };

  /* ② La qualification animale. La première lettre de chaque mot devient les
        mots qui le qualifient, les autres tombent — c'est la forme que
        `filtres.js` emploie déjà pour une substitution qui RACCOURCIT la
        ligne (`substitute` puis `drop`). Le `L` de VACHE L ne bouge pas :
        il n'est pas un animal, il est déjà une lettre. */
  const s2 = {
    id: 's_oeuf_2',
    title: dire('qualification'),
    caption: `${anagramme(mots)} → ${MOT.bete} ${MOT.a} ${MOT.pie} · ${mots.oiseau} → ${MOT.bete} ${MOT.a} ${MOT.ailes}`,
    ops: [
      {
        op: 'substitute',
        stagger: 60,
        pairs: [
          { target: 'h3', to: [tok('qh0', MOT.bete, 'letter'), tok('qh1', MOT.a, 'letter'), tok('qh2', MOT.pie, 'letter')] },
          { target: 'b0', to: [tok('qb0', MOT.bete, 'letter'), tok('qb1', MOT.a, 'letter'), tok('qb2', MOT.ailes, 'letter')] },
        ],
      },
      { op: 'drop', targets: ['h4', 'h0', 'h1', 'h2', 'b1', 'b2', 'b3', 'b4', 'b5'], mode: 'erase' },
    ],
  };

  /* ③ La synthèse phonétique : ce qui s'ENTEND devient ce qui s'écrit.
        « bête » se lit β, « pie » se lit π, « ailes » se lit L. Le « à » ne
        se lit rien du tout — il tombe, et c'est la seule chose que cette
        étape jette. */
  const s3 = {
    id: 's_oeuf_3',
    title: dire('synthese'),
    caption: `${MOT.bete} → β · ${MOT.pie} → π · ${MOT.ailes} → ${casseDuL(mots)}`,
    ops: [
      {
        op: 'substitute',
        stagger: 60,
        pairs: [
          { target: 'qh0', to: tok('B1', 'β', 'letter') },
          { target: 'qh2', to: tok('P1', 'π', 'letter') },
          { target: 'qb0', to: tok('B2', 'β', 'letter') },
          /* ★ **LE `L` DE « AILES » PREND LA CASSE DE CELUI DE « CHEVAL ».**
             « Ce qui implique de transformer ailes en L ou l selon la casse de
             cheval » (l'auteur), et l'argument est visuel, pas typographique :
             les deux `L` doivent S'ANNULER à l'étape suivante. Deux glyphes de
             casses différentes ne se lisent pas comme le même facteur, et
             l'annulation cesserait d'être évidente. Celui du haut est le jeton
             TAPÉ — on ne peut donc pas le changer ; c'est à celui du bas de
             s'aligner. */
          { target: 'qb2', to: tok('L2', casseDuL(mots), 'letter') },
        ],
      },
      { op: 'drop', targets: ['qh1', 'qb1'], mode: 'erase' },
    ],
  };

  /* ④ La réduction mathématique — et c'est la chute. Les β s'annulent entre
        eux, les L aussi : `collapse` en mode « annulation » est le geste que
        la médiane emploie pour faire tomber ses extrêmes par paires, et il
        dit ici exactement la même chose. Reste π, seul, et la barre n'a plus
        rien à séparer. */
  const s4 = {
    id: 's_oeuf_4',
    title: dire('reduction'),
    caption: `βπ${casseDuL(mots)} / β${casseDuL(mots)} = π`,
    ops: [
      {
        op: 'collapse',
        mode: 'annulation',
        familles: [
          { membres: ['B1', 'B2'] },
          { membres: ['h5', 'L2'] },
        ],
      },
      { op: 'drop', targets: ['barre'], mode: 'erase', at: 700 },
      { op: 'move', at: 900 },
    ],
  };

  /* ⑤ Le verdict. Il RÉÉCRIT l'énoncé de départ, cette fois avec sa
        conclusion : c'est la seule étape qui fait revenir ce qui était tombé,
        et c'est pour ça qu'elle ne peut pas être un `reveal` — celui-là est la
        machinerie du 666, il aligne des séries et fait exploser des
        surnuméraires. Ici il n'y a qu'une égalité à écrire. */
  const s5 = {
    id: 's_oeuf_5',
    title: dire('verdict'),
    caption: `${mots.cheval} / ${mots.oiseau} = π`,
    ops: [
      {
        op: 'substitute',
        pairs: [{
          target: 'P1',
          // ★ L'ORDRE EST CELUI DES LIGNES, et « = π » se pose sur celle de la
          //   BARRE — c'est là qu'une égalité se lit, à hauteur du trait qui
          //   sépare, jamais sous le dénominateur. Il suffit donc de l'insérer
          //   entre la barre et le `O` : c'est ce dernier qui rompt la ligne.
          to: [
            ...[...mots.cheval].map((c, i) => tok(`v${i}`, c, 'letter')),
            { ...tok('vbarre', BARRE, 'sep'), breakBefore: true },
            tok('veq', '=', 'sep'),
            tok('vpi', 'π', 'letter'),
            ...[...mots.oiseau].map((c, i) => {
              const j = { ...tok(`w${i}`, c, 'letter') };
              if (i === 0) j.breakBefore = true;
              return j;
            }),
          ],
        }],
      },
      // ⚠️ APRÈS la substitution, jamais pendant : le jeton qui naît voit déjà
      //    son `scale` animé par le crossfade, et deux ops sur le même canal
      //    sont un avertissement de compilation (recherche §2.4, contrainte 4).
      { op: 'pulse', targets: ['vpi'], at: 1400 },
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
  return {
    version: 1,
    input: saisie,
    method: {
      id: 0,
      label: t('oeuf.titre'),
      rule: t('oeuf.regle'),
    },
    result: 'π',
    tokens: jetonsDeDepart(mots),
    steps: etapes(mots),
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
