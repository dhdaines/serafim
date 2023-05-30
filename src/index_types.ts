// Entrée textuelle dans la base de données
export interface Texte {
  fichier: string;
  document: string;
  page: number;
  chapitre?: string;
  section?: string;
  sous_section?: string;
  titre: string;
  numero: string;
  contenu: string;
}
