import * as lunr from "lunr";
import * as fs from "node:fs";
import * as path from "node:path";
import folding from "lunr-folding";

/* UGH! This API is SO WEIRD!!! */
require("lunr-languages/lunr.stemmer.support")(lunr);
require("lunr-languages/lunr.fr")(lunr);
folding(lunr);

const textes = JSON.parse(fs.readFileSync("public/textes.json", "utf8"));
const index = lunr.Index.load(JSON.parse(fs.readFileSync("public/index.json", "utf8")));

for (const result of index.search("Occupation de la Foret")) {
  console.log(JSON.stringify(result));
  console.log(textes[result.ref]);
}
