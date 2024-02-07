import lunr from "lunr";
import debounce from "debounce";

import { ALEXI_URL } from "./config.ts";

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
  media_query: MediaQueryList;
  index: lunr.Index | null = null;
  textes: Textes | null = null;

  /* Get and construct objects */
  constructor() {
    this.search_box = document.getElementById("search-box") as HTMLInputElement;
    this.document_view = document.getElementById("document-view")!;
    this.search_results = document.getElementById("search-results")!;
    this.media_query = matchMedia("screen and (min-width: 48em)");
  }

  /* Show document content */
  async show_document(url: string) {
    const target = this.document_view;
    const source = `${ALEXI_URL}/${url}`;
    target.style.display = "block";
    target.innerHTML = "";
    const result = await fetch(source);
    if (!result.ok) {
      target.innerHTML = `Error in fetch: ${result}`;
      return;
    }
    const content = await result.text();
    const dom = new DOMParser().parseFromString(content, "text/html");
    const body = dom.querySelector("#body");
    if (body === null) {
      target.innerHTML = `No content found at ${source}`;
      return;
    }
    for (const img of body.querySelectorAll("img")) {
      const srcAttr = img.getAttribute("src");
      if (srcAttr === null) {
        console.error("Image has no src!");
        continue;
      }
      /* Resolve (maybe) relative image URL (will not work if source
       * has a trailing slash instead of index.html) */
      const url = new URL(srcAttr, source);
      img.setAttribute("src", url.toString());
    }
    const head = dom.querySelector("#header");
    if (head !== null) {
        head.removeAttribute("id");
        target.appendChild(head);
    }
    for (const child of body.children)
      target.appendChild(child);
  }

  create_title(titre: string, query: string, result: lunr.Index.Result) {
    const a = document.createElement("a");
    a.href = `/alexi/${result.ref}`;
    if (query)
      a.href += `?q=${query}`;
    a.innerText = titre;
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
    div.addEventListener("click", (e) => {
      /* On desktop, do it in-browser, otherwise follow the link */
      if (this.media_query.matches) {
        this.show_document(result.ref);
        history.pushState(null, "", `/alexi/${result.ref}?q=${query}`)
        e.preventDefault();
      }
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
    history.replaceState(null, "", `?q=${query}`)
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

  /* Do asynchronous initialization things */
  async initialize() {
    /* Like showing a document if requested */
    const parts = window.location.pathname.split("/").filter(x => x.length);
    if (parts.length > 1 && parts[0] === "alexi")
        this.show_document(parts.slice(1).join("/"))
    /* Load the index / text if possible (FIXME: will possibly use an ALEXI API here) */
    let result = await fetch("/index.json");
    if (result.ok)
      this.index = lunr.Index.load(await result.json());
    result = await fetch("/textes.json");
    if (result.ok)
      this.textes = await result.json();
    
    /* And displaying search results if requested */
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");
    if (query !== null) {
      this.search_box.value = query;
      this.search(); // asynchronously, sometime
    }
    /* Now set up search function */
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
