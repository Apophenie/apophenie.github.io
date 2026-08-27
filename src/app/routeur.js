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

function routeResultat(saisie, { bandeau = null, cible = null } = {}) {
  const resultat = pont.resoudre(saisie, cible);
  const contenu = pageResultat({
    saisie,
    resultat,
    // La CIBLE affichée est celle que le moteur a réellement visée, pas celle
    // qu'on lui a demandée : c'est lui qui a le dernier mot (une cible
    // illisible retombe sur 666, `cible.js › normaliserCible`).
    cible: resultat.cible || cible,
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
    if (lecture.saisie) routeResultat(lecture.saisie, { bandeau: raison, cible: lecture.cible });
    else routeAccueil({ bandeau: raison });
    return;
  }
  const approche = rejeu.approche;
  // ★ Le REGISTRE de mise en scène vient du LIEN, et de nulle part ailleurs.
  //   Il traverse jusqu'au scénario (les cornes) et jusqu'au lecteur (l'orage
  //   et le son) — c'est `url.js` qui le résout, y compris pour un lien qui ne
  //   le porte pas.
  //   ★ Et il est déjà REPLIÉ : `url.js` rend le registre qu'on saura JOUER,
  //   pas celui qui était écrit — une cible sans emblème n'a pas de version
  //   scénique, et un lien qui en demande une retombe en sobre.
  const registre = lecture.registre;
  const cible = lecture.cible;
  const { scenario, source } = pont.scenarioDe(approche, lecture.saisie, { registre, cible });
  const clef = { saisie: lecture.saisie, fragments: lecture.fragments, registre, cible };
  const urlCanonique = pont.ecrireHash(clef);
  // L'autre mise en scène de la MÊME voie : le même programme, l'autre
  // marqueur. C'est ce lien que la page de démonstration propose en bas — et il
  // n'existe pas quand la cible n'offre qu'un seul registre.
  const autre = pont.autreRegistre(registre, cible);
  const urlAutreRegistre = autre ? pont.ecrireHash({ ...clef, registre: autre }) : null;

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
    urlAutreRegistre,
    bandeau,
    debug: new URLSearchParams(location.search).get('debug') === '1',
  });
  rendre(enteteDemonstration(), vue.element, {
    titre: `${titreApproche(approche)} — ${lecture.saisie}`,
    focaliser: vue.monter,
    vue,
  });
}

/**
 * ★ CHERCHER, PUIS MONTRER — le geste de « Révéler », déclenché par un lien.
 *
 * `#Donald Trump` et `#c111!sce!#Donald Trump` ne nomment aucune voie : ils
 * nomment une SAISIE et, éventuellement, des réglages. On cherche donc, et on
 * ouvre la première voie du classement — c'est mot pour mot ce que fait le
 * bouton de l'accueil (`pages/accueil.js › urlPremiereVoie`), et c'est ce que
 * l'auteur demande : « recherche et affiche l'animation du premier résultat ».
 *
 * On ne rend PAS la démonstration ici, on va à son URL : la voie trouvée porte
 * son propre lien canonique, et y aller d'un `replace()` fait trois choses
 * d'un coup — la barre d'adresse devient partageable, un rechargement rejoue
 * sans rechercher, et le retour arrière ne repasse pas par une recherche. Même
 * conduite que la forme héritée juste en dessous, pour la même raison.
 */
function routePremiereVoie(lecture) {
  const resultat = pont.resoudre(lecture.saisie, lecture.cible);
  const premiere = (resultat.approches || [])[0];
  // Aucune voie : la page de résultats sait le dire (réponse dédiée, saisie
  // vide, cible hors de portée). Pas de bandeau — il n'y a pas d'échec à
  // annoncer, juste une liste qui se trouve être vide.
  if (!premiere) { routeResultat(lecture.saisie, { cible: lecture.cible }); return; }
  const direct = lecture.registre === 'scenique' ? premiere.urlScenique : premiere.urlSobre;
  if (direct) { location.replace(location.pathname + location.search + direct); return; }
  // Moteur en repli : il ne fabrique jamais d'URL. On montre sur place.
  montrerDemonstrationLocale(lecture.saisie, premiere, resultat);
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
    // Un repli ne fabrique pas d'URL (`pont.js`) : pas de bascule non plus.
    urlAutreRegistre: null,
    bandeau: null,
    debug: false,
  });
  rendre(enteteDemonstration(), vue.element, {
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

  // ★ UN FRAGMENT QUI DÉSIGNE UN ÉLÉMENT DE LA PAGE EST UNE ANCRE, PAS UNE
  //   SAISIE. C'est le sens que HTML donne au fragment depuis toujours, et le
  //   site s'en sert : le lien d'évitement « Aller au Registre » de la page de
  //   démonstration pointe sur `#registre-titre`. Tant qu'un `#` unique était
  //   un lien mort, l'ancre menait à l'accueil avec un bandeau d'erreur — un
  //   défaut qui ne se voyait qu'au clavier. Depuis que `#texte` vaut une
  //   recherche, elle mènerait à une démonstration sur « registre-titre », ce
  //   qui est pire : plausible, donc silencieux. On ne fait donc rien, et le
  //   navigateur fait ce qu'il a toujours fait — il défile jusqu'à l'élément.
  //
  //   ⚠️ Le test porte sur la page COURANTE : au chargement, rien n'est encore
  //   monté, et un `#registre-titre` collé dans une barre d'adresse vierge
  //   redevient une saisie. C'est le prix d'un test qui ne suppose l'existence
  //   d'aucune liste d'ancres, et il se paie une fois sur mille.
  if (hash.length > 1 && document.getElementById(hash.slice(1))) return;

  const lecture = pont.lireHash(hash);
  if (!lecture) { routeAccueil({ bandeau: t('bandeaux.lienIllisible') }); return; }

  switch (lecture.forme) {
    case 'resultats':
      if (!lecture.saisie) routeAccueil();
      else routeResultat(lecture.saisie, { cible: lecture.cible });
      break;

    case 'canonique':
      routeDemonstration(lecture);
      break;

    // Un lien qui nomme une saisie sans nommer de voie : on cherche, et on
    // ouvre la première. Voir `routePremiereVoie` et `recherche/url.js`.
    case 'premiere':
      routePremiereVoie(lecture);
      break;

    case 'heritee': {
      // Rangs hérités du README : la recherche est relancée, on l'annonce.
      const resultat = pont.resoudre(lecture.saisie, lecture.cible);
      const rang = lecture.rangs[0];
      const approche = (resultat.approches || []).find((a) => a.rang === rang);
      if (!approche) {
        routeResultat(lecture.saisie, {
          bandeau: t('bandeaux.rangAbsent', { rang }), cible: lecture.cible,
        });
        break;
      }
      if (approche.url) { location.replace(location.pathname + approche.url); break; }
      montrerDemonstrationLocale(lecture.saisie, approche, resultat);
      break;
    }

    default: {
      const message = lecture.bandeau || t('bandeaux.incantation');
      if (lecture.saisie) routeResultat(lecture.saisie, { bandeau: message, cible: lecture.cible });
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
