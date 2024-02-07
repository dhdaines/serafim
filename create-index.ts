import process from "node:process";
import fetch from "node-fetch";
import lunr from "lunr";
import { ALEXI_URL } from "./src/config.js";
import folding from "lunr-folding";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, HTMLElement, KeyAttributes, TextNode } from "node-html-parser";

folding(lunr);  // beurk

async function fetch_alexi(url: string): Promise<string> {
  if (true)
    return readFile(`../alexi/export/${url}`, "utf8");
  else {
    const result = await fetch(`${ALEXI_URL}/${url}`);
    if (!result.ok) {
      console.error(`Failed to fetch ${ALEXI_URL}/${url}`);
      process.exit(1);
    }
    return result.text();
  }
}

interface Document {
  url: string;
  titre: string;
  texte: string;
}

// FIXME: Should be stored in the index somehow
const textes: any = {};

function make_doc(url: string, titreEl: HTMLElement, html: string): Document | null {
  const root = parse(html);
  const bodyEl = root.querySelector("div#body");
  if (bodyEl === null || !bodyEl.textContent || !titreEl.textContent)
    return null;
  const titre = titreEl.textContent.trim();
  // Remove titles
  for (const header of bodyEl.querySelectorAll(".header")) {
    header.parentNode.removeChild(header);
  }
  // Swap images for alternate text
  for (const img of bodyEl.querySelectorAll("img")) {
    const altText = img.getAttribute("alt");
    if (!altText)
      continue;
    const altEl = new HTMLElement("p", {});
    altEl.appendChild(new TextNode(altText));
    img.parentNode.exchangeChild(img, altEl);
  }
  const texte = bodyEl.textContent;
  return {
    url, titre, texte
  }
}

async function crawl_alexi(builder: lunr.Builder): Promise<void> {
  /* Crawl ALEXI for things to index */
  const html = await fetch_alexi("index.html");
  const root = parse(html);
  /* Gather documents, chapters, sections */
  for (const section of root.querySelectorAll("li.node")) {
    const summary = section.querySelector("summary");
    if (!summary) {
      console.error(`No summary found for ${section.classNames}`);
      continue;
    }
    const htmlLink = section.querySelector("a");
    if (!htmlLink) {
      console.error("No link found in li.leaf");
      continue;
    }
    const htmlUrl = htmlLink.getAttribute("href");
    if (!htmlUrl) {
      console.error("No href found in li.leaf");
      continue;
    }
    const html = await fetch_alexi(htmlUrl);
    const doc = make_doc(htmlUrl, summary, html);
    if (doc == null) {
      console.error(`No content found in ${htmlUrl}`);
      continue;
    }
    console.log(doc);
    builder.add(doc);
    textes[htmlUrl] = doc.texte;
  }
  /* Gather articles, other leaf nodes */
  for (const text of root.querySelectorAll("li.leaf")) {
    const htmlLink = text.querySelector("a");
    if (!htmlLink) {
      console.error("No link found in li.leaf");
      continue;
    }
    const htmlUrl = htmlLink.getAttribute("href");
    if (!htmlUrl) {
      console.error("No href found in li.leaf");
      continue;
    }
    const html = await fetch_alexi(htmlUrl);
    const doc = make_doc(htmlUrl, htmlLink, html);
    if (doc == null) {
      console.error(`No content found in ${htmlUrl}`);
      continue;
    }
    console.log(doc);
    builder.add(doc);
    textes[htmlUrl] = doc.texte;
  }
}


const builder = new lunr.Builder();
builder.ref("url");
builder.field("titre", { boost: 2 });
builder.field("texte");
builder.metadataWhitelist = ['position']; // Yes this is undocumented
await crawl_alexi(builder);
const index = builder.build();

await writeFile(path.join("public", "index.json"),
  JSON.stringify(index.toJSON()));
await writeFile(path.join("public", "textes.json"),
                JSON.stringify(textes));
