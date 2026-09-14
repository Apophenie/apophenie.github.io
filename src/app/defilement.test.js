/** Défiler sans faire sauter la page — `node --test src/app/defilement.test.js`.
 *
 *  Sous Node il n'y a ni mise en page ni défilement : on les SIMULE. Une page de
 *  poche tient une hauteur de document, un défilement, et une pile de blocs —
 *  le bandeau, puis le corps de la liste —, et chaque `getBoundingClientRect`
 *  se calcule à partir d'eux, comme le ferait un navigateur. Ce qui se vérifie
 *  est donc la seule chose qui compte : **la position à l'écran du repère est
 *  la même avant et après le geste**, quand le défilement peut le permettre. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { sansSaut, effacerEnDouceur, DUREE_ADIEU_MS } from './defilement.js';

/** Une page de poche : des blocs empilés, un défilement borné à [0, max]. */
function pageDePoche({ scrollY = 0, hauteurBandeau = 180, margeBandeau = 24, hautDeLaPage = 240 } = {}) {
  const page = { scrollY, defilements: [] };
  const corps = { nom: 'corps' };
  const bandeau = {
    style: {},
    classes: new Set(),
    ecouteurs: {},
    retire: false,
    classList: { add: (c) => bandeau.classes.add(c) },
    addEventListener: (ev, f) => { bandeau.ecouteurs[ev] = f; },
    get parentNode() {
      return bandeau.retire ? null : { removeChild: () => { bandeau.retire = true; } };
    },
  };
  const hauteurOccupee = () => {
    if (bandeau.retire) return 0;
    if (bandeau.style.height === '0px') return 0;
    return hauteurBandeau + margeBandeau;
  };
  bandeau.getBoundingClientRect = () => {
    const top = hautDeLaPage - page.scrollY;
    return { top, bottom: top + hauteurBandeau, height: hauteurBandeau };
  };
  corps.getBoundingClientRect = () => ({ top: hautDeLaPage + hauteurOccupee() - page.scrollY });
  const fenetre = {
    scrollBy: ({ top, behavior }) => {
      page.defilements.push({ top, behavior });
      page.scrollY = Math.max(0, page.scrollY + top);   // pas de défilement négatif
    },
  };
  return { page, corps, bandeau, fenetre, repere: () => corps };
}

test('sansSaut — le repère garde sa place à l’écran quand ce qui est au-dessus rétrécit', () => {
  const { page, corps, bandeau, fenetre, repere } = pageDePoche({ scrollY: 1500 });
  const avant = corps.getBoundingClientRect().top;
  const delta = sansSaut(fenetre, repere, () => { bandeau.retire = true; });
  assert.equal(delta, -204);
  assert.equal(corps.getBoundingClientRect().top, avant, 'la liste a bougé à l’écran');
  assert.deepEqual(page.defilements, [{ top: -204, behavior: 'instant' }],
    'un défilement instantané : `html` est en scroll-behavior smooth');
});

test('effacerEnDouceur — sorti par le haut, le bandeau part d’un coup et rien ne bouge à l’écran', () => {
  const { page, corps, bandeau, fenetre, repere } = pageDePoche({ scrollY: 2000 });
  const avant = corps.getBoundingClientRect().top;
  const planifies = [];
  const mode = effacerEnDouceur(bandeau, { fenetre, repere, planifier: (f, ms) => planifies.push([f, ms]) });
  assert.equal(mode, 'hors-champ');
  assert.equal(bandeau.retire, true);
  assert.equal(planifies.length, 0, 'rien à attendre : il n’était pas à l’écran');
  assert.equal(corps.getBoundingClientRect().top, avant);
  assert.equal(page.scrollY, 2000 - 204);
});

test('effacerEnDouceur — à l’écran, il pâlit et se replie, puis part sans laisser de décalage', () => {
  const { page, corps, bandeau, fenetre, repere } = pageDePoche({ scrollY: 100 });
  const planifies = [];
  const mode = effacerEnDouceur(bandeau, { fenetre, repere, planifier: (f, ms) => planifies.push([f, ms]) });
  assert.equal(mode, 'en-douceur');
  assert.ok(bandeau.classes.has('bandeau--adieu'));
  assert.equal(bandeau.retire, false, 'il se replie d’abord, il ne disparaît pas d’un coup');
  assert.equal(bandeau.style.height, '0px');
  // Le repli fini (transitionend sur la hauteur), il quitte le DOM ; replié, il ne
  // tenait plus de place, donc rien ne bouge au retrait.
  const avantRetrait = corps.getBoundingClientRect().top;
  bandeau.ecouteurs.transitionend({ propertyName: 'opacity' });
  assert.equal(bandeau.retire, false, 'la fin du fondu n’est pas la fin du repli');
  bandeau.ecouteurs.transitionend({ propertyName: 'height' });
  assert.equal(bandeau.retire, true);
  assert.equal(corps.getBoundingClientRect().top, avantRetrait);
  assert.equal(page.defilements.length, 0);
  // Le filet, s'il se déclenche après coup, ne fait rien de plus.
  assert.equal(planifies[0][1], DUREE_ADIEU_MS);
  planifies[0][0]();
  assert.equal(page.defilements.length, 0);
});

test('effacerEnDouceur — sans transition (mouvement réduit), le filet retire le bandeau', () => {
  const { bandeau, fenetre, repere } = pageDePoche({ scrollY: 0 });
  const planifies = [];
  effacerEnDouceur(bandeau, { fenetre, repere, planifier: (f, ms) => planifies.push([f, ms]) });
  assert.equal(bandeau.retire, false);
  planifies[0][0]();
  assert.equal(bandeau.retire, true);
});

test('effacerEnDouceur — un bandeau déjà parti n’est pas retiré deux fois', () => {
  const { bandeau, fenetre, repere } = pageDePoche();
  bandeau.retire = true;
  assert.equal(effacerEnDouceur(bandeau, { fenetre, repere }), 'absent');
});
