import * as lunr from "lunr";
import * as PDFObject from "pdfobject";
import { debounce } from "debounce";
import { Texte } from "./index_types";
import folding from "lunr-folding";

// Fake requires that will be removed by webpack
require("purecss");
require("purecss/build/grids-responsive-min.css");
require("./index.css");

// Unfortunately not fake require due to lunr being weird
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
    const target = this.document_view;
    target.style.display = "block";
    target.innerHTML = "";
    const result = document.createElement("div");
    result.setAttribute("class", "article");
    result.innerHTML = "";
    result.innerHTML += `
<div class="pure-g">
<div class="pure-u-1-3" style="text-align: left">
<a id="article-prev" class="article-button" href="?idx=${idx - 1}">&larr;</a>
</div>
<div class="pure-u-1-3" style="text-align: center">
<a class="article-button" target="_blank"
   href="https://ville.sainte-adele.qc.ca/upload/documents/${texte.fichier}#page=${texte.page}&zoom=100"
>PDF</a>
</div>
<div class="pure-u-1-3" style="text-align: right">
<a id="article-next" class="article-button" href="?idx=${idx + 1}">&rarr;</a>
</div>
</div>
`;
    result.innerHTML += `<h1>${texte.titre}</h1>\n`;
    if (texte.document)
      result.innerHTML += `<h4>Règlement ${texte.document}</h4>\n`;
    if (texte.chapitre)
      result.innerHTML += `<h4>Chapitre ${texte.chapitre}</h4>\n`;
    if (texte.section)
      result.innerHTML += `<h4>Section ${texte.section}</h4>\n`;
    if (texte.sous_section)
      result.innerHTML += `<h4>${texte.sous_section}</h4>\n`;
    for (const para of texte.contenu.split("\n\n"))
      result.innerHTML += `<p>${para}</p>\n`;
    target.append(result);
    const prev = document.getElementById("article-prev") as HTMLAnchorElement;
    if (prev) {
      if (idx == 0)
        prev.style.pointerEvents = "none";
      else
        prev.addEventListener("click", (e) => {
          this.show_document(idx - 1);
          history.replaceState(null, "", `?idx=${idx - 1}`)
          e.preventDefault();
        });
    }
    const next = document.getElementById("article-next") as HTMLAnchorElement;
    if (next) {
      if (idx == this.textes.length - 1)
        next.style.pointerEvents = "none";
      else {
        next.addEventListener("click", (e) => {
          this.show_document(idx + 1);
          history.replaceState(null, "", `?idx=${idx + 1}`)
          e.preventDefault();
        });
      }
    }
  }

  create_title(texte: Texte, result: lunr.Index.Result) {
    const a = document.createElement("a");
    a.href = `?idx=${result.ref}`;
    a.innerText = texte.titre;
    return a;
  }

  create_subtitles(texte: Texte, result: lunr.Index.Result) {
    const div = document.createElement("div");
    div.setAttribute("class", "soustitre");
    if (texte.document) div.innerHTML += `<p>${texte.document}</p>\n`;
    if (texte.chapitre) div.innerHTML += `<p>${texte.chapitre}</p>\n`;
    if (texte.section) div.innerHTML += `<p>${texte.section}</p>\n`;
    if (texte.sous_section) div.innerHTML += `<p>${texte.sous_section}</p>\n`;
    return div;
  }

  create_extract(texte: Texte, result: lunr.Index.Result) {
    const spans = [];
    for (const term in result.matchData.metadata) {
      // @ts-ignore
      const metadata = result.matchData.metadata[term];
      if (!("texte" in metadata)) continue;
      if (!("position" in metadata.texte)) continue;
      spans.push(...metadata.texte.position);
    }
    spans.sort();
    const p = document.createElement("p");
    p.setAttribute("class", "extrait");
    let extrait;
    if (spans.length) {
      const last = spans.length - 1;
      extrait = texte.texte.substring(
          Math.max(0, spans[last][0] - 80),
          Math.min(texte.texte.length, spans[last][0] + spans[last][1] + 40)
        )
    } else extrait = texte.texte.substring(0, 80) + "...";
    p.innerHTML = `... ${extrait} ...`;
    return p;
  }

  create_result_entry(result: lunr.Index.Result) {
    if (this.textes === undefined) throw "Database not loaded";
    const idx = parseInt(result.ref);
    if (idx < 0 || idx >= this.textes.length)
      throw `Out of bounds document index ${idx}`;
    const texte = this.textes[idx];
    const div = document.createElement("div");
    div.setAttribute("class", "search-result");
    div.append(this.create_title(texte, result));
    div.append(this.create_subtitles(texte, result));
    div.append(this.create_extract(texte, result));
    div.addEventListener("click", (e) => {
      const query = encodeURIComponent(this.search_box.value);
      history.replaceState(null, "", `?q=${query}`)
      /* On desktop, do it in-browser, otherwise follow the link */
      if (this.media_query.matches) {
        this.show_document(idx);
        history.pushState(null, "", `?idx=${idx}`)
        e.preventDefault();
      }
    });
    return div;
  }

  /* Run a search and update the list */
  async search() {
    if (this.textes === undefined) this.textes = await this.read_content();
    if (this.textes === undefined) this.index = await this.read_index();
    const text = this.search_box.value;
    if (text.length < 2)
      return;
    try {
      const results = this.index!.search(text);
      this.search_results.innerHTML = "";
      for (const result of results.slice(0, 10)) {
        this.search_results.append(this.create_result_entry(result));
      }
    } catch (e) {
      console.log(`Query error: ${e}`);
    }
  }

  /* Do asynchronous initialization things */
  async initialize() {
    this.textes = await this.read_content();
    const urlParams = new URLSearchParams(window.location.search);
    /* Display a document, for fun, if requested */
    const docidx = urlParams.get("idx");
    if (docidx !== null) this.show_document(parseInt(docidx));
    this.index = await this.read_index();
    /* Display search results, for fun, if requested */
    const query = urlParams.get("q");
    if (query !== null) {
      this.search_box.value = query;
      this.search(); // asynchronously, sometime
    }
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
