import { ALEXI_URL } from "./config.ts";

class App {
  search_box: HTMLInputElement;
  document_view: HTMLElement;
  search_results: HTMLElement;
  media_query: MediaQueryList;

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

  /* Do asynchronous initialization things */
  async initialize() {
    /* Like showing a document if requested */
    const parts = window.location.pathname.split("/").filter(x => x.length);
    if (parts.length > 1 && parts[0] === "alexi")
      this.show_document(parts.slice(1).join("/"))
  }
}

window.addEventListener("load", async () => {
  const app = new App();
  await app.initialize();
});
