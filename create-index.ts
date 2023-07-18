import * as lunr from "lunr";
import { writeFile, readFile, readdir, mkdir } from "node:fs/promises";
import * as path from "node:path";
import { Reglement, Article, Annexe, Attendus } from "src/alexi_types";
import { Texte } from "src/index_types";
import folding from "lunr-folding";

/* UGH! This API is SO WEIRD!!! */
require("lunr-languages/lunr.stemmer.support")(lunr);
require("lunr-languages/lunr.fr")(lunr);
folding(lunr);
/* WTF */
declare module 'lunr' {
  function fr(): null;
}

function make_text_from_article(doc: Reglement, article: Article): Texte {
  const page = article.pages[0];
  const numero = article.article.toString();
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
  const document = `${doc.numero} ${doc.objet ?? ""}`;
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
  const numero = annexe.annexe;
  const fichier = doc.fichier;
  const document = `${doc.numero} ${doc.objet ?? ""}`;
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

function make_text_from_attendus(doc: Reglement, attendus: Attendus): Texte {
  const page = attendus.pages[0];
  const fichier = doc.fichier;
  const document = `${doc.numero} ${doc.objet ?? ""}`;
  const contenu = attendus.alineas === undefined ? "" : attendus.alineas.join("\n");
  const titre = `ATTENDUS`;
  const numero = "ATTENDUS";
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
  if (doc.attendus !== undefined) {
    const texte = make_text_from_attendus(doc, doc.attendus);
    textes.push(texte);
  }
  if (doc.contenus !== undefined) {
    for (const contenu of doc.contenus) {
      if ("article" in contenu) {
	const texte = make_text_from_article(doc, contenu as Article);
	textes.push(texte);
      }
      else if ("annexe" in contenu) {
	const texte = make_text_from_annex(doc, contenu as Annexe);
	textes.push(texte);
      }
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
    if (doc.numero === "INCONNU")
      console.log(`Skipping unrecognized document ${name}`)
    else
      console.log(`Adding document ${name}`);
    await add_doc(textes, doc);
  }
  /* OMG why is lunrjs' API so hecking weird */
  const index = lunr(function() {
    this.use(lunr.fr);
    this.ref("id");
    this.field("titre");
    this.field("contenu");
    // Yes this is undocumented
    this.metadataWhitelist = ['position']

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
