import { Index } from "flexsearch";
import * as fs from "node:fs";
import * as path from "node:path";
import { Reglement, Article, Annexe } from "src/alexi_types";
import { Texte } from "src/index_types"; 

const textes = new Array<Texte>();
const index = new Index({
  tokenize: "forward",
  charset: "latin:advanced",
});

function make_text_from_article(doc: Reglement, article: Article): Texte {
  const page = article.pages[0];
  const numero = article.numero.toString();
  let chapitre, section, sous_section;
  if (
    article.chapitre !== undefined &&
    article.chapitre !== -1 &&
    doc.chapitres
  ) {
    const chap = doc.chapitres[article.chapitre];
    chapitre = `${chap.numero} ${chap.titre}`;
    if (
      article.section !== undefined &&
      article.section !== -1 &&
      chap.sections
    ) {
      const sec = chap.sections[article.section];
      section = `${sec.numero} ${sec.titre}`;
      if (
        article.sous_section !== undefined &&
        article.sous_section !== -1 &&
        sec.sous_sections
      ) {
        const sousec = sec.sous_sections[article.sous_section];
        sous_section = `${sousec.numero} ${sousec.titre}`;
      }
    }
  }
  const fichier = doc.fichier;
  const document = `${doc.numero} ${doc.objet}`;
  const contenu =
    article.alineas === undefined ? "" : article.alineas.join("\n");
  const titre = article.titre === undefined ? "" : article.titre;
  return {
    fichier,
    document,
    page,
    chapitre,
    section,
    sous_section,
    titre,
    numero,
    contenu,
  };
}

function make_text_from_annex(doc: Reglement, annexe: Annexe): Texte {
  const page = annexe.pages[0];
  const numero = annexe.numero;
  const fichier = doc.fichier;
  const document = `${doc.numero} ${doc.objet}`;
  const contenu =
    annexe.alineas === undefined ? "" : annexe.alineas.join("\n");
  const titre = annexe.titre === undefined ? "" : annexe.titre;
  return {
    fichier,
    document,
    page,
    titre,
    numero,
    contenu,
  };
}

function add_to_index(doc: Reglement) {
  if (doc.articles !== undefined) {
    for (const article of doc.articles) {
      const texte = make_text_from_article(doc, article);
      const index_text = `
${texte.chapitre}
${texte.section}
${texte.sous_section}
${texte.titre}
${texte.contenu}
`;
      index.add(textes.length, index_text);
      textes.push(texte);
    }
  }
  if (doc.annexes !== undefined) {
    for (const annexe of doc.annexes) {
      const texte = make_text_from_annex(doc, annexe);
      const index_text = `
${texte.titre}
${texte.contenu}
`;
      index.add(textes.length, index_text);
      textes.push(texte);
    }
  }
}

const dir: fs.Dir = fs.opendirSync("data");
let dirent;
while ((dirent = dir.readSync()) !== null) {
  if (!dirent.name.endsWith(".json")) continue;
  const data = fs.readFileSync(path.join("data", dirent.name), "utf8");
  const doc = JSON.parse(data);
  add_to_index(doc);
}

try {
  fs.mkdirSync("public/index");
} catch (err: any) {
  if (err.code != "EEXIST") throw err;
}
fs.writeFileSync(path.join("public/index/textes.json"), JSON.stringify(textes));
console.log(`Wrote public/index/textes.json`);
const keys: Array<string> = [];
/* Whoa, WTF, is this async or not, flexsearch?!?!? */
index.export((key: string | number, data: any) => {
  const keystr = key.toString();
  fs.writeFileSync(
    path.join(`public/index/${keystr}.json`),
    JSON.stringify(data)
  );
  keys.push(keystr);
  console.log(`Wrote public/index/${keystr}.json`);
  /* Work around the problem by just writing it repeatedly */
  fs.writeFileSync(path.join("public/index/keys.json"), JSON.stringify(keys));
});
