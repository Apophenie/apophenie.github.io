// src/recherche/base58.js
// Encodage base58 « alphabet Bitcoin », vanilla, zéro dépendance.
// CONTRACTS.md §4.2 (b58 de la saisie) et research/heuristique.md §6.4.
//
// Choix : base58 plutôt que base64url — évite `- _ + /` et les glyphes ambigus
// `0 O I l`. Le jeton se sélectionne d'un double-clic, se dicte, et survit aux
// détecteurs de liens qui mangent la ponctuation.
//
// Coût : O(n²) (division du grand entier à chaque octet). D'où LIMITE_SAISIE.

export const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Plafond de saisie — CONTRACTS.md §0.4. 500 caractères ≈ 2 ms d'encodage. */
export const LIMITE_SAISIE = 500;

const INDEX = new Map();
for (let i = 0; i < ALPHABET.length; i++) INDEX.set(ALPHABET[i], i);

const ENCODEUR = new TextEncoder();
const DECODEUR = new TextDecoder('utf-8', { fatal: true });

/**
 * @param {Uint8Array|number[]} octets
 * @returns {string}
 */
export function encoderOctets(octets) {
  const chiffres = [0];
  for (const b of octets) {
    let retenue = b & 0xff;
    for (let i = 0; i < chiffres.length; i++) {
      const x = (chiffres[i] << 8) + retenue;
      chiffres[i] = x % 58;
      retenue = (x / 58) | 0;
    }
    while (retenue) {
      chiffres.push(retenue % 58);
      retenue = (retenue / 58) | 0;
    }
  }
  let sortie = '';
  // Les octets de tête nuls sont préservés par un '1' chacun.
  for (const b of octets) {
    if (b === 0) sortie += ALPHABET[0];
    else break;
  }
  for (let i = chiffres.length - 1; i >= 0; i--) sortie += ALPHABET[chiffres[i]];
  return sortie;
}

/**
 * @param {string} texte
 * @returns {Uint8Array|null} null si un caractère hors alphabet est rencontré.
 */
export function decoderOctets(texte) {
  if (typeof texte !== 'string') return null;
  if (texte.length === 0) return new Uint8Array(0);
  const octets = [0];
  for (const c of texte) {
    const retenueInitiale = INDEX.get(c);
    if (retenueInitiale === undefined) return null;
    let retenue = retenueInitiale;
    for (let i = 0; i < octets.length; i++) {
      const x = octets[i] * 58 + retenue;
      octets[i] = x & 0xff;
      retenue = x >> 8;
    }
    while (retenue) {
      octets.push(retenue & 0xff);
      retenue >>= 8;
    }
  }
  let zeros = 0;
  for (const c of texte) {
    if (c === ALPHABET[0]) zeros++;
    else break;
  }
  const sortie = new Uint8Array(zeros + octets.length);
  for (let i = 0; i < octets.length; i++) sortie[zeros + i] = octets[octets.length - 1 - i];
  return sortie;
}

/**
 * Encode une chaîne. Normalisation NFC impérative (CONTRACTS.md §4.4 règle 5) :
 * sans elle, « é » précomposé et « é » décomposé donnent deux URL distinctes
 * pour un texte visuellement identique.
 * @param {string} texte
 * @returns {string}
 */
export function encoderTexte(texte) {
  return encoderOctets(ENCODEUR.encode(String(texte).normalize('NFC')));
}

/**
 * @param {string} b58
 * @returns {string|null} null si base58 invalide ou UTF-8 invalide.
 */
export function decoderTexte(b58) {
  const octets = decoderOctets(b58);
  if (octets === null) return null;
  try {
    return DECODEUR.decode(octets).normalize('NFC');
  } catch {
    return null;
  }
}

/** @param {string} texte @returns {boolean} */
export function estBase58(texte) {
  if (typeof texte !== 'string' || texte.length === 0) return false;
  for (const c of texte) if (!INDEX.has(c)) return false;
  return true;
}
