/** Réglages persistés : thème, niveau d'animation, rythme des répétitions.
 *
 *  THÈME — **trois** états, pas une bascule binaire :
 *    · `clair`  — parchemin, imposé ;
 *    · `auto`   — suit `prefers-color-scheme`, et continue de le suivre ;
 *    · `sombre` — nuit d'encre, imposé (défaut du site, CONTRACTS §0.4).
 *  `auto` n'est pas « l'absence de choix » du point de vue de l'utilisateur,
 *  c'est un choix à part entière — mais il se stocke en effaçant la clé, ce qui
 *  garde le contrat du script inline d'`index.html` inchangé : il ne connaît que
 *  `clair` et `sombre`, et l'absence de valeur signifie déjà « suivre le système ».
 *
 *  Le thème système est écouté en direct : en mode `auto`, une bascule de l'OS
 *  doit repeindre l'interrupteur ET faire reconstruire l'animation en cours
 *  (le moteur visuel résout les couleurs à la compilation — voir
 *  `pages/demonstration.js`).
 *
 *  ANIMATION — initialisée sur `prefers-reduced-motion` mais surchargeable dans
 *  les deux sens (design §4.6).
 *
 *  SON — l'orage sonore du registre scénique. **Coupé par défaut**, et ce
 *  défaut est un choix argumenté, pas une commodité : la démonstration
 *  s'autojoue (CONTRACTS §3.4), donc un lien partagé lâcherait un drone
 *  infernal à l'ouverture ; et les navigateurs bloquant le son avant tout
 *  geste, un « activé par défaut » ne partirait qu'au hasard de ce que le
 *  visiteur a cliqué avant. Le raisonnement complet est dans `src/app/sons.js`.
 *  Comme le thème et la langue, le réglage SURVIT à la navigation : qui veut
 *  du son le demande une fois.
 *
 *  RÉPÉTITIONS — les démonstrations refont le même geste sur chaque fragment.
 *  La première fois enseigne, les suivantes confirment : par défaut les redites
 *  passent en accéléré. C'est une préférence de LECTURE, elle se règle donc
 *  dans les contrôles d'avancement et se persiste ici, comme le thème et la
 *  langue. Défaut : accéléré — c'est l'expérience qu'on veut par défaut, et le
 *  réglage sert à la refuser. */

const CLE_THEME = 'nhlg.theme';
const CLE_ANIM = 'nhlg.animation';
const CLE_LOGO = 'nhlg.logo-vu';
const CLE_REPET = 'nhlg.repetitions';
const CLE_SON = 'nhlg.son';

/** Les trois thèmes, dans l'ordre d'affichage du sélecteur : clair · auto · sombre. */
export const THEMES = ['clair', 'auto', 'sombre'];

const magasin = {
  lire(cle) { try { return localStorage.getItem(cle); } catch { return null; } },
  ecrire(cle, v) { try { localStorage.setItem(cle, v); } catch { /* mode privé */ } },
  effacer(cle) { try { localStorage.removeItem(cle); } catch { /* mode privé */ } },
};

const auditeurs = new Set();
const prevenir = () => { for (const f of Array.from(auditeurs)) f(); };
export const onReglages = (f) => { auditeurs.add(f); return () => auditeurs.delete(f); };

/* ─────────────────────────────── Thème ─────────────────────────────── */

const requeteClair = typeof matchMedia === 'function'
  ? matchMedia('(prefers-color-scheme: light)')
  : null;

export function themeSysteme() {
  return requeteClair && requeteClair.matches ? 'clair' : 'sombre';
}

/** La **préférence** de l'utilisateur : `'clair' | 'auto' | 'sombre'`. */
export function themePrefere() {
  const v = magasin.lire(CLE_THEME);
  return v === 'clair' || v === 'sombre' ? v : 'auto';
}

/** `'clair' | 'sombre'` — ce qui est réellement à l'écran. */
export const themeEffectif = () =>
  (themePrefere() === 'auto' ? themeSysteme() : themePrefere());

export function appliquerTheme() {
  const choix = themePrefere();
  if (choix === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', choix);
}

/** Pose la préférence de thème. `'auto'` efface la clé — c'est ce que le script
 *  inline d'`index.html` interprète déjà comme « suivre le système ». */
export function definirTheme(prefere) {
  if (!THEMES.includes(prefere)) return;
  if (prefere === 'auto') magasin.effacer(CLE_THEME);
  else magasin.ecrire(CLE_THEME, prefere);
  appliquerTheme();
  prevenir();
}

/* En mode `auto`, l'OS peut basculer sous nos pieds : on prévient comme si
   l'utilisateur avait agi. Sans cela, l'icône du sélecteur mentirait et une
   démonstration en cours garderait les couleurs de l'ancien thème. */
if (requeteClair && typeof requeteClair.addEventListener === 'function') {
  requeteClair.addEventListener('change', () => {
    if (themePrefere() === 'auto') prevenir();
  });
}

/* ───────────────────────────── Animation ───────────────────────────── */

export const mouvementReduitSysteme = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 'complete' | 'reduite' | null (= suivre le système) */
export const animationChoisie = () => {
  const v = magasin.lire(CLE_ANIM);
  return v === 'complete' || v === 'reduite' ? v : null;
};

export const animationEffective = () =>
  animationChoisie() || (mouvementReduitSysteme() ? 'reduite' : 'complete');

export function basculerAnimation() {
  magasin.ecrire(CLE_ANIM, animationEffective() === 'complete' ? 'reduite' : 'complete');
  document.documentElement.setAttribute('data-animation', animationEffective());
  prevenir();
}

export function appliquerAnimation() {
  document.documentElement.setAttribute('data-animation', animationEffective());
}

/* ───────────────────────── Répétitions ─────────────────────────────── */

/** `true` quand les étapes qui redisent une étape déjà vue passent en accéléré.
 *  Absence de clé = accéléré : c'est le défaut, seul le refus se stocke. */
export const repetitionsAccelerees = () => magasin.lire(CLE_REPET) !== 'pleines';

export function basculerRepetitions() {
  const suivant = !repetitionsAccelerees();
  if (suivant) magasin.effacer(CLE_REPET);
  else magasin.ecrire(CLE_REPET, 'pleines');
  appliquerRepetitions();
  prevenir();
  return suivant;
}

export function appliquerRepetitions() {
  document.documentElement.setAttribute(
    'data-repetitions', repetitionsAccelerees() ? 'accelerees' : 'pleines');
}

/* ─────────────────────────────── Son ───────────────────────────────── */

/** `true` quand l'orage sonore est autorisé.
 *
 *  ★ Symétrique EXACT des répétitions, mais dans l'autre sens : là, l'absence
 *  de clé vaut « accéléré » parce que c'est l'expérience voulue par défaut et
 *  que seul le refus se stocke. Ici, l'absence de clé vaut **coupé**, et c'est
 *  l'acceptation qui se stocke. Deux défauts opposés, une même règle : la clé
 *  n'existe que quand l'utilisateur s'est écarté du défaut. */
export const sonActif = () => magasin.lire(CLE_SON) === 'actif';

export function basculerSon() {
  const suivant = !sonActif();
  if (suivant) magasin.ecrire(CLE_SON, 'actif');
  else magasin.effacer(CLE_SON);
  appliquerSon();
  prevenir();
  return suivant;
}

export function appliquerSon() {
  document.documentElement.setAttribute('data-son', sonActif() ? 'actif' : 'coupe');
}

/* ──────────────────────── Mémoire de la blague ─────────────────────── */

export const logoDejaVu = () => magasin.lire(CLE_LOGO) === '1';
export function memoriserLogoVu() {
  magasin.ecrire(CLE_LOGO, '1');
  document.documentElement.setAttribute('data-logo-vu', '1');
}
export function appliquerLogoVu() {
  if (logoDejaVu()) document.documentElement.setAttribute('data-logo-vu', '1');
}

export function appliquerTout() {
  appliquerTheme();
  appliquerAnimation();
  appliquerRepetitions();
  appliquerSon();
  appliquerLogoVu();
}
