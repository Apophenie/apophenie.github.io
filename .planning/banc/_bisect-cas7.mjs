/* Sonde de bissection (NON VERSIONNÉE) — le cas n° 7 du 22 septembre 2026.

   Cherche dans la liste la moisson EXACTE de l'auteur : `0:nv,2+3:flt+mpy+mr9`,
   soit trois codes — `nv`, puis deux fois `flt+…+mpy+mr9` — et rien d'autre.

   ⚠️ Une sonde laxiste (`/nv.*flt.*mpy.*mr9.*flt.*mpy.*mr9/`) trouve aussi la
   moisson plus fournie `0:nv,1+4:mas+cs+pm10,2+3:flt+mpy+mr9,5:fr13+nlc+pc9`,
   qui est une AUTRE voie. Compter les parts est ce qui les sépare.

   Sortie 0 : présente (bon) · 1 : absente (mauvais) · 125 : à sauter. */
import { creerMoteur } from '../../src/recherche/index.js';
import { CATALOGUE } from '../../src/moteur/catalogue.js';

const CURSEURS = { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 };
const SAISIE = 'numherololgeek.1000i100.fr';

/* `tca` s'écrit ou non selon le commit ; le reste de la suite tient. */
const estLaVoie = (codes) => {
  const parts = String(codes).split(',');
  if (parts.length !== 3 || parts[0] !== 'nv') return false;
  return parts.slice(1).every((p) => /^flt\+(tca\+)?mpy\+mr9$/.test(p));
};

try {
  const m = creerMoteur(CATALOGUE, { filetTemporel: false });
  const r = m.resoudre(SAISIE, { curseurs: CURSEURS });
  const i = r.approches.findIndex((a) => estLaVoie(a.codes));
  console.error(`  voies ${r.approches.length} · tête ${r.approches[0] && r.approches[0].codes}`);
  console.error(`  moisson 2+3 : ${i >= 0 ? `PRÉSENTE rang ${i + 1}` : 'ABSENTE'}`);
  process.exit(i >= 0 ? 0 : 1);
} catch (e) {
  console.error('  sonde inapplicable :', e && e.message);
  process.exit(125);
}
