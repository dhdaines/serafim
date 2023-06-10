import * as lunr from "lunr";
import * as fs from "node:fs";
import * as path from "node:path";
/* UGH! This API is SO WEIRD!!! */
require("lunr-languages/lunr.stemmer.support")(lunr);
require("lunr-languages/lunr.fr")(lunr);
import accent_folding from "src/accent-folding";
accent_folding();

const textes = JSON.parse(fs.readFileSync("public/textes.json", "utf8"));
const index = lunr.Index.load(JSON.parse(fs.readFileSync("public/index.json", "utf8")));

for (const result of index.search("occupation de la foret")) {
  console.log(textes[result.ref]);
}
