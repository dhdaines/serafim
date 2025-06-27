// -*- js-indent-level: 2 -*-
/// <reference types="vite/client" />
import lunr from "lunr";
// @ts-ignore
import stemmerSupport from "lunr-languages/lunr.stemmer.support";
// @ts-ignore
import lunrFR from "lunr-languages/lunr.fr";
import unidecode from "unidecode";
import debounce from "debounce";

stemmerSupport(lunr);
lunrFR(lunr);
lunr.Pipeline.registerFunction((token) => token.update(unidecode), "unifold");

const BASE_URL = import.meta.env.BASE_URL;
const ALEXI_URL = import.meta.env.VITE_ALEXI_URL;
const ALEXI_API = import.meta.env.VITE_ALEXI_API;

type Texte = [string, string, string];

class App {
  search_box: HTMLInputElement;
  document_view: HTMLElement;
  search_results: HTMLElement;
  ville: HTMLSelectElement;
  media_query: MediaQueryList;
  index: lunr.Index | null = null;
  textes: Array<Texte> | null = null;

  /* Get and construct objects */
  constructor() {
    this.search_box = document.getElementById("search-box") as HTMLInputElement;
    this.document_view = document.getElementById("document-view")!;
    this.search_results = document.getElementById("search-results")!;
    // NOTE: Must match main.css
    this.media_query = matchMedia("screen and (min-width: 600px)");
    // Disable enter key (or else the whole index gets reloaded)
    const search_form = document.getElementById("search-form")!;
    search_form.addEventListener("submit", (e) => e.preventDefault());
    // Drop-down for towns
    this.ville = document.getElementById("ville")! as HTMLSelectElement;
  }

  /* Do asynchronous initialization things */
  async initialize() {
    let showing = false;
    if (
      window.location.pathname != BASE_URL &&
      // HACK
      window.location.pathname + "/" != BASE_URL
    ) {
      const url = window.location.pathname
        .substring(BASE_URL.length)
        .replace(/\/$/, "")
        .replace(/index.html$/, "");
      const pos = url.indexOf("/");
      // HACK: this is only when we refer to a full bylaw - go to the
      // top-level ALEXI page with it expanded, do not pass go, etc
      if (window.location.hash) {
        window.location.assign(
          ALEXI_URL +
            window.location.pathname.replace("/serafim", "") +
            window.location.hash,
        );
        return;
      }
      // Show a document if one was requested by the URL (if the user
      // reloads for instance... otherwise it is done internally)
      const path = pos !== -1 ? url.substring(pos + 1) : "";
      if (path !== "") this.show_document(window.location.pathname);
      showing = true;
    }
    /* Set the dropdown menu */
    const urlParams = new URLSearchParams(window.location.search);
    const name = urlParams.get("v") ?? "";
    this.set_ville(name);
    this.ville.addEventListener("change", (e) => {
      let new_url = BASE_URL + this.ville.value;
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get("q");
      if (query !== null) new_url += "?q=" + encodeURIComponent(query);
      this.search();
      e.preventDefault();
    });
    // Load stuff
    const placeholder = document.getElementById("placeholder")!;
    let result = null;
    try {
      result = await fetch(`${ALEXI_API}/villes`);
      if (result.ok) {
        if (placeholder !== null)
          placeholder.innerText = "Selectionnez un article de la liste pour le lire ici";
      }
    }
    catch {
      console.log("Failed to contact API, falling back to client-side search");
    }
    if (result === null || !result.ok) {
      result = await fetch(`${ALEXI_URL}/_idx/index.json`);
      if (result.ok) {
        this.index = lunr.Index.load(await result.json());
        if (placeholder !== null)
          placeholder.innerText = "Chargement des documents...";
        result = await fetch(`${ALEXI_URL}/_idx/textes.json`);
        if (result.ok) {
          this.textes = await result.json();
          if (placeholder !== null)
            placeholder.innerText = "Selectionnez un article de la liste pour le lire ici";
        }
      }
    }
    if (placeholder !== null && (result === null || !result.ok)) {
      placeholder.innerText = `Erreur de chargement (index ou documents): ${result.statusText}`;
      return;
    }
    const query = urlParams.get("q");
    if (query !== null) {
      this.search_box.value = query;
      /* Search and display results if on desktop *or* there is no document shown */
      if (this.on_desktop() || !showing) this.search(); // asynchronously, sometime
    }
    /* Now set up search function */
    this.search_box.addEventListener(
      "input",
      debounce(async () => this.search(), 200),
    );
  }

  on_desktop(): boolean {
    return this.media_query.matches;
  }

  /* Show document content */
  async show_document(url: string) {
    const target = this.on_desktop()
      ? this.document_view
      : this.search_results;
    url = ALEXI_URL + url.replace("/serafim", "/");
    target.style.display = "block";
    target.innerHTML = "";
    const result = await fetch(url);
    if (!result.ok) {
      target.innerHTML = `Erreur de chargement: ${result.status}`;
      return;
    }
    const content = await result.text();
    const dom = new DOMParser().parseFromString(content, "text/html");
    const body = dom.querySelector("#body");
    if (body === null) {
      target.innerHTML = `Aucun contenu trouvé sous ${url}`;
      return;
    }
    for (const img of body.querySelectorAll("img")) {
      const srcAttr = img.getAttribute("src");
      if (srcAttr === null) {
        console.error("Image has no src!");
        continue;
      }
      /* Resolve (maybe) relative image URL (will not work if source
       * has a trailing slash instead of index.html) (will also not
       * work if source is not an absolute URL) */
      const url2 = new URL(srcAttr, url);
      img.setAttribute("src", url2.toString());
    }
    const head = dom.querySelector("#header");
    if (head !== null) {
      head.removeAttribute("id");
      target.appendChild(head);
    }
    for (const child of body.children) target.appendChild(child);
  }

  set_ville(name: string) {
      switch (name) {
        case "vsadm":
          this.ville.value = "vsadm";
          document.getElementById("egg")!.innerText = "gathois";
          break;
        case "vss":
          this.ville.value = "vss";
          document.getElementById("egg")!.innerText = "d-hoc";
          break;
        case "prevost":
          this.ville.value = "prevost";
          document.getElementById("egg")!.innerText = "d-hoc";
          break;
        case "laval":
          this.ville.value = "laval";
          document.getElementById("egg")!.innerText = "d-hoc";
          break;
        case "vdsa":
          this.ville.value = "vdsa";
          document.getElementById("egg")!.innerText = "délois";
          break;
        default:
          this.ville.value = "";
          document.getElementById("egg")!.innerText = "d-hoc";
      }
  }

  follow_link(e: Event, url: string) {
    this.show_document(url);
    history.pushState(null, "", url);
    e.preventDefault();
  }

  create_ville(path: string, query: string) {
    const [start] = path.split("/", 1);
    for (const opt of this.ville.querySelectorAll("option")) {
      if (opt.value == start) {
        const a = document.createElement("a");
        const href = `${BASE_URL}?v=${start}&q=${query}`;
        a.setAttribute("class", "ville");
        a.href = href;
        a.innerText = opt.innerText;
        a.onclick = (e) => {
          this.set_ville(start);
          this.search();
          e.preventDefault();
        };
        return a;
      }
    }
    return null;
  }

  create_title(path: string, title: string, query: string) {
    const a = document.createElement("a");
    const href = `${BASE_URL}${path}?q=${query}`;
    a.setAttribute("class", "titre");
    a.href = href;
    a.innerText = title;
    a.onclick = (e) => this.follow_link(e, href);
    return a;
  }

  create_extract(texte: string, terms: Array<string>) {
    const spans = [];
    for (const term of terms) {
      for (
        let pos = 0;
        (pos = texte.indexOf(term, pos)) !== -1;
        pos += term.length
      )
        spans.push([pos, pos + term.length]);
    }
    spans.sort();
    const p = document.createElement("p");
    p.setAttribute("class", "extrait");
    let extrait;
    if (spans.length) {
      spans.sort((a, b) => {
        const lc = b[1] - a[1];
        return lc == 0 ? a[0] - b[0] : lc;
      });
      extrait = texte.substring(
        Math.max(0, spans[0][0] - 40),
        Math.min(texte.length, spans[0][1] + 40),
      );
    } else extrait = texte.substring(0, 80) + "...";
    p.innerHTML = `... ${extrait} ...`;
    return p;
  }

  /* Populate search results box */
  create_result_entry(
    path: string,
    titre: string,
    texte: string,
    terms: Array<string>,
  ): HTMLElement {
    const div = document.createElement("div");
    const query = encodeURIComponent(this.search_box.value);
    const ville = this.ville.value;
    div.setAttribute("class", "search-result");
    if (ville == "") {
      const vlink = this.create_ville(path, query);
      if (vlink !== null) div.append(vlink);
    }
    div.append(this.create_title(path, titre, query));
    div.append(this.create_extract(texte, terms));
    const href = `${BASE_URL}${path}?v=${ville}&q=${query}`;
    div.onclick = (e) => {
      /* Only accept clicks in the div on mobile */
      if (!this.on_desktop()) this.follow_link(e, href);
    };
    return div;
  }

  /* Run a search and update the list */
  async search() {
    const text = this.search_box.value;
    if (text.length < 2) return;
    const query = encodeURIComponent(text);
    const ville = this.ville.value;
    /* Ensure that the URL matches the display if we bookmark/reload */
    if (this.on_desktop()) {
      // Desktop, all done internally
      history.replaceState(null, "", `?v=${ville}&q=${query}`);
    }
    else {
      // Mobile, search implies reload
      history.replaceState(null, "", `${BASE_URL}?v=${ville}&q=${query}`);
    }
    this.search_results.innerHTML = "";
    if (this.index === null || this.textes === null) {
      const result = await fetch(
        `${ALEXI_API}/recherche?q=${query}&v=${this.ville.value}`,
      );
      if (!result.ok) throw "Query error!"; // FIXME: Better error handling!
      const results = await result.json();
      for (const { url, titre, texte, termes } of results)
        this.search_results.append(
          this.create_result_entry(url, titre, texte, termes),
        );
    } else {
      const results = this.index.search(text);
      let i = 0;
      for (const result of results) {
        if (i == 10) break;
        const [path, titre, texte] = this.textes[parseInt(result.ref)];
        if (ville !== "" && !path.startsWith(ville)) continue;
        this.search_results.append(
          this.create_result_entry(
            path,
            titre,
            texte,
            Object.keys(result.matchData.metadata),
          ),
        );
        i++;
      }
    }
  }
}

window.addEventListener("load", async () => {
  const app = new App();
  await app.initialize();
});
