import * as lunr from "lunr";
import { writeFile, readFile, readdir, mkdir } from "node:fs/promises";
import * as path from "node:path";
import { Reglement, Article, Annexe, Attendus, Contenu, Tableau, Texte as AlexiTexte } from "src/alexi_types";
import { Texte } from "src/index_types";
import folding from "lunr-folding";

/* UGH! This API is SO WEIRD!!! */
folding(lunr);

function make_contenu(contenu?: Array<Contenu | Tableau>): string {
  if (contenu === undefined)
    return "";
  return contenu.map(c => {
    if ("tableau" in c)
      return `<img src="img/${c.tableau}" alt="${c.texte}">`;
    else if ("figure" in c)
      return `
<figure>
  <img src="img/${c.figure}">
  <figcaption>${c.texte}</figcaption>
</figure>`;
    else
      return c.texte
  }).join("\n\n");
}

function make_texte(contenu?: Array<Contenu| Tableau>): string {
  if (contenu === undefined)
    return "";
  return contenu.map(c => c.texte).join("\n");
}

function make_text_from_article(doc: Reglement, article: Article): Texte {
  const page = article.pages[0];
  let chapitre = "";
  let section = "";
  let sous_section = "";
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
  const contenu = make_contenu(article.contenu);
  const titre = article.titre ?? "";
  const numero = article.article.toString();
  let texte = `${numero} ${titre}
${document}
${chapitre}
${section}
${sous_section}\n\n` + make_texte(article.contenu);
  return {
    fichier,
    document,
    page,
    chapitre,
    section,
    sous_section,
    titre,
    numero,
    texte,
    contenu,
  };
}

function make_text_from_annex(doc: Reglement, annexe: Annexe): Texte {
  const page = annexe.pages[0];
  const numero = annexe.annexe;
  const fichier = doc.fichier;
  const document = `${doc.numero} ${doc.objet ?? ""}`;
  const contenu = make_contenu(annexe.contenu);
  const titre = annexe.titre ?? "";
  let texte = `${numero} ${titre}\n${document}\n\n` + make_texte(annexe.contenu);
  return {
    fichier,
    document,
    page,
    titre,
    numero,
    texte,
    contenu,
  };
}

function make_text_from_attendus(doc: Reglement, attendus: Attendus): Texte {
  const page = attendus.pages[0];
  const fichier = doc.fichier;
  const document = `${doc.numero} ${doc.objet ?? ""}`;
  const contenu = make_contenu(attendus.contenu);
  const titre = `ATTENDUS`;
  const numero = "ATTENDUS";
  let texte = `${numero}\n${document}\n\n` + make_texte(attendus.contenu);
  return {
    fichier,
    document,
    page,
    titre,
    numero,
    texte,
    contenu,
  };
}

function make_text_from_text(doc: Reglement, at: AlexiTexte): Texte {
  const page = at.pages[0];
  const fichier = doc.fichier;
  const document = `${doc.numero} ${doc.objet ?? ""}`;
  const contenu = make_contenu(at.contenu);
  const titre = at.titre ?? contenu.substring(0, 80); // FIXME
  const numero = "";
  let texte = `${document}\n\n` + make_texte(at.contenu);
  return {
    fichier,
    document,
    page,
    titre,
    numero,
    texte,
    contenu,
  };
}

async function add_doc(
  textes: Array<Texte>,
  doc: Reglement
) {
  if (doc.textes !== undefined) {
    for (const contenu of doc.textes) {
      if ("article" in contenu) {
	const texte = make_text_from_article(doc, contenu as Article);
	textes.push(texte);
      }
      else if ("annexe" in contenu) {
	const texte = make_text_from_annex(doc, contenu as Annexe);
	textes.push(texte);
      }
      else if ("attendu" in contenu) {
	const texte = make_text_from_attendus(doc, contenu as Annexe);
	textes.push(texte);
      }
      else {
	const texte = make_text_from_text(doc, contenu);
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
    try {
      const doc = JSON.parse(data);
      if (doc.numero === "INCONNU")
        console.log(`Skipping unrecognized document ${name}`);
      else
        console.log(`Adding document ${name}`);
      await add_doc(textes, doc);
    }
    catch (err) {
      console.log(`Skipping document ${name}: ${err}`);
    }
  }
  /* OMG why is lunrjs' API so hecking weird */
  const index = lunr(function() {
    //this.use(lunr.fr);
    this.ref("id");
    this.field("titre");
    this.field("texte");
    // Yes this is undocumented
    this.metadataWhitelist = ['position']

    for (const id in textes) {
      const titre = textes[id].titre;
      let texte = textes[id].texte; 
      this.add({ id, titre, texte });
    }
  });
  await writeFile(path.join("public", "textes.json"),
                  JSON.stringify(textes));
  await writeFile(path.join("public", "index.json"),
                  JSON.stringify(index.toJSON()));
})();
