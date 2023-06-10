import * as lunr from "lunr";
import { writeFile, readFile, readdir, mkdir } from "node:fs/promises";
import * as path from "node:path";
import { Reglement, Article, Annexe } from "src/alexi_types";
import { Texte } from "src/index_types";
import accent_folding from "src/accent-folding";

/* UGH! This API is SO WEIRD!!! */
require("lunr-languages/lunr.stemmer.support")(lunr);
require("lunr-languages/lunr.fr")(lunr);
declare module 'lunr' {
  function fr(): null;
}

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
  const contenu = annexe.alineas === undefined ? "" : annexe.alineas.join("\n");
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

async function add_doc(
  textes: Array<Texte>,
  doc: Reglement
) {
  if (doc.articles !== undefined) {
    for (const article of doc.articles) {
      const texte = make_text_from_article(doc, article);
      textes.push(texte);
    }
  }
  if (doc.annexes !== undefined) {
    for (const annexe of doc.annexes) {
      const texte = make_text_from_annex(doc, annexe);
      textes.push(texte);
    }
  }
}

(async () => {
  const textes = new Array<Texte>();
  const names = await readdir("data");
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const data = await readFile(path.join("data", name), "utf8");
    const doc = JSON.parse(data);
    await add_doc(textes, doc);
  }
  /* OMG why is lunrjs' API so hecking weird */
  const index = lunr(function() {
    this.use(lunr.fr);
    this.use(accent_folding);
    this.ref("id");
    this.field("titre");
    this.field("contenu");

    for (const i in textes) {
      this.add({ id: i,
                 titre: textes[i].titre,
                 contenu: textes[i].contenu
               });
    }
  });
  await writeFile(path.join("public", "textes.json"),
                  JSON.stringify(textes));
  await writeFile(path.join("public", "index.json"),
                  JSON.stringify(index.toJSON()));
})();
