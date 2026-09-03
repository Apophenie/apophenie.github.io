/**
 * ★ **L'IDENTITÉ PUBLIÉE DU SITE — le seul fichier à retoucher pour un fork.**
 *
 * « og:image → https://apophenie.github.io/ mais via fichier de config qui
 * indique la base canonique, pour que ce soit facile à changer si quelqu'un
 * veut forker plus tard » (l'auteur).
 *
 * Trois choses tirent d'ici la même chaîne, et c'est tout l'intérêt : l'image
 * de partage (`og:image` doit être une URL ABSOLUE — un robot d'aperçu ne
 * résout pas toujours un chemin relatif), l'adresse canonique du document, et
 * le plan du site. Les écrire trois fois, c'est se donner trois occasions de
 * publier une carte qui pointe chez quelqu'un d'autre.
 *
 * ★ **IL VIT À LA RACINE, pas dans `src/`**, pour la raison qui y garde déjà
 *   `favicon.svg` : ce n'est pas une source, c'est une pièce d'identité. Un
 *   forkeur qui clone ce dépôt doit trouver ce qu'il a à changer sans lire une
 *   ligne du site — c'est ce fichier, et rien d'autre.
 *
 * ⚠️ Rien de tout cela n'entre dans le bundle : `vite.config.js` seul le lit, au
 *   build. Le site à l'exécution ignore où il est publié, et c'est très bien —
 *   il fonctionne aussi bien en `file://`, sur un miroir ou derrière un nom de
 *   domaine à soi.
 */

/**
 * La base canonique, barre oblique finale COMPRISE.
 *
 * ⚠️ La barre finale n'est pas cosmétique : tout le reste s'y concatène. Sans
 *   elle, `sitemap.xml` deviendrait `…github.iositemap.xml`.
 */
export const BASE_CANONIQUE = 'https://apophenie.github.io/';

/**
 * ★ **LA SAISIE QUE LE PLAN DU SITE MET EN VITRINE.**
 *
 * Le site n'a qu'UNE page : tout le reste vit dans le fragment (`#…`), qui
 * n'est jamais envoyé au serveur. Le plan pointe donc l'accueil, plus une
 * démonstration — celle-ci — pour qu'un visiteur qui arrive par un moteur de
 * recherche tombe sur quelque chose qui se regarde, et pas sur un formulaire
 * vide.
 *
 * ⚠️ **LE LIEN N'EST PAS ÉCRIT ICI, IL EST CALCULÉ AU BUILD** : c'est le moteur
 *   qui dit quelle est la première voie, et le plan recopie sa réponse. Un lien
 *   figé serait périmé au premier changement de barème, et personne ne le
 *   verrait — un plan de site n'est relu par aucun humain.
 */
export const SAISIE_EN_VITRINE = 'Capitalisme';

/**
 * Ce que les robots n'ont rien à faire d'explorer : les pages d'atelier. Elles
 * ne sont référencées nulle part, mais un lien partagé par mégarde suffit à les
 * faire découvrir, et elles n'ont aucun sens pour un visiteur.
 */
export const HORS_PLAN = Object.freeze([
  '/debug.html',
  '/AB-testing.html',
  '/glyphes.html',
]);
