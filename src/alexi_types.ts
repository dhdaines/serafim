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
   * @minItems 2
   * @maxItems 2
   */
  articles?: [number, number];
}
/**
 * Annexe du texte.
 */
export interface Annexe {
  titre?: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  pages: [number, number];
  alineas?: string[];
  numero: string;
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
  alineas?: string[];
  /**
   * Numéro de cet article tel qu'il apparaît dans le texte
   */
  numero: number;
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
   * @minItems 2
   * @maxItems 2
   */
  articles?: [number, number];
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
   * @minItems 2
   * @maxItems 2
   */
  articles?: [number, number];
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
   * @minItems 2
   * @maxItems 2
   */
  articles?: [number, number];
}
/**
 * Modèle de base pour du contenu textuel.
 */
export interface Contenu {
  titre?: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  pages: [number, number];
  alineas?: string[];
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
   * Date de l'avis de motion pour un règlement
   */
  avis?: string;
  /**
   * Date d'entrée en vigueur d'un règlement
   */
  entree?: string;
}
export interface Reglement {
  /**
   * Nom du fichier source du règlement
   */
  fichier: string;
  /**
   * Numéro du règlement, e.g. 1314-Z-09
   */
  numero: string;
  /**
   * Objet du règlement, e.g. 'Lotissement'
   */
  objet?: string;
  dates: Dates;
  chapitres?: Chapitre[];
  articles?: Article[];
  annexes?: Annexe[];
}
