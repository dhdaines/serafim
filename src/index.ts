// Fake requires that will be removed by webpack
require("purecss");
require("purecss/build/grids-responsive-min.css");
require("./index.css");

import { Index } from "flexsearch";
import * as PDFObject from "pdfobject";
import { debounce } from "debounce";
import { Texte } from "./index_types";

class App {
  search_box: HTMLInputElement;
  document_box: HTMLElement;
  search_results: HTMLElement;
  media_query: MediaQueryList;
  index: Index;
  textes?: Array<Texte>;

  /* Get and construct objects */
  constructor() {
    this.search_box = document.getElementById("search-box") as HTMLInputElement;
    this.document_box = document.getElementById("document-box")!;
    this.search_results = document.getElementById("search-results")!;
    this.media_query = matchMedia("screen and (min-width: 48em)");
    this.index = new Index({
      tokenize: "forward",
      charset: "latin:advanced",
    });
  }

  /* Read the index from a (presumably relative) URL */
  async read_index(url: string) {
    const response = await fetch(`${url}/keys.json`);
    if (!response.ok)
      throw "Failed to fetch keys.json";
    const keys: Array<string> = await response.json();
    for (const key of keys) {
      let response = await fetch(`${url}/${key}.json`);
      if (!response.ok)
        throw `Failed to fetch ${key}.json`;
      this.index.import(key, await response.json());
    }
  }

  /* Read the content from a (presumably relative) URL */
  async read_content(url: string) {
    const response = await fetch(`${url}/textes.json`);
    if (!response.ok)
      throw "Failed to fetch textes.json";
    this.textes = await response.json();
  }

  /* Show document content */
  show_document(idx: number) {
    if (this.textes === undefined)
      throw "Database not loaded";
    if (idx < 0 || idx >= this.textes.length)
      throw `Out of bounds document index ${idx}`;
    const texte = this.textes[idx];
    if (this.media_query.matches) {
      /* Show the PDF in the page on large enough screens */
      PDFObject.embed(`${texte.fichier}`, "#document-view", {
        pdfOpenParams: { page: texte.page + 1, zoom: 100 },
      });
    }
    else {
      this.search_results.innerHTML = "";
      const result = document.createElement("div");
      result.setAttribute("class", "search-result");
      if (texte.chapitre)
        result.innerHTML += `<h1>${texte.chapitre}</h1>\n`
      if (texte.section)
        result.innerHTML += `<h2>${texte.section}</h2>\n`
      if (texte.sous_section)
        result.innerHTML += `<h3>${texte.sous_section}</h3>\n`
      result.innerHTML += `<h4>${texte.titre}</h4>\n`
      for (const para of texte.contenu.split(".\n"))
        result.innerHTML += `<p>${para}.</p>\n`
      this.search_results.append(result);
    }
  }

  create_result_entry(idx: number) {
    if (this.textes === undefined)
      throw "Database not loaded";
    if (idx < 0 || idx >= this.textes.length)
      throw `Out of bounds document index ${idx}`;
    const texte = this.textes[idx];
    const result = document.createElement("div");
    result.setAttribute("class", "search-result");
    result.innerHTML = `
<a href="#?idx=${idx}">${texte.titre}</a>
<p>${texte.contenu.substring(0, 80)}...</p>
`
    result.addEventListener("click", (e) => {
      this.show_document(idx);
      e.preventDefault();
    });
    return result;
  }

  /* Run a search and update the list */
  async search() {
    if (this.textes === undefined)
      return;
    const text = this.search_box.value;
    const results = this.index.search(text, 10);
    console.log(`${text}: ${JSON.stringify(results)}`);
    this.search_results.innerHTML = "";
    for (const idx of results) {
      const result = this.create_result_entry(idx as number);
      this.search_results.append(result);
    }
  }

  /* Do asynchronous initialization things */
  async initialize() {
    await this.read_content("index");
    /* Display a document, for fun, if requested */
    const urlParams = new URLSearchParams(window.location.search);
    const docidx = urlParams.get("idx");
    console.log(urlParams);
    console.log(docidx);
    if (docidx !== null)
      this.show_document(parseInt(docidx));
    await this.read_index("index");
    this.search_box.addEventListener("input", debounce(async () => this.search(), 200));
  }
}

window.addEventListener("load", async () => {
  const app = new App();
  await app.initialize();
});
