import lunr from "lunr";
import fs from "node:fs";
import folding from "lunr-folding";

/* UGH! This API is SO WEIRD!!! */
folding(lunr);

const index = lunr.Index.load(JSON.parse(fs.readFileSync("public/index.json", "utf8")));

for (const result of index.search("combien de poules")) {
  console.log(JSON.stringify(result));
}
