/**
 * Normalise les noms de propriétés pour éviter les problèmes d'encodage
 * Convertit les caractères accentués et spéciaux en équivalents ASCII
 *
 * Exemples:
 * - quantité → quantite
 * - diamètre → diametre
 * - épaisseur → epaisseur
 * - type_de_pièce → type_de_piece
 */
export function normalizePropertyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remplacer les caractères accentués français
    .replace(/[àâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ÿ]/g, 'y')
    .replace(/[ç]/g, 'c')
    .replace(/[æ]/g, 'ae')
    .replace(/[œ]/g, 'oe')
    // Remplacer les espaces et tirets par des underscores
    .replace(/[\s-]+/g, '_')
    // Garder seulement les caractères alphanumériques et underscores
    .replace(/[^a-z0-9_]/g, '')
    // Éviter les underscores multiples
    .replace(/_+/g, '_')
    // Retirer les underscores au début et à la fin
    .replace(/^_|_$/g, '')
}
