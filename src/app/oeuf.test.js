/**
 * ★ L'ŒUF DE PÂQUES — « cheval sur oiseau = π ».
 *
 * Deux choses se vérifient ici, et elles ne se ressemblent pas :
 *
 *  · **la RECONNAISSANCE**, qui doit être large sur la forme et stricte sur le
 *    fond. Un œuf qui s'ouvrirait sur « le cheval sur l'oiseau » ne serait plus
 *    une surprise, ce serait un piège ;
 *  · **le SCÉNARIO**, qui est écrit à la main et doit passer par le moteur
 *    visuel RÉEL, sans un avertissement. C'est tout l'intérêt de l'avoir écrit
 *    dans le format ordinaire : il subit les mêmes gardes que le reste, et ce
 *    test le prouve plutôt que de l'affirmer.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { estOeuf, scenarioDeLOeuf, approcheDeLOeuf } from './oeuf.js';
import { compile } from '../visuel/compile.js';

/* ═════════════════════════ 1. La reconnaissance ══════════════════════════ */

test('★ œuf — toutes les façons de l’écrire, et aucune autre', () => {
  // « Peu importe la casse, la présence d'accent, pi en lettre ou symbole, = en
  //   toutes lettres ou symbole » (l'auteur), plus la barre oblique.
  for (const s of [
    'cheval sur oiseau',
    'CHEVAL SUR OISEAU',
    'Cheval Sur Oiseau',
    'chèval sur oiseau',
    'cheval sur oiseau = pi',
    'cheval sur oiseau = π',
    'cheval sur oiseau égal pi',
    'cheval sur oiseau égale pi',
    'cheval sur oiseau est égal à pi',
    'cheval sur oiseau vaut pi',
    'cheval/oiseau',
    'cheval/oiseau = Pi',
    'CHEVAL / OISEAU = π',
    '  cheval   sur   oiseau  ',
  ]) assert.ok(estOeuf(s), `« ${s} » devrait ouvrir l’œuf`);

  // ★ Et ce qui n'est PAS la phrase ne l'ouvre pas. La liste n'est pas
  //   décorative : chacune de ces saisies est une vraie demande, qui doit
  //   partir en recherche comme n'importe quelle autre.
  for (const s of [
    '', 'cheval', 'oiseau', 'cheval oiseau', 'le cheval sur oiseau',
    'cheval sur un oiseau', 'cheval sur oiseau = 3', 'cheval sur poule',
    'cheval sur oiseau = 666', 'poney sur oiseau',
  ]) assert.ok(!estOeuf(s), `« ${s} » ne devrait RIEN déclencher`);
});

/* ═══════════════════════ 2. Le scénario, joué pour de vrai ═══════════════ */

/** La scène telle qu'elle est après les `n` premières étapes. */
function apres(scenario, n) {
  return compile({ ...scenario, steps: scenario.steps.slice(0, Math.max(1, n)) }).scene;
}

/** Les animations d'un canal, dans l'ordre du temps. */
function canal(c, id, prop) {
  return c.anims.filter((a) => a.id === id && a.prop === prop)
    .sort((a, b) => a.delay - b.delay);
}

/**
 * La ligne vivante, rang par rang, après les `n` premières étapes.
 *
 * ★ **DEUX JETONS NE PORTENT PAS LEUR TEXTE, et il faut les rendre visibles.**
 *   Une ESPACE est un vrai jeton — « n'oublie pas les espaces, leur absence
 *   nuit à la lisibilité » (l'auteur) —, et c'est ce qui permet à « bête à »
 *   d'être converti EN BLOC, l'espace comprise. Le TRAIT de fraction n'est pas
 *   un texte du tout : c'est un nœud de rôle `filet`, dont la longueur
 *   s'interpole (`primitives/rule.js`). Les rendre `␣` et `—` dit exactement ce
 *   que la scène porte, sans confondre une espace avec l'absence de jeton.
 */
function ligneApres(scenario, n) {
  const scene = apres(scenario, n);
  const rangs = new Map();
  for (const id of scene.flow) {
    const noeud = scene.get(id);
    const p = scene.pos(id);
    if (!noeud || !p) continue;
    const l = p.line ?? 0;
    if (!rangs.has(l)) rangs.set(l, []);
    let vu = noeud.text;
    if (noeud.role === 'filet') vu = '\u2014';
    else if (noeud.kind === 'space') vu = '\u2423';
    rangs.get(l).push(vu);
  }
  return [...rangs].sort((a, b) => a[0] - b[0]).map(([, v]) => v.join(' '));
}

test('★ œuf — il compile dans le moteur visuel réel, sans un avertissement', () => {
  const sc = scenarioDeLOeuf('cheval sur oiseau');
  const c = compile(sc);
  assert.deepEqual(c.warnings, [], 'un œuf n’a pas le droit d’être plus bâclé que le reste');
  assert.ok(c.total > 0, 'durée totale nulle');
  assert.equal(sc.steps.length, 5, 'cinq étapes, comme dictées');
  // ★ SOBRE, et ce n'est pas un détail de goût : l'orage et les cornes sont la
  //   scénographie du 666, et il n'y a pas de 666 ici. C'est aussi ce qui donne
  //   l'auto-lecture, l'autoplay ne restant qu'en sobre.
  assert.equal(sc.registre, 'sobre');
});

test('★ œuf — la fraction se pose sur trois rangs, et le verdict la repose', () => {
  const sc = scenarioDeLOeuf('cheval sur oiseau');

  // ★ La ligne de DÉPART : trois rangs, le trait au milieu. C'est ce qui a
  //   demandé que `Scene` transmette le `breakBefore` d'un jeton initial — il
  //   le laissait tomber, et la fraction s'écrasait sur une ligne — puis qu'un
  //   jeton initial puisse déclarer son RÔLE, le trait n'étant pas un texte.
  const debut = ligneApres(sc, 1);
  assert.equal(debut.length, 3, `trois rangs attendus, vu ${debut.length}`);
  assert.equal(debut[1], '—', 'le rang du milieu est le trait de division');

  // La chute : après la réduction, il ne reste que π — trait compris.
  assert.deepEqual(ligneApres(sc, 4), ['π']);

  // Et le verdict repose l'énoncé, l'égalité à hauteur du trait.
  const fin = ligneApres(sc, 5);
  assert.equal(fin.length, 3);
  // ⚠️ En BAS DE CASSE : le verdict repose les mots TELS QU'ILS ONT ÉTÉ TAPÉS,
  //    et la saisie de ce test est en minuscules.
  assert.equal(fin[0], 'c h e v a l');
  assert.equal(fin[2], 'o i s e a u');
  assert.equal(fin[1], '— ␣ = ␣ π', 'l’égalité se lit sur la ligne du trait, pas sous le dénominateur');
});

/**
 * ★ **LA SAISIE QUI POSE DÉJÀ L'ÉGALITÉ NE DEMANDE PAS LA MÊME FIN.**
 *
 * > « L'animation doit partir de la saisie utilisateur : s'il a saisi "cheval
 * >   sur oiseau = pi", la partie "= pi" doit apparaître tout du long ; pi sera
 * >   converti en symbole en même temps que les autres apparitions de symbole,
 * >   la conclusion est alors π = π. » (l'auteur)
 *
 * Celle qui pose l'égalité demande qu'on la VÉRIFIE — le membre de droite est
 * là du premier au dernier temps, et la fin est une confrontation. Celle qui
 * n'en pose pas demande qu'on la TROUVE, et la fin réécrit l'énoncé avec sa
 * réponse. Une chorégraphie unique aurait, dans un cas sur deux, répondu à une
 * question qu'on n'avait pas posée.
 */
test('★ œuf — « = pi » saisi reste à l’écran, et la conclusion est π = π', () => {
  const avec = scenarioDeLOeuf('cheval sur oiseau = pi');
  // Dès le départ, sur la ligne du TRAIT : c'est là qu'une égalité se lit.
  assert.equal(ligneApres(avec, 1)[1], '— ␣ = ␣ pi');
  // Le « pi » devient π en même temps que les autres symboles (étape 3).
  assert.equal(ligneApres(avec, 3)[1], '— ␣ = ␣ π');
  /* Le trait mort, sa coupure de ligne meurt avec lui : « = π » remonte sur le
     rang du π survivant, et l'on lit la confrontation d'un seul œil. */
  assert.deepEqual(ligneApres(avec, 4), ['π ␣ = ␣ π']);
  assert.deepEqual(ligneApres(avec, 5), ['π ␣ = ␣ π'], 'rien à reposer : tout est déjà écrit');

  // Sans égalité saisie, la même étape 4 ne laisse que le π.
  assert.deepEqual(ligneApres(scenarioDeLOeuf('cheval sur oiseau'), 4), ['π']);
});

/**
 * ★ **LA CASSE SAISIE SE DÉROULE JUSQU'AU BOUT.**
 *
 * > « L'easter egg devrait se déclencher quelle que soit la casse, mais se
 * >   dérouler en respectant la casse saisie […] ce qui implique de transformer
 * >   ailes en L ou l selon la casse de cheval » (l'auteur).
 *
 * Le dernier point est le moins évident, et c'est celui qui compte : les deux
 * `L` doivent S'ANNULER à l'avant-dernière étape. Celui du haut est le jeton
 * TAPÉ — on ne peut pas le changer ; c'est donc à celui que « ailes » devient
 * de s'aligner sur lui, sinon l'annulation cesse d'être évidente.
 */
test('★ œuf — il se déroule dans la casse saisie, les deux L compris', () => {
  // ⚠️ `ligneApres(sc, 1)` montre la ligne APRÈS la première étape, donc déjà
  //    permutée : « vachel ». C'est bien la casse tapée, dans l'ordre rangé.
  const bas = scenarioDeLOeuf('cheval sur oiseau');
  assert.equal(ligneApres(bas, 1)[0], 'v a c h e l');
  assert.equal(ligneApres(bas, 3)[0], 'β ␣ π l', 'le L du haut est celui qui a été tapé');
  assert.equal(ligneApres(bas, 3)[2], 'β ␣ l', 'celui de « ailes » s’aligne sur lui');
  assert.equal(ligneApres(bas, 5)[2], 'o i s e a u');

  const haut = scenarioDeLOeuf('CHEVAL SUR OISEAU');
  assert.equal(ligneApres(haut, 1)[0], 'V A C H E L');
  assert.equal(ligneApres(haut, 3)[0], 'β ␣ π L');
  assert.equal(ligneApres(haut, 3)[2], 'β ␣ L');

  // Casse mixte : chaque mot garde la sienne, et le L suit celui du numérateur.
  // ⚠️ SANS « = pi » : cette branche-là est celle qui repose l'énoncé au
  //    verdict, et c'est la casse de cet énoncé qu'on vérifie ici.
  const mixte = scenarioDeLOeuf('Cheval/Oiseau');
  assert.equal(ligneApres(mixte, 5)[0], 'C h e v a l');
  assert.equal(ligneApres(mixte, 5)[2], 'O i s e a u');
  assert.equal(ligneApres(mixte, 3)[2], 'β ␣ l');
});

/* ══════════ 3. Les trois défauts de la réduction, chacun gelé ici ═════════ */

/**
 * ★ **LA RATURE S'EN VA AVEC CE QU'ELLE BARRE.**
 *
 * > « Les barrés obliques ne s'effacent jamais ; ils devraient
 * >   disparaître/exploser en même temps que leur lettre. » (l'auteur)
 *
 * La rature est un décor ACCROCHÉ (`highlight.mode: 'raye'`, `data.suit`) :
 * elle suivait donc bien son β jusqu'à la collision, et restait ensuite seule à
 * l'écran — quatre traits rouges barrant le vide jusqu'au verdict.
 *
 * Le test ne se contente pas de vérifier qu'elle finit invisible : il exige la
 * SIMULTANÉITÉ, à la milliseconde et à la courbe près. « En même temps que leur
 * lettre » est une contrainte de temps, et une rature qui s'éteindrait une
 * demi-seconde trop tôt barrerait un β encore vivant.
 */
test('★ œuf — la rature explose à la milliseconde où sa lettre explose', () => {
  for (const saisie of ['cheval sur oiseau', 'cheval sur oiseau = pi']) {
    const c = compile(scenarioDeLOeuf(saisie));
    const ratures = c.nodes.filter((n) => n.data && typeof n.data.suit === 'string'
      && n.role === 'bracket' && n.id.startsWith('@rature:'));
    // Quatre lettres barrées : les deux β, puis les deux L.
    assert.equal(ratures.length, 4, `${saisie} : quatre ratures attendues`);
    for (const r of ratures) {
      const porteur = r.data.suit;
      const jeton = canal(c, porteur, 'opacity');
      const decor = canal(c, r.id, 'opacity');
      const mort = jeton[jeton.length - 1];
      const fin = decor[decor.length - 1];
      assert.ok(mort && mort.keyframes[mort.keyframes.length - 1].value === 0,
        `${porteur} devrait finir effacé`);
      assert.ok(fin, `la rature de ${porteur} ne s’efface jamais`);
      assert.equal(fin.keyframes[fin.keyframes.length - 1].value, 0,
        `la rature de ${porteur} reste à l’écran après lui`);
      assert.equal(fin.delay, mort.delay, `la rature de ${porteur} ne part pas au même instant`);
      assert.equal(fin.duration, mort.duration, `la rature de ${porteur} ne part pas au même rythme`);
    }
  }
});

/**
 * ★ **LE TRAIT DE FRACTION EXISTE, ET IL EST L'AXE.**
 *
 * > « La barre de fraction a disparu, et la part = Pi, quand présente, vient
 * >   trop à l'intérieur, là où devrait être la barre de fraction. » (l'auteur)
 *
 * Deux défauts d'un seul coup d'œil, et ils n'ont pas la même cause :
 *
 *  · **disparue, littéralement.** Le nœud de rôle `filet` naissait sans
 *    `stroke` — son encre venait d'une classe CSS, `.nhl-filet`, qui n'existe
 *    dans aucune feuille du dépôt. Un `<path>` sans `stroke` ne se peint pas.
 *    Et son tracé se déduisait de `node.w`, que `rule` écrit à sa valeur
 *    d'ARRIVÉE : au premier temps, la barre était donc dessinée à la largeur
 *    qu'elle aurait à la fin, c'est-à-dire zéro ;
 *  · **le `= π` trop à l'intérieur.** Il se pose à la droite du trait, donc sur
 *    SON rang ; ce rang devenait le plus large, son centrage le décalait, et le
 *    trait s'en allait de 84 unités vers la gauche pendant que le numérateur
 *    restait au milieu de la scène. Le numérateur DÉBORDAIT le trait par la
 *    droite, et l'égalité venait s'écrire sous sa queue.
 */
test('★ œuf — le trait se voit, et les trois rangs partagent son axe', () => {
  for (const saisie of ['cheval sur oiseau', 'cheval sur oiseau = pi']) {
    const c = compile(scenarioDeLOeuf(saisie));
    const trait = c.nodes.find((n) => n.id === 'barre');
    assert.ok(trait.base.stroke, `${saisie} : un trait sans encre ne se peint pas`);
    assert.ok(trait.data && /^M -\d/.test(trait.data.d),
      `${saisie} : le trait doit porter son tracé dès sa naissance, pas le déduire d’une largeur que « rule » déplace`);

    // ★ Après CHAQUE étape où la fraction est encore posée, les trois rangs se
    //   lisent sur un seul axe — c'est ce qui en fait une fraction.
    for (const n of [1, 2, 3]) {
      const s = apres(scenarioDeLOeuf(saisie), n);
      const t = s.pos('barre');
      const rangs = new Map();
      for (const id of s.flow) {
        const p = s.pos(id);
        if (!p || id === 'barre') continue;
        const b = rangs.get(p.line) || { g: Infinity, d: -Infinity };
        b.g = Math.min(b.g, p.x - p.w / 2);
        b.d = Math.max(b.d, p.x + p.w / 2);
        rangs.set(p.line, b);
      }
      for (const [ligne, b] of rangs) {
        if (ligne === t.line) {
          // Le rang du trait : ce qui l'accompagne se tient à sa DROITE, hors
          // de ce qu'il sépare. C'est très exactement le défaut relevé.
          assert.ok(b.g >= t.x + t.w / 2 - 0.01,
            `${saisie} étape ${n} : « = π » commence à ${b.g}, c’est-à-dire par-dessus le trait qui finit à ${t.x + t.w / 2}`);
          continue;
        }
        // Numérateur et dénominateur : centrés sur l'axe, et couverts par lui.
        assert.ok(Math.abs((b.g + b.d) / 2 - t.x) < 0.01,
          `${saisie} étape ${n} : le rang ${ligne} est centré sur ${(b.g + b.d) / 2}, le trait sur ${t.x}`);
        assert.ok(b.g >= t.x - t.w / 2 && b.d <= t.x + t.w / 2,
          `${saisie} étape ${n} : le rang ${ligne} déborde le trait`);
      }
    }
  }
});

/**
 * ★ **LE π REDESCEND EN UN SEUL MOUVEMENT.**
 *
 * > « Quand il ne reste plus que pi à la fin de la simplification, son retour
 * >   sur la ligne de base ne se fait pas correctement et arrive dans un second
 * >   temps avec CQFD. » (l'auteur)
 *
 * ⚠️ MESURÉ : il descendait DEUX fois. `rule` refermait la ligne AVANT de tuer
 *   le trait, donc la mise en page passait par un état à deux rangs dont celui
 *   du milieu était vide — le π s'arrêtait à mi-hauteur (y 162 → 201), puis le
 *   `move` finissait le travail une seconde plus tard (201 → 240).
 *
 * Le test compte les mouvements de l'étape ④ : il doit y en avoir UN, il doit
 * partir du rang du numérateur et arriver sur la ligne de base, et il doit
 * s'achever assez tôt pour qu'on ait le temps de le lire avant « C.Q.F.D. ».
 */
test('★ œuf — le π rejoint la ligne de base d’un seul geste, et avant la conclusion', () => {
  for (const saisie of ['cheval sur oiseau', 'cheval sur oiseau = pi']) {
    const c = compile(scenarioDeLOeuf(saisie));
    const debut = c.bounds[3];
    const fin = c.bounds[4];
    const descentes = canal(c, 'P1', 'translate').filter((a) => a.delay >= debut && a.delay < fin);
    assert.equal(descentes.length, 1,
      `${saisie} : ${descentes.length} mouvements pour une seule descente`);
    const [d] = descentes;
    const depart = d.keyframes[0].value;
    const arrivee = d.keyframes[d.keyframes.length - 1].value;
    // Le rang du numérateur d'une fraction à trois rangs, puis la ligne de base
    // — le milieu du viewBox, là où se pose une ligne unique.
    assert.equal(depart.y, 162, `${saisie} : la descente ne part pas du numérateur`);
    assert.equal(arrivee.y, 240, `${saisie} : la descente ne finit pas sur la ligne de base`);
    // ★ Et il reste un silence. « Arrive dans un second temps avec CQFD »
    //   décrivait aussi un enchaînement : la chute a besoin qu'on la voie posée.
    assert.ok(fin - (d.delay + d.duration) >= 700,
      `${saisie} : ${fin - (d.delay + d.duration)} ms seulement entre la descente et la conclusion`);
  }
});

/**
 * ★ **LE π OBTENU EST CELUI QUE L'ÉNONCÉ VIENT ENCADRER.**
 *
 * > « L'étape CQFD a un problème : elle fait disparaître Pi pour réafficher
 * >   cheval/oiseau = Pi. Il faudrait déplacer Pi vers la droite puis faire
 * >   apparaître cheval/oiseau = à sa gauche. » (l'auteur)
 *
 * Le verdict était un `substitute` : le π mourait, un autre renaissait au
 * milieu de l'énoncé. Deux π, dont le second n'avait rien démontré — alors que
 * ce lien est le seul que toute la démonstration ait construit. Ce test tient
 * les trois choses qui le disent : le jeton SURVIT, il n'est jamais effacé, et
 * il a fini de glisser avant que l'énoncé ne s'allume.
 */
test('★ œuf — au verdict, le π obtenu survit et l’énoncé vient à sa gauche', () => {
  const tl = compile(scenarioDeLOeuf('cheval sur oiseau'));
  const pi = tl.scene.get('P1');
  assert.ok(pi && pi.alive, 'le π obtenu doit être VIVANT au verdict, pas remplacé');
  assert.ok(!tl.anims.some((a) => a.id === 'P1' && a.prop === 'opacity' && a.keyframes.at(-1).value === 0),
    'le π obtenu ne doit jamais être effacé');

  // ★ L'ORDRE EST CE QUI SE LIT : il glisse, PUIS l'énoncé paraît.
  const glisse = tl.anims.filter((a) => a.id === 'P1' && a.prop === 'translate')
    .filter((a) => Math.abs(a.keyframes.at(-1).value.x - a.keyframes[0].value.x) > 1);
  const dernierGlissement = Math.max(...glisse.map((a) => a.delay));
  const allumage = Math.min(...tl.anims
    .filter((a) => a.id === 'v0' && a.prop === 'opacity').map((a) => a.delay));
  assert.ok(Number.isFinite(allumage), 'le « c » de l’énoncé doit s’allumer');
  assert.ok(allumage > dernierGlissement,
    `l’énoncé s’allume à ${allumage} ms, mais le π glisse encore à ${dernierGlissement} ms : `
    + 'la place doit être faite AVANT que ce qui l’occupe ne paraisse');
});

/**
 * ★ **LA CONVERSION DU « pi » DE DROITE SE VOIT.**
 *
 * > « Il manque l'animation pour la conversion du Pi à droite du = »
 * >   (l'auteur)
 *
 * Un `substitute` de un vers un fait un fondu croisé sur place : à trois
 * lettres d'un atelier qui déploie une accolade, il passe pour un changement de
 * rendu. Il est donc encadré de ce qui désigne — la lettre s'allume avant, le
 * symbole bat après.
 */
test('★ œuf — le « pi » de la saisie est désigné avant de devenir π, et bat après', () => {
  const tl = compile(scenarioDeLOeuf('cheval sur oiseau = pi'));
  const designe = tl.anims.filter((a) => a.id === 'pi' && a.prop === 'fill');
  assert.ok(designe.length, 'le « pi » saisi doit être DÉSIGNÉ avant sa conversion');
  const naissance = Math.min(...tl.anims.filter((a) => a.id === 'P2' && a.prop === 'opacity')
    .map((a) => a.delay));
  const bat = tl.anims.filter((a) => a.id === 'P2' && a.prop === 'scale');
  assert.ok(bat.length, 'le π obtenu doit BATTRE une fois écrit');
  assert.ok(Math.min(...designe.map((a) => a.delay)) < naissance,
    'la désignation précède la conversion');
  assert.ok(Math.max(...bat.map((a) => a.delay)) >= naissance,
    'le battement suit la conversion');
});

test('★ œuf — chaque étape porte son titre de registre', () => {
  const sc = scenarioDeLOeuf('cheval sur oiseau');
  for (const st of sc.steps) {
    assert.ok(typeof st.title === 'string' && st.title.trim(),
      `l’étape ${st.id} n’a pas de titre : le Registre ne saurait pas quoi dire`);
  }
});

test('★ œuf — l’approche de façade ne se classe pas', () => {
  const a = approcheDeLOeuf();
  // Ni code, ni série : l'œuf n'est pas une voie, et le classement ne doit
  // jamais pouvoir le comparer à une vraie.
  assert.equal(a.codes, '');
  assert.equal(a.series, 0);
  assert.ok(a.titre, 'il a tout de même un titre : le Registre en affiche un');
});
