import { Index } from "flexsearch";
import * as fs from "node:fs";
import * as path from "node:path";

// Interfaces pour un règlement en format JSON (en lien avec
// alexis.models.Reglement en Python)
interface Ancrage {
  numero: string;
  page: number;
  titre?: string;
  debut: number;
  fin: number;
}

interface SousSection extends Ancrage {
}

interface Section extends Ancrage {
  sous_sections: Array<SousSection>;
}

interface Chapitre extends Ancrage {
  sections: Array<Section>;
}

interface Annexe extends Ancrage {
  alineas: Array<string>;
}

interface Article {
  numero: number;
  page: number;
  titre?: string;
  alineas: Array<string>;
}

interface Dates {
  avis?: string;
  adoption: string;
  entree: string;
}

interface Reglement {
  fichier: string;
  numero: string;
  object?: string;
  dates: Dates;
  chapitres: Array<Chapitre>;
  articles: Array<Article>;
  annexes: Array<Annexe>;
}

// Entrée textuelle dans la base de données
interface Texte {
  document: string;
  page: number;
  titre?: string;
  contenu: string;
}

const textes = new Array<Texte>()
const index = new Index({
  tokenize: "forward",
  charset: "latin:advanced",
});


function add_to_index(doc: Reglement) {
  for (const article of doc.articles) {
    const texte = {
      document: doc.fichier,
      page: article.page,
      titre: article.titre,
      contenu: article.alineas.join("\n"),
    };
    index.add(textes.length, texte.titre + "\n" + texte.contenu);
    textes.push(texte);
  }
}

const dir: fs.Dir = fs.opendirSync("../data");
let dirent;
while ((dirent = dir.readSync()) !== null) {
  if (!dirent.name.endsWith(".json"))
    continue;
  const data = fs.readFileSync(path.join("../data", dirent.name), 'utf8');
  const doc = JSON.parse(data);
  add_to_index(doc);
}

try {
  fs.mkdirSync("public/index");
}
catch (err) {
  if (err.code != "EEXIST")
    throw err;
}
fs.writeFileSync(path.join("public/index/textes.json"), JSON.stringify(textes));
  console.log(`Wrote public/index/textes.json`);
index.export((key, data) => {
  fs.writeFileSync(path.join("public/index", key + ".json"), JSON.stringify(data));
  console.log(`Wrote public/index/${key}.json`);
});
