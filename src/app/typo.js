/** Typographie — et elle n'est PAS la même dans les deux langues.
 *
 *  C'est le piège classique de l'internationalisation d'un site français : on
 *  extrait les chaînes, on traduit, et on laisse la mécanique typographique
 *  française s'appliquer à l'anglais. Résultat : « Result : 666 », qui hurle la
 *  traduction automatique.
 *
 *    · FRANÇAIS (CONTRACTS §6) — guillemets « », espace fine insécable (U+202F)
 *      à l'intérieur des guillemets et devant `! ? ; :`, majuscules accentuées.
 *    · ANGLAIS — guillemets droits doubles "…", et **aucune** espace devant la
 *      ponctuation haute. La ponctuation colle au mot.
 *
 *  Le texte statique est déjà écrit correctement dans `src/i18n/fr.js` et
 *  `src/i18n/en.js` (un test le vérifie). Ces fonctions servent à composer du
 *  texte qui contient de la **saisie utilisateur** ou une valeur calculée. */

import { langue, t, v } from '../i18n/index.js';

export const FINE = '\u202f';   // espace fine insécable
export const INSEC = '\u00a0';  // espace insécable

/** Guillemets de la langue courante autour d'un texte quelconque. */
export function guillemets(texte, code = langue()) {
  const s = String(texte);
  return code === 'fr' ? `«${FINE}${s}${FINE}»` : `"${s}"`;
}

/**
 * Normalise l'espacement devant la ponctuation haute selon la langue.
 * En français on POSE une fine insécable ; en anglais on la RETIRE.
 * Les `://` d'une URL ne sont pas une ponctuation haute et sont épargnés.
 */
export function ponctuer(texte, code = langue()) {
  const s = String(texte);
  if (code === 'fr') {
    return s
      .replace(/\s*([!?;])/g, FINE + '$1')
      .replace(/\s*:(?!\/\/)/g, FINE + ':');
  }
  return s
    .replace(/\s+([!?;])/g, '$1')
    .replace(/\s+:(?!\/\/)/g, ':');
}

/** Accord singulier / pluriel sans dépendance à `Intl` (déterminisme, §4.4). */
export const pluriel = (n, singulier, plurielForme) => (n > 1 ? plurielForme : singulier);

/** Le nombre en toutes lettres, dans la langue courante ; au-delà de la table,
 *  le chiffre. Les tables vivent dans les dictionnaires (`nombres.lettres`). */
export function enLettres(n) {
  const table = v('nombres.lettres');
  return (Array.isArray(table) && n >= 0 && n < table.length) ? table[n] : String(n);
}

/** Première lettre en capitale, accents compris (`é` → `É`). `toUpperCase` et
 *  non `toLocaleUpperCase` : aucune dépendance à la locale hôte (§4.4 règle 4). */
export const capitaliser = (s) =>
  (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');

/** « Sept approches mènent à 666. » / “Seven approaches lead to 666.” */
export function phraseApproches(n) {
  if (n === 0) return t('resultat.annonceAucune');
  if (n === 1) return t('resultat.annonceUne');
  return t('resultat.annoncePlusieurs', { n: capitaliser(enLettres(n)) });
}

/** Tronque proprement une saisie pour un titre, sans couper un mot en deux. */
export function abreger(texte, max = 72) {
  const s = String(texte);
  if (s.length <= max) return s;
  const coupe = s.slice(0, max - 1);
  const espace = coupe.lastIndexOf(' ');
  return (espace > max * 0.6 ? coupe.slice(0, espace) : coupe) + '…';
}

/**
 * Numéro de transformation : `03/07`. Notation machine, sans langue.
 *
 * ★ Le préfixe `T-` a sauté : « "T-" est obscur, contente-toi de
 * "{step}/{total}" » (l'auteur). Il ne voulait rien dire — ni « transformation »
 * pour qui n'a pas lu le code, ni un compte à rebours, ce à quoi il ressemblait
 * le plus. Deux nombres séparés d'une barre se lisent sans glossaire.
 *
 * Les zéros de tête restent : ils tiennent la largeur du cartouche constante,
 * si bien qu'il ne sautille pas d'un chiffre à l'autre au fil de la lecture.
 */
export const badgeT = (i, total) =>
  `${String(i + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
