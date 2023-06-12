import * as lunr from "lunr";
import * as PDFObject from "pdfobject";
import { debounce } from "debounce";
import { Texte } from "./index_types";
import folding from "lunr-folding";

// Fake requires that will be removed by webpack
require("purecss");
require("purecss/build/grids-responsive-min.css");
require("./index.css");

// Unfortunately not fake requires due to lunr being ancient
require("lunr-languages/lunr.stemmer.support")(lunr);
require("lunr-languages/lunr.fr")(lunr);
folding(lunr);

class App {
  search_box: HTMLInputElement;
  document_view: HTMLElement;
  search_results: HTMLElement;
  media_query: MediaQueryList;
  index?: lunr.Index;
  textes?: Array<Texte>;

  /* Get and construct objects */
  constructor() {
    this.search_box = document.getElementById("search-box") as HTMLInputElement;
    this.document_view = document.getElementById("document-view")!;
    this.search_results = document.getElementById("search-results")!;
    this.media_query = matchMedia("screen and (min-width: 48em)");
  }

  /* Read the index */
  async read_index(): Promise<lunr.Index> {
    const response = await fetch("index.json");
    if (!response.ok) throw "Failed to fetch index.json";
    return lunr.Index.load(await response.json());
  }

  /* Read the content */
  async read_content(): Promise<Array<Texte>> {
    const response = await fetch("textes.json");
    if (!response.ok) throw "Failed to fetch textes.json";
    return response.json();
  }

  /* Show document content */
  show_document(idx: number) {
    if (this.textes === undefined) throw "Database not loaded";
    if (idx < 0 || idx >= this.textes.length)
      throw `Out of bounds document index ${idx}`;
    const texte = this.textes[idx];
    if (this.media_query.matches && PDFObject.supportsPDFs) {
      /* Show the PDF in the page on large enough screens */
      PDFObject.embed(`${texte.fichier}`, "#document-view", {
        pdfOpenParams: { page: texte.page + 1, zoom: 100 },
      });
    } else {
      /* Show it in the appropriate place based on screen size */
      const target = this.media_query.matches
        ? this.document_view
        : this.search_results;
      target.innerHTML = "";
      const result = document.createElement("div");
      result.setAttribute("class", "search-result");
      result.innerHTML += `<h1>${texte.titre}</h1>\n`;
      if (texte.document)
        result.innerHTML += `<h4>Règlement ${texte.document}</h4>\n`;
      if (texte.chapitre)
        result.innerHTML += `<h4>Chapitre ${texte.chapitre}</h4>\n`;
      if (texte.section)
        result.innerHTML += `<h4>Section ${texte.section}</h4>\n`;
      if (texte.sous_section)
        result.innerHTML += `<h4>${texte.sous_section}</h4>\n`;
      for (const para of texte.contenu.split(".\n"))
        result.innerHTML += `<p>${para}.</p>\n`;
      target.append(result);
    }
  }

  create_result_entry(idx: number) {
    if (this.textes === undefined) throw "Database not loaded";
    if (idx < 0 || idx >= this.textes.length)
      throw `Out of bounds document index ${idx}`;
    const texte = this.textes[idx];
    const result = document.createElement("div");
    result.setAttribute("class", "search-result");
    result.innerHTML = `
<a href="#?idx=${idx}">${texte.titre}</a>
<p>${texte.contenu.substring(0, 80)}...</p>
`;
    result.addEventListener("click", (e) => {
      this.show_document(idx);
      e.preventDefault();
    });
    return result;
  }

  /* Run a search and update the list */
  async search() {
    if (this.textes === undefined)
      this.textes = await this.read_content();
    if (this.textes === undefined)
      this.index = await this.read_index();
    const text = this.search_box.value;
    try {
      const results = this.index!.search(text);
      this.search_results.innerHTML = "";
      for (const idx of results) {
        const result = this.create_result_entry(parseInt(idx.ref));
        this.search_results.append(result);
      }
    }
    catch (e) {
      console.log(`Query error: ${e}`);
    }
  }

  /* Do asynchronous initialization things */
  async initialize() {
    this.textes = await this.read_content();
    /* Display a document, for fun, if requested */
    const urlParams = new URLSearchParams(window.location.search);
    const docidx = urlParams.get("idx");
    console.log(urlParams);
    console.log(docidx);
    if (docidx !== null) this.show_document(parseInt(docidx));
    this.index = await this.read_index();
    this.search_box.addEventListener(
      "input",
      debounce(async () => this.search(), 200)
    );
  }
}

window.addEventListener("load", async () => {
  const app = new App();
  await app.initialize();
});
