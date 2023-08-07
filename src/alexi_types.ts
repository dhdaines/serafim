/* tslint:disable */
/* eslint-disable */
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/

/**
 * Représente une partie du texte d'un document, soit un chapitre ou une section.
 */
export interface Ancrage {
  /**
   * Numéro de ce chapitre ou section tel qu'il apparaît dans le texte
   */
  numero: string;
  titre: string;
  /**
   * Première et dernière indices de pages (en partant de 0) de cette partie
   *
   * @minItems 2
   * @maxItems 2
   */
  pages: [number, number];
  /**
   * Première et dernière indices de textes
   *
   * @minItems 2
   * @maxItems 2
   */
  textes?: [number, number];
}
/**
 * Annexe d'un document ou règlement.
 */
export interface Annexe {
  titre?: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  pages: [number, number];
  /**
   * Contenus (alinéas, tableaux, images) de ce texte
   */
  contenu?: (Contenu | Tableau)[];
  /**
   * Numéro de cet annexe
   */
  annexe: string;
}
/**
 * Modèle de base pour un élément du contenu, dont un alinéa, une énumération,
 * un tableau, une image, etc.
 */
export interface Contenu {
  /**
   * Texte indexable pour ce contenu
   */
  texte: string;
}
/**
 * Tableau, représenté pour le moment en image (peut-être HTML à l'avenir)
 */
export interface Tableau {
  /**
   * Texte indexable pour ce contenu
   */
  texte: string;
  /**
   * Fichier avec la représentation du tableau
   */
  tableau: string;
}
/**
 * Article du texte.
 */
export interface Article {
  titre?: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  pages: [number, number];
  /**
   * Contenus (alinéas, tableaux, images) de ce texte
   */
  contenu?: (Contenu | Tableau)[];
  /**
   * Numéro de cet article tel qu'il apparaît dans le texte, ou -1 pour un article sans numéro
   */
  article: number;
  /**
   * Indice (en partant de 0) de la sous-section dans laquelle cet article apparaît, ou -1 s'il n'y en a pas
   */
  sous_section?: number;
  /**
   * Indice (en partant de 0) de la section dans laquelle cet article apparaît, ou -1 s'il n'y en a pas
   */
  section?: number;
  /**
   * Indice (en partant de 0) du chapitre dans laquelle cet article apparaît, ou -1 s'il n'y en a pas
   */
  chapitre?: number;
}
/**
 * Attendus d'un reglement ou resolution.
 */
export interface Attendus {
  titre?: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  pages: [number, number];
  /**
   * Contenus (alinéas, tableaux, images) de ce texte
   */
  contenu?: (Contenu | Tableau)[];
  attendu?: boolean;
}
/**
 * Chapitre du texte.
 */
export interface Chapitre {
  /**
   * Numéro de ce chapitre ou section tel qu'il apparaît dans le texte
   */
  numero: string;
  titre: string;
  /**
   * Première et dernière indices de pages (en partant de 0) de cette partie
   *
   * @minItems 2
   * @maxItems 2
   */
  pages: [number, number];
  /**
   * Première et dernière indices de textes
   *
   * @minItems 2
   * @maxItems 2
   */
  textes?: [number, number];
  sections?: Section[];
}
/**
 * Section du texte.
 *
 * Le numéro ne comprend pas celui du chapitre, par exemple 'SECTION
 * 3 CLASSIFICATION DES USAGES'
 */
export interface Section {
  /**
   * Numéro de ce chapitre ou section tel qu'il apparaît dans le texte
   */
  numero: string;
  titre: string;
  /**
   * Première et dernière indices de pages (en partant de 0) de cette partie
   *
   * @minItems 2
   * @maxItems 2
   */
  pages: [number, number];
  /**
   * Première et dernière indices de textes
   *
   * @minItems 2
   * @maxItems 2
   */
  textes?: [number, number];
  sous_sections?: SousSection[];
}
/**
 * Sous-section du texte.
 *
 * Le numéro comprend aussi celui de la section, par exemple
 * 'SOUS-SECTION 3.1 GROUPE HABITATION'
 */
export interface SousSection {
  /**
   * Numéro de ce chapitre ou section tel qu'il apparaît dans le texte
   */
  numero: string;
  titre: string;
  /**
   * Première et dernière indices de pages (en partant de 0) de cette partie
   *
   * @minItems 2
   * @maxItems 2
   */
  pages: [number, number];
  /**
   * Première et dernière indices de textes
   *
   * @minItems 2
   * @maxItems 2
   */
  textes?: [number, number];
}
/**
 * Dates de publication ou adoption d'un document ou règlement.
 */
export interface Dates {
  /**
   * Date de l'adoption d'un règlement ou résolution, ou de publication d'autre document
   */
  adoption: string;
  /**
   * Date de l'adoption d'un projet de règlement
   */
  projet?: string;
  /**
   * Date de l'avis de motion pour un règlement
   */
  avis?: string;
  /**
   * Date d'entrée en vigueur d'un règlement
   */
  entree?: string;
  /**
   * Date de la consultation publique
   */
  publique?: string;
  /**
   * Date de la consultation écrite
   */
  ecrite?: string;
  /**
   * Date du certificat de conformité de la MRC
   */
  mrc?: string;
}
/**
 * Document municipal générique.
 */
export interface Document {
  /**
   * Nom du fichier source PDF du document
   */
  fichier: string;
  /**
   * Titre du document (tel qu'il apparaît sur le site web)
   */
  titre?: string;
  chapitres?: Chapitre[];
  textes?: (Article | Attendus | Annexe | Texte)[];
}
/**
 * Modèle de base pour un unité atomique (indexable) de texte, dont un
 * article, une liste d'attendus, ou un annexe.
 */
export interface Texte {
  titre?: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  pages: [number, number];
  /**
   * Contenus (alinéas, tableaux, images) de ce texte
   */
  contenu?: (Contenu | Tableau)[];
}
/**
 * Structure et contenu d'un règlement.
 */
export interface Reglement {
  /**
   * Nom du fichier source PDF du document
   */
  fichier: string;
  /**
   * Titre du document (tel qu'il apparaît sur le site web)
   */
  titre?: string;
  chapitres?: Chapitre[];
  textes?: (Article | Attendus | Annexe | Texte)[];
  /**
   * Numéro du règlement, e.g. 1314-Z-09
   */
  numero: string;
  /**
   * Objet du règlement, e.g. 'Lotissement'
   */
  objet?: string;
  dates: Dates;
}
