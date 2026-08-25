/** Le routeur : `hashchange` → page.
 *
 *  Grammaire et lecture tolérante : `src/recherche/url.js` (CONTRACTS §4.2,
 *  §4.3). L'interface ne réimplémente rien — elle consomme `lire()` et `ecrire()`.
 *
 *  Règle produit : un lien ne renvoie JAMAIS silencieusement vers une autre
 *  démonstration. Soit il rejoue exactement, soit il l'annonce par un bandeau. */

import { e, qs, remplir } from './dom.js';
import { t, onLangue } from '../i18n/index.js';
import { titreApproche } from './libelles.js';
import * as pont from './pont.js';
import { pageAccueil, focaliserSaisie } from './pages/accueil.js';
import { pageResultat, enteteResultat } from './pages/resultat.js';
import { pageDemonstration, enteteDemonstration } from './pages/demonstration.js';

let vueCourante = null;      // { detruire() } de la page démonstration
let derniereClef = null;

function poserTitre(titre) {
  document.title = titre ? t('global.suffixeTitre', { titre }) : t('global.titreDefaut');
}

function demonter() {
  if (vueCourante && typeof vueCourante.detruire === 'function') vueCourante.detruire();
  vueCourante = null;
}

function rendre(entete, contenu, { titre, focaliser, vue = null } = {}) {
  demonter();                     // AVANT d'installer la nouvelle vue :
  vueCourante = vue;              // sinon on détruirait le lecteur qu'on vient de créer.
  remplir(qs('#entete'), entete ? [entete] : []);
  remplir(qs('#app'), [contenu]);
  poserTitre(titre);
  if (typeof focaliser === 'function') focaliser();
  else {
    const h1 = qs('#app h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  window.scrollTo(0, 0);
}

/* ────────────────────────────── les routes ─────────────────────────────── */

function routeAccueil({ saisieInitiale = '', bandeau = null } = {}) {
  const contenu = pageAccueil({ saisieInitiale });
  if (bandeau) {
    contenu.insertBefore(e('p.bandeau.bandeau--erreur', {}, [
      e('span.bandeau__marque', { texte: '△', 'aria-hidden': 'true' }),
      e('span', { texte: bandeau }),
    ]), contenu.firstChild);
  }
  rendre(null, contenu, {
    titre: null,
    focaliser: saisieInitiale ? () => focaliserSaisie(contenu) : undefined,
  });
}

function routeResultat(saisie, { bandeau = null } = {}) {
  const resultat = pont.resoudre(saisie);
  const contenu = pageResultat({
    saisie,
    resultat,
    surChoixSecours: (approche) => montrerDemonstrationLocale(saisie, approche, resultat),
  });
  if (bandeau) {
    contenu.insertBefore(e('p.bandeau.bandeau--erreur', {}, [
      e('span.bandeau__marque', { texte: '△', 'aria-hidden': 'true' }),
      e('span', { texte: bandeau }),
    ]), contenu.firstChild);
  }
  rendre(enteteResultat(), contenu, { titre: saisie });
}

/** Démonstration issue d'une URL canonique, rejouée telle quelle. */
function routeDemonstration(lecture, { bandeau = null } = {}) {
  const rejeu = pont.rejouer(lecture);
  if (!rejeu.ok) {
    const raison = rejeu.bandeau || t('bandeaux.voieInconnue');
    if (lecture.saisie) routeResultat(lecture.saisie, { bandeau: raison });
    else routeAccueil({ bandeau: raison });
    return;
  }
  const approche = rejeu.approche;
  // ★ Le REGISTRE de mise en scène vient du LIEN, et de nulle part ailleurs.
  //   Il traverse jusqu'au scénario (les cornes) et jusqu'au lecteur (l'orage
  //   et le son) — c'est `url.js` qui le résout, y compris pour un lien qui ne
  //   le porte pas.
  const registre = lecture.registre;
  const { scenario, source } = pont.scenarioDe(approche, lecture.saisie, { registre });
  const clef = { saisie: lecture.saisie, fragments: lecture.fragments, registre };
  const urlCanonique = pont.ecrireHash(clef);
  const urlResultats = pont.ecrireHash({ saisie: lecture.saisie });
  // L'autre mise en scène de la MÊME voie : le même programme, l'autre
  // marqueur. C'est ce lien que la page de démonstration propose en bas.
  const urlAutreRegistre = pont.ecrireHash({ ...clef, registre: pont.autreRegistre(registre) });

  // La barre d'adresse est toujours réécrite en forme canonique (§4.3) :
  // qui copie l'URL copie un lien permanent sans avoir à le savoir. Depuis le
  // registre, elle devient explicite dès l'ouverture d'un vieux lien.
  pont.canoniser(clef);

  const vue = pageDemonstration({
    saisie: lecture.saisie,
    approche,
    scenario,
    sourceScenario: source,
    registre,
    urlCanonique,
    urlResultats,
    urlAutreRegistre,
    bandeau,
    debug: new URLSearchParams(location.search).get('debug') === '1',
  });
  rendre(enteteDemonstration(urlResultats), vue.element, {
    titre: `${titreApproche(approche)} — ${lecture.saisie}`,
    focaliser: vue.monter,
    vue,
  });
}

/** Démonstration de secours : aucune URL n'est fabriquée, on ne touche pas au hash. */
function montrerDemonstrationLocale(saisie, approche, resultat) {
  // Aucun lien n'a ete lu : on montre ce que le site montre par defaut,
  // c'est-a-dire le registre par defaut (`url.js`).
  const registre = pont.REGISTRE_DEFAUT;
  const { scenario, source } = pont.scenarioDe(approche, saisie, { registre });
  const vue = pageDemonstration({
    saisie,
    approche,
    scenario,
    sourceScenario: source,
    registre,
    urlCanonique: null,
    urlResultats: resultat.urlResultats || null,
    // Un repli ne fabrique pas d'URL (`pont.js`) : pas de bascule non plus.
    urlAutreRegistre: null,
    bandeau: null,
    debug: false,
  });
  rendre(enteteDemonstration(resultat.urlResultats), vue.element, {
    titre: `${titreApproche(approche)} — ${saisie}`,
    focaliser: vue.monter,
    vue,
  });
}

/* ─────────────────────────────── l'aiguillage ──────────────────────────── */

export function router() {
  const hash = location.hash;
  if (pont.etat.url !== 'branché') {
    routeAccueil({
      bandeau: t('bandeaux.urlAbsente', { raison: pont.etat.raison || '' }).trim(),
    });
    return;
  }

  const lecture = pont.lireHash(hash);
  if (!lecture) { routeAccueil({ bandeau: t('bandeaux.lienIllisible') }); return; }

  switch (lecture.forme) {
    case 'resultats':
      if (!lecture.saisie) routeAccueil();
      else routeResultat(lecture.saisie);
      break;

    case 'canonique':
      routeDemonstration(lecture);
      break;

    case 'heritee': {
      // Rangs hérités du README : la recherche est relancée, on l'annonce.
      const resultat = pont.resoudre(lecture.saisie);
      const rang = lecture.rangs[0];
      const approche = (resultat.approches || []).find((a) => a.rang === rang);
      if (!approche) {
        routeResultat(lecture.saisie, {
          bandeau: t('bandeaux.rangAbsent', { rang }),
        });
        break;
      }
      if (approche.url) { location.replace(location.pathname + approche.url); break; }
      montrerDemonstrationLocale(lecture.saisie, approche, resultat);
      break;
    }

    default: {
      const message = lecture.bandeau || t('bandeaux.incantation');
      if (lecture.saisie) routeResultat(lecture.saisie, { bandeau: message });
      else routeAccueil({ bandeau: message });
    }
  }
}

export function demarrer() {
  // Changer de langue reconstruit la page entière : les titres d'étape, les
  // libellés d'opérateurs et jusqu'au scénario du lecteur en dépendent. C'est le
  // seul point d'entrée — aucune vue ne se retraduit toute seule.
  onLangue(() => router());

  const surChangement = () => {
    if (location.hash === derniereClef) return;
    derniereClef = location.hash;
    router();
  };
  window.addEventListener('hashchange', surChangement);
  derniereClef = location.hash;
  router();
}
