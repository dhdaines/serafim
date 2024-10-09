// -*- js-indent-level: 2 -*-
import lunr from "lunr";
// @ts-ignore
import stemmerSupport from "lunr-languages/lunr.stemmer.support";
// @ts-ignore
import lunrFR from "lunr-languages/lunr.fr";
import unidecode from "unidecode";
import debounce from "debounce";

stemmerSupport(lunr);
lunrFR(lunr);
lunr.Pipeline.registerFunction(token => token.update(unidecode), "unifold")

// @ts-ignore
const BASE_URL = import.meta.env.BASE_URL;
//const ALEXI_URL = "https://dhdaines.github.io/alexi";
const ALEXI_URL = "http://localhost:8000";

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
    search_form.addEventListener("submit", e => e.preventDefault());
    // Drop-down for towns
    this.ville = document.getElementById("ville")! as HTMLSelectElement;
  }

  /* Do asynchronous initialization things */
  async initialize() {
    let showing = false;
    if (window.location.pathname != BASE_URL
        // HACK
        && (window.location.pathname + "/") != BASE_URL) {
      const url = window.location.pathname.substring(BASE_URL.length).replace(/\/$/, "").replace(/index.html$/, "");
      const pos = url.indexOf("/");
      const name = (pos !== -1) ? url.substring(0, pos) : url;
      const path = (pos !== -1) ? url.substring(pos + 1) : "";
      console.log(`name '${name}' path '${path}'`);
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
        case "vdsa":
        this.ville.value = "vdsa";
        document.getElementById("egg")!.innerText = "délois";
        break;
        default:
        this.ville.value = "";
        document.getElementById("egg")!.innerText = "d-hoc";
      }
      // HACK: this is only when we refer to a full bylaw
      if (window.location.hash) {
        window.location.assign(ALEXI_URL
                               + window.location.pathname.replace("/serafim", "")
                               + window.location.hash);
        return;
      }
      if (path)
        this.show_document(window.location.pathname);
      showing = true;
    }
    // Set up change listener *after* assigning :)
    this.ville.addEventListener("change", _ => {
      let new_url = BASE_URL + this.ville.value;
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get("q");
      if (query !== null)
        new_url += "?q=" + encodeURIComponent(query);
      window.location.assign(new_url);
    });
    const placeholder = document.getElementById("placeholder");
    let result = await fetch(`${ALEXI_URL}/_idx/index.json`)
    if (result.ok) {
      this.index = lunr.Index.load(await result.json());
      if (placeholder !== null)
        placeholder.innerText = "Chargement des documents...";
      result = await fetch(`${ALEXI_URL}/_idx/textes.json`)
      if (result.ok) {
        this.textes = await result.json();
        if (placeholder !== null)
          placeholder.innerText = "Prêt pour la recherche!";
      }
    }
    if (placeholder !== null && !result.ok) {
      placeholder.innerText = `Erreur de chargement (index ou documents): ${result.statusText}`;
      return;
    }
    /* Set the search query */
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");
    if (query !== null) {
      this.search_box.value = query;
      /* Search and display results if on desktop *or* there is no document shown */
      if (this.media_query.matches || !showing)
        this.search(); // asynchronously, sometime
    }
    /* Now set up search function */
    this.search_box.addEventListener(
      "input",
      debounce(async () => this.search(), 200)
    );
  }

  /* Show document content */
  async show_document(url: string) {
    const target = this.media_query.matches ? this.document_view : this.search_results;
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
    for (const child of body.children)
      target.appendChild(child);
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
        const href = `${BASE_URL}${start}?q=${query}`;
        a.setAttribute("class", "ville");
        a.href = href
        a.innerText = opt.innerText;
        a.addEventListener("click", e => this.follow_link(e, href));
        return a;
      }
    }
    return null;
  }

  create_title(path: string, title: string, query: string) {
    const a = document.createElement("a");
    const href = `${BASE_URL}${path}?q=${query}`;
    a.setAttribute("class", "titre");
    a.href = href
    a.innerText = title;
    a.addEventListener("click", e => this.follow_link(e, href));
    return a;
  }

  create_extract(texte: string, result: lunr.Index.Result) {
    const spans = [];
    for (const term in result.matchData.metadata) {
      for (let pos = 0; (pos = texte.indexOf(term, pos)) !== -1; pos += term.length)
        spans.push([pos, pos + term.length]);
    }
    spans.sort();
    const p = document.createElement("p");
    p.setAttribute("class", "extrait");
    let extrait;
    if (spans.length) {
      spans.sort((a, b) => { const lc = b[1] - a[1];
                             return (lc == 0) ? (a[0] - b[0]) : lc });
      extrait = texte.substring(
        Math.max(0, spans[0][0] - 40),
        Math.min(texte.length, spans[0][1] + 40)
      )
    } else extrait = texte.substring(0, 80) + "...";
    p.innerHTML = `... ${extrait} ...`;
    return p;
  }

  /* Populate search results box */
  create_result_entry(result: lunr.Index.Result): HTMLElement {
    const div = document.createElement("div");
    if (this.textes === null) {
      div.innerHTML = `Base de données absente`;
      return div;
    }
    if (!(result.ref in this.textes))
      throw `Document ${result.ref} not found`;
    const query = encodeURIComponent(this.search_box.value);
    const [path, titre, texte] = this.textes[parseInt(result.ref)];
    const ville = this.ville.value;
    div.setAttribute("class", "search-result");
    if (ville == "") {
      const vlink = this.create_ville(path, query);
      if (vlink !== null)
        div.append(vlink);
    }
    div.append(this.create_title(path, titre, query));
    div.append(this.create_extract(texte, result));
    const href = `${BASE_URL}${path}?q=${query}`;
    div.addEventListener("click", (e) => {
      /* Only accept clicks in the div on mobile */
      if (!this.media_query.matches)
        this.follow_link(e, href)
    });
    return div;
  }

  /* Run a search and update the list */
  async search() {
    if (this.index === null || this.textes === null) {
      this.search_results.innerHTML  = `Base de données absente`;
      return;
    }
    const text = this.search_box.value;
    if (text.length < 2)
      return;
    const query = encodeURIComponent(text);
    /* Ensure that the URL matches the display if we bookmark/reload */
    if (this.media_query.matches)
      history.replaceState(null, "", `?q=${query}`)
    else
      history.replaceState(null, "", `${BASE_URL}?q=${query}`)
    try {
      const results = this.index.search(text);
      this.search_results.innerHTML = "";
      const ville = this.ville.value;
      let i = 0;
      for (const result of results) {
        if (i == 10)
          break;
        const [path, _titre, _texte] = this.textes[parseInt(result.ref)];
        if (ville !== "" && !path.startsWith(ville))
          continue;
        this.search_results.append(this.create_result_entry(result));
        i++;
      }
    } catch (e) {
      console.log(`Query error: ${e}`);
    }
  }
}

window.addEventListener("load", async () => {
  const app = new App();
  await app.initialize();
});
