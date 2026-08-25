// .planning/banc/_corpus.js — le corpus du banc de mesure.
//
// Ce n'est pas un fichier de test : c'est l'instrument de MESURE dont
// CONTRACTS §7-1 dit qu'il manque (« les pondérations sont une prédiction, pas
// une mesure »). Il vit dans `.planning/`, avec les prototypes de mesure, et
// n'est jamais servi au navigateur.
//
// Les quatre premières saisies sont les CAS DE RÉFÉRENCE nommés par l'auteur.
// Une régression sur l'une d'elles n'est pas un arbitrage, c'est un échec.

export const REFERENCES = [
  'hope-hope-hope.fr',
  'https://hope-hope-hope.fr/',
  'Donald Trump',
  'Macron',
];

export const CORPUS = [
  ...REFERENCES,
  'hope',
  'macron',
  'Millicent',
  'Wikipedia',
  'jean-michel',
  'Éléonore à Nîmes',
  'Le chat dort sur le tapis rouge',
  'https://www.example.com/path/to/page',
  'https://www.google.com',
  'reinfocovid',
  'apophenie',
  'Nombre de la bête',
  'satan',
  'Emmanuel Macron',
  'Marie Curie',
];
