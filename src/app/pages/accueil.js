/** Page d'accueil. */

import { e, qs, remplir } from '../dom.js';
import { logoTitre } from '../logo.js';
import { t, v } from '../../i18n/index.js';
import { montrerInfobulle } from '../infobulle.js';
import * as pont from '../pont.js';
import { interrupteurs } from '../entete.js';
import { creerJaugeRecherche } from '../jauge-recherche.js';

const SEUIL_COMPTEUR = 200;

export function pageAccueil({ saisieInitiale = '' } = {}) {
  const plafond = pont.LIMITE_SAISIE();

  const champ = e('input#saisie.champ', {
    type: 'text',
    name: 'saisie',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    maxlength: String(plafond),
    placeholder: t('accueil.placeholder'),
    value: saisieInitiale,
  });

  const compteur = e('span#compteur-saisie.compteur', { hidden: true, 'aria-hidden': 'true' });
  const erreur = e('p#erreur-saisie.message-erreur', { role: 'alert' });

  const bouton = e('button.bouton-primaire', { type: 'submit', texte: t('accueil.reveler') });

  /* ★ LE LIEN VERS LES VOIES — discret, à la place de la ligne d'aide.
     « La page de liste des voies devrait être accessible à la place de
     "Jusqu'à 500 signes. Tout est calculé dans votre navigateur." Avec le
     libellé "Énumérer les voies occultes", pas plus gros ni plus petit, tel un
     lien "mot de passe oublié". J'imagine plutôt aligné à droite »
     (l'auteur).

     Il n'a pas de `href` : la liste dépend de ce qui est DANS le champ, et le
     champ change. Un lien mort tant que le champ est vide serait pire qu'un
     bouton — celui-ci refuse comme le fait « Révéler », en le disant. */
  const voies = e('button.lien-discret', {
    type: 'button',
    texte: t('accueil.voies'),
    sur: { click: () => aller((saisie) => pont.ecrireHash({ saisie })) },
  });

  /* ★ LA PLACE DE LA JAUGE — sous le bouton, et vide tant qu'on ne cherche pas.
     Elle ne préexiste pas à la recherche : une barre à zéro pour cent posée en
     permanence sous un formulaire annoncerait une attente là où il n'y en a
     aucune. Le conteneur, lui, est là depuis le début pour que l'apparition ne
     décale rien de ce qui l'entoure. */
  const zoneJauge = e('div.champ-progression');

  const formulaire = e('form.champ-groupe', { novalidate: true }, [
    e('label', { for: 'saisie', texte: t('accueil.label') }),
    e('div.champ-boite', {}, [champ, compteur]),
    bouton,
    zoneJauge,
    e('div.champ-appoint', {}, [voies]),
    erreur,
  ]);

  function majCompteur() {
    const n = champ.value.length;
    if (n < SEUIL_COMPTEUR) { compteur.hidden = true; return; }
    compteur.hidden = false;
    compteur.textContent = `${n}/${plafond}`;
    const auPlafond = n >= plafond;
    compteur.classList.toggle('compteur--limite', auPlafond);
    /* ★ LE PLAFOND NE SE DIT QU'AU MOMENT OÙ IL SE HEURTE.
       « La limite est à afficher en infobulle si on la dépasse dans le champ,
       pas à mettre par défaut en encombrant pour rien l'UI » (l'auteur). Le
       navigateur tronque en silence à `maxlength` : sans ce mot, quelqu'un qui
       colle un texte long voit disparaître la fin sans savoir pourquoi. C'est
       le seul instant où la limite est une information. */
    if (auPlafond && !plafondDit) {
      plafondDit = true;
      montrerInfobulle(champ, t('accueil.plafondAtteint', { plafond }), { duree: 5000 });
    }
    if (!auPlafond) plafondDit = false;
  }
  let plafondDit = false;
  champ.addEventListener('input', () => {
    majCompteur();
    if (erreur.textContent) {
      erreur.textContent = '';
      champ.removeAttribute('aria-invalid');
    }
  });
  majCompteur();

  /** Le refus commun aux deux commandes. Le bouton n'est jamais désactivé :
   *  une impasse silencieuse est pire qu'un refus qui se dit. */
  function refuserLeVide() {
    erreur.textContent = t('accueil.erreurVide');
    champ.setAttribute('aria-invalid', 'true');
    champ.setAttribute('aria-describedby', 'erreur-saisie');
    champ.focus();
  }

  /**
   * Le trajet de la commande qui ne CHERCHE pas : « Énumérer les voies » ne
   * fait qu'écrire un lien, et part aussitôt. La recherche, elle, a son propre
   * trajet plus bas, parce qu'elle a quelque chose à montrer en attendant.
   *
   * @param {Function} destination  reçoit la saisie, rend le hash où aller.
   */
  function aller(destination) {
    const saisie = champ.value.trim();
    if (!saisie) { refuserLeVide(); return; }
    const hash = destination(saisie);
    if (!hash) {
      erreur.textContent = t('accueil.erreurUrl');
      return;
    }
    bouton.setAttribute('aria-busy', 'true');
    bouton.textContent = t('accueil.consultation');
    location.hash = hash;
  }

  /**
   * ★ « RÉVÉLER » MÈNE DROIT À LA MÉTHODE 1 — plus à la liste.
   *
   * « Révéler devrait pointer directement vers la page d'animation de la
   * méthode 1 pour la saisie fournie » (l'auteur). Le geste attendu après avoir
   * tapé un mot est de VOIR la démonstration, pas de choisir entre plusieurs
   * façons de la voir ; la liste reste à un clic, sous le champ.
   *
   * Il faut donc chercher ici. Ce n'est pas un travail en plus : c'est le même
   * calcul que faisait la page de résultats une navigation plus loin, avancé
   * d'un cran. On prend la première approche — celle que le classement met en
   * tête — dans sa mise en scène par défaut.
   *
   * ★ ET ON RESTE SUR PLACE PENDANT QU'IL SE FAIT. C'est la seule des quatre
   *   recherches du site qui ne change pas de page pour chercher : le visiteur
   *   vient d'écrire, son champ est encore sous ses yeux, et l'emmener sur une
   *   page d'attente pour le ramener aussitôt serait un aller-retour gratuit.
   *   La jauge s'installe donc sous le bouton, à l'endroit exact où le regard
   *   se trouve déjà.
   *
   * ★ On retombe sur la LISTE dès que le lien direct manque : moteur en repli
   * (qui ne fabrique jamais d'URL), recherche en échec, ou approche sans URL.
   * Mieux vaut une liste que rien, et c'est exactement ce que la page de
   * résultats saura dire elle-même.
   */
  async function revelerPremiereVoie() {
    const saisie = champ.value.trim();
    if (!saisie) { refuserLeVide(); return; }

    bouton.setAttribute('aria-busy', 'true');
    bouton.textContent = t('accueil.consultation');
    const jauge = creerJaugeRecherche();
    remplir(zoneJauge, [jauge.element]);

    const resultat = await pont.resoudreEnFond(saisie, null, { surAvancement: jauge.avancer });
    // `null` : une recherche plus récente est partie (deux clics, deux Entrées).
    // C'est elle qui mènera quelque part ; celle-ci se retire sans rien toucher.
    if (resultat === null) return;
    jauge.achever();

    const premiere = (resultat.approches || [])[0];
    const direct = premiere
      && (pont.REGISTRE_DEFAUT === 'sobre' ? premiere.urlSobre : premiere.urlScenique);
    const hash = direct || pont.ecrireHash({ saisie });
    if (!hash) {
      // Le seul cas où l'on revient en arrière : sans grammaire d'URL, il n'y a
      // nulle part où aller. On rend son bouton au visiteur plutôt que de le
      // laisser devant une jauge terminée qui ne mène à rien.
      remplir(zoneJauge, []);
      bouton.removeAttribute('aria-busy');
      bouton.textContent = t('accueil.reveler');
      erreur.textContent = t('accueil.erreurUrl');
      return;
    }
    location.hash = hash;
  }

  formulaire.addEventListener('submit', (ev) => {
    ev.preventDefault();
    revelerPremiereVoie();
  });

  // ★ Deux sortes de puces, et le visiteur doit pouvoir les distinguer AVANT
  // de cliquer. La plupart recopient leur texte dans le champ — on reste sur
  // l'accueil, on peut encore modifier la saisie. Une puce à `hash`, elle,
  // EMMÈNE : elle ouvre une démonstration précise, choisie pour sa beauté
  // plutôt que trouvée par le moteur. Deux gestes différents sous la même
  // apparence tromperaient ; elle le dit donc en toutes lettres, dans son
  // `aria-label` et son `title`, et se marque d'une classe à part.
  const puce = (x) => {
    const texte = typeof x === 'string' ? x : x.texte;
    const raccourci = typeof x === 'string' ? null : x.hash;
    return e(raccourci ? 'button.puce.puce--voie' : 'button.puce', {
      type: 'button',
      texte,
      'aria-label': raccourci ? (x.aide || texte) : null,
      title: raccourci ? (x.aide || texte) : null,
      sur: {
        click: () => {
          if (raccourci) { location.hash = raccourci; return; }
          champ.value = texte;
          majCompteur();
          champ.focus();
        },
      },
    });
  };

  const exemples = e('div.exemples', {}, [
    e('p.exemples__titre', { texte: t('accueil.exemplesTitre') }),
    e('div.exemples__liste', {}, (v('accueil.exemples') || []).map(puce)),
  ]);

  return e('div.accueil', {}, [
    e('div.accueil__reglages', {}, [interrupteurs()]),
    logoTitre() || e('h1', { texte: t('global.titre') }),
    e('p.accueil__baseline', { texte: t('accueil.baseline') }),
    e('div.accueil__filet', { role: 'presentation' }),
    formulaire,
    exemples,
    // ★ LES MENTIONS ONT DISPARU. « C'est vrai, mais si l'internaute ne s'en
    // rend pas compte, c'est le README du projet qui le lui dira, pas la page
    // d'accueil » (l'auteur). Elles disaient deux choses justes — tout est
    // calculé dans le navigateur, ceci est une parodie — mais les dire ICI
    // revenait à se justifier avant d'avoir montré quoi que ce soit. Les clés
    // restent dans les deux langues : rien ne les lit, mais les retirer ferait
    // diverger les catalogues, que `i18n.test.js` compare.
  ]);
}

/** Le champ reçoit le focus quand on arrive depuis une page interne. */
export function focaliserSaisie(racine) {
  const champ = qs('#saisie', racine);
  if (champ) champ.focus({ preventScroll: true });
}
