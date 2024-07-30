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
const ALEXI_URL = "https://dhdaines.github.io/alexi";

interface Texte {
  titre: string;
  texte: string;
}

interface Textes {
  [url: string]: Texte;
};

class App {
  search_box: HTMLInputElement;
  document_view: HTMLElement;
  search_results: HTMLElement;
  ville: HTMLSelectElement;
  media_query: MediaQueryList;
  index: lunr.Index | null = null;
  textes: Textes | null = null;
  alexi_url: string;
  index_url: string;
  textes_url: string;
  base_url: string;

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
    // Find the appropriate index if required (somewhat hacky)
    this.alexi_url = ALEXI_URL;
    this.base_url = BASE_URL;
    // Drop-down for towns
    this.ville = document.getElementById("ville")! as HTMLSelectElement;
    if (window.location.pathname != BASE_URL) {
      const url = window.location.pathname.substring(BASE_URL.length).replace(/\/$/, "").replace(/index.html$/, "");
      console.log(window.location.pathname, BASE_URL, url);
      // HACK because JavaScript inexplicably has no built-in URL
      // parsing worth anything at all
      const idx = url.indexOf("/");
      const name = (idx == -1) ? url : url.substring(0, idx);
      let other_ville = true;
      switch (name) {
        case "vsadm":
        this.ville.value = "vsadm";
          break;
        case "vss":
        this.ville.value = "vss";
          break;
        case "prevost":
        this.ville.value = "prevost";
        break;
        default:
        other_ville = false;
      }
      if (other_ville) {
        this.alexi_url = ALEXI_URL + "/" + name;
        this.base_url = BASE_URL + name + "/";
      }
      console.log("base_url", this.base_url);
      console.log("alexi_url", this.alexi_url);
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
    this.index_url = `${this.alexi_url}/_idx/index.json`;
    this.textes_url = `${this.alexi_url}/_idx/textes.json`;
  }

  /* Do asynchronous initialization things */
  async initialize() {
    let showing = false;
    if (window.location.pathname != this.base_url
        // HACK
        && (window.location.pathname + "/") != this.base_url) {
      // HACK: this is only when we refer to a full bylaw
      if (window.location.hash) {
        window.location.assign(ALEXI_URL
                               + window.location.pathname.replace("/serafim", "")
                               + window.location.hash);
        return;
      }
      this.show_document(window.location.pathname);
      showing = true;
    }
    let result = await fetch(this.index_url);
    if (result.ok)
      this.index = lunr.Index.load(await result.json());
    result = await fetch(this.textes_url);
    if (result.ok)
      this.textes = await result.json();

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
    // Le beau rêve de Donalda réalisé
    url = ALEXI_URL + url.replace("/serafim", "/");
    target.style.display = "block";
    target.innerHTML = "";
    const result = await fetch(url);
    if (!result.ok) {
      target.innerHTML = `Error in fetch: ${result.status}`;
      return;
    }
    const content = await result.text();
    const dom = new DOMParser().parseFromString(content, "text/html");
    const body = dom.querySelector("#body");
    if (body === null) {
      target.innerHTML = `No content found at ${url}`;
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

  create_title(titre: string, query: string, result: lunr.Index.Result) {
    const a = document.createElement("a");
    const href = `${this.base_url}${result.ref}?q=${query}`;
    a.href = href
    a.innerText = titre;
    a.addEventListener("click", e => this.follow_link(e, href));
    return a;
  }

  create_extract(texte: string, result: lunr.Index.Result) {
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
      // Sort descending by length and position (we want the longest,
      // latest span - to avoid matching the title all the time)
      spans.sort((a, b) => { const lc = b[1] - a[1];
                             return (lc == 0) ? (b[0] - a[0]) : lc });
      extrait = texte.substring(
          Math.max(0, spans[0][0] - 80),
          Math.min(texte.length, spans[0][0] + spans[0][1] + 40)
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
    const texte = this.textes[result.ref];
    div.setAttribute("class", "search-result");
    div.append(this.create_title(texte.titre, query, result));
    div.append(this.create_extract(texte.texte, result));
    const href = `${this.base_url}${result.ref}?q=${query}`;
    div.addEventListener("click", (e) => {
      /* Only accept clicks in the div on mobile */
      if (!this.media_query.matches)
        this.follow_link(e, href)
    });
    return div;
  }

  /* Run a search and update the list */
  async search() {
    if (this.index === null) {
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
      history.replaceState(null, "", `${this.base_url}?q=${query}`)
    try {
      const results = this.index.search(text);
      this.search_results.innerHTML = "";
      for (const result of results.slice(0, 10)) {
        this.search_results.append(this.create_result_entry(result));
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
