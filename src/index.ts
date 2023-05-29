// Fake requires that will be removed by webpack
require("purecss");
require("purecss/build/grids-responsive-min.css");
require("./index.css");

import { Index } from "flexsearch";
import * as PDFObject from "pdfobject";
import { debounce } from "debounce";

// Entrée textuelle dans la base de données
interface Texte {
  document: string;
  page: number;
  titre?: string;
  contenu: string;
}

class App {
  search_box: HTMLInputElement;
  search_results: HTMLElement;
  index: Index;
  textes?: Array<Texte>;

  /* Get and construct objects */
  constructor() {
    this.search_box = document.getElementById("search-box") as HTMLInputElement;
    this.search_results = document.getElementById("search-results")!;
    this.index = new Index({
      tokenize: "forward",
      charset: "latin:advanced",
    });
  }

  /* Read the index from a (presumably relative) URL */
  async read_index(url: string) {
    let response = await fetch(`${url}/keys.json`);
    if (!response.ok)
      throw "Failed to fetch keys.json";
    const keys: Array<string> = await response.json();
    response = await fetch(`${url}/textes.json`);
    if (!response.ok)
      throw "Failed to fetch textes.json";
    this.textes = await response.json();
    for (const key of keys) {
      let response = await fetch(`${url}/${key}.json`);
      if (!response.ok)
        throw `Failed to fetch ${key}.json`;
      this.index.import(key, await response.json());
    }
  }

  /* Run a search and update the list */
  async search() {
    if (this.textes === undefined)
      return;
    const text = this.search_box.value;
    const results = this.index.search(text);
    console.log(`${text}: ${JSON.stringify(results)}`);
    this.search_results.innerHTML = "";
    for (const idx of results) {
      const texte = this.textes[idx as number];
      const dt = document.createElement("dt");
      const a = document.createElement("a");
      const dd = document.createElement("dd");
      if (texte.titre !== undefined) {
        a.innerText = texte.titre;
        dd.innerText = texte.contenu.substring(0, 80);
      }
      else {
        a.innerText = texte.contenu.substring(0, 30);
        dd.innerText = texte.contenu.substring(0, 80);
      }
      a.addEventListener("click", () => {
        PDFObject.embed(`/${texte.document}`, "#document-view", {
          pdfOpenParams: { page: texte.page + 1, zoom: 100 },
        });
        return false;
      });
      dt.append(a);
      this.search_results.append(dt);
      this.search_results.append(dd);
    }
  }

  /* Do asynchronous initialization things */
  async initialize() {
    await this.read_index("/index");
    this.search_box.addEventListener("input", debounce(async () => this.search(), 200));
    PDFObject.embed("/Rgl-1314-2021-L-Lotissement.pdf", "#document-view", {
      pdfOpenParams: { page: 6 },
    });
  }
}

window.addEventListener("load", async () => {
  const app = new App();
  await app.initialize();
});
