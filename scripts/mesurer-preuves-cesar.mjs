// Chaque échantillon démarre avec un cache vide. Les imports et le démarrage
// de Node sont hors mesure ; il s’agit du choix de preuve, pas du chargement UI.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.argv[2] === '--echantillon') {
  const { justificationCesar } = await import('../src/moteur/transformations/filtres.js');
  const { PAR_CODE } = await import('../src/moteur/catalogue.js');
  const { resoudreCode } = await import('../src/moteur/transformations/positionnel.js');
  const texte = process.argv[3];
  const code = `fj${texte[0].toUpperCase().charCodeAt(0) - 64}~0~ma1`;
  const lecture = performance.now();
  const explicite = resoudreCode(PAR_CODE, code).op.justifie(texte);
  if (!explicite) throw new Error(`preuve refusée : ${code}`);
  const expliciteMs = performance.now() - lecture;
  const debut = performance.now();
  justificationCesar(texte, 4);
  const froid = performance.now() - debut;
  const suite = performance.now();
  justificationCesar(texte, 4);
  console.log(JSON.stringify({ froid, cache: performance.now() - suite, expliciteMs }));
} else {
  const fichier = fileURLToPath(import.meta.url);
  for (const texte of ['Test', 'Didier Raoult', 'Anticonstitutionnellement', 'a'.repeat(100)]) {
    const essais = Array.from({ length: 5 }, () => JSON.parse(execFileSync(process.execPath,
      [fichier, '--echantillon', texte], { encoding: 'utf8', timeout: 30000 })));
    const valeurs = essais.map((e) => e.froid).sort((a, b) => a - b);
    console.log(JSON.stringify({ caracteres: texte.length,
      froidMs: { min: valeurs[0], mediane: valeurs[2], max: valeurs[4] },
      expliciteMaxMs: Math.max(...essais.map((e) => e.expliciteMs)),
      cacheMaxMs: Math.max(...essais.map((e) => e.cache)) }));
  }
}
