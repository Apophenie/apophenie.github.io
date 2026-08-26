/** Le partage.
 *
 *  Constat technique, établi et assumé (design §5.2) : le fragment d'URL
 *  (`…#approche#b58`) n'est **jamais envoyé au serveur**. Aucun robot d'aperçu
 *  — Slack, Discord, Mastodon, WhatsApp, X — n'en voit la moindre trace. En
 *  hébergement statique sans build, une carte OpenGraph par démonstration est
 *  donc **impossible**. Le site porte une carte générique unique.
 *
 *  La personnalisation existe là où elle ne coûte rien : dans le texte copié.
 *  `navigator.share()` quand il est disponible, repli sur le presse-papier,
 *  repli du repli sur une sélection manuelle. */

import { e } from './dom.js';
import { guillemets } from './typo.js';
import { montrerInfobulle } from './infobulle.js';
import { t } from '../i18n/index.js';

/** Combien de temps l'accusé de copie reste à l'écran, fondu compris.
 *  « L'infobulle disparaît dès qu'on clique ailleurs, ou progressivement
 *  durant la 5ᵉ seconde après le clic sur partager » (l'auteur) : quatre
 *  secondes pleines, puis le fondu occupe la cinquième. */
const DUREE_ACCUSE = 5000;

/**
 * @param {{saisie:string, titreMethode?:string, resultat?:string, url:?string}} ctx
 * @returns {?string} null quand aucune URL canonique n'est disponible : on ne
 *          fabrique jamais un lien de partage approximatif.
 */
export function texteDePartage(ctx) {
  if (!ctx.url) return null;
  const lignes = [
    t('partage.texte', {
      saisie: guillemets(ctx.saisie),
      resultat: (ctx.resultat || '666').split('').join('·'),
    }),
  ];
  if (ctx.titreMethode) lignes.push(ctx.titreMethode + '.');
  lignes.push('→ ' + ctx.url);
  return lignes.join('\n');
}

async function copier(texte) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(texte); return true; } catch { /* repli */ }
  }
  const zone = e('textarea', { texte, style: { position: 'fixed', top: '-1000px', opacity: '0' } });
  document.body.appendChild(zone);
  zone.select();
  let bon = false;
  try { bon = document.execCommand('copy'); } catch { bon = false; }
  zone.remove();
  return bon;
}

/**
 * Bouton « Partager ». Si le lien canonique n'est pas disponible (moteur non
 * branché), le bouton est neutralisé et dit pourquoi — jamais de faux lien.
 */
export function boutonPartage(ctx) {
  const texte = texteDePartage(ctx);

  const bouton = e('button.bouton-secondaire', {
    type: 'button',
    'aria-disabled': texte ? 'false' : 'true',
    'aria-describedby': texte ? null : 'partage-indispo',
    texte: t('partage.partager'),
  });

  /* ★ L'ACCUSÉ EST UNE INFOBULLE, PLUS UNE LIGNE DE TEXTE.
     Le bouton a quitté le bas de page pour le haut, à droite du titre : une
     phrase qui apparaît à côté de lui y déplacerait le titre à chaque copie.
     La bulle flotte au-dessus de la mise en page et ne pousse rien.

     ★ La région live SURVIT, et séparément. Une bulle en `aria-hidden` est
     muette pour un lecteur d'écran — or c'est précisément la personne pour qui
     « le lien est copié » n'est pas devinable. Le message vocal est le texte
     court d'origine ; la bulle, elle, peut se permettre trois lignes. */
  const retour = e('span.visuellement-cachee', { role: 'status', 'aria-live': 'polite' });

  const dire = (cleVocale, cleBulle) => {
    retour.textContent = t(cleVocale);
    montrerInfobulle(bouton, t(cleBulle || cleVocale), { duree: DUREE_ACCUSE });
  };

  bouton.addEventListener('click', async () => {
    if (!texte) return;
    const url = ctx.url;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('global.titre'),
          text: texte.split('\n').slice(0, -1).join('\n'),
          url,
        });
        retour.textContent = t('partage.partage');
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;   // l'utilisateur a renoncé
      }
    }
    if (await copier(texte)) dire('partage.copie', 'partage.bulleCopie');
    else dire('partage.copieEchouee');
  });

  return e('span.partage', {}, [
    bouton,
    retour,
    texte ? null : e('span#partage-indispo.legende', { texte: t('partage.indisponible') }),
  ]);
}

/** Bouton « Copier » générique (mémo d'assemblage de la page de résultats). */
export function boutonCopier(libelle, fournirTexte) {
  const retour = e('span.copie-faite', { role: 'status', 'aria-live': 'polite' });
  const bouton = e('button.bouton-secondaire', { type: 'button', texte: libelle });
  bouton.addEventListener('click', async () => {
    const texte = fournirTexte();
    if (!texte) { retour.textContent = t('partage.rienACopier'); return; }
    retour.textContent = (await copier(texte))
      ? t('partage.copieCourte')
      : t('partage.copieCourteEchouee');
  });
  return e('span', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } },
    [bouton, retour]);
}
